export interface WebIfcParsedElement {
  expressId: number
  globalId: string
  ifcType: string
  ifcName: string | null
}

const unwrapValue = (v: unknown): string | null => {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>
    if (typeof obj.value === 'string') return obj.value
    if (typeof obj.Value === 'string') return obj.Value
  }
  return null
}

/**
 * Parsea un IFC en el navegador con `web-ifc` y extrae una lista mínima de elementos.
 *
 * Nota: apunta a ser "best-effort" y estable; no intenta extraer propiedades pesadas.
 */
export async function parseIfcElementsWithWebIfc(
  buffer: Uint8Array,
  params?: { wasmPath?: string },
): Promise<WebIfcParsedElement[]> {
  const webIfc = await import('web-ifc')
  const ifcApi = new webIfc.IfcAPI()

  const wasmPath =
    params?.wasmPath ??
    import.meta.env.VITE_WEB_IFC_WASM_PATH ??
    `${import.meta.env.BASE_URL}web-ifc/`

  ifcApi.SetWasmPath(wasmPath, true)
  await ifcApi.Init()
  ifcApi.SetLogLevel(webIfc.LogLevel.LOG_LEVEL_OFF)

  const modelId = ifcApi.OpenModel(buffer)

  try {
    const typeNameByCode = new Map<number, string>()
    for (const [key, value] of Object.entries(webIfc)) {
      if (key.startsWith('IFC') && typeof value === 'number') typeNameByCode.set(value, key)
    }

    const getIds = (typeCode: unknown) => {
      if (typeof typeCode !== 'number') throw new Error('web-ifc: typeCode inválido')
      return ifcApi.GetLineIDsWithType(modelId, typeCode, true)
    }

    let vec: any
    try {
      vec = getIds((webIfc as any).IFCBUILDINGELEMENT)
      if (!vec || typeof vec.size !== 'function' || vec.size() === 0) {
        vec = getIds((webIfc as any).IFCPRODUCT)
      }
    } catch {
      vec = getIds((webIfc as any).IFCPRODUCT)
    }

    const elements: WebIfcParsedElement[] = []
    const max = vec.size()
    for (let i = 0; i < max; i++) {
      const expressId = Number(vec.get(i))
      if (!Number.isFinite(expressId)) continue

      const line = ifcApi.GetLine(modelId, expressId, true) as any
      const globalId = unwrapValue(line?.GlobalId)
      if (!globalId) continue

      const typeCode = ifcApi.GetLineType(modelId, expressId) as number
      const ifcType = typeNameByCode.get(typeCode) ?? `TYPE_${typeCode}`
      const ifcName = unwrapValue(line?.Name)

      elements.push({
        expressId,
        globalId,
        ifcType,
        ifcName,
      })
    }

    return elements
  } finally {
    ifcApi.CloseModel(modelId)
  }
}

