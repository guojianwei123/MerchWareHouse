# 小程序专属规范

- 微信小程序用 `wx.xxx` API，QQ 小程序用 `qq.xxx` API
- 公共逻辑放 `src/utils/`，平台差异用 `src/adapters/miniapp/` 或明确的平台 adapter 隔离
- 登录必须走 `src/adapters/miniapp/auth.ts`，页面不得直接调用 `wx.login`、`qq.login`、`wx.getUserProfile` 或 QQ 用户信息 API
- 禁止在页面层直接调后端接口，走 `src/service/`
- 禁止直接调 `wx.navigateTo`，走统一路由封装
- 错误提示统一封装 toast 组件
