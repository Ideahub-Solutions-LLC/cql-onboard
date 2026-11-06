type Access = { email: string; hasAccount: boolean; mustChangePassword: boolean; credentialVersion?: string };
type TemporaryLogin = { email: string; password: string; version: string };

export type LoginPrefill = { email: string; password: string };

// Fragments stay in the browser; remove credentials before making API requests.
export function readLoginLink(href: string) {
  const url = new URL(href);
  const parameters = new URLSearchParams(url.hash.slice(1));
  const email = parameters.get('email') || '';
  const password = parameters.get('temporaryPassword') || '';
  const hasCredentials = parameters.has('email') || parameters.has('temporaryPassword');
  if (hasCredentials) {
    parameters.delete('email');
    parameters.delete('temporaryPassword');
    url.hash = parameters.toString();
  }
  const validEmail = email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return {
    prefill: { email: validEmail ? email : '', password: validEmail && password.length <= 1024 ? password : '' },
    cleanUrl: url.pathname + url.search + url.hash,
    hasCredentials,
  };
}

export function clientLoginText(origin: string, applicationId: string, access: Access, temporary?: TemporaryLogin) {
  if (!access.hasAccount) throw new Error('Create the client login in Client sign-in before copying login details.');
  if (access.mustChangePassword && (!temporary || temporary.email.toLowerCase() !== access.email.toLowerCase() || temporary.version !== access.credentialVersion)) {
    throw new Error('The temporary password is no longer available. Reset the client password in Client sign-in, then copy the link again.');
  }
  const url = new URL('/', origin);
  url.searchParams.set('application', applicationId);
  const parameters = new URLSearchParams({ email: access.email });
  if (access.mustChangePassword) parameters.set('temporaryPassword', temporary!.password);
  url.hash = parameters.toString();
  return [
    `Client application: ${url.href}`,
    `Email: ${access.email}`,
    access.mustChangePassword ? `Temporary password: ${temporary!.password}` : 'Password: Use your current password.',
    access.mustChangePassword ? 'Please change your temporary password on first sign-in, then continue your application.' : 'Sign in to continue your saved application.',
  ].join('\n');
}
