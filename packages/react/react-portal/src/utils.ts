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

export const removeHash = (path?: string) => {
  return path?.replace(/^\/?#/, '');
};

export const updateHistory = (history: History, path: string, state?: Record<string, any>) => {
  if (!history) {
    return;
  }

  // 移除 hash 前缀，避免 react-router history 无法识别
  const stripHashPath = removeHash(path);

  // 检测 path 是否一致
  if (
    (path && path !== getPathNameWithQueryAndSearch())
    // react-router 的 history 可能不正
    // history.location maybe undefined
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
  const needSync = (prevSyncPath.current !== path && path) || syncHistory;
  // render 是否是由主应用触发，需要主应用在 props 传递 __innerStamp
  // 如果是主应用触发，一定会传递 __innerStamp
  const renderFromParent = typeof __innerStamp === 'undefined' || (__innerStamp && innerStamp.current !== __innerStamp);

  useEffect(() => {
    // 开启路由同步时，强制更新 history，避免微应用内部路由改变后，主应用再次跳转初始路径时不生效
    // innerStamp 没有变化，说明更新不是由主应用触发，跳过路由同步逻辑
    if (needSync && renderFromParent) {
      prevSyncPath.current = path;
      innerStamp.current = __innerStamp;
      updateHistory(history, path, __historyState);
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
    const { isFirstEnter, needSync, renderFromParent } = useSyncHistory(history);

    // 第一次 render 时，如果需要同步路由，则返回 null，避免渲染错误的页面:
    // 第一次渲染发生 redirect 时修改 path 导致再次进入重定向逻辑, <Redirect /> 只在 onmount 时才会修改路由
    // 故而重复渲染 <Redirect /> 是无效的
    if (isFirstEnter && needSync && renderFromParent) return null;

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
    if (this.props.path != preprops.path) {
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
