import { BundleResolver } from '../type';

// 模块加载记录，加载成功后销毁该记录
export class Record<T = any> {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  promise: Promise<T>;
  // 模块是否加载成功，初始时为 false
  loaded: boolean;
  // 加载错误信息
  error: any;
  deps: {
    [key: string]: any;
  };
  context: any;
  // 唯一 id，用来绑定上下文和 script 脚本的关系
  uuid: string;
}

export class Module {
  static record: Map<string, Record> = new Map<string, Record>();
  /**
   * unique identity for module
   */
  readonly id: string;

  /**
   * parent who load this module. it is main by default.
   * but when A bundle use loader to load B bundle, parent
   * of B is A;
   */
  readonly parent: string;

  /**
   * export object of the module
   */
  exports;

  readonly filename: string;
  readonly exited: boolean;

  loaded: boolean;

  context: any;
  resolver: BundleResolver;
  private cache: Map<string, Module> = new Map<string, Module>();

  constructor(id: string, parent: string) {
    this.id = id;
    this.exports = {};
    this.parent = parent;

    this.filename = id;
    this.loaded = false;
  }

  resolved = (id: string) => {
    return this.cache.has(id);
  };

  require = (id: string) => {
    const module = this.resolveModule(id);
    return this.context?.window[id] || module.exports;
  };

  requireIsolateWithContext(id: string, context: any) {
    const module = this.resolveModule(id);
    module.resolver(module.require, module, module.exports, { ...context });
    return module.exports;
  }

  resolveModule(id: string, parent: string = null) {
    const cachedModule = this.cache.get(id);
    if (cachedModule !== undefined) {
      return cachedModule;
    }

    const module = new Module(id, parent);
    this.cache.set(id, module);
    return module;
  }
}
