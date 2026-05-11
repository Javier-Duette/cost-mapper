export interface StepParsedElement {
  expressId: number
  globalId: string
  ifcType: string
  ifcName: string | null
}

function decodeIfcControlDirectives(raw: string): string {
  let s = raw

  // Code pages markers like \PA\ (ISO 8859-1) are irrelevant for decoding our subset.
  s = s.replace(/\\P[A-Z]\\?/gi, '')

  // Unicode encoding: \X2\00C4\X0\
  s = s.replace(/\\X2\\([0-9A-Fa-f]+)\\X0\\/g, (_m, hex: string) => {
    const clean = String(hex).replace(/[^0-9A-Fa-f]/g, '')
    const out: string[] = []
    for (let i = 0; i + 4 <= clean.length; i += 4) {
      const codePoint = Number.parseInt(clean.slice(i, i + 4), 16)
      if (!Number.isFinite(codePoint)) continue
      out.push(String.fromCodePoint(codePoint))
    }
    return out.join('')
  })

  // 8-bit ISO 10646 row 0: \X\C4
  s = s.replace(/\\X\\([0-9A-Fa-f]{2})/g, (_m, h: string) => {
    const codePoint = Number.parseInt(h, 16)
    if (!Number.isFinite(codePoint)) return ''
    return String.fromCodePoint(codePoint)
  })

  // Default ISO 8859-1: \S\D means (0x80 + ord('D'))
  s = s.replace(/\\S\\(.)/g, (_m, ch: string) => {
    const codePoint = (ch?.charCodeAt(0) ?? 0) + 0x80
    return String.fromCodePoint(codePoint)
  })

  return s
}

function decodeStepStringToken(token: string): string | null {
  const t = token.trim()
  if (t === '$') return null
  if (!t.startsWith("'")) return null

  // STEP strings are delimited by single quotes and escape a quote as ''
  const inner = t.endsWith("'") ? t.slice(1, -1) : t.slice(1)
  const unescaped = inner.replace(/''/g, "'")
  return decodeIfcControlDirectives(unescaped)
}

function splitTopLevelArgs(args: string, maxParts: number): string[] {
  const parts: string[] = []
  let start = 0
  let depth = 0
  let inString = false

  for (let i = 0; i < args.length; i++) {
    const c = args[i]

    if (inString) {
      if (c === "'") {
        // escaped quote '' inside string
        if (args[i + 1] === "'") {
          i++
          continue
        }
        inString = false
      }
      continue
    }

    if (c === "'") {
      inString = true
      continue
    }

    if (c === '(') {
      depth++
      continue
    }

    if (c === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }

    if (c === ',' && depth === 0) {
      parts.push(args.slice(start, i))
      start = i + 1
      if (parts.length >= maxParts) return parts
    }
  }

  parts.push(args.slice(start))
  return parts
}

function shouldIncludeType(ifcTypeRaw: string): boolean {
  const t = ifcTypeRaw.toUpperCase()
  if (!t.startsWith('IFC')) return false

  // Exclusions: relations/properties/quantities/types & non-element root objects
  if (t.startsWith('IFCREL')) return false
  if (t.startsWith('IFCPROPERTY')) return false
  if (t.startsWith('IFCQUANTITY')) return false
  if (t === 'IFCELEMENTQUANTITY') return false
  if (t === 'IFCPHYSICALCOMPLEXQUANTITY') return false
  if (t.endsWith('TYPE')) return false

  // Exclusions: spatial decomposition root nodes (not useful for mapping costs)
  if (t === 'IFCPROJECT') return false
  if (t === 'IFCSITE') return false
  if (t === 'IFCBUILDING') return false
  if (t === 'IFCBUILDINGSTOREY') return false
  if (t === 'IFCSPACE') return false
  if (t === 'IFCGROUP') return false

  // Exclusions: styling / presentation
  if (t === 'IFCSURFACESTYLE') return false
  if (t === 'IFCPRESENTATIONLAYERASSIGNMENT') return false
  if (t === 'IFCGEOMETRICREPRESENTATIONSUBCONTEXT') return false

  // Exclusions: classification metadata (not elements)
  if (t === 'IFCCLASSIFICATION' || t === 'IFCCLASSIFICATIONREFERENCE') return false

  return true
}

/**
 * Parser liviano (sin WASM) para IFC-SPF (STEP).
 * Extrae elementos "tipo elemento" detectando entidades IFC con GlobalId como 1er argumento.
 */
export function parseIfcElementsWithStepText(stepText: string): StepParsedElement[] {
  // Normaliza a mayúsculas para detección, pero conserva el texto original para slicing
  const text = stepText

  const elements: StepParsedElement[] = []
  const len = text.length
  let i = 0

  while (i < len) {
    const hash = text.indexOf('#', i)
    if (hash === -1) break

    let p = hash + 1
    let id = 0
    let hasDigits = false
    while (p < len) {
      const code = text.charCodeAt(p)
      if (code >= 48 && code <= 57) {
        hasDigits = true
        id = id * 10 + (code - 48)
        p++
        continue
      }
      break
    }
    if (!hasDigits || text[p] !== '=') {
      i = hash + 1
      continue
    }
    p++ // skip '='

    // Read entity type name until '('
    const typeStart = p
    while (p < len && text[p] !== '(') p++
    if (p >= len) break
    const ifcType = text.slice(typeStart, p).trim().toUpperCase()
    p++ // skip '('

    // Parse args until matching ')', respecting strings and nested parentheses.
    const argsStart = p
    let depth = 1
    let inString = false
    while (p < len && depth > 0) {
      const c = text[p]
      if (inString) {
        if (c === "'") {
          if (text[p + 1] === "'") {
            p += 2
            continue
          }
          inString = false
        }
        p++
        continue
      }

      if (c === "'") {
        inString = true
        p++
        continue
      }

      if (c === '(') depth++
      else if (c === ')') depth--

      p++
    }
    if (depth !== 0) break

    const argsEnd = p - 1 // position of ')'
    const args = text.slice(argsStart, argsEnd)

    // Move forward to ';' that closes the entity instance.
    while (p < len && text[p] !== ';') p++
    if (p >= len) break

    const parts = splitTopLevelArgs(args, 3)
    if (parts.length < 2) {
      i = p + 1
      continue
    }

    const globalId = decodeStepStringToken(parts[0])
    if (!globalId) {
      i = p + 1
      continue
    }

    if (!shouldIncludeType(ifcType)) {
      i = p + 1
      continue
    }

    const ifcName = parts.length >= 3 ? decodeStepStringToken(parts[2]) : null
    elements.push({ expressId: id, globalId, ifcType, ifcName })

    i = p + 1
  }

  return elements
}

