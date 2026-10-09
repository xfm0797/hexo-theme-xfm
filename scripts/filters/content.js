/* global hexo */
/**
 * XFM Theme - Content Filter（零第三方依赖）
 * 在 after_post_render 阶段增强正文 HTML：
 *   1. 代码块工具条（语言标签 / 复制 / 折叠）
 *   2. 标题锚点补全
 *   3. 表格滚动容器
 *   4. 图片懒加载属性
 *   5. 外链新窗口打开
 * 实现采用「占位保护 + 正则替换」，不依赖 cheerio 等任何第三方包。
 */

const PLACEHOLDER = '\u0000XFMCODE';

const LANG_ALIAS = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  sh: 'Shell',
  bash: 'Shell',
  shell: 'Shell',
  zsh: 'Shell',
  json: 'JSON',
  yml: 'YAML',
  yaml: 'YAML',
  md: 'Markdown',
  markdown: 'Markdown',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  py: 'Python',
  python: 'Python',
  java: 'Java',
  go: 'Go',
  golang: 'Go',
  rb: 'Ruby',
  php: 'PHP',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  rs: 'Rust',
  rust: 'Rust',
  kt: 'Kotlin',
  swift: 'Swift',
  sql: 'SQL',
  diff: 'Diff',
  dockerfile: 'Dockerfile',
  text: 'Text',
  plaintext: 'Text',
  graphql: 'GraphQL',
  ini: 'INI',
  toml: 'TOML',
  vue: 'Vue',
  objc: 'Objective-C'
};

function cfg(obj, path, dft) {
  const val = path.split('.').reduce((acc, k) => (acc == null || acc === '' ? undefined : acc[k]), obj);
  return val === undefined ? dft : val;
}

function prettyLang(lang) {
  if (!lang) return '';
  const lower = String(lang).toLowerCase();
  return LANG_ALIAS[lower] || String(lang).toUpperCase();
}

function escapeHTML(str) {
  return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[c]);
}

