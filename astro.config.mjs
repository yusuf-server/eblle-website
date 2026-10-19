// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    imageService: 'compile',
    platformProxy: {
      enabled: true // 必须开启以支持 cloudflare:workers 和本地 preview 绑定
    }
  }),
  vite: {
    ssr: {
      external: [
        'node:util', 'node:stream', 'node:path', 'node:http', 'node:https', 
        'node:url', 'node:fs', 'node:crypto', 'node:net', 'node:tls', 
        'node:assert', 'node:tty', 'node:events', 'node:http2', 'node:zlib'
      ]
    }
  }
});