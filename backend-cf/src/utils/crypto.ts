const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getEncryptionKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function encryptToken(plaintext: string, keyHex: string): Promise<string> {
  const key = await getEncryptionKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  const encryptedBytes = new Uint8Array(encrypted);
  return `${bytesToHex(iv)}:${bytesToHex(encryptedBytes)}`;
}

export async function decryptToken(ciphertext: string, keyHex: string): Promise<string> {
  const [ivHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !dataHex) throw new Error('Invalid encrypted token format');

  const key = await getEncryptionKey(keyHex);
  const iv = hexToBytes(ivHex);
  const data = hexToBytes(dataHex);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return decoder.decode(decrypted);
}

export function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = bytesToHex(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-');
}
