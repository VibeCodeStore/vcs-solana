import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, PublicKey } from '@solana/web3.js';
import { appIdFromName, appAddress, decodeAppAccount, replayChain, matchesChain, APP_ACCOUNT_SIZE } from '../src/attest.js';

const programId = Keypair.generate().publicKey;

test('app address is a deterministic off-curve PDA', () => {
  const id = appIdFromName('bounty-board');
  const a = appAddress(programId, id);
  assert.equal(a.toBase58(), appAddress(programId, id).toBase58());
  assert.equal(PublicKey.isOnCurve(a.toBytes()), false);
});

test('account decoding matches the program layout', () => {
  const owner = Keypair.generate().publicKey;
  const b = Buffer.alloc(APP_ACCOUNT_SIZE);
  owner.toBuffer().copy(b, 8); Buffer.alloc(32, 7).copy(b, 40); Buffer.alloc(32, 9).copy(b, 72); b.writeBigUInt64LE(3n, 104);
  const d = decodeAppAccount(b);
  assert.equal(d.owner, owner.toBase58());
  assert.equal(d.head, '09'.repeat(32));
  assert.equal(d.count, 3n);
});

test('a tampered approval no longer matches the on-chain head', () => {
  const reviewer = Keypair.generate().publicKey.toBase58();
  const entries = [{ buildHash: '11'.repeat(32), scopesHash: '22'.repeat(32), reviewer, slot: 1000 }, { buildHash: '33'.repeat(32), scopesHash: '22'.repeat(32), reviewer, slot: 2000 }];
  const onchain = { head: replayChain(entries), count: 2n };
  assert.equal(matchesChain(entries, onchain), true);
  const tampered = structuredClone(entries); tampered[0].buildHash = '44'.repeat(32);
  assert.equal(matchesChain(tampered, onchain), false);
});
