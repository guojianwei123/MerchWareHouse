# 架构设计与系统规范 (Architecture)

根据“谷子仓库”的 MVP 阶段目标，系统将优先实现**后端 (Backend)** 和 **微信小程序端 (MiniApp)**。为了保证代码的可维护性、可扩展性以及防腐烂能力，系统采用**整洁架构 (Clean Architecture) / 端口适配器架构** 的变体。

---

## 一、系统总体拓扑图

```text
+-------------------+       HTTP/REST       +-------------------+
|                   |  <=================>  |                   |
|  微信小程序 (2D)    |                       |   后端服务 (Node)    |
|  (UI / 客户端)      |  <=================>  |  (核心业务 / DB)    |
|                   |       WebSocket       |                   |
+-------------------+      (可选，用于通知)     +-------------------+
        |                                             |
        v                                             v
[ 本地缓存 / Canvas ]                           [ PostgreSQL / OSS ]
```

---

## 二、后端架构设计 (Node.js / TypeScript)

后端是整个系统的核心，承担着 AI 提取调度、多态谷子模型校验、空间重叠检测等重资产逻辑。
我们采用**单向依赖**的分层设计：内层（业务/领域层）决不能依赖外层（框架/数据库层）。

### 2.1 后端目录流转图
```text
(外层: 框架与入口)      (中间层: 业务与用例)         (内层: 领域与类型)
    src/runtime/            src/service/              src/types/
    [API 路由]   ========>   [核心业务逻辑]  ========>   [Zod多态定义]
        |                        |                         ^
        v                        |                         |
    src/adapters/ <======== (依赖反转) =====================+
    [第三方 API / DB]
```

### 2.2 核心模块职责
1. **`src/types/` (领域模型层 - Domain/Entities)**
   - **职责**：定义 `GuziItem`（7大多态分类）、`PriceRecord`、`SpatialNode`。
   - **工具**：`Zod`，负责边界数据的绝对校验。此层**不依赖任何其他层**。
2. **`src/service/` (应用服务层 - Use Cases)**
   - **职责**：编排核心业务。例如：`ingestion.service.ts`（协调AI提取、校验并抛出异常）、`accessory.service.ts`（根据谷子尺寸计算配件推荐）、`spatial.service.ts`（校验谷子放进柜子是否越界）。
   - **规则**：只能调用 `types` 和 `repo/adapters` 暴露的**接口**（Interface），不能直接写 SQL 或调具体的 Axios 请求。
3. **`src/repo/` & `src/adapters/` (基础设施层 - Infrastructure)**
   - **`repo/`**：实现数据持久化（如 Prisma / TypeORM 连接 PostgreSQL）。
   - **`adapters/llm/`**：封装多模态大模型（如通义千问 VL）的 HTTP 调用。将大模型返回的散乱文本映射为 JSON。
4. **`src/runtime/` (框架路由层 - Presentation)**
   - **职责**：Express / Koa / Fastify 的路由入口。接收 HTTP 请求，解析 Token，调用 `service`，并格式化统一返回结构 `{ data, error, code }`。

---

## 三、小程序端架构设计 (Taro / React)

小程序端侧重于“2D空间拖拽”和“AI多模态采集”的用户交互，需要做好状态隔离，防止组件越写越大。

### 3.1 小程序目录流转图
```text
src/
 ├── types/         (前端类型，与后端保持一致或共享)
 ├── config/        (环境变量、API 域名)
 ├── service/       (网络请求层 request.js，封装 API 调用)
 ├── store/         (全局状态管理，如 Zustand/Zustand，管理当前的房间快照)
 ├── hooks/         (复用的业务 Hook，如 useIngestion)
 ├── components/    (纯 UI 组件，如 <CabinetGrid />, <GuziCard />)
 └── pages/         (页面容器，负责组装组件并注入状态)
```

### 3.2 核心设计决策 (前端)
1. **空间渲染引擎 (Canvas vs DOM)**
   - 考虑到拖拽“搭积木”的性能，MVP 阶段**优先采用 DOM (CSS Grid / Absolute Position)**，配合手势事件 (`touchmove`) 实现。当同一个房间内物品超过 200 个出现卡顿时，再降级为 `Canvas` 渲染。
2. **状态管理 (State Management)**
   - **局部状态**：页面表单、当前弹窗等使用 `useState`。
   - **领域状态**：例如“当前正在编辑的房间(Room)”，其包含众多坐标系，必须使用 `Zustand` 统一管理，防止跨组件 Prop Drilling。
3. **平台防腐层 (Adapter)**
   - 所有微信专有的 API (`wx.chooseMedia`, `wx.login`) 必须封装在 `src/adapters/wx/` 下，严禁在 `pages/` 里直接调用 `wx.xxx`，为日后扩展 App 端留出退路。

---

## 四、核心流程时序图示例

### 4.1 AI 智能录入时序图
```text
小程序(UI)             后端(Runtime)          大模型(Adapter)         数据库(Repo)
  |                       |                       |                      |
  |-- 1. 上传订单截图 ----> |                       |                      |
  |                       |-- 2. 组装 Prompt ----->|                      |
  |                       |<-- 3. 返回 JSON ------|                      |
  |                       |                       |                      |
  |                       | (Zod校验多态分类/尺寸)    |                      |
  |<-- 4. 返回识别结果 ---- |                       |                      |
  |                       |                       |                      |
  |-- 5. 用户确认并提交 ---> |                       |                      |
  |                       |-----------------------入库保存---------------->|
  |<-- 6. 保存成功 ------- |                       |                      |
```

## 五、架构禁忌 (黄金规则)
1. **禁止 UI 越权**：小程序 `pages` 绝对不能直接写死具体的 API 路径，必须调用 `src/service/` 下的方法。
2. **禁止后端 Service 直接操纵 DB**：`Service` 里不能出现 `SELECT * FROM`，必须通过注入的 `Repo` 接口调用。
3. **永远信任 Zod**：任何从外部（不管是前端提交，还是大模型生成的 JSON）进入后端 `Service` 的数据，第一步必须通过 Zod Schema 解析并抛出校验异常。
