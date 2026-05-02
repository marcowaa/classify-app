// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'growth_tree.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

GrowthTree _$GrowthTreeFromJson(Map<String, dynamic> json) => GrowthTree(
      id: json['id'] as String,
      childId: json['childId'] as String,
      currentStage: (json['currentStage'] as num?)?.toInt() ?? 1,
      totalGrowthPoints: (json['totalGrowthPoints'] as num?)?.toInt() ?? 0,
      tasksCompleted: (json['tasksCompleted'] as num?)?.toInt() ?? 0,
      gamesPlayed: (json['gamesPlayed'] as num?)?.toInt() ?? 0,
      rewardsEarned: (json['rewardsEarned'] as num?)?.toInt() ?? 0,
      wateringsCount: (json['wateringsCount'] as num?)?.toInt() ?? 0,
      lastGrowthAt: json['lastGrowthAt'] == null
          ? null
          : DateTime.parse(json['lastGrowthAt'] as String),
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$GrowthTreeToJson(GrowthTree instance) =>
    <String, dynamic>{
      'id': instance.id,
      'childId': instance.childId,
      'currentStage': instance.currentStage,
      'totalGrowthPoints': instance.totalGrowthPoints,
      'tasksCompleted': instance.tasksCompleted,
      'gamesPlayed': instance.gamesPlayed,
      'rewardsEarned': instance.rewardsEarned,
      'wateringsCount': instance.wateringsCount,
      'lastGrowthAt': instance.lastGrowthAt?.toIso8601String(),
      'createdAt': instance.createdAt?.toIso8601String(),
    };
