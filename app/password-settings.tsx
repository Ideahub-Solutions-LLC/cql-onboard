'use client';
import { useId, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import PasswordStrengthIndicator from './password-strength';
import { passwordStrength } from '../lib/passwords.mjs';

export default function PasswordSettings({ email, administrator = true, forced = false }: { email: string; administrator?: boolean; forced?: boolean }) {
  const strengthId = useId();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
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
        <label className="field"><span>Current password<b className="required">* Required</b></span><div className="temporary-password-input"><input type={visible.currentPassword ? 'text' : 'password'} name="currentPassword" autoComplete="current-password" required maxLength={1024} disabled={busy} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/><button type="button" disabled={busy} aria-label={visible.currentPassword ? 'Hide current password' : 'Show current password'} aria-pressed={visible.currentPassword} onClick={() => setVisible(current => ({ ...current, currentPassword: !current.currentPassword }))}>{visible.currentPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        <label className="field"><span>New password<b className="required">* Required</b></span><div className="temporary-password-input"><input type={visible.newPassword ? 'text' : 'password'} name="newPassword" autoComplete="new-password" required minLength={12} maxLength={1024} aria-describedby={strengthId} aria-invalid={newPassword ? passwordStrength(newPassword) === 'weak' : undefined} disabled={busy} value={newPassword} onChange={event => setNewPassword(event.target.value)}/><button type="button" disabled={busy} aria-label={visible.newPassword ? 'Hide new password' : 'Show new password'} aria-pressed={visible.newPassword} onClick={() => setVisible(current => ({ ...current, newPassword: !current.newPassword }))}>{visible.newPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        <label className="field"><span>Confirm new password<b className="required">* Required</b></span><div className="temporary-password-input"><input type={visible.confirmPassword ? 'text' : 'password'} name="confirmPassword" autoComplete="new-password" required minLength={12} maxLength={1024} disabled={busy} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/><button type="button" disabled={busy} aria-label={visible.confirmPassword ? 'Hide confirm new password' : 'Show confirm new password'} aria-pressed={visible.confirmPassword} onClick={() => setVisible(current => ({ ...current, confirmPassword: !current.confirmPassword }))}>{visible.confirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
      </div>
      <PasswordStrengthIndicator password={newPassword} id={strengthId}/>
      {error && <p className="signin-error" role="alert">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy || passwordStrength(newPassword) === 'weak'}>{busy ? 'Changing password…' : 'Change password'}</button>
    </form>
  </section>;
}
