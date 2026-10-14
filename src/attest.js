// Read and verify VCS approval records stored by the vcs-attest program.
import { createHash } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

export const APP_ACCOUNT_SIZE = 8 + 32 + 32 + 32 + 8;

/** Stable 32-byte id for an app name. */
export function appIdFromName(name) {
  return createHash('sha256').update(String(name)).digest();
}

/** The program-derived address that stores an app's attestation chain. */
export function appAddress(programId, appId) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('app'), Buffer.from(appId)], new PublicKey(programId));
  return pda;
}

/** Decodes the App account: 8-byte discriminator, owner, app_id, head, count. */
export function decodeAppAccount(data) {
  const b = Buffer.from(data);
  if (b.length < APP_ACCOUNT_SIZE) throw new Error('account data too short');
  return {
    owner: new PublicKey(b.subarray(8, 40)).toBase58(),
    appId: b.subarray(40, 72).toString('hex'),
    head: b.subarray(72, 104).toString('hex'),
    count: b.readBigUInt64LE(104),
  };
}

export async function fetchApp(connection, programId, appId) {
  const info = await connection.getAccountInfo(appAddress(programId, appId));
  return info ? decodeAppAccount(info.data) : null;
}

/** Same chain rule as the program: a_k = sha256(a_{k-1} || build || scopes || reviewer || slot_le). */
export function replayChain(entries) {
  let head = Buffer.alloc(32);
  for (const e of entries) {
    const slot = Buffer.alloc(8); slot.writeBigUInt64LE(BigInt(e.slot));
    const reviewer = new PublicKey(e.reviewer).toBuffer();
    head = createHash('sha256').update(Buffer.concat([head, Buffer.from(e.buildHash, 'hex'), Buffer.from(e.scopesHash, 'hex'), reviewer, slot])).digest();
  }
  return head.toString('hex');
}

/** True if the approvals you were given produce the head stored on chain. */
export function matchesChain(entries, onchain) {
  return replayChain(entries) === onchain.head && BigInt(entries.length) === BigInt(onchain.count);
}
