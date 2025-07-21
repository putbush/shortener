import { generateCode } from './generate';
import { config } from '../config';
import { BASE62_ALPHABET } from '../constants';

describe('generateCode', () => {
  it('should generate code with correct length', () => {
    const code = generateCode(123);
    expect(code).toHaveLength(config.link.codeLength);
  });

  it('should only use alphabet symbols from config', () => {
    const code = generateCode(42);
    const expectedPattern = new RegExp(
      `^[${BASE62_ALPHABET.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]{${config.link.codeLength}}$`,
    );
    expect(code).toMatch(expectedPattern);
  });

  it('should generate different codes for different IDs', () => {
    const a = generateCode(1000);
    const b = generateCode(1001);
    expect(a).not.toEqual(b);
  });

  it('should handle edge cases', () => {
    expect(generateCode(0)).toHaveLength(config.link.codeLength);
    expect(generateCode(-1)).toHaveLength(config.link.codeLength);
    expect(generateCode(999999)).toHaveLength(config.link.codeLength);
  });
});
