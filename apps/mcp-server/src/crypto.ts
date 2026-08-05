import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'mailflow-ai-default-32-byte-secret-key-12345!';
  return crypto.createHash('sha256').update(secret).digest();
}

export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return '';
  // If text is not encrypted (e.g. mock token or plain token), handle gracefully
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    return encryptedText;
  }
}
