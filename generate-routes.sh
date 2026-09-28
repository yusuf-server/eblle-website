#!/bin/bash

# 构建后脚本：生成 _routes.json

echo "生成 _routes.json..."

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

echo "_routes.json 已生成"
