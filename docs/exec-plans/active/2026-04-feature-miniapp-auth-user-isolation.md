# 计划 8：小程序登录与用户数据隔离

## 目标
实现微信小程序和 QQ 小程序兼容的真实用户登录，支持头像昵称展示，并将库存、分类、展示柜和导出等用户数据按登录用户完整隔离。Web/H5 保留开发访客模式，方便现有页面继续调试。

## 范围
- [ ] 新增跨平台小程序登录适配层，统一封装 `wx.login`、`qq.login` 和头像昵称授权。
- [ ] 新增后端认证接口 `POST /api/auth/miniapp/login`，用小程序 `code` 换取平台 `openid` 并签发本系统 session token。
- [ ] 新增后端 `PATCH /api/auth/me`，用于保存用户授权后的头像昵称。
- [ ] 新增 `User` 数据模型，并为库存、分类、展示柜等用户数据建立 owner 隔离。
- [ ] 新增认证中间件，受保护接口必须从 session token 获取当前用户，不再信任客户端传入 ownerId。
- [ ] 更新 `ProfilePage`，展示登录卡片、头像昵称授权入口、平台标识和同步状态。
- [ ] Web/H5 开发环境保留 dev guest 登录，不作为生产登录方案。

## 实现要求
- 小程序登录适配器放在平台防腐层中，页面层不得直接调用 `wx.xxx` 或 `qq.xxx`。
- 登录请求入参使用 Zod 校验：`provider` 只能为 `wechat`、`qq` 或开发环境的 `dev`，`code` 必填，`profile` 可选。
- 微信 code 换 session 调用 `https://api.weixin.qq.com/sns/jscode2session`，QQ 调用 QQ 小程序对应 `jscode2session` 接口。
- 环境变量包含 `WECHAT_MINIAPP_APPID`、`WECHAT_MINIAPP_SECRET`、`QQ_MINIAPP_APPID`、`QQ_MINIAPP_SECRET`、`AUTH_TOKEN_SECRET`。
- `User` 表至少包含 `id`、`provider`、`openId`、`nickname`、`avatarUrl`、`createdAt`、`updatedAt`，并对 `provider + openId` 建唯一约束。
- `GuziItem` 增加 `ownerId`，历史数据迁移到开发访客或 `local-user` 对应用户。
- 库存、分类、展示柜、资产统计、导出和提醒等用户数据接口必须按当前 token 用户过滤。
- 私有展示柜读取和保存必须校验 owner；公开展示页可匿名访问，但只返回该展示柜 owner 的引用物品。
- `cloneShowcase` 目标 owner 从 token 获取，不再从 body 信任。
- 头像昵称授权失败不影响登录；界面使用默认头像和用户短码兜底。
- 不做微信与 QQ 跨平台账号合并；同一用户在微信和 QQ 登录视为两个独立账号。
- 手机号绑定不进入本计划。

## 验收标准
- 微信小程序环境可以登录并获取系统 session token。
- QQ 小程序环境可以登录并获取系统 session token。
- “我的”页未登录时显示登录入口，登录后显示头像昵称或默认身份、平台标识和同步状态。
- 用户拒绝头像昵称授权后仍保持登录，可以继续使用同步能力。
- 用户 A 与用户 B 的库存、分类、私有展示柜、资产统计和导出结果互不可见。
- 用户不能更新或删除不属于自己的库存、分类和私有展示柜。
- 未携带 token 或 token 无效时，受保护接口返回结构化 401 错误。
- 公开展示柜分享页可匿名访问，且不会泄露其他用户的库存物品。
- Web/H5 开发环境可以使用 dev guest 模式继续调试现有界面。

## 验证
- 运行 auth adapter 单测，覆盖 `wx.login`、`qq.login`、Web dev guest、头像昵称授权成功和拒绝。
- 运行 auth service/runtime 单测，覆盖 code exchange、用户创建/复用、token 签发解析、生产环境禁止 dev provider、401 错误。
- 运行数据隔离测试，覆盖库存、分类、展示柜、资产统计、导出和公开展示页。
- 运行 Prisma migration 并验证 `User`、`GuziItem.ownerId`、相关索引和历史数据迁移。
- 运行 `./node_modules/.bin/vitest run`。
- 运行 `./node_modules/.bin/tsc --noEmit`。
- 手动验证微信小程序、QQ 小程序和 Web dev guest 三种入口的登录状态展示与基础数据读取。
