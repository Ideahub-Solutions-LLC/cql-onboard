'use client';

import { useState } from 'react';
import type { LoginPrefill } from '../lib/client-login-details';

import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';



export default function SignIn({ onSignIn, initialError = '', initialLogin }: { onSignIn: () => Promise<void>; initialError?: string; initialLogin?: LoginPrefill }) {

  const [email, setEmail] = useState(initialLogin?.email || '');

  const [password, setPassword] = useState(initialLogin?.password || '');

  const [visible, setVisible] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState(initialError);

  return <main className="signin-page">

    <section className="signin-intro"><img src="/cql-logo.png" alt="Core Quantum Leads"/><span className="eyebrow">CLIENT LAUNCHPAD</span><h1>A great start<br/>for every client.</h1><p>Your applications, setup details, and next steps.<br/>Together in one private workspace.</p></section>

    <section className="signin-panel"><form className="signin-card" onSubmit={async event => {

      event.preventDefault(); setBusy(true); setError('');

      try {

        const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });

        const result = await response.json() as { error?: string };

        if (!response.ok) throw new Error(result.error || 'Unable to sign in. Please try again.');

        setPassword(''); await onSignIn();

      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to sign in. Please try again.'); }

      finally { setBusy(false); }

    }}>

      <span className="signin-lock"><LockKeyhole size={23}/></span><h2>Welcome back.</h2><p>Sign in to your CQL workspace.</p>

      {error && <div className="signin-error" role="alert">{error}</div>}

      <label className="field"><span>Email address<b className="required">* Required</b></span><input type="email" name="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/></label>

      <label className="field"><span>Password<b className="required">* Required</b></span><div className="signin-password"><input type={visible ? 'text' : 'password'} name="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>

      <button type="submit" className="btn primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={17}/></button>

    </form></section>

  </main>;

}

