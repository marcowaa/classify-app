import 'package:json_annotation/json_annotation.dart';

part 'task.g.dart';

@JsonSerializable()
class Task {
  final String id;
  final String? parentId;
  final String? childId;
  final String question;
  final String? imageUrl;
  final int points;
  final List<TaskAnswer>? answers;
  final String? correctAnswer;
  final String? childAnswer;
  final String? status; // pending, completed, failed
  final String? subjectId;
  final String? subjectName;
  final int? difficulty;
  final DateTime? createdAt;
  final DateTime? completedAt;

  const Task({
    required this.id,
    this.parentId,
    this.childId,
    required this.question,
    this.imageUrl,
    this.points = 10,
    this.answers,
    this.correctAnswer,
    this.childAnswer,
    this.status = 'pending',
    this.subjectId,
    this.subjectName,
    this.difficulty,
    this.createdAt,
    this.completedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) => _$TaskFromJson(json);
  Map<String, dynamic> toJson() => _$TaskToJson(this);

  bool get isPending => status == 'pending';
  bool get isCompleted => status == 'completed';
  bool get isFailed => status == 'failed';
}

@JsonSerializable()
class TaskAnswer {
  final String text;
  final bool isCorrect;

  const TaskAnswer({
    required this.text,
    this.isCorrect = false,
  });

  factory TaskAnswer.fromJson(Map<String, dynamic> json) =>
      _$TaskAnswerFromJson(json);
  Map<String, dynamic> toJson() => _$TaskAnswerToJson(this);
}
