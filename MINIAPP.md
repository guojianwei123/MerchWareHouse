# 小程序专属规范

- 微信小程序用 `wx.xxx` API
- 公共逻辑放 `src/utils/`，平台差异用 `src/adapters/wx/` 隔离
- 禁止在页面层直接调后端接口，走 `src/service/`
- 禁止直接调 `wx.navigateTo`，走统一路由封装
- 错误提示统一封装 toast 组件
