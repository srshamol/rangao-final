import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import SEO from "@/components/SEO";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

export default function AdminLayout() {
  // ✅ Central Supabase Realtime subscription — invalidates React Query cache
  // on any DB change (orders, products, incomplete_orders, etc.)
  // All child admin pages share the same QueryClient → they all get live data.
  useAdminRealtime();

  return (
    <SidebarProvider>
      <SEO title="অ্যাডমিন প্যানেল" description="রাঙাও অ্যাডমিন প্যানেল" noIndex={true} />
      <div className="min-h-screen flex w-full bg-secondary/50 overflow-x-hidden">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          <header className="h-14 md:h-16 flex items-center border-b border-border/40 px-3 md:px-6 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
            <SidebarTrigger />
            <div className="ml-3 md:ml-4 flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse-glow shrink-0" />
              <span className="font-display text-sm font-semibold text-foreground truncate">অ্যাডমিন প্যানেল</span>
            </div>
          </header>
          <div className="p-3.5 sm:p-5 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

