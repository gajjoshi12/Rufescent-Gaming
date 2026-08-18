/**
 * Provably-fair round derivation.
 *
 * A real platform would commit to an HMAC-SHA256 server seed; this build
 * chains the app's 32-bit hash instead — the shape of the ceremony is the
 * same (commit the hash, let the player set their seed, reveal on rotate)
 * and, critically, it is deterministic, so a round derived on the server
 * and on the client agree byte for byte.
 */

import { hashCode, seeded } from "@/lib/format";

/** 24-hex commitment shown before the round is played. */
export function seedHash(seed: string): string {
  let word = hashCode(seed);
  let out = "";
  for (let i = 0; i < 3; i++) {
    out += word.toString(16).padStart(8, "0");
    word = hashCode(`${seed}:${word}`);
  }
  return out;
}

/** `count` uniform floats in [0,1) for one round of one game. */
export function fairFloats(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  count: number,
): number[] {
  const rng = seeded(hashCode(`${serverSeed}|${clientSeed}|${nonce}`));
  // Two throwaway draws: the first output of a freshly seeded mulberry32
  // correlates with the seed, which would make low nonces look patterned.
  rng();
  rng();
  return Array.from({ length: count }, rng);
}

/** Shuffle `0..size-1` from a fair float stream. Used to bury mines. */
export function fairShuffle(floats: number[], size: number): number[] {
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor((floats[size - 1 - i] ?? 0) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
