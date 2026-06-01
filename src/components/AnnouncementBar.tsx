import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Sparkles, Megaphone } from "lucide-react";

export default function AnnouncementBar({ isScrolled }: { isScrolled?: boolean }) {
  const { data: settings } = useStoreSettings();
  const config = settings?.announcementBar;

  if (!config || !config.enabled || !config.text.trim()) return null;

  const barStyle = {
    background: config.bg_color 
      ? `linear-gradient(135deg, ${config.bg_color} 0%, ${config.bg_color}dd 100%)`
      : "linear-gradient(135deg, #102a20 0%, #173b2d 100%)",
    color: config.text_color || "#ffffff",
  };

  const content = (
    <div 
      className={`w-full text-center text-xs font-semibold leading-relaxed tracking-wide transition-all duration-300 relative z-50 flex items-center justify-center gap-2 overflow-hidden border-b border-white/5 ${
        isScrolled 
          ? "max-h-0 min-h-0 py-0 opacity-0 pointer-events-none" 
          : "max-h-[80px] min-h-[38px] py-2 px-4 opacity-100 shadow-md"
      }`}
      style={barStyle}
    >
      {/* Subtle shining light effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none" />
      
      <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse shrink-0" />
      <span className="font-bengali relative z-10 hover:scale-[1.01] transition-transform duration-300">
        {config.text}
      </span>
      <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse shrink-0 hidden sm:inline" />
    </div>
  );

  if (config.link_url && config.link_url.trim() !== "") {
    return (
      <a href={config.link_url} className="block transition-all duration-300">
        {content}
      </a>
    );
  }

  return content;
}

