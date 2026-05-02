#!/bin/bash

echo "==================================="
echo "  Classify - إعداد المشروع"
echo "==================================="

if ! command -v node &> /dev/null; then
    echo "Node.js غير مثبت. يرجى تثبيت Node.js 18+ أولاً"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "npm غير مثبت. يرجى تثبيت npm أولاً"
    exit 1
fi

echo "تثبيت الحزم..."
npm install

if [ ! -f .env ]; then
    echo "إنشاء ملف .env..."
    cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/classify
JWT_SECRET=$(openssl rand -hex 32)
RESEND_API_KEY=your_resend_api_key
EOF
    echo "تم إنشاء ملف .env - يرجى تحديث القيم"
fi

echo "تهيئة قاعدة البيانات..."
npm run db:push

echo "==================================="
echo "  تم الإعداد بنجاح!"
echo "  لتشغيل المشروع: npm run dev"
echo "==================================="
