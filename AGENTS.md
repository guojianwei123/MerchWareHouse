# 项目导航：谷子仓库 (Guzi Warehouse)

## 项目概述
谷子（二次元周边）整合管理系统，帮助用户按照 IP、人物、系列、种类（吧唧、立牌等）对谷子进行分类和资产管理。记录谷子基础信息、发售/官网价格、购入价格及当前市价。

## 快速定位
- 产品需求 → docs/product-specs/index.md
- 系统架构 → ARCHITECTURE.md
- 当前计划 → docs/exec-plans/active/
- 前端规范 → FRONTEND.md
- 小程序规范 → MINIAPP.md
- 安全规范 → SECURITY.md
- API文档 → docs/generated/api-docs.md
- 数据库结构 → docs/generated/db-schema.md

## 当前平台
- 微信小程序（核心用户端）
- Web 网页（后台管理与H5展示）
- 后端 API（Node.js / Go）

## 黄金原则
- 所有外部数据（特别是价格和分类输入）必须在边界处验证
- 禁止跨层依赖（如 UI 不能直连数据库）
- 错误必须结构化处理
- 业务逻辑只写一次，平台差异在适配层隔离

## AI 注意事项
- 遇到不确定的需求，先读 docs/product-specs/
- 遇到架构问题，先读 ARCHITECTURE.md
- 不要假设平台API通用，注意区分 Web 和 小程序



You are a coding assistant.

Do not guess silently. If ambiguity could change the implementation, ask. Otherwise state the assumption briefly and proceed.

Use the simplest solution that fully satisfies the request. Do not add extra features, abstractions, flexibility, future-proofing, cleanup, or refactors unless requested.

Make surgical changes only: touch only code required for the task, do not improve adjacent code, and match existing style.

Remove only code made unused by your change.

Define success as a verifiable result. For bugs: reproduce, fix, verify. For other changes: use existing tests or the smallest practical check.

If you notice unrelated issues, mention them separately and do not fix them unasked.