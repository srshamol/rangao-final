import { useCallback } from "react";
import {
  trackPageView,
  trackViewContent,
  trackSearch,
  trackAddToCart,
  trackInitiateCheckout,
  trackAddPaymentInfo,
  trackPurchase,
  trackLead,
  trackCompleteRegistration,
  trackAddToWishlist,
  trackContact,
  trackCustomEvent,
} from "@/lib/meta";
import type { EcommerceItem, RawUserData } from "@/lib/meta/types";

/**
 * Custom React Hook providing strongly-typed Meta Tracking actions.
 */
export function useMetaTracking() {
  const pageView = useCallback((url?: string, eventId?: string) => {
    return trackPageView(url, eventId);
  }, []);

  const viewContent = useCallback((product: { id: string; name?: string; price: number; category?: string; sku?: string }, eventId?: string) => {
    return trackViewContent(product, eventId);
  }, []);

  const search = useCallback((query: string, eventId?: string) => {
    return trackSearch(query, eventId);
  }, []);

  const addToCart = useCallback((item: EcommerceItem | { id: string; name?: string; price: number; category?: string; sku?: string }, quantity = 1, eventId?: string) => {
    return trackAddToCart(item, quantity, eventId);
  }, []);

  const initiateCheckout = useCallback((items: EcommerceItem[], total: number, eventId?: string) => {
    return trackInitiateCheckout(items, total, eventId);
  }, []);

  const addPaymentInfo = useCallback((items: EcommerceItem[], total: number, paymentMethod?: string, eventId?: string) => {
    return trackAddPaymentInfo(items, total, paymentMethod, eventId);
  }, []);

  const purchase = useCallback((order: { orderNumber: string; orderId?: string; total: number; items: EcommerceItem[]; customer?: RawUserData }, eventId?: string) => {
    return trackPurchase(order, eventId);
  }, []);

  const lead = useCallback((data: { value?: number; leadType?: string; email?: string; phone?: string } = {}, eventId?: string) => {
    return trackLead(data, eventId);
  }, []);

  const completeRegistration = useCallback((method = "email", userData?: RawUserData, eventId?: string) => {
    return trackCompleteRegistration(method, userData, eventId);
  }, []);

  const addToWishlist = useCallback((item: EcommerceItem, eventId?: string) => {
    return trackAddToWishlist(item, eventId);
  }, []);

  const contact = useCallback((method: "whatsapp" | "phone" | "form", eventId?: string) => {
    return trackContact(method, eventId);
  }, []);

  const customEvent = useCallback((customEventName: string, params?: Record<string, any>, eventId?: string) => {
    return trackCustomEvent(customEventName, params, eventId);
  }, []);

  return {
    pageView,
    viewContent,
    search,
    addToCart,
    initiateCheckout,
    addPaymentInfo,
    purchase,
    lead,
    completeRegistration,
    addToWishlist,
    contact,
    customEvent,
  };
}
