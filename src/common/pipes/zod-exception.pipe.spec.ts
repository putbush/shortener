import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodExceptionPipe } from './zod-exception.pipe';

describe('ZodExceptionPipe', () => {
  const testSchema = z.object({
    name: z.string().min(2, 'Name too short'),
    age: z.number().min(18, 'Must be adult'),
    email: z.string().email('Invalid email'),
  });

  let pipe: ZodExceptionPipe<typeof testSchema>;

  beforeEach(() => {
    pipe = new ZodExceptionPipe(testSchema);
  });

  it('should return valid data for correct input', () => {
    const validInput = {
      name: 'John',
      age: 25,
      email: 'john@example.com',
    };

    const result = pipe.transform(validInput);

    expect(result).toEqual(validInput);
  });

  it('should throw BadRequestException for invalid data', () => {
    const invalidInput = {
      name: 'J', // слишком короткое
      age: 16, // слишком молодой
      email: 'invalid-email', // неправильный формат
    };

    expect(() => pipe.transform(invalidInput)).toThrow(BadRequestException);
  });

  it('should format proper error messages', () => {
    const invalidInput = {
      name: 'J',
      age: 16,
      email: 'invalid-email',
    };

    try {
      pipe.transform(invalidInput);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        statusCode: number;
        message: Array<{ field: string; message: string }>;
        error: string;
      };
      expect(response.statusCode).toBe(400);
      expect(response.message).toEqual([
        { field: 'name', message: 'Name too short' },
        { field: 'age', message: 'Must be adult' },
        { field: 'email', message: 'Invalid email' },
      ]);
    }
  });

  it('should handle missing fields', () => {
    const incompleteInput = {
      name: 'John',
      // age отсутствует
      // email отсутствует
    };

    expect(() => pipe.transform(incompleteInput)).toThrow(BadRequestException);
  });

  it('should handle nested error paths', () => {
    const nestedSchema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(1, 'Required'),
        }),
      }),
    });

    const nestedPipe = new ZodExceptionPipe(nestedSchema);
    const invalidNestedInput = {
      user: {
        profile: {
          name: '',
        },
      },
    };

    try {
      nestedPipe.transform(invalidNestedInput);
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as {
        message: Array<{ field: string; message: string }>;
      };
      expect(response.message[0].field).toBe('user.profile.name');
    }
  });

  it('should check strict() behavior - reject extra fields', () => {
    const strictSchema = z
      .object({
        url: z.string(),
        alias: z.string().optional(),
      })
      .strict();

    const strictPipe = new ZodExceptionPipe(strictSchema);
    const inputWithExtraField = {
      url: 'https://example.com',
      alias: 'test',
      unknownField: 'should be rejected',
    };

    try {
      strictPipe.transform(inputWithExtraField);
      fail('Expected validation to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const response = (error as BadRequestException).getResponse();

      const responseStr = JSON.stringify(response);
      expect(responseStr).toContain('unknownField');
      expect(responseStr).toContain('Unrecognized');
    }
  });
});
