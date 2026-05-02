// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'child.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Child _$ChildFromJson(Map<String, dynamic> json) => Child(
      id: json['id'] as String,
      name: json['name'] as String,
      totalPoints: (json['totalPoints'] as num?)?.toInt() ?? 0,
      shippingAddress: json['shippingAddress'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      birthday: json['birthday'] == null
          ? null
          : DateTime.parse(json['birthday'] as String),
      schoolName: json['schoolName'] as String?,
      academicGrade: json['academicGrade'] as String?,
      hobbies: json['hobbies'] as String?,
      governorate: json['governorate'] as String?,
      pin: json['pin'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      bio: json['bio'] as String?,
      shareCode: json['shareCode'] as String?,
      profilePublic: json['profilePublic'] as bool? ?? true,
      interests: (json['interests'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      privacyAccepted: json['privacyAccepted'] as bool? ?? false,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$ChildToJson(Child instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'totalPoints': instance.totalPoints,
      'shippingAddress': instance.shippingAddress,
      'avatarUrl': instance.avatarUrl,
      'birthday': instance.birthday?.toIso8601String(),
      'schoolName': instance.schoolName,
      'academicGrade': instance.academicGrade,
      'hobbies': instance.hobbies,
      'governorate': instance.governorate,
      'pin': instance.pin,
      'coverImageUrl': instance.coverImageUrl,
      'bio': instance.bio,
      'shareCode': instance.shareCode,
      'profilePublic': instance.profilePublic,
      'interests': instance.interests,
      'privacyAccepted': instance.privacyAccepted,
      'createdAt': instance.createdAt?.toIso8601String(),
    };
