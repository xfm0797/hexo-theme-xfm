/* ==========================================================================
   XFM Theme · nav.js
   多级导航菜单：悬停 / 点击展开、键盘操作、贴边翻转、抽屉折叠分组
   --------------------------------------------------------------------------
   展开状态只有一个来源：.nav-item.is-open（以及抽屉里的 .drawer-group.is-open）。
   CSS 不写 :hover，避免「鼠标还在项上、状态类已经移除」时关不掉菜单。
   ========================================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var menu = document.getElementById('navMenu');
  var canHover = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------ *
   * 桌面多级菜单
   * ------------------------------------------------------------------ */
  if (menu) {
    var trigger = menu.getAttribute('data-nav-trigger') === 'click' ? 'click' : 'hover';
    var closeDelay = parseInt(menu.getAttribute('data-nav-delay'), 10);
    if (!isFinite(closeDelay) || closeDelay < 0) closeDelay = 120;

    var timerKey = '__xfmNavTimer';

    function direct(sel, item) {
      var nodes = item.children;
      for (var i = 0; i < nodes.length; i += 1) {
        if (nodes[i].matches && nodes[i].matches(sel)) return nodes[i];
      }
      return null;
    }

    function submenuOf(item) {
      return direct('.nav-submenu', item);
    }

    function toggleOf(item) {
      return direct('.nav-caret', item) || direct('.nav-parent', item);
    }

    function setAria(item, open) {
      var nodes = item.querySelectorAll(':scope > .nav-caret, :scope > .nav-parent');
      Array.prototype.forEach.call(nodes, function (el) {
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    /* 贴边处理：二级下拉默认居中，靠近视口右侧时改成右对齐；
       三级及以下默认向右飞出，放不下时翻到父项左侧。 */
    function place(item) {
      var sub = submenuOf(item);
      if (!sub) return;
      sub.classList.remove('is-flip', 'is-align-start', 'is-align-end');
      var nested = item.parentNode && item.parentNode.classList &&
        item.parentNode.classList.contains('nav-submenu');
      var pad = 12;
      var width = docEl.clientWidth;
      var rect = sub.getBoundingClientRect();
      if (nested) {
        if (rect.right > width - pad) sub.classList.add('is-flip');
        return;
      }
      if (rect.right > width - pad) sub.classList.add('is-align-end');
      else if (rect.left < pad) sub.classList.add('is-align-start');
    }

    function clearTimer(item) {
      if (item[timerKey]) {
        clearTimeout(item[timerKey]);
        item[timerKey] = null;
      }
    }

    function closeTree(item) {
      clearTimer(item);
      if (item.classList.contains('is-open')) {
        item.classList.remove('is-open');
        setAria(item, false);
      }
      $$('.nav-item.is-open', item).forEach(function (child) {
        child.classList.remove('is-open');
        setAria(child, false);
      });
    }

    function open(item) {
      clearTimer(item);
      var siblings = item.parentNode ? item.parentNode.children : [];
      for (var i = 0; i < siblings.length; i += 1) {
        var sib = siblings[i];
        if (sib !== item && sib.classList && sib.classList.contains('has-children')) closeTree(sib);
      }
      item.classList.add('is-open');
      setAria(item, true);
      place(item);
    }

    function scheduleClose(item) {
      clearTimer(item);
      item[timerKey] = setTimeout(function () {
        item[timerKey] = null;
        closeTree(item);
      }, closeDelay);
    }

    function closeAll() {
      $$('.nav-item.is-open', menu).forEach(function (item) {
        item.classList.remove('is-open');
        setAria(item, false);
      });
    }

    function firstLink(item) {
      return item.querySelector(':scope > .nav-submenu .nav-sub-link, :scope > .nav-submenu .nav-link');
    }

    /* 同一层级里的可聚焦项（用于上下方向键） */
    function siblingsOf(item) {
      var list = [];
      var nodes = item.parentNode ? item.parentNode.children : [];
      for (var i = 0; i < nodes.length; i += 1) {
        var li = nodes[i];
        if (!li.classList || !li.classList.contains('nav-item')) continue;
        var el = direct('.nav-sub-link, .nav-link', li);
        if (el) list.push({ item: li, el: el });
      }
      return list;
    }

    function moveFocus(current, step) {
      var item = current.closest('.nav-item');
      var list = siblingsOf(item);
      var index = -1;
      list.forEach(function (entry, i) { if (entry.item === item) index = i; });
      if (index === -1) return;
      var next = list[(index + step + list.length) % list.length];
      if (next) next.el.focus();
    }

    /* --- 悬停：只在真正有指针的设备上生效，触屏靠点击 --- */
    $$('.nav-item.has-children', menu).forEach(function (item) {
      item.addEventListener('pointerenter', function (e) {
        if (trigger !== 'hover') return;
        if (e.pointerType === 'touch') return;
        if (canHover && !canHover.matches) return;
        open(item);
      });
      item.addEventListener('pointerleave', function (e) {
        if (trigger !== 'hover') return;
        if (e.pointerType === 'touch') return;
        if (canHover && !canHover.matches) return;
        scheduleClose(item);
      });
    });

    /* --- 点击：箭头按钮负责展开，链接照常跳转 --- */
    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!target || !target.closest) return;

      var toggle = target.closest('.nav-caret, .nav-parent');
      if (toggle && menu.contains(toggle)) {
        e.preventDefault();
        var item = toggle.closest('.nav-item');
        if (!item) return;
        if (item.classList.contains('is-open')) closeTree(item);
        else open(item);
        return;
      }

      if (menu.contains(target)) {
        // 点到菜单里的链接 / 子链接：收起所有下拉后正常跳转
        if (target.closest('.nav-sub-link, .nav-link')) closeAll();
        return;
      }

      closeAll();
    });

    /* --- 键盘 --- */
    menu.addEventListener('keydown', function (e) {
      var target = e.target;
      if (!target || !target.closest) return;
      var item = target.closest('.nav-item');
      if (!item) return;
      var toggle = target.closest('.nav-caret, .nav-parent');
      var link = target.closest('.nav-sub-link');
      var nested = item.parentNode && item.parentNode.classList &&
        item.parentNode.classList.contains('nav-submenu');

      if (e.key === 'Escape') {
        e.preventDefault();
        var focusTarget = toggleOf(item) || direct('.nav-link', item);
        closeAll();
        if (focusTarget) focusTarget.focus();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (toggle) {
          e.preventDefault();
          if (e.key === 'ArrowDown') {
            open(item);
            var first = firstLink(item);
            if (first) first.focus();
          } else {
            closeTree(item);
          }
          return;
        }
        if (link) {
          e.preventDefault();
          moveFocus(link, e.key === 'ArrowDown' ? 1 : -1);
          return;
        }
      }

      if (e.key === 'ArrowRight' && link) {
        if (item.classList.contains('has-children')) {
          e.preventDefault();
          open(item);
          var child = firstLink(item);
          if (child) child.focus();
        }
        return;
      }

      if (e.key === 'ArrowLeft' && link && nested) {
        e.preventDefault();
        var parentItem = item.parentNode.parentNode;
        closeTree(item);
        var back = toggleOf(parentItem) || direct('.nav-sub-link, .nav-link', parentItem);
        if (back) back.focus();
      }
    });

    /* 焦点离开整块菜单后收起（Tab 走开时不该留一个开着的下拉） */
    menu.addEventListener('focusout', function (e) {
      var next = e.relatedTarget;
      if (next && menu.contains(next)) return;
      setTimeout(function () {
        if (!menu.contains(document.activeElement)) closeAll();
      }, 0);
    });

    /* 视口 / 档位变化：旧的下拉位置和展开状态都不可信，直接收起 */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(closeAll, 120);
    });
    if (window.MutationObserver) {
      new MutationObserver(closeAll).observe(docEl, {
        attributes: true,
        attributeFilter: ['data-tier']
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * 抽屉里的可折叠分组
   * ------------------------------------------------------------------ */
  var drawer = document.getElementById('drawer');
  if (drawer) {
    function groupToggle(group) {
      return group.querySelector(':scope > .drawer-group-head > .drawer-group-toggle');
    }

    function setGroup(group, open) {
      group.classList.toggle('is-open', open);
      var btn = groupToggle(group);
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var sub = group.querySelector(':scope > .drawer-subnav');
      if (!sub) return;
      if (open) sub.removeAttribute('hidden');
      else sub.setAttribute('hidden', '');
    }

    $$('.drawer-group-toggle', drawer).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var group = btn.closest('.drawer-group');
        if (!group) return;
        var open = !group.classList.contains('is-open');
        setGroup(group, open);
        // 手风琴行为：展开一个分组时收起同级其它分组，抽屉里不会堆成一片
        if (open && group.parentNode) {
          Array.prototype.forEach.call(group.parentNode.children, function (sib) {
            if (sib !== group && sib.classList && sib.classList.contains('drawer-group')) {
              setGroup(sib, false);
            }
          });
        }
      });
    });

    // 当前页所在的分组默认展开，进抽屉就能看到自己在哪
    $$('.drawer-link.is-active', drawer).forEach(function (link) {
      var node = link.parentNode;
      while (node && node !== drawer) {
        if (node.classList && node.classList.contains('drawer-group')) setGroup(node, true);
        node = node.parentNode;
      }
    });
  }
})();
