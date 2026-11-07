export const passwordGuidance = 'Use 12 or more characters with at least three types: uppercase, lowercase, numbers, and symbols. Or use four different words totaling 20 or more characters.';

/** @param {string} password @returns {'weak' | 'medium' | 'strong'} */
export function passwordStrength(password) {
  if (password.length < 12 || password.length > 1024) return 'weak';
  const simple = password.toLowerCase().replace(/@/g, 'a').replace(/\$/g, 's').replace(/[^a-z0-9]/g, '').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
  const common = ['password', 'password123', 'password1234', 'qwerty123456', 'letmein123456', 'welcome123456', 'administrator', 'changeme12345'];
  if (common.some(value => value.replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't') === simple) || /^(.{1,4})\1+$/u.test(password) || new Set(password.toLowerCase()).size < 6) return 'weak';
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^\p{L}\p{N}\s]/u].filter(pattern => pattern.test(password)).length;
  const words = password.toLowerCase().match(/\p{L}{3,}/gu) || [];
  const wordCount = new Set(words).size;
  if (password.length >= 16 && types === 4 || password.length >= 28 && wordCount >= 5) return 'strong';
  if (types >= 3 || password.length >= 20 && wordCount >= 4) return 'medium';
  return 'weak';
}

/** @param {number} length */
function randomIndex(length) {
  const bytes = new Uint8Array(1);
  const limit = 256 - 256 % length;
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return bytes[0] % length;
}

export function generateStrongPassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*+-=?'];
  const alphabet = groups.join('');
  let password;
  do {
    const characters = groups.map(group => group[randomIndex(group.length)]);
    while (characters.length < 20) characters.push(alphabet[randomIndex(alphabet.length)]);
    for (let index = characters.length - 1; index > 0; index--) {
      const other = randomIndex(index + 1);
      [characters[index], characters[other]] = [characters[other], characters[index]];
    }
    password = characters.join('');
  } while (passwordStrength(password) !== 'strong');
  return password;
}
