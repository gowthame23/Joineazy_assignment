import crypto from 'crypto';

/**
 * Constant-time string comparison.
 *
 * A plain `a === b` stops at the first differing character, so response time can leak
 * how much of a secret was guessed correctly. Hashing both values first gives two
 * equal-length buffers, which crypto.timingSafeEqual requires, and compares them
 * without early exit.
 */
export function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
