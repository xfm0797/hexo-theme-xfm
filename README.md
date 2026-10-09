# XFM Theme

> 高端大气的 Hexo 主题，一套代码覆盖 **博客 / 笔记 / 文档** 三种形态。

XFM 是一套面向长期写作的 Hexo 主题：全套设计令牌驱动、深浅色对称、三模式切换、几乎所有形态都由配置决定，无需改模板。

---

## 一、特性总览

| 维度 | 能力 |
| --- | --- |
| 形态 | blog 卡片流 / notes 笔记树 / docs 三栏文档 |
| 外观 | 深浅色三态切换（浅色、深色、跟随系统）、主色自定义、圆角档位、磨砂导航、背景光晕 |
| 导航 | 两级下拉菜单、移动端抽屉、当前项高亮、滚动自动隐藏、RSS 入口 |
| 搜索 | 内置全文检索索引 + Cmd/Ctrl+K 唤起 + 键盘导航 + 关键词高亮 |
| 目录 | 侧栏目录件 / 独立目录栏，滚动跟随高亮、自动滚入可见区 |
| 代码块 | 语言标签、Mac 风格三色点、复制按钮、长代码折叠、gutter 行号、自研深浅色配色 |
| 标签插件 | 提示块、折叠、选项卡、时间轴、栅格、按钮、徽标、图标、流程图、链接卡片 |
| 内容增强 | 标题锚点、表格滚动容器、外链新窗、图片懒加载与灯箱、任务列表、数学公式、Mermaid |
| 评论 | giscus / utterances / waline / twikoo / disqus / disqusjs / valine / 畅言 |
| SEO | OG / Twitter Card、canonical、JSON-LD、内置 sitemap.xml 与 robots.txt、404 页 |
| 阅读体验 | 阅读进度条、返回顶部、平滑滚动、滚动入场动画、文章过时提醒、版权卡、打赏、分享、相关文章 |
| 国际化 | 内置 zh-CN / en，i18n 文案抽离到 `languages/` |
| 交付质量 | 响应式三档断点、打印样式、动效降级（`prefers-reduced-motion`）、语义化标签 |

---

## 二、安装

```bash
git clone https://github.com/xfm0797/hexo-theme-xfm.git themes/xfm
```

站点 `_config.yml`：

```yaml
theme: xfm
```

### 依赖

Hexo 8 起核心不再内置渲染器与部分生成器，请在站点安装（通常 `hexo init` 已自带）：

```bash
npm i hexo-renderer-marked hexo-renderer-ejs \
      hexo-generator-index hexo-generator-archive \
      hexo-generator-category hexo-generator-tag
```

按需增强（可选）：

| 功能 | 依赖 |
| --- | --- |
| RSS | `npm i hexo-generator-feed` |
| KaTeX / MathJax | 无需安装，主题按配置从 CDN 加载 |
| Mermaid | 无需安装，主题按配置从 CDN 加载 |

> 站点根目录的 `package.json` 需要包含 `"hexo": { "version": "..." }` 字段，Hexo 才会加载外部插件（这也是 404 / sitemap 等内置生成器能否工作的前提）。

---

## 三、三种模式

在主题 `_config.yml` 顶部切换：

```yaml
mode: blog    # blog / notes / docs
```

- **blog**：首页 Hero + 文章卡片流 + 右侧挂件栏，适合个人博客
- **notes**：左侧笔记树（按分类/日期分组）+ 沉浸式窄栏阅读 + 右侧目录
- **docs**：左侧文档树 + 正文 + 右侧目录三栏，适合产品文档

单篇文章可通过 front-matter 覆盖：`mode: docs`。

### 文档模式侧边栏

在站点 `source/_data/docs.yml` 中定义树形结构（字段名可通过 `docs.data_file` 改）：

```yaml
- title: 快速开始
  children:
    - title: 主题简介
      path: /docs/intro/
    - title: 安装部署
      path: /docs/install/
```

未定义该文件时，会自动按页面的 `order` + `title` 生成侧边栏。

---

## 四、核心配置速查

主题全部配置集中在 `themes/xfm/_config.yml`，站点可用 `theme_config` 覆盖同名键。常用项：

