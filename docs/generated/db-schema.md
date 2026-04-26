# 数据库结构

数据库使用 PostgreSQL + Prisma。

## GuziItem

- `id`: 主键
- `name`, `type`, `ip`, `character`, `series`, `imageUrl`: 基础字段
- `officialPrice`, `purchasePrice`, `marketPrice`: 可选价格字段
- `details`: JSON，保存不同分类的扩展字段
- `createdAt`, `updatedAt`: 审计时间

## PriceRecord

- `id`: 主键
- `guziId`: 关联 `GuziItem`
- `date`: 价格记录时间
- `officialPrice`, `purchasePrice`, `marketPrice`: 可选价格字段
- `createdAt`: 创建时间

## SpatialNode

- `id`: 主键
- `nodeType`: `room` / `cabinet` / `shelf` / `slot` / `item`
- `parentId`, `guziId`: 可选引用
- `x`, `y`, `z`, `width`, `height`, `depth`: 空间位置和尺寸
- `createdAt`, `updatedAt`: 审计时间

## Showcase

- `id`: 主键
- `title`: 展示柜名称
- `ownerId`: 所有者
- `isPublic`: 是否公开
- `nodes`: JSON，保存展示柜空间节点
- `createdAt`, `updatedAt`: 审计时间
