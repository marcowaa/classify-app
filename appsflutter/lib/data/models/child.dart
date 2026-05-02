import 'package:json_annotation/json_annotation.dart';

part 'child.g.dart';

@JsonSerializable()
class Child {
  final String id;
  final String name;
  final int totalPoints;
  final String? shippingAddress;
  final String? avatarUrl;
  final DateTime? birthday;
  final String? schoolName;
  final String? academicGrade;
  final String? hobbies;
  final String? governorate;
  final String? pin;
  final String? coverImageUrl;
  final String? bio;
  final String? shareCode;
  final bool profilePublic;
  final List<String>? interests;
  final bool privacyAccepted;
  final DateTime? createdAt;

  const Child({
    required this.id,
    required this.name,
    this.totalPoints = 0,
    this.shippingAddress,
    this.avatarUrl,
    this.birthday,
    this.schoolName,
    this.academicGrade,
    this.hobbies,
    this.governorate,
    this.pin,
    this.coverImageUrl,
    this.bio,
    this.shareCode,
    this.profilePublic = true,
    this.interests,
    this.privacyAccepted = false,
    this.createdAt,
  });

  factory Child.fromJson(Map<String, dynamic> json) => _$ChildFromJson(json);
  Map<String, dynamic> toJson() => _$ChildToJson(this);

  bool get hasPin => pin != null && pin!.isNotEmpty;

  int get age {
    if (birthday == null) return 0;
    final now = DateTime.now();
    int age = now.year - birthday!.year;
    if (now.month < birthday!.month ||
        (now.month == birthday!.month && now.day < birthday!.day)) {
      age--;
    }
    return age;
  }
}
