/**
 * Automated i18n replacement script for all component files.
 * Run with: node scripts/apply-i18n-replacements.cjs
 * 
 * This script:
 * 1. Adds useTranslation import to files that need it
 * 2. Adds const { t } = useTranslation() hook call
 * 3. Replaces hardcoded Arabic strings with t() calls
 */
const fs = require('fs');
const path = require('path');

const clientSrc = path.join(__dirname, '..', 'client', 'src');

function processFile(relPath, replacements, options = {}) {
  const filePath = path.join(clientSrc, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relPath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Step 1: Add useTranslation import if not present
  if (!content.includes('useTranslation')) {
    // Find a good spot to add it - after other imports
    if (content.includes("from 'react'") || content.includes('from "react"')) {
      content = content.replace(
        /(import\s+.*?from\s+['"]react['"];?\n)/,
        `$1import { useTranslation } from 'react-i18next';\n`
      );
    } else if (content.includes("from '@/")) {
      // Add before first @/ import
      content = content.replace(
        /(import\s+.*?from\s+['"]@\/)/,
        `import { useTranslation } from 'react-i18next';\n$1`
      );
    } else {
      // Add at top after first import
      content = content.replace(
        /(import\s+.*?;\n)/,
        `$1import { useTranslation } from 'react-i18next';\n`
      );
    }
  }
  
  // Step 2: Add const { t } = useTranslation() if not present
  if (!content.includes('useTranslation()') || 
      (content.includes('useTranslation') && !content.match(/const\s*\{[^}]*t[^}]*\}\s*=\s*useTranslation/))) {
    // Find the component function and add it after the first line
    if (options.hookLocation) {
      content = content.replace(options.hookLocation, options.hookReplacement);
    } else {
      // Try to find the main component function
      const patterns = [
        // export default function Component() {
        /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)\n/,
        // function Component() {
        /(function\s+\w+\s*\([^)]*\)\s*\{)\n/,
        // const Component = () => {
        /(const\s+\w+\s*(?::\s*React\.FC)?\s*=\s*\([^)]*\)\s*=>\s*\{)\n/,
        // export default function Component() { (no newline)
        /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/,
      ];
      
      let added = false;
      for (const pattern of patterns) {
        if (pattern.test(content) && !content.includes('const { t }')) {
          content = content.replace(pattern, `$1\n  const { t } = useTranslation();\n`);
          added = true;
          break;
        }
      }
      
      if (!added && !content.includes('const { t }')) {
        console.log(`⚠️  Could not auto-add hook in ${relPath} — needs manual placement`);
      }
    }
  }
  
  // Step 3: Apply all string replacements
  let replacementCount = 0;
  for (const [arabic, tKey] of replacements) {
    // Handle different patterns
    const escapedArabic = arabic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern 1: "Arabic text" or 'Arabic text' as standalone strings (JSX text, toast, etc.)
    // title: "Arabic", or title: 'Arabic'
    const patterns = [
      // toast({ title: "Arabic" })
      new RegExp(`(title:\\s*)["']${escapedArabic}["']`, 'g'),
      // description: "Arabic"
      new RegExp(`(description:\\s*)["']${escapedArabic}["']`, 'g'),
      // throw new Error("Arabic")
      new RegExp(`(throw new Error\\()["']${escapedArabic}["'](\\))`, 'g'),
      // placeholder="Arabic"
      new RegExp(`(placeholder=)["']${escapedArabic}["']`, 'g'),
      // >"Arabic"< or >"Arabic"
      new RegExp(`(>)${escapedArabic}(<)`, 'g'),
      // {" Arabic "} in JSX
      new RegExp(`(\\{["'])${escapedArabic}(["']\\})`, 'g'),
    ];
    
    // Do a simple global replacement for the Arabic text
    // First try exact matches in common patterns
    const simplePatterns = [
      [`"${arabic}"`, `t('${tKey}')`],
      [`'${arabic}'`, `t('${tKey}')`],
      [`\`${arabic}\``, `t('${tKey}')`],
    ];
    
    for (const [from, to] of simplePatterns) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        replacementCount++;
      }
    }
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${relPath}: ${replacementCount} replacements`);
  } else {
    console.log(`ℹ️  ${relPath}: no changes needed`);
  }
}

// ============================================================
// TEACHER DASHBOARD
// ============================================================
processFile('pages/TeacherDashboard.tsx', [
  // Error messages
  ['فشل رفع الملف', 'teacherDashboard.uploadFileFailed'],
  ['فشل رفع الملف إلى التخزين', 'teacherDashboard.uploadToStorageFailed'],
  ['فشل تأكيد رفع الملف', 'teacherDashboard.uploadFinalizeFailed'],
  // Toast messages
  ['تم إضافة المهمة بنجاح', 'teacherDashboard.taskAddedSuccess'],
  ['تم تحديث المهمة', 'teacherDashboard.taskUpdated'],
  ['تم حذف المهمة', 'teacherDashboard.taskDeleted'],
  ['تم نشر المنشور', 'teacherDashboard.postPublished'],
  ['تم حذف المنشور', 'teacherDashboard.postDeleted'],
  ['تم إرسال طلب السحب', 'teacherDashboard.withdrawalRequestSent'],
  ['تم إنشاء المهمة من القالب بنجاح', 'teacherDashboard.taskFromTemplateSuccess'],
  ['تم تحديث الملف الشخصي', 'teacherDashboard.profileUpdated'],
  ['تم إنشاء التصويت', 'teacherDashboard.pollCreated'],
  ['فشل إنشاء التصويت', 'teacherDashboard.pollCreateFailed'],
  ['تم تحديث التصويت', 'teacherDashboard.pollUpdated'],
  ['فشل التحديث', 'teacherDashboard.updateFailed'],
  ['تم حذف التصويت', 'teacherDashboard.pollDeleted'],
  ['فشل الحذف', 'teacherDashboard.deleteFailed'],
  // Validation
  ['سؤال التصويت مطلوب', 'teacherDashboard.pollQuestionRequired'],
  ['يجب إضافة خيارين على الأقل', 'teacherDashboard.minTwoOptionsRequired'],
  ['السؤال والسعر وإجابتين على الأقل مطلوبة', 'teacherDashboard.taskFormValidation'],
  ['يجب تحديد إجابة صحيحة واحدة على الأقل', 'teacherDashboard.correctAnswerRequired'],
  ['فشل رفع الملفات', 'teacherDashboard.uploadFilesFailed'],
  ['الفيديو يجب أن يكون أقل من 30 ثانية', 'teacherDashboard.videoMaxDuration'],
  ['يرجى اختيار صورة فقط', 'teacherDashboard.imageOnlyPlease'],
  ['فشل رفع الصورة', 'teacherDashboard.imageUploadFailed'],
  ['فشل رفع صورة الغلاف', 'teacherDashboard.coverUploadFailed'],
  ['السعر مطلوب', 'teacherDashboard.priceRequired'],
  ['حجم الصورة يجب أن يكون أقل من 5MB', 'teacherDashboard.imageSizeLimit'],
  // Header/Layout
  ['لوحة تحكم المعلم — ', 'teacherDashboard.headerTitle'],
  ['المعلم', 'teacherDashboard.teacherFallbackName'],
  ['تعرّف على المعلم على منصة Classify', 'teacherDashboard.shareDescription'],
  ['مشاركة', 'teacherDashboard.share'],
  // Stats
  ['المهام', 'teacherDashboard.statsTasks'],
  ['الرصيد المتاح', 'teacherDashboard.statsAvailableBalance'],
  ['الطلبات', 'teacherDashboard.statsOrders'],
  ['التقييم', 'teacherDashboard.statsRating'],
  // Tabs
  ['القوالب', 'teacherDashboard.tabTemplates'],
  ['المحفظة', 'teacherDashboard.tabWallet'],
  ['المنشورات', 'teacherDashboard.tabPosts'],
  ['التصويتات', 'teacherDashboard.tabPolls'],
  ['الملف الشخصي', 'teacherDashboard.tabProfile'],
  // Tasks tab
  ['إدارة المهام', 'teacherDashboard.manageTasks'],
  ['مهمة جديدة', 'teacherDashboard.newTask'],
  ['لم يتم إضافة مهام بعد', 'teacherDashboard.noTasksYet'],
  ['نشط', 'teacherDashboard.active'],
  ['غير نشط', 'teacherDashboard.inactive'],
  ['ج.م', 'teacherDashboard.currency'],
  ['شراء', 'teacherDashboard.purchases'],
  ['تعديل', 'teacherDashboard.edit'],
  ['هل تريد حذف هذه المهمة؟', 'teacherDashboard.confirmDeleteTask'],
  ['حذف', 'teacherDashboard.delete'],
  // Templates tab
  ['قوالب المهام الجاهزة', 'teacherDashboard.readyTemplates'],
  ['اختر مادة ثم اختر قالب لإنشاء مهمة جاهزة بسعرك', 'teacherDashboard.templateInstructions'],
  ['لا توجد قوالب لهذه المادة', 'teacherDashboard.noTemplatesForSubject'],
  ['إجابات', 'teacherDashboard.answers'],
  ['نقطة', 'teacherDashboard.point'],
  ['استخدام القالب', 'teacherDashboard.useTemplate'],
  // Orders tab
  ['لا توجد طلبات بعد', 'teacherDashboard.noOrdersYet'],
  ['مهمة', 'teacherDashboard.taskFallback'],
  ['المشتري:', 'teacherDashboard.buyer'],
  ['طالب', 'teacherDashboard.studentFallback'],
  ['تم التسوية', 'teacherDashboard.settled'],
  ['معلق', 'teacherDashboard.pending'],
  // Wallet tab
  ['الرصيد المعلق', 'teacherDashboard.pendingBalance'],
  ['إجمالي المسحوب', 'teacherDashboard.totalWithdrawn'],
  ['طلبات السحب', 'teacherDashboard.withdrawalRequests'],
  ['طلب سحب', 'teacherDashboard.requestWithdrawal'],
  ['لا توجد طلبات سحب', 'teacherDashboard.noWithdrawals'],
  ['صافي:', 'teacherDashboard.net'],
  ['عمولة', 'teacherDashboard.commission'],
  ['مقبول', 'teacherDashboard.approved'],
  ['مرفوض', 'teacherDashboard.rejected'],
  ['قيد المراجعة', 'teacherDashboard.underReview'],
  // Posts tab
  ['منشور جديد', 'teacherDashboard.newPost'],
  ['لا يوجد منشورات بعد', 'teacherDashboard.noPostsYet'],
  ['حذف؟', 'teacherDashboard.confirmDeleteShort'],
  // Polls tab
  ['إنشاء تصويت', 'teacherDashboard.createPoll'],
  ['لا يوجد تصويتات بعد', 'teacherDashboard.noPollsYet'],
  ['مثبت', 'teacherDashboard.pinned'],
  ['مغلق', 'teacherDashboard.closed'],
  ['منتهي', 'teacherDashboard.expired'],
  ['مجهول', 'teacherDashboard.anonymous'],
  ['متعدد', 'teacherDashboard.multiple'],
  ['مصوّت', 'teacherDashboard.voters'],
  ['إلغاء التثبيت', 'teacherDashboard.unpin'],
  ['تثبيت', 'teacherDashboard.pin'],
  ['فتح التصويت', 'teacherDashboard.openPoll'],
  ['إغلاق التصويت', 'teacherDashboard.closePoll'],
  ['حذف هذا التصويت؟', 'teacherDashboard.confirmDeletePoll'],
  // Profile tab
  ['جاري الرفع...', 'teacherDashboard.uploading'],
  ['تغيير الغلاف', 'teacherDashboard.changeCover'],
  ['لم يتم تحديد المادة', 'teacherDashboard.noSubjectSet'],
  ['عرض الصفحة العامة', 'teacherDashboard.viewPublicPage'],
  ['إلغاء', 'teacherDashboard.cancel'],
  ['منشور', 'teacherDashboard.statPost'],
  ['تقييم', 'teacherDashboard.statRating'],
  ['الاسم', 'teacherDashboard.name'],
  ['نبذة عني', 'teacherDashboard.aboutMe'],
  ['المادة', 'teacherDashboard.subject'],
  ['سنوات الخبرة', 'teacherDashboard.yearsExperience'],
  ['السوشيال ميديا', 'teacherDashboard.socialMedia'],
  ['حفظ التغييرات', 'teacherDashboard.saveChanges'],
  // Task Modal
  ['تعديل المهمة', 'teacherDashboard.editTask'],
  ['عنوان المهمة', 'teacherDashboard.taskTitle'],
  ['عنوان واضح للمهمة', 'teacherDashboard.taskTitlePlaceholder'],
  ['السؤال *', 'teacherDashboard.questionLabel'],
  ['السعر (ج.م) *', 'teacherDashboard.priceLabel'],
  ['تصنيف المادة', 'teacherDashboard.subjectCategory'],
  ['مثال: رياضيات', 'teacherDashboard.subjectPlaceholder'],
  ['الإجابات (حدد الصحيحة)', 'teacherDashboard.answersLabel'],
  ['حذف الإجابة', 'teacherDashboard.deleteAnswer'],
  ['صورة', 'teacherDashboard.image'],
  ['فيديو', 'teacherDashboard.video'],
  ['إضافة إجابة', 'teacherDashboard.addAnswer'],
  ['شرح الإجابة (اختياري)', 'teacherDashboard.explanationLabel'],
  ['صور مع السؤال', 'teacherDashboard.questionImages'],
  ['أضف صور توضيحية أو صور فقط مع السؤال', 'teacherDashboard.questionImagesHint'],
  ['إضافة', 'teacherDashboard.add'],
  ['الوسائط', 'teacherDashboard.media'],
  ['صورة رئيسية', 'teacherDashboard.mainImage'],
  ['غلاف', 'teacherDashboard.cover'],
  ['تحديث', 'teacherDashboard.update'],
  // Template Modal
  ['إنشاء مهمة من قالب', 'teacherDashboard.createFromTemplate'],
  ['حدد سعر المهمة', 'teacherDashboard.templatePricePlaceholder'],
  ['العنوان (اختياري)', 'teacherDashboard.templateTitleLabel'],
  ['جاري الإنشاء...', 'teacherDashboard.creating'],
  ['إنشاء المهمة', 'teacherDashboard.createTask'],
  // Post Modal
  ['اكتب محتوى المنشور...', 'teacherDashboard.postPlaceholder'],
  ['فيديو (30 ثانية كحد أقصى)', 'teacherDashboard.postVideo'],
  ['نشر', 'teacherDashboard.publish'],
  // Poll Modal
  ['إنشاء تصويت جديد', 'teacherDashboard.createNewPoll'],
  ['ما سؤال التصويت؟', 'teacherDashboard.pollQuestionPlaceholder'],
  ['الخيارات * (2-10)', 'teacherDashboard.pollOptionsLabel'],
  ['إضافة خيار', 'teacherDashboard.addOption'],
  ['السماح باختيار متعدد', 'teacherDashboard.allowMultiple'],
  ['تصويت مجهول', 'teacherDashboard.anonymousPoll'],
  ['تثبيت التصويت', 'teacherDashboard.pinPoll'],
  ['تاريخ الانتهاء (اختياري)', 'teacherDashboard.expiryDate'],
  ['إنشاء التصويت', 'teacherDashboard.createPollSubmit'],
  // Withdraw Modal
  ['أدخل المبلغ المراد سحبه', 'teacherDashboard.withdrawPlaceholder'],
  ['إرسال الطلب', 'teacherDashboard.submitRequest'],
]);

// ============================================================
// WALLET
// ============================================================
processFile('pages/Wallet.tsx', [
  ['💰 المحفظة', 'wallet.pageTitle'],
  ['إدارة الرصيد والإيداعات', 'wallet.pageSubtitle'],
  ['← رجوع', 'wallet.back'],
  ['الرصيد الحالي', 'wallet.currentBalance'],
  ['💳 إيداع أموال', 'wallet.depositFunds'],
  ['إجمالي الإيداع:', 'wallet.totalDeposited'],
  ['إجمالي المصروف:', 'wallet.totalSpent'],
  ['📋 سجل الإيداعات', 'wallet.depositHistory'],
  ['لا توجد إيداعات سابقة', 'wallet.noDeposits'],
  ['رقم العملية:', 'wallet.transactionId'],
  ['عرض إثبات التحويل', 'wallet.viewReceipt'],
  ['ملاحظات الإدارة:', 'wallet.adminNotes'],
  ['اختر وسيلة الدفع التي ستستخدمها', 'wallet.selectPaymentMethod'],
  ['لا توجد وسائل دفع متاحة', 'wallet.noPaymentMethods'],
  ['التالي ←', 'wallet.next'],
  ['تأكيد الإيداع', 'wallet.confirmDeposit'],
  ['قم بالتحويل للحساب التالي ثم أدخل المبلغ', 'wallet.confirmInstructions'],
  ['البنك:', 'wallet.bankName'],
  ['رقم الحساب:', 'wallet.accountNumber'],
  ['باسم:', 'wallet.accountName'],
  ['الهاتف:', 'wallet.phoneNumber'],
  ['المبلغ المحول *', 'wallet.amountLabel'],
  ['أدخل المبلغ', 'wallet.amountPlaceholder'],
  ['رقم العملية / المرجع البنكي *', 'wallet.transactionIdLabel'],
  ['مثال: TRX-2026-001234', 'wallet.transactionIdPlaceholder'],
  ['رابط إثبات التحويل (اختياري)', 'wallet.receiptUrlLabel'],
  ['ملاحظات (اختياري)', 'wallet.notesLabel'],
  ['جاري الإرسال...', 'wallet.submitting'],
  ['✅ إرسال الطلب للمراجعة', 'wallet.submitDeposit'],
  ['تم إرسال طلب الإيداع بنجاح!', 'wallet.depositSuccess'],
  ['سيتم مراجعته من الإدارة', 'wallet.depositPending'],
  ['حدث خطأ أثناء إرسال طلب الإيداع', 'wallet.depositError'],
  ['تحويل بنكي', 'wallet.paymentType.bankTransfer'],
  ['فودافون كاش', 'wallet.paymentType.vodafoneCash'],
  ['أورنج موني', 'wallet.paymentType.orangeMoney'],
  ['اتصالات موني', 'wallet.paymentType.etisalatCash'],
  ['وي باي', 'wallet.paymentType.wePay'],
  ['إنستاباي', 'wallet.paymentType.instapay'],
  ['فوري', 'wallet.paymentType.fawry'],
  ['محفظة إلكترونية', 'wallet.paymentType.mobileWallet'],
  ['بطاقة ائتمان', 'wallet.paymentType.creditCard'],
  ['أخرى', 'wallet.paymentType.other'],
  ['قيد المراجعة', 'wallet.statusPending'],
  ['مقبول ✓', 'wallet.statusCompleted'],
  ['مرفوض ✗', 'wallet.statusCancelled'],
]);

// ============================================================
// PARENT STORE
// ============================================================
processFile('pages/ParentStore.tsx', [
  ['كلاسيفاي ستور', 'parentStore.storeTitle'],
  ['رصيد المحفظة', 'parentStore.walletBalance'],
  ['الكل', 'parentStore.allCategories'],
  ['المكتبات', 'parentStore.libraries'],
  ['المتجر', 'parentStore.storeTab'],
  ['السلة', 'parentStore.cartTab'],
  ['طلباتي', 'parentStore.myOrdersTab'],
  ['مخزوني', 'parentStore.myInventory'],
  ['لا توجد طلبات بعد', 'parentStore.noOrdersYet'],
  ['تصفح المتجر واشترِ منتجات', 'parentStore.browseAndBuy'],
  ['تصفح المتجر', 'parentStore.browseStore'],
  ['طلب #', 'parentStore.orderNumber'],
  ['✅ مكتمل', 'parentStore.statusCompleted'],
  ['⏳ قيد المعالجة', 'parentStore.statusPending'],
  ['🔄 جاري التجهيز', 'parentStore.statusProcessing'],
  ['🚚 تم الشحن', 'parentStore.statusShipped'],
  ['❌ ملغي', 'parentStore.statusCancelled'],
  ['سلة التسوق', 'parentStore.shoppingCart'],
  ['السلة فارغة', 'parentStore.cartEmpty'],
  ['أضف منتجات من المتجر', 'parentStore.addProductsFromStore'],
  ['المجموع', 'parentStore.total'],
  ['إتمام الشراء', 'parentStore.completePurchase'],
  ['توصيل سريع', 'parentStore.fastDelivery'],
  ['ضمان الجودة', 'parentStore.qualityGuarantee'],
  ['دعم 24/7', 'parentStore.support247'],
  ['ترتيب حسب', 'parentStore.sortBy'],
  ['الأكثر مبيعاً', 'parentStore.sortFeatured'],
  ['السعر: الأقل', 'parentStore.sortPriceAsc'],
  ['السعر: الأعلى', 'parentStore.sortPriceDesc'],
  ['الأحدث', 'parentStore.sortNewest'],
  ['المنتجات المميزة', 'parentStore.featuredProducts'],
  ['مكتبة', 'parentStore.library'],
  ['شراء الآن', 'parentStore.buyNow'],
  ['المنتجات', 'parentStore.products'],
  ['نتائج البحث: ', 'parentStore.searchResults'],
  ['جميع المنتجات', 'parentStore.allProducts'],
  ['منتج', 'parentStore.productCount'],
  ['لا توجد منتجات', 'parentStore.noProducts'],
  ['جرب البحث بكلمات أخرى أو اختر فئة مختلفة', 'parentStore.tryDifferentSearch'],
  ['أضف', 'parentStore.addToCart'],
  ['يحتاج', 'parentStore.needsPoints'],
  ['تقييم', 'parentStore.reviews'],
  ['النقاط المطلوبة:', 'parentStore.requiredPointsLabel'],
  ['أضف للسلة', 'parentStore.addToCartFull'],
  ['المجموع:', 'parentStore.totalLabel'],
  ['شراء مباشر', 'parentStore.directPurchase'],
  ['عنوان الشحن', 'parentStore.shippingAddress'],
  ['الاسم الكامل', 'parentStore.fullName'],
  ['المدينة', 'parentStore.city'],
  ['العنوان التفصيلي', 'parentStore.detailedAddress'],
  ['المنطقة/الحي', 'parentStore.areaDistrict'],
  ['الرمز البريدي', 'parentStore.postalCode'],
  ['طريقة الدفع', 'parentStore.paymentMethod'],
  ['لا توجد طرق دفع متاحة', 'parentStore.noPaymentMethods'],
  ['ملخص الطلب', 'parentStore.orderSummary'],
  ['تأكيد الشراء', 'parentStore.confirmPurchase'],
  ['تعيين المنتج كهدية', 'parentStore.assignAsGift'],
  ['اختر الطفل', 'parentStore.selectChild'],
  ['اختر طفلاً...', 'parentStore.selectChildPlaceholder'],
  ['النقاط المطلوبة للحصول على الهدية', 'parentStore.requiredPointsForGift'],
  ['مثال: 100', 'parentStore.pointsExample'],
  ['سيحتاج الطفل جمع هذا العدد من النقاط للحصول على الهدية', 'parentStore.pointsHint'],
  ['جاري...', 'parentStore.assigningInProgress'],
  ['شراء وتعيين كهدية', 'parentStore.buyAndAssign'],
  ['أضف للسلة فقط', 'parentStore.addToCartOnly'],
]);

// ============================================================
// LIBRARY DASHBOARD
// ============================================================
processFile('pages/LibraryDashboard.tsx', [
  ['لوحة تحكم المكتبة', 'libraryDashboard.title'],
  ['تسجيل الخروج', 'libraryDashboard.logout'],
  ['المنتجات', 'libraryDashboard.products'],
  ['المبيعات', 'libraryDashboard.sales'],
  ['الإحالات', 'libraryDashboard.referrals'],
  ['نقاط النشاط', 'libraryDashboard.activityPoints'],
  ['رابط الإحالة', 'libraryDashboard.referralLink'],
  ['كود الإحالة', 'libraryDashboard.referralCode'],
  ['الطلبات', 'libraryDashboard.tabOrders'],
  ['سجل النشاط', 'libraryDashboard.tabActivity'],
  ['الأرباح والسحب', 'libraryDashboard.tabFinance'],
  ['منتجاتي', 'libraryDashboard.myProducts'],
  ['جاري التحميل...', 'libraryDashboard.loading'],
  ['هل تريد حذف هذا المنتج؟', 'libraryDashboard.confirmDeleteProduct'],
  ['لا توجد منتجات بعد', 'libraryDashboard.noProducts'],
  ['إضافة أول منتج', 'libraryDashboard.addFirstProduct'],
  ['زيارة', 'libraryDashboard.referralClicked'],
  ['تسجيل', 'libraryDashboard.referralRegistered'],
  ['لا توجد إحالات بعد', 'libraryDashboard.noReferrals'],
  ['شارك رابط الإحالة لكسب النقاط', 'libraryDashboard.shareReferralHint'],
  ['منتج مكتبة', 'libraryDashboard.libraryProduct'],
  ['المشتري:', 'libraryDashboard.buyer'],
  ['الكمية:', 'libraryDashboard.quantity'],
  ['الإجمالي:', 'libraryDashboard.total'],
  ['العنوان:', 'libraryDashboard.address'],
  ['الطلب بانتظار تأكيد الأدمن.', 'libraryDashboard.orderPendingAdmin'],
  ['تم الشحن', 'libraryDashboard.markShipped'],
  ['أدخل كود التسليم الذي أعطاه المشتري لرجل التوصيل:', 'libraryDashboard.enterDeliveryCode'],
  ['كود التسليم', 'libraryDashboard.deliveryCodePlaceholder'],
  ['تم التسليم', 'libraryDashboard.markDelivered'],
  ['تاريخ الإتاحة:', 'libraryDashboard.availabilityDate'],
  ['لا توجد طلبات حالياً', 'libraryDashboard.noOrders'],
  ['إضافة منتج', 'libraryDashboard.activityProductAdded'],
  ['تحديث منتج', 'libraryDashboard.activityProductUpdated'],
  ['لا يوجد نشاط بعد', 'libraryDashboard.noActivity'],
  ['الرصيد المتاح', 'libraryDashboard.availableBalance'],
  ['الرصيد المعلّق', 'libraryDashboard.pendingBalance'],
  ['إجمالي المبيعات', 'libraryDashboard.totalSales'],
  ['إجمالي العمولة', 'libraryDashboard.totalCommission'],
  ['طلب سحب أموال', 'libraryDashboard.requestWithdrawal'],
  ['المبلغ', 'libraryDashboard.amount'],
  ['تأكيد طلب السحب', 'libraryDashboard.confirmWithdrawal'],
  ['سجل طلبات السحب', 'libraryDashboard.withdrawalHistory'],
  ['لا توجد طلبات سحب بعد', 'libraryDashboard.noWithdrawals'],
  ['فواتير المبيعات اليومية', 'libraryDashboard.dailyInvoices'],
  ['طلبات:', 'libraryDashboard.invoiceOrders'],
  ['إجمالي:', 'libraryDashboard.invoiceGross'],
  ['صافي:', 'libraryDashboard.invoiceNet'],
  ['لا توجد فواتير يومية بعد', 'libraryDashboard.noInvoices'],
  ['جاري الرفع...', 'libraryDashboard.uploading'],
  ['تغيير الغلاف', 'libraryDashboard.changeCover'],
  ['العنوان *', 'libraryDashboard.productTitleLabel'],
  ['الوصف', 'libraryDashboard.productDescriptionLabel'],
  ['رابط الصورة', 'libraryDashboard.productImageUrlLabel'],
  ['اختيار من المعرض / الكاميرا', 'libraryDashboard.chooseFromGallery'],
  ['السعر *', 'libraryDashboard.productPriceLabel'],
  ['المخزون', 'libraryDashboard.productStockLabel'],
  ['نسبة الخصم %', 'libraryDashboard.discountPercentLabel'],
  ['الحد الأدنى للخصم', 'libraryDashboard.discountMinQuantityLabel'],
  ['إلغاء', 'libraryDashboard.cancel'],
  ['جاري الحفظ...', 'libraryDashboard.saving'],
  ['حفظ', 'libraryDashboard.save'],
  ['تم إضافة المنتج بنجاح', 'libraryDashboard.productAddedSuccess'],
  ['فشل إضافة المنتج', 'libraryDashboard.productAddFailed'],
  ['تم تحديث المنتج', 'libraryDashboard.productUpdated'],
  ['فشل تحديث المنتج', 'libraryDashboard.productUpdateFailed'],
  ['تم حذف المنتج', 'libraryDashboard.productDeleted'],
  ['فشل حذف المنتج', 'libraryDashboard.productDeleteFailed'],
  ['تم إرسال طلب السحب بنجاح', 'libraryDashboard.withdrawalRequestSent'],
  ['تم النسخ', 'libraryDashboard.copied'],
  ['تم رفع الصورة بنجاح', 'libraryDashboard.imageUploadSuccess'],
  ['فشل رفع الصورة', 'libraryDashboard.imageUploadFailed'],
  ['تم رفع صورة المكتبة', 'libraryDashboard.avatarUploaded'],
  ['تم رفع صورة الغلاف', 'libraryDashboard.coverUploaded'],
]);

// ============================================================
// TASK MARKETPLACE
// ============================================================
processFile('pages/TaskMarketplace.tsx', [
  ['سوق المهام', 'taskMarketplace.title'],
  ['مهام تعليمية من أفضل المعلمين', 'taskMarketplace.subtitle'],
  ['ابحث عن مهام، مواد...', 'taskMarketplace.searchPlaceholder'],
  ['الكل', 'taskMarketplace.all'],
  ['لا توجد مهام حالياً', 'taskMarketplace.noTasks'],
  ['جرّب تغيير معايير البحث', 'taskMarketplace.tryDifferentCriteria'],
  ['✓ مُشترى', 'taskMarketplace.purchased'],
  ['مُشترى ✓', 'taskMarketplace.purchasedBadge'],
  ['في السلة', 'taskMarketplace.inCart'],
  ['الأكثر مبيعاً', 'taskMarketplace.sortPopular'],
  ['الأحدث', 'taskMarketplace.sortNewest'],
  ['الأكثر إعجاباً', 'taskMarketplace.sortLikes'],
  ['الأقل سعراً', 'taskMarketplace.sortPriceLow'],
  ['الأعلى سعراً', 'taskMarketplace.sortPriceHigh'],
  ['حدث خطأ', 'taskMarketplace.errorOccurred'],
  ['تمت الإضافة للسلة ✓', 'taskMarketplace.addedToCart'],
]);

// ============================================================
// TASK CART
// ============================================================
processFile('pages/TaskCart.tsx', [
  ['سلة المهام', 'taskCart.title'],
  ['رصيد المحفظة', 'taskCart.walletBalance'],
  ['شحن', 'taskCart.topUp'],
  ['السلة فارغة', 'taskCart.cartEmpty'],
  ['تصفح سوق المهام وأضف المهام التي تناسب أطفالك', 'taskCart.emptyDescription'],
  ['تصفح المهام', 'taskCart.browseTasks'],
  ['بواسطة:', 'taskCart.by'],
  ['عدد المهام', 'taskCart.taskCount'],
  ['المجموع', 'taskCart.total'],
  ['جاري الشراء...', 'taskCart.purchasing'],
  ['تم الحذف من السلة', 'taskCart.removedFromCart'],
  ['تم الشراء بنجاح!', 'taskCart.purchaseSuccess'],
  ['فشل الشراء', 'taskCart.purchaseFailed'],
]);

// ============================================================
// CHILD STORE
// ============================================================
processFile('pages/ChildStore.tsx', [
  ['كلاسيفاي ستور', 'childStore.storeName'],
  ['ابحث...', 'childStore.searchPlaceholder'],
  ['رصيد النقاط', 'childStore.pointsBalance'],
  ['الكل', 'childStore.all'],
  ['المكتبات', 'childStore.libraries'],
  ['توصيل سريع', 'childStore.fastDelivery'],
  ['ضمان الجودة', 'childStore.qualityGuarantee'],
  ['دعم 24/7', 'childStore.support247'],
  ['ترتيب', 'childStore.sortPlaceholder'],
  ['الأكثر مبيعاً', 'childStore.bestSelling'],
  ['النقاط: الأقل', 'childStore.pointsLowest'],
  ['النقاط: الأعلى', 'childStore.pointsHighest'],
  ['الأحدث', 'childStore.newest'],
  ['التقييم', 'childStore.rating'],
  ['المنتجات المميزة', 'childStore.featuredProducts'],
  ['متاح لك', 'childStore.availableToYou'],
  ['مكتبة', 'childStore.library'],
  ['نقطة', 'childStore.point'],
  ['أضف', 'childStore.addBtn'],
  ['المنتجات', 'childStore.products'],
  ['جميع المنتجات', 'childStore.allProducts'],
  ['لا توجد منتجات', 'childStore.noProducts'],
  ['جرب البحث بكلمات أخرى', 'childStore.tryDifferentSearch'],
  ['أضف للسلة', 'childStore.addToCart'],
  ['سلة التسوق', 'childStore.shoppingCart'],
  ['السلة فارغة', 'childStore.cartEmpty'],
  ['المجموع:', 'childStore.totalLabel'],
  ['رصيدك الحالي:', 'childStore.currentBalance'],
  ['نقاطك غير كافية!', 'childStore.insufficientPoints'],
  ['العب لتكسب نقاط', 'childStore.playToEarn'],
  ['إتمام الشراء بالنقاط', 'childStore.completePurchasePoints'],
  ['تفاصيل المنتج', 'childStore.productDetails'],
  ['السعر', 'childStore.price'],
  ['رصيدك', 'childStore.yourBalanceShort'],
  ['نقاطك غير كافية', 'childStore.insufficientPointsAlt'],
]);

// ============================================================
// LIBRARY STORE
// ============================================================
processFile('pages/LibraryStore.tsx', [
  ['متجر المكتبات', 'libraryStore.storeTitle'],
  ['ابحث عن منتج...', 'libraryStore.searchPlaceholder'],
  ['المكتبات المتاحة', 'libraryStore.availableLibraries'],
  ['الكل', 'libraryStore.all'],
  ['لا توجد منتجات', 'libraryStore.noProducts'],
  ['لم يتم العثور على منتجات في هذه المكتبة', 'libraryStore.noProductsInLibrary'],
  ['أضف للسلة', 'libraryStore.addToCart'],
  ['شراء الآن', 'libraryStore.buyNow'],
  ['غير متوفر', 'libraryStore.outOfStock'],
  ['إضافة للسلة', 'libraryStore.addToCartAlt'],
  ['السلة فارغة', 'libraryStore.cartEmpty'],
  ['المجموع:', 'libraryStore.totalLabel'],
  ['إتمام الشراء', 'libraryStore.completePurchase'],
  ['شراء مباشر من المكتبات', 'libraryStore.directPurchaseTitle'],
  ['إتمام الشراء من المكتبات', 'libraryStore.checkoutTitle'],
  ['عنوان الشحن', 'libraryStore.shippingAddress'],
  ['الاسم الكامل', 'libraryStore.fullName'],
  ['المدينة', 'libraryStore.city'],
  ['العنوان التفصيلي', 'libraryStore.detailedAddress'],
  ['المنطقة/الحي', 'libraryStore.district'],
  ['الرمز البريدي', 'libraryStore.postalCode'],
  ['طريقة الدفع', 'libraryStore.paymentMethod'],
  ['لا توجد طرق دفع متاحة', 'libraryStore.noPaymentMethods'],
  ['ملخص الطلب', 'libraryStore.orderSummary'],
  ['جاري المعالجة...', 'libraryStore.processing'],
  ['تأكيد الشراء', 'libraryStore.confirmPurchase'],
  ['تم إنشاء الطلب بنجاح وهو الآن بانتظار موافقة الأدمن', 'libraryStore.orderCreatedSuccess'],
  ['فشل إتمام الشراء', 'libraryStore.purchaseFailed'],
  ['يرجى تسجيل دخول ولي الأمر أولاً لإتمام الشراء', 'libraryStore.loginRequired'],
  ['هذا المنتج غير متوفر حالياً', 'libraryStore.productUnavailable'],
  ['يرجى اختيار طريقة الدفع', 'libraryStore.selectPayment'],
  ['يرجى استكمال بيانات عنوان الشحن', 'libraryStore.completeShipping'],
]);

// ============================================================
// SCHOOL DASHBOARD
// ============================================================
processFile('pages/SchoolDashboard.tsx', [
  ['لوحة تحكم المدرسة', 'schoolDashboard.dashboardTitle'],
  ['تعديل المدرسة', 'schoolDashboard.editSchool'],
  ['تم نسخ كود الإحالة', 'schoolDashboard.referralCodeCopied'],
  ['تعرّف على المدرسة على منصة Classify', 'schoolDashboard.schoolShareDescription'],
  ['المعلمين', 'schoolDashboard.teachersCount'],
  ['الطلاب', 'schoolDashboard.students'],
  ['إدارة المعلمين', 'schoolDashboard.manageTeachers'],
  ['إضافة معلم', 'schoolDashboard.addTeacher'],
  ['بحث بالاسم أو اسم المستخدم أو التخصص...', 'schoolDashboard.teacherSearchPlaceholder'],
  ['الأحدث', 'schoolDashboard.newest'],
  ['الأقدم', 'schoolDashboard.oldest'],
  ['الأكثر نشاطًا', 'schoolDashboard.mostActive'],
  ['الأكثر طلابًا', 'schoolDashboard.mostStudents'],
  ['جارِ تحديث نتائج المعلمين...', 'schoolDashboard.updatingTeachers'],
  ['لم يتم إضافة معلمين بعد', 'schoolDashboard.noTeachersYet'],
  ['بدون تخصص', 'schoolDashboard.noSubject'],
  ['مهمة مباعة', 'schoolDashboard.tasksSold'],
  ['سنة خبرة', 'schoolDashboard.yearsExperience'],
  ['تعطيل', 'schoolDashboard.deactivate'],
  ['تفعيل', 'schoolDashboard.activate'],
  ['نقل', 'schoolDashboard.transfer'],
  ['منشور جديد', 'schoolDashboard.newPost'],
  ['لا يوجد منشورات بعد', 'schoolDashboard.noPostsYet'],
  ['معلم', 'schoolDashboard.teacher'],
  ['هل تريد حذف هذا المنشور؟', 'schoolDashboard.confirmDeletePost'],
  ['تعليق', 'schoolDashboard.comment'],
  ['جاري التحميل...', 'schoolDashboard.loading'],
  ['اكتب رداً...', 'schoolDashboard.writeReply'],
  ['الطلاب المسجلين', 'schoolDashboard.registeredStudents'],
  ['بحث باسم الطالب أو ولي الأمر...', 'schoolDashboard.studentSearchPlaceholder'],
  ['الاسم (أ-ي)', 'schoolDashboard.nameAsc'],
  ['الاسم (ي-أ)', 'schoolDashboard.nameDesc'],
  ['جارِ تحديث نتائج الطلاب...', 'schoolDashboard.updatingStudents'],
  ['لا يوجد طلاب مسجلين بعد', 'schoolDashboard.noStudentsYet'],
  ['ولي الأمر:', 'schoolDashboard.parentLabel'],
  ['السابق', 'schoolDashboard.previous'],
  ['صفحة', 'schoolDashboard.page'],
  ['من', 'schoolDashboard.of'],
  ['التالي', 'schoolDashboard.next'],
  ['التقييمات', 'schoolDashboard.reviewsHeader'],
  ['بحث باسم ولي الأمر أو نص التقييم...', 'schoolDashboard.reviewsSearchPlaceholder'],
  ['الأعلى تقييمًا', 'schoolDashboard.highestRated'],
  ['الأقل تقييمًا', 'schoolDashboard.lowestRated'],
  ['جارِ تحديث نتائج التقييمات...', 'schoolDashboard.updatingReviews'],
  ['لا يوجد تقييمات بعد', 'schoolDashboard.noReviewsYet'],
  ['ولي أمر', 'schoolDashboard.parentDefault'],
  ['حذف هذا التصويت؟', 'schoolDashboard.confirmDeletePoll'],
  ['سجل النشاط', 'schoolDashboard.activityLog'],
  ['لا يوجد نشاط بعد', 'schoolDashboard.noActivityYet'],
  ['تعديل البيانات', 'schoolDashboard.editData'],
  ['عرض الصفحة العامة', 'schoolDashboard.viewPublicPage'],
  ['إنشاء منشور', 'schoolDashboard.createPost'],
  ['تعديل المعلم', 'schoolDashboard.editTeacher'],
  ['إضافة معلم جديد', 'schoolDashboard.addNewTeacher'],
  ['الاسم *', 'schoolDashboard.nameLabel'],
  ['اسم المستخدم *', 'schoolDashboard.usernameLabel'],
  ['كلمة المرور الجديدة (اختياري)', 'schoolDashboard.newPasswordOptional'],
  ['كلمة المرور *', 'schoolDashboard.passwordLabel'],
  ['التخصص', 'schoolDashboard.subjectLabel'],
  ['سنوات الخبرة', 'schoolDashboard.yearsExpLabel'],
  ['تاريخ الميلاد', 'schoolDashboard.birthdayLabel'],
  ['رابط الصورة الشخصية', 'schoolDashboard.avatarUrlLabel'],
  ['رابط صورة الغلاف', 'schoolDashboard.coverImageUrlLabel'],
  ['السعر الشهري', 'schoolDashboard.monthlyRateLabel'],
  ['سعر المهمة', 'schoolDashboard.perTaskRateLabel'],
  ['نبذة', 'schoolDashboard.bioLabel'],
  ['تعديل المنشور', 'schoolDashboard.editPost'],
  ['اكتب محتوى المنشور...', 'schoolDashboard.postContentPlaceholder'],
  ['رفع صورة/فيديو', 'schoolDashboard.uploadMedia'],
  ['غير مثبت', 'schoolDashboard.unpinned'],
  ['تعديل بيانات المدرسة', 'schoolDashboard.editSchoolData'],
  ['الاسم العربي', 'schoolDashboard.arabicNameLabel'],
  ['صورة المدرسة', 'schoolDashboard.schoolImageLabel'],
  ['رفع من الجهاز', 'schoolDashboard.uploadFromDevice'],
  ['صورة الغلاف', 'schoolDashboard.coverImageLabel'],
  ['الهاتف', 'schoolDashboard.phoneLabel'],
  ['البريد', 'schoolDashboard.emailLabel'],
  ['العنوان', 'schoolDashboard.addressLabel'],
  ['المحافظة', 'schoolDashboard.governorateLabel'],
  ['إنشاء تصويت جديد', 'schoolDashboard.createNewPoll'],
  ['السؤال *', 'schoolDashboard.questionLabel'],
  ['ما سؤال التصويت؟', 'schoolDashboard.pollQuestionPlaceholder'],
  ['الخيارات * (2-10)', 'schoolDashboard.optionsLabel'],
  ['الخيار', 'schoolDashboard.optionPlaceholder'],
  ['إضافة خيار', 'schoolDashboard.addOption'],
  ['السماح باختيار متعدد', 'schoolDashboard.allowMultiple'],
  ['تصويت مجهول', 'schoolDashboard.anonymousVoting'],
  ['تثبيت التصويت', 'schoolDashboard.pinPoll'],
  ['تاريخ الانتهاء (اختياري)', 'schoolDashboard.expiryDateOptional'],
  ['إنشاء التصويت', 'schoolDashboard.createPollBtn'],
  ['نقل المعلم:', 'schoolDashboard.transferTeacher'],
  ['المدرسة المستهدفة *', 'schoolDashboard.targetSchoolLabel'],
  ['اختر مدرسة...', 'schoolDashboard.selectSchoolPlaceholder'],
  ['تقييم أداء المعلم * (1-5)', 'schoolDashboard.performanceRatingLabel'],
  ['تعليق على الأداء *', 'schoolDashboard.performanceCommentLabel'],
  ['اكتب تقييمك لأداء المعلم...', 'schoolDashboard.performanceCommentPlaceholder'],
  ['سبب النقل (اختياري)', 'schoolDashboard.transferReasonLabel'],
  ['سبب النقل...', 'schoolDashboard.transferReasonPlaceholder'],
  ['جاري النقل...', 'schoolDashboard.transferring'],
  ['تأكيد النقل', 'schoolDashboard.confirmTransfer'],
  ['المدرسة', 'schoolDashboard.school'],
  ['تم تحديث بيانات المدرسة', 'schoolDashboard.profileUpdateSuccess'],
  ['فشل التحديث', 'schoolDashboard.updateFailed'],
  ['تم إضافة المعلم', 'schoolDashboard.teacherAddSuccess'],
  ['فشل إضافة المعلم', 'schoolDashboard.teacherAddFailed'],
  ['تم تحديث بيانات المعلم', 'schoolDashboard.teacherUpdateSuccess'],
  ['فشل تحديث المعلم', 'schoolDashboard.teacherUpdateFailed'],
  ['تم حذف المعلم', 'schoolDashboard.teacherDeleteSuccess'],
  ['فشل حذف المعلم', 'schoolDashboard.teacherDeleteFailed'],
  ['تم نقل المعلم بنجاح', 'schoolDashboard.teacherTransferSuccess'],
  ['فشل نقل المعلم', 'schoolDashboard.teacherTransferFailed'],
  ['تم تحديث المنشور', 'schoolDashboard.postUpdateSuccess'],
  ['فشل تحديث المنشور', 'schoolDashboard.postUpdateFailed'],
  ['تم حذف المنشور', 'schoolDashboard.postDeleteSuccess'],
  ['فشل حذف المنشور', 'schoolDashboard.postDeleteFailed'],
  ['تم إرسال الرد', 'schoolDashboard.replySuccess'],
  ['فشل إرسال الرد', 'schoolDashboard.replyFailed'],
  ['تم إنشاء التصويت', 'schoolDashboard.pollCreateSuccess'],
  ['فشل إنشاء التصويت', 'schoolDashboard.pollCreateFailed'],
  ['تم تحديث التصويت', 'schoolDashboard.pollUpdateSuccess'],
  ['تم حذف التصويت', 'schoolDashboard.pollDeleteSuccess'],
  ['سؤال التصويت مطلوب', 'schoolDashboard.pollQuestionRequired'],
  ['يجب إضافة خيارين على الأقل', 'schoolDashboard.pollMinOptions'],
  ['يرجى اختيار صورة فقط', 'schoolDashboard.imageOnlyPlease'],
  ['تم رفع صورة المدرسة', 'schoolDashboard.schoolImageUploaded'],
  ['تم رفع صورة الغلاف', 'schoolDashboard.coverImageUploaded'],
  ['فشل رفع الصورة', 'schoolDashboard.imageUploadFailed'],
  ['الاسم واسم المستخدم وكلمة المرور مطلوبة', 'schoolDashboard.teacherFormRequired'],
  ['أضف محتوى أو وسائط', 'schoolDashboard.postContentRequired'],
  ['اسم المدرسة مطلوب', 'schoolDashboard.schoolNameRequired'],
  ['تمت إضافة معلم', 'schoolDashboard.activity.teacherAdded'],
  ['تم تحديث بيانات معلم', 'schoolDashboard.activity.teacherUpdated'],
  ['تم نقل معلم لمدرسة أخرى', 'schoolDashboard.activity.teacherTransferredOut'],
  ['تم استقبال معلم من مدرسة أخرى', 'schoolDashboard.activity.teacherTransferredIn'],
  ['تم إنشاء منشور', 'schoolDashboard.activity.postCreated'],
  ['تم تحديث ملف المدرسة', 'schoolDashboard.activity.profileUpdated'],
]);

// ============================================================
// SCHOOL LOGIN
// ============================================================
processFile('pages/SchoolLogin.tsx', [
  ['تسجيل دخول المدرسة', 'schoolLogin.title'],
  ['مرحباً', 'schoolLogin.welcome'],
  ['أدخل بيانات حسابك للوصول إلى لوحة التحكم', 'schoolLogin.description'],
  ['اسم المستخدم', 'schoolLogin.username'],
  ['أدخل اسم المستخدم', 'schoolLogin.enterUsername'],
  ['كلمة المرور', 'schoolLogin.password'],
  ['أدخل كلمة المرور', 'schoolLogin.enterPassword'],
  ['جاري تسجيل الدخول...', 'schoolLogin.loggingIn'],
  ['تسجيل الدخول', 'schoolLogin.login'],
  ['ليس لديك حساب؟', 'schoolLogin.noAccount'],
  ['تواصل مع الدعم لفتح حساب', 'schoolLogin.contactSupport'],
  ['يرجى إدخال اسم المستخدم وكلمة المرور', 'schoolLogin.enterCredentialsRequired'],
  ['فشل تسجيل الدخول', 'schoolLogin.loginFailed'],
]);

// ============================================================
// TEACHER LOGIN
// ============================================================
processFile('pages/TeacherLogin.tsx', [
  ['تسجيل دخول المعلم', 'teacherLogin.title'],
  ['مرحباً', 'teacherLogin.welcome'],
  ['أدخل بيانات حسابك للوصول إلى لوحة التحكم', 'teacherLogin.description'],
  ['اسم المستخدم', 'teacherLogin.username'],
  ['أدخل اسم المستخدم', 'teacherLogin.enterUsername'],
  ['كلمة المرور', 'teacherLogin.password'],
  ['أدخل كلمة المرور', 'teacherLogin.enterPassword'],
  ['جاري تسجيل الدخول...', 'teacherLogin.loggingIn'],
  ['تسجيل الدخول', 'teacherLogin.login'],
  ['يتم إنشاء حسابك من قبل المدرسة', 'teacherLogin.accountCreatedBySchool'],
  ['تواصل مع إدارة مدرستك للحصول على بيانات الدخول', 'teacherLogin.contactSchoolAdmin'],
  ['يرجى إدخال اسم المستخدم وكلمة المرور', 'teacherLogin.enterCredentialsRequired'],
  ['فشل تسجيل الدخول', 'teacherLogin.loginFailed'],
]);

// ============================================================
// LIBRARY LOGIN
// ============================================================
processFile('pages/LibraryLogin.tsx', [
  ['تسجيل دخول المكتبة', 'libraryLogin.title'],
  ['مرحباً', 'libraryLogin.welcome'],
  ['أدخل بيانات حسابك للوصول إلى لوحة التحكم', 'libraryLogin.description'],
  ['اسم المستخدم', 'libraryLogin.username'],
  ['أدخل اسم المستخدم', 'libraryLogin.enterUsername'],
  ['كلمة المرور', 'libraryLogin.password'],
  ['أدخل كلمة المرور', 'libraryLogin.enterPassword'],
  ['جاري تسجيل الدخول...', 'libraryLogin.loggingIn'],
  ['تسجيل الدخول', 'libraryLogin.login'],
  ['ليس لديك حساب؟', 'libraryLogin.noAccount'],
  ['تواصل مع الدعم لفتح حساب', 'libraryLogin.contactSupport'],
  ['يرجى إدخال اسم المستخدم وكلمة المرور', 'libraryLogin.enterCredentialsRequired'],
  ['فشل تسجيل الدخول', 'libraryLogin.loginFailed'],
]);

// ============================================================
// TEACHER PROFILE
// ============================================================
processFile('pages/TeacherProfile.tsx', [
  ['المدرس غير موجود', 'teacherProfile.notFound'],
  ['معلم على Classify', 'teacherProfile.teacherOnClassify'],
  ['تعرّف على المعلم', 'teacherProfile.meetTeacher'],
  ['على منصة Classify', 'teacherProfile.onClassifyPlatform'],
  ['سنة خبرة', 'teacherProfile.yearsExperience'],
  ['يعمل في:', 'teacherProfile.worksAt'],
  ['المهام', 'teacherProfile.tasks'],
  ['المنشورات', 'teacherProfile.posts'],
  ['لا توجد مهام متاحة حالياً', 'teacherProfile.noTasksAvailable'],
  ['مُشترى', 'teacherProfile.purchased'],
  ['في السلة', 'teacherProfile.inCart'],
  ['أضف للسلة', 'teacherProfile.addToCart'],
  ['لا توجد منشورات', 'teacherProfile.noPosts'],
  ['يجب تسجيل الدخول للإعجاب', 'teacherProfile.loginToLike'],
  ['أعجبني', 'teacherProfile.like'],
  ['جاري التحميل...', 'teacherProfile.loading'],
  ['اكتب تعليقاً...', 'teacherProfile.writeComment'],
  ['سجل دخول لكتابة تعليق', 'teacherProfile.loginToComment'],
  ['أضف تقييمك', 'teacherProfile.addYourReview'],
  ['شاركنا رأيك عن المعلم...', 'teacherProfile.shareOpinionTeacher'],
  ['جاري الإرسال...', 'teacherProfile.submitting'],
  ['إرسال التقييم', 'teacherProfile.submitReview'],
  ['لا توجد تقييمات بعد', 'teacherProfile.noReviewsYet'],
  ['ولي أمر', 'teacherProfile.parent'],
  ['فشل الإضافة', 'teacherProfile.addToCartFailed'],
  ['تمت الإضافة للسلة', 'teacherProfile.addedToCart'],
  ['فشل إرسال التقييم', 'teacherProfile.submitReviewFailed'],
  ['تم إرسال تقييمك بنجاح', 'teacherProfile.reviewSubmitted'],
  ['يجب تسجيل الدخول', 'teacherProfile.loginRequired'],
  ['فشل الإعجاب', 'teacherProfile.likeFailed'],
  ['تم إضافة التعليق', 'teacherProfile.commentAdded'],
  ['فشل إضافة التعليق', 'teacherProfile.commentFailed'],
]);

// ============================================================
// SCHOOL PROFILE
// ============================================================
processFile('pages/SchoolProfile.tsx', [
  ['المدرسة غير موجودة', 'schoolProfile.notFound'],
  ['تعرّف على', 'schoolProfile.discoverSchool'],
  ['على منصة Classify', 'schoolProfile.onClassifyPlatform'],
  ['حول', 'schoolProfile.aboutTab'],
  ['معلومات المدرسة', 'schoolProfile.schoolInfo'],
  ['انضمت في', 'schoolProfile.joinedIn'],
  ['كود الإحالة:', 'schoolProfile.referralCode'],
  ['وسائل التواصل', 'schoolProfile.socialMedia'],
  ['إحصائيات', 'schoolProfile.statistics'],
  ['عرض الكل', 'schoolProfile.showAll'],
  ['لا يوجد منشورات بعد', 'schoolProfile.noPostsYet'],
  ['عرض أقل', 'schoolProfile.showLess'],
  ['عرض المزيد', 'schoolProfile.showMore'],
  ['جاري تحميل التعليقات...', 'schoolProfile.loadingComments'],
  ['لا توجد تعليقات', 'schoolProfile.noComments'],
  ['لا يوجد تصويتات حالياً', 'schoolProfile.noPollsYet'],
  ['يمكن اختيار أكثر من إجابة', 'schoolProfile.multipleAnswers'],
  ['اختر إجابة واحدة فقط', 'schoolProfile.singleAnswer'],
  ['اختر إجابة واحدة على الأقل', 'schoolProfile.selectAtLeastOne'],
  ['جاري التصويت...', 'schoolProfile.voting'],
  ['تصويت', 'schoolProfile.vote'],
  ['صوت', 'schoolProfile.voteCount'],
  ['انتهى التصويت', 'schoolProfile.voteEnded'],
  ['ينتهي', 'schoolProfile.voteEndsAt'],
  ['حول المدرسة', 'schoolProfile.aboutSchool'],
  ['لم يتم إضافة وصف بعد', 'schoolProfile.noDescriptionYet'],
  ['معلومات التواصل', 'schoolProfile.contactInfo'],
  ['رقم الهاتف', 'schoolProfile.phoneNumber'],
  ['البريد الإلكتروني', 'schoolProfile.email'],
  ['صفحات التواصل الاجتماعي', 'schoolProfile.socialMediaPages'],
  ['معلومات عامة', 'schoolProfile.generalInfo'],
  ['تاريخ الانضمام', 'schoolProfile.joinDate'],
  ['حالة التوثيق', 'schoolProfile.verificationStatus'],
  ['موثقة ✓', 'schoolProfile.verified'],
  ['غير موثقة', 'schoolProfile.notVerified'],
  ['لا يوجد معلمين بعد', 'schoolProfile.noTeachersYet'],
  ['عرض الملف', 'schoolProfile.viewProfile'],
  ['شاركنا رأيك عن المدرسة...', 'schoolProfile.shareOpinionSchool'],
  ['فيسبوك', 'schoolProfile.socialFacebook'],
  ['انستجرام', 'schoolProfile.socialInstagram'],
  ['يوتيوب', 'schoolProfile.socialYoutube'],
  ['تويتر', 'schoolProfile.socialTwitter'],
  ['تيك توك', 'schoolProfile.socialTiktok'],
  ['الموقع الإلكتروني', 'schoolProfile.socialWebsite'],
  ['يجب تسجيل الدخول كولي أمر للتصويت', 'schoolProfile.loginToVote'],
  ['فشل التصويت', 'schoolProfile.voteFailed'],
  ['تم تسجيل تصويتك بنجاح', 'schoolProfile.voteRecorded'],
  ['تم إرسال تقييمك بنجاح', 'schoolProfile.reviewSubmitted'],
]);

// ============================================================
// LIBRARY PROFILE
// ============================================================
processFile('pages/LibraryProfile.tsx', [
  ['المكتبة غير موجودة', 'libraryProfile.notFound'],
  ['لا توجد منتجات متاحة حالياً', 'libraryProfile.noProducts'],
  ['لا توجد منشورات', 'libraryProfile.noPosts'],
  ['مثبّت', 'libraryProfile.pinned'],
  ['اكتب تعليقاً...', 'libraryProfile.writeComment'],
  ['أضف تقييمك', 'libraryProfile.addYourReview'],
  ['اكتب تعليقك (اختياري)...', 'libraryProfile.writeReviewOptional'],
  ['إرسال التقييم', 'libraryProfile.submitReview'],
  ['لا توجد تقييمات بعد', 'libraryProfile.noReviewsYet'],
  ['مستخدم', 'libraryProfile.user'],
  ['فشل', 'libraryProfile.failed'],
  ['فشل إرسال التقييم', 'libraryProfile.submitReviewFailed'],
  ['تم إرسال تقييمك بنجاح', 'libraryProfile.reviewSubmitted'],
]);

// ============================================================
// PARENT PROFILE
// ============================================================
processFile('pages/ParentProfile.tsx', [
  ['ملفي الشخصي', 'parentProfile.myProfile'],
  ['جاري الرفع...', 'parentProfile.uploading'],
  ['تغيير الغلاف', 'parentProfile.changeCover'],
  ['الأطفال', 'parentProfile.childrenLabel'],
  ['المكتبة', 'parentProfile.libraryTab'],
  ['المفضلة', 'parentProfile.favoritesTab'],
  ['المتابعة', 'parentProfile.followingTab'],
  ['مقترح', 'parentProfile.discoverTab'],
  ['مكتبتك فارغة', 'parentProfile.libraryEmpty'],
  ['اشترِ مهام من المعلمين لتظهر هنا', 'parentProfile.libraryEmptyHint'],
  ['بدون مادة', 'parentProfile.noSubject'],
  ['♾️ دائم', 'parentProfile.permanent'],
  ['1️⃣ مرة واحدة', 'parentProfile.oneTime'],
  ['استُخدمت', 'parentProfile.used'],
  ['مرة', 'parentProfile.times'],
  ['اختر طفل', 'parentProfile.selectChild'],
  ['إرسال', 'parentProfile.send'],
  ['لا توجد مهام مفضلة', 'parentProfile.noFavorites'],
  ['مهمة معلم', 'parentProfile.teacherTask'],
  ['مهمة قالب', 'parentProfile.templateTask'],
  ['لا تتابع أحداً بعد', 'parentProfile.notFollowingAnyone'],
  ['غير معروف', 'parentProfile.unknown'],
  ['مدرسة', 'parentProfile.school'],
  ['معلمون مقترحون', 'parentProfile.suggestedTeachers'],
  ['عام', 'parentProfile.general'],
  ['مدارس مقترحة', 'parentProfile.suggestedSchools'],
  ['مهام شائعة', 'parentProfile.popularTasks'],
  ['مشتري', 'parentProfile.buyers'],
  ['شراء', 'parentProfile.buy'],
  ['لا توجد اقتراحات حالياً', 'parentProfile.noSuggestions'],
  ['تابع مدارس ومعلمين لتحصل على اقتراحات أفضل', 'parentProfile.noSuggestionsHint'],
  ['تم ✅', 'parentProfile.taskSentSuccess'],
  ['تم إرسال المهمة للطفل', 'parentProfile.taskSentToChild'],
  ['خطأ', 'parentProfile.error'],
  ['فشل إرسال المهمة', 'parentProfile.taskSendFailed'],
  ['فشل رفع الملف', 'parentProfile.uploadFailed'],
  ['فشل رفع الملف إلى التخزين', 'parentProfile.uploadToStorageFailed'],
  ['فشل تأكيد رفع الملف', 'parentProfile.uploadConfirmFailed'],
  ['يرجى اختيار صورة فقط', 'parentProfile.selectImageOnly'],
  ['تم رفع الصورة الشخصية', 'parentProfile.avatarUploaded'],
  ['تم رفع صورة الغلاف', 'parentProfile.coverUploaded'],
  ['فشل رفع الصورة', 'parentProfile.imageUploadFailed'],
]);

console.log('\n✅ All component files processed!');
