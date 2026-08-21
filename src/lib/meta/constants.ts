// Meta Pixel & Conversions API (CAPI) Constants for Rangao

export const DEFAULT_CURRENCY = "BDT";
export const DEFAULT_CONTENT_TYPE = "product" as const;
export const DEFAULT_GRAPH_API_VERSION = "v21.0";
export const META_GRAPH_API_BASE = "https://graph.facebook.com";

export const META_STANDARD_EVENTS = {
  PAGE_VIEW: "PageView",
  VIEW_CONTENT: "ViewContent",
  SEARCH: "Search",
  ADD_TO_CART: "AddToCart",
  INITIATE_CHECKOUT: "InitiateCheckout",
  ADD_PAYMENT_INFO: "AddPaymentInfo",
  PURCHASE: "Purchase",
  LEAD: "Lead",
  COMPLETE_REGISTRATION: "CompleteRegistration",
  ADD_TO_WISHLIST: "AddToWishlist",
  CONTACT: "Contact",
  CUSTOMIZE_PRODUCT: "CustomizeProduct",
} as const;

export const META_CUSTOM_EVENTS = {
  WHATSAPP_CLICK: "WhatsAppClick",
  CALL_CLICK: "CallClick",
  ORDER_PLACED_COD: "OrderPlacedCOD",
  PAYMENT_INITIATED: "PaymentInitiated",
  PAYMENT_SUCCESS: "PaymentSuccess",
  COUPON_APPLIED: "CouponApplied",
  CHECKOUT_OTP_REQUESTED: "CheckoutOTPRequested",
  CHECKOUT_OTP_VERIFIED: "CheckoutOTPVerified",
  PRODUCT_IMAGE_ZOOM: "ProductImageZoom",
  COMBO_SELECTED: "ComboSelected",
} as const;
