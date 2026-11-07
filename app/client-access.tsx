'use client';
import { useEffect, useState } from 'react';
import { Copy, KeyRound, X } from 'lucide-react';
import { clientLoginText } from '../lib/client-login-details';
import TemporaryPassword from './temporary-password';
import { passwordStrength } from '../lib/passwords.mjs';

export type LoginDetails = {email: string; password: string; version: string; applicationId: string};
type CreatedApplication = Record<string, unknown> & {id: string; clientAccountCreated?: boolean; clientCredentialVersion?: string};
export function NewClientModal({ onClose, onCreated }: {onClose: () => void; onCreated: (application: CreatedApplication, details: LoginDetails | null) => Promise<void>}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-labelledby="new-client-heading" onSubmit={async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase(), password = String(form.get('temporaryPassword') || '');
    if (password && passwordStrength(password) === 'weak') { setError('Choose a medium or strong temporary password.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/applications', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({assignedEmail: email, temporaryPassword: password, data: {legalName: form.get('business'), contactEmail: email}})});
      const result = await response.json() as CreatedApplication & {error?: string};
      if (!response.ok) throw new Error(result.error || 'Unable to create the client.');
      await onCreated(result, result.clientAccountCreated && result.clientCredentialVersion ? {email, password, version: result.clientCredentialVersion, applicationId: result.id} : null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to create the client.'); }
    finally { setBusy(false); }
  }}>
    <button type="button" className="close" aria-label="Close new client" disabled={busy} onClick={onClose}><X size={20}/></button>
    <div className="modal-icon"><KeyRound size={24}/></div><h2 id="new-client-heading">A new beginning.</h2><p>Create an application and sign-in account for your client.</p>
    <label className="field"><span>Business name</span><input name="business" required disabled={busy}/></label>
    <label className="field"><span>Client’s sign-in email</span><input name="email" type="email" autoComplete="off" required maxLength={254} disabled={busy}/><small>No email is sent automatically.</small></label>
    <TemporaryPassword value={password} onChange={setPassword} disabled={busy} hint="Leave blank only if this email already has a client account; its password will stay unchanged."/>
    {error && <p className="signin-error" role="alert">{error}</p>}
    <button className="btn primary full" disabled={busy || !!password && passwordStrength(password) === 'weak'}>{busy ? 'Creating client…' : 'Create client workspace'}</button>
  </form></div>;
}

export function ClientCredentials({ details, onClose }: {details: LoginDetails; onClose: () => void}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="client-login-heading">
    <button type="button" className="close" aria-label="Close login details" onClick={onClose}><X size={20}/></button>
    <div className="modal-icon"><KeyRound size={24}/></div><h2 id="client-login-heading">Client login is ready.</h2>
    <p>Share these details with your client through your usual private channel. They must change this temporary password before continuing their application.</p>
    <label className="field"><span>Sign-in email</span><input readOnly value={details.email}/></label>
    <label className="field"><span>Temporary password</span><input readOnly value={details.password}/></label>
    <button className="btn primary full" onClick={async () => {
      try {
        const response = await fetch(`/api/applications/${details.applicationId}/client-access`);
        const access = await response.json() as {email: string; hasAccount: boolean; mustChangePassword: boolean; credentialVersion?: string; error?: string};
        if (!response.ok) throw new Error(access.error || 'Unable to check client access.');
        await navigator.clipboard.writeText(clientLoginText(location.origin, details.applicationId, access, details)); setCopied(true); setCopyError('');
      } catch (failure) { setCopyError(failure instanceof Error ? failure.message : 'Copy failed. Select and copy the details above.'); }
    }}><Copy size={16}/>{copied ? 'Login details copied' : 'Copy login details'}</button>
    {copyError && <p role="alert">{copyError}</p>}<small>No email is sent automatically. Temporary passwords can be copied again from this application until you refresh or sign out.</small>
  </section></div>;
}

export default function ClientAccess({ applicationId, email, onReady }: {applicationId: string; email?: string; onReady: (details: LoginDetails) => void}) {
  const [access, setAccess] = useState<{hasAccount: boolean; mustChangePassword: boolean} | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setAccess(null); setError(''); setPassword('');
    if (email) fetch(`/api/applications/${applicationId}/client-access`).then(async response => {
      const result = await response.json() as {hasAccount: boolean; mustChangePassword: boolean; error?: string};
      if (!response.ok) throw new Error(result.error || 'Unable to load client access.');
      if (active) setAccess(result);
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [applicationId, email]);
  return <section className="panel"><div className="panel-heading"><h3>Client sign-in</h3><KeyRound size={18}/></div><div className="panel-pad">
    {!email ? <p>This application has no assigned client email.</p> : <>
      <p className="muted">{email}</p>
      <p className="muted">{access ? access.hasAccount ? access.mustChangePassword ? 'A temporary password is set. The client must change it on sign-in.' : 'Client login is active. Reset their password if they need help signing in.' : 'This existing application needs a client login. Assign a temporary password below.' : 'Loading access…'}</p>
      <form onSubmit={async event => {
        event.preventDefault(); if (!access) return;
        if (passwordStrength(password) === 'weak') { setError('Choose a medium or strong temporary password.'); return; }
        setBusy(true); setError('');
        try {
          const response = await fetch(`/api/applications/${applicationId}/client-access`, { method: access.hasAccount ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({temporaryPassword: password}) });
          const result = await response.json() as {error?: string; credentialVersion: string};
          if (!response.ok) throw new Error(result.error || 'Unable to save client access.');
          onReady({email, password, version: result.credentialVersion, applicationId}); setPassword(''); setAccess({hasAccount: true, mustChangePassword: true});
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save client access.'); }
        finally { setBusy(false); }
      }}>
        <TemporaryPassword value={password} onChange={setPassword} disabled={busy || !access} required hint="A reset signs this client out on all devices."/>
        <button className="btn secondary full" disabled={busy || !access || passwordStrength(password) === 'weak'}>{busy ? 'Saving…' : access?.hasAccount ? 'Reset client password' : 'Create client login'}</button>
      </form>
    </>}
    {error && <p className="signin-error" role="alert">{error}</p>}
  </div></section>;
}
