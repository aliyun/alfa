import React from 'React';
import { createMicroApp, IAppConfig } from '@alicloud/alfa-core';

export interface AlfaVersion {
  entry: string;
}

type Version = string;

export interface AlfaReleaseConfig {
  versions: Record<Version, AlfaVersion>;
  'dist-tag': Record<string, string>;
}

export type EnvEnum = 'prod' | 'local' | 'pre' | 'daily';
export interface AlfaFactoryOption extends IAppConfig {
  // name: string;
  // version?: string;
  // env?: EnvEnum;
  // url?: string;
  // manifest?: string;
  // deps?: Record<string, any>;
  /**
   * oneConsole 渠道
   */
  channel?: string;
  loading?: boolean | React.ReactChild;
  dependencies?: Record<string, any>;
  // style for container root
  className?: string;
  /**
   * @deprecated
   * 根节点样式
   */
  style?: Record<string, any>;
  unstable_runtime?: {
    css?: Record<string, string>;
    js?: Record<string, string>;
  };
  /**
   * 关闭缓存模式
   */
  noCache?: boolean;
  /**
   * 开启业务配置加载
   */
  dynamicConfig?: boolean;
  /**
   * @deprecated
   * used in cwsWidget
   */
  runtimeVersion?: string;
  /**
   * @deprecated
   */
  fallbackRender?: (error?: Error) => Element;
  /**
   * 延迟加载
   */
  delay?: number | (() => Promise<any>);
  /**
   * 优先级
   * - high: 在 mount 前尽可能早的加载
   * - medium: mount 后开始加载
   * - low: 懒加载，出现在视窗内开始加载
   */
  priority?: 'high' | 'medium' | 'low';
  /**
   * 懒加载配置，配合 priority low 使用
   */
  lazyLoad?: {
    /**
     * 相对于视窗偏移位置就开始加载
     */
    offset?: number | number[] | undefined;
    throttle?: number | boolean | undefined;
    debounce?: number | boolean | undefined;
    /**
     * 占位
     */
    placeholder?: React.ReactNode | undefined;
    /**
     * 监听 scroll 事件的节点，当父节点设置 overflow 时会导致 window 无法监听到 scroll 事件
     */
    scrollContainer?: string | Element | undefined;
  };
}

// export interface CommonProps {
//   /**
//    * @deprecated
//    */
//   sandbox?: Record<string, any>;
//   /**
//    * 处理外跳链接
//    * @param url
//    * @returns
//    */
//   handleExternalLink?: (url?: string) => void;
//   /**
//    * 根节点样式
//    */
//   style?: React.CSSProperties;
//   /**
//    * render when throw error
//    */
//   fallbackRender?: (error?: Error) => Element;
// }

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

export type MicroApplication = ThenArg<ReturnType<typeof createMicroApp>>;


export interface AlfaEnvConfigDescriptor {
  releaseUrl: string;
  configUrl?: string;
  cdnBackupUrl?: string;
  resourceUrl?: string;
}

export interface AlfaEnvConfig {
  daily: AlfaEnvConfigDescriptor;
  local: AlfaEnvConfigDescriptor;
  pre: AlfaEnvConfigDescriptor;
  prod: AlfaEnvConfigDescriptor;
}

/**
 * 兼容 cws widget 的配置
 */

export interface WidgetReleaseConfig {
  [id: string]: {
    [version: string]: {
      latest: string;
    };
  };
}

type OmitKeys = 'manifest';

export interface WidgetFactoryOption extends Omit<AlfaFactoryOption, OmitKeys> {
  runtimeVersion?: string;
  alfaLoader?: boolean;

  // 加载 XConsole 样式
  theme?: string;

  // 加载中心化 release 文件
  central?: boolean;

  host?: string;

  configHost?: string;
}

export interface WidgetCWSConfig {
  conf: {
    [channel: string]: {
      [key: string]: string;
    };
  };
  features: {
    [channel: string]: {
      [key: string]: boolean;
    };
  };
  links: {
    [channel: string]: {
      [key: string]: string;
    };
  };
  locales: {
    [locale: string]: {
      messages: {
        [key: string]: string;
      };
    };
  };
}

export interface WidgetRuntime {
  react: any;
  reactDom: any;
  axios: any;
  'prop-types': any;
  '@ali/wind': any;
  '@ali/wind-utils-console': any;
  '@ali/wind-intl': any;
  '@ali/wind-intl/lib/Provider': any;
  '@ali/wind-intl/lib/withRcIntl': any;
  '@ali/widget-utils-console': any;
}
