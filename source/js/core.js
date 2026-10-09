/* ==========================================================================
   XFM Theme · core.js
   深浅色 / 抽屉 / 导航 / 进度 / 返回顶部 / 代码块 / 灯箱 / 评论 / 分享
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.XFM || {};
  var READ = CFG.reading || {};
  var FEAT = CFG.features || {};
  var I18N = CFG.i18n || {};

  var docEl = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------ *
   * Toast
   * ------------------------------------------------------------------ */
  var toastTimer = null;
  function toast(msg) {
    var el = $('#xfmToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 2200);
  }

  /* ------------------------------------------------------------------ *
   * 深浅色方案
   * ------------------------------------------------------------------ */
  var PREF_KEY = 'xfm-scheme';
  var SCHEME_ORDER = ['auto', 'light', 'dark'];
  var mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function resolveDark(pref) {
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    return !!(mediaQuery && mediaQuery.matches);
  }

  function applyScheme(pref, announce) {
    docEl.setAttribute('data-scheme-pref', pref);
    docEl.setAttribute('data-scheme', resolveDark(pref) ? 'dark' : 'light');
    try { localStorage.setItem(PREF_KEY, pref); } catch (e) {}
    if (announce) {
      document.dispatchEvent(new CustomEvent('xfm:schemechange', { detail: { scheme: pref } }));
    }
  }

  function currentPref() {
    var attr = docEl.getAttribute('data-scheme-pref');
    if (attr) return attr;
    try {
      var saved = localStorage.getItem(PREF_KEY);
      if (saved) return saved;
    } catch (e) {}
    return CFG.scheme || 'auto';
  }

  // 系统主题变化时跟随（仅 auto 生效）
  if (mediaQuery) {
    var onSystemChange = function () {
      if (currentPref() === 'auto') applyScheme('auto', true);
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onSystemChange);
    else if (mediaQuery.addListener) mediaQuery.addListener(onSystemChange);
  }

  $$('[data-toggle="scheme"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var now = currentPref();
      var next = SCHEME_ORDER[(SCHEME_ORDER.indexOf(now) + 1) % SCHEME_ORDER.length];
      applyScheme(next, true);
    });
  });

  /* ------------------------------------------------------------------ *
   * 抽屉导航
   * ------------------------------------------------------------------ */
  function setDrawer(open) {
    var drawer = $('#drawer');
    var mask = $('.drawer-mask');
    if (drawer) drawer.classList.toggle('is-open', open);
    if (mask) mask.classList.toggle('is-open', open);
    document.body.classList.toggle('xfm-lock', open);
  }

  $$('[data-toggle="drawer"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var drawer = $('#drawer');
      setDrawer(!(drawer && drawer.classList.contains('is-open')));
    });
  });

  /* ------------------------------------------------------------------ *
   * 侧栏抽屉（笔记 / 文档模式，窄屏由悬浮按钮唤起）
   * ------------------------------------------------------------------ */
  function sideNavEl() {
    return $('#docsNav') || $('#notesNav');
  }

  function setSideNav(open) {
    var nav = sideNavEl();
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('sidenav-open', open);
    var fab = $('.nav-fab');
    if (fab) fab.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  $$('[data-toggle="sidenav"]').forEach(function (el) {
    el.addEventListener('click', function () {
      var nav = sideNavEl();
      setSideNav(!(nav && nav.classList.contains('is-open')));
    });
  });

  // 点击侧栏内链接后自动收起，避免遮住正文
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('sidenav-open')) return;
    if (e.target.closest && e.target.closest('.sidenav-mask')) return; // 由上面的 click 统一处理
    var link = e.target.closest ? e.target.closest('.site-nav a') : null;
    if (link) setSideNav(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setSideNav(false);
  });

  // 视口放大回桌面宽度时复位，防止抽屉状态残留
  // 阈值取自 _config.yml 的 responsive.breakpoints.sm，由模板写入 <html data-bp-sm>
  if (typeof window.matchMedia === 'function') {
    var smNum = parseInt(document.documentElement.getAttribute('data-bp-sm'), 10);
    var sideNavBp = (isFinite(smNum) && smNum > 0 ? smNum : 768) + 1;
    var wideMQ = window.matchMedia('(min-width: ' + sideNavBp + 'px)');
    var onWide = function (e) {
      if (e.matches) setSideNav(false);
    };
    if (wideMQ.addEventListener) wideMQ.addEventListener('change', onWide);
    else if (wideMQ.addListener) wideMQ.addListener(onWide);
  }

  /* ------------------------------------------------------------------ *
   * 窄屏目录折叠面板
   * ------------------------------------------------------------------ */
  (function () {
    var tocColumn = $('#tocColumn');
    if (!tocColumn) return;
    var header = tocColumn.querySelector('.toc-header');
    if (!header) return;
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.addEventListener('click', function () {
      var expanded = tocColumn.classList.toggle('is-expanded');
      header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    header.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });
    // 点击目录项后收起，直接跳到正文锚点
    tocColumn.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.toc-link')) {
        tocColumn.classList.remove('is-expanded');
        header.setAttribute('aria-expanded', 'false');
      }
    });
  })();

  /* ------------------------------------------------------------------ *
   * 搜索面板
   * ------------------------------------------------------------------ */
  window.__xfmSearch = {
    open: function () {
      var modal = $('#searchModal');
      if (!modal) return;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('xfm-lock');
      var input = $('#searchInput');
      if (input) setTimeout(function () { input.focus(); input.select(); }, 80);
      if (window.__xfmSearchLoad) window.__xfmSearchLoad();
    },
    close: function () {
      var modal = $('#searchModal');
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('xfm-lock');
    },
    toggle: function () {
      var modal = $('#searchModal');
      if (!modal) return;
      if (modal.classList.contains('is-open')) window.__xfmSearch.close();
      else window.__xfmSearch.open();
    }
  };

  $$('[data-toggle="search"]').forEach(function (el) {
    el.addEventListener('click', function () { window.__xfmSearch.open(); });
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      window.__xfmSearch.toggle();
      return;
    }
    if (e.key === 'Escape') {
      setDrawer(false);
      if (window.__xfmSearch) window.__xfmSearch.close();
      closeLightbox();
    }
  });

  /* ------------------------------------------------------------------ *
   * 滚动：进度条 / 导航隐藏 / 返回顶部
   * ------------------------------------------------------------------ */
  var header = $('#siteHeader');
  var progressBar = $('.reading-progress i');
  var backTop = $('[data-back-to-top]');
  var lastScroll = window.pageYOffset || 0;
  var ticking = false;

  function onScroll() {
    var top = window.pageYOffset || docEl.scrollTop || 0;
    var max = docEl.scrollHeight - window.innerHeight;

    if (progressBar) {
      var pct = max > 0 ? Math.min(100, (top / max) * 100) : 0;
      progressBar.style.width = pct.toFixed(2) + '%';
    }

    if (header) {
      header.classList.toggle('is-pinned', top > 8);
      if (READ.autoHideNav && READ.stickyNav) {
        var down = top > lastScroll;
        if (down && top > 220) header.classList.add('is-hidden');
        else header.classList.remove('is-hidden');
      }
    }

    if (backTop) backTop.classList.toggle('is-visible', top > 320);

    lastScroll = top;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  onScroll();

  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: READ.smooth ? 'smooth' : 'auto' });
    });
  }

  /* ------------------------------------------------------------------ *
   * 平滑滚动（锚点）
   * ------------------------------------------------------------------ */
  if (READ.smooth) {
    $$('a[href^="#"]:not([href="#"])').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        var offset = parseInt(getComputedStyle(docEl).getPropertyValue('--xfm-nav-h'), 10) || 64;
        var y = target.getBoundingClientRect().top + window.pageYOffset - offset - 16;
        window.scrollTo({ top: y, behavior: 'smooth' });
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 代码块：复制 / 折叠
   * ------------------------------------------------------------------ */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (err) {
        document.body.removeChild(ta);
        reject(err);
      }
    });
  }

  function markCopied(btn) {
    if (!btn) return;
    btn.classList.add('is-done');
    var label = btn.querySelector('.code-tool-label');
    if (label) {
      var origin = label.textContent;
      label.textContent = I18N.copied || '已复制';
      setTimeout(function () {
        btn.classList.remove('is-done');
        label.textContent = origin;
      }, 1800);
    } else {
      setTimeout(function () { btn.classList.remove('is-done'); }, 1800);
    }
  }

  function codeText(figure) {
    var pre = figure.querySelector('pre');
    if (!pre) return '';
    return pre.innerText.replace(/\n$/, '');
  }

  $$('[data-xfm-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var figure = btn.closest('figure.highlight, .code-block');
      if (!figure) return;
      copyText(codeText(figure)).then(function () {
        markCopied(btn);
        toast(I18N.copied || '已复制');
      }).catch(function () {
        toast(I18N.copyFailed || '复制失败');
      });
    });
  });

  function expandCode(figure) {
    if (!figure) return;
    figure.removeAttribute('data-folded');
    figure.classList.remove('is-folded');
    var mask = figure.querySelector('.code-fold-mask');
    if (mask) mask.remove();
    var expandBtn = figure.querySelector('[data-xfm-expand]');
    if (expandBtn) {
      expandBtn.setAttribute('hidden', '');
      expandBtn.style.display = 'none';
    }
  }

  $$('[data-xfm-expand]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      expandCode(btn.closest('figure.highlight, .code-block'));
    });
  });

  $$('.code-fold-mask span').forEach(function (span) {
    span.addEventListener('click', function () {
      expandCode(span.closest('figure.highlight, .code-block'));
    });
  });

  /* ------------------------------------------------------------------ *
   * 图片灯箱
   * ------------------------------------------------------------------ */
  var lightbox = $('#lightbox');
  var lightboxImg = lightbox ? lightbox.querySelector('.lightbox-img') : null;
  var lightboxCap = lightbox ? lightbox.querySelector('.lightbox-caption') : null;

  function openLightbox(img) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || '';
    if (lightboxCap) lightboxCap.textContent = img.alt || img.getAttribute('title') || '';
    lightbox.classList.add('is-open');
    document.body.classList.add('xfm-lock');
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('xfm-lock');
  }

  if (FEAT.lightbox) {
    document.addEventListener('click', function (e) {
      var img = e.target.closest ? e.target.closest('img[data-zoomable="true"]') : null;
      if (img) {
        e.preventDefault();
        openLightbox(img);
      }
    });
    if (lightbox) {
      lightbox.addEventListener('click', function () { closeLightbox(); });
      if (lightboxImg) {
        lightboxImg.addEventListener('click', function (e) { e.stopPropagation(); });
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 打赏面板
   * ------------------------------------------------------------------ */
  $$('[data-reward-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = btn.closest('.post-reward');
      var panels = wrap ? wrap.querySelector('.reward-panels') : null;
      if (panels) panels.classList.toggle('is-open');
    });
  });

  /* ------------------------------------------------------------------ *
   * 分享
   * ------------------------------------------------------------------ */
  $$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var type = btn.getAttribute('data-share');
      var wrap = btn.closest('.post-share');
      var url = (wrap && wrap.getAttribute('data-page-url')) || window.location.href;
      if (type === 'copy') {
        e.preventDefault();
        copyText(url).then(function () {
          btn.classList.add('is-done');
          toast(I18N.linkCopied || '链接已复制');
          setTimeout(function () { btn.classList.remove('is-done'); }, 1800);
        }).catch(function () { toast(I18N.copyFailed || '复制失败'); });
      } else if (type === 'qrcode') {
        e.preventDefault();
        window.open('https://api.qrserver.com/v1/create-qrcode/?size=240x240&data=' + encodeURIComponent(url), '_blank', 'noopener');
      }
    });
  });

  /* ------------------------------------------------------------------ *
   * 侧栏分组折叠
   * ------------------------------------------------------------------ */
  $$('.xfm-nav-group-head').forEach(function (head) {
    head.addEventListener('click', function (e) {
      e.preventDefault();
      var group = head.closest('.xfm-nav-group');
      if (group) group.classList.toggle('is-collapsed');
    });
  });

  /* ------------------------------------------------------------------ *
   * 页脚运行时长
   * ------------------------------------------------------------------ */
  $$('[data-runtime]').forEach(function (el) {
    var start = new Date(el.getAttribute('data-runtime') + 'T00:00:00');
    var output = el.querySelector('.runtime-text');
    if (isNaN(start.getTime()) || !output) return;
    function tick() {
      var diff = Date.now() - start.getTime();
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      var secs = Math.floor((diff % 60000) / 1000);
      output.textContent = days + ' 天 ' + hours + ' 时 ' + mins + ' 分 ' + secs + ' 秒';
    }
    tick();
    setInterval(tick, 1000);
  });

  /* ------------------------------------------------------------------ *
   * 评论系统
   * ------------------------------------------------------------------ */
  function loadScript(src, attrs) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function injectCSS(href, id) {
    if (id && document.getElementById(id)) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) link.id = id;
    document.head.appendChild(link);
  }

  function hostTheme(mode) {
    var dark = docEl.getAttribute('data-scheme') === 'dark';
    if (typeof mode === 'string' && /dark/i.test(mode)) return mode;
    if (typeof mode === 'string' && mode !== 'auto') return mode;
    return dark ? 'dark' : 'light';
  }

  var commentRenderers = {
    giscus: function (box, opts) {
      var script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      var map = {
        repo: 'data-repo', repo_id: 'data-repo-id', category: 'data-category',
        category_id: 'data-category-id', mapping: 'data-mapping', strict: 'data-strict',
        reactions_enabled: 'data-reactions-enabled', emit_metadata: 'data-emit-metadata',
        input_position: 'data-input-position', theme: 'data-theme', lang: 'data-lang',
        loading: 'data-loading'
      };
      Object.keys(map).forEach(function (k) {
        if (opts[k] === undefined || opts[k] === '') return;
        script.setAttribute(map[k], String(opts[k]));
      });
      if (!script.getAttribute('data-theme')) {
        script.setAttribute('data-theme', docEl.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light');
      }
      box.appendChild(script);
      return true;
    },

    utterances: function (box, opts) {
      var script = document.createElement('script');
      script.src = 'https://utteranc.es/client.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-issue-term', opts.issue_term || 'pathname');
      script.setAttribute('data-label', opts.label || 'comment');
      if (opts.repo) script.setAttribute('data-repo', opts.repo);
      script.setAttribute('data-theme', docEl.getAttribute('data-scheme') === 'dark'
        ? (opts.dark_theme || 'github-dark')
        : (opts.theme || 'github-light'));
      box.appendChild(script);
      return true;
    },

    waline: function (box, opts) {
      injectCSS('https://cdn.jsdelivr.net/npm/@waline/client@v2/dist/waline.css', 'xfm-waline-css');
      loadScript('https://cdn.jsdelivr.net/npm/@waline/client@v2/dist/waline.js').then(function () {
        if (!window.Waline) return;
        var el = document.createElement('div');
        box.appendChild(el);
        window.Waline.init(Object.assign({ el: el, dark: 'auto' }, opts));
      });
      return true;
    },

    twikoo: function (box, opts) {
      loadScript('https://cdn.jsdelivr.net/npm/twikoo@1.6.16/dist/twikoo.all.min.js').then(function () {
        if (!window.twikoo) return;
        window.twikoo.init(Object.assign({ el: box, lang: opts.lang || 'zh-CN' }, opts));
      });
      return true;
    },

    disqus: function (box, opts) {
      var shortname = opts.shortname;
      if (!shortname) return false;
      window.disqus_config = function () {
        this.page.url = window.location.href;
        this.page.identifier = window.location.pathname;
      };
      loadScript('https://' + shortname + '.disqus.com/embed.js');
      return true;
    },

    disqusjs: function (box, opts) {
      injectCSS('https://cdn.jsdelivr.net/npm/disqusjs@3/dist/disqusjs.css', 'xfm-disqusjs-css');
      loadScript('https://cdn.jsdelivr.net/npm/disqusjs@3/dist/browser/disqusjs.umd.min.js').then(function () {
        if (!window.DisqusJS) return;
        var djs = new window.DisqusJS({
          shortname: opts.shortname,
          apikey: opts.apikey,
          api: opts.api || 'https://disqus.skk.moe/disqus/'
        });
        box.appendChild(djs.render());
      });
      return true;
    },

    valine: function (box, opts) {
      loadScript('https://cdn.jsdelivr.net/npm/valine@1.5.1/dist/Valine.min.js').then(function () {
        if (!window.Valine) return;
        new window.Valine(Object.assign({ el: '#' + box.id, path: window.location.pathname }, opts));
      });
      return true;
    },

    changyan: function (box, opts) {
      if (!opts.appid || !opts.conf) return false;
      window.changyan = window.changyan || {};
      window.changyan.api = window.changyan.api || {};
      window.changyan.api.config = { appid: opts.appid, conf: opts.conf };
      loadScript('https://changyan.sohu.com/upload/changyan.js');
      var el = document.createElement('div');
      el.id = 'SOHUCS';
      box.appendChild(el);
      return true;
    }
  };

  function renderComments() {
    var box = $('#xfm-comments');
    if (!box || box.dataset.loaded === 'true') return;
    var conf = {};
    try { conf = JSON.parse(box.getAttribute('data-comment-config') || '{}'); } catch (e) { return; }
    var renderer = commentRenderers[conf.type];
    if (!renderer) return;
    box.innerHTML = '';
    box.dataset.loaded = 'true';
    var ok = renderer(box, conf.opts || {});
    if (!ok) {
      box.innerHTML = '<div class="comment-placeholder"><span>' +
        (I18N.searchError || '配置不完整，请检查评论区配置') + '</span></div>';
    }
  }

  var commentBox = $('#xfm-comments');
  if (commentBox) {
    var lazy = commentBox.getAttribute('data-comment-config');
    try {
      var parsed = JSON.parse(lazy || '{}');
      if (parsed.lazyload) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              renderComments();
              io.disconnect();
            }
          });
        }, { rootMargin: '260px' });
        io.observe(commentBox);
      } else {
        renderComments();
      }
    } catch (e) {
      /* 配置异常则忽略 */
    }
  }

  // 深浅色切换时同步部分评论主题
  document.addEventListener('xfm:schemechange', function () {
    var iframe = $('.giscus-frame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme: docEl.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light' } } },
        'https://giscus.app'
      );
    }
  });

  /* ------------------------------------------------------------------ *
   * 图片加载兜底
   * ------------------------------------------------------------------ */
  document.addEventListener(
    'error',
    function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'IMG') return;
      if (el.dataset.xfmFallback) return;
      el.dataset.xfmFallback = '1';
      el.style.opacity = '0.35';
    },
    true
  );

  /* ------------------------------------------------------------------ *
   * 入场动画：延迟 registration，避免阻塞首屏
   * ------------------------------------------------------------------ */
  if (READ.animation && 'IntersectionObserver' in window) {
    var animated = $$('.post-card, .widget, .hero-panel');
    if (animated.length) {
      var step = 0;
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.style.animationDelay = Math.min(step, 6) * 45 + 'ms';
          el.classList.add('animate-in');
          step += 1;
          observer.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      animated.forEach(function (el) { observer.observe(el); });
    }
  }
})();
