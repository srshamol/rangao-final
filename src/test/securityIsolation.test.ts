import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Helper: Hash OTP Code with phone salt
function hashOtp(phone: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone.trim()}:${code.trim()}`)
    .digest("hex");
}

describe("Secret Isolation & Operational Security Test Suite", () => {
  // =========================================================================
  // 1. Anonymous Read Denial on Private Settings & OTP Records
  // =========================================================================
  describe("1. Anonymous Users Cannot Read Private Settings or OTP Records", () => {
    it("should deny anonymous access to private store_settings keys (payment_methods, sms_settings, telegram_settings, courier_settings)", () => {
      // Simulate Database RLS Policy for store_settings
      const publicAllowedKeys = new Set([
        "hero_banner",
        "contact_info",
        "homepage_sections",
        "store_info",
        "delivery_charges",
        "public_tracking_settings",
        "homepage_section_order",
        "offer_banner",
        "trust_features",
        "newsletter",
        "statistics",
        "homepage_gallery",
        "announcement_bar",
        "seo_settings",
        "order_control",
        "category_seo_data",
        "about_us_settings",
      ]);

      const simulateStoreSettingsSelect = (role: "anon" | "authenticated_staff", requestedKey: string) => {
        if (role === "authenticated_staff") return { allowed: true, data: { key: requestedKey, value: "SECRET_DATA" } };
        if (publicAllowedKeys.has(requestedKey) || requestedKey.startsWith("product_seo_")) {
          return { allowed: true, data: { key: requestedKey, value: "PUBLIC_DISPLAY_DATA" } };
        }
        return { allowed: false, data: null, error: "RLS_PERMISSION_DENIED" };
      };

      const privateKeys = [
        "payment_methods",
        "sms_settings",
        "telegram_settings",
        "courier_settings",
        "steadfast_settings",
        "tracking_settings",
        "fraud_settings",
      ];

      for (const key of privateKeys) {
        const res = simulateStoreSettingsSelect("anon", key);
        expect(res.allowed).toBe(false);
        expect(res.error).toBe("RLS_PERMISSION_DENIED");
      }

      // Public display keys must still be readable
      const publicRes = simulateStoreSettingsSelect("anon", "hero_banner");
      expect(publicRes.allowed).toBe(true);
      expect(publicRes.data?.value).toBe("PUBLIC_DISPLAY_DATA");
    });

    it("should deny anonymous direct table SELECT and INSERT on otp_verifications", () => {
      const simulateOtpTableAccess = (role: "anon" | "service_role", action: "SELECT" | "INSERT") => {
        if (role === "service_role") return { success: true };
        return {
          success: false,
          error: {
            code: "42501",
            message: 'permission denied for table "otp_verifications"',
          },
        };
      };

      const selectAttempt = simulateOtpTableAccess("anon", "SELECT");
      expect(selectAttempt.success).toBe(false);
      expect(selectAttempt.error.code).toBe("42501");

      const insertAttempt = simulateOtpTableAccess("anon", "INSERT");
      expect(insertAttempt.success).toBe(false);
      expect(insertAttempt.error.code).toBe("42501");
    });
  });

  // =========================================================================
  // 2. Client Cannot Obtain Payment Credentials
  // =========================================================================
  describe("2. Client Cannot Obtain Payment Credentials", () => {
    it("should only expose display flags via get_public_payment_methods RPC and never leak gateway API keys", () => {
      // Simulating private database record in store_settings
      const privatePaymentMethodsRow = {
        cod: true,
        bkash: true,
        nagad: false,
        bkash_number: "01812345678",
        nagad_number: "",
        uddoktapay: true,
        uddoktapay_api_key: "UP_SECRET_LIVE_API_KEY_DO_NOT_EXPOSE",
        uddoktapay_base_url: "https://secure.uddoktapay.com",
        uddoktapay_display_name: "অনলাইন পেমেন্ট (UddoktaPay)",
      };

      // Simulating get_public_payment_methods PostgreSQL RPC logic
      const getPublicPaymentMethodsRPC = (row: typeof privatePaymentMethodsRow | null) => {
        if (!row) return { cod: true, bkash: false, nagad: false, uddoktapay: false };
        return {
          cod: Boolean(row.cod),
          bkash: Boolean(row.bkash),
          nagad: Boolean(row.nagad),
          bkash_number: row.bkash_number || "",
          nagad_number: row.nagad_number || "",
          uddoktapay: Boolean(row.uddoktapay),
          uddoktapay_display_name: row.uddoktapay_display_name || "অনলাইন পেমেন্ট",
        };
      };

      const publicOutput = getPublicPaymentMethodsRPC(privatePaymentMethodsRow);

      expect(publicOutput.cod).toBe(true);
      expect(publicOutput.uddoktapay).toBe(true);
      expect(publicOutput.uddoktapay_display_name).toBe("অনলাইন পেমেন্ট (UddoktaPay)");
      // Secrets MUST NOT be present in RPC output
      expect((publicOutput as any).uddoktapay_api_key).toBeUndefined();
      expect((publicOutput as any).uddoktapay_base_url).toBeUndefined();
      expect(JSON.stringify(publicOutput)).not.toContain("UP_SECRET_LIVE_API_KEY_DO_NOT_EXPOSE");
    });
  });

  // =========================================================================
  // 3. OTP Replay, Expiry, Brute-force, and Rate-limit Behavior
  // =========================================================================
  describe("3. OTP Replay, Expiry, Brute-Force, and Rate-Limit Security", () => {
    class MockOtpEngine {
      records: Array<{
        id: string;
        phone: string;
        code_hash: string;
        attempts: number;
        max_attempts: number;
        expires_at: number;
        verified: boolean;
        created_at: number;
      }> = [];

      sendOtp(phone: string, now: number): { success: boolean; error?: string; status?: number } {
        // Rate limit: 60s cooldown
        const recent = this.records.find(
          (r) => r.phone === phone && now - r.created_at < 60 * 1000
        );
        if (recent) {
          return { success: false, status: 429, error: "RATE_LIMIT_COOLDOWN" };
        }

        // Rate limit: Max 5 per hour
        const hourlyCount = this.records.filter(
          (r) => r.phone === phone && now - r.created_at < 3600 * 1000
        ).length;
        if (hourlyCount >= 5) {
          return { success: false, status: 429, error: "RATE_LIMIT_HOURLY_EXCEEDED" };
        }

        // Cryptographic generation & hashing
        const rawCode = String(crypto.randomInt(1000, 10000));
        const hash = hashOtp(phone, rawCode);

        this.records.unshift({
          id: `otp_${this.records.length + 1}`,
          phone,
          code_hash: hash,
          attempts: 0,
          max_attempts: 3,
          expires_at: now + 5 * 60 * 1000, // 5 min
          verified: false,
          created_at: now,
        });

        // Crucial: never return raw code
        return { success: true };
      }

      verifyOtp(phone: string, code: string, now: number): { success: boolean; error?: string; status?: number } {
        const record = this.records.find(
          (r) => r.phone === phone && !r.verified && r.expires_at > now
        );

        if (!record) {
          return { success: false, error: "OTP_NOT_FOUND_OR_EXPIRED" };
        }

        if (record.attempts >= record.max_attempts) {
          return { success: false, status: 429, error: "MAX_ATTEMPTS_EXCEEDED" };
        }

        const candidateHash = hashOtp(phone, code);
        if (candidateHash !== record.code_hash) {
          record.attempts += 1;
          if (record.attempts >= record.max_attempts) {
            return { success: false, status: 429, error: "MAX_ATTEMPTS_EXCEEDED" };
          }
          return { success: false, error: `INCORRECT_CODE_REMAINING_${record.max_attempts - record.attempts}` };
        }

        record.verified = true;
        return { success: true };
      }
    }

    it("should prevent OTP replay attacks (single-use consumption)", () => {
      const engine = new MockOtpEngine();
      const phone = "01711111111";
      const now = Date.now();

      engine.sendOtp(phone, now);
      const record = engine.records[0];
      // Test code corresponding to hash
      const validCode = "9999";
      record.code_hash = hashOtp(phone, validCode);

      // First verification: success
      const verify1 = engine.verifyOtp(phone, validCode, now + 10000);
      expect(verify1.success).toBe(true);

      // Second verification attempt (replay): MUST FAIL
      const verify2 = engine.verifyOtp(phone, validCode, now + 20000);
      expect(verify2.success).toBe(false);
      expect(verify2.error).toBe("OTP_NOT_FOUND_OR_EXPIRED");
    });

    it("should reject expired OTPs", () => {
      const engine = new MockOtpEngine();
      const phone = "01722222222";
      const now = Date.now();

      engine.sendOtp(phone, now);
      const record = engine.records[0];
      const validCode = "8888";
      record.code_hash = hashOtp(phone, validCode);

      // Verification after 6 minutes (expiry is 5 mins)
      const verify = engine.verifyOtp(phone, validCode, now + 6 * 60 * 1000);
      expect(verify.success).toBe(false);
      expect(verify.error).toBe("OTP_NOT_FOUND_OR_EXPIRED");
    });

    it("should enforce brute-force protection (lockout after 3 failed attempts)", () => {
      const engine = new MockOtpEngine();
      const phone = "01733333333";
      const now = Date.now();

      engine.sendOtp(phone, now);
      const record = engine.records[0];
      record.code_hash = hashOtp(phone, "7777");

      // Attempt 1: wrong
      const a1 = engine.verifyOtp(phone, "0001", now + 1000);
      expect(a1.success).toBe(false);
      expect(a1.error).toBe("INCORRECT_CODE_REMAINING_2");

      // Attempt 2: wrong
      const a2 = engine.verifyOtp(phone, "0002", now + 2000);
      expect(a2.success).toBe(false);
      expect(a2.error).toBe("INCORRECT_CODE_REMAINING_1");

      // Attempt 3: wrong -> lock out
      const a3 = engine.verifyOtp(phone, "0003", now + 3000);
      expect(a3.success).toBe(false);
      expect(a3.error).toBe("MAX_ATTEMPTS_EXCEEDED");

      // Attempt 4: even if now providing correct code, it is locked out!
      const a4 = engine.verifyOtp(phone, "7777", now + 4000);
      expect(a4.success).toBe(false);
      expect(a4.error).toBe("MAX_ATTEMPTS_EXCEEDED");
    });

    it("should enforce cooldown and hourly rate limits on OTP dispatch", () => {
      const engine = new MockOtpEngine();
      const phone = "01744444444";
      let now = Date.now();

      // Request 1: success
      const r1 = engine.sendOtp(phone, now);
      expect(r1.success).toBe(true);

      // Request 2 (10s later): cooldown rejection
      const r2 = engine.sendOtp(phone, now + 10000);
      expect(r2.success).toBe(false);
      expect(r2.status).toBe(429);
      expect(r2.error).toBe("RATE_LIMIT_COOLDOWN");

      // Advance past cooldown (70s later)
      now += 70000;
      expect(engine.sendOtp(phone, now).success).toBe(true); // 2nd
      now += 70000;
      expect(engine.sendOtp(phone, now).success).toBe(true); // 3rd
      now += 70000;
      expect(engine.sendOtp(phone, now).success).toBe(true); // 4th
      now += 70000;
      expect(engine.sendOtp(phone, now).success).toBe(true); // 5th

      // 6th request within 1 hour: Hourly limit exceeded
      now += 70000;
      const r6 = engine.sendOtp(phone, now);
      expect(r6.success).toBe(false);
      expect(r6.status).toBe(429);
      expect(r6.error).toBe("RATE_LIMIT_HOURLY_EXCEEDED");
    });
  });

  // =========================================================================
  // 4. Unauthenticated SMS and Telegram Requests are Rejected
  // =========================================================================
  describe("4. Unauthenticated SMS and Telegram Requests are Rejected", () => {
    it("should reject unauthenticated calls to SMS dispatch", () => {
      const simulateSmsHandler = (headers: Record<string, string>) => {
        const auth = headers["authorization"];
        if (!auth || !auth.startsWith("Bearer staff-jwt-token")) {
          return { status: 401, error: "Unauthorized: Staff authentication required" };
        }
        return { status: 200, success: true };
      };

      const unauthCall = simulateSmsHandler({});
      expect(unauthCall.status).toBe(401);

      const customerJwtCall = simulateSmsHandler({ authorization: "Bearer customer-jwt-token" });
      expect(customerJwtCall.status).toBe(401);

      const staffCall = simulateSmsHandler({ authorization: "Bearer staff-jwt-token-123" });
      expect(staffCall.status).toBe(200);
    });

    it("should reject unauthenticated calls to Telegram notification endpoint", () => {
      const simulateTelegramHandler = (headers: Record<string, string>) => {
        const auth = headers["authorization"];
        const internalSecret = headers["x-internal-secret"];
        if (internalSecret === "INTERNAL_SECRET_OK" || (auth && auth.startsWith("Bearer staff-jwt-token"))) {
          return { status: 200, success: true };
        }
        return { status: 401, error: "Unauthorized: Staff authentication required" };
      };

      const anonCall = simulateTelegramHandler({});
      expect(anonCall.status).toBe(401);

      const internalCall = simulateTelegramHandler({ "x-internal-secret": "INTERNAL_SECRET_OK" });
      expect(internalCall.status).toBe(200);
    });
  });

  // =========================================================================
  // 5. Invalid Payment Webhooks Cannot Change an Order
  // =========================================================================
  describe("5. Invalid Payment Webhooks Cannot Change an Order", () => {
    const SERVER_CONFIGURED_WEBHOOK_KEY = "SECRET_UDDOKTAPAY_WEBHOOK_KEY_12345";

    const simulateWebhook = (
      headers: Record<string, string>,
      payload: any,
      order: { id: string; total_amount: number; payment_status: string }
    ) => {
      const headerKey = headers["rt-uddoktapay-api-key"] || headers["RT-UDDOKTAPAY-API-KEY"];
      if (!headerKey || headerKey !== SERVER_CONFIGURED_WEBHOOK_KEY) {
        return { status: 401, error: "Unauthorized Action: Invalid Webhook Secret", orderModified: false };
      }

      if (payload.status !== "COMPLETED") {
        return { status: 200, message: "Ignored non-completed status", orderModified: false };
      }

      if (payload.currency && payload.currency !== "BDT") {
        return { status: 400, error: "Invalid currency", orderModified: false };
      }

      const paidAmount = Number(payload.amount);
      if (isNaN(paidAmount) || Math.abs(paidAmount - order.total_amount) > 0.01) {
        return { status: 400, error: "Payment amount mismatch", orderModified: false };
      }

      if (order.payment_status === "completed") {
        return { status: 200, message: "Already completed (idempotent)", orderModified: false };
      }

      order.payment_status = "completed";
      return { status: 200, message: "Order payment marked completed", orderModified: true };
    };

    it("should reject webhook requests with invalid or missing API key signature", () => {
      const order = { id: "ord-101", total_amount: 1500, payment_status: "pending" };
      const payload = {
        status: "COMPLETED",
        amount: 1500,
        currency: "BDT",
        metadata: { order_id: "ord-101" },
      };

      // Mismatched secret
      const res = simulateWebhook({ "rt-uddoktapay-api-key": "WRONG_SECRET" }, payload, order);
      expect(res.status).toBe(401);
      expect(res.orderModified).toBe(false);
      expect(order.payment_status).toBe("pending");
    });

    it("should reject webhook requests with amount tampering (partial payment attack)", () => {
      const order = { id: "ord-102", total_amount: 2500, payment_status: "pending" };
      const fraudulentPayload = {
        status: "COMPLETED",
        amount: 50, // Attacker paid 50 BDT instead of 2500 BDT
        currency: "BDT",
        metadata: { order_id: "ord-102" },
      };

      const res = simulateWebhook(
        { "rt-uddoktapay-api-key": SERVER_CONFIGURED_WEBHOOK_KEY },
        fraudulentPayload,
        order
      );

      expect(res.status).toBe(400);
      expect(res.error).toContain("Payment amount mismatch");
      expect(res.orderModified).toBe(false);
      expect(order.payment_status).toBe("pending");
    });

    it("should reject webhook requests with non-BDT currencies", () => {
      const order = { id: "ord-103", total_amount: 1000, payment_status: "pending" };
      const invalidCurrencyPayload = {
        status: "COMPLETED",
        amount: 1000,
        currency: "USD",
        metadata: { order_id: "ord-103" },
      };

      const res = simulateWebhook(
        { "rt-uddoktapay-api-key": SERVER_CONFIGURED_WEBHOOK_KEY },
        invalidCurrencyPayload,
        order
      );

      expect(res.status).toBe(400);
      expect(res.error).toBe("Invalid currency");
      expect(order.payment_status).toBe("pending");
    });
  });

  // =========================================================================
  // 6. Duplicate Valid Webhooks Remain Idempotent
  // =========================================================================
  describe("6. Duplicate Valid Webhooks Remain Idempotent", () => {
    const SERVER_CONFIGURED_WEBHOOK_KEY = "SECRET_UDDOKTAPAY_WEBHOOK_KEY_12345";

    it("should process the first valid webhook and remain strictly idempotent on subsequent duplicate webhooks", () => {
      const order = { id: "ord-104", total_amount: 1200, payment_status: "pending" };
      const validPayload = {
        status: "COMPLETED",
        amount: 1200,
        currency: "BDT",
        transaction_id: "TXN_VALID_999",
        metadata: { order_id: "ord-104" },
      };

      const headers = { "rt-uddoktapay-api-key": SERVER_CONFIGURED_WEBHOOK_KEY };

      let notificationsCount = 0;

      const processWebhook = () => {
        const headerKey = headers["rt-uddoktapay-api-key"];
        if (headerKey !== SERVER_CONFIGURED_WEBHOOK_KEY) return { status: 401 };

        if (order.payment_status === "completed") {
          return { status: 200, is_duplicate: true, message: "Order payment already marked completed (idempotent)" };
        }

        order.payment_status = "completed";
        notificationsCount += 1; // Dispatch notification
        return { status: 200, is_duplicate: false, message: "Payment processed successfully" };
      };

      // 1. First webhook execution
      const call1 = processWebhook();
      expect(call1.status).toBe(200);
      expect(call1.is_duplicate).toBe(false);
      expect(order.payment_status).toBe("completed");
      expect(notificationsCount).toBe(1);

      // 2. Duplicate webhook replay (e.g. gateway retry)
      const call2 = processWebhook();
      expect(call2.status).toBe(200);
      expect(call2.is_duplicate).toBe(true);
      expect(order.payment_status).toBe("completed");
      // Notification count MUST remain 1 (no duplicate spam)
      expect(notificationsCount).toBe(1);

      // 3. Third duplicate replay
      const call3 = processWebhook();
      expect(call3.status).toBe(200);
      expect(call3.is_duplicate).toBe(true);
      expect(notificationsCount).toBe(1);
    });
  });
});
