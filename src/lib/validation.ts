import { z } from 'zod';
import { toE164 } from './phone';

/** Accepts any Sri Lankan format, outputs { raw, e164 }. */
export const phoneSchema = z
  .string()
  .min(9, 'Phone number is too short')
  .max(20)
  .transform((val, ctx) => {
    const e164 = toE164(val);
    if (!e164) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number' });
      return z.NEVER;
    }
    return { raw: val.trim(), e164 };
  });

export const emailSchema = z.string().email('Enter a valid email').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), {
    message: 'Password must contain at least one letter and one number',
  });

// ---------------------------------------------------------------- public

export const productListQuerySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().trim().min(1).max(80).optional(),
  sort: z
    .enum(['popular', 'newest', 'price_asc', 'price_desc', 'name_asc'])
    .default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const inquirySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  source: z.enum(['product_page', 'card', 'floating']).default('product_page'),
});

export const leadSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  city: z.string().trim().max(60).optional(),
  productId: z.string().min(1),
  variantId: z.string().min(1),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the privacy policy to continue' }),
  }),
  // Honeypot: real users never fill this. Bots do.
  website: z.string().max(0).optional(),
});

// ------------------------------------------------------------------ auth

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  marketingConsent: z.boolean().default(false),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

// ----------------------------------------------------------------- admin

const variantInputSchema = z.object({
  id: z.string().optional(),          // present = update, absent = create
  sku: z.string().trim().max(60).nullish(),
  storage: z.string().trim().max(30).nullish(),
  ram: z.string().trim().max(30).nullish(),
  color: z.string().trim().max(40).nullish(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #2b2b2b')
    .nullish(),
  price: z.number().positive('Price must be greater than zero'),
  salePrice: z.number().positive().nullish(),
  stockStatus: z.enum(['IN_STOCK', 'PRE_ORDER', 'SOLD_OUT']).default('IN_STOCK'),
  sortOrder: z.number().int().min(0).default(0),
});

const imageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  alt: z.string().trim().max(160).nullish(),
  /**
   * Position in the variants array, not a database id.
   *
   * A brand new product has no variant ids yet, so the form could not
   * link a photo to a colour until after the first save. Sending the
   * index instead lets the server resolve it once the variants exist.
   */
  variantIndex: z.number().int().min(0).nullish(),
  sortOrder: z.number().int().min(0).default(0),
});

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    slug: z.string().trim().max(180).optional(),
    brandId: z.string().min(1, 'Choose a brand'),
    categoryId: z.string().min(1, 'Choose a category'),
    shortDesc: z.string().trim().max(160).nullish(),
    description: z.string().trim().max(5000).nullish(),
    condition: z.enum(['NEW', 'USED', 'REFURBISHED']).default('NEW'),
    warrantyType: z.string().trim().max(120).nullish(),
    badge: z.enum(['NEW_ARRIVAL', 'BEST_SELLER', 'SALE', 'LIMITED']).nullish(),
    specs: z.record(z.string()).nullish(),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    popularity: z.number().int().min(0).max(100).default(0),
    metaTitle: z.string().trim().max(160).nullish(),
    metaDesc: z.string().trim().max(300).nullish(),
    variants: z.array(variantInputSchema).min(1, 'Add at least one variant'),
    images: z.array(imageInputSchema).default([]),
  })
  .superRefine((data, ctx) => {
    data.variants.forEach((v, i) => {
      if (v.salePrice != null && v.salePrice >= v.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', i, 'salePrice'],
          message: 'Sale price must be lower than the regular price',
        });
      }
    });
  });

export const productUpdateSchema = productCreateSchema;

