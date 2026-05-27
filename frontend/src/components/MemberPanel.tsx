import { useState, useEffect, useCallback } from 'react'

interface Member {
  memberId: number
  userId: number
  username: string
  email: string
  role: 'OWNER' | 'MEMBER' | 'VIEWER'
  roleDisplay: string
}

interface Props {
  travelId: number
  myUserId: number
  myRole: 'OWNER' | 'MEMBER' | 'VIEWER'
  onClose: () => void
  onMembersChange?: (members: Member[]) => void
}

const ROLE_CONFIG = {
  OWNER:  { label: '리더',   color: '#F97316', bg: '#FFF7ED', border: '#FED7AA', icon: '👑' },
  MEMBER: { label: '팀원',   color: '#0EA5E9', bg: '#EFF6FF', border: '#BAE6FD', icon: '✈️' },
  VIEWER: { label: '관찰자', color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0', icon: '👁️' },
}

export default function MemberPanel({ travelId, myUserId, myRole, onClose, onMembersChange }: Props) {
  const [members, setMembers]     = useState<Member[]>([])
  const [loading, setLoading]     = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<'MEMBER' | 'VIEWER'>('MEMBER')
  const [inviting, setInviting]   = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [kickingId, setKickingId] = useState<number | null>(null)
  const [roleChanging, setRoleChanging] = useState<number | null>(null)
  const token = localStorage.getItem('accessToken')

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/travels/${travelId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      if (d.success) {
        setMembers(d.data)
        onMembersChange?.(d.data)
      }
    } finally {
      setLoading(false)
    }
  }, [travelId, token, onMembersChange])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const invite = async () => {
    if (!inviteEmail.trim() || inviting) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch(`/api/v1/travels/${travelId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const d = await res.json()
      if (d.success) {
        setInviteMsg({ ok: true, text: `${inviteEmail} 님을 초대했어요!` })
        setInviteEmail('')
        fetchMembers()
      } else {
        setInviteMsg({ ok: false, text: d.message ?? '초대 실패' })
      }
    } catch {
      setInviteMsg({ ok: false, text: '네트워크 오류' })
    }
    setInviting(false)
  }

  const kick = async (targetUserId: number, name: string) => {
    if (!window.confirm(`${name} 님을 내보낼까요?`)) return
    setKickingId(targetUserId)
    try {
      const res = await fetch(`/api/v1/travels/${travelId}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) fetchMembers()
      else {
        const d = await res.json()
        alert(d.message ?? '강퇴 실패')
      }
    } finally {
      setKickingId(null)
    }
  }

  const changeRole = async (targetUserId: number, newRole: 'OWNER' | 'MEMBER' | 'VIEWER') => {
    setRoleChanging(targetUserId)
    try {
      const res = await fetch(`/api/v1/travels/${travelId}/members/${targetUserId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      })
      const d = await res.json()
      if (d.success) fetchMembers()
      else alert(d.message ?? '역할 변경 실패')
    } finally {
      setRoleChanging(null)
    }
  }

  const isLeader = myRole === 'OWNER'
  const sky  = '#0EA5E9'
  const coral = '#F97316'

  return (
    <div style={{
      position: 'fixed', right: 24, bottom: 24, width: 360, maxHeight: 560,
      background: '#fff', borderRadius: 20,
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', zIndex: 1001,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        background: `linear-gradient(135deg, ${coral}, #EA580C)`,
        padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>👥 그룹 멤버</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
            {members.length}명
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
            color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>

      {/* 멤버 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.82rem' }}>불러오는 중...</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.82rem' }}>멤버가 없어요.</div>
        ) : (
          members.map(m => {
            const cfg = ROLE_CONFIG[m.role]
            const isMe = m.userId === myUserId
            const isChanging = roleChanging === m.userId
            const isKicking  = kickingId   === m.userId
            return (
              <div key={m.memberId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12,
                border: isMe ? `1.5px solid ${sky}40` : '1.5px solid #f1f5f9',
                background: isMe ? '#EFF6FF' : '#fafafa',
              }}>
                {/* 아바타 */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}60)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700, color: cfg.color,
                  border: `2px solid ${cfg.color}40`,
                }}>
                  {m.username[0]?.toUpperCase()}
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.87rem', color: '#1e293b' }}>
                      {m.username}{isMe && <span style={{ fontSize: '0.65rem', color: sky, fontWeight: 600, marginLeft: 4 }}>(나)</span>}
                    </span>
                    <span style={{
                      fontSize: '0.63rem', padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.email}
                  </div>
                </div>

                {/* 리더 전용 액션 */}
                {isLeader && !isMe && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {/* 역할 변경 드롭다운 */}
                    <select
                      value={m.role}
                      disabled={isChanging}
                      onChange={e => changeRole(m.userId, e.target.value as 'OWNER' | 'MEMBER' | 'VIEWER')}
                      style={{
                        fontSize: '0.68rem', borderRadius: 6, border: '1px solid #e2e8f0',
                        padding: '3px 4px', background: '#fff', color: '#475569',
                        cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="OWNER">👑 리더</option>
                      <option value="MEMBER">✈️ 팀원</option>
                      <option value="VIEWER">👁️ 관찰자</option>
                    </select>
                    {/* 강퇴 버튼 */}
                    <button
                      onClick={() => kick(m.userId, m.username)}
                      disabled={isKicking || m.role === 'OWNER'}
                      title={m.role === 'OWNER' ? '리더는 강퇴할 수 없어요' : '내보내기'}
                      style={{
                        width: 28, height: 28, borderRadius: 7, border: 'none', cursor: m.role === 'OWNER' ? 'not-allowed' : 'pointer',
                        background: m.role === 'OWNER' ? '#f1f5f9' : '#FFF1F1',
                        color: m.role === 'OWNER' ? '#cbd5e1' : '#EF4444',
                        fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: isKicking ? 0.6 : 1,
                      }}
                    >
                      {isKicking ? '...' : '✕'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 초대 영역 (리더만) */}
      {isLeader && (
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 14px', background: '#fafafa' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 8 }}>👤 멤버 초대</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteMsg(null) }}
              onKeyDown={e => e.key === 'Enter' && invite()}
              placeholder="이메일 주소 입력"
              type="email"
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'MEMBER' | 'VIEWER')}
              style={{
                padding: '8px 6px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                fontSize: '0.75rem', outline: 'none', background: '#fff', color: '#475569',
              }}
            >
              <option value="MEMBER">팀원</option>
              <option value="VIEWER">관찰자</option>
            </select>
            <button
              onClick={invite}
              disabled={!inviteEmail.trim() || inviting}
              style={{
                padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: inviteEmail.trim() ? `linear-gradient(135deg, ${coral}, #EA580C)` : '#e2e8f0',
                color: inviteEmail.trim() ? '#fff' : '#94a3b8',
                fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {inviting ? '...' : '초대'}
            </button>
          </div>
          {inviteMsg && (
            <div style={{
              fontSize: '0.72rem', padding: '5px 10px', borderRadius: 7,
              background: inviteMsg.ok ? '#ECFDF5' : '#FFF1F1',
              color: inviteMsg.ok ? '#059669' : '#EF4444',
              border: `1px solid ${inviteMsg.ok ? '#A7F3D0' : '#FECACA'}`,
            }}>
              {inviteMsg.ok ? '✅' : '⚠️'} {inviteMsg.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
