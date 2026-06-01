import { Menu, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface Props {
  onMenuClick: () => void;
  onSearchClick: () => void;
  storeInfo: any;
}

const MobileHeader = ({ onMenuClick, storeInfo }: Props) => {
  const { totalItems, setIsOpen } = useCart();

  const logoUrl = storeInfo?.logo_url;
  const storeName = storeInfo?.name || "Rangao";

  return (
    <header
      className="relative z-[1000] flex h-16 items-center justify-between px-4 border-b border-border/40 bg-background shadow-premium-soft lg:hidden pt-[env(safe-area-inset-top)]"
      style={{ height: "64px" }}
    >
      {/* ☰ Menu Toggle */}
      <button
        onClick={onMenuClick}
        className="relative z-20 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 text-foreground transition-colors active:scale-95"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5.5 w-5.5" />
      </button>

      {/* Logo: Absolutely Centered */}
      <a 
        href="/" 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
        style={{ maxHeight: "34px", height: "34px" }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={storeName}
            className="object-contain"
            style={{
              maxHeight: "34px",
              height: "34px",
              width: "auto",
            }}
          />
        ) : (
          <span className="font-display text-base font-extrabold tracking-tight text-foreground">
            {storeName.split(" - ")[0]}<span className="text-accent">.</span>
          </span>
        )}
      </a>

      {/* Action triggers: Cart only */}
      <div className="relative z-20 flex items-center gap-1.5">
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 text-foreground transition-colors active:scale-95"
          aria-label="View shopping cart"
        >
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground shadow-gold">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default MobileHeader;
