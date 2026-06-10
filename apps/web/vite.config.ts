import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// react-native -> react-native-web; workspace packages -> their TS source (HMR in dev).
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
    __DEV__: JSON.stringify(true),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  },
  resolve: {
    extensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
    alias: [
      { find: /^react-native$/, replacement: "react-native-web" },
      { find: "@sebastienaglae/bnn-core", replacement: r("../../packages/core/src/index.ts") },
      { find: "@sebastienaglae/bnn-react", replacement: r("../../packages/react/src/index.ts") },
      { find: "@sebastienaglae/bnn-demo-shared", replacement: r("../../packages/demo-shared/src/index.tsx") },
    ],
    dedupe: ["react", "react-dom", "react-native-web"],
  },
  optimizeDeps: {
    include: ["react-native-web"],
    exclude: ["@sebastienaglae/bnn-core", "@sebastienaglae/bnn-react", "@sebastienaglae/bnn-demo-shared"],
    esbuildOptions: { resolveExtensions: [".web.js", ".js", ".ts", ".jsx", ".tsx"] },
  },
});
