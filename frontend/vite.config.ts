import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': 'http://localhost:8000' } },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
