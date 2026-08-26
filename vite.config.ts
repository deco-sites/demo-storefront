import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { decoVitePlugin } from "@decocms/tanstack/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

const srcDir = path.resolve(__dirname, "src");

// Vite does not read `PORT` on its own — it only honours `server.port`, the
// `--port` flag, and `VITE_PORT`. Platforms that assign a port (Docker, k8s,
// Heroku-style buildpacks, `deploy/values-custom.yaml`) inject `PORT`, so map
// it through explicitly. Left `undefined` when unset so Vite keeps its own
// default (5173) and its "port in use, trying another one" fallback.
//
// `strictPort` is on whenever PORT is set: if the platform assigned us a port,
// silently listening on a *different* one means the health check and the
// router hit a closed port — failing loudly is the correct outcome there.
// Validated against the full 1-65535 range, not just `Number.isInteger`:
// out-of-range values would otherwise reach Vite and fail at bind time with a
// far more obscure error. Port 0 is rejected for a subtler reason — Vite reads
// it as "pick any free port", which would silently listen elsewhere and defeat
// the `strictPort` guarantee below.
const portEnv = process.env.PORT;
const port = portEnv ? Number(portEnv) : undefined;

if (portEnv && (!Number.isInteger(port!) || port! < 1 || port! > 65535)) {
  throw new Error(
    `Invalid PORT environment variable: ${JSON.stringify(portEnv)} (expected an integer 1-65535)`,
  );
}

export default defineConfig({
  server: {
    port,
    strictPort: port !== undefined,
    allowedHosts: [".decocdn.com", ".trycloudflare.com", ".preview-studio.decocms.com", ".decocms.com"],
    // Shopify Storefront API is called server-side from loaders — no dev
    // proxy is needed. Checkout happens on Shopify's hosted checkout (or
    // the store's custom domain).
  },
  preview: {
    port,
    strictPort: port !== undefined,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({ server: { entry: "server" } }),
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", { target: "19" }],
        ],
      },
    }),
    tailwindcss(),
    decoVitePlugin(),
    {
      name: "site-manual-chunks",
      config(_cfg, { command }) {
        if (command !== "build") return;
        return {
          build: {
            rollupOptions: {
              output: {
                manualChunks(id: string) {
                  if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/"))
                    return "vendor-react";
                  if (id.includes("@tanstack/react-router") || id.includes("@tanstack/start"))
                    return "vendor-router";
                  if (id.includes("@tanstack/react-query")) return "vendor-query";
                },
              },
            },
          },
        };
      },
    },
    {
      name: "deco-stub-meta-gen",
      enforce: "pre" as const,
      resolveId(id, importer, options) {
        if (!options?.ssr && importer && id.includes("meta.gen")) {
          return "\0stub:meta-gen";
        }
      },
      load(id) {
        if (id === "\0stub:meta-gen") {
          return "export default {};";
        }
      },
    },
  ],
  build: {
    sourcemap: "hidden",
    rollupOptions: {
      onLog(level, log, handler) {
        if (
          log.code === "PLUGIN_WARNING" &&
          log.plugin === "vite:reporter" &&
          log.message?.includes("dynamic import will not move module")
        ) {
          return;
        }
        handler(level, log);
      },
    },
  },
  define: {
    "process.env.DECO_SITE_NAME": JSON.stringify(
      process.env.DECO_SITE_NAME || "demo-storefront"
    ),
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    dedupe: [
      "@tanstack/react-start",
      "@tanstack/react-router",
      "@tanstack/react-start-server",
      "@tanstack/start-server-core",
      "@tanstack/start-client-core",
      "@tanstack/start-plugin-core",
      "@tanstack/start-storage-context",
      "react",
      "react-dom",
    ],
    alias: {
      "~": srcDir,
    },
  },
});
