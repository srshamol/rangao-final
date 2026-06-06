import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse, Ticket, Settings,
  LogOut, FolderTree, DollarSign, Users, ChevronDown, Clock, Truck,
  PackageCheck, AlertTriangle, Home, Shield, Star, Globe, BookOpen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const mainItems = [
  { title: "ড্যাশবোর্ড", url: "/admin", icon: LayoutDashboard },
];

const orderSubItems = [
  { title: "সব অর্ডার", url: "/admin/orders", icon: ShoppingCart },
  { title: "পেন্ডিং", url: "/admin/orders?status=pending", icon: Clock, badgeKey: "pending" },
  { title: "শিপড", url: "/admin/orders?status=shipped", icon: Truck },
  { title: "ডেলিভারড", url: "/admin/orders?status=delivered", icon: PackageCheck },
  { title: "ইনকমপ্লিট", url: "/admin/incomplete-orders", icon: AlertTriangle, badgeKey: "incomplete" },
];

const bottomItems = [
  { title: "প্রোডাক্ট", url: "/admin/products", icon: Package },
  { title: "ক্যাটাগরি", url: "/admin/categories", icon: FolderTree },
  { title: "ইনভেন্টরি", url: "/admin/inventory", icon: Warehouse },
  { title: "কুপন", url: "/admin/coupons", icon: Ticket },
  { title: "টেসটিমোনিয়াল", url: "/admin/testimonials", icon: Star },
  { title: "ব্লগ ও টিপস", url: "/admin/blog", icon: BookOpen },
  { title: "ব্র্যান্ডস", url: "/admin/brands", icon: Shield },
  { title: "ফাইন্যান্স", url: "/admin/finance", icon: DollarSign },
  { title: "কাস্টমার", url: "/admin/customers", icon: Users },
  { title: "মিডিয়া লাইব্রেরি", url: "/admin/media-library", icon: FolderTree },
  { title: "স্টোরেজ ডায়াগনস্টিকস", url: "/admin/settings/storage-diagnostics", icon: Shield },
  { title: "হোমপেজ", url: "/admin/homepage", icon: Home },
  { title: "হোমপেজ SEO", url: "/admin/homepage-seo", icon: Globe },
  { title: "অর্ডার কন্ট্রোল", url: "/admin/order-control", icon: Shield },
  { title: "সেটিংস", url: "/admin/settings", icon: Settings },
];

import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function AdminSidebar() {
  const { signOut, user } = useAuth();
  const [ordersOpen, setOrdersOpen] = useState(true);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data: settings } = useStoreSettings();

  const faviconUrl = settings?.storeInfo?.favicon_url;
  const businessName = settings?.storeInfo?.name ? settings.storeInfo.name.split(" - ")[0] : "Rangao";

  const { data: orderCounts = { pending: 0, incomplete: 0 } } = useQuery({
    queryKey: ["admin-sidebar-order-counts"],
    queryFn: async () => {
      const { count: pendingCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("order_status", "pending");

      const { count: incompleteCount } = await supabase
        .from("incomplete_orders" as any)
        .select("*", { count: "exact", head: true })
        .in("status", ["abandoned", "contacted"]);

      return {
        pending: pendingCount || 0,
        incomplete: incompleteCount || 0,
      };
    },
    refetchInterval: 30_000,
  });

  const linkClass = "rounded-xl px-3 py-2.5 text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const activeClass = "bg-sidebar-accent text-sidebar-accent-foreground font-semibold";

  const CollapsedTooltip = ({ children, label }: { children: React.ReactNode; label: string }) => {
    if (!collapsed) return <>{children}</>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Sidebar Brand Header */}
        <div className={collapsed ? "px-2 py-5 flex justify-center" : "px-5 pt-6 pb-6"}>
          <div className="flex items-center gap-2.5">
            {faviconUrl ? (
              <img 
                src={faviconUrl} 
                alt={businessName} 
                className="h-9 w-9 shrink-0 rounded-xl object-contain bg-background p-0.5 shadow-sm border border-border/40" 
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary shadow-gold">
                <span className="font-display text-base font-extrabold text-sidebar-primary-foreground">
                  {businessName[0]?.toUpperCase() || "R"}
                </span>
              </div>
            )}
            {!collapsed && (
              <span className="font-display text-base font-extrabold text-sidebar-foreground">
                {businessName}
              </span>
            )}
          </div>
        </div>
        <SidebarGroup className="pt-0">
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {/* Dashboard */}
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <CollapsedTooltip label={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={`${linkClass} ${collapsed ? "justify-center px-0" : ""}`} activeClassName={activeClass}>
                        <item.icon className={`h-4 w-4 shrink-0 ${collapsed ? "" : "mr-2.5"}`} />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </CollapsedTooltip>
                </SidebarMenuItem>
              ))}

              {/* Orders - collapsible when expanded, just icon when collapsed */}
              {collapsed ? (
                <SidebarMenuItem>
                  <CollapsedTooltip label="অর্ডার">
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/orders" className={`${linkClass} justify-center px-0`} activeClassName={activeClass}>
                        <ShoppingCart className="h-4 w-4 shrink-0" />
                      </NavLink>
                    </SidebarMenuButton>
                  </CollapsedTooltip>
                </SidebarMenuItem>
              ) : (
                <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <ShoppingCart className="mr-2.5 h-4 w-4" />
                        <span className="flex-1 text-left">অর্ডার</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${ordersOpen ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                        {orderSubItems.map((sub: any) => (
                          <SidebarMenuButton key={sub.title} asChild>
                            <NavLink to={sub.url} end className="rounded-lg px-2.5 py-2 text-sidebar-foreground/60 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                              <sub.icon className="mr-2 h-3.5 w-3.5" />
                              <span className="text-xs">{sub.title}</span>
                              {sub.badgeKey && orderCounts[sub.badgeKey as keyof typeof orderCounts] > 0 && (
                                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                                  {orderCounts[sub.badgeKey as keyof typeof orderCounts]}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Rest */}
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <CollapsedTooltip label={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === "/admin"} className={`${linkClass} ${collapsed ? "justify-center px-0" : ""}`} activeClassName={activeClass}>
                        <item.icon className={`h-4 w-4 shrink-0 ${collapsed ? "" : "mr-2.5"}`} />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </CollapsedTooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className={`border-t border-sidebar-border ${collapsed ? "p-2" : "p-4"}`}>
        {!collapsed && (
          <div className="rounded-xl bg-sidebar-accent/50 p-3 mb-2">
            <p className="text-[11px] font-medium text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        )}
        <CollapsedTooltip label="লগআউট">
          <Button variant="ghost" size="sm" className={`w-full rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent ${collapsed ? "justify-center px-0" : "justify-start"}`} onClick={signOut}>
            <LogOut className={`h-4 w-4 shrink-0 ${collapsed ? "" : "mr-2.5"}`} />
            {!collapsed && "লগআউট"}
          </Button>
        </CollapsedTooltip>
      </SidebarFooter>
    </Sidebar>
  );
}
