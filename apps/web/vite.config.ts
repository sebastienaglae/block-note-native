import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// react-native -> react-native-web, and prefer .web.* platform files.
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
    __DEV__: JSON.stringify(true),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  },
  resolve: {
    extensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
    alias: [{ find: /^react-native$/, replacement: "react-native-web" }],
    dedupe: ["react", "react-dom", "react-native-web"],
  },
  optimizeDeps: {
    include: ["react-native-web"],
    exclude: ["@bnn/core", "@bnn/react", "@bnn/demo-shared"],
    esbuildOptions: { resolveExtensions: [".web.js", ".js", ".ts", ".jsx", ".tsx"] },
  },
});
