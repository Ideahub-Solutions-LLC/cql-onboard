'use client';
import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function DeleteClient({ application, onClose, onDelete }: { application: { id: string; data: { legalName?: string }; assigned_email?: string }; onClose: () => void; onDelete: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const dismiss = () => { if (!busy) { dialog.current?.close(); onClose(); } };
  const name = application.data.legalName || 'New client';
  return <dialog ref={dialog} className="modal delete-client-modal" aria-labelledby="delete-client-heading" aria-describedby="delete-client-description" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <div className="modal-icon delete-client-icon"><Trash2 size={24}/></div>
    <h2 id="delete-client-heading">Delete this client?</h2>
    <p><strong>{name}</strong>{application.assigned_email && <><br/>{application.assigned_email}</>}</p>
    <p id="delete-client-description">This permanently deletes this application, uploaded documents, internal notes, and saved vault data. This cannot be undone.</p>
    <p>Other applications for this client stay intact. Their sign-in account is removed only when they have no applications left.</p>
    {error && <p className="signin-error" role="alert">{error}</p>}
    <div className="button-row delete-client-actions">
      <button type="button" className="btn secondary" autoFocus disabled={busy} onClick={dismiss}>Cancel</button>
      <button type="button" className="btn delete-client-confirm" disabled={busy} onClick={async () => {
        if (busy) return;
        setBusy(true); setError('');
        try { await onDelete(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to delete this client. Please try again.'); } finally { setBusy(false); }
      }}><Trash2 size={16}/>{busy ? 'Deleting…' : error ? 'Retry delete' : 'Delete client'}</button>
    </div>
  </dialog>;
}
