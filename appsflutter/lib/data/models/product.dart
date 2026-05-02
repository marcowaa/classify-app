import 'package:json_annotation/json_annotation.dart';

part 'product.g.dart';

@JsonSerializable()
class Product {
  final String id;
  final String name;
  final String? nameAr;
  final String? description;
  final String? descriptionAr;
  final String? imageUrl;
  final int price;
  final int? pointsPrice;
  final String? categoryId;
  final String? categoryName;
  final bool isActive;
  final int stock;
  final int sortOrder;
  final DateTime? createdAt;

  const Product({
    required this.id,
    required this.name,
    this.nameAr,
    this.description,
    this.descriptionAr,
    this.imageUrl,
    required this.price,
    this.pointsPrice,
    this.categoryId,
    this.categoryName,
    this.isActive = true,
    this.stock = 0,
    this.sortOrder = 0,
    this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) =>
      _$ProductFromJson(json);
  Map<String, dynamic> toJson() => _$ProductToJson(this);

  String displayName(String locale) {
    if (locale == 'ar' && nameAr != null && nameAr!.isNotEmpty) {
      return nameAr!;
    }
    return name;
  }
}

@JsonSerializable()
class ProductCategory {
  final String id;
  final String name;
  final String? nameAr;
  final String? imageUrl;
  final int sortOrder;

  const ProductCategory({
    required this.id,
    required this.name,
    this.nameAr,
    this.imageUrl,
    this.sortOrder = 0,
  });

  factory ProductCategory.fromJson(Map<String, dynamic> json) =>
      _$ProductCategoryFromJson(json);
  Map<String, dynamic> toJson() => _$ProductCategoryToJson(this);
}
