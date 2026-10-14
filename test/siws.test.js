import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateKey, sign } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createSignInMessage, verifySignIn, parseSignInMessage, newNonce } from '../src/siws.js';

const PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex');
function signWith(kp, msg) {
  const key = createPrivateKey({ key: Buffer.concat([PKCS8, Buffer.from(kp.secretKey.subarray(0, 32))]), format: 'der', type: 'pkcs8' });
  return bs58.encode(sign(null, Buffer.from(msg, 'utf8'), key));
}

const kp = Keypair.generate();
const nonce = newNonce();
const msg = createSignInMessage({ domain: 'vcs.app', address: kp.publicKey.toBase58(), statement: 'Sign in to the Vibe Code Store.', uri: 'https://vcs.app', nonce, expirationTime: '2999-01-01T00:00:00.000Z' });

test('a wallet signature verifies', () => {
  const r = verifySignIn({ message: msg, signature: signWith(kp, msg), expectedDomain: 'vcs.app', expectedNonce: nonce });
  assert.equal(r.ok, true);
  assert.equal(r.fields.statement, 'Sign in to the Vibe Code Store.');
});

test('wrong domain, wrong nonce, other wallet and expiry are all rejected', () => {
  const sig = signWith(kp, msg);
  assert.equal(verifySignIn({ message: msg, signature: sig, expectedDomain: 'evil.app' }).reason, 'domain mismatch');
  assert.equal(verifySignIn({ message: msg, signature: sig, expectedNonce: 'x' }).reason, 'nonce mismatch');
  assert.equal(verifySignIn({ message: msg, signature: signWith(Keypair.generate(), msg) }).reason, 'bad signature');
  assert.equal(verifySignIn({ message: msg, signature: sig, now: new Date('3000-01-01') }).reason, 'expired');
});

test('the message round-trips through the parser', () => {
  const f = parseSignInMessage(msg);
  assert.equal(f.address, kp.publicKey.toBase58());
  assert.equal(f.chainId, 'mainnet');
  assert.equal(f.nonce, nonce);
});
