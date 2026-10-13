/* ==========================================================================
   XFM Theme · i18n.js
   界面文案的语言切换（导航栏「翻译」图标）
   --------------------------------------------------------------------------
   构建期把各语言的全量扁平字典内联到 <head>（window.__XFM_LANG__），
   切换时在「界面作用域」内做 当前文案 → 目标文案 的反查替换：
     · 精确值直接查表
     · 带占位符的模板（`共 %s 篇笔记` / `找到 {count} 条结果`）编译成正则，捕获值回填
   正文（.xfm-content）不在替换范围内 —— 那是写作语言，不是界面语言。
   ========================================================================== */
(function () {
  'use strict';

  var BOOT = window.__XFM_LANG__;
  if (!BOOT || !BOOT.tables) return;

  var CFG = (window.XFM && window.XFM.langSwitcher) || {};
  var KEY = 'xfm-lang';

  /* 界面作用域：只有这些容器内的文案参与替换 */
  var SCOPES = [
    '.site-header', '.drawer', '.site-nav', '.search-modal', '.site-footer',
    '.pagination', '.toc-column', '.widget-column', '.hero-panel', '.page-head',
    '.post-view-meta', '.post-tags-block', '.post-related', '.post-share',
    '.post-copyright', '.post-nav', '.doc-page-foot', '.comments-area',
    '.empty-state', '.nav-fab', '.back-to-top', '.floating-btn'
  ];
  /* 参与替换的属性（界面文案常出现在这些属性里） */
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
  var ATTR_SEL = ATTRS.map(function (a) { return '[' + a + ']'; }).join(',');

  /* JS 侧文案（core.js / search.js 使用）↔ 语言包键 */
  var JS_KEYS = {
    copy: 'common.copy',
    copied: 'common.copied',
    copyFailed: 'common.copy_failed',
    linkCopied: 'common.link_copied',
    searching: 'search.searching',
    noResult: 'search.no_result',
    noInput: 'search.no_input',
    resultCount: 'search.result_count',
    searchError: 'search.error',
    inTitle: 'search.in_title',
    inContent: 'search.in_content',
    inTag: 'search.in_tag',
    docsNav: 'docs.sidebar',
    notesNav: 'notes.sidebar'
  };

  var PLACEHOLDER_SPLIT = /(%[sd]|\{[a-zA-Z0-9_]+\})/g;
  var HAS_PLACEHOLDER = /%[sd]|\{[a-zA-Z0-9_]+\}/;
  var converters = {};
  var toastTimer = null;

  function escapeRe(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** 带占位符的模板 → 捕获组正则（捕获值按顺序回填到目标模板） */
  function compileRule(src, dst) {
    var pattern = String(src)
      .split(PLACEHOLDER_SPLIT)
      .map(function (part) {
        return HAS_PLACEHOLDER.test(part) && part.length <= 20 && /^(%[sd]|\{[a-zA-Z0-9_]+\})$/.test(part)
          ? '([\\s\\S]+?)'
          : escapeRe(part);
      })
      .join('');
    return { re: new RegExp('^' + pattern + '$'), dst: String(dst) };
  }

  function fill(tpl, groups) {
    var i = 0;
    return String(tpl).replace(PLACEHOLDER_SPLIT, function (m) {
      return i < groups.length ? groups[i++] : m;
    });
  }

  /** 生成 from → to 的转换器（结果缓存，来回切换都能用） */
  function converter(from, to) {
    var id = from + '>' + to;
    if (converters[id]) return converters[id];
    var table = BOOT.tables[from] || {};
    var target = BOOT.tables[to] || {};
    var map = {};
    var rules = [];
    Object.keys(table).forEach(function (key) {
      var src = table[key];
      var dst = target[key];
      if (!src || !dst || src === dst) return;
      if (HAS_PLACEHOLDER.test(src)) rules.push(compileRule(src, dst));
      else map[src] = dst;
    });
    var api = {
      convert: function (text) {
        if (!text) return text;
        if (Object.prototype.hasOwnProperty.call(map, text)) return map[text];
        for (var i = 0; i < rules.length; i++) {
          var m = text.match(rules[i].re);
          if (m) return fill(rules[i].dst, m.slice(1));
        }
        return text;
      }
    };
    converters[id] = api;
    return api;
  }

  function eachAttrEl(root) {
    var els = [];
    if (root.nodeType === 1 && root.matches && root.matches(ATTR_SEL)) els.push(root);
    Array.prototype.forEach.call(root.querySelectorAll(ATTR_SEL), function (el) { els.push(el); });
    return els;
  }

  function translateTree(root, conv) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(function (node) {
      if (node.__xfmI18n) return;
      var parent = node.parentNode;
      if (!parent) return;
      var tag = parent.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
      var raw = node.nodeValue;
      var trimmed = raw.trim();
      if (!trimmed) return;
      node.__xfmI18n = 1;
      var out = conv.convert(trimmed);
      if (out !== trimmed) node.nodeValue = raw.replace(trimmed, out);
    });

    eachAttrEl(root).forEach(function (el) {
      if (el.__xfmI18nAttr) return;
      el.__xfmI18nAttr = 1;
      ATTRS.forEach(function (attr) {
        var value = el.getAttribute(attr);
        if (!value) return;
        var text = value.trim();
        var out = conv.convert(text);
        if (out !== text) el.setAttribute(attr, value.replace(text, out));
      });
    });
  }

  function translateScopes(conv) {
    SCOPES.forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
        translateTree(el, conv);
      });
    });
  }

  function currentLang() {
    return document.documentElement.getAttribute('data-lang') || BOOT.current;
  }

  function langItem(code) {
    var hit = (BOOT.languages || []).filter(function (l) { return l.code === code; })[0];
    return hit || { code: code, name: code, short: code };
  }

  function syncJsStrings(code) {
    var table = BOOT.tables[code] || {};
    var i18n = (window.XFM && window.XFM.i18n) || {};
    Object.keys(JS_KEYS).forEach(function (k) {
      var value = table[JS_KEYS[k]];
      if (value !== undefined && value !== '') i18n[k] = value;
    });
    window.XFM = window.XFM || {};
    window.XFM.i18n = i18n;
  }

  function updateUI(code) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang-current]'), function (el) {
      el.textContent = langItem(code).short;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (btn) {
      var on = btn.getAttribute('data-lang') === code;
      btn.classList.toggle('is-active', on);
      if (btn.hasAttribute('aria-checked')) btn.setAttribute('aria-checked', on ? 'true' : 'false');
      if (btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function toast(msg) {
    var el = document.getElementById('xfmToast');
    if (!el || !msg) return;
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 2200);
  }

  function closeMenus() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang-menu].is-open'), function (menu) {
      menu.classList.remove('is-open');
      var wrap = menu.closest('[data-lang-switch]');
      var btn = wrap && wrap.querySelector('.lang-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function setLang(code, silent) {
    if (!BOOT.tables[code]) return false;
    var from = currentLang();
    if (from !== code) {
      translateScopes(converter(from, code));
      document.documentElement.setAttribute('data-lang', code);
      if (CFG.updateHtmlLang !== false) document.documentElement.setAttribute('lang', code);
    }
    syncJsStrings(code);
    updateUI(code);
    if (CFG.remember !== false) {
      try { localStorage.setItem(KEY, code); } catch (e) {}
    }
    if (!silent) {
      var table = BOOT.tables[code] || {};
      toast(fill(table['lang.switched'] || 'Switched to %s', [langItem(code).name]));
    }
    try {
      document.dispatchEvent(new CustomEvent('xfm:langchange', { detail: { lang: code, prev: from } }));
    } catch (e) {}
    return true;
  }

  function otherLang() {
    var langs = BOOT.languages || [];
    if (!langs.length) return null;
    var now = currentLang();
    var idx = -1;
    langs.forEach(function (l, i) { if (l.code === now) idx = i; });
    // toggle 形态：按清单顺序轮换；auto / 两语言：切到另一个
    if (CFG.style === 'toggle') return langs[(idx + 1) % langs.length].code;
    var next = langs.filter(function (l) { return l.code !== now; })[0];
    return next ? next.code : null;
  }

  /* ---- 事件 ---- */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;

    var langBtn = target.closest('[data-lang]');
    if (langBtn) {
      e.preventDefault();
      var code = langBtn.getAttribute('data-lang');
      closeMenus();
      if (code === currentLang()) return;
      setLang(code);
      return;
    }

    var trigger = target.closest('.lang-btn');
    if (trigger) {
      e.preventDefault();
      var wrap = trigger.closest('[data-lang-switch]');
      var menu = wrap ? wrap.querySelector('[data-lang-menu]') : null;
      if (menu) {
        var open = menu.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      } else {
        var next = otherLang();
        if (next) setLang(next);
      }
      return;
    }

    closeMenus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenus();
  });

  /* ---- 初始化：按记住的语言替换首屏 ---- */
  function init() {
    var code = currentLang();
    if (code !== BOOT.current) translateScopes(converter(BOOT.current, code));
    syncJsStrings(code);
    updateUI(code);
    document.documentElement.removeAttribute('data-lang-pending');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.XFM = window.XFM || {};
  window.XFM.lang = {
    languages: BOOT.languages,
    current: currentLang,
    set: setLang,
    toggle: function () { var n = otherLang(); return n ? setLang(n) : false; },
    /** 供其他脚本按当前语言取文案 */
    t: function (key, arg) {
      var table = BOOT.tables[currentLang()] || {};
      var value = table[key];
      if (value === undefined || value === '') return key;
      return arg === undefined ? value : fill(value, [arg]);
    }
  };
})();
