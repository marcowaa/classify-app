#!/bin/bash

echo "==================================="
echo "  Classify - بدء التشغيل"
echo "==================================="

if [ ! -f .env ]; then
    echo "ملف .env غير موجود!"
    echo "يرجى تشغيل: ./scripts/setup.sh أولاً"
    exit 1
fi

if [ "$NODE_ENV" = "production" ]; then
    echo "تشغيل وضع الإنتاج..."
    npm run build
    npm run start
else
    echo "تشغيل وضع التطوير..."
    npm run dev
fi
