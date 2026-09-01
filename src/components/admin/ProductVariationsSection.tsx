import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Wand2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
  Check,
  X,
  DollarSign,
  Package,
} from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import {
  type VariationOption,
  type ProductVariant,
  generateVariantCombinations,
  generateVariantSku,
} from "@/types/productVariations";
import { toast } from "sonner";

interface Props {
  hasVariants: boolean;
  onHasVariantsChange: (hasVariants: boolean) => void;
  options: VariationOption[];
  onOptionsChange: (options: VariationOption[]) => void;
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  baseProduct: {
    sku: string;
    regular_price: number;
    sale_price: number | null;
    cost_price: number | null;
    stock_quantity: number;
    images: string[];
  };
}

export default function ProductVariationsSection({
  hasVariants,
  onHasVariantsChange,
  options,
  onOptionsChange,
  variants,
  onVariantsChange,
  baseProduct,
}: Props) {
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});
  const [editingValue, setEditingValue] = useState<{ optId: string; index: number; text: string } | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);

  // Safety confirmation dialogs
  const [confirmWarningOpen, setConfirmWarningOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [bulkPriceInput, setBulkPriceInput] = useState<string>("");
  const [bulkStockInput, setBulkStockInput] = useState<string>("");
  const [showBulkModal, setShowBulkModal] = useState<"price" | "stock" | null>(null);

  // Check duplicate SKUs
  const skuCounts = variants.reduce<Record<string, number>>((acc, v) => {
    const sku = v.sku.trim();
    if (sku) acc[sku] = (acc[sku] || 0) + 1;
    return acc;
  }, {});
  const hasDuplicateSku = Object.values(skuCounts).some((c) => c > 1);

  // Check duplicate option names
  const optionNames = options.map((o) => o.name.trim().toLowerCase()).filter(Boolean);
  const hasDuplicateOptionName = new Set(optionNames).size !== optionNames.length;

  const triggerSafeAction = (action: () => void) => {
    if (variants.length > 0) {
      setPendingAction(() => action);
      setConfirmWarningOpen(true);
    } else {
      action();
    }
  };

  const addOption = () => {
    triggerSafeAction(() => {
      const newOpt: VariationOption = {
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        values: [],
      };
      onOptionsChange([...options, newOpt]);
    });
  };

  const removeOption = (id: string) => {
    triggerSafeAction(() => {
      onOptionsChange(options.filter((o) => o.id !== id));
    });
  };

  const updateOptionName = (id: string, name: string) => {
    onOptionsChange(options.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const addValueToOption = (optionId: string) => {
    const text = (newValueInputs[optionId] || "").trim();
    if (!text) return;

    const opt = options.find((o) => o.id === optionId);
    if (!opt) return;

    if (opt.values.map((v) => v.toLowerCase()).includes(text.toLowerCase())) {
      toast.error("এই ভ্যালুটি ইতিমধ্যেই যুক্ত করা আছে");
      return;
    }

    triggerSafeAction(() => {
      onOptionsChange(
        options.map((o) =>
          o.id === optionId ? { ...o, values: [...o.values, text] } : o
        )
      );
      setNewValueInputs((prev) => ({ ...prev, [optionId]: "" }));
    });
  };

  const removeValueFromOption = (optionId: string, valueIndex: number) => {
    triggerSafeAction(() => {
      onOptionsChange(
        options.map((o) =>
          o.id === optionId
            ? { ...o, values: o.values.filter((_, idx) => idx !== valueIndex) }
            : o
        )
      );
    });
  };

  const reorderValue = (optionId: string, fromIndex: number, direction: -1 | 1) => {
    const opt = options.find((o) => o.id === optionId);
    if (!opt) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= opt.values.length) return;

    const newValues = [...opt.values];
    const [moved] = newValues.splice(fromIndex, 1);
    newValues.splice(toIndex, 0, moved);

    onOptionsChange(options.map((o) => (o.id === optionId ? { ...o, values: newValues } : o)));
  };

  const saveEditedValue = () => {
    if (!editingValue || !editingValue.text.trim()) {
      setEditingValue(null);
      return;
    }
    const { optId, index, text } = editingValue;
    triggerSafeAction(() => {
      onOptionsChange(
        options.map((o) => {
          if (o.id !== optId) return o;
          const newVals = [...o.values];
          newVals[index] = text.trim();
          return { ...o, values: newVals };
        })
      );
      setEditingValue(null);
    });
  };

  const handleGenerateVariants = () => {
    // Validations
    if (options.length === 0 || !options.some((o) => o.name.trim() && o.values.length > 0)) {
      toast.error("অন্তত একটি অপশন এবং একটি ভ্যালু যোগ করুন");
      return;
    }

    // Check Cartesian size
    const totalCombinations = options
      .filter((o) => o.name.trim() && o.values.length > 0)
      .reduce((acc, curr) => acc * curr.values.length, 1);

    if (totalCombinations > 40) {
      if (!window.confirm(`এটি মোট ${totalCombinations}টি ভ্যারিয়েন্ট তৈরি করবে। আপনি কি এগিয়ে যেতে চান?`)) {
        return;
      }
    }

    const generated = generateVariantCombinations(options, baseProduct, variants);
    onVariantsChange(generated);
    toast.success(`মোট ${generated.length}টি ভ্যারিয়েন্ট সফলভাবে তৈরি করা হয়েছে`);
  };

  const handleAutoGenerateSkus = () => {
    const updated = variants.map((v, idx) => ({
      ...v,
      sku: generateVariantSku(baseProduct.sku || "RNG", v.options, idx),
    }));
    onVariantsChange(updated);
    toast.success("সব ভ্যারিয়েন্টের SKU অটো-জেনারেট করা হয়েছে");
  };

  const handleBulkSetPrice = () => {
    const p = parseFloat(bulkPriceInput);
    if (isNaN(p) || p < 0) {
      toast.error("সঠিক মূল্য দিন");
      return;
    }
    onVariantsChange(variants.map((v) => ({ ...v, regular_price: p })));
    setShowBulkModal(null);
    setBulkPriceInput("");
    toast.success("সব ভ্যারিয়েন্টের মূল্য আপডেট হয়েছে");
  };

  const handleBulkSetStock = () => {
    const s = parseInt(bulkStockInput, 10);
    if (isNaN(s) || s < 0) {
      toast.error("সঠিক স্টক সংখ্যা দিন");
      return;
    }
    onVariantsChange(variants.map((v) => ({ ...v, stock_quantity: s })));
    setShowBulkModal(null);
    setBulkStockInput("");
    toast.success("সব ভ্যারিয়েন্টের স্টক আপডেট হয়েছে");
  };

  const updateVariantField = <K extends keyof ProductVariant>(
    index: number,
    field: K,
    value: ProductVariant[K]
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    onVariantsChange(updated);
  };

  const removeVariant = (index: number) => {
    onVariantsChange(variants.filter((_, idx) => idx !== index));
    toast.success("ভ্যারিয়েন্ট ডিলিট করা হয়েছে");
  };

  return (
    <Card className="border-accent/30 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-accent/5 via-secondary/20 to-transparent pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-accent" /> 📦 পণ্যের ভ্যারিয়েশন (Product Variations)
              </CardTitle>
              {hasVariants && variants.length > 0 && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {variants.length}টি ভ্যারিয়েন্ট
                </Badge>
              )}
            </div>
            <CardDescription>
              সাইজ, ফ্রেম, কালার ইত্যাদির ওপর ভিত্তি করে একাধিক ভ্যারিয়েশন ও স্বতন্ত্র মূল্য/স্টক সেট করুন
            </CardDescription>
          </div>
          <div className="flex items-center gap-2.5 bg-background/80 px-3.5 py-2 rounded-xl border">
            <label
              htmlFor="has-variants-toggle"
              className="text-xs sm:text-sm font-semibold cursor-pointer select-none"
            >
              এই প্রোডাক্টের ভ্যারিয়েশন আছে
            </label>
            <Switch
              id="has-variants-toggle"
              checked={hasVariants}
              onCheckedChange={(checked) => {
                onHasVariantsChange(checked);
                if (checked && options.length === 0) {
                  // Pre-populate with default template
                  onOptionsChange([
                    {
                      id: `opt-${Date.now()}-1`,
                      name: "Size",
                      values: ["15 × 21 inch", "18 × 24 inch"],
                    },
                  ]);
                }
              }}
            />
          </div>
        </div>
      </CardHeader>

      {hasVariants && (
        <CardContent className="space-y-6 pt-6">
          {/* Option Builder */}
          <div className="space-y-4 rounded-xl border bg-secondary/10 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-accent" /> ভ্যারিয়েশন অপশনসমূহ (Variation Options)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  যেমন: Size, Frame, Color ইত্যাদি তৈরি করুন এবং প্রতিটি অপশনের ভ্যালুগুলো যোগ করুন
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addOption} className="rounded-lg gap-1">
                <Plus className="h-4 w-4" /> অপশন যোগ করুন
              </Button>
            </div>

            {hasDuplicateOptionName && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>সতর্কতা: একাধিক অপশনের নাম একই রাখা যাবে না। প্রতিটি অপশনের নাম ইউনিক হতে হবে।</span>
              </div>
            )}

            <div className="space-y-4">
              {options.map((opt, optIdx) => (
                <div
                  key={opt.id}
                  className="space-y-3 rounded-xl border bg-card p-4 transition-all hover:border-accent/40 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 max-w-xs">
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        অপশনের নাম (যেমন: Size / Frame) *
                      </label>
                      <Input
                        value={opt.name}
                        onChange={(e) => updateOptionName(opt.id, e.target.value)}
                        placeholder="যেমন: Size অথবা সাইজ"
                        className="h-9 font-medium"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 mt-5"
                      onClick={() => removeOption(opt.id)}
                      title="অপশন মুছে ফেলুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Values Chips */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">
                      ভ্যালুসমূহ (Option Values) *
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {opt.values.map((val, valIdx) => {
                        const isEditing =
                          editingValue?.optId === opt.id && editingValue?.index === valIdx;

                        return (
                          <div
                            key={valIdx}
                            className="group flex items-center gap-1.5 rounded-lg border bg-secondary/40 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:border-accent/40"
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  className="bg-background px-1.5 py-0.5 rounded border text-xs h-6 w-28"
                                  value={editingValue.text}
                                  onChange={(e) =>
                                    setEditingValue({ ...editingValue, text: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditedValue();
                                    if (e.key === "Escape") setEditingValue(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={saveEditedValue}
                                  className="text-success hover:scale-110"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingValue(null)}
                                  className="text-muted-foreground hover:scale-110"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span
                                  className="cursor-pointer hover:underline"
                                  title="ক্লিক করে এডিট করুন"
                                  onClick={() =>
                                    setEditingValue({ optId: opt.id, index: valIdx, text: val })
                                  }
                                >
                                  {val}
                                </span>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
                                  {valIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => reorderValue(opt.id, valIdx, -1)}
                                      className="text-muted-foreground hover:text-foreground p-0.5"
                                      title="বামে সরান"
                                    >
                                      <ArrowUp className="h-3 w-3 -rotate-90" />
                                    </button>
                                  )}
                                  {valIdx < opt.values.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => reorderValue(opt.id, valIdx, 1)}
                                      className="text-muted-foreground hover:text-foreground p-0.5"
                                      title="ডানে সরান"
                                    >
                                      <ArrowDown className="h-3 w-3 -rotate-90" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeValueFromOption(opt.id, valIdx)}
                                    className="text-destructive/80 hover:text-destructive p-0.5 ml-0.5"
                                    title="মুছে ফেলুন"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Value Input */}
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={newValueInputs[opt.id] || ""}
                          onChange={(e) =>
                            setNewValueInputs({ ...newValueInputs, [opt.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addValueToOption(opt.id);
                            }
                          }}
                          placeholder="+ নতুন ভ্যালু লিখে Enter চাপুন"
                          className="h-8 w-44 text-xs font-normal"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 px-2.5 text-xs font-medium"
                          onClick={() => addValueToOption(opt.id)}
                        >
                          যোগ
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                onClick={handleGenerateVariants}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-xs gap-1.5"
              >
                <Wand2 className="h-4 w-4" /> ভ্যারিয়েন্ট কম্বিনেশন জেনারেট করুন
              </Button>
              <p className="text-xs text-muted-foreground">
                সব অপশন ও ভ্যালু থেকে প্রতিটি সঠিক কম্বিনেশন স্বয়ংক্রিয়ভাবে তৈরি হবে
              </p>
            </div>
          </div>

          {/* Variants Management Table */}
          {variants.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    ভ্যারিয়েন্ট তালিকা ও ইনভেন্টরি ({variants.length}টি)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    প্রতিটি ভ্যারিয়েন্টের জন্য আলাদা SKU, ছবি, মূল্য ও স্টক কনফিগার করুন
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 rounded-lg"
                    onClick={handleAutoGenerateSkus}
                  >
                    <Wand2 className="h-3.5 w-3.5 text-accent" /> অটো-জেনারেট SKU
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 rounded-lg"
                    onClick={() => setShowBulkModal("price")}
                  >
                    <DollarSign className="h-3.5 w-3.5" /> বাল্ক প্রাইস
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 rounded-lg"
                    onClick={() => setShowBulkModal("stock")}
                  >
                    <Package className="h-3.5 w-3.5" /> বাল্ক স্টক
                  </Button>
                </div>
              </div>

              {hasDuplicateSku && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    সতর্কতা: একাধিক ভ্যারিয়েন্টের SKU একই রাখা যাবে না! অনুগ্রহ করে প্রতিটি ভ্যারিয়েন্টের জন্য ইউনিক SKU নিশ্চিত করুন।
                  </span>
                </div>
              )}

              {/* Desktop Table & Mobile Cards */}
              <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead className="w-14 text-center">ছবি</TableHead>
                        <TableHead className="min-w-[160px]">ভ্যারিয়েন্ট</TableHead>
                        <TableHead className="min-w-[140px]">SKU *</TableHead>
                        <TableHead className="w-28">মূল্য (৳) *</TableHead>
                        <TableHead className="w-28">ছাড় মূল্য (৳)</TableHead>
                        <TableHead className="w-24">স্টক *</TableHead>
                        <TableHead className="w-20 text-center">সক্রিয়</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant, vIdx) => {
                        const isSkuDuplicate =
                          variant.sku.trim() && skuCounts[variant.sku.trim()] > 1;

                        return (
                          <TableRow key={variant.id} className="hover:bg-secondary/20 transition-colors">
                            {/* Image */}
                            <TableCell className="p-2 text-center">
                              <div
                                className="relative h-10 w-10 mx-auto rounded-lg border overflow-hidden cursor-pointer group bg-secondary/30 flex items-center justify-center"
                                onClick={() => {
                                  setSelectedVariantIndex(vIdx);
                                  setShowMediaPicker(true);
                                }}
                                title={variant.image ? "ছবি পরিবর্তন করুন" : "ছবি সিলেক্ট করুন"}
                              >
                                {variant.image ? (
                                  <>
                                    <img
                                      src={variant.image}
                                      alt={variant.title}
                                      className="h-full w-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateVariantField(vIdx, "image", null);
                                      }}
                                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="ছবি রিমুভ করুন"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </>
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground" />
                                )}
                              </div>
                            </TableCell>

                            {/* Title / Options */}
                            <TableCell className="font-medium text-xs">
                              <span className="font-bold text-foreground">{variant.title}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(variant.options).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded"
                                  >
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            </TableCell>

                            {/* SKU */}
                            <TableCell>
                              <Input
                                value={variant.sku}
                                onChange={(e) =>
                                  updateVariantField(vIdx, "sku", e.target.value.trim().toUpperCase())
                                }
                                placeholder="RNG-VAR-001"
                                className={`h-8 font-mono text-xs ${
                                  isSkuDuplicate
                                    ? "border-destructive focus-visible:ring-destructive"
                                    : ""
                                }`}
                              />
                            </TableCell>

                            {/* Regular Price */}
                            <TableCell>
                              <Input
                                type="number"
                                value={variant.regular_price || ""}
                                onChange={(e) =>
                                  updateVariantField(vIdx, "regular_price", Number(e.target.value))
                                }
                                placeholder="0"
                                className="h-8 font-mono text-xs"
                              />
                            </TableCell>

                            {/* Sale Price */}
                            <TableCell>
                              <Input
                                type="number"
                                value={variant.sale_price ?? ""}
                                onChange={(e) =>
                                  updateVariantField(
                                    vIdx,
                                    "sale_price",
                                    e.target.value ? Number(e.target.value) : null
                                  )
                                }
                                placeholder="—"
                                className="h-8 font-mono text-xs"
                              />
                            </TableCell>

                            {/* Stock Quantity */}
                            <TableCell>
                              <Input
                                type="number"
                                value={variant.stock_quantity ?? 0}
                                onChange={(e) =>
                                  updateVariantField(vIdx, "stock_quantity", Number(e.target.value))
                                }
                                className="h-8 font-mono text-xs"
                              />
                            </TableCell>

                            {/* Active Switch */}
                            <TableCell className="text-center">
                              <Switch
                                checked={variant.is_active}
                                onCheckedChange={(checked) =>
                                  updateVariantField(vIdx, "is_active", checked)
                                }
                              />
                            </TableCell>

                            {/* Delete Button */}
                            <TableCell className="text-right p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeVariant(vIdx)}
                                title="ভ্যারিয়েন্ট রিমুভ করুন"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden divide-y">
                  {variants.map((variant, vIdx) => {
                    const isSkuDuplicate =
                      variant.sku.trim() && skuCounts[variant.sku.trim()] > 1;

                    return (
                      <div key={variant.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="relative h-12 w-12 rounded-lg border overflow-hidden bg-secondary/30 flex items-center justify-center shrink-0 cursor-pointer group"
                              onClick={() => {
                                setSelectedVariantIndex(vIdx);
                                setShowMediaPicker(true);
                              }}
                              title={variant.image ? "ছবি পরিবর্তন করুন" : "ছবি সিলেক্ট করুন"}
                            >
                              {variant.image ? (
                                <>
                                  <img src={variant.image} alt={variant.title} className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateVariantField(vIdx, "image", null);
                                    }}
                                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-destructive text-white rounded-full"
                                    title="ছবি রিমুভ করুন"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </>
                              ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-foreground">{variant.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Switch
                                  checked={variant.is_active}
                                  onCheckedChange={(checked) =>
                                    updateVariantField(vIdx, "is_active", checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">
                                  {variant.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeVariant(vIdx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <label className="text-[11px] font-semibold text-muted-foreground">SKU *</label>
                            <Input
                              value={variant.sku}
                              onChange={(e) =>
                                updateVariantField(vIdx, "sku", e.target.value.trim().toUpperCase())
                              }
                              className={`h-8 font-mono text-xs ${isSkuDuplicate ? "border-destructive" : ""}`}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">নিয়মিত মূল্য (৳)</label>
                            <Input
                              type="number"
                              value={variant.regular_price || ""}
                              onChange={(e) => updateVariantField(vIdx, "regular_price", Number(e.target.value))}
                              className="h-8 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">ছাড় মূল্য (৳)</label>
                            <Input
                              type="number"
                              value={variant.sale_price ?? ""}
                              onChange={(e) =>
                                updateVariantField(vIdx, "sale_price", e.target.value ? Number(e.target.value) : null)
                              }
                              className="h-8 font-mono text-xs"
                              placeholder="—"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[11px] font-semibold text-muted-foreground">স্টক পরিমাণ</label>
                            <Input
                              type="number"
                              value={variant.stock_quantity ?? 0}
                              onChange={(e) => updateVariantField(vIdx, "stock_quantity", Number(e.target.value))}
                              className="h-8 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Safety warning modal */}
      <AlertDialog open={confirmWarningOpen} onOpenChange={setConfirmWarningOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> ভ্যারিয়েশন পরিবর্তন সতর্কতা
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              ভ্যারিয়েশন অপশন বা ভ্যালু পরিবর্তন করলে তৈরি করা ভ্যারিয়েন্ট তালিকা ও স্টক পুনর্বিন্যাস হতে পারে। আপনি কি নিশ্চিতভাবে পরিবর্তন করতে চান?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAction) pendingAction();
                setPendingAction(null);
                setConfirmWarningOpen(false);
              }}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
            >
              এগিয়ে যান
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Price / Stock Modal */}
      <AlertDialog open={!!showBulkModal} onOpenChange={(open) => !open && setShowBulkModal(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showBulkModal === "price" ? "একসাথে সব ভ্যারিয়েন্টের মূল্য সেট করুন" : "একসাথে সব ভ্যারিয়েন্টের স্টক সেট করুন"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showBulkModal === "price"
                ? "এখানে দেওয়া মূল্য সব ভ্যারিয়েন্টে কার্যকর হবে।"
                : "এখানে দেওয়া স্টক সংখ্যা সব ভ্যারিয়েন্টে কার্যকর হবে।"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            {showBulkModal === "price" ? (
              <Input
                type="number"
                value={bulkPriceInput}
                onChange={(e) => setBulkPriceInput(e.target.value)}
                placeholder="যেমন: ৮৫০"
                autoFocus
              />
            ) : (
              <Input
                type="number"
                value={bulkStockInput}
                onChange={(e) => setBulkStockInput(e.target.value)}
                placeholder="যেমন: ১০"
                autoFocus
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={showBulkModal === "price" ? handleBulkSetPrice : handleBulkSetStock}
              className="bg-accent text-accent-foreground font-bold"
            >
              প্রয়োগ করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Media Picker for Variant Image */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => {
          setShowMediaPicker(false);
          setSelectedVariantIndex(null);
        }}
        onSelect={(url) => {
          if (selectedVariantIndex !== null) {
            updateVariantField(selectedVariantIndex, "image", url);
          }
          setShowMediaPicker(false);
          setSelectedVariantIndex(null);
        }}
        type="images"
      />
    </Card>
  );
}
