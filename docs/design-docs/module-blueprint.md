# 📦 谷子仓库 (Guzi Warehouse) - 模块颗粒度拆分蓝图

根据 `ARCHITECTURE.md` 的整洁架构原则，本项目将后端（Node.js/TypeScript）和小程序端（Taro/React）拆分为以下具体模块和核心函数。本蓝图用于指导开发和测试。

---

## 一、后端模块拆分 (Backend - Node.js/TypeScript)

### 1. 领域模型层 Domain / Entities (`src/types/`)
*绝对纯净的类型和 Zod 定义，无外部依赖。*

*   **`models/guzi.schema.ts`**
    *   `BaseGuziSchema`: 包含基础字段（id, name, ip, character, acquisitionPrice 等）。
    *   `BadgeSchema` / `PaperCardSchema` / `AcrylicSchema` / `FabricSchema` / `FigureSchema` / `PracticalSchema` / `SpecialSchema`: 7大分类的特有属性（如 `Badge` 需要 `diameter`，`Figure` 需要 `scale`）。
    *   `GuziUnionSchema`: 使用 Zod 的 `discriminatedUnion` 合并以上分类，用于多态校验。
*   **`models/spatial.schema.ts`**
    *   `SpatialNodeSchema`: 定义通用空间节点（含 x, y, z, width, height, depth）。
*   **`models/transaction.schema.ts`**
    *   `PriceRecordSchema`: 价格时序表记录（发售价、购入价、市场价）。

### 2. 应用服务层 Use Cases (`src/service/`)
*核心业务逻辑的编排。*

*   **`ingestion.service.ts` (AI 摄取服务)**
    *   `processScreenshot(imgUrl: string)`: 调度大模型适配器，传入图片和 Prompt。
    *   `validateExtractedJson(json: any)`: 强制使用 `GuziUnionSchema.parse()` 校验大模型返回的 JSON，抛出 ZodError。
    *   `createDraftItem(data: GuziItem)`: 生成待用户确认的草稿数据。
*   **`accessory.service.ts` (配件推荐服务)**
    *   `recommendSleeveForCard(width: number, height: number)`: 为纸片类推荐自封袋/卡砖。
    *   `recommendBoxForBadge(diameter: number)`: 为徽章类推荐保护套。
*   **`spatial.service.ts` (空间与碰撞服务)**
    *   `checkCollision(existingNodes: SpatialNode[], newNode: SpatialNode)`: 进行 2D/3D 的 AABB 碰撞检测，防止谷子重叠摆放。
    *   `validateCabinetCapacity(cabinetId: string, itemDimensions: Dimensions)`: 计算柜子剩余容量。

### 3. 基础设施层 Infrastructure (`src/adapters/` & `src/repo/`)
*外部 API 和数据库的实现。*

*   **`adapters/llm/vision.adapter.ts`**: 
    *   `extractGuziInfo(imageUrl: string)`: 封装多模态大模型（如通义千问VL、GPT-4o）的 HTTP 请求，返回纯 JSON 字符串。
*   **`adapters/oss/storage.adapter.ts`**: 
    *   `uploadImage(fileBuffer: Buffer)`: 上传图片至 OSS/S3 并返回 URL。
*   **`repo/guzi.repo.ts`**:
    *   `saveItem(item: GuziItem)`: 将数据持久化到 PostgreSQL。

### 4. 框架运行时层 Runtime (`src/runtime/`)
*Express / Koa 的路由与中间件。*

*   **`middlewares/error.middleware.ts`**: 统一拦截 `ZodError` 并格式化为 400 错误。
*   **`controllers/ingestion.controller.ts`**: 处理图片上传接口，调用 `ingestion.service.ts`。

---

## 二、小程序端模块拆分 (MiniApp - Taro/React)

### 1. 全局状态管理 (`src/store/`)
*使用 Zustand 管理核心领域状态。*

*   **`roomStore.ts` (空间编辑器状态)**
    *   State: `roomId`, `nodes: SpatialNode[]` (当前房间内的所有谷子/柜子)
    *   Actions: `addNode()`, `updateNodePosition(id, x, y)`, `removeNode()`
*   **`inventoryStore.ts` (仓库状态)**
    *   State: `draftItem` (AI提取后的草稿), `items` (已入库谷子列表)

### 2. 平台防腐适配器 (`src/adapters/wx/`)
*隔离微信专有 API。*

*   **`media.ts`**: `chooseImage()` (封装 `wx.chooseMedia`)。
*   **`auth.ts`**: `login()` (封装 `wx.login`)。

### 3. 核心复用 Hooks (`src/hooks/`)
*   **`useDrag.ts`**: 封装 `touchstart`, `touchmove`, `touchend` 逻辑，计算并返回拖拽位移 `(x, y)`。
*   **`useCollision.ts`**: 在拖拽时实时与 `roomStore` 中的其他节点进行边界判断，用于渲染“红色警告框”。

### 4. 页面容器 (`src/pages/`)
*   **`RoomEditorPage` (核心 2D 网格编辑器)**
    *   功能：读取 `roomStore` 渲染网格；绑定 `useDrag` 进行谷子摆放；触发 `checkCollision()`；点击“保存”调用后端接口。
*   **`DraftReviewPage` (AI 结果确认页)**
    *   功能：读取 `inventoryStore.draftItem`，根据类型动态渲染表单（例如吧唧显示“直径”输入框），供用户修正大模型的提取误差。
*   **`UploadPage`**: 触发 `media.adapter` 拍照，展示 AI 识别 loading 态。

### 5. UI 组件 (`src/components/`)
*   **`Spatial/DraggableItem`**: 绑定拖拽事件的绝对定位块。
*   **`Forms/DynamicGuziForm`**: 根据 7 大分类动态切换字段的表单组件。