function stripTags(str) {
  return String(str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

function slugify(text, index) {
  const s = String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\- ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return encodeURIComponent(s) || 'section-' + index;
}

function attr(html, name) {
  const m = html.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
  return m ? m[1] : '';
}

function hasAttr(html, name) {
  return new RegExp('\\s' + name + '\\s*=', 'i').test(html);
}

function injectAttr(tagHtml, inject) {
  if (tagHtml.charAt(tagHtml.length - 2) === '/') {
    return tagHtml.slice(0, -2) + ' ' + inject + '/>';
  }
  return tagHtml.slice(0, -1) + ' ' + inject + '>';
}

module.exports = function (hexo) {
  // 主题配置在脚本注册阶段可能尚未挂载，统一在运行时惰性读取
  const configOf = () => Object.assign({}, (hexo.theme && hexo.theme.config) || {}, hexo.config);

  hexo.extend.filter.register('after_post_render', function (data) {
    if (!data || !data.content) return data;
    if (cfg(configOf(), 'vendors.content_enhance', true) === false) return data;

    let content = String(data.content);
    try {
    const isZh = String(configOf().language || 'zh-CN').toLowerCase().indexOf('zh') === 0;
    const copyLabel = isZh ? '复制' : 'Copy';
    const expandLabel = isZh ? '展开' : 'Expand';

    // ---------------------------------------------------------------------
    // 1. 保护代码块区域（先提取，最后还原），避免内部 HTML 被其他规则误伤
    // ---------------------------------------------------------------------
    const codes = [];
    content = content.replace(
      /<(figure|div)\b([^>]*class\s*=\s*["'][^"']*highlight[^"']*["'][^>]*)>([\s\S]*?)<\/\1>|<pre\b[^>]*>[\s\S]*?<\/pre>/gi,
      (matched) => {
        codes.push(matched);
        return PLACEHOLDER + (codes.length - 1) + '\u0000';
      }
    );

    // ---------------------------------------------------------------------
    // 2. 标题锚点
    // ---------------------------------------------------------------------
    const seen = Object.create(null);
    let hIndex = 0;
    content = content.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (all, level, attrs, inner) => {
      let id = attr(attrs, 'id');
      const text = stripTags(inner).trim();
      if (!id) {
        id = slugify(text, hIndex);
        let base = id;
        let k = 1;
        while (seen[base]) {
          base = id + '-' + k;
          k += 1;
        }
        id = base;
        attrs = attrs ? attrs + ' id="' + id + '"' : ' id="' + id + '"';
      }
      seen[id] = true;
      hIndex += 1;
      if (!/\sclass\s*=/i.test(attrs)) {
        attrs += ' class="headline"';
      } else {
        attrs = attrs.replace(/class\s*=\s*["']([^"']*)["']/i, (m, c) => 'class="' + c + ' headline"');
      }
      return '<h' + level + attrs + '>' + inner + '</h' + level + '>';
    });

    // ---------------------------------------------------------------------
    // 3. 表格滚动容器
    // ---------------------------------------------------------------------
    content = content.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
      if (/class\s*=\s*["'][^"']*table-wrap/i.test(table)) return table;
      return '<div class="table-wrap" tabindex="0">' + table + '</div>';
    });

    // ---------------------------------------------------------------------
    // 4. 图片懒加载 & 灯箱
    // ---------------------------------------------------------------------
    if (cfg(configOf(), 'vendors.lazyload', true)) {
      const zoom = cfg(configOf(), 'vendors.zoom_image', true);
      const placeholder = String(configOf().placeholder || '');
      content = content.replace(/<img\b[^>]*>/gi, (img) => {
        let out = img;
        if (!hasAttr(out, 'loading')) out = injectAttr(out, 'loading="lazy"');
        if (!hasAttr(out, 'decoding')) out = injectAttr(out, 'decoding="async"');
        if (!hasAttr(out, 'alt')) out = injectAttr(out, 'alt=""');
        if (zoom && !hasAttr(out, 'data-zoomable')) {
          const src = attr(out, 'src');
          if (src && !/^data:/i.test(src)) out = injectAttr(out, 'data-zoomable="true"');
        }
        return out;
      });
    }

    // ---------------------------------------------------------------------
    // 5. 外链处理
    // ---------------------------------------------------------------------
    if (cfg(configOf(), 'vendors.external_link', true)) {
      const siteHost = String(configOf().url || '')
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
      content = content.replace(/<a\b[^>]*>/gi, (a) => {
        const href = attr(a, 'href');
        if (!href || hasAttr(a, 'target')) return a;
        if (/^(mailto:|tel:|#)/i.test(href)) return a;
        if (/^\/\//.test(href)) {
          return injectAttr(a, 'target="_blank" rel="noopener noreferrer nofollow" class="ext-link"');
        }
        if (!/^https?:\/\//i.test(href)) return a;
        try {
          const host = new URL(href).host;
          if (!host || !siteHost || host !== siteHost) {
            return injectAttr(a, 'target="_blank" rel="noopener noreferrer nofollow" class="ext-link"');
          }
        } catch (e) {
          return a;
        }
        return a;
      });
    }

    // ---------------------------------------------------------------------
    // 6. 任务列表
    // ---------------------------------------------------------------------
    const addTaskClass = (all, attrs, body) => {
      const cls = /class\s*=\s*["']/i.test(attrs || '')
        ? attrs.replace(/class\s*=\s*["']([^"']*)["']/i, 'class="$1 task-list-item"')
        : (attrs || '') + ' class="task-list-item"';
      return '<li' + cls + '>' + body;
    };

    // Markdown 渲染器已转成 input 的情况（hexo-renderer-marked 等）
    content = content.replace(
      /<li(\s[^>]*)?>(\s*<input[^>]*\btype\s*=\s*["']checkbox["'][^>]*>)/gi,
      addTaskClass
    );

    // 仍是字面量 [ ] / [x] 的情况
    content = content.replace(/<li(\s[^>]*)?>(\s*\[[ xX]\]\s*)/gi, addTaskClass);

    // ---------------------------------------------------------------------
    // 7. 还原并增强代码块
    // ---------------------------------------------------------------------
    const showLang = cfg(configOf(), 'code_block.language', true) !== false;
    const showCopy = cfg(configOf(), 'code_block.copy', true) !== false;
    const macStyle = cfg(configOf(), 'code_block.mac_style', true) !== false;
    const maxHeight = Number(cfg(configOf(), 'code_block.max_height', -1));

    content = content.replace(
      new RegExp(PLACEHOLDER + '(\\d+)\u0000', 'g'),
      (all, idx) => {
        let block = codes[Number(idx)];

        // 提取语言
        let lang = '';
        const figMatch = block.match(/^<(figure|div)\b([^>]*)>/i);
        if (figMatch) {
          const cls = attr(figMatch[2], 'class') || '';
          const m = cls.match(/(?:highlight|language|lang)[ +]([^\s"']+)/i);
          if (m) lang = m[1];
        }
        const codeClassM = block.match(/<code\b[^>]*class\s*=\s*["']([^"']*)["']/i);
        if (!lang && codeClassM) {
          const m2 = codeClassM[1].match(/(?:language|lang|hljs language)-([^\s"']+)/i);
          if (m2) lang = m2[1];
        }
        lang = String(lang || '').trim();
        if (/^hljs$/i.test(lang)) lang = '';

        const openTag = block.match(/^<(figure|div)\b([^>]*)>/i);
        const isFigure = openTag && openTag[1].toLowerCase() === 'figure';

        // 行数（用于折叠）：优先从真正的代码列统计，忽略行号列
        const codeCellMatch = block.match(/<td class="code"[^>]*>([\s\S]*?)<\/td>/i);
        const codeNodeMatch = block.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
        const source = codeCellMatch ? codeCellMatch[1] : codeNodeMatch ? codeNodeMatch[1] : block;
        const textForCount = stripTags(source.replace(/<br\s*\/?>/gi, '\n')).replace(/\n$/, '');
        const lines = Math.max(1, textForCount.split('\n').length);
        const fold = maxHeight > 0 && lines > maxHeight;

        let tools = '<div class="code-tools">';
        if (showCopy) {
          tools +=
            '<button class="code-tool code-copy" type="button" data-xfm-copy aria-label="' +
            copyLabel +
            '"><svg class="xfm-icon" aria-hidden="true"><use xlink:href="#xfm-i-copy"></use></svg><span class="code-tool-label">' +
            copyLabel +
            '</span></button>';
        }
        if (fold) {
          tools +=
            '<button class="code-tool code-expand" type="button" data-xfm-expand aria-label="' +
            expandLabel +
            '"><svg class="xfm-icon" aria-hidden="true"><use xlink:href="#xfm-i-chevron-down"></use></svg><span class="code-tool-label">' +
            expandLabel +
            '</span></button>';
        }
        tools += '</div>';

        const header =
          '<figcaption class="code-header">' +
          (macStyle ? '<span class="code-dots"><i></i><i></i><i></i></span>' : '') +
          (showLang ? '<span class="code-lang">' + escapeHTML(prettyLang(lang) || 'Code') + '</span>' : '<span class="code-lang"></span>') +
          tools +
          '</figcaption>';

        if (isFigure) {
          let attrs = openTag[2];
          if (!/class\s*=\s*["'][^"']*code-block/i.test(attrs)) {
            if (/class\s*=\s*["']/i.test(attrs)) {
              attrs = attrs.replace(/class\s*=\s*["']([^"']*)["']/i, 'class="$1 code-block"');
            } else {
              attrs += ' class="code-block"';
            }
          }
          block = block.replace(
            /^<(figure|div)\b([^>]*)>/i,
            '<figure' + attrs + ' data-lang="' + escapeHTML(lang || 'text') + '"' + (fold ? ' data-folded="true"' : '') + '>'
          );
          // 在 <figure> 打开标签后插入 header
          const pos = block.indexOf('>') + 1;
          block = block.slice(0, pos) + header + block.slice(pos);
          return block + (fold ? '<div class="code-fold-mask"><span>' + expandLabel + '</span></div>' : '');
        }

        // 独立的 <pre> / <div>：包裹成 figure.code-block
        const wrapperAttrs = figMatch ? figMatch[2] : '';
        return (
          '<figure class="highlight code-block" data-lang="' +
          escapeHTML(lang || 'text') +
          '"' +
          (fold ? ' data-folded="true"' : '') +
          '>' +
          header +
          block +
          (fold ? '<div class="code-fold-mask"><span>' + expandLabel + '</span></div>' : '') +
          '</figure>'
        );
      }
    );

    data.content = content;
    } catch (e) {
      if (hexo.log && hexo.log.warn) {
        hexo.log.warn('[XFM] content filter skipped: ' + (e && e.message ? e.message : e));
      }
    }
    return data;
  });
};

/* ---------------------------------------------------------------------------
 * 自执行入口
 * Hexo 的脚本加载器（v7/v8）在读取脚本后不会回调 module.exports，
 * 这里在脚本作用域内直接调用，兼容新老版本两套行为。
 * ------------------------------------------------------------------------- */
function __xfmBootstrap() {
  if (typeof hexo === "undefined" || !hexo || !hexo.extend) return;
  if (hexo.__XFM_CONTENT_FILTER) return;
  hexo.__XFM_CONTENT_FILTER = true;
  module.exports(hexo);
}
__xfmBootstrap();
