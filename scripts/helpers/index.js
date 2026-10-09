/* global hexo */
/**
 * XFM Theme - Helpers
 * 提供给 EJS 模板使用的辅助函数集合。
 */

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

/** 读取配置（点号路径），支持默认值 */
function getConfig(hexo, path, dft) {
  const src = hexo && hexo.config ? hexo.config : {};
  return path.split('.').reduce((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return acc[key];
  }, src) !== undefined
    ? path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), src)
    : dft;
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

function renderNavNodes(nodes, urlFor, activePath, depth) {
  let html = '<ul class="xfm-nav-list depth-' + depth + '">';
  nodes.forEach((node) => {
    const hasChildren = node.children && node.children.length;
    const active = node.path && activePath && normalizePath(node.path) === activePath;
    const isParent = node.children && containsActive(node.children, activePath);
    html +=
      '<li class="xfm-nav-item' +
      (hasChildren ? ' has-children' : '') +
      (active ? ' is-active' : '') +
      (isParent ? ' is-open' : '') +
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
      html += '<button class="xfm-nav-toggle" type="button" aria-label="toggle"><i class="xfm-arrow"></i></button>';
      html += renderNavNodes(node.children, urlFor, activePath, depth + 1);
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
    const min = Number(getConfig(hexo, 'post.toc_depth[0]', 2));
    const max = Number(getConfig(hexo, 'post.toc_depth[1]', 4));
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
    return '<nav class="xfm-sidebar-nav">' + renderNavNodes(items, urlFor, current, 1) + '</nav>';
  });

  /** 笔记模式侧边栏（按分类 / 日期分组） */
  register('xfm_notes_nav', function () {
    const urlFor = this.url_for.bind(this);
    const groupBy = getConfig(hexo, 'notes.group_by', 'category');
    const sortBy = getConfig(hexo, 'notes.sort_by', 'date');
    const order = getConfig(hexo, 'notes.order', 'desc') === 'asc' ? 1 : -1;
    const showDate = getConfig(hexo, 'notes.show_date', true);
    const current = normalizePath(this.page ? this.page.path : '');
    const posts = (this.site.posts.data || []).filter((p) => p.title);

    const sorted = posts.slice().sort((a, b) => {
      if (sortBy === 'title') return order * a.title.localeCompare(b.title);
      if (sortBy === 'order') return order * ((a.order || 9999) - (b.order || 9999));
      return order * (new Date(a.date) - new Date(b.date));
    });

    const groups = new Map();
    sorted.forEach((p) => {
      let key = '未分组';
      if (groupBy === 'category') {
        const cats = p.categories && p.categories.data && p.categories.data.length ? p.categories.data : [];
        key = cats.length ? cats.map((c) => c.name).join(' / ') : '未分组';
      } else if (groupBy === 'date') {
        key = (p.date.format ? p.date.format('YYYY-MM') : String(p.date).slice(0, 7)) || '未分组';
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });

    if (!groups.size) return '<div class="xfm-nav-empty">' + escapeHTML(this.__('notes.empty_group')) + '</div>';

    let html = '<nav class="xfm-sidebar-nav xfm-notes-nav">';
    html +=
      '<div class="xfm-notes-count">' +
      escapeHTML(this.__('notes.total_notes').replace('%s', String(posts.length))) +
      '</div>';
    groups.forEach((list, key) => {
      const open = list.some((p) => normalizePath(p.path) === current);
      html += '<div class="xfm-nav-group' + (open ? ' is-open' : '') + '">';
      html +=
        '<div class="xfm-nav-group-head"><span class="xfm-nav-group-title">' +
        escapeHTML(key) +
        '</span><span class="xfm-nav-group-count">' +
        list.length +
        '</span><i class="xfm-arrow"></i></div>';
      html += '<ul class="xfm-nav-list depth-1">';
      list.forEach((p) => {
        const active = normalizePath(p.path) === current;
        html += '<li class="xfm-nav-item' + (active ? ' is-active' : '') + '">';
        html +=
          '<a class="xfm-nav-link' +
          (active ? ' is-active' : '') +
          '" href="' +
          escapeHTML(urlFor(p.path)) +
          '"' +
          (active ? ' aria-current="page"' : '') +
          '><span class="xfm-nav-link-title">' +
          escapeHTML(p.title) +
          '</span>';
        if (showDate) {
          html +=
            '<span class="xfm-nav-link-date">' +
            escapeHTML(p.date.format ? p.date.format('MM-DD') : String(p.date).slice(5, 10)) +
            '</span>';
        }
        html += '</a></li>';
      });
      html += '</ul></div>';
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