```yaml
appearance:
  scheme: auto        # light / dark / auto
  primary: "#4f6bed"  # 主色
  radius: normal      # sharp / normal / round
  glass_navbar: true

navbar:
  sticky: true
  auto_hide: true

index:
  layout: card        # card / list / grid / classic
  hero: true
  sticky: true
  alternate_layout: true

post:
  toc: true
  toc_depth: [2, 3, 4]
  meta: [author, date, updated, categories, wordcount, reading]
  copyright: true
  reward: false

sidebar:
  position: right     # left / right / none
  widgets: [profile, recent_posts, categories, tagcloud, archive_list]

search:
  enable: true
  path: search.json
  hotkey: true

code_block:
  copy: true
  language: true
  mac_style: true
  max_height: -1      # 设为 20 表示超过 20 行自动折叠

comments:
  enable: false
  type: giscus        # 8 种可选
  lazyload: true
```

完整的注释版配置请直接查看 `_config.yml`（每项都有中文说明）。

### 需要的独立页面

```bash
hexo new page tags         # front-matter 加 type: tags
hexo new page categories   # front-matter 加 type: categories
hexo new page links        # front-matter 加 type: links
hexo new page archives     # 无需额外 type
```

---

## 五、标签插件

所有标签插件在 Markdown 正文中直接使用：

````markdown
{% note info 标题 %}
支持 primary / info / success / warning / danger / tip / quote 八种语义。
{% endnote %}

{% fold 标题 %}
默认收起的内容。加 open 参数可默认展开。
{% endfold %}

{% tabs %}
<!-- tab 第一项 -->
内容一
<!-- endtab -->
<!-- tab 第二项 -->
内容二
<!-- endtab -->
{% endtabs %}

{% timeline %}
{% event 标题 / 2026-01 / primary %}
节点内容
{% endevent %}
{% endtimeline %}

{% row %}
{% col 6 %}左半栏{% endcol %}
{% col 6 %}右半栏{% endcol %}
{% endrow %}

{% button /archives/, 查看归档, archive, outline %}
{% label primary 新特性 %}
{% icon github, 20 %}
{% linkcard https://example.com, 站名, 简介, /images/avatar.svg %}

{% mermaid %}
graph LR
  A --> B
{% endmermaid %}
````

同时也兼容 `{% tab 标题 active %}…{% endtab %}` 的原生写法。

---

## 六、Front-matter 支持字段

```yaml
---
title: 文章标题
date: 2026-10-01
updated: 2026-10-09
categories: [分类]
tags: [标签一, 标签二]
cover: /images/cover.jpg      # 首图卡片封面 + OG 图
banner: /images/banner.jpg    # 同 cover，优先级更高
description: 自定义描述
keywords: 关键词
sticky: 100                   # 置顶权重，越大越靠前
toc: false                    # 单篇关闭目录
sidebar: false                # 单篇关闭侧边栏
comments: false               # 单篇关闭评论
mode: docs                    # 单篇指定模式
cover_style: inline           # inline 时封面不作为 Hero
order: 1                      # 笔记/文档模式排序权重
---
```

---

## 七、目录结构

```
themes/xfm
├── _config.yml              # 主题配置（唯一入口，全部中文注释）
├── languages/               # default / zh-CN / en
├── layout/                  # EJS 模板
│   ├── layout.ejs           # 三模式外壳分发
│   ├── index / post / page / archive / category / tag / 404
│   └── _partials/           # head / header / footer / sidebar / toc /
│                            # search / comment / widgets / notes / docs…
├── scripts/
│   ├── filters/content.js   # 代码块工具条、标题锚点、表格容器、外链、懒加载
│   ├── generators/          # search.json、sitemap.xml、robots.txt、404
│   ├── helpers/index.js     # 封面、摘要、字数、目录树、笔记/文档导航、计数
│   └── tags/index.js        # 全部标签插件
└── source/
    ├── css/                 # variables · base · layout · components · post · plugins · responsive
    ├── js/                  # core · toc · search
    └── images/              # avatar / favicon / 默认封面（SVG，零外链）
```

---

## 八、自定义

**覆盖样式**：在站点 `source/_data/styles.styl` 之外，推荐直接把自定义 CSS/JS 放进主题后，通过配置注入：

```yaml
custom:
  head: ""        # 注入 <head>
  body_end: ""    # 注入 </body> 前
  css: [custom]   # 加载 /css/custom.css
  js: [custom]    # 加载 /js/custom.js
  post_footer: "" # 每篇文章底部
```

**主色**：改 `appearance.primary`，全站链接、按钮、进度条、选中态同步生效（基于 CSS 变量）。

**圆角**：改 `appearance.radius`，sharp / normal / round 三档。

---

## 九、浏览器支持

Chrome / Edge / Firefox / Safari 最近两个大版本。使用了 CSS 变量、`backdrop-filter`、`aspect-ratio`、`IntersectionObserver`；旧浏览器会优雅降级（失去磨砂与动画，不影响阅读）。

---

## 十、许可

MIT License。
