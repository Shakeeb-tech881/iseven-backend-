import parsePhoneNumberFromString from 'libphonenumber-js';

/**
 * Sri Lankan numbers arrive as 0771234567, +94771234567, 94771234567,
 * "077 123 4567", "077-1234567". All are the same person. Everything is
 * stored and matched in E.164 so lead-to-user linking actually works.
 */
export function toE164(input: string, defaultCountry: 'LK' = 'LK'): string | null {
  const cleaned = input.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;

  return parsed.number; // e.g. +94771234567
}

export function isValidPhone(input: string): boolean {
  return toE164(input) !== null;
}

/** Pretty form for display: 077 123 4567 */
export function formatPhoneLocal(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatNational() : e164;
}
