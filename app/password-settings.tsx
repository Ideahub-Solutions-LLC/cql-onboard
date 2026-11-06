'use client';
import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';

export default function PasswordSettings({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <section className="panel panel-pad password-settings"><h3><LockKeyhole size={19}/> Administrator password</h3>
    <p>Administrator: <strong>{email}</strong></p><p>After changing your password, all sessions will be signed out. Use your new password to sign in again.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setError('');
      if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
      setBusy(true);
      try {
        const response = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || 'Unable to change your password. Please try again.');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        window.location.reload();
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to change your password. Please try again.'); }
      finally { setBusy(false); }
    }}>
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden/>
      <div className="form-grid">
        <label className="field"><span>Current password</span><input type="password" name="currentPassword" autoComplete="current-password" required maxLength={1024} disabled={busy} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/></label>
        <label className="field"><span>New password</span><input type="password" name="newPassword" autoComplete="new-password" required minLength={12} maxLength={1024} disabled={busy} value={newPassword} onChange={event => setNewPassword(event.target.value)}/><small>At least 12 characters.</small></label>
        <label className="field"><span>Confirm new password</span><input type="password" name="confirmPassword" autoComplete="new-password" required minLength={12} maxLength={1024} disabled={busy} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/></label>
      </div>
      {error && <p className="signin-error" role="alert">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Changing password…' : 'Change password'}</button>
    </form>
  </section>;
}
