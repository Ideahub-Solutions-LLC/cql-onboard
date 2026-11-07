import assert from 'node:assert/strict';
import { generateStrongPassword, passwordStrength } from '../lib/passwords.mjs';

for (const password of ['', 'short', 'Password123!', 'P@ssword123!', 'aaaaaaaaaaaa', 'Ab1!Ab1!Ab1!', 'abcdefghijklmnop', '1234567890123456', 'same same same same same same']) assert.equal(passwordStrength(password), 'weak', password);
assert.equal(passwordStrength('RiverCloud82'), 'medium');
assert.equal(passwordStrength('river cloud mountain lantern'), 'medium');
assert.equal(passwordStrength('RiverCloud82!Maple'), 'strong');
assert.equal(passwordStrength('river cloud mountain lantern meadow'), 'strong');
assert.equal(passwordStrength('A1!' + 'x'.repeat(1022)), 'weak');
const generated = new Set();
for (let index = 0; index < 100; index++) {
  const password = generateStrongPassword();
  assert.equal(password.length, 20);
  assert.equal(passwordStrength(password), 'strong');
  for (const pattern of [/[A-Z]/, /[a-z]/, /[0-9]/, /[^a-z0-9]/i]) assert.match(password, pattern);
  generated.add(password);
}
assert.equal(generated.size, 100);
console.log('PASS password strength: weak/common/repeated rejection, medium/strong passwords and phrases, size limits, and secure generation');
