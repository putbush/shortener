import { config } from '../config';
import { BASE62_ALPHABET } from '../constants';

const ALPHABET = BASE62_ALPHABET;
const BASE = ALPHABET.length; // 62
const CODE_LENGTH = config.link.codeLength;

function encodeBase62(num: bigint): string {
  let s = '';

  while (num > 0n) {
    s = ALPHABET[Number(num % BigInt(BASE))] + s;
    num = num / BigInt(BASE);
  }
  return s;
}

function padRandom(s: string): string {
  const padCount = CODE_LENGTH - s.length;
  let pad = '';

  if (padCount < 0) {
    throw new Error(
      `ID too large: base62 representation (${s.length} chars) exceeds maximum code length (${CODE_LENGTH} chars). ` +
        `Maximum supported ID: ${
          BigInt(BASE62_ALPHABET.length) ** BigInt(CODE_LENGTH) - BigInt(1)
        }`,
    );
  }

  for (let i = 0; i < padCount; i++) {
    pad += ALPHABET[Math.floor(Math.random() * BASE)];
  }
  return pad + s;
}

export function generateCode(id: bigint): string {
  const base62 = encodeBase62(id);
  return padRandom(base62);
}
