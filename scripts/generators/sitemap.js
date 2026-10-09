/* global hexo */
/**
 * XFM Theme - Sitemap Generator
 * 生成 /sitemap.xml（可选 robots.txt），无需安装额外插件。
 */

function cfg(obj, path, dft) {
  const val = path.split('.').reduce((acc, k) => (acc == null || acc === '' ? undefined : acc[k]), obj);
  return val === undefined ? dft : val;
}

function escapeXML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = function (hexo) {
  // 主题配置在脚本注册阶段可能尚未挂载，统一在运行时惰性读取
  const configOf = () => Object.assign({}, (hexo.theme && hexo.theme.config) || {}, hexo.config);

  hexo.extend.generator.register('xfm_sitemap', function (locals) {
    if (cfg(configOf(), 'sitemap.enable', true) === false) return null;

    const base = String(configOf().url || '').replace(/\/$/, '');
    if (!base) return null;

    const exclude = (cfg(configOf(), 'sitemap.exclude', []) || []).map(String);
    const isExcluded = (url) => exclude.some((pattern) => url.indexOf(pattern) > -1);

    const entries = [];
    const push = (url, updated) => {
      let full = url;
      if (!/^https?:\/\//i.test(full)) {
        full = base + (full.charAt(0) === '/' ? '' : '/') + full;
      }
      if (isExcluded(full)) return;
      entries.push({
        loc: full,
        lastmod: updated && updated.format ? updated.format('YYYY-MM-DDTHH:mm:ssZ') : '',
        priority: url === '/' ? '1.0' : '0.6'
      });
    };

    push('/', new Date());

    (locals.posts.data || []).forEach((post) => {
      if (post.draft) return;
      push('/' + String(post.path).replace(/^\/+/, ''), post.updated || post.date);
    });

    (locals.pages.data || []).forEach((page) => {
      const p = String(page.path || '');
      if (!p || p === 'index.html') return;
      push('/' + p.replace(/^\/+/, ''), page.updated || page.date);
    });

    (locals.tags.data || []).forEach((tag) => {
      push('/' + String(tag.path).replace(/^\/+/, ''), null);
    });

    (locals.categories.data || []).forEach((cat) => {
      push('/' + String(cat.path).replace(/^\/+/, ''), null);
    });

    const seen = Object.create(null);
    const uniqueEntries = entries.filter((e) => {
      if (seen[e.loc]) return false;
      seen[e.loc] = true;
      return true;
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    uniqueEntries.forEach((e) => {
      xml += '  <url>\n';
      xml += '    <loc>' + escapeXML(e.loc) + '</loc>\n';
      if (e.lastmod) xml += '    <lastmod>' + escapeXML(e.lastmod) + '</lastmod>\n';
      xml += '    <priority>' + e.priority + '</priority>\n';
      xml += '  </url>\n';
    });
    xml += '</urlset>\n';

    const results = [{ path: 'sitemap.xml', data: xml }];

    if (cfg(configOf(), 'sitemap.robots', false)) {
      results.push({
        path: 'robots.txt',
        data:
          'User-agent: *\nAllow: /\n\nSitemap: ' +
          base +
          '/sitemap.xml\n'
      });
    }

    return results;
  });
};

/* ---------------------------------------------------------------------------
 * 自执行入口
 * Hexo 的脚本加载器（v7/v8）在读取脚本后不会回调 module.exports，
 * 这里在脚本作用域内直接调用，兼容新老版本两套行为。
 * ------------------------------------------------------------------------- */
function __xfmBootstrap() {
  if (typeof hexo === "undefined" || !hexo || !hexo.extend) return;
  if (hexo.__XFM_GENERATOR_SITEMAP) return;
  hexo.__XFM_GENERATOR_SITEMAP = true;
  module.exports(hexo);
}
__xfmBootstrap();
