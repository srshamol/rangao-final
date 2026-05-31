import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  FileVideo, FileText, Search, Loader2, Grid, List, 
  Trash2, Copy, Download, UploadCloud, Eye, Plus 
} from "lucide-react";
import { mediaService, MediaItem } from "@/lib/mediaService";
import BrokenImageGuard from "@/components/BrokenImageGuard";
import MediaPicker from "@/components/MediaPicker";

export default function MediaLibrary() {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<"all" | "images" | "videos" | "documents">("all");
  
  // Selected items for bulk operations
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState<boolean>(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const all = await mediaService.fetchItems();
      setItems(all);
    } catch (e: any) {
      toast({ title: "❌ লোড ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "📋 লিঙ্ক কপি করা হয়েছে", description: "URL সাকসেসফুলি ক্লিপবোর্ডে কপি করা হয়েছে।" });
  };

  const handleDeleteItem = async (item: MediaItem) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই ফাইলটি মুছে ফেলতে চান?")) return;
    try {
      await mediaService.delete(item);
      toast({ title: "🗑️ ফাইল মুছে ফেলা হয়েছে" });
      loadLibrary();
      setSelectedItems(prev => prev.filter(id => id !== item.id));
    } catch (e: any) {
      toast({ title: "❌ মুছতে ব্যর্থ", description: e.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.length) return;
    if (!confirm(`আপনি কি নিশ্চিতভাবে নির্বাচিত ${selectedItems.length}টি ফাইল মুছে ফেলতে চান?`)) return;
    
    setLoading(true);
    try {
      let count = 0;
      for (const id of selectedItems) {
        const item = items.find(x => x.id === id);
        if (item) {
          await mediaService.delete(item);
          count++;
        }
      }
      toast({ title: `🗑️ ${count}টি ফাইল মুছে ফেলা হয়েছে` });
      setSelectedItems([]);
      loadLibrary();
    } catch (e: any) {
      toast({ title: "❌ বাল্ক মুছতে ব্যর্থ", description: e.message, variant: "destructive" });
      loadLibrary();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(x => x.id));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "images" && item.mime_type.startsWith("image/")) ||
      (filterType === "videos" && item.mime_type.startsWith("video/")) ||
      (filterType === "documents" && !item.mime_type.startsWith("image/") && !item.mime_type.startsWith("video/"));
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📁 মিডিয়া লাইব্রেরি ও ফাইল ম্যানেজার</h1>
          <p className="text-sm text-muted-foreground">আপনার স্টোরের প্রডাক্ট ইমেজ, ক্যানভাস ব্যানার, ভিডিও এবং সমস্ত নথিপত্র এক জায়গায় পরিচালনা করুন।</p>
        </div>
        <Button className="gap-1.5 rounded-xl bg-primary text-primary-foreground" onClick={() => setShowPicker(true)}>
          <Plus className="h-4 w-4" /> ফাইল আপলোড করুন
        </Button>
      </div>

      {/* Main Grid View */}
      <Card>
        <CardHeader className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              variant={filterType === "all" ? "default" : "outline"} 
              className="rounded-xl text-xs" 
              onClick={() => setFilterType("all")}
            >
              সব ফাইল
            </Button>
            <Button 
              size="sm" 
              variant={filterType === "images" ? "default" : "outline"} 
              className="rounded-xl text-xs" 
              onClick={() => setFilterType("images")}
            >
              ইমেজ 🖼️
            </Button>
            <Button 
              size="sm" 
              variant={filterType === "videos" ? "default" : "outline"} 
              className="rounded-xl text-xs" 
              onClick={() => setFilterType("videos")}
            >
              ভিডিও 🎥
            </Button>
            <Button 
              size="sm" 
              variant={filterType === "documents" ? "default" : "outline"} 
              className="rounded-xl text-xs" 
              onClick={() => setFilterType("documents")}
            >
              ডকুমেন্টস 📄
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="ফাইল নাম দিয়ে সার্চ..." 
                className="pl-8 text-xs rounded-xl"
              />
            </div>
            
            <div className="flex items-center border rounded-xl overflow-hidden shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-9 w-9 rounded-none ${layout === "grid" ? "bg-accent/15 text-primary" : ""}`}
                onClick={() => setLayout("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-9 w-9 rounded-none ${layout === "list" ? "bg-accent/15 text-primary" : ""}`}
                onClick={() => setLayout("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          
          {/* Bulk Select Control Bar */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between p-3 border rounded-xl bg-secondary/10">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0} 
                  onChange={toggleSelectAll} 
                />
                <span className="text-xs font-semibold text-muted-foreground">
                  সব সিলেক্ট করুন ({selectedItems.length} / {filteredItems.length})
                </span>
              </div>
              {selectedItems.length > 0 && (
                <Button size="sm" variant="destructive" className="gap-1 rounded-xl text-xs" onClick={handleBulkDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> নির্বাচিত ফাইল মুছুন
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">মিডিয়া ডাটা লোড হচ্ছে...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-center">
              <UploadCloud className="h-12 w-12 text-muted-foreground" />
              <p className="font-bold text-sm">কোনো ফাইল পাওয়া যায়নি</p>
              <p className="text-xs text-muted-foreground max-w-xs">মিডিয়া ম্যানেজার ফোল্ডারে কোনো ফাইল আপলোড করা নেই।</p>
            </div>
          ) : layout === "grid" ? (
            /* Grid Layout */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className={`relative group rounded-xl border-2 overflow-hidden flex flex-col bg-card hover:shadow-md transition-all duration-300 ${
                    selectedItems.includes(item.id) ? "border-primary ring-2 ring-primary/10" : "border-border"
                  }`}
                >
                  {/* Select Trigger */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      checked={selectedItems.includes(item.id)} 
                      onChange={() => toggleSelect(item.id)} 
                    />
                  </div>

                  {/* Thumbnail */}
                  {item.mime_type.startsWith("image/") ? (
                    <div className="aspect-square bg-white flex items-center justify-center overflow-hidden relative">
                      <BrokenImageGuard src={item.url} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-square bg-slate-950 flex flex-col items-center justify-center relative">
                      {item.mime_type.startsWith("video/") ? (
                        <FileVideo className="h-12 w-12 text-slate-400" />
                      ) : (
                        <FileText className="h-12 w-12 text-slate-500" />
                      )}
                      <span className="absolute bottom-2 right-2 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white font-mono uppercase">
                        {item.mime_type.split("/").pop()}
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="p-3 border-t space-y-1 flex-1 flex flex-col justify-between shrink-0 min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(item.file_size)}</p>
                    </div>
                    
                    {/* Action Panel on Hover */}
                    <div className="flex items-center gap-1 mt-2 justify-end">
                      <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" onClick={() => handleCopyLink(item.url)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List Layout */
            <div className="border rounded-xl divide-y bg-card">
              {filteredItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-secondary/15 transition-colors gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      checked={selectedItems.includes(item.id)} 
                      onChange={() => toggleSelect(item.id)} 
                    />
                    
                    <div className="h-10 w-10 border rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
                      {item.mime_type.startsWith("image/") ? (
                        <BrokenImageGuard src={item.url} className="h-full w-full object-cover" />
                      ) : item.mime_type.startsWith("video/") ? (
                        <FileVideo className="h-5 w-5 text-slate-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-2">
                        <span>{item.mime_type}</span>
                        <span>•</span>
                        <span>{formatSize(item.file_size)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => handleCopyLink(item.url)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> URL
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Upload Media Picker Modal */}
      <MediaPicker 
        isOpen={showPicker} 
        onClose={() => setShowPicker(false)} 
        onSelect={(url) => {
          loadLibrary();
          setShowPicker(false);
        }}
      />
    </div>
  );
}
