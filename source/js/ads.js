/* ==========================================================================
   XFM Theme · ads.js
   Google AdSense 广告位填充
   --------------------------------------------------------------------------
   页面里的 <ins class="adsbygoogle"> 由模板输出，这里只负责在合适的时机
   调用 adsbygoogle.push({})：
     · lazy: true  —— 广告位进入视口附近（rootMargin 250px）才 push，首屏更快
     · lazy: false —— DOM 就绪即全部 push
   每个单元只 push 一次（打 data-xfm-ad-pushed 标记），重复 push 会被 AdSense 丢弃。
   ========================================================================== */
(function () {
  'use strict';

  var CFG = (window.XFM && window.XFM.ads) || {};
  if (!CFG.enable) return;

  function pushUnit(el) {
    if (!el || el.getAttribute('data-xfm-ad-pushed')) return;
    el.setAttribute('data-xfm-ad-pushed', '1');
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      el.removeAttribute('data-xfm-ad-pushed');
    }
  }

  function init() {
    var units = Array.prototype.slice.call(document.querySelectorAll('.adsbygoogle'));
    if (!units.length) return;

    if (!CFG.lazy || !('IntersectionObserver' in window)) {
      units.forEach(pushUnit);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        pushUnit(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '250px 0px' });

    units.forEach(function (unit) { io.observe(unit); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
