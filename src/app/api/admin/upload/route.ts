import { db } from '@/lib/supabase';
import { created, route } from '@/lib/response';
import { BadRequest } from '@/lib/errors';
import { requireStaff } from '@/lib/auth';
import { env } from '@/lib/env';
import { randomToken } from '@/lib/password';

export const dynamic = 'force-dynamic';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 3 * 1024 * 1024; // 3MB — compress in the browser first

/**
 * POST /api/admin/upload  (multipart/form-data, field name "file")
 *
 * Validates by real MIME type, renames the file, and stores it in the
 * Supabase Storage bucket. Never trusts the client-supplied filename —
 * that is how path traversal and double-extension tricks get in.
 */
export const POST = route(async (req: Request) => {
  await requireStaff(req);

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) throw BadRequest('No file uploaded');
  if (!ALLOWED.includes(file.type)) {
    throw BadRequest('Only JPEG, PNG, WebP and AVIF images are allowed');
  }
  if (file.size > MAX_BYTES) {
    throw BadRequest('Image must be under 3MB. Compress it before uploading.');
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `products/${new Date().getFullYear()}/${randomToken(12)}.${ext}`;

  const { error } = await db.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrl } = db.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(path);

  return created({ url: publicUrl.publicUrl, path, size: file.size });
});
