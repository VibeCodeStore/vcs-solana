// $VCS token helpers. The mint address is set at launch; until then pass it in explicitly.
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createBurnCheckedInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const VCS_DECIMALS = 9;

/** Converts a decimal string like "12.5" to base units without floating-point error. */
export function toBaseUnits(amount, decimals = VCS_DECIMALS) {
  const s = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`invalid amount: ${amount}`);
  const [whole, frac = ''] = s.split('.');
  if (frac.length > decimals) throw new Error(`more than ${decimals} decimals`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0') || '0');
}

export function fromBaseUnits(units, decimals = VCS_DECIMALS) {
  const u = BigInt(units), d = 10n ** BigInt(decimals);
  const frac = (u % d).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${u / d}.${frac}` : `${u / d}`;
}

/** Sum of an owner's $VCS across token accounts, as a decimal string. */
export async function getVcsBalance(connection, owner, mint) {
  if (!mint) throw new Error('VCS mint address not set');
  const res = await connection.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) });
  let total = 0n;
  for (const a of res.value) total += BigInt(a.account.data.parsed.info.tokenAmount.amount);
  return fromBaseUnits(total);
}

/** Builds (does not send) a checked burn instruction from the owner's associated token account. */
export function buildBurnInstruction({ owner, mint, amount, decimals = VCS_DECIMALS }) {
  if (!mint) throw new Error('VCS mint address not set');
  const o = new PublicKey(owner), m = new PublicKey(mint);
  const ata = getAssociatedTokenAddressSync(m, o);
  return createBurnCheckedInstruction(ata, m, o, toBaseUnits(amount, decimals), decimals, [], TOKEN_PROGRAM_ID);
}
