import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry point
  {
    entry: {
      index: 'src/lib/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
    treeshake: true,
    splitting: false,
    minify: false, // Let consumers handle minification
    target: 'es2020',
    outDir: 'dist',
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";', // Mark as client component for Next.js
      };
    },
  },
  // Components subpath
  {
    entry: {
      'components/index': 'src/lib/components/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: false, // Don't clean on subsequent builds
    external: ['react', 'react-dom'],
    treeshake: true,
    splitting: false,
    minify: false,
    target: 'es2020',
    outDir: 'dist',
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";',
      };
    },
  },
  // Hooks subpath
  {
    entry: {
      'hooks/index': 'src/lib/hooks/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    external: ['react', 'react-dom'],
    treeshake: true,
    splitting: false,
    minify: false,
    target: 'es2020',
    outDir: 'dist',
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";',
      };
    },
  },
  // Utils subpath (no "use client" needed for pure utilities)
  {
    entry: {
      'utils/index': 'src/lib/utils/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    external: ['react', 'react-dom'],
    treeshake: true,
    splitting: false,
    minify: false,
    target: 'es2020',
    outDir: 'dist',
  },
]);
