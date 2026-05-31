import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, ShieldAlert, CheckCircle, Database, 
  Activity, RefreshCcw, Loader2, Sparkles 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mediaService } from "@/lib/mediaService";

interface BucketDiagnostic {
  name: string;
  exists: boolean;
  public: boolean;
  fileCount: number;
}

export default function StorageDiagnostics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [buckets, setBuckets] = useState<BucketDiagnostic[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setChecking(true);
    const logs: string[] = [];
    try {
      // 1. Verify Connection to Supabase REST / Anon APIs
      const { data: testData, error: testError } = await supabase
        .from("store_settings" as any)
        .select("key")
        .limit(1);

      if (testError) {
        setApiOnline(false);
        logs.push(`[ERROR] Supabase API connection failed: ${testError.message}`);
      } else {
        setApiOnline(true);
        logs.push("[INFO] Supabase Client API connection established.");
      }

      // 2. Fetch Storage Buckets
      const { data: storageBuckets, error: storageError } = await supabase.storage.listBuckets();
      if (storageError) {
        logs.push(`[ERROR] Failed to fetch storage buckets: ${storageError.message}`);
      } else {
        logs.push(`[INFO] Found ${storageBuckets?.length || 0} active storage buckets.`);
        
        const required = ["images", "videos", "documents", "uploads"];
        const diagnosticResults: BucketDiagnostic[] = [];

        for (const req of required) {
          const matched = storageBuckets?.find(b => b.id === req);
          let fileCount = 0;

          if (matched) {
            // Count files in bucket
            const { data: files } = await supabase.storage.from(req).list("", { limit: 100 });
            fileCount = files?.length || 0;
          }

          diagnosticResults.push({
            name: req,
            exists: !!matched,
            public: matched?.public || false,
            fileCount
          });

          if (!matched) {
            logs.push(`[WARNING] Required bucket '${req}' is missing.`);
          } else {
            logs.push(`[INFO] Bucket '${req}' is online with public=${matched.public}. Contains ${fileCount} files.`);
          }
        }
        setBuckets(diagnosticResults);
      }
    } catch (err: any) {
      logs.push(`[FATAL] Storage diagnosis failed: ${err.message}`);
    } finally {
      setErrorLogs(logs);
      setChecking(false);
      setLoading(false);
    }
  };

  const handleFixBuckets = async () => {
    setChecking(true);
    try {
      const results = await mediaService.ensureBuckets();
      if (results.success) {
        toast({ title: "✅ স্টোরেজ সফলভাবে মেরামত করা হয়েছে", description: "সমস্ত মিসিং কুরিয়ার এবং স্টোরেজ বাকেট তৈরি করা হয়েছে।" });
      } else {
        toast({ 
          title: "❌ মেরামত অসম্পূর্ণ", 
          description: `কিছু বাকেট তৈরি করা যায়নি: ${results.errors.join(", ")}`, 
          variant: "destructive" 
        });
      }
      runDiagnostics();
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🩺 স্টোরেজ ও মিডিয়া ডায়াগনস্টিকস</h1>
          <p className="text-sm text-muted-foreground">Supabase Storage বাকেট কানেক্টিভিটি, পারমিশন হেলথ এবং পাবলিক এক্সেস ডিবাগ করুন।</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={runDiagnostics} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} রি-টেস্ট
          </Button>
          <Button size="sm" className="rounded-xl gap-1 bg-accent text-accent-foreground" onClick={handleFixBuckets} disabled={checking}>
            <Sparkles className="h-4 w-4" /> অটো-মেরামত
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* API connection status card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Activity className="h-4 w-4 text-primary" /> API কানেক্টিভিটি</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${apiOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className="font-bold text-base">{apiOnline ? "Online 🟢" : "Offline 🔴"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Supabase REST এবং Auth Endpoint সিঙ্ক করা আছে।</p>
          </CardContent>
        </Card>

        {/* Global storage type */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><Server className="h-4 w-4 text-primary" /> স্টোরেজ প্রোভাইডার ক্রেডেনশিয়ালস</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground block">Active Provider</span>
              <span className="font-semibold text-xs text-primary">Supabase JS Storage Client</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Authentication Mode</span>
              <span className="font-semibold text-xs text-primary">User Authenticated Session</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buckets Diagnostics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5 text-primary"><Database className="h-4.5 w-4.5 text-accent" /> বাকেট হেলথ ও মেম্বারশিপ</CardTitle>
          <CardDescription>অ্যাপ্লিকেশনের মিডিয়া আপলোডের জন্য নিচের ৪টি পাবলিক বাকেট সচল থাকা আবশ্যক।</CardDescription>
        </CardHeader>
        <CardContent className="p-0 border-t">
          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="divide-y text-xs">
              {buckets.map(b => (
                <div key={b.name} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${
                      b.exists ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                    }`}>
                      {b.name.substring(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-bold text-foreground capitalize">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">ফাইল সংখ্যা: {b.fileCount}টি</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={b.exists ? "default" : "destructive"} className="rounded-lg text-[9px] py-0.5">
                      {b.exists ? "সক্রিয় 🟢" : "মিসিং 🔴"}
                    </Badge>
                    <Badge variant={b.public ? "outline" : "secondary"} className="rounded-lg text-[9px] py-0.5">
                      {b.public ? "পাবলিক CDN" : "প্রাইভেট"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostics Logs Terminal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-primary" /> স্টোরেজ ডায়াগনস্টিকস ও ডিবাগ লগস</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-black rounded-2xl text-green-400 font-mono text-[10px] space-y-1.5 leading-relaxed min-h-36 max-h-56 overflow-y-auto">
            {errorLogs.map((log, idx) => {
              const isError = log.includes("[ERROR]") || log.includes("[FATAL]");
              const isWarning = log.includes("[WARNING]");
              return (
                <div key={idx} className={isError ? "text-red-400" : isWarning ? "text-yellow-300" : "text-green-400"}>
                  {log}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
