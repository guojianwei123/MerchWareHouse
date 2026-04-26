# 计划 1：谷子多态数据建模 (Types & Schema)

## 目标
根据 `ARCHITECTURE.md` 和 `docs/product-specs/feature-guzi-categories.md`，在 `src/types/models/` 中建立支持七大分类的谷子多态类型，并配合 Zod 实现后端第一层数据校验。

## 验收标准
- [x] 完成 `src/types/models/guzi.schema.ts`，使用 Zod discriminated union 定义 `PaperCard`、`Acrylic`、`Badge`、`Fabric`、`Figure`、`Practical`、`Special`。
- [x] `BaseGuziSchema` 包含 `id`、`name`、`ip`、`character`、`series`、`imageUrl` 和基础价格字段。
- [x] 七大分类包含需求文档规定的核心字段和单位，例如 `PaperCard.length/width`、`Badge.diameter/shape`、`Acrylic.height/hasBase`。
- [x] 完成 `src/types/models/transaction.schema.ts` 的 `PriceRecordSchema`，覆盖官方发售价、购入价、当前市场价和记录日期。
- [x] 通过 `z.infer<>` 导出 `GuziItem`、`PriceRecord` 等 TS 类型，供 `src/service/`、`src/repo/`、前端状态使用。

## 边界
- 暂不绑定具体 ORM 或数据库迁移。
- 暂不实现列表、入库、统计和展示柜业务逻辑。
- 暂不自动抓取市场价格。

## 最小验证方式
- 编写或运行最小 schema 校验脚本，验证每个分类的有效样例可以 parse。
- 验证缺少必填分类字段时 Zod 会抛出错误。
- 验证 `GuziItem` 和 `PriceRecord` 类型能被服务层导入。
