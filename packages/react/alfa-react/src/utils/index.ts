interface IWin {
  __IS_CONSOLE_OS_CONTEXT__?: boolean;
}

/**
 * kernel 会为沙箱 context 注入 __IS_CONSOLE_OS_CONTEXT__
 */
declare let context: {
  __IS_CONSOLE_OS_CONTEXT__: boolean;
};

export const normalizeName = (name: string) => {
  return name.replace(/@/g, '').replace(/\//g, '-');
};

/**
 * 判断是否在沙箱环境中运行
 */
export const isOsContext = (): boolean => {
  try {
    return context.__IS_CONSOLE_OS_CONTEXT__;
  } catch (e) {
    // 历史逻辑问题，window.__IS_CONSOLE_OS_CONTEXT__ 会被污染导致判断异常
    // 降级
    return !!(window as IWin).__IS_CONSOLE_OS_CONTEXT__;
  }
};

/**
 * set native object property
 * @param obj
 * @param propertyName
 * @param value
 * @returns
 */
export const setNativeProperty = (obj: any, propertyName: string, value: any) => {
  const desc = Object.getOwnPropertyDescriptor(obj, propertyName);

  // in strict mode, Cannot set property go of [xx] which has only a getter
  if (desc && typeof desc.set === 'undefined') return;

  obj[propertyName] = value;
};

