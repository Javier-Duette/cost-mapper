/* PdfPreviewModal — full-screen overlay rendering the A4 PDF mockup in an iframe.
   The PDF document itself lives at preview/pdf-export.html and is registered as its own asset card. */
function PdfPreviewModal({ onClose }) {
  return (
    <div className="pdf-overlay">
      <div className="pdf-overlay__bar">
        <div className="pdf-overlay__title">
          <Icon name="reports" size={16} />
          <span>Vista previa — Presupuesto.pdf</span>
          <span className="pdf-overlay__meta">A4 vertical · 24 páginas · 1.4 MB</span>
        </div>
        <div className="pdf-overlay__tools">
          <button className="kit-btn kit-btn--ghost"><Icon name="export" size={14} />&nbsp;Descargar PDF</button>
          <button className="kit-btn kit-btn--ghost" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
      </div>
      <div className="pdf-overlay__frame">
        <iframe src="../../preview/pdf-export.html" title="Presupuesto PDF" />
      </div>
    </div>
  );
}

window.PdfPreviewModal = PdfPreviewModal;
