'use client';

import { useState } from 'react';

/**
 * Optional lead capture. It sits alongside the WhatsApp button rather
 * than in front of it: anyone who would rather be called can leave a
 * number, everyone else takes the low-friction path.
 */
export default function CallbackForm({
  productId,
  variantId,
  productName,
}: {
  productId: string;
  variantId: string;
  productName?: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');

    const form = new FormData(e.currentTarget);
    const payload = {
      name: (form.get('name') as string) || undefined,
      phone: form.get('phone') as string,
      city: (form.get('city') as string) || undefined,
      message: (form.get('message') as string) || undefined,
      website: (form.get('website') as string) || undefined, // honeypot
      productId,
      variantId,
      consent: form.get('consent') === 'on',
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        const detail = json?.error?.details?.[0]?.message;
        setMessage(detail ?? json?.error?.message ?? 'That did not go through. Try again.');
        setState('error');
        return;
      }
      setMessage(json.data.message);
      setState('done');
    } catch {
      setMessage('Could not reach the server. Check your connection and try again.');
      setState('error');
    }
  }

  if (state === 'done') {
    return <div className="note note-ok">{message}</div>;
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {productName && (
        <p className="faint tiny" style={{ margin: 0 }}>About: {productName}</p>
      )}

      <input className="field" name="name" placeholder="Your name" autoComplete="name" />
      <input
        className="field" name="phone" required placeholder="Phone number (07X XXX XXXX)"
        inputMode="tel" autoComplete="tel"
      />
      <input className="field" name="city" placeholder="City" autoComplete="address-level2" />
      <textarea className="field" name="message" rows={3} placeholder="Anything we should know?" />

      {/* Bots fill this. People never see it. */}
      <div className="hp" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="row tiny muted" style={{ gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" name="consent" required style={{ marginTop: 3 }} />
        <span>I agree to be contacted about this inquiry.</span>
      </label>

      {state === 'error' && <div className="note note-bad">{message}</div>}

      <button className="btn btn-block" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Request a callback'}
      </button>
    </form>
  );
}
