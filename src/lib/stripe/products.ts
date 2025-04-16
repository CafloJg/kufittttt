// Stripe product IDs
export const STRIPE_PRODUCTS = {
  BASIC: 'prod_RijczczxlKIlMi',
  PREMIUM: 'prod_Rijj6rToiJigUu',
  PREMIUM_PLUS: 'prod_RijpJECXfrQELz'
} as const;

// Map subscription tiers to product IDs
export const TIER_TO_PRODUCT = {
  'basic': STRIPE_PRODUCTS.BASIC,
  'premium': STRIPE_PRODUCTS.PREMIUM,
  'premium-plus': STRIPE_PRODUCTS.PREMIUM_PLUS
} as const;