import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
const mockSingle = vi.fn();
const mockEq = vi.fn().mockImplementation(() => ({
  maybeSingle: mockSingle,
  order: vi.fn().mockImplementation(() => ({
    eq: vi.fn(),
  })),
}));
const mockSelect = vi.fn().mockImplementation(() => ({
  eq: mockEq,
}));
const mockInsert = vi.fn();
const mockUpdate = vi.fn().mockImplementation(() => ({
  eq: vi.fn().mockReturnValue({ error: null }),
}));

const mockSupabaseClient = {
  from: vi.fn().mockImplementation((table) => {
    if (table === "store_settings") {
      return {
        select: mockSelect,
      };
    }
    if (table === "otp_verifications") {
      return {
        insert: mockInsert,
        update: mockUpdate,
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                gt: vi.fn().mockImplementation(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "mock-otp-id",
                        code: "1234",
                        expires_at: new Date(Date.now() + 50000).toISOString(),
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
    it("should return sandbox code successfully when sandbox mode is enabled", async () => {
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

      const req = {
        method: "POST",
        body: { phone: "01712345678" },
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await sendOtpHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          sandbox: true,
        })
      );
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should fallback to 1234 for test phone numbers", async () => {
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

      const req = {
        method: "POST",
        body: { phone: "01700000000" },
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await sendOtpHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          code: "1234",
        })
      );
    });
  });

  describe("verify-otp.ts handler", () => {
    it("should verify correct OTP code", async () => {
      const req = {
        method: "POST",
        body: { phone: "01712345678", code: "1234" },
      };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await verifyOtpHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          message: "OTP verified successfully",
        })
      );
    });
  });

  describe("send.ts (generic send sms)", () => {
    it("should handle sandbox mode and return success", async () => {
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

      const req = {
        method: "POST",
        body: { phone: "01712345678", message: "Hello Customer" },
      };

      const res = {
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
