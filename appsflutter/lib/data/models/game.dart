import 'package:json_annotation/json_annotation.dart';

part 'game.g.dart';

@JsonSerializable()
class Game {
  final String id;
  final String name;
  final String? nameAr;
  final String? description;
  final String? descriptionAr;
  final String url;
  final String? imageUrl;
  final String? category;
  final int pointsReward;
  final bool isActive;
  final int? minAge;
  final int? maxAge;
  final int sortOrder;
  final DateTime? createdAt;

  const Game({
    required this.id,
    required this.name,
    this.nameAr,
    this.description,
    this.descriptionAr,
    required this.url,
    this.imageUrl,
    this.category,
    this.pointsReward = 10,
    this.isActive = true,
    this.minAge,
    this.maxAge,
    this.sortOrder = 0,
    this.createdAt,
  });

  factory Game.fromJson(Map<String, dynamic> json) => _$GameFromJson(json);
  Map<String, dynamic> toJson() => _$GameToJson(this);

  /// Display name based on locale
  String displayName(String locale) {
    if (locale == 'ar' && nameAr != null && nameAr!.isNotEmpty) {
      return nameAr!;
    }
    return name;
  }

  String displayDescription(String locale) {
    if (locale == 'ar' && descriptionAr != null && descriptionAr!.isNotEmpty) {
      return descriptionAr!;
    }
    return description ?? '';
  }
}
