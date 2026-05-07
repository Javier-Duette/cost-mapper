/** Formatea número con separador de miles (es-PY). */
export function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('es-PY')
}
