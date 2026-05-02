// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'game.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Game _$GameFromJson(Map<String, dynamic> json) => Game(
      id: json['id'] as String,
      name: json['name'] as String,
      nameAr: json['nameAr'] as String?,
      description: json['description'] as String?,
      descriptionAr: json['descriptionAr'] as String?,
      url: json['url'] as String,
      imageUrl: json['imageUrl'] as String?,
      category: json['category'] as String?,
      pointsReward: (json['pointsReward'] as num?)?.toInt() ?? 10,
      isActive: json['isActive'] as bool? ?? true,
      minAge: (json['minAge'] as num?)?.toInt(),
      maxAge: (json['maxAge'] as num?)?.toInt(),
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$GameToJson(Game instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'nameAr': instance.nameAr,
      'description': instance.description,
      'descriptionAr': instance.descriptionAr,
      'url': instance.url,
      'imageUrl': instance.imageUrl,
      'category': instance.category,
      'pointsReward': instance.pointsReward,
      'isActive': instance.isActive,
      'minAge': instance.minAge,
      'maxAge': instance.maxAge,
      'sortOrder': instance.sortOrder,
      'createdAt': instance.createdAt?.toIso8601String(),
    };
