import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

const ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);

export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

/** Opaque refresh tokens and OTP codes are stored hashed, never raw. */
export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 48) => randomBytes(bytes).toString('base64url');

/** 6-digit OTP. Uses crypto randomness, not Math.random. */
export const randomOtp = (): string => {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, '0');
};
