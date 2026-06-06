import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Phone, MessageCircle, Activity, Monitor, Clock, UserCheck, LogIn, Trash2, Ban, Unlock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  activity_type: string;
  user_agent: string | null;
  created_at: string;
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDevice, setFilterDevice] = useState("all");
  const qc = useQueryClient();

  // Fetch all orders to build customer metrics
  const { data: orders } = useQuery({
    queryKey: ["all-orders-for-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("user_id, customer_name, customer_phone, customer_email, total_amount, created_at");
      return data || [];
    },
  });

  // Fetch registered customer profiles
  const { data: profiles } = useQuery({
    queryKey: ["customer-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_profiles" as any)
        .select("id, user_id, full_name, email, phone, created_at");
      return data || [];
    }
  });

  // Fetch all user roles to identify admins/managers
  const { data: userRoles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role");
      return data || [];
    }
  });

  const adminUserIds = useMemo(() => {
    if (!userRoles) return new Set<string>();
    const adminRoles = ["admin", "manager"];
    return new Set<string>(
      userRoles
        .filter((ur: any) => adminRoles.includes(ur.role))
        .map((ur: any) => ur.user_id)
    );
  }, [userRoles]);

  const nonAdminProfiles = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((p: any) => !adminUserIds.has(p.user_id));
  }, [profiles, adminUserIds]);

  // Fetch customer activities (registration and login logs)
  const { data: activities } = useQuery({
    queryKey: ["customer-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_activities" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as ActivityLog[];
    }
  });

  // Fetch blocked entities
  const { data: blockedList } = useQuery({
    queryKey: ["blocked-entities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blocked_entities")
        .select("*");
      return data || [];
    }
  });

  // Check if a phone number is blocked
  const isBlocked = (phone: string) => {
    if (!phone) return false;
    return blockedList?.some((b: any) => b.type === "phone" && b.value === phone);
  };

  // Block or unblock a customer phone number
  const toggleBlock = useMutation({
    mutationFn: async ({ phone, block }: { phone: string; block: boolean }) => {
      if (block) {
        const { error } = await supabase
          .from("blocked_entities")
          .insert({
            type: "phone",
            value: phone,
            reason: "Blocked by Admin"
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blocked_entities")
          .delete()
          .eq("type", "phone")
          .eq("value", phone);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["blocked-entities"] });
      toast.success(variables.block ? "কাস্টমার ব্লক করা হয়েছে" : "কাস্টমার আনব্লক করা হয়েছে");
    },
    onError: (err: any) => {
      toast.error("কার্যক্রম ব্যর্থ হয়েছে: " + err.message);
    }
  });

  // Delete a customer profile
  const deleteCustomer = useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      if (!confirm(`আপনি কি নিশ্চিতভাবে "${name}" এর অ্যাকাউন্টটি চিরতরে ডিলিট করতে চান? এর ফলে তার লগইন অ্যাকাউন্ট এবং প্রোফাইল সম্পূর্ণ মুছে যাবে।`)) return;
      
      const { error } = await supabase
        .rpc("delete_user_by_admin", { target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-profiles"] });
      qc.invalidateQueries({ queryKey: ["all-orders-for-customers"] });
      toast.success("কাস্টমার অ্যাকাউন্ট সফলভাবে ডিলিট করা হয়েছে");
    },
    onError: (err: any) => {
      toast.error("ডিলিট ব্যর্থ হয়েছে: " + err.message);
    }
  });

  // Delete a specific activity log
  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from("customer_activities" as any)
        .delete()
        .eq("id", activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-activities"] });
      toast.success("অ্যাক্টিভিটি লগ মুছে ফেলা হয়েছে");
    },
    onError: (err: any) => {
      toast.error("মুছে ফেলতে সমস্যা হয়েছে: " + err.message);
    }
  });

  // Clear all activity logs
  const clearAllActivities = useMutation({
    mutationFn: async () => {
      if (!confirm("আপনি কি নিশ্চিতভাবে সব অ্যাক্টিভিটি লগ মুছে ফেলতে চান?")) return;
      const { error } = await supabase
        .from("customer_activities" as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all rows
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-activities"] });
      toast.success("সব অ্যাক্টিভিটি লগ সফলভাবে মুছে ফেলা হয়েছে");
    },
    onError: (err: any) => {
      toast.error("মুছে ফেলতে সমস্যা হয়েছে: " + err.message);
    }
  });

  const getCustomerName = (userId: string | null, email: string | null, phone: string | null) => {
    if (userId && profiles) {
      const prof = profiles.find((p: any) => p.user_id === userId);
      if (prof?.full_name) return prof.full_name;
    }
    if (phone) {
      const orderMatch = orders?.find((o: any) => o.customer_phone === phone);
      if (orderMatch?.customer_name) return orderMatch.customer_name;
    }
    return email || phone || "অজানা কাস্টমার";
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return "Unknown Device";
    if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
      return "মোবাইল ডিভাইস";
    }
    return "ডেস্কটপ / ল্যাপটপ";
  };

  // Build the list of registered customers supplemented by order statistics
  const customers = useMemo<Customer[]>(() => {
    if (!nonAdminProfiles) return [];
    
    // Map of user_id -> statistics
    const statsMap: Record<string, { totalOrders: number; totalSpent: number; lastOrder: string | null }> = {};
    
    orders?.forEach((o: any) => {
      let key = o.user_id;
      // Fallback matching by phone/email if user_id is null (for guest orders matching registered profiles)
      if (!key && o.customer_phone) {
        const matchingProfile = nonAdminProfiles.find((p: any) => p.phone === o.customer_phone || p.email === o.customer_email);
        if (matchingProfile) {
          key = matchingProfile.user_id;
        }
      }
      
      if (key) {
        if (!statsMap[key]) {
          statsMap[key] = { totalOrders: 0, totalSpent: 0, lastOrder: null };
        }
        statsMap[key].totalOrders++;
        statsMap[key].totalSpent += Number(o.total_amount);
        if (!statsMap[key].lastOrder || new Date(o.created_at) > new Date(statsMap[key].lastOrder)) {
          statsMap[key].lastOrder = o.created_at;
        }
      }
    });

    return nonAdminProfiles.map((p: any) => {
      const stats = statsMap[p.user_id] || { totalOrders: 0, totalSpent: 0, lastOrder: null };
      return {
        id: p.id,
        user_id: p.user_id,
        name: p.full_name || "অজানা গ্রাহক",
        phone: p.phone || "",
        email: p.email || "",
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent,
        lastOrder: stats.lastOrder,
        created_at: p.created_at
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [nonAdminProfiles, orders]);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || "").toLowerCase().includes(q));
  }, [customers, search]);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    let list = activities;

    // Filter out activities belonging to admin/manager accounts
    list = list.filter(act => {
      if (act.user_id && adminUserIds.has(act.user_id)) return false;
      if (act.email && act.email.toLowerCase() === "bdinfosky@gmail.com") return false;
      
      if (act.email && userRoles) {
        const matchingRole = userRoles.find((ur: any) => {
          const matchingProfile = profiles?.find((p: any) => p.user_id === ur.user_id);
          return matchingProfile?.email === act.email && (ur.role === "admin" || ur.role === "manager");
        });
        if (matchingRole) return false;
      }
      return true;
    });

    if (filterType !== "all") {
      list = list.filter(act => act.activity_type === filterType);
    }

    if (filterDevice !== "all") {
      list = list.filter(act => {
        const parsed = parseUserAgent(act.user_agent);
        if (filterDevice === "mobile") return parsed === "মোবাইল ডিভাইস";
        if (filterDevice === "desktop") return parsed === "ডেস্কটপ / ল্যাপটপ";
        return true;
      });
    }

    if (activitySearch) {
      const q = activitySearch.toLowerCase();
      list = list.filter(act => {
        const name = getCustomerName(act.user_id, act.email, act.phone).toLowerCase();
        const email = (act.email || "").toLowerCase();
        const phone = act.phone || "";
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    return list;
  }, [activities, activitySearch, filterType, filterDevice, profiles, orders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> কাস্টমার ও অ্যাক্টিভিটি
        </h1>
      </div>

      <Tabs defaultValue="customers" className="w-full space-y-4">
        <TabsList className="bg-muted p-1 rounded-xl h-auto">
          <TabsTrigger value="customers" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap">
            <Users className="h-4 w-4" /> কাস্টমার তালিকা ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="activities" className="rounded-lg px-4 py-2 gap-1.5 flex items-center whitespace-nowrap">
            <Activity className="h-4 w-4" /> অ্যাক্টিভিটি লগ ({activities?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4 outline-none">
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="নাম, ইমেইল বা ফোন দিয়ে সার্চ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>কাস্টমার</TableHead>
                      <TableHead>ফোন</TableHead>
                      <TableHead>মোট অর্ডার</TableHead>
                      <TableHead>মোট খরচ</TableHead>
                      <TableHead>শেষ অর্ডার</TableHead>
                      <TableHead>অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id} className={isBlocked(c.phone) ? "bg-red-500/5 hover:bg-red-500/10" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium flex items-center gap-1.5">
                                {c.name}
                                {isBlocked(c.phone) && (
                                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded-md dark:bg-red-900/30 dark:text-red-400">Blocked</span>
                                )}
                              </p>
                              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{c.phone || "—"}</TableCell>
                        <TableCell className="text-center font-semibold">{c.totalOrders}</TableCell>
                        <TableCell className="font-semibold">৳{c.totalSpent.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.lastOrder ? format(new Date(c.lastOrder), "dd/MM/yyyy") : "কোনো অর্ডার নেই"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {c.phone && (
                              <a href={`tel:${c.phone}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" title="কল করুন"><Phone className="h-4 w-4" /></Button>
                              </a>
                            )}
                            {c.phone && (
                              <a href={`https://wa.me/88${c.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:bg-green-50" title="হোয়াটসঅ্যাপ"><MessageCircle className="h-4 w-4" /></Button>
                              </a>
                            )}
                            
                            {c.phone && isBlocked(c.phone) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                title="আনব্লক করুন"
                                onClick={() => toggleBlock.mutate({ phone: c.phone, block: false })}
                                disabled={toggleBlock.isPending}
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}

                            {c.phone && !isBlocked(c.phone) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                title="ব্লক করুন"
                                onClick={() => toggleBlock.mutate({ phone: c.phone, block: true })}
                                disabled={toggleBlock.isPending}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                              title="প্রোফাইল মুছুন"
                              onClick={() => deleteCustomer.mutate({ userId: c.user_id, name: c.name })}
                              disabled={deleteCustomer.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো কাস্টমার নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4 outline-none">
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> কাস্টমার অ্যাক্টিভিটি হিস্ট্রি
                  </CardTitle>
                  <CardDescription>রেজিস্ট্রেশন এবং সফল লগইন কার্যক্রমের তালিকা</CardDescription>
                </div>
                {activities && activities.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-xl flex items-center gap-1.5"
                    onClick={() => clearAllActivities.mutate()}
                  >
                    <Trash2 className="h-4 w-4" /> সব মুছুন
                  </Button>
                )}
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="কাস্টমার নাম, ইমেইল বা ফোন দিয়ে সার্চ..." value={activitySearch} onChange={e => setActivitySearch(e.target.value)} className="pl-9 rounded-xl" />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {/* Activity Type Filter */}
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px] rounded-xl">
                      <SelectValue placeholder="সব অ্যাক্টিভিটি" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সব অ্যাক্টিভিটি</SelectItem>
                      <SelectItem value="login">লগইন</SelectItem>
                      <SelectItem value="registration">রেজিস্ট্রেশন</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Device Filter */}
                  <Select value={filterDevice} onValueChange={setFilterDevice}>
                    <SelectTrigger className="w-[140px] rounded-xl">
                      <SelectValue placeholder="সব ডিভাইস" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">সব ডিভাইস</SelectItem>
                      <SelectItem value="desktop">ডেস্কটপ</SelectItem>
                      <SelectItem value="mobile">মোবাইল</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>কাস্টমার</TableHead>
                      <TableHead>অ্যাক্টিভিটি টাইপ</TableHead>
                      <TableHead>ডিভাইস</TableHead>
                      <TableHead>সময় ও তারিখ</TableHead>
                      <TableHead className="w-20">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map(act => (
                      <TableRow key={act.id} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-semibold text-sm">{getCustomerName(act.user_id, act.email, act.phone)}</p>
                          <div className="flex flex-col text-xs text-muted-foreground mt-0.5 space-y-0.5">
                            {act.email && <span>{act.email}</span>}
                            {act.phone && <span>{act.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {act.activity_type === "registration" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                              <UserCheck className="h-3 w-3" /> রেজিস্ট্রেশন
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                              <LogIn className="h-3 w-3" /> লগইন
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Monitor className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[180px]">{parseUserAgent(act.user_agent)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{format(new Date(act.created_at), "dd/MM/yyyy hh:mm a")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            onClick={() => deleteActivity.mutate(act.id)}
                            disabled={deleteActivity.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredActivities.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোনো অ্যাক্টিভিটি রেকর্ড পাওয়া যায়নি</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
