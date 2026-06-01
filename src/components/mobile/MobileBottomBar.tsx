import { Home, ShoppingBag, Search, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCustomer } from "@/context/CustomerContext";
import { motion } from "framer-motion";

interface Props {
  onSearchClick: () => void;
}

const MobileBottomBar = ({ onSearchClick }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCustomer();

  const currentPath = location.pathname;

  const items = [
    {
      label: "হোম",
      icon: Home,
      action: () => navigate("/"),
      active: currentPath === "/",
    },
    {
      label: "শপ",
      icon: ShoppingBag,
      action: () => navigate("/products"),
      active: currentPath === "/products" || currentPath.startsWith("/category/"),
    },
    {
      label: "সার্চ",
      icon: Search,
      action: onSearchClick,
      active: false,
    },
    {
      label: "প্রোফাইল",
      icon: User,
      action: () => navigate(user ? "/account" : "/login"),
      active: currentPath === "/account" || currentPath === "/login" || currentPath === "/register" || currentPath.startsWith("/account/"),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[950] block h-[70px] border-t border-border/40 bg-background/85 pb-[calc(env(safe-area-inset-bottom)*0.8)] shadow-[0_-4px_30px_rgba(16,42,32,0.06)] backdrop-blur-lg lg:hidden">
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="relative flex h-full flex-1 flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              {/* Active Tab Top Line Indicator */}
              {item.active && (
                <motion.div
                  layoutId="bottom-indicator"
                  className="absolute top-0 h-1 w-8 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon Container with subtle animation */}
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                  item.active
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground/80 hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <Icon className="h-5.5 w-5.5" />
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-bold transition-colors duration-300 ${
                  item.active ? "text-accent" : "text-muted-foreground/85"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomBar;
