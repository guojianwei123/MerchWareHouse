## 个人项目 AI 辅助开发完整方法论

---

### 一、仓库结构（知识全部入库）

```
my-project/
├── AGENTS.md                          ← 导航地图，100行以内
├── ARCHITECTURE.md                    ← 整体技术选型和系统设计
├── MINIAPP.md                         ← 小程序专属规范
├── FRONTEND.md                        ← 网页前端规范
├── SECURITY.md                        ← 认证方式、数据隐私
├── RELIABILITY.md                     ← 性能要求、错误处理规范
├── docs/
│   ├── product-specs/
│   │   ├── index.md                   ← 产品概述，用户是谁
│   │   └── feature-xxx.md             ← 各功能详细需求
│   ├── design-docs/
│   │   ├── index.md
│   │   └── core-beliefs.md            ← 关键设计决策（为什么这样选）
│   ├── exec-plans/
│   │   ├── active/                    ← 当前在做的功能计划
│   │   ├── completed/                 ← 已完成，留作上下文
│   │   └── tech-debt-tracker.md      ← 技术债记录
│   ├── generated/
│   │   ├── api-docs.md               ← 自动生成的API文档
│   │   └── db-schema.md              ← 自动生成的数据库结构
│   └── references/
│       ├── wechat-miniapp-llms.txt   ← 微信小程序API参考
│       ├── qq-miniapp-llms.txt       ← QQ小程序API参考
│       └── design-system-llms.txt   ← 统一设计规范
```

**核心原则：脑子里的想法、微信收藏的参考、备忘录里的需求——全部转成 Markdown 提交进来。AI 看不到的东西对它来说不存在。**

---

### 二、AGENTS.md 模板（只做导航）

```markdown
# 项目导航

## 项目概述
一句话描述项目是什么，解决什么问题。

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
- 微信小程序（基础库 3.x）
- QQ小程序（与微信保持同步）
- Web 网页（H5为主）
- 后端 API（Node.js / Python / Go）

## 黄金原则
- 所有外部数据必须在边界处验证
- 禁止跨层依赖
- 错误必须结构化处理
- 业务逻辑只写一次，平台差异在适配层隔离

## AI 注意事项
- 遇到不确定的需求，先读 docs/product-specs/
- 遇到架构问题，先读 ARCHITECTURE.md
- 不要假设平台API通用，差异见 docs/references/
```

---

### 三、分层架构（单向依赖，不可反向）

```
Types（类型定义，三端复用）
  ↓
Config（环境变量、appid、域名、功能开关）
  ↓
Repo（数据库操作、缓存、第三方API调用）
  ↓
Service（核心业务逻辑，三端尽量复用）
  ↓
Platform Adapter（平台适配层）
  ├── wx/        ← 微信小程序专属
  ├── qq/        ← QQ小程序专属
  └── web/       ← 网页专属
  ↓
Runtime（API路由、消息队列、定时任务）
  ↓
UI（App页面、小程序页面、网页组件）
```

**依赖规则：**

```
✅ Service → Repo          合法
✅ Runtime → Service       合法
✅ UI → Platform Adapter   合法
❌ Repo → Service          反向，违规
❌ UI → Config             跨层，违规
❌ 小程序页面直接调后端接口  跳层，违规
```

---

### 四、代码规范（写进 AGENTS.md，AI 自动遵守）

**通用规范：**

```markdown
## 代码规范
- 所有外部数据在边界处验证（用 zod / pydantic / joi）
- 禁止在 Service 层直接写 SQL，必须通过 Repo 层
- 错误必须结构化处理，禁止空 catch
- API 响应统一格式：{ data, error, code }
- 组件超过 200 行必须拆分
- 禁止硬编码密钥、URL、appid

## 禁止事项
- 禁止前端直接调用数据库
- 禁止跨层依赖
- 禁止 YOLO 式探测数据结构，必须验证或用类型化SDK
- 禁止重复造轮子，先查 utils/ 是否已有
```

**小程序专属规范（写进 MINIAPP.md）：**

