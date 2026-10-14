import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { toBaseUnits, fromBaseUnits, buildBurnInstruction, getVcsBalance } from '../src/token.js';

test('decimal conversion is exact', () => {
  assert.equal(toBaseUnits('1.5'), 1_500_000_000n);
  assert.equal(toBaseUnits('0.000000001'), 1n);
  assert.equal(fromBaseUnits(1_500_000_000n), '1.5');
  assert.throws(() => toBaseUnits('1.0000000001'));
  assert.throws(() => toBaseUnits('-1'));
});

test('burn instruction targets the token program and the owner', () => {
  const owner = Keypair.generate().publicKey.toBase58(), mint = Keypair.generate().publicKey.toBase58();
  const ix = buildBurnInstruction({ owner, mint, amount: '100' });
  assert.ok(ix.programId.equals(TOKEN_PROGRAM_ID));
  assert.equal(ix.keys.length, 3);
  assert.equal(ix.keys[2].pubkey.toBase58(), owner);
  assert.equal(ix.keys[2].isSigner, true);
});

test('balance sums every token account', async () => {
  const conn = { getParsedTokenAccountsByOwner: async () => ({ value: [1_000_000_000n, 250_000_000n].map(a => ({ account: { data: { parsed: { info: { tokenAmount: { amount: a.toString() } } } } } })) }) };
  const owner = Keypair.generate().publicKey.toBase58(), mint = Keypair.generate().publicKey.toBase58();
  assert.equal(await getVcsBalance(conn, owner, mint), '1.25');
});

test('helpers refuse to run before the mint is set', async () => {
  const owner = Keypair.generate().publicKey.toBase58();
  assert.throws(() => buildBurnInstruction({ owner, mint: null, amount: '1' }), /mint/);
  await assert.rejects(getVcsBalance({}, owner, null), /mint/);
});
