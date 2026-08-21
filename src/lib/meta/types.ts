// Strongly-typed TypeScript interfaces for Meta Pixel & Conversions API (CAPI)

export type MetaStandardEventName =
  | "PageView"
  | "ViewContent"
  | "Search"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "Lead"
  | "CompleteRegistration"
  | "AddToWishlist"
  | "Contact"
  | "CustomizeProduct";

export type MetaEventName = MetaStandardEventName | string;

export interface EcommerceItem {
  id: string;
  name?: string;
  price: number;
  quantity: number;
  category?: string;
  sku?: string;
  variant?: string;
  brand?: string;
  isCombo?: boolean;
}

export interface RawUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  externalId?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}

export interface MetaUserData {
  em?: string[]; // SHA-256 hashed lowercase emails
  ph?: string[]; // SHA-256 hashed international E.164 phone numbers (no +)
  fn?: string[]; // SHA-256 hashed first names
  ln?: string[]; // SHA-256 hashed last names
  ct?: string[]; // SHA-256 hashed lowercase cities
  st?: string[]; // SHA-256 hashed states/divisions
  zp?: string[]; // SHA-256 hashed zip codes
  country?: string[]; // SHA-256 hashed two-letter country codes (e.g. "bd")
  external_id?: string[]; // SHA-256 hashed unique customer or order ID
  client_ip_address?: string; // NOT hashed
  client_user_agent?: string; // NOT hashed
  fbp?: string; // NOT hashed
  fbc?: string; // NOT hashed
}

export interface MetaContentItem {
  id: string;
  quantity: number;
  item_price?: number;
  price?: number;
  title?: string;
  category?: string;
  brand?: string;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: "product" | "product_group";
  contents?: MetaContentItem[];
  num_items?: number;
  search_string?: string;
  order_id?: string;
  status?: string;
  delivery_category?: string;
  predicted_ltv?: number;
  [key: string]: any;
}

export interface MetaCapiEvent {
  event_name: MetaEventName;
  event_time: number; // Unix timestamp in SECONDS
  event_id: string; // Used for browser + server deduplication
  event_source_url?: string;
  action_source: "website" | "app" | "physical_store" | "system_generated" | "other";
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  opt_out?: boolean;
}

export interface MetaCapiPayload {
  data: MetaCapiEvent[];
  access_token?: string;
  test_event_code?: string;
  partner_agent?: string;
}

export interface MetaTrackingConfig {
  global_enabled: boolean;
  meta_pixel_enabled: boolean;
  meta_pixel_id: string;
  meta_capi_enabled: boolean;
  meta_access_token?: string;
  meta_test_event_code?: string;
  meta_strict_purchase_mode?: boolean;
  meta_debug_mode?: boolean;
  meta_api_version?: string;
}

export interface MetaAttributionContext {
  fbp: string | null;
  fbc: string | null;
  fbclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string | null;
}
