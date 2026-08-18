'use client';

import { useState } from 'react';
import { WhatsAppIcon } from './Icons';

interface Props {
  productId: string;
  variantId: string;
  /** Pre-built by the server from the live price. Used as the fallback. */
  fallbackUrl: string;
  source: 'product_page' | 'card' | 'floating';
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 * Logs the inquiry, then opens WhatsApp.
 *
 * With no orders in the system, this click is the only demand signal the
 * shop ever gets — so it is worth recording. But it must never stand
 * between a customer and a conversation: if logging fails or is slow,
 * we open the fallback link anyway. A lost analytics row costs nothing;
 * a lost sale costs Rs. 300,000.
 */
export default function WhatsAppButton({
  productId,
  variantId,
  fallbackUrl,
  source,
  disabled = false,
  label = 'Ask on WhatsApp',
  className = 'btn btn-wa',
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (disabled) { e.preventDefault(); return; }
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    // Open synchronously so Safari and mobile browsers do not treat this
    // as a popup. The real URL lands once the request settles.
    const tab = window.open('', '_blank');

    let url = fallbackUrl;
    try {
      const res = await Promise.race([
        fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, variantId, source }),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('slow')), 2500)),
      ]);
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.whatsappUrl) url = json.data.whatsappUrl;
      }
    } catch {
      // Fall through to fallbackUrl.
    }

    if (tab) tab.location.href = url;
    else window.location.href = url;

    setBusy(false);
  }

  return (
    <a
      href={fallbackUrl}
      onClick={handleClick}
      className={className}
      aria-disabled={disabled}
      target="_blank"
      rel="noopener noreferrer"
      style={disabled ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
    >
      <WhatsAppIcon size={17} />
      <span>{disabled ? 'Sold out' : label}</span>
    </a>
  );
}
