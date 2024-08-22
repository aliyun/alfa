import isFunction from 'lodash/isFunction';
import { BundleResolver } from './type';
import { Record, Module, globalModule } from './module';

const getContext = (id: string, chunkRecord: Record) => {
  let { context } = chunkRecord;
  if (isFunction(chunkRecord.context)) {
    context = context({ id });
  }
  return context;
};

let preHook = null;

const fallbackHook = function (id, resolver) {
  resolver(undefined, undefined, undefined, window, location, history, document);
};

/**
 * 在前面加载的模块系统中寻找模块
 */
const findModuleInParent = (id: string, resolver: BundleResolver, script?: HTMLOrSVGScriptElement) => {
  // remove !preHook.standalone
  if (preHook) {
    preHook(id, resolver, script);
  } else if (
    // 由于历史原因，window.__IS_CONSOLE_OS_CONTEXT__ 无法用来判断是否在沙箱中，需要额外判断 hook
    (window as { __IS_CONSOLE_OS_CONTEXT__?: boolean }).__IS_CONSOLE_OS_CONTEXT__
    && window.parent.__CONSOLE_OS_GLOBAL_HOOK__ !== hook
  ) {
    // 如果子应用开启代码分片，分片代码会在沙箱环境下运行，导致此时 hook 执行时由于没有加载记录而失败
    // 所以需要到沙箱外层去查找
    window.parent.__CONSOLE_OS_GLOBAL_HOOK__(id, resolver, script);
  } else {
    fallbackHook(id, resolver);
  }
};

/**
 * 脚本类型的模块加载，这里是为了那些没导出，但是需要被沙箱 wrap 的脚本
 */
const resolveExternalScript = (id: string, resolver: BundleResolver, scriptRecord: Record<any>) => {
  try {
    const context = getContext(id, scriptRecord);
    resolver.call(context.window, undefined, undefined, undefined, { ...context });
    scriptRecord.loaded = true;
  } catch (e) {
    scriptRecord.error = e;
  }
};

/**
 * inject the global hooks for jsonp loader
 * TODO: 解决多个 loader 实例的冲突问题
 * @param {string} id module Id
 * @param {BundleResolver} resolver bundle entry
 */
export const hook = (id: string, resolver: BundleResolver, script?: HTMLOrSVGScriptElement) => {
  if (id && resolver) {
    const chunkRecord = Module.record.get(id);
    const scriptRecord = Module.record.get(`${id}_scripts_`);

    // 可能存在多个脚本加载同一个微应用，需要通过 uuid 区分
    const uuid = script?.getAttribute?.('data-uuid');

    // 做循环加载，如果子模块中需要加载某个模块优先去父模块去找
    if ((!chunkRecord && !scriptRecord) || (chunkRecord.uuid && chunkRecord.uuid !== uuid)) {
      // 为了防止一个 ConsoleOS 子应用作为容器单独加载的时候，__CONSOLE_OS_GLOBAL_HOOK__ 为空函数的问题
      return findModuleInParent(id, resolver, script);
    }

    // 为了在沙箱中加载前置脚本
    if (scriptRecord) {
      return resolveExternalScript(id, resolver, scriptRecord);
    }

    // 处理模块
    const module = globalModule.resolveModule(id);

    try {
      let context = getContext(id, chunkRecord);

      // 如果有前置的依赖，则把前置的依赖注册到当前的模块系统中去
      if (chunkRecord.deps) {
        Object.entries(chunkRecord.deps).forEach(([depsName, exports]) => {
          // Check the deps undefined
          if (!exports) {
            console.warn(`${depsName} is null or undefined, please check the import statement for ${depsName}`);
          }
          const dep = module.resolveModule(depsName);
          dep.exports = exports;
        });
      }

      module.resolver = resolver;
      context = context || globalModule.context;
      module.context = context;

      resolver(module.require, module, module.exports, { ...context });

      chunkRecord.loaded = true;
    } catch (e) {
      scriptRecord.error = e;
    }
  }
};

/**
 * inject the global hooks for jsonp loader
 * please use webpack-jsonp-loader-plugin to build bundle
 * code will be wrapped as follow:
 *  window.__CONSOLE_OS_GLOBAL_HOOK__(id, function(require, module, exports, { dependencies }){ / wepback build umd code /})
 */
if (typeof document !== 'undefined') { // only cache pre hooks in browser environment
  if (window.__CONSOLE_OS_GLOBAL_HOOK__) {
    preHook = window.__CONSOLE_OS_GLOBAL_HOOK__;
  }

  window.__CONSOLE_OS_GLOBAL_HOOK__ = hook;
}
