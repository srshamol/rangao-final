import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle } from "lucide-react";
import {
  type VariationOption,
  type ProductVariant,
  checkOptionValueAvailability,
  findMatchingVariant,
} from "@/types/productVariations";

interface Props {
  options: VariationOption[];
  variants: ProductVariant[];
  selectedOptions: Record<string, string>;
  onSelectOption: (optionName: string, value: string) => void;
  activeVariant: ProductVariant | null;
}

export default function ProductVariationSelector({
  options,
  variants,
  selectedOptions,
  onSelectOption,
  activeVariant,
}: Props) {
  const activeOptions = useMemo(
    () => options.filter((opt) => opt.name.trim() && opt.values.length > 0),
    [options]
  );

  const allOptionsSelected = useMemo(() => {
    return activeOptions.every((opt) => Boolean(selectedOptions[opt.name.trim()]));
  }, [activeOptions, selectedOptions]);

  if (activeOptions.length === 0 || variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-gradient-to-br from-secondary/40 to-transparent p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="font-bengali text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
          <span>✨ অপশন নির্বাচন করুন</span>
        </h3>
        {activeVariant && (
          <Badge
            variant={activeVariant.stock_quantity > 0 ? "default" : "destructive"}
            className="text-[11px] font-mono px-2 py-0.5"
          >
            {activeVariant.stock_quantity > 0
              ? activeVariant.stock_quantity <= 5
                ? `মাত্র ${activeVariant.stock_quantity}টি বাকি`
                : "স্টকে আছে"
              : "স্টক শেষ"}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {activeOptions.map((opt) => {
          const optName = opt.name.trim();
          const selectedVal = selectedOptions[optName];

          return (
            <div key={opt.id} className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bengali font-semibold text-foreground">
                  {optName}:
                </span>
                {selectedVal && (
                  <span className="font-bold text-accent font-bengali">
                    {selectedVal}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {opt.values.map((val) => {
                  const isSelected = selectedVal === val;
                  const { isAvailable, isOutOfStock } = checkOptionValueAvailability(
                    optName,
                    val,
                    selectedOptions,
                    variants
                  );

                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onSelectOption(optName, val)}
                      className={`relative min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 select-none ${
                        isSelected
                          ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-background shadow-gold scale-[1.02]"
                          : isOutOfStock
                          ? "bg-secondary/40 text-muted-foreground border border-dashed border-border/70 line-through opacity-70 hover:opacity-100 hover:border-accent/40"
                          : "bg-secondary/60 text-foreground border border-border/60 hover:border-accent hover:bg-secondary/90 hover:scale-[1.01]"
                      } ${!isAvailable ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 stroke-[3] shrink-0 text-accent-foreground" />
                      )}
                      <span>{val}</span>
                      {isOutOfStock && isAvailable && (
                        <span className="text-[10px] ml-1 font-normal opacity-90">
                          (স্টক শেষ)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Prompt */}
      {!allOptionsSelected && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 font-bengali">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>অনুগ্রহ করে সব অপশন নির্বাচন করুন</span>
        </div>
      )}

      {/* Active variant SKU information */}
      {activeVariant && (
        <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>নির্বাচিত ভ্যারিয়েন্ট: <strong className="text-foreground">{activeVariant.title}</strong></span>
          {activeVariant.sku && (
            <span>SKU: <strong className="font-mono text-foreground">{activeVariant.sku}</strong></span>
          )}
        </div>
      )}
    </div>
  );
}
