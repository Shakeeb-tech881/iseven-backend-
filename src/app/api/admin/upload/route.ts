import { db } from '@/lib/supabase';
import { created, route } from '@/lib/response';
import { BadRequest } from '@/lib/errors';
import { requireStaff } from '@/lib/auth';
import { env } from '@/lib/env';
import { randomToken } from '@/lib/password';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm'];
const ALLOWED = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO];

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;   // compressed in the browser first
/**
 * Video cannot be compressed in the browser, so this cap is the only
 * thing standing between a 40MB phone recording and every visitor's
 * mobile data. 12MB is generous for an 8-second 720p clip.
 */
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;

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
    throw BadRequest('Allowed files: JPEG, PNG, WebP, AVIF images, or MP4 and WebM video');
  }

  const isVideo = ALLOWED_VIDEO.includes(file.type);
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (file.size > limit) {
    throw BadRequest(
      isVideo
        ? `Video must be under ${MAX_VIDEO_BYTES / 1024 / 1024}MB. Export at 720p and around 8 seconds.`
        : 'Image must be under 3MB. Compress it before uploading.',
    );
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const folder = isVideo ? 'video' : 'products';
  const path = `${folder}/${new Date().getFullYear()}/${randomToken(12)}.${ext}`;

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
