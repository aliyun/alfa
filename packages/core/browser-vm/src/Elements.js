/**
 * Elements.js
 * @lastModified 2019085
 * @forwardCompatibleTo 2019085
 * @createAt 2019085
 */

import injectScriptCallBack, { getJsonCallback } from './utils/injectScriptCallBack';

const makeElInjector = (originMethod) => function( el, ...args ){

  // 如果不在 BrowserVM 的白名单内，尝试通过 context 的 load script 通过 xhr 获取脚本内容，并在沙箱中执行
  if (
    el && el._evalScriptInSandbox
    && el.ownerContext && el.nodeName === 'SCRIPT' 
    && el.src && el.ownerContext.allowResources.indexOf(el.src) === -1 
    && !getJsonCallback(el.src)
  ) {
    return el.ownerContext.loadScripts(el.src).then(() => {
      const fns = el._listenerMap.get('load');
      if (fns) {
        fns.forEach((fn) => { fn() })
      }
      el.onload && el.onload();
    }).catch((e) => {
      console.error(e);
      const fns = el._listenerMap.get('error');
      if (fns) {
        fns.forEach((fn) => { fn(e) })
      }
      el.onerror && el.onerror(e);
    });
  }

  if( el && el.nodeName === 'SCRIPT' && el.ownerContext){
    injectScriptCallBack( el );
  }

  // 如果有 scriptText, 证明在 append 之前被设置了 text
  // 所以直接执行这个 script
  if (el && el.scriptText) {
    el.ownerContext.evalScript(el.scriptText);
  }


  // fn.call( this, el, ...args ) 写法会被 babel 转换为 fn.call.apply(fn, [this, el].concat(args)) ,
  // el 为 undefined 时, fn apply 的参数列表为 [undefined] ,
  // 调用 append 时会造成元素被 append 一个内容为 undefined 的 TextNode .
  if ( el || args.length ) {
    return originMethod.apply( this, [el, ...args] );
  } else {
    return originMethod.call( this )
  }
}

if( typeof window.Element === 'function' ){
  const mountElementMethods = [ 'appendChild', 'insertBefore', 'append' ];

  for ( const method of mountElementMethods ) {
    const originMethod = window.Element.prototype[ method ];
    window.Element.prototype[ method ] = makeElInjector(originMethod);
  }
}