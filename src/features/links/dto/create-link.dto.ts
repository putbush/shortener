import { z } from 'zod';

export const CreateLinkSchema = z
  .object({
    url: z.url({ message: 'Unvalid URL' }),
    alias: z
      .string({ message: 'Alias must be a string' })
      .regex(/^[a-zA-Z0-9_-]+$/, {
        message: 'Alias can only contain letters, numbers, "-", "_"',
      })
      .min(3, 'Alias is too short')
      .max(30, 'Alias is too long')
      .optional(),
    ttl: z
      .number({ message: 'Hours must be a number' })
      .int({ message: 'Hours must be an integer' })
      .positive({ message: 'Hours must be a positive integer' })
      .optional(),
  })
  .strict();

export type CreateLinkDto = z.infer<typeof CreateLinkSchema>;
