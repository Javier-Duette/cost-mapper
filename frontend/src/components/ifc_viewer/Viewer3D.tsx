import { Icon } from '../shared/Icon'

/** Placeholder del visor 3D — reemplazar con @thatopen/components cuando se implemente ifc_importer. */
export function Viewer3D() {
  return (
    <div className="viewer">
      <div className="viewer__grid" />
      <div className="viewer__center">
        <div className="cube-stage">
          <div className="cube">
            <div className="face f1" />
            <div className="face f2" />
            <div className="face f3" />
            <div className="face f4" />
            <div className="face f5" />
            <div className="face f6" />
          </div>
        </div>
      </div>
      <div className="viewer-toolbar">
        <button title="Órbita"><Icon name="orbit" size={16} /></button>
        <button title="Zoom extents"><Icon name="zoom_extents" size={16} /></button>
        <button title="Resetear vista"><Icon name="reset" size={16} /></button>
        <button title="Wireframe"><Icon name="wireframe" size={16} /></button>
      </div>
    </div>
  )
}
