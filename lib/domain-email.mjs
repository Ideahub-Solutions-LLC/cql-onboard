// Stable storage ID; displayed after Branding and before Review & send.
export const DOMAIN_EMAIL_STEP = 5;
export const emailSetupOptions = ['Set up new email', 'Connect existing email', 'Help me decide'];
export const accessMethodOptions = ['Provider invitation (recommended)', 'Secure password vault', 'Discuss with setup team'];
export const domainEmailFields = [
  ['domain', 'Domain name'],
  ['domainProvider', 'Domain provider'],
  ['businessEmailProvider', 'Business email provider'],
  ['emailSetupPreference', 'Email setup preference'],
  ['preferredAccessMethod', 'Preferred access method'],
];

/** @param {string} value */
export function validDomainName(value) {
  if (!value || /[\s/:?#@\\]/.test(value)) return false;
  try {
    const host = new URL('https://' + value).hostname;
    return host.length <= 253 && host.includes('.') && !/^[\d.]+$/.test(host) && host.split('.').every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label));
  } catch { return false; }
}
