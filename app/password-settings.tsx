'use client';
import { useId, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import PasswordStrengthIndicator from './password-strength';
import { passwordStrength } from '../lib/passwords.mjs';

export default function PasswordSettings({ email, administrator = true, forced = false }: { email: string; administrator?: boolean; forced?: boolean }) {
  const strengthId = useId();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <section className="panel panel-pad password-settings"><h3><LockKeyhole size={19}/> {forced ? 'Set your own password' : administrator ? 'Administrator password' : 'My password'}</h3>
    <p>Account: <strong>{email}</strong></p>{forced && <p>You are using a temporary password. Set your own password before opening your application.</p>}<p>After changing your password, all sessions will be signed out. Use your new password to sign in again.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setError('');
      if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
      if (passwordStrength(newPassword) === 'weak') { setError('Choose a medium or strong new password.'); return; }
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
        <label className="field"><span>New password</span><input type="password" name="newPassword" autoComplete="new-password" required minLength={12} maxLength={1024} aria-describedby={strengthId} aria-invalid={newPassword ? passwordStrength(newPassword) === 'weak' : undefined} disabled={busy} value={newPassword} onChange={event => setNewPassword(event.target.value)}/></label>
        <label className="field"><span>Confirm new password</span><input type="password" name="confirmPassword" autoComplete="new-password" required minLength={12} maxLength={1024} disabled={busy} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/></label>
      </div>
      <PasswordStrengthIndicator password={newPassword} id={strengthId}/>
      {error && <p className="signin-error" role="alert">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy || passwordStrength(newPassword) === 'weak'}>{busy ? 'Changing password…' : 'Change password'}</button>
    </form>
  </section>;
}
