// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'product.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Product _$ProductFromJson(Map<String, dynamic> json) => Product(
      id: json['id'] as String,
      name: json['name'] as String,
      nameAr: json['nameAr'] as String?,
      description: json['description'] as String?,
      descriptionAr: json['descriptionAr'] as String?,
      imageUrl: json['imageUrl'] as String?,
      price: (json['price'] as num).toInt(),
      pointsPrice: (json['pointsPrice'] as num?)?.toInt(),
      categoryId: json['categoryId'] as String?,
      categoryName: json['categoryName'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$ProductToJson(Product instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'nameAr': instance.nameAr,
      'description': instance.description,
      'descriptionAr': instance.descriptionAr,
      'imageUrl': instance.imageUrl,
      'price': instance.price,
      'pointsPrice': instance.pointsPrice,
      'categoryId': instance.categoryId,
      'categoryName': instance.categoryName,
      'isActive': instance.isActive,
      'stock': instance.stock,
      'sortOrder': instance.sortOrder,
      'createdAt': instance.createdAt?.toIso8601String(),
    };

ProductCategory _$ProductCategoryFromJson(Map<String, dynamic> json) =>
    ProductCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      nameAr: json['nameAr'] as String?,
      imageUrl: json['imageUrl'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ProductCategoryToJson(ProductCategory instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'nameAr': instance.nameAr,
      'imageUrl': instance.imageUrl,
      'sortOrder': instance.sortOrder,
    };
