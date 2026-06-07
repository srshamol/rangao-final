import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Trash2, Loader2, Shield, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function StaffManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === "bdinfosky@gmail.com";
  
  const [selectedUserForRole, setSelectedUserForRole] = useState("");
  const [selectedRole, setSelectedRole] = useState("manager");
  const [removeTarget, setRemoveTarget] = useState<any>(null);
  const qc = useQueryClient();

  // Fetch registered customer profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["customer-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_profiles" as any)
        .select("id, user_id, full_name, email, phone, created_at");
      return data || [];
    }
  });

  // Fetch all user roles to identify admins/managers
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role");
      return data || [];
    }
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: any }) => {
      if (!isSuperAdmin) {
        throw new Error("স্টাফ যুক্ত করার অনুমতি শুধুমাত্র সুপার অ্যাডমিনের রয়েছে।");
      }
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
      setSelectedUserForRole("");
      toast.success("রোল সফলভাবে অ্যাসাইন করা হয়েছে");
    },
    onError: (err: any) => {
      toast.error("রোল অ্যাসাইন ব্যর্থ হয়েছে: " + err.message);
    }
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role, email }: { userId: string; role: any; email: string }) => {
      if (!isSuperAdmin) {
        throw new Error("রোল পরিবর্তন করার অনুমতি শুধুমাত্র সুপার অ্যাডমিনের রয়েছে।");
      }
      if (email.toLowerCase() === "bdinfosky@gmail.com") {
        throw new Error("সুপার অ্যাডমিনের রোল পরিবর্তন করা সম্ভব নয়।");
      }
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("রোল সফলভাবে আপডেট করা হয়েছে");
    },
    onError: (err: any) => {
      toast.error("রোল আপডেট ব্যর্থ হয়েছে: " + err.message);
    }
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      if (!isSuperAdmin) {
        throw new Error("রোল অপসারণ করার অনুমতি শুধুমাত্র সুপার অ্যাডমিনের রয়েছে।");
      }
      if (email.toLowerCase() === "bdinfosky@gmail.com") {
        throw new Error("সুপার অ্যাডমিনের রোল অপসারণ করা সম্ভব নয়।");
      }
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("রোল সফলভাবে অপসারণ করা হয়েছে");
    },
    onError: (err: any) => {
      toast.error("রোল অপসারণ ব্যর্থ হয়েছে: " + err.message);
    }
  });

  const assignableUsers = useMemo(() => {
    if (!profiles || !userRoles) return [];
    const roleUserIds = new Set(userRoles.map((ur: any) => ur.user_id));
    return profiles.filter((p: any) => !roleUserIds.has(p.user_id) && p.email?.toLowerCase() !== "bdinfosky@gmail.com");
  }, [profiles, userRoles]);

  const staffMembers = useMemo(() => {
    if (!userRoles || !profiles) return [];
    return userRoles.map((ur: any) => {
      const p = profiles.find((prof: any) => prof.user_id === ur.user_id);
      return {
        user_id: ur.user_id,
        role: ur.role,
        name: p?.full_name || "অজানা স্টাফ",
        email: p?.email || "কোনো ইমেইল নেই",
        phone: p?.phone || "কোনো ফোন নেই",
      };
    });
  }, [userRoles, profiles]);

  if (profilesLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      <div className="flex flex-col gap-1.5 border-b pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> স্টাফ ও রোল ম্যানেজমেন্ট
        </h1>
        <p className="text-sm text-muted-foreground">স্টোর পরিচালনার কাজে নিয়োজিত ব্যক্তিদের রোল পরিবর্তন বা অপসারণ করুন।</p>
      </div>

      {!isSuperAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-semibold">
            স্টাফ অ্যাক্সেস কন্ট্রোল ও রোল পরিবর্তন করার ক্ষমতা শুধুমাত্র সুপার অ্যাডমিন (<span className="font-mono">bdinfosky@gmail.com</span>) এর রয়েছে।
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff List Table */}
        <Card className="lg:col-span-2 border-border/30">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> স্টাফ ও রোল তালিকা
            </CardTitle>
            <CardDescription>নিযুক্ত সকল স্টাফদের তালিকা ও তাদের বর্তমান অ্যাক্সেস রোল।</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম ও যোগাযোগ</TableHead>
                    <TableHead>রোল / পদবি</TableHead>
                    <TableHead className="w-48">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.map(member => {
                    const isSuperAdminUser = member.email.toLowerCase() === "bdinfosky@gmail.com";
                    return (
                      <TableRow key={member.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm flex items-center gap-1.5">
                              {member.name}
                              {isSuperAdminUser && (
                                <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full">Super Admin</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                            <p className="text-xs text-muted-foreground font-mono">{member.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSuperAdminUser ? (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md">SUPER ADMIN</span>
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(val) => updateRole.mutate({ userId: member.user_id, role: val, email: member.email })}
                              disabled={updateRole.isPending || !isSuperAdmin}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="sales">Sales</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="accountant">Accountant</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isSuperAdminUser && isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs gap-1 h-8"
                              onClick={() => setRemoveTarget(member)}
                              disabled={removeRole.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> অপসারণ করুন
                            </Button>
                          )}
                          {isSuperAdminUser && (
                            <span className="text-[11px] text-muted-foreground italic">অপরিবর্তনযোগ্য</span>
                          )}
                          {!isSuperAdmin && !isSuperAdminUser && (
                            <span className="text-[11px] text-muted-foreground italic">সীমাবদ্ধ অ্যাক্সেস</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {staffMembers.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">কোনো স্টাফ বা এডমিন পাওয়া যায়নি</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Assign Role Sidebar Card */}
        <Card className="border-border/30 h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> রোল অ্যাসাইন করুন
            </CardTitle>
            <CardDescription>যেকোনো রেজিস্টার্ড কাস্টমারকে এডমিন বা ম্যানেজার রোল প্রদান করুন।</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">ইউজার সিলেক্ট করুন</label>
              <Select value={selectedUserForRole} onValueChange={setSelectedUserForRole} disabled={!isSuperAdmin}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="কাস্টমার নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || "নামহীন"} ({user.email || user.phone})
                    </SelectItem>
                  ))}
                  {assignableUsers.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">কোনো কাস্টমার পাওয়া যায়নি</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">রোল নির্ধারণ করুন</label>
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={!isSuperAdmin}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (পূর্ণ নিয়ন্ত্রণ)</SelectItem>
                  <SelectItem value="manager">Manager (ম্যানেজার)</SelectItem>
                  <SelectItem value="editor">Editor (এডিটর)</SelectItem>
                  <SelectItem value="sales">Sales (বিক্রয়)</SelectItem>
                  <SelectItem value="marketing">Marketing (মার্কেটিং)</SelectItem>
                  <SelectItem value="accountant">Accountant (হিসাবরক্ষক)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => assignRole.mutate({ userId: selectedUserForRole, role: selectedRole })}
              disabled={!selectedUserForRole || assignRole.isPending || !isSuperAdmin}
              className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 mt-2"
            >
              {assignRole.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              রোল প্রদান করুন
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Remove Role Confirmation Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold">স্টাফ রোল অপসারণ নিশ্চিতকরণ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে <strong>"{removeTarget?.name}"</strong> এর স্টাফ রোল অপসারণ করতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">বাতিল</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl" onClick={() => {
              if (removeTarget) {
                removeRole.mutate({ userId: removeTarget.user_id, email: removeTarget.email });
                setRemoveTarget(null);
              }
            }}>
              অপসারণ করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
