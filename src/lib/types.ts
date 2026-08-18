/**
 * The data contract. These are the exact shapes the API returns and the
 * same shapes the frontend imports. If you change anything here, tell
 * the frontend developer before you deploy.
 */

export type StockStatus = 'IN_STOCK' | 'PRE_ORDER' | 'SOLD_OUT';
export type Condition = 'NEW' | 'USED' | 'REFURBISHED';
export type Badge = 'NEW_ARRIVAL' | 'BEST_SELLER' | 'SALE' | 'LIMITED';
export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'SOLD' | 'LOST';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  tagline: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  variantId: string | null;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string | null;
  storage: string | null;
  ram: string | null;
  color: string | null;
  colorHex: string | null;
  price: number;
  salePrice: number | null;
  stockStatus: StockStatus;
  sortOrder: number;
}

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  shortDesc: string | null;
  brandName: string;
  brandSlug: string;
  categorySlug: string;
  condition: Condition;
  badge: Badge | null;
  fromPrice: number;
  fromOriginalPrice: number;
  hasDiscount: boolean;
  anyInStock: boolean;
  variantCount: number;
  primaryImage: string | null;
  isFeatured: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string | null;
  brand: Brand;
  category: Category;
  condition: Condition;
  warrantyType: string | null;
  badge: Badge | null;
  specs: Record<string, string> | null;
  images: ProductImage[];
  variants: ProductVariant[];
  metaTitle: string | null;
  metaDesc: string | null;
}

export interface Banner {
  id: string;
  categoryId: string | null;
  title: string;
  subtitle: string | null;
  cta: string | null;
  image: string;
  link: string | null;
}

export interface InstallmentPlan {
  id: string;
  bankName: string;
  logo: string | null;
  months: number;
  interestPct: number;
  minAmount: number;
}

export interface PublicUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  userId: string | null;
  name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  productId: string | null;
  productName: string;
  variantLabel: string | null;
  price: number;
  message: string | null;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
}
