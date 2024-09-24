/**
 * Document.js
 * @lastModified 2019085
 * @forwardCompatibleTo 2019085
 * @createAt 2019085
 */

import { injectHTMLScriptElement } from './utils/HTMLScriptElement';

class Document {
  constructor(options = {}, context) {
    const eventListeners = [];

    return new Proxy(document, {
      set(target, name, value) {
        switch (name) {
          case 'cookie':
            document.cookie = value;
            break;
          default:
            target[name] = value;
        }
        return true;
      },

      get(target, name) {
        switch (name) {
          case 'body':
            return context.body;
          case 'location':
            return context.location;
          case 'defaultView':
            return context.window;

          case 'write':
          case 'writeln':
            return () => {};

          case 'createElement':
            return (...args) => {
              const el = document.createElement(...args);
              el.ownerContext = context;
              el.appId = options.id;
              // 对于 script 标签如果开启防逃逸，就直接 hack script 标签
              if (el.tagName === 'SCRIPT' && !options.enableScriptEscape) {
                injectHTMLScriptElement(el);
              }
              return el;
            };

          case 'addEventListener':
            return (...args) => {
              eventListeners.push(args);
              return target.addEventListener(...args);
            };

          case 'removeEventListeners':
            return () => {
              for (const args of eventListeners) {
                target.removeEventListener(...args);
              }
            };

          default:
        }

        // TODO: hijack document.getElementsByTagName('body')
        if (typeof target[name] === 'function') {
          return target[name].bind && target[name].bind(target);
        } else {
          return target[name];
        }
      },
    });
  }
}

export default Document;
