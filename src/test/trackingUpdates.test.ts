import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  appendTrackingUpdate,
  parseNumericFee,
  parseParcelWeight,
  parseShippingAddress,
  courierStatusBengali,
  getCourierStatusBadgeClass,
  TrackingUpdateItem,
} from "@/lib/integrations/steadfast";

describe("Steadfast Tracking Updates & Sanitizers", () => {
  describe("parseNumericFee", () => {
    it("should parse numeric strings with TK, ৳, and extra spaces", () => {
      expect(parseNumericFee("95 TK")).toBe(95);
      expect(parseNumericFee("৳ 120.50")).toBe(120.5);
      expect(parseNumericFee("  60 ")).toBe(60);
      expect(parseNumericFee(150)).toBe(150);
    });

    it("should fallback when empty or invalid", () => {
      expect(parseNumericFee(null, 60)).toBe(60);
      expect(parseNumericFee(undefined, 120)).toBe(120);
      expect(parseNumericFee("", 0)).toBe(0);
    });
  });

  describe("parseParcelWeight", () => {
    it("should parse weights correctly with units", () => {
      expect(parseParcelWeight("1.7KG")).toBe("1.7 kg");
      expect(parseParcelWeight("500g")).toBe("500 g");
      expect(parseParcelWeight(2.5)).toBe("2.5 kg");
      expect(parseParcelWeight("2.0 kg")).toBe("2.0 kg");
    });

    it("should fallback on missing weight", () => {
      expect(parseParcelWeight(null)).toBe("1.0 kg");
      expect(parseParcelWeight("")).toBe("1.0 kg");
    });
  });

  describe("appendTrackingUpdate", () => {
    it("should append a new tracking update", () => {
      const existing: TrackingUpdateItem[] = [
        {
          status: "pending",
          status_display: "পেন্ডিং",
          timestamp: "2026-08-25T00:00:00.000Z",
          source: "steadfast_api",
        },
      ];

      const newUpdate: TrackingUpdateItem = {
        status: "in_transit",
        status_display: "ট্রানজিটে আছে",
        timestamp: "2026-08-25T00:10:00.000Z",
        source: "steadfast_api",
      };

      const result = appendTrackingUpdate(existing, newUpdate);
      expect(result).toHaveLength(2);
      expect(result[1].status).toBe("in_transit");
    });

    it("should deduplicate immediate consecutive updates with same status within 2 minutes", () => {
      const existing: TrackingUpdateItem[] = [
        {
          status: "in_transit",
          status_display: "ট্রানজিটে আছে",
          timestamp: "2026-08-25T00:00:00.000Z",
          source: "steadfast_api",
        },
      ];

      const duplicateUpdate: TrackingUpdateItem = {
        status: "in_transit",
        status_display: "ট্রানজিটে আছে",
        timestamp: "2026-08-25T00:00:30.000Z",
        source: "steadfast_api",
      };

      const result = appendTrackingUpdate(existing, duplicateUpdate);
      expect(result).toHaveLength(1);
    });

    it("should allow same status if timestamps are far apart", () => {
      const existing: TrackingUpdateItem[] = [
        {
          status: "in_transit",
          status_display: "ট্রানজিটে আছে",
          timestamp: "2026-08-25T00:00:00.000Z",
          source: "steadfast_api",
        },
      ];

      const distantUpdate: TrackingUpdateItem = {
        status: "in_transit",
        status_display: "ট্রানজিটে আছে - ঢাকা হাব",
        timestamp: "2026-08-25T04:00:00.000Z",
        source: "steadfast_api",
      };

      const result = appendTrackingUpdate(existing, distantUpdate);
      expect(result).toHaveLength(2);
    });
  });

  describe("courierStatusBengali dictionary & badges", () => {
    it("should translate common Steadfast statuses to Bengali", () => {
      expect(courierStatusBengali["in_transit"]).toContain("ট্রানজিটে আছে");
      expect(courierStatusBengali["delivered"]).toContain("ডেলিভারি সম্পন্ন");
      expect(courierStatusBengali["picked"]).toContain("পিকআপ সম্পন্ন");
      expect(courierStatusBengali["cancelled"]).toContain("ক্যান্সেলড");
    });

    it("should return valid badge classes for statuses", () => {
      expect(getCourierStatusBadgeClass("delivered")).toContain("emerald");
      expect(getCourierStatusBadgeClass("cancelled")).toContain("red");
      expect(getCourierStatusBadgeClass("in_transit")).toContain("blue");
      expect(getCourierStatusBadgeClass("picked")).toContain("teal");
    });
  });

  describe("parseShippingAddress", () => {
    it("should handle JSON string and object format cleanly", () => {
      const obj = { address: "Dhanmondi, Dhaka", tracking_number: "SF12345" };
      expect(parseShippingAddress(obj)).toEqual(obj);
      expect(parseShippingAddress(JSON.stringify(obj))).toEqual(obj);
      expect(parseShippingAddress("Plain address text")).toEqual({ address: "Plain address text" });
      expect(parseShippingAddress(null)).toEqual({});
    });
  });
});
