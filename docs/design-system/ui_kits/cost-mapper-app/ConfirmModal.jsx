/* Modal — global price-change confirmation dialog. Generic enough for other prompts. */
function ConfirmModal({ title, body, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel, danger = false }) {
  return (
    <div className="scrim" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hdr">
          <div className="modal__title">
            <Icon name="warning" size={18} />
            {title}
          </div>
        </div>
        <div className="modal__body" dangerouslySetInnerHTML={{ __html: body }} />
        <div className="modal__footer">
          <button className="kit-btn kit-btn--ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            className="kit-btn kit-btn--primary"
            style={danger ? { background: '#F44336', borderColor: '#F44336' } : null}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

window.ConfirmModal = ConfirmModal;
