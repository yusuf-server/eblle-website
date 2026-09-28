#!/bin/bash

# 构建后脚本：配置 Cloudflare Pages

echo "配置 Cloudflare Pages..."

# 删除 wrangler.json 以避免 Pages 部署时的配置冲突
if [ -f "dist/server/wrangler.json" ]; then
  echo "删除 wrangler.json（Pages 不需要）..."
  rm dist/server/wrangler.json
fi

# 生成 _routes.json 来控制路由
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
echo "✓ 构建输出目录应设置为: dist"
