import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";

// Helper: Hash OTP Code with phone salt (matching server implementation)
function hashOtp(phone: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone.trim()}:${code.trim()}`)
    .digest("hex");
}

// Mock Supabase Client
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn().mockImplementation(() => ({
  eq: vi.fn().mockReturnValue({ error: null }),
}));

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "staff-1", user_metadata: { role: "admin" } } },
      error: null,
    }),
  },
  from: vi.fn().mockImplementation((table) => {
    if (table === "store_settings") {
      return {
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            maybeSingle: mockSingle,
          })),
        })),
      };
    }
    if (table === "user_roles") {
      return {
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" } }),
          })),
        })),
      };
    }
    if (table === "order_history") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === "otp_verifications") {
      return {
        insert: mockInsert,
        update: mockUpdate,
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            gt: vi.fn().mockResolvedValue({ data: [] }), // for cooldown & hourly checks
            eq: vi.fn().mockImplementation(() => ({
              gt: vi.fn().mockImplementation(() => ({
                order: vi.fn().mockImplementation(() => ({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "mock-otp-id",
                        code_hash: hashOtp("01712345678", "1234"),
                        attempts: 0,
                        max_attempts: 3,
                        expires_at: new Date(Date.now() + 500000).toISOString(),
                        verified: false,
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        })),
      };
    }
    return {};
  }),
};

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => mockSupabaseClient,
  };
});

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import sendOtpHandler from "../../api/sms/send-otp";
import verifyOtpHandler from "../../api/sms/verify-otp";
import sendSmsHandler from "../../api/sms/send";

describe("SMS & OTP Verification Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("send-otp.ts handler", () => {
    it("should succeed and store hashed OTP without leaking raw code in response", async () => {
      mockSingle.mockResolvedValue({
        data: {
          key: "sms_settings",
          value: {
            enabled: true,
            sandbox_mode: true,
            otp_digit_count: 4,
            otp_template: "Your OTP is {otp}",
            gateway: "sandbox",
          },
        },
        error: null,
      });

      mockInsert.mockResolvedValue({ error: null });

      const req: any = {
        method: "POST",
        body: { phone: "01712345678" },
        headers: {},
        socket: {},
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await sendOtpHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
        })
      );
      // Ensure the raw code is NEVER in the response
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.code).toBeUndefined();

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "01712345678",
          code_hash: expect.any(String),
          verified: false,
        })
      );
    });
  });

  describe("verify-otp.ts handler", () => {
    it("should verify correct OTP code against hash", async () => {
      const req: any = {
        method: "POST",
        body: { phone: "01712345678", code: "1234" },
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await verifyOtpHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          message: "ওটিপি সফলভাবে ভেরিফাই হয়েছে",
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          verified: true,
        })
      );
    });
  });

  describe("send.ts (generic send sms)", () => {
    it("should reject unauthenticated requests", async () => {
      const req: any = {
        method: "POST",
        headers: {}, // No authorization header
        body: { phone: "01712345678", message: "Hello Customer" },
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await sendSmsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should handle authenticated staff SMS requests successfully", async () => {
      mockSingle.mockResolvedValue({
        data: {
          key: "sms_settings",
          value: {
            enabled: true,
            sandbox_mode: true,
            gateway: "sandbox",
          },
        },
        error: null,
      });

      const req: any = {
        method: "POST",
        headers: { authorization: "Bearer valid-staff-jwt-token" },
        body: { phone: "01712345678", message: "Hello Customer" },
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await sendSmsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          sandbox: true,
        })
      );
    });
  });
});
