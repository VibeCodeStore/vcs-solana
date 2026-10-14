// Sign In With Solana (SIWS): build, parse and verify the sign-in message.
// Verification uses Node's built-in Ed25519, so no extra crypto dependency.
import { createPublicKey, verify as edVerify, randomBytes } from 'node:crypto';
import bs58 from 'bs58';

const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex'); // Ed25519 SubjectPublicKeyInfo header

export function newNonce(len = 12) {
  return bs58.encode(randomBytes(32)).slice(0, len);
}

export function createSignInMessage({ domain, address, statement, uri, version = '1', chainId = 'mainnet', nonce, issuedAt = new Date().toISOString(), expirationTime }) {
  if (!domain || !address || !uri || !nonce) throw new Error('domain, address, uri and nonce are required');
  const lines = [`${domain} wants you to sign in with your Solana account:`, address, ''];
  if (statement) lines.push(statement, '');
  lines.push(`URI: ${uri}`, `Version: ${version}`, `Chain ID: ${chainId}`, `Nonce: ${nonce}`, `Issued At: ${issuedAt}`);
  if (expirationTime) lines.push(`Expiration Time: ${expirationTime}`);
  return lines.join('\n');
}

export function parseSignInMessage(text) {
  const lines = String(text).split('\n');
  const m = /^(.+) wants you to sign in with your Solana account:$/.exec(lines[0] || '');
  if (!m) throw new Error('not a SIWS message');
  const out = { domain: m[1], address: lines[1] };
  for (const l of lines.slice(2)) {
    const kv = /^([A-Za-z ]+): (.*)$/.exec(l);
    if (!kv) continue;
    const key = { 'URI': 'uri', 'Version': 'version', 'Chain ID': 'chainId', 'Nonce': 'nonce', 'Issued At': 'issuedAt', 'Expiration Time': 'expirationTime' }[kv[1]];
    if (key) out[key] = kv[2];
  }
  if (lines[2] === '' && lines[3] && !/^[A-Za-z ]+: /.test(lines[3])) out.statement = lines[3];
  return out;
}

/**
 * Verifies a signed SIWS message.
 * @returns {{ ok: true, fields } | { ok: false, reason: string }}
 */
export function verifySignIn({ message, signature, expectedDomain, expectedNonce, now = new Date() }) {
  let f;
  try { f = parseSignInMessage(message); } catch { return { ok: false, reason: 'malformed message' }; }
  if (expectedDomain && f.domain !== expectedDomain) return { ok: false, reason: 'domain mismatch' };
  if (expectedNonce && f.nonce !== expectedNonce) return { ok: false, reason: 'nonce mismatch' };
  if (f.expirationTime && new Date(f.expirationTime) <= now) return { ok: false, reason: 'expired' };
  let pub, sig;
  try {
    pub = bs58.decode(f.address);
    sig = typeof signature === 'string' ? bs58.decode(signature) : Buffer.from(signature);
  } catch { return { ok: false, reason: 'bad encoding' }; }
  if (pub.length !== 32 || sig.length !== 64) return { ok: false, reason: 'bad key or signature length' };
  const key = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(pub)]), format: 'der', type: 'spki' });
  const ok = edVerify(null, Buffer.from(message, 'utf8'), key, Buffer.from(sig));
  return ok ? { ok: true, fields: f } : { ok: false, reason: 'bad signature' };
}
