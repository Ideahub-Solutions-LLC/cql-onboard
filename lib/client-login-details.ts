type Access = { email: string; hasAccount: boolean; mustChangePassword: boolean; credentialVersion?: string };
type TemporaryLogin = { email: string; password: string; version: string };

export function clientLoginText(origin: string, applicationId: string, access: Access, temporary?: TemporaryLogin) {
  if (!access.hasAccount) throw new Error('Create the client login in Client sign-in before copying login details.');
  if (access.mustChangePassword && (!temporary || temporary.email.toLowerCase() !== access.email.toLowerCase() || temporary.version !== access.credentialVersion)) {
    throw new Error('The temporary password is no longer available. Reset the client password in Client sign-in, then copy the link again.');
  }
  return [
    `Client application: ${origin}/?application=${encodeURIComponent(applicationId)}`,
    `Email: ${access.email}`,
    access.mustChangePassword ? `Temporary password: ${temporary!.password}` : 'Password: Use your current password.',
    access.mustChangePassword ? 'Please change your temporary password on first sign-in, then continue your application.' : 'Sign in to continue your saved application.',
  ].join('\n');
}
