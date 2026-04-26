# 计划 2：库存录入与管理 MVP

## 目标
实现谷子库存的手动录入、AI 草稿确认入库、编辑、删除、列表和基础筛选。

## 验收标准
- [x] `src/repo/guzi.repo.ts` 使用 `GuziItem` 类型提供保存、更新、删除、查询接口。
- [x] `src/service/` 中提供库存管理服务，所有入库和更新数据先通过 `GuziUnionSchema.parse()` 校验。
- [x] `src/store/inventoryStore.ts` 管理 `draftItem` 和 `items`，支持确认草稿入库、更新和删除。
- [x] `src/pages/DraftReviewPage` 使用 `src/components/Forms/DynamicGuziForm` 根据七大分类渲染可编辑字段。
- [x] 库存列表支持按 IP、人物、系列、分类筛选。

## 边界
- 不实现真实数据库迁移；可以先使用内存仓储或仓储接口。
- 不实现资产统计看板；统计由后续计划负责。
- 不实现真实 OSS 上传；图片 URL 可来自已有 adapter 或测试输入。

## 最小验证方式
- 验证手动构造的合法 `GuziItem` 可以保存到库存。
- 验证 AI 草稿确认后进入 `items`。
- 验证编辑只影响目标 item，删除后列表不再出现该 item。
- 验证筛选条件能按 IP、人物、系列、分类返回正确结果。
