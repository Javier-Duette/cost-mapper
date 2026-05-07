import { useState, useEffect, useRef } from 'react'

interface InlineEditProps {
  value: string | number | null
  onSave: (val: string) => void
  type?: 'text' | 'number'
  align?: 'left' | 'right'
  children?: React.ReactNode
}

/** Componente compartido para edición en línea (texto y números) */
export function InlineEdit({ 
  value, 
  onSave, 
  type = 'text',
  align = 'left',
  children
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempVal, setTempVal] = useState(value?.toString() ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTempVal(value?.toString() ?? '')
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    setIsEditing(false)
    if (tempVal !== (value?.toString() ?? '')) {
      onSave(tempVal)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setTempVal(value?.toString() ?? '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={tempVal}
        onChange={e => setTempVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          background: 'var(--bg-elevated, #2a2a2a)',
          color: 'var(--text-primary, #fff)',
          border: '1px solid var(--border-color, #444)',
          borderRadius: 2,
          padding: '2px 4px',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          textAlign: align
        }}
      />
    )
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      style={{ 
        cursor: 'text', 
        minHeight: 18, 
        minWidth: 20,
        display: 'inline-block',
        width: '100%',
        textAlign: align,
        borderBottom: '1px dashed transparent',
        transition: 'border-color 0.2s'
      }}
      onMouseEnter={e => e.currentTarget.style.borderBottom = '1px dashed var(--text-secondary, #888)'}
      onMouseLeave={e => e.currentTarget.style.borderBottom = '1px dashed transparent'}
    >
      {children ? children : (type === 'number' && value != null 
        ? (align === 'right' ? Number(value).toLocaleString('es-PY') : value) 
        : (value ?? ''))}
    </div>
  )
}
