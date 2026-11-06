type Access = { email: string; hasAccount: boolean; mustChangePassword: boolean; credentialVersion?: string };
type TemporaryLogin = { email: string; password: string; version: string };

export type LoginPrefill = { email: string; password: string };

// Accept query links and previously shared fragment links; clear both on arrival.
export function readLoginLink(href: string) {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const credentialKeys = ['email', 'password', 'temporaryPassword'];
  const queryCredentials = credentialKeys.some(key => url.searchParams.has(key));
  const parameters = queryCredentials ? url.searchParams : fragment;
  const email = parameters.get('email') || '';
  const password = parameters.get('password') ?? parameters.get('temporaryPassword') ?? '';
  const hasCredentials = queryCredentials || credentialKeys.some(key => fragment.has(key));
  if (hasCredentials) {
    for (const key of credentialKeys) {
      url.searchParams.delete(key);
      fragment.delete(key);
    }
    url.hash = fragment.toString();
  }
  const validEmail = email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return {
    prefill: { email: validEmail ? email : '', password: validEmail && password.length <= 1024 ? password : '' },
    cleanUrl: url.pathname + url.search + url.hash,
    hasCredentials,
  };
}

export function clientLoginUrl(origin: string, applicationId: string, access: Access, temporary?: TemporaryLogin) {
  if (!access.hasAccount) throw new Error('Create the client login in Client sign-in before copying login details.');
  if (access.mustChangePassword && (!temporary || temporary.email.toLowerCase() !== access.email.toLowerCase() || temporary.version !== access.credentialVersion)) {
    throw new Error('The temporary password is no longer available. Reset the client password in Client sign-in, then copy the link again.');
  }
  const url = new URL('/', origin);
  url.searchParams.set('application', applicationId);
  url.searchParams.set('email', access.email);
  if (access.mustChangePassword) url.searchParams.set('password', temporary!.password);
  return url.href;
}

export function clientLoginText(origin: string, applicationId: string, access: Access, temporary?: TemporaryLogin) {
  const url = clientLoginUrl(origin, applicationId, access, temporary);
  return [
    `Client application: ${url}`,
    `Email: ${access.email}`,
    access.mustChangePassword ? `Temporary password: ${temporary!.password}` : 'Password: Use your current password.',
    access.mustChangePassword ? 'Please change your temporary password on first sign-in, then continue your application.' : 'Sign in to continue your saved application.',
  ].join('\n');
}
