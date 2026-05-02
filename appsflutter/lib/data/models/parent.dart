import 'package:json_annotation/json_annotation.dart';

part 'parent.g.dart';

@JsonSerializable()
class Parent {
  final String id;
  final String email;
  final String name;
  final String? phoneNumber;
  final bool smsEnabled;
  final bool smsVerified;
  final String uniqueCode;
  final String? qrCode;
  final String? taskBgColor;
  final bool twoFAEnabled;
  final bool privacyAccepted;
  final String? pin;
  final String? governorate;
  final String? city;
  final String? avatarUrl;
  final String? coverImageUrl;
  final String? bio;
  final Map<String, String>? socialLinks;
  final DateTime? createdAt;

  const Parent({
    required this.id,
    required this.email,
    required this.name,
    this.phoneNumber,
    this.smsEnabled = false,
    this.smsVerified = false,
    required this.uniqueCode,
    this.qrCode,
    this.taskBgColor,
    this.twoFAEnabled = false,
    this.privacyAccepted = false,
    this.pin,
    this.governorate,
    this.city,
    this.avatarUrl,
    this.coverImageUrl,
    this.bio,
    this.socialLinks,
    this.createdAt,
  });

  factory Parent.fromJson(Map<String, dynamic> json) => _$ParentFromJson(json);
  Map<String, dynamic> toJson() => _$ParentToJson(this);

  bool get hasPin => pin != null && pin!.isNotEmpty;
}
