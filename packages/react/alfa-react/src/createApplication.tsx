import React, { useRef, useEffect, useState, useMemo } from 'react';
import { BaseLoader } from '@alicloud/alfa-core';

import Loading from './components/Loading';
import { normalizeName, isOsContext } from './utils';
import { AlfaFactoryOption, MicroApplication } from './types';
import { version as loaderVersion } from './version';

interface IProps<C = any> extends AlfaFactoryOption {
  customProps: C;
  puppeteer?: boolean;
  basename?: string;
  path?: string;
}

interface IWin {
  UA_Opt?: {
    LogVal?: string;
  };
  RISK_INFO?: {
    UMID?: string;
  };
  um?: {
    getToken?: () => any;
  };
}

const resolvePath = (...args: Array<string | undefined>) => {
  return `/${ args.join('/')}`.replace(/\/+/g, '/');
};

/**
 * 去掉 location.origin 的路径
 */
const peelPath = (location: Location) => {
  return location.pathname + location.search + location.hash;
};

const addBasename = (path: string, basename?: string) => {
  if (!basename) return path;

  return resolvePath(basename, path);
};

const stripBasename = (path: string, basename?: string) => {
  if (!basename) return path;

  const _path = resolvePath(path);
  const _basename = resolvePath(basename);

  if (_path === _basename) return '/';
  return _path.replace(new RegExp(`^${_basename}`, 'ig'), '');
};

/**
 * container for microApp mount
 * @param loader alfa-core loader
 * @returns
 */
