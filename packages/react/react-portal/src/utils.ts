import React, { useContext, useEffect, useRef } from 'react';
import { History } from 'history';

import { Context } from './Context';

declare global {
  interface Window {
    __IS_CONSOLE_OS_CONTEXT__: boolean;
  }
}

/**
 * kernel 会为沙箱 context 注入 __IS_CONSOLE_OS_CONTEXT__
 */
declare let context: {
  __IS_CONSOLE_OS_CONTEXT__: boolean;
};

/**
 * @deprecated
 * 判断是否在微应用环境，实现上有问题，请不要再使用
 * @returns
 */
export const isOsContext = (): boolean => {
  // 关闭沙箱时，会修改主应用的 window 造成污染
  return window.__IS_CONSOLE_OS_CONTEXT__;
};

/**
 * 判断是否作为微应用的 jsBundle 加载，使用 hook 函数传入的 context 来判断
 * 用于替换 isOsContext
 */
export const isOsBundle = (): boolean => {
  try {
    if (typeof context.__IS_CONSOLE_OS_CONTEXT__ === 'undefined') {
      return window.__IS_CONSOLE_OS_CONTEXT__;
    }

    return context.__IS_CONSOLE_OS_CONTEXT__;
  } catch (e) {
    // 降级
    return window.__IS_CONSOLE_OS_CONTEXT__;
  }
};

interface IProps extends React.Attributes {
  history?: History;
  emitter?: any;
  path?: string;
  id?: string;
  [key: string]: any;
}

export const getPathNameWithQueryAndSearch = () => {
  return location.href.replace(/^.*\/\/[^/]+/, '');
};

/**
 * 移除 hash 前缀，避免 react-router history 无法识别
 * @param path
 * @returns
 */
export const removeHash = (path?: string) => {
  return path?.replace(/^\/?#/, '');
};

/**
 * 更新路由
 * @param history
 * @param path
 * @param state history.state
 * @param checkReplaceInFirstEnter
 * @returns
 */
export const updateHistory = (history: History, path: string, state?: Record<string, any>, checkReplaceInFirstEnter?: boolean) => {
  if (!history) {
    return;
  }

  const stripHashPath = removeHash(path);

  // 在开启 syncHistory 后第一次挂载前检查是否已经发生重定向，若是则不再重复更新，避免进入死循环导致 Redirect 渲染空
  // 原因：react-router Redirect 会在 render 的时候更新 history 和 location，若在 Redirect 挂载后修改 history location
  // 若新 path 无法命中路由导致重复渲染 Redirect，Redirect 将不再会重定向，而是直接返回空。
  if (history.action === 'REPLACE' && checkReplaceInFirstEnter) {
    return;
  }

  // path 和 url 不一致时才可同步，避免 rerender 导致死循环
  if (
    (path && path !== getPathNameWithQueryAndSearch())
    // react-router 的 history 可能不正确，history.location maybe undefined
    || (stripHashPath && history.location && stripHashPath.replace(/\?.*$/, '') !== history.location.pathname)
  ) {
    history.push(stripHashPath, (state && 'state' in state) ? state.state : history.location?.state);
  }
};

export function useSyncHistory(history: History) {
  const { path, syncHistory, __innerStamp, __historyState } = useContext(Context).appProps || {};
  // 上一次同步的 path
  const prevSyncPath = useRef('');
  const innerStamp = useRef('');
  const isFirstEnter = useRef(true);

  // 主子应用 path 不同或开启同步路由时，需要同步
  // 开启路由同步时，强制更新路由 updateHistory，避免微应用内部路由改变后，主应用再次跳转初始路径时不生效
  const needSync = (prevSyncPath.current !== path && path) || syncHistory;
  // render 是否是由主应用触发，需要主应用在 props 传递 __innerStamp
  // 如果是主应用触发，一定会传递 __innerStamp，兼容历史逻辑：__innerStamp 可能不存在
  const renderFromParent = typeof __innerStamp === 'undefined' || (__innerStamp && innerStamp.current !== __innerStamp);
  const renderFromSelf = typeof __innerStamp === 'undefined';

  // 注意同步路由发生在第一次 mount 后
  useEffect(() => {
    // innerStamp 没有变化，说明更新不是由主应用触发，跳过路由同步逻辑
    if (needSync && (renderFromParent || renderFromSelf)) {
      prevSyncPath.current = path;
      innerStamp.current = __innerStamp;
      updateHistory(history, path, __historyState, syncHistory && isFirstEnter.current);
    }

    isFirstEnter.current = false;

    return () => {
      // reset isFirstEnter when unmount
      isFirstEnter.current = true;
    };
  });

  return {
    isFirstEnter: isFirstEnter.current,
    needSync,
    renderFromParent,
    syncHistory,
  };
}

/**
 * Sync route with children
 * @param Comp
 * @param history
 */
export const withSyncHistory = (Comp: React.ComponentClass | React.FC, history: History) => {
  // 这里不能做 memo，不然会导致相同的 props 无法透传下去
  const Wrapper: React.FC<IProps> = (props: IProps) => {
    const { isFirstEnter, needSync, renderFromParent, syncHistory } = useSyncHistory(history);

    // 兼容历史路由同步逻辑，避免微应用初始化时因为拿不到正确的 url 渲染了错误的页面
    // 通过 needSync 判断只有在微应用路由同步时才会检测第一次渲染
    // 通过 renderFromParent 过滤掉应用本身触发的 render
    // 当主应用开启了 syncHistory 模式时不需要判断第一次渲染
    if (isFirstEnter && needSync && renderFromParent && !syncHistory) return null;

    return React.createElement(Comp, props);
  };
  Wrapper.displayName = `withSyncHistory(${Comp.displayName})`;
  return Wrapper;
};


export class Wrapper extends React.Component<IProps> {
  static displayName = 'withSyncHistory';

  componentDidMount() {
    const { history } = this.props;
    updateHistory(history, this.props.path);
  }

  componentDidUpdate(preprops) {
    const { history } = this.props;
    if (this.props.path !== preprops.path) {
      updateHistory(history, this.props.path);
    }
  }

  render() {
    const { Comp } = this.props;
    return React.createElement(Comp, this.props);
  }
}

/**
 * Sync route with children Compatible with react15
 * @param Comp
 * @param history
 */
export const withCompatibleSyncHistory = (Comp: React.ComponentClass | React.FC, history: History) => {
  const WrapperComp = (props: IProps) => React.createElement(Wrapper, {
    Comp,
    history,
    props,
  });
  return WrapperComp;
};

/**
 * 获取当前浏览器地址
 */
export const getBrowserUrl = () => {
  return window.parent.location.href;
};

/**
 * 是否是 alfa 创建的 <script />
 */
export const isAlfaScript = () => {
  return document?.currentScript?.getAttribute('data-from') === 'alfa';
};
