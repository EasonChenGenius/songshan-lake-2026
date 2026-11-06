# 看见不可见｜松山湖科技现场笔记

2026 全国高校校媒精英特训营 · 东莞松山湖

- [GitHub Pages 展示网站](https://easonchengenius.github.io/songshan-lake-2026/)
- [长图海报版（含扫码入口）](https://easonchengenius.github.io/songshan-lake-2026/poster/)
- [poster-电脑版（含 AI 概念画面）](https://easonchengenius.github.io/songshan-lake-2026/poster-desktop/)
- [poster-手机版（含 AI 概念画面，iPhone 17 竖屏适配）](https://easonchengenius.github.io/songshan-lake-2026/poster-mobile/)
- [Poster Desktop 原图实拍](https://easonchengenius.github.io/songshan-lake-2026/poster-desktop-real-photo/)
- [Poster Mobile 原图实拍（iPhone 17 竖屏适配）](https://easonchengenius.github.io/songshan-lake-2026/poster-mobile-real-photo/)
- [原站](https://see-the-unseen-songshan-2026.cheneason985.chatgpt.site/)

## 部署方式

本仓库已保存可直接运行的完整静态网页文件。`dist/` 包含 HTML、CSS、JavaScript、图片和视频；`source-assets/` 与 `data/` 保留部分素材及地图数据，便于后续维护。

GitHub Actions 在每次推送到 `main` 后自动校验并发布 `dist/` 到 GitHub Pages。网页使用相对资源路径，可在仓库子路径下正常加载。本地预览可运行：

```bash
python3 -m http.server 8000 --directory dist
```

## 后续修改与同步

### 四套独立海报

- `dist/poster-desktop/index.html` 与同目录 `poster.css`：保存拆分当时的电脑版排版，作为独立存档，不随手机版修改。
- `dist/poster-mobile/index.html` 与同目录 `poster.css`：以 iPhone 17 的约 402 × 874 CSS 像素竖屏为设计基准，独立调整字号、图文比例、留白和单列阅读布局。
- `dist/poster-desktop-real-photo/index.html` 与 `poster.css`：单独保存采用实拍封面及 Part 1—4 背景的电脑版。
- `dist/poster-mobile-real-photo/index.html` 与 `poster.css`：采用相同实拍背景的独立 iPhone 17 竖屏版。
- 原版电脑与手机海报均保留带标注的 AI 概念画面；实拍版使用真实照片，但个别其他主题画面仍有相应 AI 标注。
- `dist/poster-exports/`：四个版本分别有同名 PNG 无损长图和 JPG 下载文件，实拍版文件名带 `-real-photo`，互不覆盖。
- `dist/poster/`：保留原有长图链接与内容，兼容之前分享出去的二维码和链接。四套独立海报共用 `dist/assets/` 素材，但各自维护 HTML、CSS。

1. 以本仓库 `main` 分支中的 `dist/` 为对外发布版本；在此处修改网页代码和资源。
2. 每次修改完成后，提交并推送到 `main`，GitHub Actions 就会自动重新发布，公开链接保持不变。
3. 通过 GitHub 的 **Code → Download ZIP** 可获取完整站点文件；打开页面时建议使用本地静态服务器，以确保资源与交互正常加载。

**注意：** 上方“原站”属于独立的 ChatGPT Site。直接在原站编辑不会自动同步到本仓库；如在原站做了新的修改，仍需将更新后的文件提交到这里，才能更新 GitHub Pages。

## 内容说明

这是一篇交互式现场报道。现场图片、视频、机构标识和文案可能分别有署名或使用条件；使用及转载前请核对相关权益。个别 AI 概念画面在页面中有明确标注。

制作：陈逸琛。