export const leadUpdateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUOTED', 'SOLD', 'LOST']).optional(),
  notes: z.string().trim().max(2000).nullish(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional(),
  logo: z.string().url().nullish(),
  banner: z.string().url().nullish(),
  tagline: z.string().trim().max(120).nullish(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional(),
  icon: z.string().trim().max(60).nullish(),
  image: z.string().url().nullish(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const shopSchema = z.object({
  name: z.string().trim().min(1).max(80),
  whatsapp: z.string().regex(/^\d{9,15}$/, 'Digits only, e.g. 94777655565'),
  email: z.string().email().nullish().or(z.literal('')),
  addressLine: z.string().trim().max(200).nullish(),
  mapUrl: z.string().url().nullish().or(z.literal('')),
  hours: z.string().trim().max(120).nullish(),
  footerBlurb: z.string().trim().max(400).nullish(),
  facebook: z.string().url().nullish().or(z.literal('')),
  instagram: z.string().url().nullish().or(z.literal('')),
  tiktok: z.string().url().nullish().or(z.literal('')),
});

export const navSchema = z.object({
  showCategories: z.boolean().default(true),
  maxCategories: z.number().int().min(0).max(8).default(4),
  shopLabel: z.string().trim().min(1).max(30).default('All Products'),
  extra: z
    .array(z.object({
      label: z.string().trim().min(1).max(30),
      href: z.string().trim().min(1).max(200),
    }))
    .max(6)
    .default([]),
});

export const staffUpdateSchema = z.object({
  role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

/** Settings live as jsonb, so the shape is validated per key. */
export const settingKeys = ['hero', 'shop', 'nav'] as const;

export const bannerSchema = z.object({
  /** Null = homepage. Set = that category's listing page. */
  categoryId: z.string().nullish(),
  title: z.string().trim().min(1, 'Give the banner a title').max(120),
  subtitle: z.string().trim().max(200).nullish(),
  cta: z.string().trim().max(40).nullish(),
  image: z.string().url('Upload an image first'),
  link: z.string().trim().max(300).nullish(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().nullish(),
  endsAt: z.string().datetime().nullish(),
  sortOrder: z.number().int().min(0).default(0),
});

export const planSchema = z.object({
  bankName: z.string().trim().min(1, 'Bank name is required').max(80),
  logo: z.string().url().nullish(),
  months: z.number().int().min(1).max(60),
  interestPct: z.number().min(0).max(100).default(0),
  minAmount: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const attributeSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().max(60).optional(),
  kind: z.enum(['STORAGE', 'RAM', 'COLOR', 'OTHER']).default('OTHER'),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  values: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1).max(60),
        hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .default([]),
});

export const heroSchema = z.object({
  mode: z.enum(['featured', 'custom']).default('featured'),
  image: z.string().url().nullish(),
  /** Explicit product for the 'Most asked about' card. Null = auto. */
  spotlightProductId: z.string().nullish(),
  spotlightLabel: z.string().trim().max(40).nullish(),
  blur: z.number().int().min(0).max(60).default(30),
  dim: z.number().int().min(0).max(90).default(45),
  eyebrow: z.string().trim().max(80).nullish(),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(400).nullish(),
  primaryLabel: z.string().trim().max(40).nullish(),
  primaryHref: z.string().trim().max(200).nullish(),
  secondaryLabel: z.string().trim().max(40).nullish(),
  secondaryHref: z.string().trim().max(200).nullish(),
  statsEnabled: z.boolean().default(true),
  stat1Value: z.string().trim().max(12).nullish(),
  stat1Label: z.string().trim().max(30).nullish(),
  stat2Value: z.string().trim().max(12).nullish(),
  stat2Label: z.string().trim().max(30).nullish(),
  stat3Value: z.string().trim().max(12).nullish(),
  stat3Label: z.string().trim().max(30).nullish(),
});

/** Parses URLSearchParams into a plain object for zod. */
export function queryObject(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

/** Reads and validates a JSON body, with a clear error for malformed JSON. */
export async function parseJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    const { BadRequest } = await import('./errors');
    throw BadRequest('Request body must be valid JSON');
  }
  return schema.parse(raw);
}
