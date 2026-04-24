# 计划 1：谷子多态数据建模 (Types & Schema)

## 目标
根据 `ARCHITECTURE.md` 的规范，在 `src/types/` 中建立支持“七大分类”的谷子多态类型（Polymorphic Types），并配合 Zod 实现后端的第一层防线。

## 验收标准
- [ ] 完成 `src/types/guzi.ts`，使用 Zod 和 TS Discriminated Union 定义出七大类的特有属性（如 `PaperCard` 的尺寸、`Badge` 的直径）。
- [ ] 完成基础的价格记录模型 `PriceRecord`。
- [ ] 确保这些类型既能在后端 `Service` 中作为校验依据，也能通过 `z.infer<>` 导出 TS 类型供前端或业务逻辑使用。

## 边界
- 暂不涉及数据库的具体 ORM 绑定，只做纯类型定义和校验层。
