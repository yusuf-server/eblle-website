// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  vite: {
    ssr: {
      external: ['node:util', 'node:stream', 'node:path', 'node:http', 'node:https', 'node:url', 'node:fs', 'node:crypto', 'node:net', 'node:tls', 'node:assert', 'node:tty', 'node:events', 'node:http2', 'node:zlib']
    }
  }
});
