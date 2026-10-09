/* global hexo */
/**
 * XFM Theme - 404 Page Generator
 * 当用户未提供自己的 404 页面时，自动使用主题内置模板生成 /404.html。
 * 依据 Hexo 渲染机制：generator 返回的 data 会成为模板中的 page 对象。
 */

module.exports = function (hexo) {
  // 主题配置在脚本注册阶段可能尚未挂载，统一在运行时惰性读取
  const configOf = () => Object.assign({}, (hexo.theme && hexo.theme.config) || {}, hexo.config);

  function get(key, dft) {
    const val = key.split('.').reduce((acc, k) => (acc == null || acc === '' ? undefined : acc[k]), configOf());
    return val === undefined ? dft : val;
  }

  hexo.extend.generator.register('xfm_404', function (locals) {
    if (get('error_404.enable', true) === false) return null;
    if (get('error_404.auto_generate', true) === false) return null;

    const pages = (locals.pages && locals.pages.data) || [];
    const hasCustom = pages.some((p) => {
      const path = String(p.path || '');
      return /^404(\.html|\/|$)/i.test(path) || String(p.source || '') === '404.md';
    });
    if (hasCustom) return null;

    const recommend = get('error_404.recommend_count', 4);
    const posts = ((locals.posts && locals.posts.data) || [])
      .filter((p) => !p.draft && p.title)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, Number(recommend) || 4);

    return {
      path: '404.html',
      layout: ['404', 'page', 'index'],
      data: {
        title: get('error_404.title', '页面走失了'),
        subtitle: get('error_404.subtitle', '你访问的页面不存在，或许它已被移动或删除。'),
        comments: false,
        sidebar: false,
        toc: false,
        xfm404: true,
        recommend: posts
      }
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
  if (hexo.__XFM_GENERATOR_404) return;
  hexo.__XFM_GENERATOR_404 = true;
  module.exports(hexo);
}
__xfmBootstrap();
