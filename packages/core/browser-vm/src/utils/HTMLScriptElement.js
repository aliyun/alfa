export const addEventListener = (el, originEventListener) => (type, listener, options) => {
  const listeners = el._listenerMap.get(type) || [];
  el._listenerMap.set(type, [...listeners, listener]);
  return originEventListener.apply(el, [type, listener, options]);
};

export const removeEventListener = (el, originEventListener) => (type, listener, options) => {
  const storedTypeListeners = el._listenerMap.get(type);
  if (storedTypeListeners && storedTypeListeners.length && storedTypeListeners.indexOf(listener) !== -1) {
    storedTypeListeners.splice(storedTypeListeners.indexOf(listener), 1);
  }
  return originEventListener.apply(el, [type, listener, options]);
};

const elProperties = ['innerHTML', 'text', 'innerText'];

/**
 * 劫持 script element 上的事件监听
 * @param {*} el
 */
export const injectHTMLScriptElement = (el) => {
  // _listenerMap 记录 element 上的事件监听，当被拦截通过 fetch 加载时，执行记录的回调函数
  el._listenerMap = new Map();
  el.addEventListener = addEventListener(el, el.addEventListener);
  el.removeEventListener = removeEventListener(el, el.removeEventListener);

  // do not redefine property in sandbox
  if (!el._evalScriptInSandbox) {
    elProperties.forEach((property) => {
      Object.defineProperty(el, property, {
        get: function get() {
          return this.scriptText || '';
        },
        set: function set(value) {
          this.scriptText = value;
          // 如果是已经插入到 dom 树里面，则直接执行
          if (el.parentNode) {
            this.ownerContext.evalScript && el.ownerContext.evalScript(value.toString());
          }
        },
        enumerable: false,
      });
    });

    el._evalScriptInSandbox = true;
  }

};
