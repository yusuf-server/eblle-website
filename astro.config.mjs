// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    // 不使用 platformProxy，避免生成 KV 和 ASSETS 绑定
    imageService: 'compile'
  }),
  vite: {
    ssr: {
      external: ['node:util', 'node:stream', 'node:path', 'node:http', 'node:https', 'node:url', 'node:fs', 'node:crypto', 'node:net', 'node:tls', 'node:assert', 'node:tty', 'node:events', 'node:http2', 'node:zlib']
    }
  }
});
