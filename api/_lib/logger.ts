/**
 * Authoritative Serverless Logger
 * Strictly strips customer PII, tokens, payment secrets, OTPs, and credentials
 * before printing to Vercel/Node runtime logs.
 */

const PHONE_REGEX = /(\+?880|0)1[3-9]\d{8}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_REGEX = /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-_.]+/gi;

const SENSITIVE_KEY_NAMES = new Set([
  "authorization",
  "auth",
  "password",
  "secret",
  "token",
  "api_key",
  "apikey",
  "api-key",
  "otp",
  "pin",
  "card",
  "cvv",
  "card_number",
  "uddoktapay_api_key",
  "sms_api_key",
  "phone",
  "customer_phone",
  "email",
  "customer_email",
  "address",
  "shipping_address",
]);

export function redactString(str: string): string {
  if (typeof str !== "string") return String(str);
  return str
    .replace(BEARER_REGEX, "Bearer [REDACTED_TOKEN]")
    .replace(JWT_REGEX, "[REDACTED_JWT]")
    .replace(PHONE_REGEX, "[REDACTED_PHONE]")
    .replace(EMAIL_REGEX, "[REDACTED_EMAIL]");
}

export function redactPayload(val: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    return redactString(val);
  }

  if (typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => redactPayload(item, depth + 1));
  }

  if (typeof val === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_KEY_NAMES.has(lower) || lower.includes("token") || lower.includes("secret") || lower.includes("password")) {
        clean[k] = "[REDACTED]";
      } else {
        clean[k] = redactPayload(v, depth + 1);
      }
    }
    return clean;
  }

  return String(val);
}

export const safeLog = {
  info(msg: string, meta?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: new Date().toISOString(),
        message: redactString(msg),
        context: meta ? redactPayload(meta) : undefined,
      })
    );
  },

  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: "WARN",
        timestamp: new Date().toISOString(),
        message: redactString(msg),
        context: meta ? redactPayload(meta) : undefined,
      })
    );
  },

  error(msg: string, error?: unknown, meta?: Record<string, unknown>): void {
    const errMsg =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Unknown error";
    const errStack = error instanceof Error ? error.stack : undefined;

    console.error(
      JSON.stringify({
        level: "ERROR",
        timestamp: new Date().toISOString(),
        message: redactString(msg),
        error: redactString(errMsg),
        stack: errStack ? redactString(errStack) : undefined,
        context: meta ? redactPayload(meta) : undefined,
      })
    );
  },
};
