# API 文档

所有响应使用统一结构：

```json
{ "data": {}, "error": null, "code": "OK" }
```

错误响应使用：

```json
{ "data": null, "error": { "message": "错误信息" }, "code": "VALIDATION_ERROR" }
```

## 录入与上传

- `POST /api/uploads/images`：上传 base64 图片。
  - Body: `{ "fileBase64": "...", "originalName": "image.jpg", "contentType": "image/jpeg" }`
  - Return: `{ "imageUrl": "http://localhost:3000/uploads/..." }`
- `POST /api/ingestion/extract`：从图片 URL 识别谷子草稿。
  - Body: `{ "imageUrl": "https://..." }`
  - Return: `GuziItem`
- `POST /api/links/parse`：解析商品链接的标题和候选图片。
  - Body: `{ "url": "https://..." }`

## 库存

- `GET /api/items`：查询库存，支持 `ip`、`character`、`series`、`type` 查询参数。
- `POST /api/items`：创建库存项，Body 必须匹配 `GuziUnionSchema`。
- `PATCH /api/items/:id`：更新库存项，Body 必须匹配 `GuziUnionSchema`。
- `DELETE /api/items/:id`：删除库存项。

## 资产与配件

- `GET /api/assets/dashboard`：返回资产总览。
- `GET /api/accessories/recommendations/:itemId`：返回指定谷子的配件推荐。

## 展示柜

- `GET /api/showcases/:id`：读取展示柜。
- `POST /api/showcases`：保存展示柜，Body 必须匹配 `ShowcaseSchema`。
- `GET /api/showcases/:id/public`：读取公开只读分享视图。
- `POST /api/showcases/:id/clone`：保存同款公开布局到当前用户。

## 我的

- `GET /api/export`：导出库存和资产摘要 JSON。
- `GET /api/reminders`：读取提醒设置。
- `PUT /api/reminders`：保存提醒设置。
- `POST /api/themes/generate`：根据主题词生成 CSS token 包。
