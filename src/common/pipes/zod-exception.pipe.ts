import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z, ZodTypeAny } from 'zod';

@Injectable()
export class ZodExceptionPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const zodError = result.error as z.ZodError<z.infer<T>>;

      const errors = zodError.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      throw new BadRequestException(errors);
    }

    return result.data;
  }
}
