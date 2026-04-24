# 计划 3：AI 图片摄取 MVP (Adapter & Service)

## 目标
打通从订单截图/谷子图片到结构化草稿数据的 AI 解析链路，并使用 `src/types/models/guzi.schema.ts` 进行强校验。

## 验收标准
- [ ] 编写 `src/adapters/llm/vision.adapter.ts` 或等价 LLM/VLM adapter，封装图片识别调用接口，返回 JSON 字符串或结构化对象。
- [ ] 编写 `src/config/ai-prompts.ts`，包含针对七大分类的特征提取 Prompt，并明确尺寸单位为 mm、价格单位为 CNY。
- [ ] 编写 `src/service/ingestion.service.ts`，完成图片输入、Prompt 组装、AI 结果解析、`GuziUnionSchema.parse()` 校验和草稿生成。
- [ ] AI 结果中的分类值必须与 `GuziUnionSchema` 的 `type` 字段一致。
- [ ] 产出最小测试脚本或测试用例，证明有效 AI JSON 能生成草稿，缺少分类必填字段时会失败。

## 边界
- MVP 只覆盖图片/截图输入。
- 语音录入、ASR、批量识别和真实前端上传组件不进入本计划。
- 不在本计划中保存最终库存；保存动作由库存管理计划负责。

## 最小验证方式
- 使用本地 mock 图片 URL 或 fixture JSON 跑通 `processScreenshot()`。
- 验证 `validateExtractedJson()` 返回已 parse 的 `GuziItem`，不是简单布尔值。
- 验证错误会交给 `src/runtime/middlewares/error.middleware.ts` 统一格式化。
