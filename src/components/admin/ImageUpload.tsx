'use client';

import { useState } from 'react';
import { api, compressImage } from '@/lib/admin-client';

/**
 * One image field, reused for brand logos, category art, banners and
 * the hero. Compresses in the browser first — a 1GB free tier does not
 * survive many 4MB phone-camera originals.
 */
export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  hint,
  aspect = '1 / 1',
  maxPx = 1400,
  accept = 'image/*',
  /** Video cannot be compressed in the browser, so it uploads as-is. */
  kind = 'image',
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  aspect?: string;
  maxPx?: number;
  accept?: string;
  kind?: 'image' | 'video';
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<string>('');

  async function handle(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const payload = kind === 'video' ? file : await compressImage(file, maxPx);
      const { url, size } = await api.upload(payload);

      // Weight is invisible when you look at a video, so show it at the
      // moment it can still be acted on.
      const mb = (size / 1024 / 1024).toFixed(1);
      setMeta(kind === 'video' ? `${mb} MB` : '');
      onChange(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="adm-label">{label}</span>

      {value ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 130, aspectRatio: aspect, borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--line)', background: 'var(--bg)', flex: 'none',
            }}
          >
            {kind === 'video' ? (
              <video
                src={value}
                autoPlay
                muted
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="chip" style={{ cursor: 'pointer' }}>
              <input type="file" accept={accept} hidden onChange={(e) => handle(e.target.files)} />
              {busy ? 'Uploading…' : 'Replace'}
            </label>
            {meta && <span className="faint tiny code">{meta}</span>}
            <button type="button" className="chip" onClick={() => onChange(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <label className="adm-drop" style={{ aspectRatio: 'auto' }}>
          <input type="file" accept={accept} hidden onChange={(e) => handle(e.target.files)} />
          <span>{busy ? 'Uploading…' : 'Tap to upload'}</span>
          {hint && <span className="tiny">{hint}</span>}
        </label>
      )}

      {error && <p className="note note-bad" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
