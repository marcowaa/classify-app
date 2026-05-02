import 'package:json_annotation/json_annotation.dart';

part 'gift.g.dart';

@JsonSerializable()
class Gift {
  final String id;
  final String? parentId;
  final String? childId;
  final String title;
  final String? description;
  final String? imageUrl;
  final int? pointsValue;
  final String? status; // pending, accepted, rejected
  final DateTime? createdAt;

  const Gift({
    required this.id,
    this.parentId,
    this.childId,
    required this.title,
    this.description,
    this.imageUrl,
    this.pointsValue,
    this.status = 'pending',
    this.createdAt,
  });

  factory Gift.fromJson(Map<String, dynamic> json) => _$GiftFromJson(json);
  Map<String, dynamic> toJson() => _$GiftToJson(this);
}
