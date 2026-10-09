/* ==========================================================================
   XFM Theme · search.js
   本地全文搜索：索引加载 + 分词匹配 + 键盘导航
   ========================================================================== */
(function () {
  'use strict';

  var CFG = (window.XFM && window.XFM.search) || {};
  var I18N = (window.XFM && window.XFM.i18n) || {};

  var modal = document.getElementById('searchModal');
  if (!modal) return;

  var input = document.getElementById('searchInput');
  var resultsBox = document.getElementById('searchResults');
  var clearBtn = document.getElementById('searchClear');

  var index = null;
  var loading = false;
  var cursor = -1;
  var items = [];

  /* ------------------------------------------------------------------ *
   * 索引加载
   * ------------------------------------------------------------------ */
  function loadIndex() {
    if (index || loading) return Promise.resolve(index);
    loading = true;
    return fetch(CFG.path || '/search.json', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        index = (data && data.data) || [];
        loading = false;
        return index;
      })
      .catch(function () {
        loading = false;
        index = [];
        return index;
      });
  }

  window.__xfmSearchLoad = function () {
    if (!index && resultsBox) {
      resultsBox.innerHTML =
        '<div class="search-tip">' + (I18N.searching || '正在加载索引…') + '</div>';
      loadIndex().then(function () {
        if (resultsBox) {
          resultsBox.innerHTML =
            '<div class="search-tip">' + (I18N.noInput || '输入关键词开始搜索') + '</div>';
        }
      });
    }
  };

  /* ------------------------------------------------------------------ *
   * 文本处理
   * ------------------------------------------------------------------ */
  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function tokenize(q) {
    return String(q)
      .toLowerCase()
      .split(/[\s,，、/]+/)
      .filter(function (s) { return s.length > 0; });
  }

  function buildSummary(text, tokens, limit) {
    var lower = text.toLowerCase();
    var pos = -1;
    for (var i = 0; i < tokens.length; i++) {
      var idx = lower.indexOf(tokens[i]);
      if (idx > -1 && (pos === -1 || idx < pos)) pos = idx;
    }
    var start = pos === -1 ? 0 : Math.max(0, pos - 26);
    var snippet = text.slice(start, start + limit * 2);
    if (start > 0) snippet = '…' + snippet;
    if (text.length > start + limit * 2) snippet += '…';

    tokens.forEach(function (t) {
      snippet = snippet.replace(new RegExp('(' + escapeRegExp(t) + ')', 'gi'), '\u0001$1\u0002');
    });
    return escapeHTML(snippet)
      .replace(/\u0001/g, '<mark>')
      .replace(/\u0002/g, '</mark>');
  }

  function highlight(text, tokens) {
    var out = escapeHTML(text);
    tokens.forEach(function (t) {
      out = out.replace(new RegExp('(' + escapeRegExp(t) + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }

  /* ------------------------------------------------------------------ *
   * 查询
   * ------------------------------------------------------------------ */
  function search(query) {
    var tokens = tokenize(query);
    if (!tokens.length) return [];

    var limit = CFG.max || 20;
    var hits = [];

    (index || []).forEach(function (item) {
      var title = String(item.title || '');
      var content = String(item.content || '');
      var tags = (item.tags || []).join(' ');
      var cats = (item.categories || []).join(' ');

      var titleLower = title.toLowerCase();
      var contentLower = content.toLowerCase();
      var metaLower = (tags + ' ' + cats).toLowerCase();

      var score = 0;
      var matchedAll = true;

      tokens.forEach(function (t) {
        var inTitle = titleLower.indexOf(t) > -1;
        var inContent = contentLower.indexOf(t) > -1;
        var inMeta = metaLower.indexOf(t) > -1;
        if (!inTitle && !inContent && !inMeta) matchedAll = false;
        score += (inTitle ? 8 : 0) + (inMeta ? 4 : 0) + (inContent ? 1 : 0);
      });

      if (!matchedAll) return;

      // 标题整体包含查询串时加权
      if (titleLower.indexOf(tokens.join(' ')) > -1) score += 10;

      hits.push({ item: item, score: score });
    });

    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return (b.item.date || 0) - (a.item.date || 0);
    });

    return hits.slice(0, limit).map(function (h) { return h.item; });
  }

  /* ------------------------------------------------------------------ *
   * 渲染
   * ------------------------------------------------------------------ */
  function render(list, tokens) {
    if (!resultsBox) return;
    cursor = -1;

    if (!list.length) {
      resultsBox.innerHTML = '<div class="search-tip">' + (I18N.noResult || '没有找到结果') + '</div>';
      return;
    }

    var html = '<div class="search-result-group">' +
      (I18N.resultCount || '共找到 {count} 条结果').replace('{count}', list.length) + '</div>';

    list.forEach(function (item) {
      var summary = '';
      if (item.content) {
        summary = buildSummary(item.content, tokens, CFG.preview || 100);
      }

      html += '<a class="search-result-item" href="' + escapeHTML(item.url) + '">' +
        '<div class="search-result-title">' +
        highlight(item.title, tokens) +
        (CFG.showDate && item.dateText
          ? '<span class="search-result-url">' + escapeHTML(item.dateText) + '</span>'
          : '') +
        '</div>' +
        (summary
          ? '<div class="search-result-excerpt">' + summary + '</div>'
          : '') +
        '</a>';
    });

    resultsBox.innerHTML = html;
    resultsBox.scrollTop = 0;
  }

  function moveCursor(delta) {
    var nodes = Array.prototype.slice.call(resultsBox.querySelectorAll('.search-result-item'));
    if (!nodes.length) return;
    if (cursor >= 0 && nodes[cursor]) nodes[cursor].classList.remove('is-active');
    cursor = (cursor + delta + nodes.length) % nodes.length;
    var active = nodes[cursor];
    active.classList.add('is-active');
    var box = resultsBox.getBoundingClientRect();
    var rect = active.getBoundingClientRect();
    if (rect.bottom > box.bottom) resultsBox.scrollTop += rect.bottom - box.bottom + 8;
    if (rect.top < box.top) resultsBox.scrollTop -= box.top - rect.top + 8;
  }

  /* ------------------------------------------------------------------ *
   * 事件绑定
   * ------------------------------------------------------------------ */
  var timer = null;
  if (input) {
    input.addEventListener('input', function () {
      var value = input.value.trim();
      if (clearBtn) clearBtn.classList.toggle('is-show', value.length > 0);
      clearTimeout(timer);
      if (!value) {
        if (resultsBox) {
          resultsBox.innerHTML = '<div class="search-tip">' + (I18N.noInput || '输入关键词开始搜索') + '</div>';
        }
        return;
      }
      timer = setTimeout(function () {
        loadIndex().then(function () {
          var tokens = tokenize(value);
          items = search(value);
          render(items, tokens);
        });
      }, 140);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(-1); }
      else if (e.key === 'Enter') {
        var nodes = resultsBox ? resultsBox.querySelectorAll('.search-result-item') : [];
        if (cursor >= 0 && nodes[cursor]) {
          e.preventDefault();
          window.location.href = nodes[cursor].getAttribute('href');
        }
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (!input) return;
      input.value = '';
      input.focus();
      clearBtn.classList.remove('is-show');
      if (resultsBox) {
        resultsBox.innerHTML = '<div class="search-tip">' + (I18N.noInput || '输入关键词开始搜索') + '</div>';
      }
    });
  }

  // 结果点击后关闭面板
  if (resultsBox) {
    resultsBox.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('.search-result-item') : null;
      if (!link) return;
      if (window.__xfmSearch) window.__xfmSearch.close();
    });
  }

  // 预热索引：页面空闲时预取
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(function () { loadIndex(); }, { timeout: 3000 });
  } else {
    setTimeout(loadIndex, 4000);
  }
})();
