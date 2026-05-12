/** Formatea precio en ₲ sin decimales (es-PY). */
export function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/** Formatea cantidad de medición con hasta 3 decimales significativos (es-PY). */
export function fmtQty(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}
