# 看见不可见｜松山湖科技现场笔记

2026 全国高校校媒精英特训营 · 东莞松山湖

- [GitHub Pages 展示网站](https://easonchengenius.github.io/songshan-lake-2026/)
- [原站](https://see-the-unseen-songshan-2026.cheneason985.chatgpt.site/)

## 网站源码与部署

`dist/index.html`、`dist/*.css`、`dist/main.js` 和 `dist/assets/` 是可直接运行的静态网站。GitHub Actions 在推送 `main` 后，将 `dist` 发布到 GitHub Pages。页面使用相对资源路径，可在仓库子路径下正常加载。修改这些文件并推送，即可更新网站。

首次迁移时，`scripts/import_source.py` 根据 `scripts/source-manifest.json` 中的 SHA-256 清单，从已有 Pages 发布内容取回并核对原站文件，随后提交到本仓库。以后部署使用仓库内的 `dist`，不再依赖原站的访问权限或每日抓取。

本地预览：在仓库根目录运行 `python3 -m http.server 8000 --directory dist`，打开 `http://localhost:8000/`。

## 内容说明

这是一篇交互式现场报道。现场图片、视频、机构标识和文案可能分别有署名或使用条件；使用及转载前请核对相关权益。个别 AI 概念画面在页面中有明确标注。

制作：陈逸琛。
