import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
        const preloads = [];
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
    mode === "development" && componentTagger()
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
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
}));
