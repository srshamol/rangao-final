import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from "vite-plugin-compression";
import { execSync } from "child_process";


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
    include: ["@supabase/supabase-js", "react", "react-dom"],
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
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }
            if (id.includes("framer-motion")) {
              return "vendor-motion";
            }
            if (id.includes("@supabase/supabase-js") || id.includes("@supabase/")) {
              return "vendor-supabase";
            }
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (
              id.includes("@radix-ui") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge") ||
              id.includes("class-variance-authority")
            ) {
              return "vendor-ui";
            }
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
}));
