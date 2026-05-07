/* Viewer3D — simplified for Mapeo IFC view (no collapse — it's permanent here). */
function Viewer3D({ hasModel = true }) {
  const [tool, setTool] = React.useState('orbit');
  const [wireframe, setWireframe] = React.useState(false);

  return (
    <div className="viewer">
      <div className="viewer__grid" />
      <div className="viewer__center">
        {hasModel ? (
          <div className="cube-stage">
            <div className="cube">
              <div className="face f1" /><div className="face f2" /><div className="face f3" />
              <div className="face f4" /><div className="face f5" /><div className="face f6" />
            </div>
          </div>
        ) : (
          <div className="viewer-empty">
            <Icon name="wireframe" size={56} style={{ color: '#6B6B6B' }} />
            <div className="viewer-empty__title">No hay modelo IFC cargado</div>
            <div className="viewer-empty__sub">Importá uno para vincular geometría con costos.</div>
          </div>
        )}
      </div>
      {hasModel && (
        <div className="viewer-toolbar">
          <button className={tool === 'orbit' ? 'is-active' : ''} onClick={() => setTool('orbit')} title="Orbitar"><Icon name="orbit" size={14} /></button>
          <button onClick={() => setTool('zoom')} title="Zoom a extents"><Icon name="zoom_extents" size={14} /></button>
          <button onClick={() => setTool('orbit')} title="Reset vista"><Icon name="reset" size={14} /></button>
          <button className={wireframe ? 'is-active' : ''} onClick={() => setWireframe(w => !w)} title="Wireframe"><Icon name="wireframe" size={14} /></button>
        </div>
      )}
    </div>
  );
}

window.Viewer3D = Viewer3D;
