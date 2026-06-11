import { Link, useNavigate } from "react-router-dom";
import { useCompare } from "@/context/CompareContext";
import { formatPrice } from "@/data/products";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, X, GitCompareArrows } from "lucide-react";
import { motion } from "framer-motion";
import { getProductUrl } from "@/lib/utils";

const Compare = () => {
  const { items, removeFromCompare } = useCompare();
  const navigate = useNavigate();

  if (items.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20">
          <GitCompareArrows className="h-16 w-16 text-muted-foreground/30" />
          <p className="font-bengali text-xl text-muted-foreground">তুলনার জন্য কমপক্ষে ২টি প্রোডাক্ট যোগ করুন</p>
          <Button onClick={() => navigate("/products")} variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" /> প্রোডাক্ট দেখুন
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Collect all unique spec labels
  const allSpecLabels = Array.from(
    new Set(items.flatMap((p) => p.specs.map((s) => s.label)))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8 md:py-12">
        <div className="container">
          <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> পিছনে যান
          </button>

          <h1 className="mb-8 font-display text-3xl font-extrabold text-foreground md:text-4xl">
            <GitCompareArrows className="mr-3 inline-block h-8 w-8 text-accent" />
            প্রোডাক্ট তুলনা
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-x-auto rounded-2xl border bg-card"
          >
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b bg-secondary/30">
                  <th className="p-4 text-left font-bengali text-sm font-bold text-muted-foreground">বৈশিষ্ট্য</th>
                  {items.map((product) => (
                    <th key={product.id} className="relative p-4 text-center">
                      <button
                         onClick={() => removeFromCompare(product.id)}
                        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <Link to={getProductUrl(product as any)} className="group">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="mx-auto mb-3 h-24 w-24 rounded-xl object-cover transition-transform group-hover:scale-105"
                        />
                        <p className="font-display text-sm font-bold text-card-foreground transition-colors group-hover:text-accent">
                          {product.name}
                        </p>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price */}
                <tr className="border-b">
                  <td className="p-4 font-bengali text-sm font-medium text-muted-foreground">মূল্য</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-4 text-center">
                      <span className="font-display text-lg font-extrabold text-foreground">{formatPrice(p.price)}</span>
                      {p.originalPrice && (
                        <span className="ml-2 text-xs text-muted-foreground line-through">{formatPrice(p.originalPrice)}</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr className="border-b bg-secondary/10">
                  <td className="p-4 font-bengali text-sm font-medium text-muted-foreground">রেটিং</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-accent text-accent" />
                        <span className="font-display text-sm font-bold text-foreground">{p.rating}</span>
                        <span className="text-xs text-muted-foreground">({p.reviewCount})</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Category */}
                <tr className="border-b">
                  <td className="p-4 font-bengali text-sm font-medium text-muted-foreground">ক্যাটাগরি</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-4 text-center">
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{p.categoryLabel}</span>
                    </td>
                  ))}
                </tr>

                {/* Stock */}
                <tr className="border-b bg-secondary/10">
                  <td className="p-4 font-bengali text-sm font-medium text-muted-foreground">স্টক</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-4 text-center">
                      <span className={`text-sm font-semibold ${p.stock === 0 ? "text-destructive" : p.stock <= 5 ? "text-amber-500" : "text-success"}`}>
                        {p.stock === 0 ? "স্টক আউট" : `${p.stock}টি আছে`}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Specs */}
                {allSpecLabels.map((label, i) => (
                  <tr key={label} className={`border-b ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                    <td className="p-4 font-bengali text-sm font-medium text-muted-foreground">{label}</td>
                    {items.map((p) => {
                      const spec = p.specs.find((s) => s.label === label);
                      return (
                        <td key={p.id} className="p-4 text-center font-display text-sm font-semibold text-foreground">
                          {spec?.value ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Action */}
                <tr>
                  <td className="p-4" />
                  {items.map((p) => (
                    <td key={p.id} className="p-4 text-center">
                      <Button asChild size="sm" className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link to={getProductUrl(p as any)}>ডিটেলস দেখুন</Link>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Compare;
