import injectScriptCallBack, { getJsonCallback } from './utils/injectScriptCallBack';
import { isSSR } from './utils/isSSR';

const makeElInjector = (originMethod, methodName) => function (el, ...args) {
  const notAllowed = el && el.ownerContext && (el.ownerContext.allowResources.indexOf(el.src) === -1 && el.ownerContext.allowResources !== '*');

  // 如果不在 BrowserVM 的白名单内，尝试通过 context 的 load script 通过 xhr 获取脚本内容，并在沙箱中执行
  if (
    el && el._evalScriptInSandbox
    && el.ownerContext && el.nodeName === 'SCRIPT'
    && el.src && notAllowed
    && !getJsonCallback(el.src)
  ) {
    return el.ownerContext.loadScripts(el.src).then(() => {
      const fns = el._listenerMap.get('load');
      if (fns) {
        fns.forEach((fn) => { fn(); });
      }
      const e = new Event('load');
      el.onload && el.onload(e);
    }).catch((e) => {
      console.error(e, el.src);
      const fns = el._listenerMap.get('error');
      if (fns) {
        fns.forEach((fn) => { fn(e); });
      }
      el.onerror && el.onerror(e);
    });
  }

  if (el && el.nodeName === 'SCRIPT' && el.ownerContext) {
    injectScriptCallBack(el);
  }

  // 如果有 scriptText, 证明在 append 之前被设置了 text
  // 所以直接执行这个 script
  if (el && el.scriptText) {
    el.ownerContext.evalScript(el.scriptText);
  }

  // fix: babel 会把 fn.call 转义成 fn.call.apply 造成 chrome 50 的几个版本报错
  // 这里 尝试 try catch 如果报错 直接调用 fn.apply

  const methodArgs = methodName === 'append' && el === undefined // 修复 append 的过程中 append() 为一个没参数的状态。应为 append 的函数签名为 append(param1, param2, /* ... ,*/ paramN)
    ? [...args]
    : [el, ...args];

  try {
    return originMethod.call(this, ...methodArgs);
  } catch {
    return originMethod.apply(this, methodArgs);
  }
};

if (!isSSR() && typeof window.Element === 'function') {
  const mountElementMethods = ['appendChild', 'insertBefore', 'append'];

  for (const method of mountElementMethods) {
    const originMethod = window.Element.prototype[method];
    window.Element.prototype[method] = makeElInjector(originMethod, method);
  }
}
