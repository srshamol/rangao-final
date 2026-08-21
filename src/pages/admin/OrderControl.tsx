import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, Phone, Globe, Trash2, Plus, Save, Loader2, Search, Clock } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { isValidBDPhone, normalizeBDPhone } from "@/lib/phoneValidation";

export default function OrderControl() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch order control settings
  const { data: settings } = useQuery({
    queryKey: ["order-control-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "order_control")
        .single();
      return (data?.value as any) || {
        max_orders_per_period: 1,
        cooldown_hours: 24,
        block_message: "আপনি ইতিমধ্যে একটি অর্ডার করেছেন। ২৪ ঘন্টা পর আবার অর্ডার করতে পারবেন।",
        enabled: true,
      };
    },
  });

  const [controlForm, setControlForm] = useState<any>(null);
  const activeSettings = controlForm || settings;
  const [unblockTarget, setUnblockTarget] = useState<any>(null);

  // Fetch blocked entities
  const { data: blockedEntities, isLoading: loadingBlocked } = useQuery({
    queryKey: ["blocked-entities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blocked_entities")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch recent orders with phone/IP visibility
  const { data: recentOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["order-control-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, ip_address, created_at, order_status")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      const { error } = await supabase
        .from("store_settings" as any)
        .upsert({
          key: "order_control",
          value: newSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-control-settings"] });
      toast({ title: "সফল", description: "অর্ডার কন্ট্রোল সেটিংস আপডেট হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  // Block entity mutation
  const [blockType, setBlockType] = useState<"ip" | "phone">("phone");
  const [blockValue, setBlockValue] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const blockMutation = useMutation({
    mutationFn: async () => {
      let finalVal = blockValue.trim();
      if (!finalVal) throw new Error("মান দিন");
      if (blockType === "phone") {
        if (!isValidBDPhone(finalVal)) {
          throw new Error("সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 01XXXXXXXXX, 8801XXXXXXXXX বা +8801XXXXXXXXX)");
        }
        finalVal = normalizeBDPhone(finalVal);
      }
      const { error } = await supabase
        .from("blocked_entities")
        .insert({ type: blockType, value: finalVal, reason: blockReason || null } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked-entities"] });
      setBlockValue("");
      setBlockReason("");
      toast({ title: "সফল", description: "ব্লক করা হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_entities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked-entities"] });
      toast({ title: "সফল", description: "আনব্লক করা হয়েছে" });
    },
  });

  const [searchBlock, setSearchBlock] = useState("");
  const filteredBlocked = blockedEntities?.filter(
    (b: any) => b.value.includes(searchBlock) || b.reason?.includes(searchBlock)
  );

  const blockedPhones = blockedEntities?.filter((b: any) => b.type === "phone") || [];
  const blockedIPs = blockedEntities?.filter((b: any) => b.type === "ip") || [];

  const filteredRecentOrders = recentOrders?.filter((o: any) => {
    const q = searchBlock.trim();
    if (!q) return true;
    return (
      o.order_number?.includes(q) ||
      o.customer_name?.includes(q) ||
      o.customer_phone?.includes(q) ||
      o.ip_address?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🛡️ অর্ডার কন্ট্রোল</h1>
        <p className="text-sm text-muted-foreground">অর্ডার রেট লিমিটিং, আইপি/ফোন ব্লকিং ম্যানেজমেন্ট</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">স্ট্যাটাস</p>
              <p className="text-sm font-bold">{activeSettings?.enabled ? "🟢 সক্রিয়" : "🔴 নিষ্ক্রিয়"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">কুলডাউন</p>
              <p className="text-sm font-bold">{activeSettings?.cooldown_hours || 24} ঘন্টা</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">ব্লকড ফোন</p>
              <p className="text-sm font-bold">{blockedPhones.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">ব্লকড আইপি</p>
              <p className="text-sm font-bold">{blockedIPs.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">⚙️ রেট লিমিট সেটিংস</TabsTrigger>
          <TabsTrigger value="blocked">🚫 ব্লকড লিস্ট ({blockedEntities?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Rate Limit Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">অর্ডার রেট লিমিটিং</CardTitle>
              <CardDescription>কতবার ও কত সময় পর পর অর্ডার করতে পারবে সেটি নিয়ন্ত্রণ করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">রেট লিমিটিং সক্রিয় করুন</p>
                  <p className="text-sm text-muted-foreground">চালু করলে কাস্টমার নির্দিষ্ট সময়ের মধ্যে একাধিক অর্ডার করতে পারবে না</p>
                </div>
                <Switch
                  checked={activeSettings?.enabled ?? true}
                  onCheckedChange={(v) => setControlForm({ ...activeSettings, enabled: v })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">সর্বোচ্চ অর্ডার সংখ্যা (প্রতি পিরিয়ড)</label>
                  <Input
                    type="number"
                    min={1}
                    value={activeSettings?.max_orders_per_period ?? 1}
                    onChange={(e) => setControlForm({ ...activeSettings, max_orders_per_period: Number(e.target.value) })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">একজন কাস্টমার নির্দিষ্ট সময়ে কয়টি অর্ডার করতে পারবে</p>
                </div>
                <div>
                  <label className="text-sm font-medium">কুলডাউন সময় (ঘন্টা)</label>
                  <Input
                    type="number"
                    min={1}
                    value={activeSettings?.cooldown_hours ?? 24}
                    onChange={(e) => setControlForm({ ...activeSettings, cooldown_hours: Number(e.target.value) })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">অর্ডার করার পরে কত ঘন্টা অপেক্ষা করতে হবে</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">ব্লক মেসেজ</label>
                <Textarea
                  value={activeSettings?.block_message ?? ""}
                  onChange={(e) => setControlForm({ ...activeSettings, block_message: e.target.value })}
                  rows={3}
                  className="mt-1"
                  placeholder="কাস্টমার ব্লক হলে এই মেসেজ দেখবে..."
                />
              </div>

              <Button
                onClick={() => saveSettingsMutation.mutate(controlForm || activeSettings)}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                সেটিংস সেভ করুন
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked List */}
        <TabsContent value="blocked">
          <div className="space-y-4">
            {/* Add Block Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">নতুন ব্লক যোগ করুন</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={blockType} onValueChange={(v: any) => setBlockType(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">📱 ফোন নম্বর</SelectItem>
                      <SelectItem value="ip">🌐 আইপি অ্যাড্রেস</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={blockValue}
                    onChange={(e) => setBlockValue(e.target.value)}
                    placeholder={blockType === "phone" ? "01XXXXXXXXX" : "xxx.xxx.xxx.xxx"}
                    className="flex-1"
                  />
                  <Input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="কারণ (ঐচ্ছিক)"
                    className="flex-1"
                  />
                  <Button onClick={() => blockMutation.mutate()} disabled={blockMutation.isPending || !blockValue.trim()}>
                    <Ban className="mr-1 h-4 w-4" /> ব্লক করুন
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Blocked List Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="সার্চ করুন..."
                      value={searchBlock}
                      onChange={(e) => setSearchBlock(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBlocked ? (
                  <p className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>টাইপ</TableHead>
                        <TableHead>মান</TableHead>
                        <TableHead>কারণ</TableHead>
                        <TableHead>ব্লক তারিখ</TableHead>
                        <TableHead className="w-20">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBlocked?.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <Badge variant={b.type === "ip" ? "destructive" : "secondary"}>
                              {b.type === "ip" ? "🌐 আইপি" : "📱 ফোন"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{b.value}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{b.reason || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(b.created_at).toLocaleDateString("bn-BD")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setUnblockTarget(b)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!filteredBlocked || filteredBlocked.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            কোনো ব্লকড এন্ট্রি নেই
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
             </Card>

            {/* Recent Orders View */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">সাম্প্রতিক অর্ডার (ফোন + IP)</CardTitle>
                <CardDescription>
                  IP ব্লক কাজ করতে অর্ডারে IP থাকা জরুরি। এখানে সরাসরি অর্ডারের ফোন/IP দেখে ব্লক করতে পারবেন।
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <p className="text-center py-8 text-muted-foreground">অর্ডার লোড হচ্ছে...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>অর্ডার</TableHead>
                        <TableHead>কাস্টমার</TableHead>
                        <TableHead>ফোন</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>তারিখ</TableHead>
                        <TableHead className="w-36">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecentOrders?.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{order.customer_name || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{order.customer_phone || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{order.ip_address || "IP পাওয়া যায়নি"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("bn-BD")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {order.customer_phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setBlockType("phone");
                                    setBlockValue(order.customer_phone);
                                  }}
                                >
                                  ফোন
                                </Button>
                              )}
                              {order.ip_address && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setBlockType("ip");
                                    setBlockValue(order.ip_address);
                                  }}
                                >
                                  IP
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!filteredRecentOrders || filteredRecentOrders.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            কোনো অর্ডার পাওয়া যায়নি
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Unblock Confirmation Dialog */}
      <AlertDialog open={!!unblockTarget} onOpenChange={(v) => !v && setUnblockTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">আনব্লক নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে এই {unblockTarget?.type === "ip" ? "আইপি" : "ফোন নম্বর"} <strong>"{unblockTarget?.value}"</strong> আনব্লক করতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={() => {
              if (unblockTarget) {
                unblockMutation.mutate(unblockTarget.id);
                setUnblockTarget(null);
              }
            }}>
              আনব্লক করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
