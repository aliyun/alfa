/**
 * Window.js
 */
import { addEventListener, removeEventListener } from './events';
import { isConstructable, isBoundedFunction } from './utils/common';

const globalFnName = ['setTimeout', 'setInterval', 'clearInterval', 'clearTimeout'];
const globalVars = ['location', 'history'];
const defaultExternals = [
  'requestAnimationFrame',
  'webkitRequestAnimationFrame',
  'mozRequestAnimationFrame',
  'oRequestAnimationFrame',
  'msRequestAnimationFrame',
  'cancelAnimationFrame',
  'webkitCancelAnimationFrame',
  'mozCancelAnimationFrame',
  'oCancelAnimationFrame',
  'msCancelAnimationFrame',
  'matchMedia',
  'getSelection',
  'open',
];

class Window {
  constructor(options = {}, context, frame) {
    const externals = [
      ...defaultExternals,
      ...(options.externals || []),
    ];
    const __CONSOLE_OS_GLOBAL_VARS_ = {};

    // 拦截全局方法
    globalFnName.forEach((name) => {
      if (externals.includes(name)) {
        return;
      }
      __CONSOLE_OS_GLOBAL_VARS_[name] = frame.contentWindow[name].bind(frame.contentWindow);
    });

    // 通过拦截外置的全局变量，指向外部变量
    globalVars.forEach((name) => {
      if (externals.includes(name)) {
        __CONSOLE_OS_GLOBAL_VARS_[name] = window[name];
      }
    });

    return new Proxy(frame.contentWindow, {
      set(target, name, value) {
        target[name] = value;
        __CONSOLE_OS_GLOBAL_VARS_[name] = value;
        return true;
      },

      get(target, name) {
        if (externals.includes(name)) {
          const windowValue = window[name];
          if (typeof windowValue === 'function' && !isBoundedFunction(windowValue) && !isConstructable(windowValue)) {
            const bindFn = windowValue.bind(window);
            for (const key in windowValue) {
              bindFn[key] = windowValue[key];
            }
            return bindFn;
          } else {
            return windowValue;
          }
        }

        switch (name) {
          case 'window':
            return context.window;
          case 'document':
            return context.document;
          case 'location':
            return context.location;
          case 'history':
            return context.history;
          case '__CONSOLE_OS_GLOBAL_VARS_':
            return __CONSOLE_OS_GLOBAL_VARS_;
          case 'addEventListener':
            return addEventListener(context);
          case 'removeEventListener':
            return removeEventListener(context);
        }

        if (__CONSOLE_OS_GLOBAL_VARS_[name]) {
          return __CONSOLE_OS_GLOBAL_VARS_[name];
        }

        const value = target[name];
        if (typeof value === 'function' && !isBoundedFunction(value) && !isConstructable(value)) {
          return value.bind && value.bind(target);
        } else {
          return value;
        }
      },
    });
  }
}

export default Window;
