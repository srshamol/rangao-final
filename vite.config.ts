import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from "vite-plugin-compression";

// Custom plugin to replace %BUILD_TIMESTAMP% in index.html
const htmlPlugin = () => {
  return {
    name: "html-transform",
    transformIndexHtml(html: string) {
      return html.replace(/%BUILD_TIMESTAMP%/g, Date.now().toString());
    },
  };
};

// Custom plugin to preload build CSS assets for faster rendering and FCP/LCP improvements
const cssPreloadPlugin = () => {
  return {
    name: "css-preload",
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        const linkRegex = /<link rel="stylesheet" href="([^"]+\.css)"[^>]*>/g;
        let match;
        const preloads: string[] = [];
        while ((match = linkRegex.exec(html)) !== null) {
          const href = match[1];
          preloads.push(`<link rel="preload" href="${href}" as="style">`);
        }
        if (preloads.length > 0) {
          return html.replace("</head>", `${preloads.join("\n")}\n</head>`);
        }
        return html;
      },
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    htmlPlugin(),
    cssPreloadPlugin(),
    mode === "development" && componentTagger(),
    // Gzip compression for JS/CSS/HTML assets
    mode === "production" &&
      compression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 10240, // Only compress files > 10KB
      }),
    // Brotli compression (better ratios, supported by Vercel)
    mode === "production" &&
      compression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 10240,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js"],
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    minify: "esbuild",
    assetsInlineLimit: 4096,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks(id) {
          // ── Core React runtime ──────────────────────────────────────────
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // ── React Router ────────────────────────────────────────────────
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }
          // ── TanStack Query ──────────────────────────────────────────────
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          // ── Supabase ────────────────────────────────────────────────────
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // ── Framer Motion (heavy — isolate) ─────────────────────────────
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          // ── Recharts / D3 (heavy — isolate) ─────────────────────────────
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3-")
          ) {
            return "vendor-charts";
          }
          // ── Radix UI primitives ──────────────────────────────────────────
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // ── Lucide icons ─────────────────────────────────────────────────
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          // ── Everything else in node_modules → generic vendor ─────────────
          if (id.includes("node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
  },
}));
