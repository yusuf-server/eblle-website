#!/bin/bash

# 构建后脚本：配置 Cloudflare Pages

echo "配置 Cloudflare Pages..."

# 删除 wrangler 配置文件
if [ -f "dist/server/wrangler.json" ]; then
  echo "删除 wrangler.json..."
  rm dist/server/wrangler.json
fi

if [ -d ".wrangler" ]; then
  echo "删除 .wrangler 目录..."
  rm -rf .wrangler
fi

# 将 server 目录移到根目录，并重命名 entry.mjs 为 _worker.js
echo "创建 _worker.js..."
cp -r dist/server/* dist/
mv dist/entry.mjs dist/_worker.js 2>/dev/null || echo "entry.mjs 已是 _worker.js"

# 生成 _routes.json
cat > dist/_routes.json << 'EOF'
{
  "version": 1,
  "include": [
    "/*"
  ],
  "exclude": [
    "/_astro/*",
    "/favicon.ico",
    "/favicon.svg",
    "/scripts/*"
  ]
}
EOF

echo "✓ Cloudflare Pages 配置完成"
echo "✓ 构建输出目录: dist"
