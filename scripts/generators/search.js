/* global hexo */
/**
 * XFM Theme - Search Index Generator
 * 生成 /search.json / search.xml 供前端本地全文检索使用。
 */

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cfg(obj, path, dft) {
  const val = path.split('.').reduce((acc, k) => (acc == null || acc === '' ? undefined : acc[k]), obj);
  return val === undefined ? dft : val;
}

module.exports = function (hexo) {
  // 主题配置在脚本注册阶段可能尚未挂载，统一在运行时惰性读取
  const configOf = () => Object.assign({}, (hexo.theme && hexo.theme.config) || {}, hexo.config);

  hexo.extend.generator.register('xfm_search', function (locals) {
    if (cfg(configOf(), 'search.enable', true) === false) return null;

    const outPath = String(cfg(configOf(), 'search.path', 'search.json') || 'search.json').replace(/^\/+/, '');
    const indexContent = cfg(configOf(), 'search.index_content', true) !== false;
    const contentLength = Number(cfg(configOf(), 'search.content_length', 3000));
    const root = String(configOf().root || '/');
    const toUrl = (p) => {
      let u = '/' + String(p || '').replace(/^\/+/, '');
      return (root === '/' ? '' : root.replace(/\/$/, '')) + u;
    };

    const items = [];

    (locals.posts.data || []).forEach((post) => {
      if (post.draft) return;
      const url = toUrl(post.path);

      const body = indexContent ? stripTags(post.content).slice(0, contentLength) : '';
      items.push({
        title: post.title || 'Untitled',
        url,
        content: body,
        date: post.date ? post.date.valueOf() : null,
        dateText: post.date && post.date.format ? post.date.format('YYYY-MM-DD') : '',
        categories: post.categories && post.categories.data ? post.categories.data.map((c) => c.name) : [],
        tags: post.tags && post.tags.data ? post.tags.data.map((t) => t.name) : [],
        excerpt: stripTags(post.excerpt || post.description || '').slice(0, 200),
        cover: post.cover || post.banner || null,
        layout: 'post'
      });
    });

    // 独立页面一并纳入索引（便于文档 / 笔记模式检索）
    (locals.pages.data || []).forEach((page) => {
      const src = String(page.source || '');
      if (!page.title) return;
      const body = indexContent ? stripTags(page.content).slice(0, contentLength) : '';
      items.push({
        title: page.title,
        url: toUrl(page.path),
        content: body,
        date: page.date ? page.date.valueOf() : null,
        dateText: page.date && page.date.format ? page.date.format('YYYY-MM-DD') : '',
        categories: [],
        tags: [],
        excerpt: stripTags(page.description || '').slice(0, 200),
        cover: page.cover || null,
        layout: 'page'
      });
    });

    const payload = {
      meta: {
        title: String(hexo.config.title || ''),
        count: items.length,
        generated: Date.now()
      },
      data: items
    };

    return {
      path: outPath,
      data: JSON.stringify(payload)
    };
  });
};

/* ---------------------------------------------------------------------------
 * 自执行入口
 * Hexo 的脚本加载器（v7/v8）在读取脚本后不会回调 module.exports，
 * 这里在脚本作用域内直接调用，兼容新老版本两套行为。
 * ------------------------------------------------------------------------- */
function __xfmBootstrap() {
  if (typeof hexo === "undefined" || !hexo || !hexo.extend) return;
  if (hexo.__XFM_GENERATOR_SEARCH) return;
  hexo.__XFM_GENERATOR_SEARCH = true;
  module.exports(hexo);
}
__xfmBootstrap();
