import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { Icon } from '../shared/Icon'

function _resolveUrl(urlOrPath: string) {
  try {
    return new URL(urlOrPath, window.location.href).toString()
  } catch {
    return urlOrPath
  }
}

interface Viewer3DProps {
  projectId: string | null
  selectedGlobalId: string | null
  onSelectGlobalId: (globalId: string | null) => void
  ifcFile?: File | null
}

type ViewerStatus = 'idle' | 'loading' | 'ready' | 'no-ifc' | 'error'

type ViewerRuntime = {
  components: OBC.Components
  world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
  fragments: OBC.FragmentsManager
  ifcLoader: OBC.IfcLoader
  model: import('@thatopen/fragments').FragmentsModel | null
  highlightedLocalIds: number[]
}

function _mouseToNdc(dom: HTMLElement, clientX: number, clientY: number) {
  const rect = dom.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * 2 - 1
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1)
  return new THREE.Vector2(x, y)
}

/** Visor 3D (MVP) — carga IFC del proyecto y permite selección por click. */
export function Viewer3D({ projectId, selectedGlobalId, onSelectGlobalId, ifcFile = null }: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<ViewerRuntime | null>(null)
  const loadSeqRef = useRef(0)

  const [status, setStatus] = useState<ViewerStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const hasSource = Boolean(ifcFile || projectId)

  const resetView = useCallback(async () => {
    const rt = runtimeRef.current
    if (!rt) return
    await rt.world.camera.fitToItems()
  }, [])

  const clearHighlight = useCallback(async () => {
    const rt = runtimeRef.current
    if (!rt?.model) return
    if (rt.highlightedLocalIds.length === 0) return
    await rt.model.resetColor(rt.highlightedLocalIds)
    rt.highlightedLocalIds = []
  }, [])

  const highlightGuid = useCallback(async (guid: string | null) => {
    const rt = runtimeRef.current
    if (!rt?.model) return
    await clearHighlight()
    if (!guid) return

    const ids = await rt.model.getLocalIdsByGuids([guid])
    const localId = ids[0] ?? null
    if (!localId) return

    rt.highlightedLocalIds = [localId]
    await rt.model.setColor([localId], new THREE.Color('#22c55e'))
  }, [clearHighlight])

  const loadIfc = useCallback(async () => {
    const rt = runtimeRef.current
    if (!rt) return

    const seq = ++loadSeqRef.current
    const stillActive = () => loadSeqRef.current === seq && runtimeRef.current === rt

    setStatus('loading')
    setError(null)

    try {
      // Clear any previous model
      if (rt.model) {
        try {
          await rt.model.dispose()
        } catch {
          // best-effort cleanup
        }
        rt.model = null
      }
      rt.highlightedLocalIds = []

      let buffer: Uint8Array
      let modelName = 'ifc'

      if (ifcFile) {
        buffer = new Uint8Array(await ifcFile.arrayBuffer())
        modelName = ifcFile.name
      } else if (projectId) {
        const res = await fetch(`/api/projects/${projectId}/ifc/file`)
        if (res.status === 404) {
          setStatus('no-ifc')
          return
        }
        if (!res.ok) {
          setStatus('error')
          setError(`No se pudo cargar IFC (${res.status})`)
          return
        }
        buffer = new Uint8Array(await res.arrayBuffer())
        modelName = `project-${projectId.slice(0, 8)}`
      } else {
        setStatus('no-ifc')
        return
      }

      if (!stillActive()) return

      // Fragments: asegurar que el manager esté inicializado antes de usar IfcLoader.load().
      if (!rt.fragments.initialized) {
        const workerPath =
          import.meta.env.VITE_FRAGMENTS_WORKER_URL ?? `${import.meta.env.BASE_URL}fragments-worker/worker.mjs`
        rt.fragments.init(_resolveUrl(workerPath))
      }

      // WASM: por defecto se sirve local desde `public/web-ifc/` (copiado desde node_modules).
      // Override opcional vía .env para casos especiales.
      const wasmPath = import.meta.env.VITE_WEB_IFC_WASM_PATH ?? `${import.meta.env.BASE_URL}web-ifc/`
      rt.ifcLoader.settings.wasm = {
        path: _resolveUrl(wasmPath),
        absolute: true,
      }

      await rt.ifcLoader.setup({ autoSetWasm: false })
      if (!stillActive()) return

      const model = await rt.ifcLoader.load(buffer, true, modelName)
      if (!stillActive()) {
        try {
          await model.dispose()
        } catch {
          // best-effort cleanup
        }
        return
      }
      model.useCamera(rt.world.camera.three)
      rt.world.scene.three.add(model.object)
      rt.model = model
      void rt.fragments.core.update(true)

      setStatus('ready')
      await resetView()
      await highlightGuid(selectedGlobalId)
    } catch (e) {
      if (!stillActive()) return
      setStatus('error')
      if (e instanceof Error && e.name === 'AbortError') return
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        setError('No se pudo conectar al backend. Verificá que esté corriendo en http://localhost:8002.')
        return
      }
      setError(e instanceof Error ? e.message : 'Error al cargar el IFC en el visor.')
    }
  }, [projectId, ifcFile, resetView, selectedGlobalId, highlightGuid])

  const handleClick = useCallback(async (ev: PointerEvent) => {
    const rt = runtimeRef.current
    if (!rt?.model) return

    const renderer = rt.world.renderer
    if (!renderer) return

    const dom = renderer.three.domElement
    const mouse = _mouseToNdc(dom, ev.clientX, ev.clientY)

    const result = await rt.model.raycast({
      camera: rt.world.camera.three,
      mouse,
      dom,
    })

    if (!result) {
      onSelectGlobalId(null)
      await clearHighlight()
      return
    }

    const [guid] = await rt.model.getGuidsByLocalIds([result.localId])
    onSelectGlobalId(guid ?? null)
    await highlightGuid(guid ?? null)
  }, [clearHighlight, highlightGuid, onSelectGlobalId])

  // Init viewer runtime once
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const components = new OBC.Components()
    const worlds = components.get(OBC.Worlds)
    const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>()
    world.scene = new OBC.SimpleScene(components)
    world.renderer = new OBC.SimpleRenderer(components, container)
    world.camera = new OBC.SimpleCamera(components)

    components.init()
    world.scene.setup()
    world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0)

    const grids = components.get(OBC.Grids)
    grids.create(world)

    const fragments = components.get(OBC.FragmentsManager)
    // Worker: por defecto se sirve local desde `public/fragments-worker/worker.mjs`
    // (copiado desde node_modules en `npm run dev/build`).
    const fragmentsWorkerUrl =
      import.meta.env.VITE_FRAGMENTS_WORKER_URL ?? `${import.meta.env.BASE_URL}fragments-worker/worker.mjs`
    fragments.init(_resolveUrl(fragmentsWorkerUrl))

    const onCameraUpdate = () => {
      try {
        fragments.core.update()
      } catch {
        // fragments aún no listo (best-effort)
      }
    }
    const onCameraRest = () => {
      try {
        fragments.core.update(true)
      } catch {
        // fragments aún no listo (best-effort)
      }
    }
    world.camera.controls.addEventListener('update', onCameraUpdate)
    world.camera.controls.addEventListener('rest', onCameraRest)

    const ifcLoader = components.get(OBC.IfcLoader)

    runtimeRef.current = {
      components,
      world,
      fragments,
      ifcLoader,
      model: null,
      highlightedLocalIds: [],
    }

    const canvas = world.renderer.three.domElement
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', handleClick)

    return () => {
      loadSeqRef.current += 1
      canvas.removeEventListener('pointerdown', handleClick)
      world.camera.controls.removeEventListener('update', onCameraUpdate)
      world.camera.controls.removeEventListener('rest', onCameraRest)
      void clearHighlight()
      runtimeRef.current = null
      components.dispose()
    }
  }, [handleClick, clearHighlight])

  // Reload IFC when source changes
  useEffect(() => {
    const rt = runtimeRef.current
    if (!rt) return

    if (!ifcFile && !projectId) {
      setStatus('idle')
      setError(null)
      return
    }

    void loadIfc()
  }, [projectId, ifcFile, loadIfc])

  // Highlight when selection changes (table -> viewer)
  useEffect(() => {
    if (status !== 'ready') return
    void highlightGuid(selectedGlobalId)
  }, [selectedGlobalId, highlightGuid, status])

  const overlay = useMemo(() => {
    if (!hasSource) return 'Seleccioná un IFC local para ver el modelo.'
    if (status === 'loading') return 'Cargando IFC…'
    if (status === 'no-ifc') return projectId ? 'El proyecto aún no tiene IFC importado.' : 'No hay IFC seleccionado.'
    if (status === 'error') return error ?? 'Error al cargar el visor.'
    return null
  }, [hasSource, status, error, projectId])

  return (
    <div className="viewer" style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {overlay && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: status === 'error' ? 'var(--error)' : 'var(--text-secondary)',
          fontSize: 13,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.0))',
          pointerEvents: 'none',
          textAlign: 'center',
        }}>
          {overlay}
        </div>
      )}

      <div className="viewer-toolbar">
        <button title="Zoom extents" onClick={() => { void resetView() }} disabled={status !== 'ready'}>
          <Icon name="zoom_extents" size={16} />
        </button>
        <button title="Limpiar selección" onClick={() => { onSelectGlobalId(null); void clearHighlight() }} disabled={status !== 'ready'}>
          <Icon name="reset" size={16} />
        </button>
      </div>
    </div>
  )
}
