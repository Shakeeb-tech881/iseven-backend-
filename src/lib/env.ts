/**
 * Validated environment. Import this instead of touching process.env,
 * so a missing variable fails loudly at startup rather than at 2am.
 */
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  WHATSAPP_NUMBER: z.string().regex(/^\d{9,15}$/, 'digits only, e.g. 94771234567'),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  SUPABASE_STORAGE_BUCKET: z.string().default('products'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
