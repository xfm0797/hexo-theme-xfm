/* ==========================================================================
   XFM Theme · toc.js
   目录树高亮：滚动跟随 + 点击平滑定位 + 自动滚动到可见区
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.XFM || {};
  var containers = Array.prototype.slice.call(
    document.querySelectorAll('.toc-column-inner, .widget-toc-body')
  );

  if (!containers.length) return;

  // 收集所有目录容器中的 toc 主体
  var bodies = [];
  containers.forEach(function (c) {
    var nav = c.querySelector('.toc-body');
    if (nav) bodies.push(nav);
  });

  if (!bodies.length) return;

  var links = [];
  bodies.forEach(function (nav) {
    links = links.concat(Array.prototype.slice.call(nav.querySelectorAll('.toc-link')));
  });

  if (!links.length) return;

  // 建立 id -> links 映射
  var linkMap = {};
  links.forEach(function (link) {
    var id = link.getAttribute('data-toc-id') || link.getAttribute('href').slice(1);
    if (!id) return;
    if (!linkMap[id]) linkMap[id] = [];
    linkMap[id].push(link);
  });

  var ids = Object.keys(linkMap);

  function setActive(id) {
    ids.forEach(function (key) {
      var active = key === id;
      linkMap[key].forEach(function (link) {
        link.classList.toggle('is-active', active);
        if (active) scrollIntoView(link);
      });
    });
  }

  // 保证高亮项在目录容器内可见
  function scrollIntoView(link) {
    var panel = link.closest('.toc-column-inner, .widget-toc-body');
    if (!panel || panel.scrollHeight <= panel.clientHeight) return;
    var top = link.offsetTop - panel.offsetTop;
    var bottom = top + link.offsetHeight;
    if (top < panel.scrollTop || bottom > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = top - panel.clientHeight / 2.4;
    }
  }

  // --------------------------------------------------------------------
  // 采用「顶部基准线」判定：取最后一个位于基准线上方的标题
  // --------------------------------------------------------------------
  var navHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--xfm-nav-h'), 10
  ) || 64;

  var ticking = false;
  var currentId = '';

  function update() {
    ticking = false;
    var line = navHeight + 40;
    var active = '';

    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      var rect = el.getBoundingClientRect();
      if (rect.top <= line) active = ids[i];
      else break;
    }

    // 滚到底部时高亮最后一项
    var scrollBottom = window.pageYOffset + window.innerHeight;
    var docHeight = document.documentElement.scrollHeight;
    if (scrollBottom >= docHeight - 8) active = ids[ids.length - 1];

    if (!active) active = ids[0];
    if (active !== currentId) {
      currentId = active;
      setActive(active);
    }
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });

  window.addEventListener('resize', update);

  update();

  // 点击目录后立刻高亮，避免滚动动画期间闪烁
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      var id = link.getAttribute('data-toc-id') || link.getAttribute('href').slice(1);
      if (!id) return;
      currentId = id;
      setActive(id);
    });
  });

  /* ------------------------------------------------------------------ *
   * 带 hash 直接进入时，等待浏览器定位后同步高亮
   * ------------------------------------------------------------------ */
  if (window.location.hash) {
    var hashId = decodeURIComponent(window.location.hash.slice(1));
    if (linkMap[hashId]) {
      setTimeout(function () {
        currentId = hashId;
        setActive(hashId);
      }, 120);
    }
  }
})();
