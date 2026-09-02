/**
 * Safe Frontend Error Monitoring & Telemetry
 * Captures useful runtime context while strictly stripping customer PII,
 * tokens, credentials, phone numbers, emails, and passwords.
 */

export interface SanitizedErrorReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  route: string;
  context?: Record<string, unknown>;
  userAgent?: string;
}

const RING_BUFFER_MAX = 50;
const errorRingBuffer: SanitizedErrorReport[] = [];
let isInitialized = false;

// Regex patterns for sensitive customer data
const PHONE_PATTERN = /(\+?880|0)1[3-9]\d{8}\b/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_PATTERN = /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g;
const SENSITIVE_KEYS = [
  "token",
  "auth",
  "authorization",
  "bearer",
  "password",
  "secret",
  "api_key",
  "apikey",
  "otp",
  "pin",
  "card",
  "cvv",
  "phone",
  "email",
  "address",
  "customer_phone",
  "customer_email",
];

/**
 * Strips PII (phone, email, JWT tokens, secrets) from any string
 */
export function sanitizeString(val: string): string {
  if (typeof val !== "string") return String(val);
  return val
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]");
}

/**
 * Recursively redacts PII and sensitive dictionary keys from an object
 */
export function sanitizeContext(data: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED_DEPTH]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return sanitizeString(data);
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeContext(item, depth + 1));
  }

  if (typeof data === "object") {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        cleanObj[key] = "[REDACTED]";
      } else {
        cleanObj[key] = sanitizeContext(val, depth + 1);
      }
    }
    return cleanObj;
  }

  return String(data);
}

/**
 * Reports a safe, sanitized error to the in-memory telemetry buffer and optionally telemetry endpoints
 */
export function reportError(
  err: Error | string | unknown,
  extraContext?: Record<string, unknown>
): SanitizedErrorReport {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown runtime error";
  const rawStack = err instanceof Error ? err.stack : undefined;

  const currentRoute =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "server";

  const sanitized: SanitizedErrorReport = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    message: sanitizeString(message),
    stack: rawStack ? sanitizeString(rawStack) : undefined,
    route: sanitizeString(currentRoute),
    context: extraContext ? (sanitizeContext(extraContext) as Record<string, unknown>) : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  // Add to ring buffer
  errorRingBuffer.unshift(sanitized);
  if (errorRingBuffer.length > RING_BUFFER_MAX) {
    errorRingBuffer.pop();
  }

  // Log in development or safe debug mode
  if (import.meta.env?.DEV) {
    console.debug("[SafeErrorMonitoring]", sanitized);
  }

  return sanitized;
}

/**
 * Initializes global uncaught error and unhandled rejection listeners
 */
export function initErrorMonitoring(): void {
  if (isInitialized || typeof window === "undefined") return;

  window.addEventListener("error", (event: ErrorEvent) => {
    reportError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: "uncaught_error",
    });
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    reportError(event.reason || "Unhandled Promise Rejection", {
      type: "unhandled_promise_rejection",
    });
  });

  isInitialized = true;
}

/**
 * Returns recent sanitized errors for diagnostics
 */
export function getRecentErrors(): readonly SanitizedErrorReport[] {
  return errorRingBuffer;
}

/**
 * Clears the error ring buffer
 */
export function clearRecentErrors(): void {
  errorRingBuffer.length = 0;
}
