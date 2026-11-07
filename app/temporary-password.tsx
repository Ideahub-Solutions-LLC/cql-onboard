'use client';
import { useId, useState } from 'react';
import { Eye, EyeOff, WandSparkles } from 'lucide-react';
import { generateStrongPassword, passwordStrength } from '../lib/passwords.mjs';
import PasswordStrengthIndicator from './password-strength';

export default function TemporaryPassword({ value, onChange, disabled, required = false, hint }: { value: string; onChange: (value: string) => void; disabled: boolean; required?: boolean; hint: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  return <div className="temporary-password field">
    <label htmlFor={id}>Temporary password</label>
    <div className="temporary-password-input"><input id={id} name="temporaryPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={1024} required={required} value={value} disabled={disabled} aria-describedby={`${id}-strength ${id}-hint`} aria-invalid={value ? passwordStrength(value) === 'weak' : undefined} onChange={event => onChange(event.target.value)}/><button type="button" disabled={disabled} aria-label={visible ? 'Hide temporary password' : 'Show temporary password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
    <button type="button" className="btn secondary full generate-password" disabled={disabled} onClick={() => {
      try { onChange(generateStrongPassword()); setError(''); } catch { setError('Unable to generate a password. Try again or enter one below.'); }
    }}><WandSparkles size={16}/> Generate Password</button>
    <PasswordStrengthIndicator password={value} id={`${id}-strength`}/>
    <small id={`${id}-hint`}>{hint}</small>
    {error && <p className="signin-error" role="alert">{error}</p>}
  </div>;
}
