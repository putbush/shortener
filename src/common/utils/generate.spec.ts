import { generateCode } from './generate';
import { config } from '../config';
import { BASE62_ALPHABET } from '../constants';

describe('generateCode', () => {
  it('генерирует код правильной длины', () => {
    const code = generateCode(123);
    expect(code).toHaveLength(config.link.codeLength);
  });

  it('использует только символы из алфавита конфигурации', () => {
    const code = generateCode(42);
    const expectedPattern = new RegExp(
      `^[${BASE62_ALPHABET.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]{${config.link.codeLength}}$`,
    );
    expect(code).toMatch(expectedPattern);
  });

  it('разные id дают разные коды', () => {
    const a = generateCode(1000);
    const b = generateCode(1001);
    expect(a).not.toEqual(b);
  });

  it('обрабатывает граничные случаи', () => {
    expect(generateCode(0)).toHaveLength(config.link.codeLength);
    expect(generateCode(-1)).toHaveLength(config.link.codeLength);
    expect(generateCode(999999)).toHaveLength(config.link.codeLength);
  });
});
