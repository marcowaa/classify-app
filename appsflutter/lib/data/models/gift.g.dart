// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'gift.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Gift _$GiftFromJson(Map<String, dynamic> json) => Gift(
      id: json['id'] as String,
      parentId: json['parentId'] as String?,
      childId: json['childId'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      pointsValue: (json['pointsValue'] as num?)?.toInt(),
      status: json['status'] as String? ?? 'pending',
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$GiftToJson(Gift instance) => <String, dynamic>{
      'id': instance.id,
      'parentId': instance.parentId,
      'childId': instance.childId,
      'title': instance.title,
      'description': instance.description,
      'imageUrl': instance.imageUrl,
      'pointsValue': instance.pointsValue,
      'status': instance.status,
      'createdAt': instance.createdAt?.toIso8601String(),
    };