```markdown
## 平台规范
- 微信小程序用 wx.xxx API
- QQ小程序用 qq.xxx API
- 公共逻辑放 utils/，平台差异用适配层隔离

## 禁止事项
- 禁止在页面层直接调后端接口，走 service/request.js
- 禁止直接调 wx.navigateTo，走统一路由封装
- 禁止在小程序使用 window / document
- 分包大小不超过 2MB
- 禁止登录态散落各页面，统一走 auth service

## 统一规范
- 网络请求统一走 utils/request.js
- 错误提示统一用 toast 组件
- 登录态统一走 service/auth.js
- 页面跳转统一封装，不直接调平台API
```

---

### 五、三端差异隔离方案

| 问题 | 解法 |
|---|---|
| 微信/QQ API 不一样 | 适配层封装，上层统一调用 |
| 登录体系不同 | 统一走后端换 token，前端不感知差异 |
| 样式不能完全复用 | 设计 token 统一，组件各自实现 |
| 发版节奏不同 | exec-plans 里注明各平台审核周期 |
| 小程序没有 window/document | 适配层屏蔽，Service 层不感知平台 |

**业务逻辑写一次，平台差异在适配层显式隔离，AI 才不会把微信 API 写进 QQ 小程序。**

---

### 六、执行计划管理（防需求蔓延）

每个功能建一个计划文件：

```markdown
# docs/exec-plans/active/2026-04-feature-xxx.md

## 目标
一句话描述要做什么。

## 验收标准（可量化）
- [ ] 用户可以完成 xxx 操作
- [ ] 接口响应时间 < 500ms
- [ ] 覆盖微信/QQ/Web 三端

## 不做什么（明确边界）
- 本期不做 xxx 功能
- 不考虑 xxx 场景

## 完成定义
- 三端冒烟测试通过
- 无 P0/P1 级别 bug
- 文档已更新
```

**AI 每次任务前先读 active 目录，知道当前上下文，不会跑偏。**

---

### 七、可观测性接入

**后端：**

| 监控项 | 工具（免费可用） |
|---|---|
| 接口报错 | Sentry |
| 性能指标 | Grafana Cloud |
| 用户行为 | PostHog |
| 日志 | Axiom / Loki |

**小程序端：**

| 监控项 | 工具 |
|---|---|
| 报错监控 | 微信自带错误查询 + Fundebug |
| 性能 | 微信开发者工具性能面板 |
| 用户行为 | 微信自带数据分析 |

**接入后，给 AI 的需求可以变成可验证的指标：**
- *"确保首屏加载在 2 秒内"*
- *"登录接口 P99 延迟不超过 500ms"*
- *"小程序启动时间不超过 1 秒"*

---

### 八、垃圾回收机制（防止代码腐烂）

每隔一段时间给 AI 下达清理任务：

```
扫描整个代码库，找出：
1. 违反分层架构的依赖
2. 重复的工具函数（应提取到 utils/）
3. 没有错误处理的 async 函数
4. 硬编码的值（密钥、URL、appid）
5. 超过 200 行的组件（需要拆分）
6. 小程序中直接调用平台 API 未经适配层的代码
生成重构 PR，每条附上修改原因
```

**类比垃圾回收：持续小额还技术债，比积累后一次性清理痛苦得多。**

---

### 九、AI 卡住时的处理方式

| AI 卡住的现象 | 真正原因 | 解法 |
|---|---|---|
| 反复问同一个问题 | 文档缺失 | 解释完立刻写进文档 |
| 生成的代码风格混乱 | 规范没有写清楚 | 补充到 AGENTS.md |
| 混用平台 API | 平台差异没有隔离 | 完善 MINIAPP.md 和适配层 |
| 架构越来越乱 | 分层规则没有强制执行 | 加 lint 规则机械化检查 |

> **AI 卡住 = 文档缺失的信号，不要反复口头解释，解释完就写进仓库。**

---

### 十、落地节奏

| 阶段 | 时间 | 重点 |
|---|---|---|
| **启动** | 第1周 | 建仓库结构，把脑子里的想法全写成文档 |
| **定规范** | 第2周 | 定好分层架构，写进 ARCHITECTURE.md 和 AGENTS.md |
| **跑起来** | 第3周 | 开始用 AI 生成代码，人工只做验收 |
| **补漏洞** | 持续 | 发现 AI 犯同类错误 → 立刻写进规范 |
| **防腐烂** | 每月 | 定期运行清理任务，扫描代码漂移 |

---

### 一句话总结

> 把你的品味、规范、决策全部写进仓库——**你只需要定规则，AI 负责在每一行代码上执行规则**。规则越清晰，AI 越可靠，你越省心。