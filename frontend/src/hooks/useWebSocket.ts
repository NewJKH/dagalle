import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

interface UseWebSocketOptions {
  travelId: number | null
  onScheduleUpdate?: (data: any) => void
  onMemberUpdate?: (data: any) => void
  onChatMessage?: (data: any) => void
}

export function useWebSocket({
  travelId,
  onScheduleUpdate,
  onMemberUpdate,
  onChatMessage,
}: UseWebSocketOptions) {
  const clientRef = useRef<Client | null>(null)
  const token = localStorage.getItem('accessToken')

  // 콜백을 ref에 보관해 재연결 없이 최신 값 유지
  const scheduleRef = useRef(onScheduleUpdate)
  const memberRef   = useRef(onMemberUpdate)
  const chatRef     = useRef(onChatMessage)
  scheduleRef.current = onScheduleUpdate
  memberRef.current   = onMemberUpdate
  chatRef.current     = onChatMessage

  const disconnect = useCallback(() => {
    if (clientRef.current?.connected) {
      clientRef.current.deactivate()
    }
    clientRef.current = null
  }, [])

  useEffect(() => {
    if (!travelId || !token) return

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        console.log('[WS] 연결됨 travelId=', travelId)

        // 일정 변경 구독
        client.subscribe(`/topic/travels/${travelId}/schedule`, (msg) => {
          try { scheduleRef.current?.(JSON.parse(msg.body)) } catch {}
        })
        // 멤버 변경 구독
        client.subscribe(`/topic/travels/${travelId}/members`, (msg) => {
          try { memberRef.current?.(JSON.parse(msg.body)) } catch {}
        })
        // 채팅 구독
        client.subscribe(`/topic/travels/${travelId}/chat`, (msg) => {
          try { chatRef.current?.(JSON.parse(msg.body)) } catch {}
        })
      },
      onDisconnect: () => console.log('[WS] 연결 종료'),
      onStompError: (frame) => console.error('[WS] STOMP 오류', frame),
    })

    client.activate()
    clientRef.current = client

    return () => { disconnect() }
  // travelId / token 변경 시에만 재연결
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelId, token])

  return { disconnect }
}
