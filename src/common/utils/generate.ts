import { config } from '../config';
import { BASE62_ALPHABET } from '../constants';

const ALPHABET = BASE62_ALPHABET;
const BASE = ALPHABET.length; // 62
const CODE_LENGTH = config.link.codeLength;

function encodeBase62(num: number): string {
  let s = '';
  while (num > 0) {
    s = ALPHABET[num % BASE] + s;
    num = Math.floor(num / BASE);
  }
  return s;
}

function padRandom(s: string): string {
  const padCount = CODE_LENGTH - s.length;
  let pad = '';
  for (let i = 0; i < padCount; i++) {
    pad += ALPHABET[Math.floor(Math.random() * BASE)];
  }
  return pad + s;
}

export function generateCode(id: number): string {
  const base62 = encodeBase62(id);
  return padRandom(base62);
}
