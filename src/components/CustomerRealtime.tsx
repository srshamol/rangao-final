/**
 * CustomerRealtime — Global Supabase Realtime subscriber for the storefront.
 *
 * Mounts the useCustomerRealtime hook once at the app level so that ALL
 * customer-facing pages (Index, Products, ProductDetail, Orders, OrderDetail,
 * customer Dashboard, etc.) receive live data updates without page reload.
 *
 * Rendered in App.tsx alongside <SettingsSync /> and <StorageInitializer />.
 */
import { useCustomerRealtime } from "@/hooks/useCustomerRealtime";
import { useCustomer } from "@/context/CustomerContext";

export default function CustomerRealtime() {
  const { user } = useCustomer();
  // Pass the authenticated user's ID so the order subscription is filtered
  // to only this customer's rows (more efficient, less noise).
  useCustomerRealtime(user?.id);
  return null;
}
