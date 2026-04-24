# 计划 2：AI 多模态提取 MVP (Adapter & Service)

## 目标
打通从“订单截图/语音”到“结构化分类数据”的 AI 解析链路。

## 验收标准
- [ ] 编写 `src/adapters/llm/vlm.adapter.ts`，封装大模型调用接口。
- [ ] 编写 `src/config/ai-prompts.ts`，包含针对“七大分类”的特征提取 Prompt（如：若识别为吧唧，强制提取尺寸 mm）。
- [ ] 编写 `src/service/ingestion.service.ts`，将 AI 结果使用 `guzi.ts` 的 Zod schema 进行强校验验证。
- [ ] 产出测试脚本证明 AI 提取流程闭环。

## 边界
- 暂不实现前端截图上传组件，后端直接读取本地测试图片即可。
