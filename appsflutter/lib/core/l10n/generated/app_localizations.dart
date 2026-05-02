import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In ar, this message translates to:
  /// **'Classify'**
  String get appName;

  /// No description provided for @welcome.
  ///
  /// In ar, this message translates to:
  /// **'مرحباً'**
  String get welcome;

  /// No description provided for @letsPlay.
  ///
  /// In ar, this message translates to:
  /// **'هيا نلعب ونتعلم'**
  String get letsPlay;

  /// No description provided for @selectAccountType.
  ///
  /// In ar, this message translates to:
  /// **'اختر نوع حسابك'**
  String get selectAccountType;

  /// No description provided for @parentTitle.
  ///
  /// In ar, this message translates to:
  /// **'الوالدين'**
  String get parentTitle;

  /// No description provided for @childTitle.
  ///
  /// In ar, this message translates to:
  /// **'الطفل'**
  String get childTitle;

  /// No description provided for @smartParentalControl.
  ///
  /// In ar, this message translates to:
  /// **'التطبيق المتخصص للتحكم الأبوي الذكي'**
  String get smartParentalControl;

  /// No description provided for @manageChildTasks.
  ///
  /// In ar, this message translates to:
  /// **'إدارة مهام الأطفال'**
  String get manageChildTasks;

  /// No description provided for @gamesAndTasks.
  ///
  /// In ar, this message translates to:
  /// **'ألعاب ومهام'**
  String get gamesAndTasks;

  /// No description provided for @startPlaying.
  ///
  /// In ar, this message translates to:
  /// **'ابدأ اللعب'**
  String get startPlaying;

  /// No description provided for @parentLogin.
  ///
  /// In ar, this message translates to:
  /// **'دخول ولي الأمر'**
  String get parentLogin;

  /// No description provided for @registerNewParent.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل ولي أمر جديد'**
  String get registerNewParent;

  /// No description provided for @name.
  ///
  /// In ar, this message translates to:
  /// **'الاسم'**
  String get name;

  /// No description provided for @email.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني'**
  String get email;

  /// No description provided for @password.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get password;

  /// No description provided for @login.
  ///
  /// In ar, this message translates to:
  /// **'دخول'**
  String get login;

  /// No description provided for @register.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل'**
  String get register;

  /// No description provided for @processing.
  ///
  /// In ar, this message translates to:
  /// **'جاري المعالجة...'**
  String get processing;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In ar, this message translates to:
  /// **'لديّ حساب بالفعل'**
  String get alreadyHaveAccount;

  /// No description provided for @createNewAccount.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل حساب جديد'**
  String get createNewAccount;

  /// No description provided for @back.
  ///
  /// In ar, this message translates to:
  /// **'رجوع'**
  String get back;

  /// No description provided for @enterNow.
  ///
  /// In ar, this message translates to:
  /// **'ادخل الآن!'**
  String get enterNow;

  /// No description provided for @welcomeBack.
  ///
  /// In ar, this message translates to:
  /// **'أهلا بعودتك!'**
  String get welcomeBack;

  /// No description provided for @loggingIn.
  ///
  /// In ar, this message translates to:
  /// **'جاري الدخول...'**
  String get loggingIn;

  /// No description provided for @phoneNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهاتف'**
  String get phoneNumber;

  /// No description provided for @governorate.
  ///
  /// In ar, this message translates to:
  /// **'المحافظة'**
  String get governorate;

  /// No description provided for @pin.
  ///
  /// In ar, this message translates to:
  /// **'رمز PIN'**
  String get pin;

  /// No description provided for @pinOptional.
  ///
  /// In ar, this message translates to:
  /// **'رمز PIN (اختياري - 4 أرقام)'**
  String get pinOptional;

  /// No description provided for @referralCode.
  ///
  /// In ar, this message translates to:
  /// **'كود الإحالة (اختياري)'**
  String get referralCode;

  /// No description provided for @authError.
  ///
  /// In ar, this message translates to:
  /// **'خطأ في المصادقة'**
  String get authError;

  /// No description provided for @invalidCredentials.
  ///
  /// In ar, this message translates to:
  /// **'بيانات الدخول غير صحيحة'**
  String get invalidCredentials;

  /// No description provided for @error.
  ///
  /// In ar, this message translates to:
  /// **'خطأ'**
  String get error;

  /// No description provided for @success.
  ///
  /// In ar, this message translates to:
  /// **'نجاح'**
  String get success;

  /// No description provided for @otpVerification.
  ///
  /// In ar, this message translates to:
  /// **'التحقق من OTP'**
  String get otpVerification;

  /// No description provided for @enterOtpCode.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني'**
  String get enterOtpCode;

  /// No description provided for @verifyOtp.
  ///
  /// In ar, this message translates to:
  /// **'تحقق'**
  String get verifyOtp;

  /// No description provided for @resendOtp.
  ///
  /// In ar, this message translates to:
  /// **'إعادة إرسال الرمز'**
  String get resendOtp;

  /// No description provided for @otpResent.
  ///
  /// In ar, this message translates to:
  /// **'تم إعادة إرسال الرمز'**
  String get otpResent;

  /// No description provided for @forgotPassword.
  ///
  /// In ar, this message translates to:
  /// **'نسيت كلمة المرور؟'**
  String get forgotPassword;

  /// No description provided for @forgotPasswordDesc.
  ///
  /// In ar, this message translates to:
  /// **'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور'**
  String get forgotPasswordDesc;

  /// No description provided for @sendResetLink.
  ///
  /// In ar, this message translates to:
  /// **'إرسال رابط إعادة التعيين'**
  String get sendResetLink;

  /// No description provided for @resetLinkSent.
  ///
  /// In ar, this message translates to:
  /// **'تم إرسال رابط إعادة التعيين إلى بريدك'**
  String get resetLinkSent;

  /// No description provided for @childLinking.
  ///
  /// In ar, this message translates to:
  /// **'ربط الطفل'**
  String get childLinking;

  /// No description provided for @linkAccountWithParent.
  ///
  /// In ar, this message translates to:
  /// **'اربط حسابك بحساب ولي الأمر'**
  String get linkAccountWithParent;

  /// No description provided for @childName.
  ///
  /// In ar, this message translates to:
  /// **'اسم الطفل'**
  String get childName;

  /// No description provided for @enterYourName.
  ///
  /// In ar, this message translates to:
  /// **'أدخل اسمك'**
  String get enterYourName;

  /// No description provided for @parentCode.
  ///
  /// In ar, this message translates to:
  /// **'كود الوالد'**
  String get parentCode;

  /// No description provided for @enterCode.
  ///
  /// In ar, this message translates to:
  /// **'أدخل الكود من ولي الأمر'**
  String get enterCode;

  /// No description provided for @link.
  ///
  /// In ar, this message translates to:
  /// **'ربط'**
  String get link;

  /// No description provided for @linking.
  ///
  /// In ar, this message translates to:
  /// **'جاري الربط...'**
  String get linking;

  /// No description provided for @invalidCode.
  ///
  /// In ar, this message translates to:
  /// **'كود غير صحيح'**
  String get invalidCode;

  /// No description provided for @linkingFailed.
  ///
  /// In ar, this message translates to:
  /// **'فشل الربط'**
  String get linkingFailed;

  /// No description provided for @askParentForCode.
  ///
  /// In ar, this message translates to:
  /// **'اسأل ماما أو بابا عن الكود'**
  String get askParentForCode;

  /// No description provided for @exampleCode.
  ///
  /// In ar, this message translates to:
  /// **'مثال: AHMED12345'**
  String get exampleCode;

  /// No description provided for @secretNumbers.
  ///
  /// In ar, this message translates to:
  /// **'أرقام سرية'**
  String get secretNumbers;

  /// No description provided for @yourPin.
  ///
  /// In ar, this message translates to:
  /// **'رمز PIN الخاص بك'**
  String get yourPin;

  /// No description provided for @rememberMe.
  ///
  /// In ar, this message translates to:
  /// **'تذكرني على هذا الجهاز'**
  String get rememberMe;

  /// No description provided for @newAccount.
  ///
  /// In ar, this message translates to:
  /// **'حساب جديد!'**
  String get newAccount;

  /// No description provided for @existingChild.
  ///
  /// In ar, this message translates to:
  /// **'عندي حساب'**
  String get existingChild;

  /// No description provided for @newChild.
  ///
  /// In ar, this message translates to:
  /// **'حساب جديد'**
  String get newChild;

  /// No description provided for @linkWithParents.
  ///
  /// In ar, this message translates to:
  /// **'اربط حسابك مع والديك'**
  String get linkWithParents;

  /// No description provided for @startAdventure.
  ///
  /// In ar, this message translates to:
  /// **'ابدأ المغامرة!'**
  String get startAdventure;

  /// No description provided for @haveAccountLogin.
  ///
  /// In ar, this message translates to:
  /// **'عندي حساب - أريد الدخول'**
  String get haveAccountLogin;

  /// No description provided for @firstTimeLinkNew.
  ///
  /// In ar, this message translates to:
  /// **'أول مرة - ربط حساب جديد'**
  String get firstTimeLinkNew;

  /// No description provided for @dashboard.
  ///
  /// In ar, this message translates to:
  /// **'لوحة التحكم'**
  String get dashboard;

  /// No description provided for @logout.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get logout;

  /// No description provided for @logoutTitle.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get logoutTitle;

  /// No description provided for @logoutConfirmMessage.
  ///
  /// In ar, this message translates to:
  /// **'هل أنت متأكد من تسجيل الخروج؟'**
  String get logoutConfirmMessage;

  /// No description provided for @cancel.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء'**
  String get cancel;

  /// No description provided for @confirmLogout.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد الخروج'**
  String get confirmLogout;

  /// No description provided for @loggingOutProgress.
  ///
  /// In ar, this message translates to:
  /// **'جاري...'**
  String get loggingOutProgress;

  /// No description provided for @linkedChildren.
  ///
  /// In ar, this message translates to:
  /// **'الأطفال المرتبطون'**
  String get linkedChildren;

  /// No description provided for @noLinkedChildren.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد أطفال مرتبطين حتى الآن'**
  String get noLinkedChildren;

  /// No description provided for @linkChild.
  ///
  /// In ar, this message translates to:
  /// **'ربط الطفل'**
  String get linkChild;

  /// No description provided for @shareThisCode.
  ///
  /// In ar, this message translates to:
  /// **'شارك هذا الكود مع الطفل للربط السريع'**
  String get shareThisCode;

  /// No description provided for @uniqueCode.
  ///
  /// In ar, this message translates to:
  /// **'الكود الفريد'**
  String get uniqueCode;

  /// No description provided for @showQR.
  ///
  /// In ar, this message translates to:
  /// **'عرض رمز QR'**
  String get showQR;

  /// No description provided for @points.
  ///
  /// In ar, this message translates to:
  /// **'النقاط'**
  String get points;

  /// No description provided for @manageTasksBtn.
  ///
  /// In ar, this message translates to:
  /// **'إضافة مهمة'**
  String get manageTasksBtn;

  /// No description provided for @educationalGames.
  ///
  /// In ar, this message translates to:
  /// **'الألعاب التعليمية'**
  String get educationalGames;

  /// No description provided for @noGamesAvailable.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد ألعاب متاحة حالياً'**
  String get noGamesAvailable;

  /// No description provided for @gamesComingSoon.
  ///
  /// In ar, this message translates to:
  /// **'سيقوم المشرف بإضافة ألعاب جديدة قريباً!'**
  String get gamesComingSoon;

  /// No description provided for @playNow.
  ///
  /// In ar, this message translates to:
  /// **'العب الآن'**
  String get playNow;

  /// No description provided for @play.
  ///
  /// In ar, this message translates to:
  /// **'العب'**
  String get play;

  /// No description provided for @pointsEarned.
  ///
  /// In ar, this message translates to:
  /// **'نقطة'**
  String get pointsEarned;

  /// No description provided for @finishedGame.
  ///
  /// In ar, this message translates to:
  /// **'أنهيت اللعبة! احصل على النقاط'**
  String get finishedGame;

  /// No description provided for @wellDone.
  ///
  /// In ar, this message translates to:
  /// **'أحسنت!'**
  String get wellDone;

  /// No description provided for @earnedPoints.
  ///
  /// In ar, this message translates to:
  /// **'ربحت +{points} نقطة'**
  String earnedPoints(int points);

  /// No description provided for @totalPoints.
  ///
  /// In ar, this message translates to:
  /// **'مجموع نقاطك: {total}'**
  String totalPoints(int total);

  /// No description provided for @tasks.
  ///
  /// In ar, this message translates to:
  /// **'المهام'**
  String get tasks;

  /// No description provided for @createNewTask.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء مهمة جديدة'**
  String get createNewTask;

  /// No description provided for @selectChild.
  ///
  /// In ar, this message translates to:
  /// **'اختر الطفل'**
  String get selectChild;

  /// No description provided for @question.
  ///
  /// In ar, this message translates to:
  /// **'السؤال'**
  String get question;

  /// No description provided for @writeQuestion.
  ///
  /// In ar, this message translates to:
  /// **'اكتب السؤال هنا...'**
  String get writeQuestion;

  /// No description provided for @pointsReward.
  ///
  /// In ar, this message translates to:
  /// **'النقاط المكسبة'**
  String get pointsReward;

  /// No description provided for @answers.
  ///
  /// In ar, this message translates to:
  /// **'الإجابات'**
  String get answers;

  /// No description provided for @submitAnswer.
  ///
  /// In ar, this message translates to:
  /// **'إرسال الإجابة'**
  String get submitAnswer;

  /// No description provided for @mustCompleteTasks.
  ///
  /// In ar, this message translates to:
  /// **'مهمة يجب حلها'**
  String get mustCompleteTasks;

  /// No description provided for @noTasks.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مهام حالياً'**
  String get noTasks;

  /// No description provided for @pending.
  ///
  /// In ar, this message translates to:
  /// **'معلق'**
  String get pending;

  /// No description provided for @completed.
  ///
  /// In ar, this message translates to:
  /// **'مكتمل'**
  String get completed;

  /// No description provided for @failed.
  ///
  /// In ar, this message translates to:
  /// **'فشل'**
  String get failed;

  /// No description provided for @store.
  ///
  /// In ar, this message translates to:
  /// **'المتجر'**
  String get store;

  /// No description provided for @wallet.
  ///
  /// In ar, this message translates to:
  /// **'المحفظة'**
  String get wallet;

  /// No description provided for @balance.
  ///
  /// In ar, this message translates to:
  /// **'الرصيد'**
  String get balance;

  /// No description provided for @notifications.
  ///
  /// In ar, this message translates to:
  /// **'الإشعارات'**
  String get notifications;

  /// No description provided for @noNotifications.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد إشعارات'**
  String get noNotifications;

  /// No description provided for @markAllRead.
  ///
  /// In ar, this message translates to:
  /// **'تحديد الكل كمقروء'**
  String get markAllRead;

  /// No description provided for @gifts.
  ///
  /// In ar, this message translates to:
  /// **'الهدايا'**
  String get gifts;

  /// No description provided for @noGifts.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد هدايا'**
  String get noGifts;

  /// No description provided for @sendGift.
  ///
  /// In ar, this message translates to:
  /// **'إرسال هدية'**
  String get sendGift;

  /// No description provided for @profile.
  ///
  /// In ar, this message translates to:
  /// **'الملف الشخصي'**
  String get profile;

  /// No description provided for @settings.
  ///
  /// In ar, this message translates to:
  /// **'الإعدادات'**
  String get settings;

  /// No description provided for @editProfile.
  ///
  /// In ar, this message translates to:
  /// **'تعديل الملف الشخصي'**
  String get editProfile;

  /// No description provided for @changePassword.
  ///
  /// In ar, this message translates to:
  /// **'تغيير كلمة المرور'**
  String get changePassword;

  /// No description provided for @language.
  ///
  /// In ar, this message translates to:
  /// **'اللغة'**
  String get language;

  /// No description provided for @theme.
  ///
  /// In ar, this message translates to:
  /// **'المظهر'**
  String get theme;

  /// No description provided for @darkMode.
  ///
  /// In ar, this message translates to:
  /// **'الوضع الداكن'**
  String get darkMode;

  /// No description provided for @lightMode.
  ///
  /// In ar, this message translates to:
  /// **'الوضع الفاتح'**
  String get lightMode;

  /// No description provided for @systemMode.
  ///
  /// In ar, this message translates to:
  /// **'حسب النظام'**
  String get systemMode;

  /// No description provided for @growthTree.
  ///
  /// In ar, this message translates to:
  /// **'شجرة النمو'**
  String get growthTree;

  /// No description provided for @treeLevel.
  ///
  /// In ar, this message translates to:
  /// **'المستوى'**
  String get treeLevel;

  /// No description provided for @waterTree.
  ///
  /// In ar, this message translates to:
  /// **'سقي الشجرة'**
  String get waterTree;

  /// No description provided for @progress.
  ///
  /// In ar, this message translates to:
  /// **'تقدمي'**
  String get progress;

  /// No description provided for @rewards.
  ///
  /// In ar, this message translates to:
  /// **'مكافآت'**
  String get rewards;

  /// No description provided for @achievements.
  ///
  /// In ar, this message translates to:
  /// **'الإنجازات'**
  String get achievements;

  /// No description provided for @yourPoints.
  ///
  /// In ar, this message translates to:
  /// **'نقاطك'**
  String get yourPoints;

  /// No description provided for @childNavGames.
  ///
  /// In ar, this message translates to:
  /// **'ألعاب'**
  String get childNavGames;

  /// No description provided for @childNavTasks.
  ///
  /// In ar, this message translates to:
  /// **'مهام'**
  String get childNavTasks;

  /// No description provided for @childNavGifts.
  ///
  /// In ar, this message translates to:
  /// **'هدايا'**
  String get childNavGifts;

  /// No description provided for @childNavProgress.
  ///
  /// In ar, this message translates to:
  /// **'تقدمي'**
  String get childNavProgress;

  /// No description provided for @childNavProfile.
  ///
  /// In ar, this message translates to:
  /// **'ملفي'**
  String get childNavProfile;

  /// No description provided for @parentNavDashboard.
  ///
  /// In ar, this message translates to:
  /// **'الرئيسية'**
  String get parentNavDashboard;

  /// No description provided for @parentNavTasks.
  ///
  /// In ar, this message translates to:
  /// **'المهام'**
  String get parentNavTasks;

  /// No description provided for @parentNavStore.
  ///
  /// In ar, this message translates to:
  /// **'المتجر'**
  String get parentNavStore;

  /// No description provided for @parentNavNotifications.
  ///
  /// In ar, this message translates to:
  /// **'إشعارات'**
  String get parentNavNotifications;

  /// No description provided for @parentNavProfile.
  ///
  /// In ar, this message translates to:
  /// **'حسابي'**
  String get parentNavProfile;

  /// No description provided for @close.
  ///
  /// In ar, this message translates to:
  /// **'إغلاق'**
  String get close;

  /// No description provided for @save.
  ///
  /// In ar, this message translates to:
  /// **'حفظ'**
  String get save;

  /// No description provided for @delete.
  ///
  /// In ar, this message translates to:
  /// **'حذف'**
  String get delete;

  /// No description provided for @edit.
  ///
  /// In ar, this message translates to:
  /// **'تعديل'**
  String get edit;

  /// No description provided for @confirm.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد'**
  String get confirm;

  /// No description provided for @retry.
  ///
  /// In ar, this message translates to:
  /// **'إعادة المحاولة'**
  String get retry;

  /// No description provided for @loading.
  ///
  /// In ar, this message translates to:
  /// **'جاري التحميل...'**
  String get loading;

  /// No description provided for @noData.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد بيانات'**
  String get noData;

  /// No description provided for @pullToRefresh.
  ///
  /// In ar, this message translates to:
  /// **'اسحب للتحديث'**
  String get pullToRefresh;

  /// No description provided for @somethingWentWrong.
  ///
  /// In ar, this message translates to:
  /// **'حدث خطأ ما'**
  String get somethingWentWrong;

  /// No description provided for @noInternet.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد اتصال بالإنترنت'**
  String get noInternet;

  /// No description provided for @tryAgain.
  ///
  /// In ar, this message translates to:
  /// **'حاول مرة أخرى'**
  String get tryAgain;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
