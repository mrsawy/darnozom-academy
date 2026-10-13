import { defineConfig } from 'vitest/config';
import type { ViteUserConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.VITEST = 'true';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cast via unknown to avoid "Excessive stack depth" from duplicate Vite types (root vs client node_modules)
const vitestConfig = {
  plugins: [react()],
  css: false,
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/assets': path.resolve(__dirname, './public'),
      '@darnozom/shared-types': path.resolve(__dirname, '../../lib/shared-types/src/index.ts'),
    },
  },
} as unknown as ViteUserConfig;

export default defineConfig(vitestConfig);
