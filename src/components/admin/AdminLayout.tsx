import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/50">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <header className="h-16 flex items-center border-b border-border/40 px-6 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
            <SidebarTrigger />
            <div className="ml-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
              <span className="font-display text-sm font-semibold text-foreground">অ্যাডমিন প্যানেল</span>
            </div>
          </header>
          <div className="p-5 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
