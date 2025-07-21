import { z } from 'zod';

export const ResolveLinkSchema = z.object({
  code: z.string().regex(/^[a-zA-Z0-9_-]{3,30}$/, {
    message: 'Code must consist of 3–30 characters: A–Z, 0–9, -, _',
  }),
});

export type ResolveLinkDto = z.infer<typeof ResolveLinkSchema>;
