# XFM Theme

> 高端大气的 Hexo 主题，一套代码覆盖 **博客 / 笔记 / 文档** 三种形态。

XFM 是一套面向长期写作的 Hexo 主题：全套设计令牌驱动、深浅色对称、三模式切换、几乎所有形态都由配置决定，无需改模板。

---

## 预览

<table>
  <tr>
    <td width="33%" align="center"><img src="preview/blog.png" alt="blog 模式"><br><b>blog</b><br>卡片流 + 侧边挂件</td>
    <td width="33%" align="center"><img src="preview/notes.png" alt="notes 模式"><br><b>notes</b><br>笔记树 + 沉浸阅读</td>
    <td width="33%" align="center"><img src="preview/docs.png" alt="docs 模式"><br><b>docs</b><br>文档树 + 正文 + 目录</td>
  </tr>
</table>

手机档三种模式自动转为单栏，笔记 / 文档的左侧栏收起为抽屉，目录折叠为面板 —— 详见[四、自适应式响应](#四自适应式响应)。

<table>
  <tr>
    <td width="30%" align="center"><img src="preview/mobile.png" alt="blog 移动端"></td>
    <td width="30%" align="center"><img src="preview/mobile-docs.png" alt="docs 移动端"></td>
  </tr>
  <tr>
    <td align="center"><sub>blog · 单栏卡片流</sub></td>
    <td align="center"><sub>docs · 抽屉侧栏 + 折叠目录 + 悬浮入口</sub></td>
  </tr>
</table>

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
| 多语言 | 内置 zh-CN / en，界面文案抽离到 `languages/`；导航栏翻译图标一键前后端切换，选择本地记忆 |
| 广告变现 | Google AdSense（自动广告 + 6 个手动广告位、延迟加载、广告标识、路径排除、单篇关闭、`data-adtest` 预览） |
| 评论 | giscus / utterances / waline / twikoo / disqus / disqusjs / valine / 畅言 |
| SEO | OG / Twitter Card、canonical、JSON-LD、内置 sitemap.xml 与 robots.txt、404 页 |
| 阅读体验 | 阅读进度条、返回顶部、平滑滚动、滚动入场动画、文章过时提醒、版权卡、打赏、分享、相关文章 |
| 交付质量 | 自适应三档（mobile / tablet / desktop，可配置）、触摸与刘海屏适配、打印样式、动效降级（`prefers-reduced-motion`）、语义化标签 |

---

## 二、安装

```bash
# npm（推荐，便于版本升级）
npm i hexo-theme-xfm

# 或 git clone（跟随仓库最新提交）
git clone https://github.com/xfm0797/hexo-theme-xfm.git themes/xfm
```

安装后把主题放到站点的 `themes/xfm` 目录（npm 安装的从 `node_modules/hexo-theme-xfm` 复制或软链），站点 `_config.yml`：

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

目录树的默认展开范围由两个开关决定，收起 / 展开是**纯 CSS**（无 JS 时保持默认展开，不会先闪开再收起）：

```yaml
docs:
  expanded: true      # true 全部展开；false 只展开当前页所在分支
  auto_expand: true   # 是否自动展开当前页所在分支
```

带子节点的条目本身就是折叠开关：点箭头、或点分组文本都能展开 / 收起；按钮带 `aria-expanded`，可 Tab 聚焦后用回车 / 空格操作。

### 笔记模式侧边栏

```yaml
notes:
  note_categories: []   # 只收录这些分类的文章，留空 = 不过滤
  note_tags: []         # 只收录带这些标签的文章，留空 = 不过滤；与上一项同时配置时取交集
  group_by: category    # category / date / none（none = 平铺列表，不出现分组头）
  sort_by: date         # title / date / order
  order: desc           # asc / desc
  collapsed: false      # 分组默认是否折叠（当前页所在分组始终展开）
  show_date: true
```

> 想让某篇文章在左侧导航里常驻（点进正文后导航不消失），在它的 front-matter 写 `mode: notes`。

---

## 四、自适应式响应

主题用的是**自适应（Adaptive）**，不是传统的「响应式（Responsive）」：

| | 响应式 Responsive | 自适应 Adaptive（本主题） |
| --- | --- | --- |
| 判定方式 | `@media (max-width…)` 由浏览器连续匹配 | 先识别设备档位，写入 `<html data-tier>` |
| 布局变化 | 同一套 DOM 随宽度连续缩放 | 每档一整套独立令牌 + 栏数 + 组件形态，档位之间跳变 |
| 结构差异 | 靠 CSS 变形 | 导航 / 侧栏 / 目录按档位切换 `bar·drawer`、`sticky·inline·offcanvas·hide`、`sticky·panel·hide` |
| 配置入口 | 六档断点宽度的数值 | 三档的「边界 + 形态」，形态是可读的枚举而非像素 |

流程只有两步：**`<head>` 里的探测脚本先定档 → 档位样式接管布局**。
档位边界、每档形态、组件开关全部集中在 `adaptive` 一节，改配置即可，**不要改模板或 CSS**。

```yaml
adaptive:
  enable: true               # 关闭则恒定使用 default_tier 的布局
  strategy: adaptive         # adaptive 设备识别 / responsive 纯宽度 / fixed 固定档
  default_tier: desktop      # 探测失败兜底档（fixed 策略也用它）
  remember: true             # 记住手动切换的档位（localStorage）

  detect:                    # 探测维度（responsive 策略自动只保留 width）
    width: true              # 视口宽度
    ua: true                 # UA 设备指纹（iPhone / iPad / Android 平板…）
    touch: true              # 触摸能力 → data-input="touch"
    dpr: true                # 像素密度 → data-dpr
    orientation: true        # 横竖屏 → data-orientation
    upgrade_large_screen: true   # 大屏平板升级为桌面档

  tiers:                     # 三档定义
    mobile:
      max_width: 767         # ≤ 该宽度或 UA 命中手机
      layout: single         # single / two-column / three-column
      nav: drawer            # bar 顶部菜单 / drawer 抽屉
      sidebar: offcanvas     # offcanvas 抽屉 / inline 内联折叠 / hide 隐藏 / sticky 吸附
      toc: panel             # panel 折叠面板 / sticky 常驻 / hide 隐藏
      container_width:       # 留空用该档默认值
      content_width:
      fluid: false           # 该档是否启用流式字号（true = 档内平滑缩放）
      density: compact       # comfortable / compact
      disable: []            # 该档关闭的组件，见下表
    tablet:
      max_width: 1079
      layout: two-column
      nav: drawer
      sidebar: inline
      toc: hide
      density: comfortable
      disable: []
    desktop:
      min_width: 1080        # 自动 ≥ tablet.max_width + 1
      layout: three-column
      nav: bar
      sidebar: sticky
      toc: sticky
      density: comfortable
      disable: []

  # 与档位无关的通用适配
  touch_target: 44           # 触摸设备最小可点击边长（px）
  safe_area: true            # 适配刘海屏 / 手势条安全区
  compact_height: true       # 矮屏（手机横屏）压缩纵向留白
  user_zoom: true            # 是否允许双指缩放
  fluid_min_width: 360       # 流式字号插值参考宽度
  fluid_max_width: 1440
```

### 默认三档分别交付什么

| 档位 | 判定 | 栏数 | 导航 | 笔记/文档侧栏 | 目录 | 密度 |
| --- | --- | --- | --- | --- | --- | --- |
| mobile | 宽度 ≤ 767 或 UA 命中手机 | 单栏 | 汉堡抽屉 | 抽屉（悬浮按钮唤起） | 正文顶部折叠面板 | compact |
| tablet | 768 ~ 1079（或平板 UA） | 双栏 | 汉堡抽屉 | 内联折叠卡片 | 隐藏 | comfortable |
| desktop | ≥ 1080 | 三栏 | 横排菜单 | 吸附左栏 | 吸附右栏 | comfortable |

每档都会拿到一整套独立的设计令牌（容器宽度、栏宽、间距、导航高度、六级字号），
所以档位切换是**整档跳变**，不会出现「半桌面半手机」的中间态。
某档把 `fluid: true` 打开后，该档内部才会做平滑缩放（clamp）。

### 组件开关（disable）

每档可独立关掉不合适的组件，可选键：

| 键 | 作用元素 |
| --- | --- |
| `hero` | 首页欢迎语大卡 |
| `cover` | 文章封面图 |
| `related` | 相关文章 |
| `sidebar` | blog 侧边挂件栏 |
| `toc` | 右侧目录栏 |
| `footer_stats` | 页脚统计 |
| `brand_text` | 导航栏站点标题 |
| `comments` | 评论区 |
| `share` | 分享按钮组 |

例：手机档只保留正文 —— `tiers.mobile.disable: [hero, cover, related]`。

### 实现方式

| 环节 | 文件 | 职责 |
| --- | --- | --- |
| 定档 | `layout/_partials/adaptive-boot.ejs` | `<head>` 首行同步脚本：解析 URL `?__tier=` / localStorage → UA 指纹 → 宽度，写入 `data-tier`（渲染前完成，无闪烁） |
| 出样式 | `layout/_partials/adaptive-style.ejs` | 按 `adaptive` 配置生成 `html[data-tier="…"]` 规则，每档令牌 + 栏数 + 形态 |
| 转结构 | `layout/layout.ejs` | 构建期写入兜底档位与 `side-nav-*` 变体标记，保证抽屉所需节点存在 |
| 运行时 | `source/js/adaptive.js` | `XFM.adaptive.tier() / setTier() / clearTier() / onTierChange()`，跨档派发 `xfm:tierchange` |
| 与档位无关 | `source/css/adaptive.css` | 打印样式、`prefers-reduced-motion` 降级 |

前端脚本不再写死断点：所有阈值来自配置，由模板注入（`window.XFM.adaptive`）。
`xfm_breakpoints()` 仍保留，由 `adaptive` 反算旧的六档断点，老站点不升级配置也能直接跑。

---

## 五、核心配置速查

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

lang_switcher:
  enable: true         # 导航栏「翻译」图标；语言数 < 2 时自动不显示
  style: auto          # auto（2 种点击切换、3 种以上弹菜单）/ toggle / menu
  position: tools      # tools（右侧工具区）/ menu（排进主菜单末尾）
  remember: true       # 选择写入 localStorage
  languages:
    - { code: zh-CN, name: 简体中文, short: 中 }
    - { code: en,    name: English, short: EN }

adsense:
  enable: false                        # 总开关
  client: ""                           # ca-pub-xxxxxxxxxxxxxxxx
  auto_ads: true                       # 页面级自动广告（脚本带 client 参数）
  lazy: true                           # 滚动到附近再填充
  label: false                         # 广告位上方显示「广告」标识
  list_interval: 4                     # 列表页每 4 篇插一个内嵌广告位，0 = 不插
  exclude_pages: []                    # 如 ['/about/', '/privacy/']
  slots:                               # 留空的位置不输出 DOM
    post_top: "1111111111"
    post_bottom: "2222222222"
    page_top: "3333333333"
    page_bottom: "4444444444"
    list_inline: "5555555555"
    sidebar: "6666666666"              # 需同时在 sidebar.widgets 里加 adsense

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
  sticky: true        # 挂件总高超过一屏时建议设 false，否则底部挂件要滚到底才看得到
  widgets: [profile, recent_posts, categories, tagcloud, archive_list]

menu_order: [首页, 归档, 分类, 标签, 文档, 笔记, 更多]
  # 上一行留空 = 用配置里的书写顺序。Hexo 用 deepMerge 合并 theme_config，
  # 站点新增的菜单键总被追加到末尾，靠这里插回期望位置

vendors:
  rss: /atom.xml
  rss_navbar: auto    # auto（装了 feed 生成器才输出）/ true / false

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
  waline:
    serverURL:        # @waline/client v2 必填项，驼峰；写成 server_url 会被自动转换
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

## 六、Google AdSense 广告

主题内置 AdSense 支持，**不写一行模板代码**，全部由 `adsense` 配置节驱动。关闭时既不加载脚本也不输出任何广告位 DOM。

### 快速开始

```yaml
adsense:
  enable: true
  client: "ca-pub-1234567890123456"   # AdSense 后台 → 账号 → 账号信息里取
  auto_ads: true                      # 页面级自动广告
  lazy: true
  label: true                         # 广告位上方显示「广告」二字
  slots:
    post_top: "1234567890"            # 每个位填 AdSense「广告单元」的 id
    post_bottom: "1234567891"
    list_inline: "1234567892"
```

`enable: true` + 填了 `client` 之后，`<head>` 会自动注入：

```html
<meta name="google-adsense-account" content="ca-pub-1234567890123456">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456" crossorigin="anonymous"></script>
```

### 广告位一览

| 配置键 | 位置 | 生效页面 |
| --- | --- | --- |
| `post_top` | 文章正文上方（标题 / 元信息之下） | 文章页 |
| `post_bottom` | 文章正文下方（版权卡之上） | 文章页 |
| `page_top` | 页面正文上方 | 独立页面（关于 / 友链 / 文档 / 笔记等） |
| `page_bottom` | 页面正文下方 | 独立页面 |
| `list_inline` | 列表内嵌，每 `list_interval` 篇插一个 | 首页 / 归档 / 分类 / 标签列表 |
| `sidebar` | 侧边栏挂件位 | 仅 blog 模式，且需在 `sidebar.widgets` 里加 `adsense` |

> **只有 blog 模式有挂件侧栏**。notes / docs 模式用的是左侧导航树（sidenav），不放挂件，因此 `sidebar` 广告位在这两种模式不输出——这不是 bug，是布局决定的。

任意一个 `slots` 键留空（或整段不写）就不输出对应位置的 DOM，可以先只上 `post_top` 一个位试水。

### 延迟加载

`lazy: true`（默认）时广告单元只在滚动到视口附近（`rootMargin: 250px`）才 `push({})`，首屏更快、也避免用户在首屏看到空框。若站点首屏本就短、希望立刻填充，设为 `false`。

每个广告单元只 push 一次（单元上会打 `data-xfm-ad-pushed="1"` 标记），重复 push 会被 AdSense 报错。

### 合规与调试

```yaml
adsense:
  label: true          # 广告位上方显示「广告」标识，合规建议开启
  test: false          # 本地 / 预览环境设为 true，单元带 data-adtest="on"，只显示占位不产生真实展示
  exclude_pages: ['/about/', '/privacy/']   # 路径命中即不显示广告（子串匹配）
```

`exclude_pages` 是**路径子串匹配**：`/privacy/` 会同时命中 `/privacy/` 和 `/privacy/children/`。脚本仍随 `<head>` 加载（脚本是页面级的，与单个页面是否出广告无关）。

单篇文章还可就地关闭，不需要改配置：

```yaml
---
title: 某篇不想挂广告的文章
ads: false
---
```

### 想验证有没有生效

```bash
hexo clean && hexo g && hexo s
```

打开页面按 F12，在 Elements 里搜 `adsbygoogle` 应能看到 `<ins class="adsbygoogle" data-ad-client="ca-pub-…" data-ad-slot="…">`；Console 里执行：

```js
document.querySelectorAll('.adsbygoogle').length      // 本页广告位数量
document.querySelectorAll('[data-xfm-ad-pushed="1"]').length  // 已触发填充的数量
window.XFM.ads                                         // 当前广告配置快照
```

广告本身是空白 / 显示「广告占位」属正常：审核通过前、`data-adtest="on"` 或无填充时都是这样。

---

## 七、多语言 / 中英切换

导航栏右侧的「翻译」图标不是装饰，**点击即真的换掉整个界面的语言**。

### 工作原理

1. **构建期**：把 `languages/*.yml` 全部语言包拍平成点号路径（`common.home` → `首页 / Home`），内联进 `<head>` 的 `window.__XFM_LANG__`。
2. **首屏前**：`lang-boot` 脚本在 `<head>` 中同步执行——先读 URL 的 `?__lang=`，再读本地记忆，决定用哪种语言，写好 `<html data-lang>` 与 `lang` 属性。这一步在渲染前完成，避免中英文案闪一下再切换。
3. **渲染后**：`i18n.js` 遍历界面元素（导航 / 按钮 / 侧栏 / 分页 / 页脚 / 搜索框等白名单容器），按「当前文案 → 目标文案」映射替换文本与 `placeholder` / `title` / `aria-label` / `alt` 等属性。

### 为什么正文不翻译

只有界面容器参与替换，` .xfm-content` 正文区被排除在外。文章标题、正文是**写作语言**（你写好的是什么就是什么），不是界面语言——把中文文章标题机翻成英文只会更糟。切到 English 后导航变成 `Home / Archives / Categories`，而文章列表里的中文标题原样保留。

### 配置

```yaml
lang_switcher:
  enable: true         # 语言数少于 2 时自动隐藏
  style: auto          # auto / toggle / menu
  position: tools      # tools（导航栏右侧，与搜索 / RSS / 深浅色同列）/ menu（主菜单末尾）
  remember: true       # 选择写入 localStorage，下次自动沿用
  update_html_lang: true
  languages:
    - { code: zh-CN, name: 简体中文, short: 中 }
    - { code: en,    name: English, short: EN }
```

| `style` | 行为 |
| --- | --- |
| `auto`（默认） | 2 种语言时按钮点击即切换；3 种及以上弹出菜单选择 |
| `toggle` | 始终点击即切换，多于 2 种语言按 `languages` 清单顺序轮换 |
| `menu` | 始终弹出菜单 |

`position: tools` 时按钮显示为 `🌐 中` / `🌐 EN`（当前语言短标）；移动端抽屉里固定有一排语言 chips，不受 `position` 影响。

### 用 URL 强制语言

分享链接时可以锁定语言，优先级高于本地记忆：

```
https://example.com/2026/10/01/hello/?__lang=en
```

### 运行时 API

```js
window.XFM.lang.current      // 当前语言 code
window.XFM.lang.languages    // 语言清单
window.XFM.lang.set('en')    // 切换
window.XFM.lang.toggle()     // 轮换到下一个
window.XFM.lang.t('common.home')   // 取词条
```

### 增加一门语言

1. 复制 `languages/en.yml` 为 `languages/<code>.yml`（如 `ja.yml`）并翻译；未翻译的键会自动回退到 `default.yml`。
2. 在 `lang_switcher.languages` 里加一项：`{ code: ja, name: 日本語, short: 日 }`。
3. 站点 `_config.yml` 的 `language` 决定**默认构建语言**，建议与 `languages` 首项一致。

`%s` 占位符（如 `post.outdated`）与 `{count}` 占位符（如 `search.result_count`）在切换时会带上参数重新渲染，不是简单文本替换。

---

## 八、标签插件

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

## 九、Front-matter 支持字段

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
ads: false                    # 单篇关闭广告（需主题 adsense.enable 为 true）
mode: docs                    # 单篇指定模式
cover_style: inline           # inline 时封面不作为 Hero
order: 1                      # 笔记/文档模式排序权重
---
```

---

## 十、目录结构

```
themes/xfm
├── _config.yml              # 主题配置（唯一入口，全部中文注释）
├── languages/               # default / zh-CN / en
├── layout/                  # EJS 模板
│   ├── layout.ejs           # 三模式外壳分发
│   ├── index / post / page / archive / category / tag / 404
│   └── _partials/           # head / header / footer / sidebar / toc /
│                            # search / comment / widgets / notes / docs…
│                            # ads.ejs 广告位、lang-boot.ejs 语言启动、
│                            # lang-switcher.ejs 语言控件
│                            # adaptive-boot.ejs 定档、adaptive-style.ejs 按配置生成档位样式
├── preview/                 # README 用的模式预览图
├── scripts/
│   ├── filters/content.js   # 代码块工具条、标题锚点、表格容器、外链、懒加载
│   ├── generators/          # search.json、sitemap.xml、robots.txt、404
│   ├── helpers/index.js     # 封面、摘要、字数、目录树、笔记/文档导航、计数、广告与语言
│   └── tags/index.js        # 全部标签插件
└── source/
    ├── css/                 # variables · base · layout · components · post · plugins · adaptive
    ├── js/                  # adaptive · core · toc · search · i18n · ads
    └── images/              # avatar / favicon / 默认封面（SVG，零外链）
```

---

## 十一、自定义

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

## 十二、浏览器支持

Chrome / Edge / Firefox / Safari 最近两个大版本。使用了 CSS 变量、`backdrop-filter`、`aspect-ratio`、`IntersectionObserver`；旧浏览器会优雅降级（失去磨砂与动画，不影响阅读）。

---

## 十三、常见问题

### 平台构建报 `ERR_REQUIRE_ESM`（strip-ansi）

Hexo 8 依赖纯 ESM 的 `strip-ansi@7`，而 `require(ESM)` 要 Node **22.12+ / 20.19+** 才默认开启。只预装到 22.11 的构建机（如 EdgeOne Pages）就会在 `hexo generate` 时报错——本地 Node 版本更高，往往复现不出来。

这不是主题问题，在**站点** `package.json` 降级依赖即可：

```json
"overrides": { "strip-ansi": "6.0.1", "ansi-regex": "5.0.1" }
```

按平台环境本地复现：`node --no-experimental-require-module node_modules/hexo/bin/hexo generate`。

### 站点新增的菜单项总排在「更多」之后

Hexo 用 `deepMerge` 合并 `theme_config`，新增的键一律追加到末尾。用 `menu_order` 显式声明顺序即可，见[五、核心配置速查](#五核心配置速查)。

### 笔记文章同时出现在首页 / 归档列表

笔记本质仍是文章（posts），主题只负责把「笔记」侧栏按 `note_categories` 过滤成独立视图。要让它们完全不进博客文章流，需自行过滤 index / archive 生成器，属站点层改动。

### 侧栏挂件显示不全、出现第二条滚动条

主题不再给挂件栏加 `max-height` 与内部滚动。若挂件总高超过一屏，`position: sticky` 会让底部内容停在视口下方，把 `sidebar.sticky` 设为 `false` 让侧栏跟随正文滚动即可。

### 无标题的页面还显示「目录」空面板

已修复：右侧目录栏只在页面真有 h2–h4 标题时才渲染（也支持 front-matter 用 `toc: false` 单独关闭）。

### AdSense 配好了却看不到广告

按顺序排查：

1. `adsense.enable` 是否为 `true`、`client` 是否填了 `ca-pub-` 开头的 ID；
2. 对应位置的 `slots` 键是否填了广告单元 id——留空不输出 DOM；
3. 页面是否被 `exclude_pages` 命中，或该篇 front-matter 写了 `ads: false`；
4. `sidebar` 位需要同时把 `adsense` 加进 `sidebar.widgets`，且只在 blog 模式生效；
5. 广告审核通过前、`data-adtest="on"` 或无填充时，`<ins>` 存在但内容为空，这是正常的。

若 Element 里连 `<ins class="adsbygoogle">` 都没有，说明是配置问题（走 1–4）；有 `<ins>` 但空白，是 AdSense 侧填充问题。

### 语言切换后文章正文没变

这是有意为之。主题只替换界面文案（导航 / 按钮 / 侧栏 / 页脚 / 分页 / 搜索框等），正文与标题属于写作内容，不参与替换——详见[七、多语言 / 中英切换](#七多语言--中英切换)。若确实要给文章做多语言，需要站点层为每篇准备多语言版本并用 `permalink` / 路由区分。

### 语言切换按钮不显示

`lang_switcher.languages` 少于 2 项时按钮自动隐藏；另需确认 `lang_switcher.enable` 为 `true`（默认值）。`position: menu` 时按钮排在主菜单末尾，不在右侧工具区。

---

## 十四、许可

MIT License。
