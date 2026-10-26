# 看见不可见｜松山湖科技现场笔记

2026 全国高校校媒精英特训营 · 东莞松山湖

## 已发布的原网站

[立即浏览《看见不可见》](https://see-the-unseen-songshan-2026.cheneason985.chatgpt.site/)

## GitHub Pages 镜像

本仓库包含 `scripts/mirror.py` 和 `.github/workflows/pages.yml`，用于将原网站**公开部署版本**的 HTML、CSS、JavaScript 和公开媒体资源镜像到 GitHub Pages。

- 部署流程：GitHub → Settings → Pages → Build and deployment → Source: **GitHub Actions**。
- 首次部署：GitHub → Actions → **Mirror live site and deploy GitHub Pages** → **Run workflow**。
- 后续：每天尝试自动更新，也支持手动运行。
- 预期 GitHub Pages 地址：`https://easonchengenius.github.io/songshan-lake-2026/`。**必须等 Actions 成功部署并完成页面功能检查后才能作为正式访问地址。**

> 注意：镜像不等于原始 React/TypeScript 工程，可能无法完美覆盖运行时动态请求、绝对路径或部分视频播放限制。本仓库不会将 GitHub Pages 的内容冒充为已验证的完整原工程。遇到镜像失败请直接访问上述原网站。

## 版权与作品说明

这是现场参访的交互式纪实作品。图片、现场视频、文案及机构标识可能有各自的署名或使用条件，公开仓库中仅收录在线可访问的资源镜像；使用和转载前请注意原作者及机构的相关权益。

制作：陈逸琛。
