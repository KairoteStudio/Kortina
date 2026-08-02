import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";


const host = process.env.TAURI_DEV_HOST;


export default defineConfig(async () => ({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  test: {
    environment: 'jsdom',
    globals: true,
  },
  
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
        },
      },
    },
  },
  
  
  
  clearScreen: false,
  
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      
      ignored: ["**/src-tauri/**"],
    },
  },
}));
