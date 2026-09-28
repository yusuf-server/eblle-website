#!/bin/bash

# 构建后脚本：生成 _routes.json 和 _worker.js

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

echo "生成 _worker.js..."

cat > dist/_worker.js << 'EOF'
import worker from './server/entry.mjs';
export default worker;
EOF

echo "_worker.js 已生成"
