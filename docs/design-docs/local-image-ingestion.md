# Local Image Ingestion

图片识别入口统一从本地设备选择图片，跨端传给后端的格式保持一致：

```json
{
  "imageUrl": "data:image/jpeg;base64,..."
}
```

## Web

Web 端使用系统文件选择器读取 JPEG、PNG 或 WebP 图片，转换为 Data URL 后调用 `POST /api/ingestion/extract`。

## 微信小程序

小程序页面不得直接调用 `wx.chooseMedia`。页面应调用 `src/adapters/wx/media.ts` 中的 `chooseImage()`，再用 `readWechatImageAsLocalInput()` 读取临时文件并转换为 Data URL。

## iOS 原生

iOS 原生端使用系统照片选择器取得图片二进制，保留或转换为 JPEG、PNG、WebP 后组装 Data URL，并调用同一个 `POST /api/ingestion/extract` 接口。当前仓库不包含 iOS 工程。
