// TODO: 加类型
export type BundleResolver = (require, module, exports, ...other: any[]) => any;

export interface IBundleOption {
  /*
   * module id for load
   */
  id: string;
  /*
   * module url for load
   */
  url: string;
  /**
   * context for closure
   */
  // TODO:
  context?: any;
  /**
   * some external deps for this module
   */
  deps?: {
    [key: string]: any;
  };
  // TODO: 支持 xmlrequest load
  xmlrequest?: boolean;

  noCache?: boolean;

  transform?: (source: string) => string;
}

declare global {
  interface Window {
    __CONSOLE_OS_GLOBAL_HOOK__: (string, BundleResolver, script) => any;
    __CONSOLE_OS_WHITE_LIST__: string[];
    __CONSOLE_OS_GLOBAL_VARS_: object;
  }
}