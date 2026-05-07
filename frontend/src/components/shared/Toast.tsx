import { useEffect, useState } from 'react'

export type ToastKind = 'success' | 'warning' | 'error'

export interface ToastMessage {
  id: number
  kind: ToastKind
  text: string
}

interface ToastProps {
  messages: ToastMessage[]
  onDismiss: (id: number) => void
}

/** Contenedor de toasts — esquina inferior derecha. */
export function ToastContainer({ messages, onDismiss }: ToastProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 2000,
      pointerEvents: 'none',
    }}>
      {messages.map(m => (
        <ToastItem key={m.id} msg={m} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ msg, onDismiss }: { msg: ToastMessage; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(msg.id), 200)
    }, 3000)
    return () => clearTimeout(t)
  }, [msg.id, onDismiss])

  const color = msg.kind === 'success'
    ? 'var(--success)'
    : msg.kind === 'warning'
    ? 'var(--warning)'
    : 'var(--error)'

  const bg = msg.kind === 'success'
    ? 'var(--success-subtle)'
    : msg.kind === 'warning'
    ? 'var(--warning-subtle)'
    : 'var(--error-subtle)'

  return (
    <div style={{
      pointerEvents: 'auto',
      border: `1px solid ${color}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 'var(--radius-sm)',
      padding: '8px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-elevated)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 200ms ease, transform 200ms ease',
      minWidth: 240,
      maxWidth: 340,
      background: bg,
    }}>
      {msg.text}
    </div>
  )
}

let _nextId = 1

/** Hook para manejar el stack de toasts. */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const toast = (text: string, kind: ToastKind = 'success') => {
    const id = _nextId++
    setMessages(m => [...m, { id, kind, text }])
  }

  const dismiss = (id: number) => setMessages(m => m.filter(x => x.id !== id))

  return { messages, toast, dismiss }
}
