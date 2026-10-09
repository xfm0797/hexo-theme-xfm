/* ==========================================================================
   XFM Theme · adaptive.js
   自适应档位运行时：读取 / 手动切换 / 监听档位变化

   首次判定由 <head> 中的 boot 脚本同步完成（渲染前定档，无闪烁），
   本文件负责后续的 API、事件派发与手动档位记忆。
   ========================================================================== */
(function () {
  'use strict';

  var R = document.documentElement;
  var CFG = (window.XFM && window.XFM.adaptive) || {};
  var KEY = 'xfm-tier';
  var TIERS = ['mobile', 'tablet', 'desktop'];

  function tier() {
    var t = R.getAttribute('data-tier');
    return TIERS.indexOf(t) > -1 ? t : (CFG.default_tier || 'desktop');
  }

  function emit(next, prev) {
    if (typeof CustomEvent !== 'function') return;
    try {
      document.dispatchEvent(new CustomEvent('xfm:tierchange', { detail: { tier: next, prev: prev } }));
    } catch (e) {}
  }

  /** 手动切档（默认记住，刷新后仍生效） */
  function setTier(next) {
    if (TIERS.indexOf(next) === -1) return tier();
    var prev = tier();
    try {
      if (CFG.remember !== false) localStorage.setItem(KEY, next);
    } catch (e) {}
    if (typeof window.__xfmApplyTier === 'function') {
      window.__xfmApplyTier();
    } else {
      R.setAttribute('data-tier', next);
    }
    if (tier() !== prev) emit(tier(), prev);
    return tier();
  }

  /** 清除手动档位，回到自动探测 */
  function clearTier() {
    var prev = tier();
    try { localStorage.removeItem(KEY); } catch (e) {}
    if (typeof window.__xfmApplyTier === 'function') window.__xfmApplyTier();
    if (tier() !== prev) emit(tier(), prev);
    return tier();
  }

  /** 当前档位的形态变体（布局 / 导航 / 侧栏 / 目录） */
  function variant(name) {
    var t = tier();
    var v = (CFG.tiers && CFG.tiers[t]) || {};
    return name ? v[name] : v;
  }

  function snapshot() {
    return {
      tier: tier(),
      input: R.getAttribute('data-input') || 'pointer',
      dpr: Number(R.getAttribute('data-dpr') || window.devicePixelRatio || 1),
      orientation: R.getAttribute('data-orientation') || 'portrait',
      width: window.innerWidth || R.clientWidth || 0,
      variant: variant()
    };
  }

  window.XFM = window.XFM || {};
  window.XFM.adaptive = {
    config: CFG,
    tier: tier,
    setTier: setTier,
    clearTier: clearTier,
    variant: variant,
    snapshot: snapshot,
    is: function (name) { return tier() === name; },
    isTouch: function () { return R.getAttribute('data-input') === 'touch'; },
    onTierChange: function (cb) {
      document.addEventListener('xfm:tierchange', function (e) {
        cb((e.detail && e.detail.tier) || tier(), (e.detail && e.detail.prev) || null);
      });
    }
  };

  // 若 boot 未执行（脚本被拦截等极端情况），这里兜底定一次档
  if (!R.getAttribute('data-tier')) {
    if (typeof window.__xfmApplyTier === 'function') window.__xfmApplyTier();
    else R.setAttribute('data-tier', CFG.default_tier || 'desktop');
  }
})();
