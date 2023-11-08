import React, { useRef, useEffect, useState, useMemo } from 'react';
import { BaseLoader, createEventBus } from '@alicloud/alfa-core';

import Loading from './components/Loading';
import { normalizeName } from './utils';
import { countRegister } from './utils/counter';
import { AlfaFactoryOption, MicroApplication } from './types';
import { version as loaderVersion } from './version';

interface IProps<C = any> extends AlfaFactoryOption {
  customProps: C & {
    // xconsole 的 consoleBase 配置
    consoleBase?: any;
    // 指定子应用 path
    path?: string;
    // 注入给子应用的 history 对象，不建议再使用
    __injectHistory?: any;
    // 内部时间戳，用于主子应用确认主应用是否需要更新
    __innerStamp?: string;
    // 主应用的 history.state，每次更新需要同步
    __historyState?: string;
    // 处理外部链接跳转
    handleExternalLink?: (href: string) => void;
  };
  syncHistory?: boolean;
  basename?: string;
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

const eventBus = createEventBus();

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

const addLeftSlash = (path: string) => {
  return path.charAt(0) === '/' ? path : `/${ path}`;
};

/**
 * 从 path 移除 basename 部分
 * @param path
 * @param basename
 * @returns string
 */
const stripBasename = (path: string, basename?: string) => {
  if (!basename) return path;

  const _path = resolvePath(path);
  const _basename = resolvePath(basename);

  if (_path === _basename) return '/';
  // escape all possible regex special characters
  return _path.replace(new RegExp(`^${_basename.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1')}`, 'ig'), '');
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
      syncHistory, basename,
    } = props;
    const { handleExternalLink } = customProps;
    const [appInstance, setAppInstance] = useState<MicroApplication | null>(null);
    const [, setError] = useState(null);
    const appRef = useRef<HTMLElement | undefined>(undefined);
    const $syncHistory = useRef(syncHistory);
    const $basename = useRef(basename);
    const tagName = normalizeName(props.name);
    const [releaseVersion, setReleaseVersion] = useState('');

    $syncHistory.current = syncHistory;
    $basename.current = basename;

    // if (customProps.__innerStamp) console.warn('Please do not use __innerStamp which used in internal.');
    // 更新标记，保证每次更新都会更新
    customProps.__innerStamp = (+new Date()).toString(36);
    customProps.__historyState = history.state;

    if (customProps.path) customProps.path = addLeftSlash(customProps.path);

    // 受控模式锁定一些参数
    if ($syncHistory.current) {
      // 禁止子应用和 consoleBase 通信
      customProps.consoleBase = null;
      // 覆写 path 参数，用于通知子应用更新路由
      customProps.path = addLeftSlash(stripBasename(peelPath(window.location), $basename.current));
      // 禁止注入 history
      customProps.__injectHistory = null;
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
        // 配置沙箱初始化 path
        initialPath: customSandbox?.initialPath || customProps.path,
        syncInitHref: !!$syncHistory.current,
      };
    }, [customSandbox, customProps.path]);

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
        (popstateEvent as unknown as { state: string }).state = history.state;

        App?.context.baseFrame?.contentWindow?.dispatchEvent(popstateEvent);
      };

      /**
       * 因为要兼容历史逻辑，所以这段逻辑并不会执行
       * react-router 的路由监听 callback 会先执行并更新子应用内部路由
       * @returns
       */
      const updateAppHistory = () => {
        if (App) {
          const nextPath = peelPath(App.context.location);

          // 路由同步只应该在相同 basename 下生效
          if (!peelPath(window.location).startsWith($basename.current || '')) return;

          // 如果主子应用路径不同，主动通知子应用 popstate 事件
          if (nextPath !== stripBasename(peelPath(window.location), $basename.current)) {
            if (originalReplaceState) {
              originalReplaceState(history.state, '', stripBasename(peelPath(window.location), $basename.current));
              dispatchFramePopstate();
            }
          }
        }
      };

      // 受控模式下，返回不会触发子应用内的路由更新，需要主动通知
      if ($syncHistory.current) window.addEventListener('popstate', updateAppHistory);

      (async () => {
        countRegister(memoOptions.name);

        const fakeBody = memoOptions.container || appRef.current || document.body;

        const { app, logger, version: realVersion } = await loader.register<C>({
          ...memoOptions,
          container: fakeBody,
        });

        setReleaseVersion(realVersion || 'unknown');

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
        app.context.updateBody?.(memoOptions.sandbox.disableFakeBody ? document.body : fakeBody);

        const { path } = memoOptions.props as Record<string, any>;
        const frameWindow = app.context.baseFrame?.contentWindow;

        if (frameWindow) {
          originalPushState = frameWindow?.history.pushState;
          originalReplaceState = frameWindow?.history.replaceState;
          originalGo = frameWindow?.history.go;
          // update context history according to path
          if (path) originalReplaceState(history.state, '', path.replace(/\/+/g, '/'));

          if (frameWindow) {
            frameWindow.history.pushState = (data, unused, _url) => {
              if ($syncHistory.current) {
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
              if ($syncHistory.current) {
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

        await app.mount(fakeBody, {
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

        if ($syncHistory.current) window.removeEventListener('popstate', updateAppHistory);

        if (!App) return;

        const frameHistory = App.context.baseFrame?.contentWindow?.history;

        if (frameHistory) {
          if (originalPushState !== frameHistory.pushState) frameHistory.pushState = originalPushState;
          if (originalReplaceState !== frameHistory.replaceState) frameHistory.replaceState = originalReplaceState;
          if (originalGo !== frameHistory.go) frameHistory.go = originalGo;
        }

        App.unmount();

        // TODO: 在沙箱中嵌套时，unmount 必须销毁沙箱实例，避免在其它微应用中复用该沙箱，导致环境变量污染
        // if (isOsContext()) App.destroy();
      };
    }, [memoOptions]);

    useEffect(() => {
      const _handleExternalLink = (href: string) => {
        handleExternalLink?.(href);
      };

      eventBus.on(`${normalizeName(name)}:external-router`, _handleExternalLink);

      return () => {
        eventBus.removeListener(`${normalizeName(name)}:external-router`, _handleExternalLink);
      };
    }, [handleExternalLink, name]);

    if (appInstance) {
      appInstance.update(customProps);
    }

    const dataAttrs = {
      'data-id': name,
      // 加载器版本
      'data-loader': loaderVersion,
      // 请求版本
      'data-request-version': version || 'latest',
      // 实际线上版本
      'data-release-version': releaseVersion,
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
  };
}
