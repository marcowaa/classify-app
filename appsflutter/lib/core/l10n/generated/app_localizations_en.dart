// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Classify';

  @override
  String get welcome => 'Welcome';

  @override
  String get letsPlay => 'Let\'s play and learn';

  @override
  String get selectAccountType => 'Select your account type';

  @override
  String get parentTitle => 'Parents';

  @override
  String get childTitle => 'Child';

  @override
  String get smartParentalControl => 'Smart Parental Control App';

  @override
  String get manageChildTasks => 'Manage your children\'s tasks';

  @override
  String get gamesAndTasks => 'Games & Tasks';

  @override
  String get startPlaying => 'Start Playing';

  @override
  String get parentLogin => 'Parent Login';

  @override
  String get registerNewParent => 'Register New Parent';

  @override
  String get name => 'Name';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get login => 'Login';

  @override
  String get register => 'Register';

  @override
  String get processing => 'Processing...';

  @override
  String get alreadyHaveAccount => 'Already have an account';

  @override
  String get createNewAccount => 'Create a new account';

  @override
  String get back => 'Back';

  @override
  String get enterNow => 'Enter Now!';

  @override
  String get welcomeBack => 'Welcome Back!';

  @override
  String get loggingIn => 'Logging in...';

  @override
  String get phoneNumber => 'Phone Number';

  @override
  String get governorate => 'Governorate';

  @override
  String get pin => 'PIN';

  @override
  String get pinOptional => 'PIN (optional - 4 digits)';

  @override
  String get referralCode => 'Referral Code (optional)';

  @override
  String get authError => 'Authentication Error';

  @override
  String get invalidCredentials => 'Invalid credentials';

  @override
  String get error => 'Error';

  @override
  String get success => 'Success';

  @override
  String get otpVerification => 'OTP Verification';

  @override
  String get enterOtpCode => 'Enter the verification code sent to your email';

  @override
  String get verifyOtp => 'Verify';

  @override
  String get resendOtp => 'Resend Code';

  @override
  String get otpResent => 'Code resent successfully';

  @override
  String get forgotPassword => 'Forgot Password?';

  @override
  String get forgotPasswordDesc => 'Enter your email to reset your password';

  @override
  String get sendResetLink => 'Send Reset Link';

  @override
  String get resetLinkSent => 'Reset link sent to your email';

  @override
  String get childLinking => 'Child Linking';

  @override
  String get linkAccountWithParent => 'Link your account with your parent';

  @override
  String get childName => 'Child Name';

  @override
  String get enterYourName => 'Enter your name';

  @override
  String get parentCode => 'Parent Code';

  @override
  String get enterCode => 'Enter the code from your parent';

  @override
  String get link => 'Link';

  @override
  String get linking => 'Linking...';

  @override
  String get invalidCode => 'Invalid code';

  @override
  String get linkingFailed => 'Linking failed';

  @override
  String get askParentForCode => 'Ask mom or dad for the code';

  @override
  String get exampleCode => 'Example: AHMED12345';

  @override
  String get secretNumbers => 'Secret numbers';

  @override
  String get yourPin => 'Your PIN';

  @override
  String get rememberMe => 'Remember me on this device';

  @override
  String get newAccount => 'New Account!';

  @override
  String get existingChild => 'I have an account';

  @override
  String get newChild => 'New Account';

  @override
  String get linkWithParents => 'Link your account with your parents';

  @override
  String get startAdventure => 'Start Adventure!';

  @override
  String get haveAccountLogin => 'I have an account - Login';

  @override
  String get firstTimeLinkNew => 'First time - Link new account';

  @override
  String get dashboard => 'Dashboard';

  @override
  String get logout => 'Logout';

  @override
  String get logoutTitle => 'Logout';

  @override
  String get logoutConfirmMessage => 'Are you sure you want to logout?';

  @override
  String get cancel => 'Cancel';

  @override
  String get confirmLogout => 'Confirm Logout';

  @override
  String get loggingOutProgress => 'Logging out...';

  @override
  String get linkedChildren => 'Linked Children';

  @override
  String get noLinkedChildren => 'No linked children yet';

  @override
  String get linkChild => 'Link Child';

  @override
  String get shareThisCode =>
      'Share this code with your child for quick linking';

  @override
  String get uniqueCode => 'Unique Code';

  @override
  String get showQR => 'Show QR Code';

  @override
  String get points => 'Points';

  @override
  String get manageTasksBtn => 'Add Task';

  @override
  String get educationalGames => 'Educational Games';

  @override
  String get noGamesAvailable => 'No games available at the moment';

  @override
  String get gamesComingSoon => 'New games will be added soon!';

  @override
  String get playNow => 'Play Now';

  @override
  String get play => 'Play';

  @override
  String get pointsEarned => 'points';

  @override
  String get finishedGame => 'Game finished! Collect your points';

  @override
  String get wellDone => 'Well Done!';

  @override
  String earnedPoints(int points) {
    return 'You earned +$points points';
  }

  @override
  String totalPoints(int total) {
    return 'Total points: $total';
  }

  @override
  String get tasks => 'Tasks';

  @override
  String get createNewTask => 'Create New Task';

  @override
  String get selectChild => 'Select Child';

  @override
  String get question => 'Question';

  @override
  String get writeQuestion => 'Write your question here...';

  @override
  String get pointsReward => 'Points Reward';

  @override
  String get answers => 'Answers';

  @override
  String get submitAnswer => 'Submit Answer';

  @override
  String get mustCompleteTasks => 'tasks to complete';

  @override
  String get noTasks => 'No tasks at the moment';

  @override
  String get pending => 'Pending';

  @override
  String get completed => 'Completed';

  @override
  String get failed => 'Failed';

  @override
  String get store => 'Store';

  @override
  String get wallet => 'Wallet';

  @override
  String get balance => 'Balance';

  @override
  String get notifications => 'Notifications';

  @override
  String get noNotifications => 'No notifications';

  @override
  String get markAllRead => 'Mark all as read';

  @override
  String get gifts => 'Gifts';

  @override
  String get noGifts => 'No gifts';

  @override
  String get sendGift => 'Send Gift';

  @override
  String get profile => 'Profile';

  @override
  String get settings => 'Settings';

  @override
  String get editProfile => 'Edit Profile';

  @override
  String get changePassword => 'Change Password';

  @override
  String get language => 'Language';

  @override
  String get theme => 'Theme';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get lightMode => 'Light Mode';

  @override
  String get systemMode => 'System Default';

  @override
  String get growthTree => 'Growth Tree';

  @override
  String get treeLevel => 'Level';

  @override
  String get waterTree => 'Water the Tree';

  @override
  String get progress => 'Progress';

  @override
  String get rewards => 'Rewards';

  @override
  String get achievements => 'Achievements';

  @override
  String get yourPoints => 'Your Points';

  @override
  String get childNavGames => 'Games';

  @override
  String get childNavTasks => 'Tasks';

  @override
  String get childNavGifts => 'Gifts';

  @override
  String get childNavProgress => 'Progress';

  @override
  String get childNavProfile => 'Profile';

  @override
  String get parentNavDashboard => 'Home';

  @override
  String get parentNavTasks => 'Tasks';

  @override
  String get parentNavStore => 'Store';

  @override
  String get parentNavNotifications => 'Alerts';

  @override
  String get parentNavProfile => 'Account';

  @override
  String get close => 'Close';

  @override
  String get save => 'Save';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get confirm => 'Confirm';

  @override
  String get retry => 'Retry';

  @override
  String get loading => 'Loading...';

  @override
  String get noData => 'No data available';

  @override
  String get pullToRefresh => 'Pull to refresh';

  @override
  String get somethingWentWrong => 'Something went wrong';

  @override
  String get noInternet => 'No internet connection';

  @override
  String get tryAgain => 'Try Again';
}
