# 看见不可见｜松山湖科技现场笔记

2026 全国高校校媒精英特训营 · 东莞松山湖

- [GitHub Pages 展示网站](https://easonchengenius.github.io/songshan-lake-2026/)
- [原站](https://see-the-unseen-songshan-2026.cheneason985.chatgpt.site/)

## 部署方式

GitHub Actions 在推送 `main` 后发布网站。仓库暂未收录二进制图片和视频；当 `dist/index.html` 不存在时，`scripts/import_source.py` 会从已发布的 GitHub Pages 读取静态文件，并按 `scripts/source-manifest.json` 中的 SHA-256 校验后生成 `dist`。这一步不依赖原站的访问权限，且工作流只有仓库读取权限。

当前清单对应原站的 58 个实际使用文件，包括首页、样式、交互脚本、图片和视频。导入时会移除原有镜像首页混入的 Cloudflare 验证脚本。页面使用相对资源路径，可在 GitHub Pages 的仓库子路径下加载。

如需长期直接维护网站文件，可把完整 `dist` 提交到本仓库；工作流将优先使用仓库中的 `dist`。本地预览可运行 `python3 -m http.server 8000 --directory dist`。

## 内容说明

这是一篇交互式现场报道。现场图片、视频、机构标识和文案可能分别有署名或使用条件；使用及转载前请核对相关权益。个别 AI 概念画面在页面中有明确标注。

制作：陈逸琛。