export default function createApplication(loader: BaseLoader) {
  return function Application <C = any>(props: IProps<C>) {
    const {
      name, version, manifest, loading, customProps, className, style, container,
      entry, url, logger: customLogger, deps, env, beforeMount, afterMount, beforeUnmount,
      afterUnmount, beforeUpdate, sandbox: customSandbox, locale, dynamicConfig, noCache,
      puppeteer, basename,
    } = props;
    const [appInstance, setAppInstance] = useState<MicroApplication | null>(null);
    const [, setError] = useState(null);
    const appRef = useRef<HTMLElement | undefined>(undefined);
    const $puppeteer = useRef(puppeteer);
    const $basename = useRef(basename);
    const tagName = normalizeName(props.name);

    $puppeteer.current = puppeteer;
    $basename.current = basename;

    // 受控模式锁定一些参数
    if ($puppeteer.current) {
      // 禁止子应用和 consoleBase 通信
      (customProps as unknown as { consoleBase: any }).consoleBase = null;
      // 覆写 path 参数，用于通知子应用更新路由
      (customProps as unknown as { path: string }).path = stripBasename(peelPath(window.location), $basename.current);
      // 禁止注入 history
      (customProps as unknown as { __injectHistory: any }).__injectHistory = null;
    }

    const sandbox = useMemo(() => {
      const aliyunExternalsVars = [];

      if ((window as IWin).UA_Opt?.LogVal) {
        aliyunExternalsVars.push('UA_Opt');
        aliyunExternalsVars.push((window as IWin).UA_Opt?.LogVal as string);
      }

      if ((window as IWin).RISK_INFO?.UMID) aliyunExternalsVars.push('RISK_INFO');

      if ((window as IWin).um?.getToken) aliyunExternalsVars.push('um');

      return {
        ...customSandbox,
        // allowResources: [
        //   ...(customSandbox?.allowResources || []),
        //   /^https?:\/\/at\.alicdn\.com\//,
        // ],
        externalsVars: [
          ...(customSandbox?.externalsVars || []),
          // global vars used in ConsoleBase.forApp
          '_console_base_ready_',
          // risk control
          ...aliyunExternalsVars,
        ],
      };
    }, [customSandbox]);

    // 固化第一次的配置
    const memoOptions = useMemo(() => ({
      entry, // deprecated
      url, // deprecated
      name,
      version,
      manifest,
      container,
      props: customProps,
      sandbox,
      logger: customLogger,
      deps,
      env,
      beforeMount,
      afterMount,
      beforeUnmount,
      afterUnmount,
      beforeUpdate,
      locale,
      noCache,
      // 用户自定义 manifest 且未传入 dynamicConfig 时，默认值为 false，否则为 true
      dynamicConfig: typeof dynamicConfig === 'boolean' ? dynamicConfig : !manifest,
    }), []);

    useEffect(() => {
      let isUnmounted = false;
      let App: MicroApplication | undefined;
      let originalPushState: (data: any, unused: string, url?: string | null) => void;
      let originalReplaceState: (data: any, unused: string, url?: string | null) => void;
      let originalGo: (n?: number) => void;

      const dispatchFramePopstate = () => {
        const popstateEvent = new Event('popstate');
        (popstateEvent as unknown as { state: string }).state = 'mock';

        App?.context.baseFrame?.contentWindow?.dispatchEvent(popstateEvent);
      };

      // 受控模式下，返回不会触发子应用内的路由更新
      const updateAppHistory = () => {
        if (App) {
          // 如果子应用路径不同，主动通知子应用 popstate 事件
          const nextPath = peelPath(App.context.location);
          if (nextPath !== stripBasename(peelPath(window.location), $basename.current)) {
            const popstateEvent = new Event('popstate');
            (popstateEvent as unknown as { state: string }).state = 'mock';

            if (originalReplaceState) originalReplaceState(null, '', stripBasename(peelPath(window.location), $basename.current));
            dispatchFramePopstate();
          }
        }
      };

      window.addEventListener('popstate', updateAppHistory);

      (async () => {
        const { app, logger } = await loader.register<C>({
          ...memoOptions,
          container: memoOptions.container || appRef.current,
        });

        App = app;

        // container has been unmounted
        if (isUnmounted) return;

        if (!app) {
          return logger?.error && logger.error({ E_CODE: 'RuntimeError', E_MSG: 'load app failed.' });
        }

        if (!appRef.current) {
          return logger?.error && logger.error({ E_CODE: 'RuntimeError', E_MSG: 'cannot find container.' });
        }

        // update body in sandbox context
        app.context.updateBody?.(memoOptions.sandbox.disableFakeBody ? document.body : appRef.current);

        const { path } = memoOptions.props as Record<string, any>;
        const frameWindow = app.context.baseFrame?.contentWindow;

        if (frameWindow) {
          originalPushState = frameWindow?.history.pushState;
          originalReplaceState = frameWindow?.history.replaceState;
          originalGo = frameWindow?.history.go;
          // update context history according to path
          if (path) originalReplaceState(null, '', path.replace(/\/+/g, '/'));

          if (frameWindow) {
            frameWindow.history.pushState = (data, unused, _url) => {
              if ($puppeteer.current) {
                const nextPath = addBasename(_url?.toString() || '', $basename.current);
                if (`${nextPath}` !== peelPath(window.location)) {
                  window.history.pushState(data, unused, nextPath);
                }

                originalReplaceState(data, unused, _url as string);
              } else {
                originalPushState(data, unused, _url as string);
              }
            };

            frameWindow.history.replaceState = (data, unused, _url) => {
              const nextPath = addBasename(_url?.toString() || '', $basename.current);
              if ($puppeteer.current) {
                window.history.replaceState(data, unused, nextPath);
              }
              originalReplaceState(data, unused, _url as string);
            };

            // 劫持微应用的返回
            frameWindow.history.go = (n?: number) => {
              window.history.go(n);
            };
          }
        }

        await app.mount(appRef.current, {
          customProps,
        });

        if (frameWindow) {
          // 每次挂载后主动触发子应用内的 popstate 事件，借此触发 react-router history 的检查逻辑
          dispatchFramePopstate();
        }

        // just run once
        setAppInstance(app);
      })().catch((e) => {
        setError(() => {
          throw e;
        });
      });

      return () => {
        isUnmounted = true;

        window.removeEventListener('popstate', updateAppHistory);

        if (!App) return;

        const frameHistory = App.context.baseFrame?.contentWindow?.history;

        if (frameHistory) {
          if (originalPushState !== frameHistory.pushState) frameHistory.pushState = originalPushState;
          if (originalReplaceState !== frameHistory.replaceState) frameHistory.pushState = originalReplaceState;
          if (originalGo !== frameHistory.go) frameHistory.go = originalGo;
        }

        App.unmount();

        // 在沙箱中嵌套时，必须销毁实例，避免第二次加载时异常
        if (isOsContext()) App.destroy();
      };
    }, [memoOptions]);

    if (appInstance) {
      appInstance.update(customProps);
    }

    const dataAttrs = {
      'data-id': name,
      'data-version': version,
      'data-loader': loaderVersion,
    };

    return (
      <>
        {
          !appInstance ? <Loading loading={loading} /> : null
        }
        {
          (sandbox && sandbox.disableFakeBody)
            ? React.createElement(tagName, { style, className, ref: appRef, ...dataAttrs })
            : React.createElement(tagName, { ...dataAttrs }, React.createElement('div', { ref: appRef, style, className }))
        }
      </>
    );
  }
}
