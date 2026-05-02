// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'task.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Task _$TaskFromJson(Map<String, dynamic> json) => Task(
      id: json['id'] as String,
      parentId: json['parentId'] as String?,
      childId: json['childId'] as String?,
      question: json['question'] as String,
      imageUrl: json['imageUrl'] as String?,
      points: (json['points'] as num?)?.toInt() ?? 10,
      answers: (json['answers'] as List<dynamic>?)
          ?.map((e) => TaskAnswer.fromJson(e as Map<String, dynamic>))
          .toList(),
      correctAnswer: json['correctAnswer'] as String?,
      childAnswer: json['childAnswer'] as String?,
      status: json['status'] as String? ?? 'pending',
      subjectId: json['subjectId'] as String?,
      subjectName: json['subjectName'] as String?,
      difficulty: (json['difficulty'] as num?)?.toInt(),
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
    );

Map<String, dynamic> _$TaskToJson(Task instance) => <String, dynamic>{
      'id': instance.id,
      'parentId': instance.parentId,
      'childId': instance.childId,
      'question': instance.question,
      'imageUrl': instance.imageUrl,
      'points': instance.points,
      'answers': instance.answers,
      'correctAnswer': instance.correctAnswer,
      'childAnswer': instance.childAnswer,
      'status': instance.status,
      'subjectId': instance.subjectId,
      'subjectName': instance.subjectName,
      'difficulty': instance.difficulty,
      'createdAt': instance.createdAt?.toIso8601String(),
      'completedAt': instance.completedAt?.toIso8601String(),
    };

TaskAnswer _$TaskAnswerFromJson(Map<String, dynamic> json) => TaskAnswer(
      text: json['text'] as String,
      isCorrect: json['isCorrect'] as bool? ?? false,
    );

Map<String, dynamic> _$TaskAnswerToJson(TaskAnswer instance) =>
    <String, dynamic>{
      'text': instance.text,
      'isCorrect': instance.isCorrect,
    };
