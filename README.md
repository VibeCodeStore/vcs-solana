# @vcs/solana

The Solana client for VCS: wallet sign-in, approval proofs and the $VCS token.

```
npm install @vcs/solana
```

## Sign In With Solana

```js
import { newNonce, createSignInMessage, verifySignIn } from '@vcs/solana';

const nonce = newNonce();                       // store it server-side
const message = createSignInMessage({
  domain: 'vcs.app', address, uri: 'https://vcs.app', nonce,
  statement: 'Sign in to the Vibe Code Store.',
});
// ...the wallet signs `message`...
const r = verifySignIn({ message, signature, expectedDomain: 'vcs.app', expectedNonce: nonce });
if (!r.ok) throw new Error(r.reason);           // domain mismatch | nonce mismatch | expired | bad signature
```

Ed25519 verification uses Node's built-in crypto.

## Approval proofs

Read an app's attestation chain from the [vcs-attest](https://github.com/VibeCodeStore/vcs-attest) program and check it against the approvals you were given:

```js
import { Connection } from '@solana/web3.js';
import { appIdFromName, fetchApp, matchesChain } from '@vcs/solana';

const app = await fetchApp(new Connection(rpcUrl), PROGRAM_ID, appIdFromName('bounty-board'));
matchesChain(approvals, app);   // false if any past approval was altered
```

## $VCS token

```js
import { getVcsBalance, buildBurnInstruction, toBaseUnits } from '@vcs/solana';

await getVcsBalance(connection, owner, VCS_MINT);                 // "1250.5"
const ix = buildBurnInstruction({ owner, mint: VCS_MINT, amount: '100' });  // add to a transaction, sign, send
```

Amounts are converted with exact integer math, never floating point.

## Status

- The $VCS mint address is set at token launch. Until then every token helper requires it explicitly.
- `vcs-attest` is unaudited and devnet-only, so treat proof reads as devnet until the audit is published.

## Test

```
npm ci && npm test
```

10 tests, all offline: signature checks (valid, wrong domain, wrong nonce, wrong wallet, expired), PDA derivation, account layout, tamper detection, exact decimals and burn instructions.

Part of [VCS, the Vibe Code Store](https://vibecodestore.com).
