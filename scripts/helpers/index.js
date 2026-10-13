/* global hexo */
/**
 * XFM Theme - Helpers
 * 提供给 EJS 模板使用的辅助函数集合。
 */

const fs = require('fs');
const path = require('path');

const escapeHTML = (str) =>
  String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);

const stripTags = (str) =>
  String(str == null ? '' : str)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ');

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g;

function countWords(content) {
  if (!content) return 0;
  const text = stripTags(content);
  const cjk = text.match(CJK) || [];
  const latin = text.replace(CJK, ' ').match(/[A-Za-z0-9\u00c0-\u00ff'_-]+/g) || [];
  return cjk.length + latin.length;
}

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\u4e00-\u9fa5\- ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 按点号路径 / 数组下标取值：`post.toc_depth[0]`、`docs.expanded` 均可 */
function readPath(src, path) {
  const keys = String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.');
  return keys.reduce((acc, key) => (acc == null ? acc : acc[key]), src);
}

/**
 * 读取配置（点号路径 + 数组下标）。
 * 解析顺序：站点 theme_config（已被 Hexo 合并进 hexo.theme.config）> 主题 _config.yml > 站点根配置。
 * 早先只读 hexo.config（站点根），导致主题 _config.yml 里的 notes.* / docs.* / post.* 写了不生效。
 */
function getConfig(hexo, path, dft) {
  const themeCfg = (hexo && hexo.theme && hexo.theme.config) || {};
  const siteCfg = (hexo && hexo.config) || {};
  const src = Object.assign({}, siteCfg, themeCfg);
  const value = readPath(src, path);
  return value === undefined ? dft : value;
}

/** 从 Markdown/Math/HTML 混合内容中抽取标题层级 */
function extractHeadings(content, min = 2, max = 4) {
  const headings = [];
  if (!content) return headings;
  const re = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const level = Number(m[1]);
    if (level < min || level > max) continue;
    if (m[3].indexOf('id=') > -1 && m[3].indexOf('<h') > -1) continue;
    let attrs = m[2] || '';
    let idMatch = attrs.match(/id\s*=\s*["']([^"']*)["']/i);
    let id = idMatch ? idMatch[1] : '';
    const rawText = stripTags(m[3]).trim();
    if (!rawText) continue;
    if (!id) id = slugify(rawText) || 'section-' + headings.length;
    headings.push({ level, id, text: rawText });
  }
  return headings;
}

/** 构建嵌套标题树 */
function buildTree(headings) {
  const root = { level: 0, children: [] };
  const stack = [root];
  headings.forEach((h) => {
    const node = Object.assign({}, h, { children: [] });
    while (stack.length > 1 && stack[stack.length - 1].level >= node.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  return root.children;
}

/**
 * 递归渲染侧栏导航树。
 * 收起 / 展开是「纯 CSS + 一个类」：`.has-children:not(.is-open) > .xfm-nav-list{display:none}`。
 * 因此无 JS 时默认展开、不会闪开；有 JS 时由 core.js 切换 .is-open。
 *
 * opts.expanded     —— 默认是否展开全部分支（docs.expanded，默认 true）
 * opts.auto_expand  —— 是否自动展开当前页所在分支（docs.auto_expand，默认 true）
 * opts.toggle_label —— 展开 / 收起按钮的无障碍文案
 */
function renderNavNodes(nodes, urlFor, activePath, depth, opts) {
  const o = opts || {};
  const expanded = o.expanded !== false;
  const autoExpand = o.auto_expand !== false;
  const toggleLabel = o.toggle_label || 'toggle';
  let html = '<ul class="xfm-nav-list depth-' + depth + '">';
  nodes.forEach((node) => {
    const hasChildren = node.children && node.children.length;
    const active = node.path && activePath && normalizePath(node.path) === activePath;
    const isParent = autoExpand && node.children && containsActive(node.children, activePath);
    const open = Boolean(hasChildren) && (expanded || isParent);
    html +=
      '<li class="xfm-nav-item' +
      (hasChildren ? ' has-children' : '') +
      (active ? ' is-active' : '') +
      (open ? ' is-open' : '') +
      '">';
    if (node.path) {
      html +=
      '<a class="xfm-nav-link' +
      (active ? ' is-active' : '') +
      '" href="' +
      escapeHTML(urlFor(node.path)) +
      '"' +
      (active ? ' aria-current="page"' : '') +
      '>' +
      escapeHTML(node.title) +
      '</a>';
    } else {
      html += '<span class="xfm-nav-text">' + escapeHTML(node.title) + '</span>';
    }
    if (hasChildren) {
      html +=
        '<button class="xfm-nav-toggle" type="button" aria-expanded="' +
        (open ? 'true' : 'false') +
        '" aria-label="' +
        escapeHTML(toggleLabel) +
        '"><i class="xfm-arrow"></i></button>';
      html += renderNavNodes(node.children, urlFor, activePath, depth + 1, opts);
    }
    html += '</li>';
  });
  html += '</ul>';
  return html;
}

function containsActive(nodes, activePath) {
  if (!nodes || !activePath) return false;
  return nodes.some(
    (n) => (n.path && normalizePath(n.path) === activePath) || containsActive(n.children, activePath)
  );
}

function normalizePath(p) {
  if (!p) return '';
  let s = String(p).trim();
  if (s.charAt(0) !== '/') s = '/' + s;
  // pretty URL 下 Hexo 的 page.path 形如 docs/intro/index.html，
  // 与导航里写的 /docs/intro/ 需要归一到同一形态。
  s = s.replace(/index\.html$/i, '').replace(/\.html$/i, '/');
  if (s.length > 1 && s.charAt(s.length - 1) !== '/') s += '/';
  return s;
}

/** 配置值归一为字符串数组：['a'] / "a, b" / 空 均可 */
function toArray(v) {
  if (v === null || v === undefined || v === '') return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** wanted 为空表示不过滤；否则要求 values 与 wanted 有交集 */
function matchAny(values, wanted) {
  if (!wanted || !wanted.length) return true;
  const list = (values || []).map((v) => String(v).trim());
  return wanted.some((w) => list.indexOf(w) > -1);
}

/**
 * 站点是否装了 feed 生成器（hexo-generator-feed 注册名形如 atom / rss2）。
 * 探测失败时返回 true —— 保守显示，避免误伤真正配了订阅源却换个插件实现的站点。
 */
function hasFeedGenerator(hexo) {
  try {
    const list = hexo.extend.generator.list();
    return Object.keys(list).some((n) => /^(feed|rss|rss2|atom)$/i.test(n));
  } catch (e) {
    return true;
  }
}

/* ---------------------------------------------------------------------------
 * 语言包（供「中英切换」使用）
 * 直接把 languages/*.yml 读成扁平字典交给前端 —— 前端切换时用「当前文案 → 目标文案」
 * 的反查替换，因此需要拿到全部语言包，而不能只拿当前语言的那一份。
 * ------------------------------------------------------------------------- */
const DEFAULT_LANGS = [
  { code: 'zh-CN', name: '简体中文', short: '中' },
  { code: 'en', name: 'English', short: 'EN' }
];
const LANG_CACHE = {};

/** 语言码归一：zh_CN / zh-cn / zh-Hans → zh-CN，en_US → en */
function normLang(code) {
  const c = String(code == null ? '' : code)
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();
  if (!c) return '';
  if (c === 'zh' || c === 'zh-cn' || c === 'zh-hans' || c === 'zh-hans-cn') return 'zh-CN';
  if (c === 'en' || c === 'en-us' || c === 'en-gb') return 'en';
  return c;
}

/** 嵌套对象 → 点号扁平字典（error.404_title 这种也照原样保留） */
function flattenDict(src, prefix, out) {
  const acc = out || {};
  Object.keys(src || {}).forEach((k) => {
    const v = src[k];
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenDict(v, key, acc);
    else if (v !== null && v !== undefined) acc[key] = String(v);
  });
  return acc;
}

/** 读取主题语言包：<code>.yml > default.yml > 空表 */
function loadLangTable(hexo, code) {
  const dir = hexo.theme_dir || (hexo.theme && hexo.theme.base);
  if (!dir) return {};
  const candidates = [];
  const norm = normLang(code);
  if (norm) candidates.push(norm + '.yml');
  if (code) candidates.push(String(code) + '.yml');
  candidates.push('default.yml');
  for (const file of candidates) {
    const full = path.join(dir, 'languages', file);
    if (LANG_CACHE[full]) return LANG_CACHE[full];
    try {
      if (!fs.existsSync(full)) continue;
      const text = fs.readFileSync(full, 'utf8');
      const data = hexo.render.renderSync({ text: text, engine: 'yaml' });
      const flat = flattenDict(data);
      if (Object.keys(flat).length) {
        LANG_CACHE[full] = flat;
        return flat;
      }
    } catch (e) {
      /* 读不到就换下一个候选 */
    }
  }
  return {};
}

/** 解析 languages 配置：数组 [{code,name,short}] 或对象 { 'zh-CN': { name, short } } */
function parseLangs(raw) {
  if (!raw) return DEFAULT_LANGS.slice();
  const list = [];
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string') list.push({ code: item });
      else if (item.code) list.push({ code: item.code, name: item.name, short: item.short });
    });
  } else if (typeof raw === 'object') {
    Object.keys(raw).forEach((code) => {
      const item = raw[code] || {};
      list.push({ code: code, name: item.name, short: item.short });
    });
  }
  const picked = list
    .map((it) => {
      const code = String(it.code || '').trim();
      const name = String(it.name || code).trim();
      let short = String(it.short || '').trim();
      if (!short) short = /[\u4e00-\u9fff]/.test(name) ? name.slice(0, 1) : code.slice(0, 2).toUpperCase();
      return { code: code, name: name, short: short };
    })
    .filter((it) => it.code);
  return picked.length ? picked : DEFAULT_LANGS.slice();
}

module.exports = function (hexo) {
  const register = (name, fn) => hexo.extend.helper.register(name, fn);

  /** 图标（引用 head 中注入的 SVG sprite） */
  register('xfm_icon', function (name, cls) {
    return '<svg class="xfm-icon ' + (cls || '') + '" aria-hidden="true"><use xlink:href="#xfm-i-' + escapeHTML(name) + '"></use></svg>';
  });

  /** 文章封面：front-matter > 内容首图 > 默认图 */
  register('xfm_cover', function (post) {
    if (!post) return '';
    const candidates = [post.cover, post.banner, post.thumbnail, post.image, post.index_img];
    for (const c of candidates) {
      if (c) return String(c);
    }
    if (post.photos && post.photos.length) return String(post.photos[0]);
    const content = post.content || '';
    const img = content.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    if (img) return img[1];
    return getConfig(hexo, 'default_cover', '') || '';
  });

  /** 摘要 */
  register('xfm_excerpt', function (post, len) {
    const mode = getConfig(hexo, 'index.excerpt', 'excerpt');
    if (mode === 'none') return '';
    const limit = Number(len || getConfig(hexo, 'index.excerpt_length', 140));
    if (mode === 'excerpt' && (post.excerpt || post.more)) {
      return stripTags(post.excerpt || post.more).trim();
    }
    const text = stripTags(post.excerpt || post.content || '').trim();
    return text.length > limit ? text.slice(0, limit) + '…' : text;
  });

  /** 字数 */
  register('xfm_wordcount', function (content) {
    return countWords(content);
  });

  /** 阅读时长（分钟，至少 1） */
  register('xfm_reading', function (content) {
    const words = countWords(content);
    const wpm = Number(getConfig(hexo, 'post.words_per_minute', 350)) || 350;
    return Math.max(1, Math.round(words / wpm));
  });

  /* ------------------------------------------------------------------ *
   * 自适应档位（Adaptive）
   * 归一化只做一次：boot 探测脚本、样式生成器、模板共用同一份结果，
   * 避免 <html data-tier> 与生成的档位规则对不上。
   * ------------------------------------------------------------------ */
  const TIER_ORDER = ['mobile', 'tablet', 'desktop'];
  const TIER_DEFAULTS = {
    mobile: {
      max_width: 767, layout: 'single', nav: 'drawer',
      sidebar: 'offcanvas', toc: 'panel', fluid: false,
      density: 'compact', disable: []
    },
    tablet: {
      max_width: 1079, layout: 'two-column', nav: 'drawer',
      sidebar: 'inline', toc: 'hide', fluid: false,
      density: 'comfortable', disable: []
    },
    desktop: {
      min_width: 1080, layout: 'three-column', nav: 'bar',
      sidebar: 'sticky', toc: 'sticky', fluid: false,
      density: 'comfortable', disable: []
    }
  };
  /* 组件开关：配置里的 disable 键 → 真实选择器 */
  const COMPONENT_SELECTOR = {
    hero: '.hero-panel',
    cover: '.post-cover, .post-cover-hero',
    related: '.post-related',
    sidebar: '.widget-column',
    toc: '.toc-column',
    footer_stats: '.footer-stats',
    brand_text: '.brand-text',
    comments: '#xfm-comments',
    share: '.post-share'
  };

  function firstDefined() {
    for (let i = 0; i < arguments.length; i++) {
      const v = arguments[i];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }

  function adaptiveConfig() {
    const themeCfg = (hexo.theme && hexo.theme.config) || {};
    const siteCfg = hexo.config || {};
    // legacy：仍在用旧 responsive 配置的站点，自动推导成档位，升级不断裂。
    // 只有「站点显式写过 responsive」才启用推导，否则以主题自带的 adaptive 为准。
    const legacy = Object.assign({}, themeCfg.responsive || {}, siteCfg.responsive || {});
    const legacySite = Object.assign({}, (siteCfg.theme_config || {}).responsive || {}, siteCfg.responsive || {});
    const useLegacy = Object.keys(legacySite).length > 0;
    const hasLegacy = useLegacy;
    const cfg = Object.assign({}, themeCfg.adaptive || {}, siteCfg.adaptive || {});
    const legacyBp = Object.assign({}, legacy.breakpoints || {});

    const num = (v, dft, min, max) => {
      const x = Number(v);
      if (v === '' || v === null || v === undefined || !isFinite(x)) return dft;
      return Math.min(max, Math.max(min, Math.round(x)));
    };
    const oneOf = (v, allowed, dft) => (allowed.indexOf(v) > -1 ? v : dft);
    const bool = (v, dft) => (v === undefined ? dft : v !== false && v !== 'false');

    const strategy = oneOf(cfg.strategy, ['adaptive', 'responsive', 'fixed'], 'adaptive');
    const enable = bool(firstDefined(cfg.enable, legacy.enable), true);

    const legacySm = num(legacyBp.sm, 768, 400, 1200);
    const legacyLg = num(legacyBp.lg, 1080, 800, 2000);
    const legacySide = oneOf(legacy.mobile_sidebar, ['sticky', 'inline', 'offcanvas', 'hide'], 'offcanvas');
    const legacyToc = legacy.mobile_toc === 'hide' ? 'hide' : 'panel';
    const legacyFluid = bool(legacy.fluid_typography, true);

    const rawTiers = Object.assign(
      {},
      (themeCfg.adaptive && themeCfg.adaptive.tiers) || {},
      (siteCfg.adaptive && siteCfg.adaptive.tiers) || {}
    );

    // 边界纠正：mobile < tablet < desktop，用户填反了自动修正而不是让规则互相覆盖
    const mobileMax = useLegacy
      ? legacySm - 1
      : num(
        firstDefined((rawTiers.mobile || {}).max_width, (rawTiers.mobile || {}).max),
        TIER_DEFAULTS.mobile.max_width, 320, 1400
      );
    const tabletMax = num(
      useLegacy ? legacyLg - 1 : firstDefined((rawTiers.tablet || {}).max_width, (rawTiers.tablet || {}).max),
      useLegacy ? legacyLg - 1 : TIER_DEFAULTS.tablet.max_width,
      mobileMax + 1, 2200
    );
    const desktopMin = Math.max(
      tabletMax + 1,
      num(
        firstDefined((rawTiers.desktop || {}).min_width, (rawTiers.desktop || {}).min),
        TIER_DEFAULTS.desktop.min_width, tabletMax + 1, 3000
      )
    );

    const makeTier = (name, raw, dft, min, max) => {
      raw = raw || {};
      const isMobile = name === 'mobile';
      return {
        name: name,
        min_width: min,
        max_width: max,
        layout: oneOf(raw.layout, ['single', 'two-column', 'three-column'], dft.layout),
        nav: oneOf(raw.nav, ['bar', 'drawer'], dft.nav),
        sidebar: oneOf(
          raw.sidebar, ['sticky', 'inline', 'offcanvas', 'hide'],
          isMobile && hasLegacy ? legacySide : dft.sidebar
        ),
        toc: oneOf(
          raw.toc, ['sticky', 'panel', 'hide'],
          isMobile && hasLegacy ? legacyToc : dft.toc
        ),
        container_width: num(raw.container_width, 0, 0, 3000),
        content_width: num(raw.content_width, 0, 0, 2000),
        fluid: raw.fluid === undefined
          ? Boolean(hasLegacy && legacyFluid && name !== 'desktop')
          : raw.fluid !== false && raw.fluid !== 'false',
        density: oneOf(raw.density, ['comfortable', 'compact'], dft.density),
        disable: (Array.isArray(raw.disable) ? raw.disable : []).filter((k) => COMPONENT_SELECTOR[k])
      };
    };

    const tiers = {
      mobile: makeTier('mobile', rawTiers.mobile, TIER_DEFAULTS.mobile, 0, mobileMax),
      tablet: makeTier('tablet', rawTiers.tablet, TIER_DEFAULTS.tablet, mobileMax + 1, tabletMax),
      desktop: makeTier('desktop', rawTiers.desktop, TIER_DEFAULTS.desktop, desktopMin, 0)
    };

    const detectRaw = cfg.detect || {};
    const full = strategy === 'adaptive';
    const detect = {
      width: bool(detectRaw.width, true),
      ua: full && bool(detectRaw.ua, true),
      touch: full && bool(detectRaw.touch, true),
      dpr: full && bool(detectRaw.dpr, true),
      orientation: bool(detectRaw.orientation, true),
      upgrade_large_screen: bool(detectRaw.upgrade_large_screen, true)
    };

    return {
      enable: enable,
      strategy: strategy,
      default_tier: oneOf(cfg.default_tier, TIER_ORDER, 'desktop'),
      remember: bool(cfg.remember, true),
      detect: detect,
      order: TIER_ORDER,
      tiers: tiers,
      boundaries: { mobile_max: mobileMax, tablet_max: tabletMax, desktop_min: desktopMin },
      component_selector: COMPONENT_SELECTOR,
      touch_target: num(firstDefined(cfg.touch_target, legacy.touch_target), 44, 0, 96),
      safe_area: bool(firstDefined(cfg.safe_area, legacy.safe_area), true),
      compact_height: bool(firstDefined(cfg.compact_height, legacy.compact_height), true),
      user_zoom: bool(firstDefined(cfg.user_zoom, legacy.user_zoom), true),
      fluid_min_width: num(firstDefined(cfg.fluid_min_width, legacy.fluid_min_width), 360, 240, 1200),
      fluid_max_width: num(firstDefined(cfg.fluid_max_width, legacy.fluid_max_width), 1440, 600, 3000),
      container_width: num(firstDefined(cfg.container_width, legacy.container_width), 0, 0, 3000),
      content_width: num(firstDefined(cfg.content_width, legacy.content_width), 0, 0, 2000)
    };
  }

  register('xfm_adaptive', adaptiveConfig);

  /**
   * 旧版响应式配置（由 adaptive 派生，保留向后兼容）。
   * 新站点请直接用 adaptive + xfm_adaptive。
   */
  register('xfm_breakpoints', function () {
    const A = adaptiveConfig();
    const b = A.boundaries;
    return {
      enable: A.enable,
      breakpoints: {
        xxl: 1600,
        xl: Math.max(b.desktop_min, 1280),
        lg: b.tablet_max + 1,
        md: Math.max(b.mobile_max + 1, Math.round((b.tablet_max + b.mobile_max + 2) / 2)),
        sm: b.mobile_max + 1,
        xs: Math.max(320, Math.round((b.mobile_max + 1) * 0.62))
      },
      mobile_sidebar: A.tiers.mobile.sidebar,
      mobile_toc: A.tiers.mobile.toc === 'hide' ? 'hide' : 'widget',
      fluid_typography: Boolean(A.tiers.mobile.fluid || A.tiers.tablet.fluid || A.tiers.desktop.fluid),
      fluid_min_width: A.fluid_min_width,
      fluid_max_width: A.fluid_max_width,
      touch_target: A.touch_target,
      safe_area: A.safe_area,
      compact_height: A.compact_height,
      user_zoom: A.user_zoom,
      container_width: A.container_width,
      content_width: A.content_width
    };
  });

  /** 导航选中态 */
  register('xfm_active', function (path) {
    const page = this.page || {};
    const current = page.path || '';
    if (!path) return '';
    const p = normalizePath(path);
    if (p === '/' || p === '') {
      return current === 'index.html' || current === '' || current.indexOf('/page/') === 0 ? 'is-active' : '';
    }
    if (current.indexOf(String(path).replace(/^\//, '')) === 0) return 'is-active';
    return '';
  });

  /** 文章正文目录 */
  register('xfm_toc', function (content, wrapperClass) {
    // toc_depth 是「要收录的层级列表」（如 [2,3,4]），取最小 / 最大当范围；
    // 写成两元素 [2,4] 也等价。早先按 [0]/[1] 取，遇到 [2,3,4] 会误判成 2~3。
    const rawDepth = getConfig(hexo, 'post.toc_depth', [2, 4]);
    const depthList = (Array.isArray(rawDepth) ? rawDepth : String(rawDepth).split(','))
      .map(Number)
      .filter((n) => isFinite(n));
    const min = depthList.length ? Math.min.apply(null, depthList) : 2;
    const max = depthList.length ? Math.max.apply(null, depthList) : 4;
    const headings = extractHeadings(content, min, max);
    if (!headings.length) return '';
    const tree = buildTree(headings);
    const self = this;
    const render = (nodes, depth) => {
      let html = '<ul class="toc-child depth-' + depth + '">';
      nodes.forEach((n) => {
        html += '<li class="toc-item">';
        html +=
          '<a class="toc-link" href="#' +
          escapeHTML(n.id) +
          '" data-toc-id="' +
          escapeHTML(n.id) +
          '"><span class="toc-number"></span><span class="toc-text">' +
          escapeHTML(n.text) +
          '</span></a>';
        if (n.children.length) html += render(n.children, depth + 1);
        html += '</li>';
      });
      html += '</ul>';
      return html;
    };
    return '<nav class="toc-body ' + (wrapperClass || '') + '">' + render(tree, 1) + '</nav>';
  });

  /** 文档模式侧边栏（读取 source/_data/docs.yml 或自动生成） */
  register('xfm_docs_nav', function () {
    const urlFor = this.url_for.bind(this);
    const dataKey = getConfig(hexo, 'docs.data_file', 'docs');
    const data = (this.site && this.site.data ? this.site.data : {}) || {};
    const current = normalizePath(this.page ? this.page.path : '');
    let items = data[dataKey];

    if (!items || !items.length) {
      const pages = this.site.pages.data.filter((p) => {
        const src = p.source || '';
        return src.indexOf('index.md') === -1 || src.replace('index.md', '') !== '';
      });
      items = pages
        .map((p) => ({
          title: p.title || p.source.replace(/\.md$/, ''),
          path: p.path,
          order: Number(p.order || 9999)
        }))
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    }

    items = items.map((it) => normalizeDocsItem(it));
    if (!items.length) return '<div class="xfm-nav-empty">' + escapeHTML(this.__('docs.no_docs')) + '</div>';
    const navOpts = {
      expanded: getConfig(hexo, 'docs.expanded', true) !== false,
      auto_expand: getConfig(hexo, 'docs.auto_expand', true) !== false,
      toggle_label: this.__('docs.toggle')
    };
    return '<nav class="xfm-sidebar-nav">' + renderNavNodes(items, urlFor, current, 1, navOpts) + '</nav>';
  });

  /**
   * 笔记模式侧边栏（按分类 / 日期分组）
   * 收录范围由 notes.note_categories / note_tags 决定：两者都留空 = 全站文章；
   * 同时配置时取交集。分组 / 排序 / 折叠全部读配置，风格沿用主题既有 class。
   */
  register('xfm_notes_nav', function () {
    const urlFor = this.url_for.bind(this);
    const groupBy = getConfig(hexo, 'notes.group_by', 'category');
    const sortBy = getConfig(hexo, 'notes.sort_by', 'date');
    const order = getConfig(hexo, 'notes.order', 'desc') === 'asc' ? 1 : -1;
    const showDate = getConfig(hexo, 'notes.show_date', true);
    const collapsed = getConfig(hexo, 'notes.collapsed', false) === true;
    const current = normalizePath(this.page ? this.page.path : '');
    const wantCats = toArray(getConfig(hexo, 'notes.note_categories', []));
    const wantTags = toArray(getConfig(hexo, 'notes.note_tags', []));
    const pick = (p, key) =>
      p[key] && p[key].data ? p[key].data.map((x) => x.name) : [];

    const all = (this.site.posts.data || []).filter((p) => p.title);
    const posts = all.filter(
      (p) => matchAny(pick(p, 'categories'), wantCats) && matchAny(pick(p, 'tags'), wantTags)
    );

    if (!posts.length) {
      return '<div class="xfm-nav-empty">' + escapeHTML(this.__('notes.empty_group')) + '</div>';
    }

    const sorted = posts.slice().sort((a, b) => {
      if (sortBy === 'title') return order * a.title.localeCompare(b.title);
      if (sortBy === 'order') return order * ((a.order || 9999) - (b.order || 9999));
      return order * (new Date(a.date) - new Date(b.date));
    });

    const renderLink = (p) => {
      const active = normalizePath(p.path) === current;
      let item =
        '<li class="xfm-nav-item' + (active ? ' is-active' : '') + '">' +
        '<a class="xfm-nav-link' + (active ? ' is-active' : '') + '" href="' +
        escapeHTML(urlFor(p.path)) +
        '"' +
        (active ? ' aria-current="page"' : '') +
        '><span class="xfm-nav-link-title">' +
        escapeHTML(p.title) +
        '</span>';
      if (showDate) {
        item +=
          '<span class="xfm-nav-link-date">' +
          escapeHTML(p.date.format ? p.date.format('MM-DD') : String(p.date).slice(5, 10)) +
          '</span>';
      }
      return item + '</a></li>';
    };

    let html = '<nav class="xfm-sidebar-nav xfm-notes-nav">';
    html +=
      '<div class="xfm-notes-count">' +
      escapeHTML(this.__('notes.total_notes', posts.length)) +
      '</div>';

    // group_by: none —— 不分组的平铺列表，没有可折叠的分组头
    if (groupBy === 'none') {
      html +=
        '<ul class="xfm-nav-list depth-1 xfm-notes-flat">' +
        sorted.map(renderLink).join('') +
        '</ul>';
      return html + '</nav>';
    }

    const groups = new Map();
    sorted.forEach((p) => {
      let key = this.__('notes.ungrouped');
      if (groupBy === 'date') {
        key = (p.date.format ? p.date.format('YYYY-MM') : String(p.date).slice(0, 7)) || key;
      } else {
        const cats = pick(p, 'categories');
        if (cats.length) key = cats.join(' / ');
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });

    const toggleLabel = this.__('notes.toggle');
    groups.forEach((list, key) => {
      const open = list.some((p) => normalizePath(p.path) === current) || !collapsed;
      html +=
        '<div class="xfm-nav-group' +
        (open ? ' is-open' : ' is-collapsed') +
        '">';
      html +=
        '<div class="xfm-nav-group-head" role="button" tabindex="0" aria-expanded="' +
        (open ? 'true' : 'false') +
        '" aria-label="' +
        escapeHTML(toggleLabel + ': ' + key) +
        '"><span class="xfm-nav-group-title">' +
        escapeHTML(key) +
        '</span><span class="xfm-nav-group-count">' +
        list.length +
        '</span><i class="xfm-arrow"></i></div>';
      html +=
        '<ul class="xfm-nav-list depth-1">' + list.map(renderLink).join('') + '</ul>';
      html += '</div>';
    });
    html += '</nav>';
    return html;
  });

  /** 相关文章推荐（标签 / 分类权重评分） */
  register('xfm_related', function (post, count) {
    if (!post) return [];
    const n = Number(count || getConfig(hexo, 'post.related_count', 4));
    const all = (this.site ? this.site.posts.data : []) || [];
    const names = (coll) => (coll && coll.data ? coll.data.map((x) => x.name) : []);
    const postTags = names(post.tags);
    const postCats = names(post.categories);
    return all
      .filter((p) => p.path !== post.path)
      .map((p) => {
        let score = 0;
        score += names(p.tags).filter((t) => postTags.indexOf(t) > -1).length * 2;
        score += names(p.categories).filter((c) => postCats.indexOf(c) > -1).length * 3;
        return { post: p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.post.date) - new Date(a.post.date))
      .slice(0, n)
      .map((x) => x.post);
  });

  /** 站点总字数 */
  register('xfm_total_words', function () {
    const posts = (this.site ? this.site.posts.data : []) || [];
    return posts.reduce((sum, p) => sum + countWords(p.content), 0);
  });

  /** 格式化数字（1.2k / 12.3k） */
  register('xfm_number', function (num) {
    const n = Number(num) || 0;
    if (n < 1000) return String(n);
    if (n < 10000) return (n / 1000).toFixed(1) + 'k';
    return (n / 10000).toFixed(1) + 'w';
  });

  /**
   * RSS 入口（导航图标 / head 自动发现 / 页脚链接共用一份判定）
   * vendors.rss_navbar:
   *   auto（默认）—— 站点装了 feed 生成器才输出，避免未装插件时的空链接
   *   true       —— 强制输出
   *   false      —— 隐藏
   */
  register('xfm_rss', function () {
    const vendors = (hexo.theme && hexo.theme.config && hexo.theme.config.vendors) || {};
    const setting = vendors.rss_navbar === undefined ? 'auto' : vendors.rss_navbar;
    let enable;
    if (setting === false || setting === 'false') enable = false;
    else if (setting === true || setting === 'true') enable = true;
    else enable = hasFeedGenerator(hexo);
    return { enable: enable, url: vendors.rss || '/atom.xml' };
  });

  /**
   * Google AdSense（脚本注入 / 广告位渲染共用一份判定）
   * allowed 为 false 时模板不输出任何广告单元；load_script 决定是否注入 adsbygoogle.js
   */
  register('xfm_ads', function () {
    const cfg = getConfig(hexo, 'adsense', {}) || {};
    const enabled = cfg.enable === true || cfg.enable === 'true';
    const client = String(cfg.client == null ? '' : cfg.client).trim();
    const slots = {};
    Object.keys(cfg.slots || {}).forEach(function (k) {
      const v = cfg.slots[k];
      if (v !== null && v !== undefined && String(v).trim() !== '') slots[k] = String(v).trim();
    });
    const excludes = toArray(cfg.exclude_pages);
    // page.path 形如 "about/index.html"（无前导斜杠），配置里通常写 "/about/"，
    // 两侧都补上前导斜杠再比对，避免写 `/about/` 时永远匹配不上
    const pagePath = '/' + String((this.page && this.page.path) || '').replace(/^\/+/, '');
    const excluded = excludes.some(function (p) {
      return pagePath.indexOf('/' + String(p).replace(/^\/+/, '')) > -1;
    });
    // front-matter 里 ads: false 可单独关掉某一篇
    const pageOff = this.page && this.page.ads === false;
    const allowed = enabled && !!client && !pageOff && !excluded;
    const hasSlot = Object.keys(slots).length > 0;
    return {
      enable: enabled,
      client: client,
      allowed: allowed,
      slots: slots,
      has_slot: hasSlot,
      auto_ads: cfg.auto_ads !== false,
      // 关掉自动广告时仍要加载脚本 —— 手动广告位（<ins>）没有脚本不会被填充
      load_script: enabled && !!client && (cfg.auto_ads !== false || hasSlot),
      lazy: cfg.lazy !== false,
      test: cfg.test === true,
      format: String(cfg.format || 'auto'),
      layout_key: String(cfg.layout_key || ''),
      full_width_responsive: cfg.full_width_responsive !== false,
      label: cfg.label === true,
      label_text: this.__('common.ad'),
      list_interval: Number(cfg.list_interval) > 0 ? Number(cfg.list_interval) : 0
    };
  });

  /**
   * 多语言 / 中英切换。
   * 返回可用语言清单 + 各语言的全量扁平字典（前端做「当前文案 → 目标文案」反查替换）。
   */
  register('xfm_lang', function () {
    const cfg = getConfig(hexo, 'lang_switcher', {}) || {};
    const langs = parseLangs(cfg.languages);
    const enable = cfg.enable !== false && langs.length > 1;
    const siteLang = normLang(getConfig(hexo, 'language', ''));
    let current = langs[0].code;
    const hit = langs.filter((l) => normLang(l.code) === siteLang)[0];
    if (hit) current = hit.code;
    const tables = {};
    if (enable) {
      langs.forEach((l) => {
        tables[l.code] = loadLangTable(hexo, l.code);
      });
    }
    return {
      enable: enable,
      current: current,
      languages: langs,
      tables: tables,
      style: cfg.style === 'menu' || cfg.style === 'toggle' ? cfg.style : 'auto',
      position: cfg.position === 'menu' ? 'menu' : 'tools',
      remember: cfg.remember !== false,
      update_html_lang: cfg.update_html_lang !== false
    };
  });

  /** 配置读取（模板里兜底用） */
  register('xfm_config', function (path, dft) {
    return getConfig(hexo, path, dft);
  });

  /** 是否开启某功能 */
  register('xfm_enabled', function (path, dft) {
    const v = getConfig(hexo, path, dft);
    return Boolean(v) && v !== 'none' && v !== 'false';
  });
};

function normalizeDocsItem(item) {
  const node = {
    title: item.title || item.name || 'Untitled',
    path: item.path || item.url || item.permalink || '',
    children: []
  };
  const kids = item.children || item.items || item.sections || [];
  if (kids && kids.length) node.children = kids.map(normalizeDocsItem);
  return node;
}

/* ---------------------------------------------------------------------------
 * 自执行入口
 * Hexo 的脚本加载器（v7/v8）在读取脚本后不会回调 module.exports，
 * 这里在脚本作用域内直接调用，兼容新老版本两套行为。
 * ------------------------------------------------------------------------- */
function __xfmBootstrap() {
  if (typeof hexo === "undefined" || !hexo || !hexo.extend) return;
  if (hexo.__XFM_HELPERS) return;
  hexo.__XFM_HELPERS = true;
  module.exports(hexo);
}
__xfmBootstrap();
