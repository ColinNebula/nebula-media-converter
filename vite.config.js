import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed ones) for the define shim
  const env = loadEnv(mode, process.cwd(), '');

  // Build a define map for process.env.* compatibility with CRA-style REACT_APP_ vars
  const processEnvDefines = {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    'process.env.PUBLIC_URL': JSON.stringify(mode === 'production' ? '/nebula-media-converter' : ''),
  };
  // Map every REACT_APP_ variable from .env files
  for (const [key, val] of Object.entries(env)) {
    if (key.startsWith('REACT_APP_')) {
      processEnvDefines[`process.env.${key}`] = JSON.stringify(val);
    }
  }

  return {
    plugins: [
      // Vite 5: vite:define hardcodes loader:"js" and vite:esbuild excludes .js files by
      // default, so .js src files with JSX fail during production builds. This pre-plugin
      // runs before vite:define to transform JSX syntax in .js files to valid JS first.
      {
        name: 'treat-js-as-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (!id.match(/[/\\]src[/\\].*\.js$/) || id.includes('node_modules')) return null;
          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic',
            jsxImportSource: 'react',
          });
        },
      },
      react(),
    ],

    // Base path for GitHub Pages deployment at /nebula-media-converter/
    base: mode === 'production' ? '/nebula-media-converter/' : '/',

    // Output to build/ so existing gh-pages deploy script works unchanged
    build: {
      outDir: 'build',
      emptyOutDir: true,
    },

    // Serve public/ assets (suppress-extension-errors.js etc.)
    publicDir: 'public',

    define: processEnvDefines,

    server: {
      port: 3000,
      // Headers required for FFmpeg.wasm SharedArrayBuffer support in dev
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },

    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
  };
});
