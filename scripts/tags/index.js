/* global hexo */
/**
 * XFM Theme - Tag Plugins
 * 提供丰富的 Markdown 扩展语法：提示块、折叠、选项卡、时间轴、栅格、
 * 按钮、徽标、图标、流程图、链接卡片等。
 */

let tabId = 0;
let timelineId = 0;

const tabStore = [];
const timelineStore = [];
const rowStore = [];

const NOTE_TYPES = ['default', 'primary', 'info', 'success', 'warning', 'danger', 'tip', 'quote'];

function escapeHTML(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

/** 标签参数统一转为字符串数组 */
function toList(args) {
  if (args == null) return [];
  const raw = Array.isArray(args) ? args.join(' ') : String(args);
  return raw
    .split(/\s*,\s*|\s+/)
    .map((s) => s.replace(/^["']|["']$/g, '').trim())
    .filter((s) => s !== '');
}

module.exports = function (hexo) {
  /** 标签内容渲染：已是 HTML 则原样返回，否则尝试走 Markdown 渲染 */
  function md(content) {
    const text = String(content == null ? '' : content);
    if (!text.trim()) return '';
    if (/^\s*<(p|div|ul|ol|li|pre|h[1-6]|figure|blockquote|table|img|a|code|strong|em|span|input|br|dl|hr)\b/i.test(text)) {
      return text;
    }
    try {
      if (hexo.render && typeof hexo.render.renderSync === 'function') {
        const out = hexo.render.renderSync({ text, engine: 'markdown' });
        if (out) return out;
      }
    } catch (e) {
      /* 未安装 Markdown 渲染器时降级处理 */
    }
    return '<p>' + text.replace(/\n/g, '<br>') + '</p>';
  }

  const register = (name, fn, options) => hexo.extend.tag.register(name, fn, options || {});

  // ---------------------------------------------------------------------------
  // 1. 提示块 {% note info 标题 %} 内容 {% endnote %}
  // ---------------------------------------------------------------------------
  const NOTE_ICON = {
    default: 'note',
    primary: 'star',
    info: 'info',
    success: 'check',
    warning: 'warning',
    danger: 'close',
    tip: 'bulb',
    quote: 'quote'
  };

  function renderNote(args, content) {
    const list = toList(args);
    let type = 'default';
    let title = '';
    list.forEach((item) => {
      const lower = item.toLowerCase();
      if (NOTE_TYPES.indexOf(lower) > -1) type = lower;
      else if (!title) title = item;
    });
    return (
      '<div class="xfm-note note-' + type + '">' +
      '<div class="note-inner">' +
      '<span class="note-icon"><svg class="xfm-icon" aria-hidden="true"><use xlink:href="#xfm-i-' +
      (NOTE_ICON[type] || 'note') +
      '"></use></svg></span>' +
      '<div class="note-main">' +
      (title ? '<div class="note-title">' + escapeHTML(title) + '</div>' : '') +
      '<div class="note-body">' + md(content) + '</div>' +
      '</div></div></div>'
    );
  }

  register('note', renderNote, { ends: true });
  ['info', 'success', 'warning', 'danger', 'tip', 'quote'].forEach((type) => {
    register(type, (args, content) => renderNote([type].concat(toList(args)), content), { ends: true });
  });

  // ---------------------------------------------------------------------------
  // 2. 折叠块 {% fold 标题 open %} 内容 {% endfold %}
  // ---------------------------------------------------------------------------
  function renderFold(args, content) {
    const list = toList(args);
    const open = list.some((s) => /^(open|show|true|1)$/i.test(s));
    const title = list.filter((s) => !/^(open|show|true|1)$/i.test(s)).join(' ') || '展开查看更多';
    return (
      '<details class="xfm-fold"' + (open ? ' open' : '') + '>' +
      '<summary class="fold-summary">' +
      '<svg class="xfm-icon fold-arrow" aria-hidden="true"><use xlink:href="#xfm-i-chevron-right"></use></svg>' +
      '<span>' + escapeHTML(title) + '</span></summary>' +
      '<div class="fold-content">' + md(content) + '</div>' +
      '</details>'
    );
  }

  register('fold', renderFold, { ends: true });
  register('collapse', renderFold, { ends: true });

  // ---------------------------------------------------------------------------
  // 3. 选项卡 {% tabs %} {% tab 标题 active %} 内容 {% endtab %} {% endtabs %}
  // ---------------------------------------------------------------------------
  register(
    'tabs',
    function (args, content) {
      const id = 'xfm-tabs-' + tabId++;
      let items = tabStore.splice(0, tabStore.length);

      // 兼容其它主题的注释写法：`<!-- tab 标题 -->` … `<!-- endtab -->`
      // 标签渲染先于 Markdown，注释标记无法被 Nunjucks 识别，这里手动切分。
      if (!items.length && /<!--\s*tab[\s>]/i.test(content)) {
        const re = /<!--\s*tab\s+([^>]*?)\s*-->([\s\S]*?)(?:<!--\s*endtab\s*-->|$)/gi;
        let m;
        while ((m = re.exec(String(content)))) {
          const body = String(m[2] || '').trim();
          if (!body) continue;
          items.push({ title: (m[1] || '').trim() || 'Tab', active: false, html: md(body) });
        }
        if (items.length) items[0].active = true;
      }

      if (!items.length) return '';
      let activeIndex = 0;
      items.forEach((item, i) => {
        if (item.active) activeIndex = i;
      });
      const navs = items
        .map(
          (item, i) =>
            '<button type="button" class="xfm-tab-btn' +
            (i === activeIndex ? ' is-active' : '') +
            '" data-tab-index="' +
            i +
            '" role="tab">' +
            escapeHTML(item.title) +
            '</button>'
        )
        .join('');
      const panels = items
        .map(
          (item, i) =>
            '<div class="xfm-tab-panel' +
            (i === activeIndex ? ' is-active' : '') +
            '" data-tab-index="' +
            i +
            '">' +
            item.html +
            '</div>'
        )
        .join('');
      return (
        '<div class="xfm-tabs" id="' + id + '" data-active="' + activeIndex + '">' +
        '<div class="xfm-tabs-nav" role="tablist">' + navs + '</div>' +
        '<div class="xfm-tabs-panels">' + panels + '</div>' +
        '</div>'
      );
    },
    { ends: true }
  );

  register(
    'tab',
    function (args, content) {
      const list = toList(args);
      const active = list.some((s) => /^(active|on|true|1|default)$/i.test(s));
      const titleParts = list.filter((s) => !/^(active|on|true|1|default)$/i.test(s));
      tabStore.push({ title: titleParts.join(' ') || 'Tab', active, html: md(content) });
      return '';
    },
    { ends: true }
  );

  // ---------------------------------------------------------------------------
  // 4. 时间轴 {% timeline %} {% event 标题 / 时间 / 颜色 %} 内容 {% endevent %} {% endtimeline %}
  // ---------------------------------------------------------------------------
  register(
    'timeline',
    function () {
      const items = timelineStore.splice(0, timelineStore.length);
      if (!items.length) return '';
      const body = items
        .map((it) => {
          const hasHead = it.date || it.title;
          return (
            '<div class="timeline-item timeline-' + it.color + '">' +
            '<div class="timeline-node"><i></i></div>' +
            '<div class="timeline-card">' +
            (hasHead
              ? '<div class="timeline-head">' +
                (it.date ? '<time class="timeline-date">' + escapeHTML(it.date) + '</time>' : '') +
                (it.title ? '<span class="timeline-title">' + escapeHTML(it.title) + '</span>' : '') +
                '</div>'
              : '') +
            (it.html ? '<div class="timeline-body">' + it.html + '</div>' : '') +
            '</div></div>'
          );
        })
        .join('');
      return '<div class="xfm-timeline" id="xfm-timeline-' + timelineId++ + '">' + body + '</div>';
    },
    { ends: true }
  );

  register(
    'event',
    function (args, content) {
      const head = toList(args).join(' ');
      const parts = head.split('/').map((s) => s.trim());
      const title = parts[0] || '';
      const date = parts[1] || '';
      let color = (parts[2] || 'primary').toLowerCase();
      if (!/^(primary|success|warning|danger|info|default|gray)$/.test(color)) color = 'primary';
      timelineStore.push({ title, date, color, html: md(content) });
      return '';
    },
    { ends: true }
  );

  // ---------------------------------------------------------------------------
  // 5. 栅格 {% row %} {% col 6 %} 内容 {% endcol %} {% endrow %}
  // ---------------------------------------------------------------------------
  register(
    'row',
    function () {
      const items = rowStore.splice(0, rowStore.length);
      const body = items
        .map((c) => {
          const width = Number(c.width) || 0;
          const style = width ? ' style="--col-span:' + Math.min(12, Math.max(1, width)) + '"' : '';
          return '<div class="xfm-col"' + style + '>' + c.html + '</div>';
        })
        .join('');
      return '<div class="xfm-row">' + body + '</div>';
    },
    { ends: true }
  );

  register(
    'col',
    function (args, content) {
      rowStore.push({ width: toList(args)[0], html: md(content) });
      return '';
    },
    { ends: true }
  );

  // ---------------------------------------------------------------------------
  // 6. 按钮 {% button /path/, 标题, 图标, 样式 %}
  // ---------------------------------------------------------------------------
  function renderButton(args) {
    const list = String(args == null ? '' : Array.isArray(args) ? args.join(' ') : args)
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''));
    const url = list[0] || '#';
    const title = list[1] || 'Button';
    const icon = list[2] || '';
    const style = list[3] || 'fill';
    const external = /^https?:\/\//i.test(url);
    return (
      '<a class="xfm-btn btn-' + escapeHTML(style) + '" href="' + escapeHTML(url) + '"' +
      (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
      (icon
        ? '<svg class="xfm-icon" aria-hidden="true"><use xlink:href="#xfm-i-' + escapeHTML(icon) + '"></use></svg>'
        : '') +
      '<span>' + escapeHTML(title) + '</span></a>'
    );
  }
  register('button', renderButton);
  register('btn', renderButton);

  // ---------------------------------------------------------------------------
  // 7. 徽标 {% label primary 文本内容 %}
  // ---------------------------------------------------------------------------
  function renderLabel(args) {
    const list = toList(args);
    let color = 'default';
    const words = [];
    list.forEach((s) => {
      if (/^(default|primary|success|warning|danger|info|purple|gray)$/i.test(s)) color = s.toLowerCase();
      else words.push(s);
    });
    return '<span class="xfm-label label-' + color + '">' + escapeHTML(words.join(' ')) + '</span>';
  }
  register('label', renderLabel);
  register('badge', renderLabel);

  // ---------------------------------------------------------------------------
  // 8. 图标 {% icon github, 20 %}
  // ---------------------------------------------------------------------------
  function renderIcon(args) {
    const list = String(args == null ? '' : Array.isArray(args) ? args.join(' ') : args)
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''));
    const name = list[0] || 'star';
    const size = list[1] ? Number(list[1]) : 0;
    const style = size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '';
    return (
      '<svg class="xfm-icon"' + style + ' aria-hidden="true"><use xlink:href="#xfm-i-' + escapeHTML(name) + '"></use></svg>'
    );
  }
  register('icon', renderIcon);
  register('fa', renderIcon);

  // ---------------------------------------------------------------------------
  // 9. Mermaid 流程图 {% mermaid %} graph LR; A-->B; {% endmermaid %}
  // ---------------------------------------------------------------------------
  register(
    'mermaid',
    function (args, content) {
      return '<div class="mermaid">' + String(content || '').trim() + '</div>';
    },
    { ends: true }
  );

  // ---------------------------------------------------------------------------
  // 10. 链接卡片 {% linkcard https://example.com, 名称, 简介, /images/avatar.svg %}
  // ---------------------------------------------------------------------------
  register('linkcard', function (args) {
    const list = String(args == null ? '' : Array.isArray(args) ? args.join(' ') : args)
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''));
    const url = list[0] || '#';
    const name = list[1] || '';
    const desc = list[2] || '';
    const avatar = list[3] || '';
    const hostMatch = url.match(/^https?:\/\/([^/]+)/i);
    const host = hostMatch ? hostMatch[1] : '';
    return (
      '<a class="xfm-link-card" href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer nofollow">' +
      '<span class="link-avatar">' +
      (avatar
        ? '<img src="' + escapeHTML(avatar) + '" alt="' + escapeHTML(name) + '" loading="lazy">'
        : '<svg class="xfm-icon" aria-hidden="true"><use xlink:href="#xfm-i-link"></use></svg>') +
      '</span>' +
      '<span class="link-main">' +
      '<span class="link-title">' + escapeHTML(name || host) + '</span>' +
      '<span class="link-desc">' + escapeHTML(desc) + '</span>' +
      '<span class="link-host">' + escapeHTML(host) + '</span>' +
      '</span>' +
      '<svg class="xfm-icon link-arrow" aria-hidden="true"><use xlink:href="#xfm-i-arrow-right"></use></svg>' +
      '</a>'
    );
  });
};

/* ---------------------------------------------------------------------------
 * 自执行入口
 * Hexo 的脚本加载器（v7/v8）在读取脚本后不会回调 module.exports，
 * 这里在脚本作用域内直接调用，兼容新老版本两套行为。
 * ------------------------------------------------------------------------- */
function __xfmBootstrap() {
  if (typeof hexo === "undefined" || !hexo || !hexo.extend) return;
  if (hexo.__XFM_TAGS) return;
  hexo.__XFM_TAGS = true;
  module.exports(hexo);
}
__xfmBootstrap();
