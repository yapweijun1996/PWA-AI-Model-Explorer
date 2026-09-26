# Model Explorer：学习与比较 AI 模型

这是一个纯静态 PWA，保留原本 V5 的模型资料、图表、筛选和比较功能，并重构成可维护的独立模块。没有后端、登录、AI API Key 或运行时 CDN。

## 最快开始

安装 Node.js 22+，在项目目录运行 `npm start`，然后打开终端显示的 localhost 地址。不要直接双击 HTML。浏览器需要 HTTP/HTTPS 才能正确加载模块、数据和 Service Worker。

## 发布 GitHub Pages

创建 `AI-Model-Explorer` 仓库。先在本地运行 `npm run check`、`npm test` 和 `npm run build`，再使用你选择的 GitHub Pages 方式发布 **`dist/` 的内容**。当前 checkout 没有包含 `.github/workflows/pages.yml`；如果使用 GitHub Actions，需要另外添加并维护该 workflow，也可以使用 branch-based Pages 直接发布 `dist/`。工具没有替你建立或发布仓库。

不要把未经构建的源码根目录当作上线目录。

## 日常使用逻辑

先 Learn 理解 Intelligence Index、Cost、Speed 与 First-chunk Latency；再 Explore 筛选及排序。勾选 2–4 个模型，点击 Compare models，查看模型做列、指标做行的矩阵。打开一个模型，可记录自己的学习笔记。笔记与答题进度只存在当前浏览器，换设备前在 Settings 导出备份。

成本是源数据的每任务美元成本，不是每百万 token API 价格。资料是用户提供的 snapshot，并非实时排行榜。`—` 是未知，不等于零；`$0.00` 不能当作保证免费。

## PWA 逻辑

安装：支持的浏览器会提供安装提示；iPhone 使用 Safari → 分享 → 加入主画面。只有显示 Ready offline 后，才代表已缓存离线核心功能。

更新：Settings 显示版本和 Check for updates。检测到新 Worker 后先显示通知，不会直接强制刷新。点击 Update now，显示更新状态，等待激活完成再重新加载。已保存的笔记和比较选择会保留；有未保存笔记时先阻止更新。

发布新版前：`npm run release -- 1.0.1`，然后运行 `npm run check`、`npm test`、`npm run build` 和浏览器测试。每次构建会生成独立内容指纹和 Cache 名称，只清理本应用的旧 Cache。

## 上线前务必确认

代码的 MIT 授权不代表第三方 benchmark 数据也可以任意公开。此 snapshot 的再发布许可尚未确认；公开前请检查原始数据条款，或替换成可合法公开的同格式资料。

自动测试不等于真机验收。iPhone/iPad 的实际安装与系统状态栏，以及真实 GitHub Pages 链接，仍需你发布后检查。测试证据与未验证项目列在 docs/TEST-REPORT.md。
