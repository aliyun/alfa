import { v4 as uuidv4 } from 'uuid';

import { globalModule } from './module';
import { Module, Record } from './module/Module';
import { IBundleOption } from './type';

/**
 * 更新模块的加载状态，如果加载执行成功，loaded 为 true，则设置 promise 状态 done
 * @param id
 */
function resolveRecord(id: string) {
  const record = Module.record.get(id);

  if (record) {
    // 加载完成时会通过全局 hook 注册，成功后设置 loaded 为 true
    if (record.loaded) {
      record.resolve();

      if (id.endsWith('_scripts_')) {
        Module.record.delete(id);
      }
    } else {
      // 当记录中，该模块加载状态为 false，清除该记录
      record.reject(record.error);

      Module.record.delete(id);
    }
  }
}

/**
 * handle script loaded
 * @param id
 * @param script
 * @param timeout
 */
function onScriptComplete(id: string, script: HTMLScriptElement, timeout: number) {
  script.onerror = null;
  script.onload = null;
  clearTimeout(timeout);

  resolveRecord(id);
}

/**
 * handle script load error
 * @param id
 * @param script
 * @param timeout
 */
function onScriptError(id: string, script: HTMLScriptElement, timeout: number) {
  const record = Module.record.get(id);
  onScriptComplete(id, script, timeout);
  if (record) {
    record.reject(new Error('script load fail'));
  }
}

/**
 * append script
 * @param {IBundleOption} bundle
 */
function jsonpRequire(id: string, url: string, uuid: string) {
  const script = document.createElement('script');
  script.charset = 'utf-8';
  script.src = url;

  script.setAttribute('nonce', '');
  // 用于加载的脚本判断来源
  script.setAttribute('data-from', 'alfa');
  script.setAttribute('data-uuid', uuid);

  const timeout = window.setTimeout(() => {
    onScriptError(id, script, timeout);
  }, 120000);

  script.onerror = () => {
    onScriptError(id, script, timeout);
  };

  script.onload = () => {
    onScriptComplete(id, script, timeout);
  };

  document.head.appendChild(script);
}

export async function xmlRequire(id: string, url: string, transform: (source: string) => string) {
  const resp = await fetch(url);
  const code = await resp.text();

  // eslint-disable-next-line no-eval
  window.eval(`__CONSOLE_OS_GLOBAL_HOOK__('${id.replace('_scripts_', '')}', function(require, module, exports, {window, location, history, document}){
    with(window.__CONSOLE_OS_GLOBAL_VARS_){
      ${transform(code)}
    }
  })`);

  resolveRecord(id);
}

/**
 * async require the bundle from url
 * @param bundle {IBundleOption}
 */
export async function requireEnsure<T>(bundle: IBundleOption) {
  const transform = bundle.transform || ((source: string) => source);

  // if module has been resolved
  if (!bundle.noCache && globalModule.resolved(bundle.id)) {
    // if loader contains the context(window, location)
    // then get the new export using new context
    if (bundle.context) {
      return globalModule.requireIsolateWithContext(bundle.id, bundle.context);
    }
    // return the cached module
    return globalModule.require(bundle.id);
  }

  const promises: Array<Promise<T>> = [];

  let chunkRecord: Record<T> = Module.record.get(bundle.id);

  if (!chunkRecord || !chunkRecord.loaded) {
    if (chunkRecord) {
      promises.push(chunkRecord.promise);
    } else {
      const promise = new Promise<T>((resolve, reject) => {
        chunkRecord = new Record();
        chunkRecord.resolve = resolve;
        chunkRecord.reject = reject;
        chunkRecord.context = bundle.context;
        chunkRecord.deps = bundle.deps;
        chunkRecord.uuid = uuidv4();
        Module.record.set(bundle.id, chunkRecord);
      });
      chunkRecord.promise = promise;
      promises.push(promise);

      if (bundle.xmlrequest) {
        xmlRequire(bundle.id, bundle.url, transform);
      } else {
        jsonpRequire(bundle.id, bundle.url, chunkRecord.uuid);
      }
    }
  }

  await Promise.all(promises);

  return globalModule.require(bundle.id);
}
