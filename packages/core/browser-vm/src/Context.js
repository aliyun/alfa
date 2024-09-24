import Window from './Window';
import Document from './Document';
import Location from './Location';
import History from './History';
import { getFetchCredentials } from './utils/credentials';

class Context {
  static create(conf) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');

      // TODO: change src to a reasonable value.
      iframe.setAttribute('src', conf.url ? conf.url : '/api.json');
      iframe.style.cssText = 'position: absolute; top: -20000px; width: 1px; height: 1px;';

      if (conf.id) iframe.setAttribute('data-id', conf.id);

      // body will be hijacked in sandbox, so get body from html
      const topBody = document.documentElement?.getElementsByTagName('body')[0] || document.body;

      topBody.appendChild(iframe);

      // the onload will no trigger when src is about:blank
      if (conf.url === 'about:blank') {
        return resolve(new this(conf, iframe));
      }

      iframe.onload = () => {
        resolve(new this(conf, iframe));
      };
    });
  }

  static async remove(context) {
    if (context.remove) {
      context.remove();
    }
  }

  constructor(conf, frame) {
    this.location = new Location(frame.contentWindow.location);
    this.history = new History(conf.id, frame.contentWindow);
    this.window = new Window(conf, this, frame, location);
    this.allowResources = conf.allowResources || [];

    let { body } = conf;
    const { disableBody } = conf;

    if (disableBody) {
      body = document.body;
    } else if (!body) {
      body = document.createElement('div');
      document.documentElement.appendChild(body);
    }

    this.body = body;
    this.document = new Document({
      enableScriptEscape: true,
      ...conf,
    }, this, frame, location);
    this.baseFrame = frame;
    this._listenerMap = new Map();
    this.window.__IS_CONSOLE_OS_CONTEXT__ = true;
  }

  async loadScripts(url) {
    const resp = await fetch(url, { credentials: getFetchCredentials(url) });
    const code = await resp.text();
    this.evalScript(code, url);
  }

  evalScript(code, url = '') {
    const currentScript = this.document.createElement('script');
    currentScript.src = url;

    // eslint-disable-next-line no-new-func
    const resolver = new Function(`
      return function ({window, location, history, document, __os_current_script__}){
        var document = new Proxy(document, {
          get: function get(target, prop) {
            if (prop === "currentScript" && __os_current_script__) {
              return __os_current_script__;
            }
            return target[prop];
          }
        });
        var window = new Proxy(window, {
          get: function get(target, prop) {
            if (prop === "document") return document;
            return target[prop];
          }
        })
        var globalThis = window;
        with(window.__CONSOLE_OS_GLOBAL_VARS_) {
          try {
            ${code}
          } catch(e) {
            console.log(e)
          }
        }
      }//# sourceMappingURL=${url}`);

    resolver()
      .call(
        this.window,
        {
          ...this,
          __os_current_script__: currentScript,
        },
      );
  }

  updateBody(dom) {
    if (!dom && this.body) return;
    this.body = dom;
  }

  remove() {
    this.document.removeEventListeners();

    if (this.baseFrame) {
      if (this.baseFrame.parentNode) {
        this.baseFrame.parentNode.removeChild(this.baseFrame);
      } else {
        this.baseFrame.setAttribute('src', 'about:blank');
      }
    }
  }
}

export default Context;
