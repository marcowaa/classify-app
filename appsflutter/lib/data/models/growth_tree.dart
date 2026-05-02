import 'package:json_annotation/json_annotation.dart';

part 'growth_tree.g.dart';

@JsonSerializable()
class GrowthTree {
  final String id;
  final String childId;
  final int currentStage;
  final int totalGrowthPoints;
  final int tasksCompleted;
  final int gamesPlayed;
  final int rewardsEarned;
  final int wateringsCount;
  final DateTime? lastGrowthAt;
  final DateTime? createdAt;

  const GrowthTree({
    required this.id,
    required this.childId,
    this.currentStage = 1,
    this.totalGrowthPoints = 0,
    this.tasksCompleted = 0,
    this.gamesPlayed = 0,
    this.rewardsEarned = 0,
    this.wateringsCount = 0,
    this.lastGrowthAt,
    this.createdAt,
  });

  factory GrowthTree.fromJson(Map<String, dynamic> json) =>
      _$GrowthTreeFromJson(json);
  Map<String, dynamic> toJson() => _$GrowthTreeToJson(this);

  /// Stage names for display
  static const List<String> stageNames = [
    'بذرة',    // 1
    'برعم',    // 2
    'شتلة',    // 3
    'نبتة صغيرة', // 4
    'شجيرة',   // 5
    'شجرة صغيرة', // 6
    'شجرة نامية', // 7
    'شجرة ذهبية', // 8
  ];

  String get stageName {
    if (currentStage >= 1 && currentStage <= stageNames.length) {
      return stageNames[currentStage - 1];
    }
    return stageNames.last;
  }

  double get progressPercentage {
    return (currentStage / stageNames.length).clamp(0.0, 1.0);
  }
}
