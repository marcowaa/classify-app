/// Auth-related request/response models
class LoginRequest {
  final String email;
  final String password;

  const LoginRequest({required this.email, required this.password});

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
      };
}

class RegisterRequest {
  final String email;
  final String password;
  final String name;
  final String? phoneNumber;
  final String? pin;
  final String? governorate;
  final String? referralCode;
  final String? libraryReferralCode;

  const RegisterRequest({
    required this.email,
    required this.password,
    required this.name,
    this.phoneNumber,
    this.pin,
    this.governorate,
    this.referralCode,
    this.libraryReferralCode,
  });

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
        'name': name,
        if (phoneNumber != null) 'phoneNumber': phoneNumber,
        if (pin != null) 'pin': pin,
        if (governorate != null) 'governorate': governorate,
        if (referralCode != null) 'referralCode': referralCode,
        if (libraryReferralCode != null)
          'libraryReferralCode': libraryReferralCode,
      };
}

class AuthResponse {
  final String token;
  final String userId;
  final String? uniqueCode;
  final bool? hasPin;
  final bool? twoFAEnabled;
  final String? name;
  final String? email;

  const AuthResponse({
    required this.token,
    required this.userId,
    this.uniqueCode,
    this.hasPin,
    this.twoFAEnabled,
    this.name,
    this.email,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'] as String,
      userId: json['userId'] as String? ?? json['id'] as String? ?? '',
      uniqueCode: json['uniqueCode'] as String?,
      hasPin: json['hasPin'] as bool?,
      twoFAEnabled: json['twoFAEnabled'] as bool?,
      name: json['name'] as String?,
      email: json['email'] as String?,
    );
  }
}

class OtpRequest {
  final String email;
  final String? parentId;

  const OtpRequest({required this.email, this.parentId});

  Map<String, dynamic> toJson() => {
        'email': email,
        if (parentId != null) 'parentId': parentId,
      };
}

class OtpVerifyRequest {
  final String email;
  final String code;
  final String? parentId;

  const OtpVerifyRequest({
    required this.email,
    required this.code,
    this.parentId,
  });

  Map<String, dynamic> toJson() => {
        'email': email,
        'code': code,
        if (parentId != null) 'parentId': parentId,
      };
}

class ChildLinkRequest {
  final String name;
  final String parentCode;
  final String? pin;

  const ChildLinkRequest({
    required this.name,
    required this.parentCode,
    this.pin,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'parentCode': parentCode,
        if (pin != null) 'pin': pin,
      };
}

class ChildLinkResponse {
  final String token;
  final String childId;
  final String? name;

  const ChildLinkResponse({
    required this.token,
    required this.childId,
    this.name,
  });

  factory ChildLinkResponse.fromJson(Map<String, dynamic> json) {
    return ChildLinkResponse(
      token: json['token'] as String,
      childId: json['childId'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String?,
    );
  }
}

class ChildPinLoginRequest {
  final String childId;
  final String pin;

  const ChildPinLoginRequest({required this.childId, required this.pin});

  Map<String, dynamic> toJson() => {
        'childId': childId,
        'pin': pin,
      };
}

class ForgotPasswordRequest {
  final String email;

  const ForgotPasswordRequest({required this.email});

  Map<String, dynamic> toJson() => {'email': email};
}
