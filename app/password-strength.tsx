'use client';
import { passwordGuidance, passwordStrength } from '../lib/passwords.mjs';

export default function PasswordStrengthIndicator({ password, id }: { password: string; id: string }) {
  const strength = passwordStrength(password);
  const level = {weak: 1, medium: 2, strong: 3}[strength];
  return <div id={id} className={`password-strength ${password ? strength : ''}`}>
    <div className="password-strength-bars" aria-hidden="true">{[1, 2, 3].map(index => <span key={index} className={password && index <= level ? 'filled' : ''}/>)}</div>
    <p role="status" aria-live="polite">{password ? <>Password strength: <strong>{strength[0].toUpperCase() + strength.slice(1)}</strong>{strength === 'weak' && ' — choose a medium or strong password.'}</> : 'Only medium and strong passwords are accepted.'}</p>
    <small>{passwordGuidance}</small>
  </div>;
}
