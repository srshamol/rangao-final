import { describe, it, expect } from "vitest";
import { cleanBangladeshiPhone, cleanSteadfastAddress } from "@/lib/integrations/steadfast";

describe("Steadfast Integration Sanitizers", () => {
  describe("cleanBangladeshiPhone", () => {
    it("cleans international format +8801712345678 to 01712345678", () => {
      expect(cleanBangladeshiPhone("+8801712345678")).toBe("01712345678");
    });

    it("cleans prefix 8801712345678 to 01712345678", () => {
      expect(cleanBangladeshiPhone("8801712345678")).toBe("01712345678");
    });

    it("handles phone numbers with spaces and hyphens", () => {
      expect(cleanBangladeshiPhone("01712-345 678")).toBe("01712345678");
      expect(cleanBangladeshiPhone("+880 1812-345 678")).toBe("01812345678");
    });

    it("prepends 0 if 10-digit number is given starting with 1", () => {
      expect(cleanBangladeshiPhone("1712345678")).toBe("01712345678");
    });

    it("returns empty string for empty input", () => {
      expect(cleanBangladeshiPhone("")).toBe("");
      expect(cleanBangladeshiPhone(undefined)).toBe("");
    });
  });

  describe("cleanSteadfastAddress", () => {
    it("assembles address from object fields", () => {
      const addrObj = {
        address: "House 12, Road 4",
        area: "Dhanmondi",
        city: "Dhaka",
        division: "Dhaka",
      };
      expect(cleanSteadfastAddress(addrObj)).toBe("House 12, Road 4, Dhanmondi, Dhaka");
    });

    it("handles string address", () => {
      expect(cleanSteadfastAddress("House 12, Road 4, Dhanmondi, Dhaka")).toBe("House 12, Road 4, Dhanmondi, Dhaka");
    });

    it("returns empty string for undefined", () => {
      expect(cleanSteadfastAddress(undefined)).toBe("");
    });
  });
});
