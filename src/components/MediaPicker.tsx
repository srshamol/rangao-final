import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  UploadCloud, FileImage, FileVideo, FileText, Search, Loader2, 
  CheckCircle2, Globe, Sparkles, Folder, Eye, Trash2, Copy, Trash 
} from "lucide-react";
import { mediaService, MediaItem } from "@/lib/mediaService";
import BrokenImageGuard from "./BrokenImageGuard";

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, item?: MediaItem) => void;
  type?: "images" | "videos" | "documents" | "uploads";
}

export default function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  type = "images"
}: MediaPickerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");

  // Upload state
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // External URL state
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [externalName, setExternalName] = useState<string>("");
  const [registering, setRegistering] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadLibrary();
    }
  }, [isOpen]);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const all = await mediaService.fetchItems();
      // Filter by type if requested
      const filtered = all.filter(item => {
        if (type === "images") return item.mime_type.startsWith("image/");
        if (type === "videos") return item.mime_type.startsWith("video/");
        if (type === "documents") return !item.mime_type.startsWith("image/") && !item.mime_type.startsWith("video/");
        return true;
      });
      setItems(filtered);
    } catch (e: any) {
      toast({ title: "❌ লোড ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const file = files[0];
      const uploadedItem = await mediaService.upload(file, type);
      toast({ title: "✅ আপলোড সফল হয়েছে", description: `${file.name} মিডিয়া লাইব্রেরিতে যোগ হয়েছে।` });
      
      // Select the uploaded item automatically
      onSelect(uploadedItem.url, uploadedItem);
      loadLibrary();
      onClose();
    } catch (e: any) {
      toast({ title: "❌ আপলোড ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRegisterExternal = async () => {
    if (!externalUrl.trim()) {
      toast({ title: "ভুল ইনপুট", description: "প্রোফাইল বা মিডিয়া URL দিন", variant: "destructive" });
      return;
    }
    setRegistering(true);
    try {
      const item = await mediaService.registerExternalUrl(externalUrl, externalName);
      toast({ title: "✅ URL যুক্ত হয়েছে", description: "মিডিয়া লাইব্রেরিতে লিঙ্ক যুক্ত হয়েছে।" });
      onSelect(item.url, item);
      loadLibrary();
      onClose();
    } catch (e: any) {
      toast({ title: "❌ লিঙ্ক ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteItem = async (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("আপনি কি নিশ্চিতভাবে এই ফাইলটি মুছে ফেলতে চান?")) return;
    try {
      await mediaService.delete(item);
      toast({ title: "🗑️ ফাইল মুছে ফেলা হয়েছে" });
      loadLibrary();
      if (selectedId === item.id) setSelectedId("");
    } catch (err: any) {
      toast({ title: "মুছতে ব্যর্থ", description: err.message, variant: "destructive" });
    }
  };

  const handleSelectId = (item: MediaItem) => {
    setSelectedId(item.id);
    onSelect(item.url, item);
    onClose();
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-4xl border shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in-50 zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-primary">📂 মিডিয়া লাইব্রেরি ও ফাইল পিক্যার</h2>
            <p className="text-xs text-muted-foreground">ডিভাইস থেকে ফাইল আপলোড করুন, লাইব্রেরি থেকে সিলেক্ট করুন বা লিঙ্ক যোগ করুন।</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 rounded-full" onClick={onClose}>✕</Button>
        </div>

        {/* Picker Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-2 border-b bg-muted/40 shrink-0">
            <TabsList className="bg-muted p-1 gap-1">
              <TabsTrigger value="library" className="text-xs rounded-lg px-4 py-1.5">🗂️ মিডিয়া লাইব্রেরি</TabsTrigger>
              <TabsTrigger value="upload" className="text-xs rounded-lg px-4 py-1.5">📤 ফাইল আপলোড</TabsTrigger>
              <TabsTrigger value="url" className="text-xs rounded-lg px-4 py-1.5">🔗 এক্সটার্নাল URL</TabsTrigger>
              <TabsTrigger value="recent" className="text-xs rounded-lg px-4 py-1.5">⏱️ রিসেন্ট ফাইলস</TabsTrigger>
            </TabsList>
          </div>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 outline-none p-0 m-0">
            <div className="p-4 border-b flex gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="ফাইল নাম দিয়ে সার্চ করুন..." 
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
              <Button size="sm" variant="outline" className="rounded-xl shrink-0" onClick={loadLibrary}>
                🔄 রিফ্রেশ
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">মিডিয়া ফাইল লোড হচ্ছে...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                  <p className="font-semibold text-sm">কোনো ফাইল পাওয়া যায়নি</p>
                  <p className="text-xs text-muted-foreground max-w-xs">এই ক্যাটাগরিতে কোনো ফাইল আপলোড করা নেই। আপলোড করুন ট্যাবে ক্লিক করে যুক্ত করতে পারেন।</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {filteredItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`relative group rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                        selectedId === item.id ? "border-primary ring-2 ring-primary/20" : "border-border"
                      }`}
                      onClick={() => handleSelectId(item)}
                    >
                      {item.mime_type.startsWith("image/") ? (
                        <div className="aspect-square w-full bg-white flex items-center justify-center overflow-hidden">
                          <BrokenImageGuard src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        </div>
                      ) : item.mime_type.startsWith("video/") ? (
                        <div className="aspect-square w-full bg-slate-950 flex flex-col items-center justify-center relative">
                          <FileVideo className="h-10 w-10 text-slate-400" />
                          <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white font-mono">VIDEO</span>
                        </div>
                      ) : (
                        <div className="aspect-square w-full bg-secondary/30 flex flex-col items-center justify-center relative">
                          <FileText className="h-10 w-10 text-muted-foreground" />
                          <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white font-mono">DOC</span>
                        </div>
                      )}
                      
                      <div className="p-2 border-t bg-card text-[10px] truncate shrink-0 font-medium">
                        {item.name}
                      </div>

                      {/* Quick Actions Hover overlay */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-6 w-6 rounded-md bg-destructive/90 hover:bg-destructive" 
                          onClick={(e) => handleDeleteItem(item, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 flex flex-col justify-center p-6 outline-none">
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                className="hidden" 
                onChange={(e) => e.target.files && handleUpload(e.target.files)} 
              />
              
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="font-semibold text-sm">সার্ভারে আপলোড হচ্ছে...</p>
                  <p className="text-xs text-muted-foreground">ফাইল কম্প্রেস ও CDN সিঙ্ক করা হচ্ছে</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-base">আপনার ড্রাইভ থেকে ফাইল ড্র্যাগ করে এখানে ছাড়ুন</p>
                    <p className="text-xs text-muted-foreground mt-1">অথবা লোকাল ফাইল ব্রাউজ করতে এখানে ক্লিক করুন</p>
                  </div>
                  <div className="pt-2 text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border">
                    {type === "images" ? "JPG, PNG, WEBP, SVG | সর্বোচ্চ ৫MB" : type === "videos" ? "MP4, WEBM | সর্বোচ্চ ৫০MB" : "সর্বোচ্চ ২০MB"}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* External URL Tab */}
          <TabsContent value="url" className="flex-1 p-6 outline-none space-y-4">
            <div className="p-4 rounded-xl border bg-secondary/10 space-y-4 max-w-xl mx-auto">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5"><Globe className="h-4 w-4" /> এক্সটার্নাল URL রিসোর্স লিংক</h3>
              
              <div className="space-y-2">
                <Label className="text-xs">মিডিয়া URL লিংক (JPG / WEBP / MP4)</Label>
                <Input 
                  value={externalUrl} 
                  onChange={e => setExternalUrl(e.target.value)} 
                  placeholder="https://cdn.example.com/assets/banner.webp" 
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">সম্পদ নাম (ফাইল নাম)</Label>
                <Input 
                  value={externalName} 
                  onChange={e => setExternalName(e.target.value)} 
                  placeholder="যেমন: প্রমোশনাল ব্যানার" 
                  className="rounded-xl text-xs"
                />
              </div>

              {externalUrl && (
                <div className="h-28 rounded-lg overflow-hidden border border-dashed flex items-center justify-center bg-white relative">
                  {!externalUrl.endsWith(".mp4") && !externalUrl.endsWith(".webm") ? (
                    <BrokenImageGuard src={externalUrl} className="max-h-24 max-w-full object-contain" />
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><FileVideo className="h-4 w-4" /> ভিডিও ফাইল প্রিভিউ সমর্থিত নয়</div>
                  )}
                </div>
              )}

              <Button 
                className="w-full gap-1.5 rounded-xl text-xs" 
                onClick={handleRegisterExternal}
                disabled={registering || !externalUrl}
              >
                {registering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "লিঙ্ক রেজিস্টার করুন"}
              </Button>
            </div>
          </TabsContent>

          {/* Recent Files Tab */}
          <TabsContent value="recent" className="flex-1 p-5 overflow-y-auto outline-none">
            {filteredItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">কোনো রিসেন্ট ফাইল পাওয়া যায়নি।</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {filteredItems.slice(0, 12).map((item) => (
                  <div 
                    key={item.id} 
                    className="border rounded-xl aspect-square bg-white overflow-hidden cursor-pointer hover:border-primary relative group shadow-sm transition-all"
                    onClick={() => handleSelectId(item)}
                  >
                    {item.mime_type.startsWith("image/") ? (
                      <BrokenImageGuard src={item.url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-300">
                        {item.mime_type.startsWith("video/") ? <FileVideo className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[9px] text-white bg-primary px-1.5 py-0.5 rounded font-bold shadow">SELECT</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
