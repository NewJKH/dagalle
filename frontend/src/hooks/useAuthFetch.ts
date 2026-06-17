/**
 * useAuthFetch — 인증 토큰을 자동으로 붙여주고, 401 시 refreshToken으로 재시도하는 fetch 래퍼
 *
 * 사용법:
 *   const authFetch = useAuthFetch()
 *   const res = await authFetch('/api/v1/travels')
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false

  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data?.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken)
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken)
      }
      return true
    }
    return false
  } catch {
    return false
  }
}

export function useAuthFetch() {
  const navigate = useNavigate()

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = localStorage.getItem('accessToken')

      const makeRequest = (tok: string | null) =>
        fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
            // Content-Type은 호출부에서 넘겨온 headers 우선 (FormData 등)
          },
        })

      let res = await makeRequest(token)

      if (res.status === 401) {
        // 여러 요청이 동시에 401을 받았을 때 refresh를 한 번만 실행
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null
          })
        }
        const refreshed = await refreshPromise

        if (refreshed) {
          // 새 토큰으로 재시도
          res = await makeRequest(localStorage.getItem('accessToken'))
        } else {
          // 갱신 실패 → 로그아웃
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          navigate('/login')
          return res
        }
      }

      return res
    },
    [navigate],
  )

  return authFetch
}
