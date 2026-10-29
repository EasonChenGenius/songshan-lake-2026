# 看见不可见｜松山湖科技现场笔记

2026 全国高校校媒精英特训营 · 东莞松山湖

- [GitHub Pages 展示网站](https://easonchengenius.github.io/songshan-lake-2026/)
- [原站](https://see-the-unseen-songshan-2026.cheneason985.chatgpt.site/)

## 部署方式

本仓库已保存可直接运行的完整静态网页文件。`dist/` 包含 HTML、CSS、JavaScript、图片和视频；`source-assets/` 与 `data/` 保留部分素材及地图数据，便于后续维护。

GitHub Actions 在每次推送到 `main` 后自动校验并发布 `dist/` 到 GitHub Pages。网页使用相对资源路径，可在仓库子路径下正常加载。本地预览可运行：

```bash
python3 -m http.server 8000 --directory dist
```

## 后续修改与同步

1. 以本仓库 `main` 分支中的 `dist/` 为对外发布版本；在此处修改网页代码和资源。
2. 每次修改完成后，提交并推送到 `main`，GitHub Actions 就会自动重新发布，公开链接保持不变。
3. 通过 GitHub 的 **Code → Download ZIP** 可获取完整站点文件；打开页面时建议使用本地静态服务器，以确保资源与交互正常加载。

**注意：** 上方“原站”属于独立的 ChatGPT Site。直接在原站编辑不会自动同步到本仓库；如在原站做了新的修改，仍需将更新后的文件提交到这里，才能更新 GitHub Pages。

## 内容说明

这是一篇交互式现场报道。现场图片、视频、机构标识和文案可能分别有署名或使用条件；使用及转载前请核对相关权益。个别 AI 概念画面在页面中有明确标注。

制作：陈逸琛。
