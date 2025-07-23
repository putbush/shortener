import { generateCode } from './generate';
import { config } from '../config';
import { BASE62_ALPHABET } from '../constants';

describe('generateCode', () => {
  it('should generate code with correct length', () => {
    const code = generateCode(123n);
    expect(code).toHaveLength(config.link.codeLength);
  });

  it('should only use alphabet symbols from config', () => {
    const code = generateCode(42n);
    const expectedPattern = new RegExp(
      `^[${BASE62_ALPHABET.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]{${config.link.codeLength}}$`,
    );
    expect(code).toMatch(expectedPattern);
  });

  it('should generate different codes for different IDs', () => {
    const a = generateCode(1000n);
    const b = generateCode(1001n);
    expect(a).not.toEqual(b);
  });

  it('should handle edge cases', () => {
    expect(generateCode(0n)).toHaveLength(config.link.codeLength);
    expect(generateCode(1n)).toHaveLength(config.link.codeLength);
    expect(generateCode(123456789123n)).toHaveLength(config.link.codeLength);
  });

  it('should handle very large IDs that exceed base62 capacity', () => {
    const maxForChars =
      BigInt(BASE62_ALPHABET.length) ** BigInt(config.link.codeLength) -
      BigInt(1);
    expect(generateCode(maxForChars)).toHaveLength(config.link.codeLength);

    const tooLargeId = maxForChars + BigInt(1);
    expect(() => generateCode(tooLargeId)).toThrow();
  });
});
