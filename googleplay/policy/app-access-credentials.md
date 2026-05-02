# App Access — Test Credentials for Google Reviewers
## بيانات الوصول للمراجعين

> الوصول: Policy → App content → App access → Start / Manage
> قواعد مهمة: البيانات يجب أن تعمل دائماً من أي موقع، تتجاوز 2FA، باللغة الإنجليزية

---

## ⚠️ تحذيرات حرجة قبل البدء

1. **إذا انتهت صلاحية البيانات → يُرفض التطبيق** — تأكد أنها دائمة
2. **لا OTP / لا 2FA** — أنشئ حسابات reviewer مع إيقاف التحقق الثنائي
3. **اكتب التعليمات بالإنجليزي** حتى لو التطبيق بالعربية
4. يمكن إضافة حتى **5 مجموعات** من التعليمات

---

## مجموعة 1: Parent Account

```
Account Type: Parent Account

Email: reviewer_parent@classi-fy.com
Password: ClassifyReview2026!

Instructions:
1. Open the app and tap "Login"
2. Enter the email and password above
3. 2FA is DISABLED for this account — no verification code needed
4. The account already has 3 pre-linked children:
   - يوسف (Age 10) — linked & active
   - سارة (Age 8) — linked & active  
   - عمر (Age 6) — linked & active
5. Wallet is pre-loaded with 200 SAR for testing purchases
6. You can navigate: Dashboard, Tasks, Marketplace, Wallet, Reports

Notes:
- All push notifications are enabled
- Marketplace browse works without purchase; test wallet allows demo purchases
- Language is set to Arabic (RTL) — UI reads right-to-left
```

---

## مجموعة 2: Child Account

```
Account Type: Child Account

Email: reviewer_child@classi-fy.com
Password: ClassifyChild2026!
PIN: 1234

Instructions:
1. On the login screen, tap "Child Login"
2. Enter email and password
3. Enter PIN: 1234 when prompted
4. This child account (يوسف) is already linked to the parent account above
5. Growth Tree is at Stage 5 for demonstration
6. Several tasks are pre-assigned and ready to complete
7. Educational games are unlocked and playable

Notes:
- The parent account above can monitor all activities in real-time
- To see parent approve a help request: tap "?" on any task in the child view
```

---

## مجموعة 3: Teacher Account

```
Account Type: Teacher Account

Email: reviewer_teacher@classi-fy.com
Password: ClassifyTeacher2026!

Instructions:
1. Login with the above credentials
2. Navigate to "My Tasks" to see created educational tasks
3. Navigate to "My Sales" to see marketplace activity
4. Teacher profile shows: subjects, ratings, earnings
5. You can create a new task to test the teacher flow

Notes:
- This account has 15 pre-created tasks in the marketplace
- Balance shows sample earnings for demonstration
```

---

## معلومات تقنية إضافية

```
Production URL: https://classi-fy.com
Privacy Policy: https://classi-fy.com/privacy-policy
Terms of Service: https://classi-fy.com/terms
Delete Account: https://classi-fy.com/delete-account
Support Email: support@classi-fy.com

App Package: com.classi_fy.twa
Min Android Version: Android 6.0 (API 23)
Target Android Version: Android 15 (API 35)
```

---

## ⚙️ للمطور: كيفية إنشاء حسابات المراجعين

```bash
# 1. أنشئ الحسابات يدوياً من لوحة الإدمن
# 2. عطّل 2FA على كل حساب
# 3. ضع PIN ثابتاً (1234) للطفل
# 4. أضف رصيد للمحفظة
# 5. اربط الأطفال بحساب الوالد
# 6. تأكد أن البيانات تعمل على الموبايل والويب
# 7. حدّث هذا الملف عند تغيير أي كلمة مرور
```
