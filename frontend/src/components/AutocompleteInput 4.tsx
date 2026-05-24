import { useState, useRef, useEffect, useCallback } from 'react'

export interface AutocompleteOption {
  label: string      // 표시 텍스트
  value: string      // 실제 저장값
  sub?: string       // 부가 설명 (공항코드, 경유 공항 등)
  flag?: string      // 이모지 아이콘
}

interface Props {
  value: string
  onChange: (val: string) => void
  options: AutocompleteOption[]
  placeholder?: string
  style?: React.CSSProperties
  required?: boolean
}

export default function AutocompleteInput({ value, onChange, options, placeholder, style, required }: Props) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 입력값으로 필터링
  const filtered = value.trim() === ''
    ? options
    : options.filter(o =>
        o.label.toLowerCase().includes(value.toLowerCase()) ||
        o.value.toLowerCase().includes(value.toLowerCase()) ||
        (o.sub?.toLowerCase().includes(value.toLowerCase()))
      )

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = useCallback((opt: AutocompleteOption) => {
    onChange(opt.value)
    setOpen(false)
    setHighlighted(-1)
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && filtered[highlighted]) select(filtered[highlighted])
      else setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 10,
          border: open ? '1.5px solid var(--sky)' : '1.5px solid var(--border)',
          outline: 'none', fontSize: '0.9rem', color: 'var(--text)',
          background: '#fff', transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          ...style,
        }}
      />

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', borderRadius: 12,
          border: '1.5px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 999, overflow: 'hidden',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.map((opt, i) => (
            <div
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); select(opt) }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', cursor: 'pointer',
                background: highlighted === i ? 'var(--sky-bg)' : '#fff',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-lt)' : 'none',
                transition: 'background 0.1s',
              }}
            >
              {opt.flag && (
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{opt.flag}</span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: highlighted === i ? 'var(--sky-dk)' : 'var(--text)' }}>
                  {opt.label}
                </div>
                {opt.sub && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 1 }}>{opt.sub}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
