# Active 执行计划

## 执行顺序
1. `2026-04-feature-data-modeling.md`：数据建模。
2. `2026-04-feature-inventory-management-mvp.md`：库存管理。
3. `2026-04-feature-ai-ingestion-mvp.md`：AI 图片摄取。
4. `2026-04-feature-spatial-mapping-mvp.md`：空间映射与配件推荐。
5. `2026-04-feature-asset-dashboard-mvp.md`：资产统计看板。
6. `2026-04-feature-showcase-sharing-mvp.md`：展示柜分享。
7. `2026-04-feature-ai-assistant-nav.md`：AI 对话导航。
8. `2026-04-feature-miniapp-auth-user-isolation.md`：小程序登录与用户数据隔离。

## 当前进度快照
- 数据建模、库存管理、AI 图片摄取、空间映射与配件推荐、资产统计看板、展示柜分享 6 个 active 计划均已完成。
- AI 对话导航已完成源码实现，提供右上角 `AI` 入口、`AIPage` 和 `POST /api/ai/chat`。
- 小程序登录与全数据隔离为待实施计划，涉及 Prisma migration、后端 auth、前端 auth store、Profile UI 和小程序适配器。
- 进度依据：各计划文件验收项均已勾选完成，源码中对应 schema、service、repo、store、page 和 adapter 模块已存在。
- 验证结果：`./node_modules/.bin/vitest run` 通过 21 个测试文件、70 个测试；`./node_modules/.bin/tsc --noEmit` 通过。
- 环境备注：当前环境没有全局 `pnpm`，因此使用本地 `node_modules/.bin` 执行同等测试和类型检查。
- 归档状态：已完成计划暂不移出 active 目录，保留当前位置作为 MVP 闭环记录。

## 原则
- 每个计划必须能独立验收。
- 计划中的路径必须与 `docs/design-docs/module-blueprint.md` 保持一致。
- 不在同一个计划中混合无关功能。
- 外部输入必须先通过 Zod schema 校验。
