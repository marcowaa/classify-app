import 'package:json_annotation/json_annotation.dart';

part 'notification_model.g.dart';

@JsonSerializable()
class NotificationModel {
  final String id;
  final String? parentId;
  final String? childId;
  final String type;
  final String title;
  final String message;
  final bool read;
  final String? style;
  final String? priority;
  final String? relatedId;
  final Map<String, dynamic>? metadata;
  final DateTime? createdAt;

  const NotificationModel({
    required this.id,
    this.parentId,
    this.childId,
    required this.type,
    required this.title,
    required this.message,
    this.read = false,
    this.style,
    this.priority,
    this.relatedId,
    this.metadata,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) =>
      _$NotificationModelFromJson(json);
  Map<String, dynamic> toJson() => _$NotificationModelToJson(this);
}
