import { useState, useEffect, useRef, useCallback } from 'react'

interface ChatMsg {
  id: number
  senderId: number
  senderName: string
  content: string
  sentAt: string
}

interface Props {
  travelId: number
  myUserId: number
  newMessage: ChatMsg | null // WebSocket으로 수신된 새 메시지
  onClose: () => void
}

export default function GroupChat({ travelId, myUserId, newMessage, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('accessToken')

  // 히스토리 로드
  useEffect(() => {
    fetch(`/api/v1/travels/${travelId}/chat?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setMessages(d.data) })
      .catch(() => {})
  }, [travelId])

  // 새 WebSocket 메시지 추가 (중복 방지)
  useEffect(() => {
    if (!newMessage) return
    setMessages(prev => {
      if (prev.some(m => m.id === newMessage.id)) return prev
      return [...prev, newMessage]
    })
  }, [newMessage])

  // 새 메시지 수신 시 스크롤 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/v1/travels/${travelId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      })
      const d = await res.json()
      if (d.success) {
        // WebSocket으로도 broadcast되므로 여기선 input만 초기화
        setInput('')
      }
    } finally {
      setSending(false)
    }
  }, [input, sending, travelId, token])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const sky = '#0EA5E9'
  const coral = '#F97316'

  return (
    <div style={{
      position: 'fixed', right: 24, bottom: 24, width: 340, height: 480,
      background: '#fff', borderRadius: 20,
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        background: `linear-gradient(135deg, ${sky}, #0284C7)`,
        padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>💬 그룹 채팅</span>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
          color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: 40 }}>
            아직 메시지가 없어요.<br />첫 메시지를 보내보세요! 👋
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.senderId === myUserId
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end', gap: 6,
            }}>
              {!isMe && (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${sky}40, ${coral}40)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: '#475569',
                }}>
                  {msg.senderName[0]}
                </div>
              )}
              <div style={{ maxWidth: '72%' }}>
                {!isMe && (
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: 3, paddingLeft: 4 }}>
                    {msg.senderName}
                  </div>
                )}
                <div style={{
                  padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMe ? `linear-gradient(135deg, ${sky}, #0284C7)` : '#f1f5f9',
                  color: isMe ? '#fff' : '#1e293b',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  boxShadow: isMe ? '0 2px 8px rgba(14,165,233,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                  {msg.content}
                </div>
                <div style={{
                  fontSize: '0.65rem', color: '#94a3b8', marginTop: 3,
                  textAlign: isMe ? 'right' : 'left', paddingInline: 4,
                }}>
                  {new Date(msg.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid #e2e8f0',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="메시지 입력 (Enter 전송)"
          rows={1}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 12, border: '1.5px solid #e2e8f0',
            outline: 'none', resize: 'none', fontSize: '0.85rem',
            fontFamily: 'inherit', maxHeight: 80, lineHeight: 1.5,
          }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 80) + 'px'
          }}
        />
        <button onClick={send} disabled={!input.trim() || sending} style={{
          padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: input.trim() ? `linear-gradient(135deg, ${sky}, #0284C7)` : '#e2e8f0',
          color: input.trim() ? '#fff' : '#94a3b8',
          fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.15s',
          flexShrink: 0,
        }}>
          {sending ? '...' : '전송'}
        </button>
      </div>
    </div>
  )
}
