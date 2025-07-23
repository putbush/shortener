import { REGEX } from '@common/constants';
import { z } from 'zod';

export const ResolveLinkSchema = z.object({
  code: z.string().regex(REGEX.CODE, {
    message: 'Code must consist of 3–30 characters: A–Z, 0–9, -, _',
  }),
});

export type ResolveLinkDto = z.infer<typeof ResolveLinkSchema>;
