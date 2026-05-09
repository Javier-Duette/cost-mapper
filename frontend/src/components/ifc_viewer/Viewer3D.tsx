import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as OBC from '@thatopen/components'
import * as THREE from 'three'

import { Icon } from '../shared/Icon'

interface Viewer3DProps {
  projectId: string | null
  selectedGlobalId: string | null
  onSelectGlobalId: (globalId: string | null) => void
}

type ViewerStatus = 'idle' | 'loading' | 'ready' | 'no-ifc' | 'error'

type ViewerRuntime = {
  components: OBC.Components
  world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
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
export function Viewer3D({ projectId, selectedGlobalId, onSelectGlobalId }: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<ViewerRuntime | null>(null)

  const [status, setStatus] = useState<ViewerStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const hasProject = Boolean(projectId)

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
    if (!rt || !projectId) return

    setStatus('loading')
    setError(null)

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

    const buffer = new Uint8Array(await res.arrayBuffer())

    // WASM: en dev, usar CDN para evitar problemas de bundling.
    rt.ifcLoader.settings.wasm = {
      path: 'https://unpkg.com/web-ifc@0.0.77/',
      absolute: true,
    }

    await rt.ifcLoader.setup({ autoSetWasm: false })
    const model = await rt.ifcLoader.load(buffer, true, `project-${projectId.slice(0, 8)}`)
    model.useCamera(rt.world.camera.three)
    rt.world.scene.three.add(model.object)
    rt.model = model

    setStatus('ready')
    await resetView()
    await highlightGuid(selectedGlobalId)
  }, [projectId, resetView, selectedGlobalId, highlightGuid])

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

    const ifcLoader = components.get(OBC.IfcLoader)

    runtimeRef.current = {
      components,
      world,
      ifcLoader,
      model: null,
      highlightedLocalIds: [],
    }

    const canvas = world.renderer.three.domElement
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', handleClick)

    return () => {
      canvas.removeEventListener('pointerdown', handleClick)
      void clearHighlight()
      runtimeRef.current = null
      components.dispose()
    }
  }, [handleClick, clearHighlight])

  // Reload IFC when project changes
  useEffect(() => {
    const rt = runtimeRef.current
    if (!rt) return

    if (!projectId) {
      setStatus('idle')
      setError(null)
      return
    }

    void loadIfc()
  }, [projectId, loadIfc])

  // Highlight when selection changes (table -> viewer)
  useEffect(() => {
    if (status !== 'ready') return
    void highlightGuid(selectedGlobalId)
  }, [selectedGlobalId, highlightGuid, status])

  const overlay = useMemo(() => {
    if (!hasProject) return 'Seleccioná un proyecto para ver el modelo.'
    if (status === 'loading') return 'Cargando IFC…'
    if (status === 'no-ifc') return 'El proyecto aún no tiene IFC importado.'
    if (status === 'error') return error ?? 'Error al cargar el visor.'
    return null
  }, [hasProject, status, error])

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
