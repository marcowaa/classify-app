// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notification_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NotificationModel _$NotificationModelFromJson(Map<String, dynamic> json) =>
    NotificationModel(
      id: json['id'] as String,
      parentId: json['parentId'] as String?,
      childId: json['childId'] as String?,
      type: json['type'] as String,
      title: json['title'] as String,
      message: json['message'] as String,
      read: json['read'] as bool? ?? false,
      style: json['style'] as String?,
      priority: json['priority'] as String?,
      relatedId: json['relatedId'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$NotificationModelToJson(NotificationModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'parentId': instance.parentId,
      'childId': instance.childId,
      'type': instance.type,
      'title': instance.title,
      'message': instance.message,
      'read': instance.read,
      'style': instance.style,
      'priority': instance.priority,
      'relatedId': instance.relatedId,
      'metadata': instance.metadata,
      'createdAt': instance.createdAt?.toIso8601String(),
    };
