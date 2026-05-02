/**
 * Phase 2: Comprehensive i18n String Replacement Script
 * Replaces hardcoded Arabic strings with t() calls in ALL remaining files
 * 
 * Strategy:
 * 1. For each file, add useTranslation import + hook if missing
 * 2. Replace hardcoded Arabic strings with t('key') calls
 * 3. Handle isRTL ternary patterns
 */

const fs = require('fs');
const path = require('path');

const CLIENT_SRC = path.join(__dirname, '..', 'client', 'src');

// Files already processed in Phase 1 - SKIP
const ALREADY_PROCESSED = new Set([
  'TeacherDashboard.tsx', 'Wallet.tsx', 'ParentStore.tsx', 'LibraryDashboard.tsx',
  'TaskMarketplace.tsx', 'TaskCart.tsx', 'ChildStore.tsx', 'LibraryStore.tsx',
  'SchoolDashboard.tsx', 'SchoolLogin.tsx', 'TeacherLogin.tsx', 'LibraryLogin.tsx',
  'TeacherProfile.tsx', 'SchoolProfile.tsx', 'LibraryProfile.tsx', 'ParentProfile.tsx',
]);

let totalReplacements = 0;
let filesProcessed = 0;

/**
 * Process a single file with specific replacements
 */
function processFile(filePath, replacements, options = {}) {
  const fullPath = path.join(CLIENT_SRC, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️ File not found: ${filePath}`);
    return 0;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let count = 0;

  // Step 1: Add useTranslation import if needed
  if (!content.includes("from 'react-i18next'") && !content.includes('from "react-i18next"')) {
    // Add import after the first import line
    const firstImportEnd = content.indexOf('\n', content.indexOf('import '));
    if (firstImportEnd > -1) {
      content = content.slice(0, firstImportEnd + 1) +
        'import { useTranslation } from "react-i18next";\n' +
        content.slice(firstImportEnd + 1);
    }
  } else if (content.includes('from "react-i18next"') && !content.includes('useTranslation')) {
    // Has react-i18next import but not useTranslation
    content = content.replace(
      /from ["']react-i18next["']/,
      (m) => {
        const before = content.lastIndexOf('import', content.indexOf(m));
        const importLine = content.substring(before, content.indexOf(m) + m.length);
        if (importLine.includes('{')) {
          return m; // will try another approach
        }
        return m;
      }
    );
  }

  // Step 2: Add const { t } = useTranslation() in component if needed
  if (options.componentName && !options.skipHook) {
    const hookPattern = `const { t } = useTranslation()`;
    if (!content.includes(hookPattern) && !content.includes('const { t, i18n }') && !content.includes('const {t}')) {
      // Find the component function
      const patterns = [
        `export default function ${options.componentName}`,
        `export function ${options.componentName}`,
        `function ${options.componentName}`,
        `const ${options.componentName} =`,
      ];
      
      for (const pat of patterns) {
        const idx = content.indexOf(pat);
        if (idx > -1) {
          // Find the opening brace of the function body
          let braceIdx = content.indexOf('{', idx);
          if (content[braceIdx - 1] === '=' && content[braceIdx - 2] === '>') {
            // Arrow function with block body => {
          }
          if (braceIdx > -1) {
            const insertPos = braceIdx + 1;
            content = content.slice(0, insertPos) + `\n  const { t } = useTranslation();` + content.slice(insertPos);
            break;
          }
        }
      }
    }
  }

  // Step 3: Apply string replacements
  for (const [oldStr, newStr] of replacements) {
    // Count occurrences before replacement
    const regex = typeof oldStr === 'string' ? 
      new RegExp(escapeRegex(oldStr), 'g') : oldStr;
    const matches = content.match(regex);
    if (matches) {
      count += matches.length;
      content = content.replace(regex, newStr);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    totalReplacements += count;
    filesProcessed++;
    console.log(`  ✅ ${filePath}: ${count} replacements`);
  } else {
    console.log(`  ⏭️ ${filePath}: no changes needed`);
  }

  return count;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// ADMIN TABS
// ============================================================
console.log('\n📦 Processing Admin Tabs...\n');

// --- GamesTab.tsx ---
processFile('components/admin/GamesTab.tsx', [
  // Category labels (module-level array)
  ['"عام"', '"admin.games.catGeneral"'],
  ['"تعليمي"', '"admin.games.catEducational"'],
  ['"رياضيات"', '"admin.games.catMath"'],
  ['"لغات"', '"admin.games.catLanguages"'],
  ['"علوم"', '"admin.games.catScience"'],
  ['"ألغاز"', '"admin.games.catPuzzles"'],
  ['"إبداعي"', '"admin.games.catCreative"'],
  ['"رياضة"', '"admin.games.catSports"'],
  // Upload messages
  ['"❌ يجب أن يكون الملف بصيغة .html أو .htm"', '"❌ " + t("admin.games.uploadInvalidFormat")'],
  ['"❌ حجم الملف يجب أن لا يتجاوز 10MB"', '"❌ " + t("admin.games.uploadTooLarge")'],
  ['"⏳ جاري الرفع..."', '"⏳ " + t("admin.games.uploadInProgress")'],
  // JSX text - loading
  ['>جاري التحميل...</', '>{t("admin.games.loading")}</'],
  // JSX headings
  ['>إدارة الألعاب<', '>{t("admin.games.title")}<'],
  ['>إضافة لعبة<', '>{t("admin.games.addGame")}<'],
  ['>الدليل<', '>{t("admin.games.guide")}<'],
  // Stat labels
  ['>إجمالي الألعاب<', '>{t("admin.games.totalGames")}<'],
  [/>\s*مفعّلة\s*</g, '>{t("admin.games.enabled")}<'],
  [/>\s*معطّلة\s*</g, '>{t("admin.games.disabled")}<'],
  [/>\s*محلية\s*</g, '>{t("admin.games.local")}<'],
  [/>\s*خارجية\s*</g, '>{t("admin.games.external")}<'],
  // Guide section
  ['>دليل إضافة الألعاب الشامل<', '>{t("admin.games.guideTitle")}<'],
  ['>من الصفر حتى تشغيل اللعبة على المنصة<', '>{t("admin.games.guideSubtitle")}<'],
  ['>كيف يعمل نظام الألعاب؟<', '>{t("admin.games.howItWorks")}<'],
  ['>طرق إضافة الألعاب<', '>{t("admin.games.addMethods")}<'],
  ['>رابط خارجي (URL)<', '>{t("admin.games.externalUrl")}<'],
  ['>رفع ملف HTML<', '>{t("admin.games.uploadHtml")}<'],
  ['>مصادر ألعاب مجانية<', '>{t("admin.games.freeGameSources")}<'],
  ['>تنبيهات مهمة<', '>{t("admin.games.importantNotes")}<'],
  // Game form
  ['>تعديل لعبة<', '>{t("admin.games.editGame")}<'],
  ['>إضافة لعبة جديدة<', '>{t("admin.games.addNewGame")}<'],
  ['>اختر طريقة إضافة اللعبة:<', '>{t("admin.games.chooseMethod")}<'],
  ['>رفع ملف اللعبة<', '>{t("admin.games.uploadGameFile")}<'],
  ['>تغيير الطريقة<', '>{t("admin.games.changeMethod")}<'],
  ['>إضافة عبر رابط<', '>{t("admin.games.addViaLink")}<'],
  ['>عنوان اللعبة *<', '>{t("admin.games.gameTitle")}<'],
  ['placeholder="مثال: تحدي الرياضيات"', 'placeholder={t("admin.games.gameTitlePlaceholder")}'],
  ['>رابط التضمين (Embed URL) *<', '>{t("admin.games.embedUrl")}<'],
  ['>معاينة<', '>{t("admin.games.preview")}<'],
  ['placeholder="سيتم ملؤه تلقائياً بعد الرفع"', 'placeholder={t("admin.games.autoFillAfterUpload")}'],
  ['>الوصف<', '>{t("admin.games.description")}<'],
  ['placeholder="وصف مختصر يظهر للأطفال"', 'placeholder={t("admin.games.descPlaceholder")}'],
  ['>صورة مصغرة (URL)<', '>{t("admin.games.thumbnailUrl")}<'],
  ['>الفئة<', '>{t("admin.games.category")}<'],
  ['>النقاط لكل لعبة<', '>{t("admin.games.pointsPerGame")}<'],
  ['>الحد الأقصى مرات اللعب يومياً<', '>{t("admin.games.maxDailyPlays")}<'],
  ['placeholder="0 = بلا حدود"', 'placeholder={t("admin.games.noLimit")}'],
  ['>الحد الأدنى للعمر<', '>{t("admin.games.minAge")}<'],
  ['>الحد الأقصى للعمر<', '>{t("admin.games.maxAge")}<'],
  ['placeholder="اختياري"', 'placeholder={t("admin.games.optional")}'],
  ['>إلغاء<', '>{t("common.cancel")}<'],
  // Table headers
  ['>اللعبة<', '>{t("admin.games.colGame")}<'],
  ['>المصدر<', '>{t("admin.games.colSource")}<'],
  ['>النقاط<', '>{t("admin.games.colPoints")}<'],
  ['>حد يومي<', '>{t("admin.games.colDailyLimit")}<'],
  ['>العمر<', '>{t("admin.games.colAge")}<'],
  ['>الحالة<', '>{t("admin.games.colStatus")}<'],
  ['>إجراءات<', '>{t("admin.games.colActions")}<'],
  // Status/actions
  ['"تعطيل"', 't("admin.games.disable")'],
  ['"تفعيل"', 't("admin.games.enable")'],
  ['"مفعّل"', 't("admin.games.enabledStatus")'],
  ['"معطّل"', 't("admin.games.disabledStatus")'],
  ['>تفعيل الكل<', '>{t("admin.games.enableAll")}<'],
  ['>تعطيل الكل<', '>{t("admin.games.disableAll")}<'],
  ['>حذف الكل<', '>{t("admin.games.deleteAll")}<'],
  ['>إلغاء التحديد<', '>{t("admin.games.deselectAll")}<'],
  ['>لا توجد ألعاب<', '>{t("admin.games.noGames")}<'],
  // Footer stats
  ['>إجمالي:<', '>{t("admin.games.totalLabel")}<'],
  ['>مفعّل:<', '>{t("admin.games.enabledLabel")}<'],
  ['>معطّل:<', '>{t("admin.games.disabledLabel")}<'],
  ['>محلية:<', '>{t("admin.games.localLabel")}<'],
  ['>خارجية:<', '>{t("admin.games.externalLabel")}<'],
  ['>نتائج الفلتر:<', '>{t("admin.games.filterResults")}<'],
  // Delete modal
  ['>تأكيد الحذف<', '>{t("admin.games.confirmDelete")}<'],
  ['>حذف نهائي<', '>{t("admin.games.permanentDelete")}<'],
  ['>حذف جماعي<', '>{t("admin.games.bulkDelete")}<'],
  ['>تفعيل جماعي<', '>{t("admin.games.bulkEnable")}<'],
  ['>تعطيل جماعي<', '>{t("admin.games.bulkDisable")}<'],
  ['>تأكيد<', '>{t("admin.games.confirm")}<'],
  ['>معاينة اللعبة<', '>{t("admin.games.previewGame")}<'],
  // Search
  ['placeholder="بحث بالاسم أو الرابط..."', 'placeholder={t("admin.games.searchPlaceholder")}'],
  ['>كل الفئات<', '>{t("admin.games.allCategories")}<'],
  ['>كل الحالات<', '>{t("admin.games.allStatuses")}<'],
  ['>مفعّلة فقط<', '>{t("admin.games.enabledOnly")}<'],
  ['>معطّلة فقط<', '>{t("admin.games.disabledOnly")}<'],
  ['>الكل<', '>{t("admin.games.allAges")}<'],
  // Guide list items  
  ['>ألصق رابط اللعبة من أي موقع يدعم iframe<', '>{t("admin.games.externalUrlDesc")}<'],
  ['>لا يستهلك مساحة السيرفر<', '>{t("admin.games.noServerSpace")}<'],
  ['>يعتمد على توفر الموقع الخارجي<', '>{t("admin.games.dependsOnExternal")}<'],
  ['>ارفع ملف .html مباشرة من جهازك<', '>{t("admin.games.uploadHtmlDesc")}<'],
  ['>الرابط يتولّد تلقائياً<', '>{t("admin.games.autoGeneratedUrl")}<'],
  ['>أسرع وأكثر موثوقية<', '>{t("admin.games.fasterMoreReliable")}<'],
  ['>حد أقصى: 10MB لكل ملف<', '>{t("admin.games.maxFileSize")}<'],
  ['>أكبر مكتبة ألعاب HTML5 مجانية<', '>{t("admin.games.largestFreeLibrary")}<'],
  ['>مستودعات مفتوحة المصدر<', '>{t("admin.games.openSourceRepos")}<'],
  ['>ألعاب مجانية قابلة للتضمين<', '>{t("admin.games.freeEmbeddableGames")}<'],
  ['>مكتبة كبيرة مصنفة<', '>{t("admin.games.largeCategorizedLibrary")}<'],
  ['>صنع ألعاب بدون برمجة<', '>{t("admin.games.makeGamesNoCoding")}<'],
  ['>ألعاب صغيرة بـ HTML/CSS/JS<', '>{t("admin.games.smallHtmlGames")}<'],
  // Button text  
  ['>اسحب ملف HTML هنا أو اضغط للاختيار<', '>{t("admin.games.dropHtmlHere")}<'],
  ['>يقبل ملفات .html و .htm — حد أقصى 10MB<', '>{t("admin.games.acceptsHtml")}<'],
  // Form bottom  
  ['>تحديث<', '>{t("admin.games.updateBtn")}<'],
  ['>إنشاء اللعبة<', '>{t("admin.games.createGame")}<'],
], { componentName: 'GamesTab' });

// --- SchoolsTab.tsx ---
processFile('components/admin/SchoolsTab.tsx', [
  // Toast messages
  ['"تم إنشاء المدرسة بنجاح"', 't("admin.schools.schoolCreated")'],
  ['"تم تحديث المدرسة"', 't("admin.schools.schoolUpdated")'],
  ['"تم حذف المدرسة"', 't("admin.schools.schoolDeleted")'],
  ['"تم تحديث الإعدادات"', 't("admin.schools.settingsUpdated")'],
  ['"تم قبول طلب السحب"', 't("admin.schools.withdrawalAccepted")'],
  ['"تم رفض طلب السحب"', 't("admin.schools.withdrawalRejected")'],
  ['"تم تحديث بيانات المعلم"', 't("admin.schools.teacherUpdated")'],
  ['"تم حذف المعلم"', 't("admin.schools.teacherDeleted")'],
  ['"تم نقل المعلم بنجاح"', 't("admin.schools.teacherTransferred")'],
  ['"فشل تحميل التفاصيل"', 't("admin.schools.detailsLoadFailed")'],
  // Tabs
  ['>المدارس<', '>{t("admin.schools.title")}<'],
  ['>سحوبات المعلمين<', '>{t("admin.schools.teacherWithdrawals")}<'],
  ['>الإعدادات<', '>{t("admin.schools.settingsTab")}<'],
  // Search
  ['placeholder="بحث بالاسم أو اسم المستخدم..."', 'placeholder={t("admin.schools.searchPlaceholder")}'],
  ['>إضافة مدرسة<', '>{t("admin.schools.addSchool")}<'],
  ['>جار التحميل...<', '>{t("admin.schools.loading")}<'],
  ['>لا توجد مدارس<', '>{t("admin.schools.noSchools")}<'],
  ['"نشط"', 't("admin.schools.active")'],
  ['"معطل"', 't("admin.schools.inactive")'],
  ['>عمولة:<', '>{t("admin.schools.commission")}<'],
  ['>نشاط:<', '>{t("admin.schools.activity")}<'],
  ['>تفاصيل<', '>{t("admin.schools.details")}<'],
  ['>تعديل<', '>{t("admin.schools.edit")}<'],
  ['"هل تريد حذف هذه المدرسة؟"', 't("admin.schools.confirmDeleteSchool")'],
  ['>حذف<', '>{t("admin.schools.delete")}<'],
  // Withdrawals section
  ['>طلبات سحب المعلمين<', '>{t("admin.schools.teacherWithdrawTitle")}<'],
  ['>لا توجد طلبات سحب<', '>{t("admin.schools.noWithdrawals")}<'],
  ['"معلم"', 't("admin.schools.teacher")'],
  ['>المدرسة:<', '>{t("admin.schools.school")}<'],
  ['>المبلغ:<', '>{t("admin.schools.amount")}<'],
  ['>ر.س<', '>{t("admin.schools.currency")}<'],
  ['>صافي:<', '>{t("admin.schools.net")}<'],
  ['>عمولة السحب:<', '>{t("admin.schools.withdrawCommission")}<'],
  ['>الرصيد المتاح:<', '>{t("admin.schools.availableBalance")}<'],
  ['"مقبول"', 't("admin.schools.accepted")'],
  ['"مرفوض"', 't("admin.schools.rejected")'],
  ['"قيد المراجعة"', 't("admin.schools.pending")'],
  ['>قبول<', '>{t("admin.schools.accept")}<'],
  ['>رفض<', '>{t("admin.schools.reject")}<'],
  // Settings
  ['>إعدادات إحالة المدارس<', '>{t("admin.schools.referralSettings")}<'],
  ['>مكافأة الإحالة للمدرسة<', '>{t("admin.schools.schoolReferralReward")}<'],
  ['>مكافأة الإحالة لولي الأمر<', '>{t("admin.schools.parentReferralReward")}<'],
  ['>الحد الأدنى للسحب<', '>{t("admin.schools.minWithdrawal")}<'],
  ['>فترة الاحتفاظ بالأموال<', '>{t("admin.schools.holdPeriod")}<'],
  ['>يوم<', '>{t("admin.schools.day")}<'],
  ['>تعديل الإعدادات<', '>{t("admin.schools.editSettings")}<'],
  ['>لم يتم تعيين إعدادات بعد<', '>{t("admin.schools.noSettingsYet")}<'],
  // Add school dialog
  ['>إضافة مدرسة جديدة<', '>{t("admin.schools.addNewSchool")}<'],
  ['>اسم المدرسة *<', '>{t("admin.schools.schoolName")}<'],
  ['>اسم المستخدم *<', '>{t("admin.schools.username")}<'],
  ['>كلمة المرور *<', '>{t("admin.schools.password")}<'],
  ['>الوصف<', '>{t("admin.schools.descriptionLabel")}<'],
  ['>العنوان<', '>{t("admin.schools.address")}<'],
  ['>الهاتف<', '>{t("admin.schools.phone")}<'],
  ['>البريد<', '>{t("admin.schools.emailLabel")}<'],
  ['>الموقع<', '>{t("admin.schools.website")}<'],
  ['>عمولة المبيعات %<', '>{t("admin.schools.salesCommission")}<'],
  ['>عمولة السحب %<', '>{t("admin.schools.withdrawalCommission")}<'],
  ['>إلغاء<', '>{t("common.cancel")}<'],
  ['>إنشاء<', '>{t("admin.schools.createBtn")}<'],
  // Edit school
  ['>تعديل المدرسة<', '>{t("admin.schools.editSchool")}<'],
  ['>اسم المدرسة<', '>{t("admin.schools.schoolName")}<'],
  ['>اسم المستخدم<', '>{t("admin.schools.username")}<'],
  ['>كلمة المرور الجديدة (اختياري)<', '>{t("admin.schools.newPasswordOpt")}<'],
  ['>موثقة<', '>{t("admin.schools.verified")}<'],
  ['>تحديث<', '>{t("admin.schools.updateBtn")}<'],
  // Details
  ['>تفاصيل المدرسة<', '>{t("admin.schools.schoolDetails")}<'],
  ['>المعلمين<', '>{t("admin.schools.teachers")}<'],
  ['>الطلاب<', '>{t("admin.schools.students")}<'],
  ['>المنشورات<', '>{t("admin.schools.posts")}<'],
  ['>التقييمات<', '>{t("admin.schools.ratings")}<'],
  ['"بدون تخصص"', 't("admin.schools.noSpecialty")'],
  ['"غير نشط"', 't("admin.schools.inactiveStatus")'],
  ['>كود الإحالة:<', '>{t("admin.schools.referralCode")}<'],
  // Teacher stuff
  ['>تعديل إعدادات الإحالة<', '>{t("admin.schools.editReferralSettings")}<'],
  ['>تعديل بيانات المعلم<', '>{t("admin.schools.editTeacher")}<'],
  ['>الاسم<', '>{t("admin.schools.nameLabel")}<'],
  ['>التخصص<', '>{t("admin.schools.specialty")}<'],
  ['>نبذة<', '>{t("admin.schools.bio")}<'],
  ['>سنوات الخبرة<', '>{t("admin.schools.yearsExperience")}<'],
  ['>نسبة العمولة %<', '>{t("admin.schools.commissionPercent")}<'],
  ['>نشط<', '>{t("admin.schools.activeLabel")}<'],
  // Transfer  
  ['>نقل المعلم:<', '>{t("admin.schools.transferTeacher")}<'],
  ['>المدرسة المستهدفة *<', '>{t("admin.schools.targetSchool")}<'],
  ['placeholder="اختر مدرسة..."', 'placeholder={t("admin.schools.selectSchool")}'],
  ['>تقييم أداء المعلم * (1-5)<', '>{t("admin.schools.performanceRating")}<'],
  ['>تعليق على الأداء *<', '>{t("admin.schools.performanceComment")}<'],
  ['placeholder="اكتب تقييمك لأداء المعلم..."', 'placeholder={t("admin.schools.performanceCommentPlaceholder")}'],
  ['>سبب النقل (اختياري)<', '>{t("admin.schools.transferReason")}<'],
  ['placeholder="سبب النقل..."', 'placeholder={t("admin.schools.transferReasonPlaceholder")}'],
  ['"جاري النقل..."', 't("admin.schools.transferring")'],
  ['"تأكيد النقل"', 't("admin.schools.confirmTransfer")'],
  // Referral settings form
  ['>مكافأة إحالة المدرسة<', '>{t("admin.schools.referralRewardSchool")}<'],
  ['>مكافأة إحالة ولي الأمر<', '>{t("admin.schools.referralRewardParent")}<'],
  ['>فترة الاحتفاظ (أيام)<', '>{t("admin.schools.holdPeriodLabel")}<'],
  ['>حفظ<', '>{t("admin.schools.save")}<'],
], { componentName: 'SchoolsTab' });

// --- LibrariesTab.tsx ---
processFile('components/admin/LibrariesTab.tsx', [
  // Toasts
  ['"تم إضافة المكتبة بنجاح"', 't("admin.libraries.libraryAdded")'],
  ['"فشل إضافة المكتبة"', 't("admin.libraries.libraryAddFailed")'],
  ['"تم تحديث المكتبة"', 't("admin.libraries.libraryUpdated")'],
  ['"فشل تحديث المكتبة"', 't("admin.libraries.libraryUpdateFailed")'],
  ['"تم حذف المكتبة"', 't("admin.libraries.libraryDeleted")'],
  ['"فشل حذف المكتبة"', 't("admin.libraries.libraryDeleteFailed")'],
  ['"تم تحديث الإعدادات"', 't("admin.libraries.settingsUpdated")'],
  ['"فشل تحديث الإعدادات"', 't("admin.libraries.settingsUpdateFailed")'],
  ['"تم تحديث إعدادات المتجر"', 't("admin.libraries.storeSettingsUpdated")'],
  ['"فشل تحديث إعدادات المتجر"', 't("admin.libraries.storeSettingsUpdateFailed")'],
  ['"تم تأكيد الطلب وإرساله للمكتبة"', 't("admin.libraries.orderConfirmed")'],
  ['"فشل تأكيد الطلب"', 't("admin.libraries.orderConfirmFailed")'],
  ['"تم رفض الطلب"', 't("admin.libraries.orderRejected")'],
  ['"فشل رفض الطلب"', 't("admin.libraries.orderRejectFailed")'],
  ['"تمت الموافقة على طلب السحب"', 't("admin.libraries.withdrawalApproved")'],
  ['"فشل الموافقة على السحب"', 't("admin.libraries.withdrawalApproveFailed")'],
  ['"تم رفض طلب السحب وإرجاع الرصيد"', 't("admin.libraries.withdrawalRejected")'],
  ['"فشل رفض السحب"', 't("admin.libraries.withdrawalRejectFailed")'],
  ['"تم النسخ"', 't("admin.libraries.copied")'],
  // JSX text
  ['>جاري التحميل...<', '>{t("admin.libraries.loading")}<'],
  ['>فشل تحميل البيانات<', '>{t("admin.libraries.dataLoadFailed")}<'],
  ['placeholder="بحث بالاسم أو اسم المستخدم..."', 'placeholder={t("admin.libraries.searchPlaceholder")}'],
  ['>إعدادات الإحالة<', '>{t("admin.libraries.referralSettings")}<'],
  ['>إضافة مكتبة<', '>{t("admin.libraries.addLibrary")}<'],
  ['>غير نشط<', '>{t("admin.libraries.inactive")}<'],
  ['>منتج<', '>{t("admin.libraries.products")}<'],
  ['>مبيعات<', '>{t("admin.libraries.sales")}<'],
  ['>نقاط:<', '>{t("admin.libraries.pointsLabel")}<'],
  ['>عمولة:<', '>{t("admin.libraries.commissionLabel")}<'],
  ['"هل تريد حذف هذه المكتبة؟"', 't("admin.libraries.confirmDeleteLibrary")'],
  ['>طلبات المكتبات<', '>{t("admin.libraries.libraryOrders")}<'],
  ['>بانتظار التأكيد<', '>{t("admin.libraries.awaitingConfirmation")}<'],
  ['"منتج"', 't("admin.libraries.product")'],
  ['"مكتبة"', 't("admin.libraries.library")'],
  ['>المشتري:<', '>{t("admin.libraries.buyer")}<'],
  ['>الكمية:<', '>{t("admin.libraries.quantity")}<'],
  ['>تأكيد<', '>{t("admin.libraries.confirmBtn")}<'],
  ['>رفض<', '>{t("admin.libraries.rejectBtn")}<'],
  ['>لا توجد طلبات مكتبات حالياً<', '>{t("admin.libraries.noLibraryOrders")}<'],
  ['>طلبات سحب الأموال<', '>{t("admin.libraries.withdrawalRequests")}<'],
  ['>بانتظار المراجعة<', '>{t("admin.libraries.awaitingReview")}<'],
  ['>المبلغ:<', '>{t("admin.libraries.amountLabel")}<'],
  ['>الطريقة:<', '>{t("admin.libraries.methodLabel")}<'],
  ['>موافقة<', '>{t("admin.libraries.approveBtn")}<'],
  ['>لا توجد طلبات سحب حالياً<', '>{t("admin.libraries.noWithdrawalRequests")}<'],
  // Add library dialog
  ['>إضافة مكتبة جديدة<', '>{t("admin.libraries.addNewLibrary")}<'],
  ['>اسم المكتبة *<', '>{t("admin.libraries.libraryName")}<'],
  ['>الوصف<', '>{t("admin.libraries.descriptionLabel")}<'],
  ['>الموقع<', '>{t("admin.libraries.locationLabel")}<'],
  ['>رابط الصورة<', '>{t("admin.libraries.imageUrl")}<'],
  ['>اسم المستخدم *<', '>{t("admin.libraries.username")}<'],
  ['>كلمة المرور *<', '>{t("admin.libraries.password")}<'],
  ['>نسبة العمولة اليومية (%)<', '>{t("admin.libraries.dailyCommission")}<'],
  ['>نسبة العمولة المستقطعة من المبيعات اليومية<', '>{t("admin.libraries.dailyCommissionDesc")}<'],
  ['>إلغاء<', '>{t("common.cancel")}<'],
  ['"جاري الإضافة..."', 't("admin.libraries.adding")'],
  ['"إضافة"', 't("admin.libraries.addBtn")'],
  // Edit library
  ['>تعديل المكتبة<', '>{t("admin.libraries.editLibrary")}<'],
  ['>اسم المكتبة<', '>{t("admin.libraries.libraryName")}<'],
  ['>اسم المستخدم<', '>{t("admin.libraries.username")}<'],
  ['>كلمة المرور الجديدة (اتركها فارغة للإبقاء)<', '>{t("admin.libraries.newPasswordOpt")}<'],
  ['>نشط<', '>{t("admin.libraries.activeLabel")}<'],
  ['"جاري التحديث..."', 't("admin.libraries.updating")'],
  ['"حفظ"', 't("admin.libraries.saveBtn")'],
  // Details
  ['>المعلومات<', '>{t("admin.libraries.infoTab")}<'],
  ['>المنتجات<', '>{t("admin.libraries.productsTab")}<'],
  ['>النشاط<', '>{t("admin.libraries.activityTab")}<'],
  ['>نقاط النشاط<', '>{t("admin.libraries.activityPoints")}<'],
  ['>نسبة العمولة<', '>{t("admin.libraries.commissionRate")}<'],
  ['>إجمالي المبيعات<', '>{t("admin.libraries.totalSales")}<'],
  ['>كود الإحالة:<', '>{t("admin.libraries.referralCodeLabel")}<'],
  ['>رابط تسجيل الدخول:<', '>{t("admin.libraries.loginLink")}<'],
  ['>إجمالي المنتجات<', '>{t("admin.libraries.totalProducts")}<'],
  ['>الإحالات<', '>{t("admin.libraries.referrals")}<'],
  ['>ج.م<', '>{t("admin.libraries.currencyEGP")}<'],
  ['>في المخزون<', '>{t("admin.libraries.inStock")}<'],
  ['>لا توجد منتجات<', '>{t("admin.libraries.noProducts")}<'],
  ['>لا يوجد نشاط<', '>{t("admin.libraries.noActivity")}<'],
  // Settings
  ['>إعدادات المكتبات<', '>{t("admin.libraries.librarySettings")}<'],
  ['>إعدادات واجهة متجر المكتبات<', '>{t("admin.libraries.storeInterfaceSettings")}<'],
  ['>إظهار زر تبديل الثيم<', '>{t("admin.libraries.showThemeToggle")}<'],
  ['>إظهار أيقونة الإشعارات<', '>{t("admin.libraries.showNotificationIcon")}<'],
  ['>إعدادات الإحالات<', '>{t("admin.libraries.referralSettingsTitle")}<'],
  ['>نقاط لكل إحالة<', '>{t("admin.libraries.pointsPerReferral")}<'],
  ['>نقاط لكل عملية بيع<', '>{t("admin.libraries.pointsPerSale")}<'],
  ['>نقاط لكل منتج مضاف<', '>{t("admin.libraries.pointsPerProduct")}<'],
  ['>تفعيل نظام الإحالات<', '>{t("admin.libraries.enableReferrals")}<'],
], { componentName: 'LibrariesTab' });

// --- ProductsTab.tsx ---
processFile('components/admin/ProductsTab.tsx', [
  ['"رقمي"', 't("admin.products.typeDigital")'],
  ['"مادي"', 't("admin.products.typePhysical")'],
  ['"اشتراك"', 't("admin.products.typeSubscription")'],
  ['"تم إنشاء المنتج بنجاح"', 't("admin.products.productCreated")'],
  ['"فشل في إنشاء المنتج"', 't("admin.products.productCreateFailed")'],
  ['"تم تحديث المنتج بنجاح"', 't("admin.products.productUpdated")'],
  ['"فشل في تحديث المنتج"', 't("admin.products.productUpdateFailed")'],
  ['"تم حذف المنتج"', 't("admin.products.productDeleted")'],
  ['"فشل في حذف المنتج"', 't("admin.products.productDeleteFailed")'],
  ['"تم نسخ المنتج بنجاح"', 't("admin.products.productDuplicated")'],
  ['"فشل في نسخ المنتج"', 't("admin.products.productDuplicateFailed")'],
  ['" (نسخة)"', '" " + t("admin.products.copy")'],
  ['>إدارة المنتجات<', '>{t("admin.products.title")}<'],
  ['>إدارة المنتجات المعروضة في متجر الأطفال والآباء<', '>{t("admin.products.subtitle")}<'],
  ['>منتج جديد<', '>{t("admin.products.newProduct")}<'],
  ['>إجمالي المنتجات<', '>{t("admin.products.totalProducts")}<'],
  ['>منتجات نشطة<', '>{t("admin.products.activeProducts")}<'],
  ['>منتجات مميزة<', '>{t("admin.products.featuredProducts")}<'],
  ['>مخزون منخفض<', '>{t("admin.products.lowStock")}<'],
  ['placeholder="بحث عن منتج..."', 'placeholder={t("admin.products.searchPlaceholder")}'],
  ['>ترتيب:<', '>{t("admin.products.sortBy")}<'],
  ['"الأحدث"', 't("admin.products.sortNewest")'],
  ['"السعر"', 't("admin.products.sortPrice")'],
  ['"النقاط"', 't("admin.products.sortPoints")'],
  ['"المخزون"', 't("admin.products.sortStock")'],
  ['"الاسم"', 't("admin.products.sortName")'],
], { componentName: 'ProductsTab' });

// --- AdsTab.tsx ---
processFile('components/admin/AdsTab.tsx', [
  ['>إدارة الإعلانات<', '>{t("admin.ads.title")}<'],
  ['>إضافة إعلان<', '>{t("admin.ads.addAd")}<'],
  ['"الكل"', 't("admin.ads.all")'],
  ['"الآباء فقط"', 't("admin.ads.parentsOnly")'],
  ['"الأطفال فقط"', 't("admin.ads.childrenOnly")'],
  ['"عادي"', 't("admin.ads.normal")'],
  ['"مرتفع"', 't("admin.ads.high")'],
  ['"عاجل"', 't("admin.ads.urgent")'],
], { componentName: 'AdsTab' });

// --- ParentsTab.tsx ---
processFile('components/admin/ParentsTab.tsx', [
  ['"قيد المراجعة"', 't("admin.parents.pending")'],
  ['"مقبول"', 't("admin.parents.depositStatus.accepted")'],  
  ['"مرفوض"', 't("admin.parents.depositStatus.rejected")'],
  ['"مدفوع"', 't("admin.parents.depositStatus.paid")'],
  ['>إجمالي الآباء<', '>{t("admin.parents.totalParents")}<'],
  ['>موثقين<', '>{t("admin.parents.verifiedParents")}<'],
  ['>إجمالي الأطفال<', '>{t("admin.parents.totalChildren")}<'],
  ['placeholder="بحث بالاسم أو البريد..."', 'placeholder={t("admin.parents.searchPlaceholder")}'],
  ['>جاري التحميل...<', '>{t("admin.parents.loading")}<'],
], { componentName: 'ParentsTab' });

// --- SettingsTab.tsx ---
processFile('components/admin/SettingsTab.tsx', [
  ['"الافتراضي"', 't("admin.settingsTab.defaultSound")'],
  ['"رنين"', 't("admin.settingsTab.ringSound")'],
  ['"جرس"', 't("admin.settingsTab.bellSound")'],
  ['"فقاعة"', 't("admin.settingsTab.bubbleSound")'],
  ['"دينغ"', 't("admin.settingsTab.dingSound")'],
], { componentName: 'SettingsTab' });

// --- SubjectsTab.tsx ---
processFile('components/admin/SubjectsTab.tsx', [
  ['"المادة مطلوبة"', 't("admin.subjects.subjectRequired")'],
  ['>إدارة المواد الدراسية<', '>{t("admin.subjects.title")}<'],
  ['>مهام الآباء<', '>{t("admin.subjects.parentTasks")}<'],
], { componentName: 'SubjectsTab' });

// --- NotificationsTab.tsx ---
processFile('components/admin/NotificationsTab.tsx', [
  ['"إعلان"', 't("admin.notifications.announcement")'],
  ['"تنبيه"', 't("admin.notifications.alert")'],
  ['"نجاح"', 't("admin.notifications.success")'],
  ['"مهمة"', 't("admin.notifications.task")'],
  ['"مهمة مكتملة"', 't("admin.notifications.taskCompleted")'],
], { componentName: 'NotificationsTab' });

// --- NotificationSettingsTab.tsx ---
processFile('components/admin/NotificationSettingsTab.tsx', [
  ['"نافذة منبثقة صارمة"', 't("admin.notificationSettings.strictPopup")'],
  ['"إعلان ناعم"', 't("admin.notificationSettings.softAnnouncement")'],
  ['"دائرة عائمة"', 't("admin.notificationSettings.floatingCircle")'],
], { componentName: 'NotificationSettingsTab' });

// --- TaskNotificationLevelsTab.tsx ---
processFile('components/admin/TaskNotificationLevelsTab.tsx', [
  ['"داخل التطبيق فقط"', 't("admin.taskNotificationLevels.inAppOnly")'],
  ['"تصعيد أعلى"', 't("admin.taskNotificationLevels.higherEscalation")'],
  ['"تم الحفظ بنجاح"', 't("admin.taskNotificationLevels.saved")'],
], { componentName: 'TaskNotificationLevelsTab' });

// --- GiftsTab.tsx ---
processFile('components/admin/GiftsTab.tsx', [
  ['>إجمالي الهدايا<', '>{t("admin.gifts.totalGifts")}<'],
  ['>معلقة<', '>{t("admin.gifts.pendingGifts")}<'],
  ['>مسلمة<', '>{t("admin.gifts.deliveredGifts")}<'],
  ['>الفلترة<', '>{t("admin.gifts.filter")}<'],
], { componentName: 'GiftsTab' });

// --- SymbolsTab.tsx ---
processFile('components/admin/SymbolsTab.tsx', [
  ['"عام"', 't("admin.symbols.general")'],
  ['"تعليم"', 't("admin.symbols.education")'],
  ['"مكافآت"', 't("admin.symbols.rewards")'],
  ['"مهام"', 't("admin.symbols.tasks")'],
  ['"مشاعر"', 't("admin.symbols.emotions")'],
], { componentName: 'SymbolsTab' });

// --- LegalTab.tsx ---
processFile('components/admin/LegalTab.tsx', [
  ['"تم الحفظ"', 't("admin.legalTab.saved")'],
  ['"المحتوى قصير جداً"', 't("admin.legalTab.contentTooShort")'],
  ['>حذف<', '>{t("admin.legalTab.delete")}<'],
], { componentName: 'LegalTab' });

// --- ProfitSystemTab.tsx ---
processFile('components/admin/ProfitSystemTab.tsx', [
  ['>جاري التحميل...<', '>{t("admin.profitSystem.loading")}<'],
  ['>نظام الأرباح والعمولات<', '>{t("admin.profitSystem.title")}<'],
  ['>عمولة التطبيق<', '>{t("admin.profitSystem.appCommission")}<'],
], { componentName: 'ProfitSystemTab' });

// --- CategoriesTab.tsx ---
processFile('components/admin/CategoriesTab.tsx', [
  ['>أقسام المتجر<', '>{t("admin.categories.title")}<'],
  ['>إضافة قسم<', '>{t("admin.categories.addCategory")}<'],
  ['"نشط"', 't("admin.categories.active")'],
  ['"غير نشط"', 't("admin.categories.inactive")'],
], { componentName: 'CategoriesTab' });

// --- ReferralsTab.tsx ---  
processFile('components/admin/ReferralsTab.tsx', [
  ['"تم الحفظ"', 't("admin.referrals.saved")'],
  ['"نشط"', 't("admin.referrals.active")'],
  ['"معلق"', 't("admin.referrals.suspended")'],
  ['"تم المكافأة"', 't("admin.referrals.rewarded")'],
], { componentName: 'ReferralsTab' });

// --- PaymentMethodsTab.tsx ---
processFile('components/admin/PaymentMethodsTab.tsx', [
  ['"تحويل بنكي"', 't("admin.paymentMethods.bankTransfer")'],
  ['"فودافون كاش"', 't("admin.paymentMethods.vodafoneCash")'],
  ['"أورنج موني"', 't("admin.paymentMethods.orangeMoney")'],
], { componentName: 'PaymentMethodsTab' });

// --- DepositsTab.tsx ---
processFile('components/admin/DepositsTab.tsx', [
  ['"تحويل بنكي"', 't("admin.deposits.bankTransfer")'],
  ['"فودافون كاش"', 't("admin.deposits.vodafoneCash")'],
  ['"مكتمل"', 't("admin.deposits.completed")'],
], { componentName: 'DepositsTab' });

// --- MobileAppSettingsTab.tsx ---
processFile('components/admin/MobileAppSettingsTab.tsx', [
  ['"كلاسيفاي"', 't("admin.mobileApp.appNameDefault")'],
  ['"منصة تعليمية ممتعة للأطفال"', 't("admin.mobileApp.appDescDefault")'],
], { componentName: 'MobileAppSettingsTab' });

// --- ChildGameManager.tsx ---
processFile('components/admin/ChildGameManager.tsx', [
  ['>إدارة ألعاب الطفل<', '>{t("admin.childGameManager.title")}<'],
  ['>تحديد الكل<', '>{t("admin.childGameManager.selectAll")}<'],
  ['>إلغاء الكل<', '>{t("admin.childGameManager.deselectAll")}<'],
], { componentName: 'ChildGameManager' });

// --- TasksTab.tsx ---
processFile('components/admin/TasksTab.tsx', [
  ['"سهل"', 't("admin.tasksTab.easy")'],
  ['"متوسط"', 't("admin.tasksTab.medium")'],
  ['"صعب"', 't("admin.tasksTab.hard")'],
], { componentName: 'TasksTab' });

// ============================================================
// PAGES
// ============================================================
console.log('\n📄 Processing Pages...\n');

// --- ParentDashboard.tsx ---
processFile('pages/ParentDashboard.tsx', [
  ['"تم إضافة الطفل بنجاح ✅"', 't("parentDashboard.childAdded")'],
  ['"فشل إضافة الطفل"', 't("parentDashboard.childAddFailed")'],
  ['"تم تعيين رمز PIN ✅"', 't("parentDashboard.pinSet")'],
], { componentName: 'ParentDashboard', skipHook: true });

// --- DownloadApp.tsx ---
processFile('pages/DownloadApp.tsx', [
  // Replace isRTL ternaries 
  [/isRTL\s*\?\s*"رقابة أبوية ذكية"/g, 'isRTL ? t("downloadApp.smartParentalControl")'],
  [/isRTL\s*\?\s*"تطبيق سهل الاستخدام"/g, 'isRTL ? t("downloadApp.easyToUse")'],
], { componentName: 'DownloadApp', skipHook: true });

// --- AdminAuth.tsx ---
processFile('pages/AdminAuth.tsx', [
  ['"تم إرسال رابط الاستعادة"', 't("adminAuth.recoveryLinkSent")'],
  [/isRTL\s*\?\s*"استعادة كلمة المرور"/g, 'isRTL ? t("adminAuth.recoverPassword")'],
], { componentName: 'AdminAuth', skipHook: true });

// --- SettingsPro.tsx --- 
processFile('pages/SettingsPro.tsx', [
  ['>⚙️ الإعدادات<', '>{t("settingsPro.title")}<'],
  ['>← رجوع<', '>{t("settingsPro.back")}<'],
  ['>👤 البيانات الشخصية<', '>{t("settingsPro.personalData")}<'],
], { componentName: 'SettingsPro', skipHook: true });

// --- SubjectTasks.tsx ---
processFile('pages/SubjectTasks.tsx', [
  ['"تم إرسال المهمة للطفل بنجاح!"', 't("subjectTasks.taskSentSuccess")'],
  ['>العودة<', '>{t("subjectTasks.back")}<'],
  ['>مهام كلاسي<', '>{t("subjectTasks.classiTasks")}<'],
], { componentName: 'SubjectTasks' });

// --- ParentInventory.tsx ---
processFile('pages/ParentInventory.tsx', [
  ['"بانتظار موافقة الإدارة"', 't("parentInventory.awaitingApproval")'],
  ['"متاح للتعيين"', 't("parentInventory.availableToAssign")'],
  ['"مُعيّن لطفل"', 't("parentInventory.assignedToChild")'],
], { componentName: 'ParentInventory' });

// --- PrivacyPolicy.tsx ---
processFile('pages/PrivacyPolicy.tsx', [
  ['>سياسة الخصوصية<', '>{t("privacyPolicy.title")}<'],
  ['>مقدمة<', '>{t("privacyPolicy.introduction")}<'],
  ['>المعلومات التي نجمعها<', '>{t("privacyPolicy.infoWeCollect")}<'],
], { componentName: 'PrivacyPolicy' });

// --- Notifications.tsx ---
processFile('pages/Notifications.tsx', [
  ['"تم القبول"', 't("notificationsPage.accepted")'],
  ['"تم إرسال الكود للطفل"', 't("notificationsPage.codeSentToChild")'],
  ['"تم التعليم"', 't("notificationsPage.markedAsLearned")'],
], { componentName: 'Notifications', skipHook: true });

// --- ChildProgress.tsx ---
processFile('pages/ChildProgress.tsx', [
  ['>رجوع<', '>{t("childProgress.back")}<'],
  ['>مستوى السرعة<', '>{t("childProgress.speedLevel")}<'],
  ['>نقطة/يوم<', '>{t("childProgress.pointsPerDay")}<'],
  ['>مهمة منجزة<', '>{t("childProgress.completedTask")}<'],
], { componentName: 'ChildProgress', skipHook: true });

// --- ParentAuth.tsx ---
processFile('pages/ParentAuth.tsx', [
  ['"جاري التحقق من الجلسة..."', 't("parentAuth.checkingSession")'],
  ['>"📧 البريد"<', '>{t("parentAuth.emailLabel")}<'],
], { componentName: 'ParentAuth', skipHook: true });

// --- ChildNotifications.tsx ---
processFile('pages/ChildNotifications.tsx', [
  ['>الإشعارات<', '>{t("childNotifications.title")}<'],
  ['>جديد<', '>{t("childNotifications.new")}<'],
], { componentName: 'ChildNotifications', skipHook: true });

// --- Subjects.tsx ---
processFile('pages/Subjects.tsx', [
  ['>📚 المواد الدراسية<', '>{t("subjects.title")}<'],
  ['>← رجوع<', '>{t("subjects.back")}<'],
], { componentName: 'Subjects', skipHook: true });

// --- OTPVerification.tsx ---
processFile('pages/OTPVerification.tsx', [
  ['"رمز خاطئ"', 't("otpVerification.wrongCode")'],
  ['>🔐 التحقق من الهوية<', '>{t("otpVerification.title")}<'],
], { componentName: 'OTPVerification' });

// --- ChildTasks.tsx ---
processFile('pages/ChildTasks.tsx', [
  ['"أحسنت!"', 't("childTasks.wellDone")'],
  ['>مهمة<', '>{t("childTasks.task")}<'],
  ['>مهام مكتملة<', '>{t("childTasks.completedTasks")}<'],
  ['"جاري الإرسال..."', 't("childTasks.sending")'],
], { componentName: 'ChildTasks', skipHook: true });

// --- ChildSettings.tsx ---
processFile('pages/ChildSettings.tsx', [
  [/isRTL\s*\?\s*"تم تغيير اللغة"/g, 'isRTL ? t("childSettings.languageChanged")'],
  ['"العربية"', 't("childSettings.arabic")'],
  [/isRTL\s*\?\s*"مرحباً"/g, 'isRTL ? t("childSettings.welcome")'],
], { componentName: 'ChildSettings', skipHook: true });

// --- ChildGames.tsx ---
processFile('pages/ChildGames.tsx', [
  [/isRTL\s*\?\s*"مرحباً"/g, 'isRTL ? t("childGames.welcome")'],
  [/isRTL\s*\?\s*"نتيجتك"/g, 'isRTL ? t("childGames.yourScore")'],
], { componentName: 'ChildGames', skipHook: true });

// --- ForgotPassword.tsx ---
processFile('pages/ForgotPassword.tsx', [
  ['"انتهت صلاحية الرمز"', 't("forgotPassword.codeExpired")'],
], { componentName: 'ForgotPassword', skipHook: true });

// --- Settings.tsx ---
processFile('pages/Settings.tsx', [
  ['>🏢 المحافظة<', '>{t("settings.governorate")}<'],
  ['>🏙️ المدينة<', '>{t("settings.city")}<'],
  ['>📝 نبذة عنك<', '>{t("settings.bio")}<'],
], { componentName: 'Settings', skipHook: true });

// --- AssignTask.tsx ---
processFile('pages/AssignTask.tsx', [
  ['>رصيدك:<', '>{t("assignTask.balance")}<'],
  ['"رصيدك غير كافي"', 't("assignTask.insufficientBalance")'],
], { componentName: 'AssignTask', skipHook: true });

// --- CreateTask.tsx ---
processFile('pages/CreateTask.tsx', [
  ['"كود الربط الخاص بك"', 't("createTask.linkingCode")'],
  ['"رصيدك غير كافي"', 't("createTask.insufficientBalance")'],
], { componentName: 'CreateTask', skipHook: true });

// --- ParentTasks.tsx ---
processFile('pages/ParentTasks.tsx', [
  ['>الرصيد:<', '>{t("parentTasks.balanceLabel")}<'],
  ['"رصيدك غير كافي"', 't("parentTasks.insufficientBalance")'],
], { componentName: 'ParentTasks', skipHook: true });

// --- ChildProfile.tsx ---
processFile('pages/ChildProfile.tsx', [
  ['"يرجى اختيار صورة فقط"', 't("childProfile.pleaseSelectImage")'],
], { componentName: 'ChildProfile', skipHook: true });

// ============================================================
// SHARED COMPONENTS
// ============================================================
console.log('\n🧩 Processing Shared Components...\n');

// --- PhoneInput.tsx ---
processFile('components/PhoneInput.tsx', [
  ['"السعودية"', 't("phoneInput.saudiArabia")'],
  ['"مصر"', 't("phoneInput.egypt")'],
  ['"الإمارات"', 't("phoneInput.uae")'],
  ['"قطر"', 't("phoneInput.qatar")'],
  ['"الكويت"', 't("phoneInput.kuwait")'],
  ['"البحرين"', 't("phoneInput.bahrain")'],
  ['"عُمان"', 't("phoneInput.oman")'],
  ['"الأردن"', 't("phoneInput.jordan")'],
  ['"العراق"', 't("phoneInput.iraq")'],
  ['"لبنان"', 't("phoneInput.lebanon")'],
  ['"فلسطين"', 't("phoneInput.palestine")'],
  ['"ليبيا"', 't("phoneInput.libya")'],
  ['"تونس"', 't("phoneInput.tunisia")'],
  ['"الجزائر"', 't("phoneInput.algeria")'],
  ['"المغرب"', 't("phoneInput.morocco")'],
  ['"السودان"', 't("phoneInput.sudan")'],
  ['"اليمن"', 't("phoneInput.yemen")'],
  ['"سوريا"', 't("phoneInput.syria")'],
  ['"موريتانيا"', 't("phoneInput.mauritania")'],
  ['"الصومال"', 't("phoneInput.somalia")'],
  ['"جيبوتي"', 't("phoneInput.djibouti")'],
  ['"جزر القمر"', 't("phoneInput.comoros")'],
  ['"تركيا"', 't("phoneInput.turkey")'],
  ['"أمريكا"', 't("phoneInput.usa")'],
  ['"بريطانيا"', 't("phoneInput.uk")'],
  ['"فرنسا"', 't("phoneInput.france")'],
  ['"ألمانيا"', 't("phoneInput.germany")'],
  ['placeholder="بحث عن دولة..."', 'placeholder={t("phoneInput.searchCountry")}'],
], { componentName: 'PhoneInput' });

// --- ShareMenu.tsx ---
processFile('components/ui/ShareMenu.tsx', [
  ['>مشاركة<', '>{t("shareMenu.share")}<'],
  ['>واتساب<', '>{t("shareMenu.whatsapp")}<'],
  ['>فيسبوك<', '>{t("shareMenu.facebook")}<'],
  ['>تويتر<', '>{t("shareMenu.twitter")}<'],
  ['>نسخ الرابط<', '>{t("shareMenu.copyLink")}<'],
  ['"تم النسخ!"', 't("shareMenu.copied")'],
], { componentName: 'ShareMenu' });

// --- NotificationBell.tsx ---
processFile('components/NotificationBell.tsx', [
  ['"تم تعليم الكل كمقروء"', 't("notificationBell.allMarkedRead")'],
  ['"تم القبول"', 't("notificationBell.accepted")'],
  ['>الكود:<', '>{t("notificationBell.code")}<'],
  ['>موافقة<', '>{t("notificationBell.approve")}<'],
], { componentName: 'NotificationBell' });

// --- ChildNotificationBell.tsx ---
processFile('components/ChildNotificationBell.tsx', [
  ['>🔔 الإشعارات<', '>{t("childNotificationBell.title")}<'],
  ['>قراءة الكل<', '>{t("childNotificationBell.readAll")}<'],
  ['>عرض كل الإشعارات<', '>{t("childNotificationBell.viewAll")}<'],
], { componentName: 'ChildNotificationBell' });

// --- AccountNotificationBell.tsx ---
processFile('components/AccountNotificationBell.tsx', [
  ['>🔔 الإشعارات<', '>{t("accountNotificationBell.title")}<'],
  ['>قراءة الكل<', '>{t("accountNotificationBell.readAll")}<'],
  ['>لا توجد إشعارات<', '>{t("accountNotificationBell.noNotifications")}<'],
], { componentName: 'AccountNotificationBell' });

// --- GiftNotificationPopup.tsx ---
processFile('components/child/GiftNotificationPopup.tsx', [
  ['"نافذة منبثقة لا يمكن إغلاقها"', 't("giftNotification.strictPopup")'],
  ['"دائرة عائمة"', 't("giftNotification.floatingCircle")'],
], { componentName: 'GiftNotificationPopup' });

// --- FloatingBubble.tsx ---
processFile('components/child/FloatingBubble.tsx', [
  ['>الهدايا والمهام<', '>{t("floatingBubble.giftsAndTasks")}<'],
  ['>عنصرات معلقة<', '>{t("floatingBubble.pendingItems")}<'],
], { componentName: 'FloatingBubble' });

// --- FollowButton.tsx ---
processFile('components/ui/FollowButton.tsx', [
  ['"يجب تسجيل الدخول أولاً"', 't("followButton.mustLogin")'],
  ['"متابَع"', 't("followButton.following")'],
  ['"متابعة"', 't("followButton.follow")'],
], { componentName: 'FollowButton' });

// --- ErrorBoundary.tsx ---
processFile('components/ErrorBoundary.tsx', [
  ['"حدث خطأ غير متوقع"', 't("errorBoundary.unexpectedError")'],
  ['>التفاصيل التقنية<', '>{t("errorBoundary.technicalDetails")}<'],
], { componentName: 'ErrorBoundary' });

// --- ProfileHeader.tsx ---
processFile('components/ui/ProfileHeader.tsx', [
  ['"✓ موثّق"', 't("profileHeader.verified")'],
  ['>تقييم<', '>{t("profileHeader.rating")}<'],
  ['>تعرّف على<', '>{t("profileHeader.about")}<'],
], { componentName: 'ProfileHeader' });

// --- SlidingAdsCarousel.tsx ---
processFile('components/SlidingAdsCarousel.tsx', [
  ['>إعلانات<', '>{t("adsCarousel.ads")}<'],
  ['>عرض التفاصيل<', '>{t("adsCarousel.viewDetails")}<'],
], { componentName: 'SlidingAdsCarousel' });

// --- SponsoredTaskNotification.tsx ---
processFile('components/child/SponsoredTaskNotification.tsx', [
  ['placeholder="اكتب إجابتك هنا..."', 'placeholder={t("sponsoredTask.writeAnswerHere")}'],
  ['>أكملت المهمة<', '>{t("sponsoredTask.completedTask")}<'],
  ['>إرسال الإجابة<', '>{t("sponsoredTask.submitAnswer")}<'],
], { componentName: 'SponsoredTaskNotification' });

// --- ImageCropper.tsx ---
processFile('components/ImageCropper.tsx', [
  ['>قص صورة الملف الشخصي<', '>{t("imageCropper.cropProfileImage")}<'],
  ['>إعادة تعيين<', '>{t("imageCropper.reset")}<'],
  ['>إلغاء<', '>{t("imageCropper.cancel")}<'],
], { componentName: 'ImageCropper' });

// --- MandatoryTaskModal.tsx ---
processFile('components/MandatoryTaskModal.tsx', [
  ['"أحسنت!"', 't("mandatoryTask.wellDone")'],
  ['"مهمة جديدة!"', 't("mandatoryTask.newTask")'],
  ['"حاول مرة أخرى"', 't("mandatoryTask.tryAgain")'],
], { componentName: 'MandatoryTaskModal' });

// --- OTPInput.tsx ---
processFile('components/OTPInput.tsx', [
  ['>✅ التحقق<', '>{t("otpInput.verify")}<'],
  ['>إعادة إرسال<', '>{t("otpInput.resend")}<'],
  ['"تم إرسال رمز التحقق"', 't("otpInput.codeSent")'],
], { componentName: 'OTPInput' });

// --- SMSVerification.tsx ---
processFile('components/SMSVerification.tsx', [
  ['>← رجوع<', '>{t("smsVerification.back")}<'],
  ['"جاري الإرسال..."', 't("smsVerification.sending")'],
  ['>❌ إلغاء<', '>{t("smsVerification.cancel")}<'],
], { componentName: 'SMSVerification' });

// --- TaskForm.tsx ---
processFile('components/forms/TaskForm.tsx', [
  ['"حفظ المهمة"', 't("taskForm.saveTask")'],
  ['"فشل إنشاء المهمة"', 't("taskForm.createTaskFailed")'],
  ['>المادة<', '>{t("taskForm.subject")}<'],
  ['>النقاط<', '>{t("taskForm.points")}<'],
], { componentName: 'TaskForm' });

// --- RandomAdPopup.tsx ---
processFile('components/RandomAdPopup.tsx', [
  ['>إعلان<', '>{t("randomAdPopup.ad")}<'],
  ['>عرض التفاصيل<', '>{t("randomAdPopup.viewDetails")}<'],
  ['>إغلاق<', '>{t("randomAdPopup.close")}<'],
], { componentName: 'RandomAdPopup' });

// --- SocialLoginButtons.tsx ---
processFile('components/SocialLoginButtons.tsx', [
  [/isArabic\s*\?\s*"أو"/g, 'isArabic ? t("socialLogin.or")'],
  [/isArabic\s*\?\s*"الدخول بـ"/g, 'isArabic ? t("socialLogin.loginWith")'],
], { componentName: 'SocialLoginButtons', skipHook: true });

// --- ChildGamesControl.tsx ---
processFile('components/parent/ChildGamesControl.tsx', [
  [/isRTL\s*\?\s*"حدد الألعاب المسموح بها"/g, 'isRTL ? t("childGamesControl.selectAllowedGames")'],
  [/isRTL\s*\?\s*"لعب اليوم"/g, 'isRTL ? t("childGamesControl.playedToday")'],
], { componentName: 'ChildGamesControl', skipHook: true });

// --- NotificationToast.tsx ---
processFile('components/notifications/NotificationToast.tsx', [
  ['>يُغلق تلقائياً خلال 5 ثوانٍ...<', '>{t("notificationToast.autoClose")}<'],
], { componentName: 'NotificationToast' });

// --- NotificationModal.tsx ---
processFile('components/notifications/NotificationModal.tsx', [
  ['>فهمت 🎉<', '>{t("notificationModal.understood")}<'],
], { componentName: 'NotificationModal' });

// --- SplashScreen.tsx ---
processFile('components/SplashScreen.tsx', [
  ['>الرقابة الأبوية الذكية<', '>{t("splashScreen.smartParentalControl")}<'],
], { componentName: 'SplashScreen' });

// --- OTPMethodSelector.tsx ---
processFile('components/OTPMethodSelector.tsx', [
  ['"📧 البريد"', 't("otpMethodSelector.emailMethod")'],
], { componentName: 'OTPMethodSelector' });

// --- GovernorateSelect.tsx ---
processFile('components/ui/GovernorateSelect.tsx', [
  ['"اختر المحافظة"', 't("governorateSelect.selectGovernorate")'],
], { componentName: 'GovernorateSelect' });

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(50));
console.log(`📊 SUMMARY`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log('='.repeat(50) + '\n');

