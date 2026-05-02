// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Parent _$ParentFromJson(Map<String, dynamic> json) => Parent(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      phoneNumber: json['phoneNumber'] as String?,
      smsEnabled: json['smsEnabled'] as bool? ?? false,
      smsVerified: json['smsVerified'] as bool? ?? false,
      uniqueCode: json['uniqueCode'] as String,
      qrCode: json['qrCode'] as String?,
      taskBgColor: json['taskBgColor'] as String?,
      twoFAEnabled: json['twoFAEnabled'] as bool? ?? false,
      privacyAccepted: json['privacyAccepted'] as bool? ?? false,
      pin: json['pin'] as String?,
      governorate: json['governorate'] as String?,
      city: json['city'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      bio: json['bio'] as String?,
      socialLinks: (json['socialLinks'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$ParentToJson(Parent instance) => <String, dynamic>{
      'id': instance.id,
      'email': instance.email,
      'name': instance.name,
      'phoneNumber': instance.phoneNumber,
      'smsEnabled': instance.smsEnabled,
      'smsVerified': instance.smsVerified,
      'uniqueCode': instance.uniqueCode,
      'qrCode': instance.qrCode,
      'taskBgColor': instance.taskBgColor,
      'twoFAEnabled': instance.twoFAEnabled,
      'privacyAccepted': instance.privacyAccepted,
      'pin': instance.pin,
      'governorate': instance.governorate,
      'city': instance.city,
      'avatarUrl': instance.avatarUrl,
      'coverImageUrl': instance.coverImageUrl,
      'bio': instance.bio,
      'socialLinks': instance.socialLinks,
      'createdAt': instance.createdAt?.toIso8601String(),
    };
