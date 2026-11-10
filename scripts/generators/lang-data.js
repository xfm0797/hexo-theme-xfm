/* global hexo */
/**
 * XFM Theme - Language Data Generator
 * 把多语言的全量扁平字典输出成 /js/lang-data.js。
 * 各页 HTML 里只留很轻的定档元数据（lang-boot），字典本身走这个可缓存文件；
 * 模板里的 ?v=<hash> 与该文件内容由同一个 helper memo 产出，天然同源。
 */

module.exports = function (hexo) {
  hexo.extend.generator.register('xfm_lang_data', function () {
    const helper = hexo.extend.helper.get('xfm_lang');
    if (typeof helper !== 'function') return [];
    // xfm_lang 不依赖 this，传入空上下文即可取出构建期的语言包
    const L = helper.call({});
    if (!L || !L.enable || !L.data_json) return [];
    return {
      path: 'js/lang-data.js',
      data:
        'window.__XFM_LANG__=window.__XFM_LANG__||{};' +
        'window.__XFM_LANG__.tables=' +
        L.data_json +
        ';'
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
  if (hexo.__XFM_GENERATOR_LANG_DATA) return;
  hexo.__XFM_GENERATOR_LANG_DATA = true;
  module.exports(hexo);
}
__xfmBootstrap();
