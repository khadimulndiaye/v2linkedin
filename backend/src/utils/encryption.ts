import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = config.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Generate one with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  // Accept either 64-char hex or 32-char raw
  if (key.length === 64) return Buffer.from(key, 'hex');
  if (key.length === 32) return Buffer.from(key, 'utf8');
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 32 ASCII chars)');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: iv(12) + tag(16) + ciphertext — all base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const buf = Buffer.from(encoded, 'base64');

  const iv         = buf.subarray(0, IV_LENGTH);
  const tag        = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
