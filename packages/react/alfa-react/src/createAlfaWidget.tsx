import React, { useMemo } from 'react';
import LazyLoad from 'react-lazyload';
import { BaseLoader } from '@alicloud/alfa-core';

import ErrorBoundary from './components/ErrorBoundary';
import { createCWSWidget } from './widget';
import { AlfaFactoryOption } from './types';
import createApplication from './createApplication';
import beforeResolveHook from './hooks/beforeResolveHook';
import beforeLoadHook from './hooks/beforeLoadHook';
import { isOneConsole } from './helpers/oneConsole';
import Loading from './components/Loading';
import { IS_SSR } from './utils';
import type { IApplicationCustomProps } from './createApplication';

const loader = BaseLoader.create();

loader.beforeResolve.use(beforeResolveHook);
loader.beforeLoad.use(beforeLoadHook);
loader.beforeLoad.use(async (appConfig) => {
  const { app } = appConfig;

  if (app && app.context) {
    // disable history
    (app.context.history as any) = {};
  }

  return appConfig;
});

type IProps = Omit<IApplicationCustomProps, 'consoleBase' | 'path' | 'appConfig'>;

const Application = createApplication(loader);

function createAlfaWidget<P = any>(option: AlfaFactoryOption): React.FC<any> {
  const {
    name, dependencies, priority, dynamicConfig,
    manifest, loading, lazyLoad, delay,
  } = option || {};

  if (name.match(/@ali\/widget-/)) {
    // TODO load style
    return createCWSWidget<P>(option);
  }

  // check app option
  if (!name) return () => null;

  let preLoader: () => Promise<any>;

  if (priority === 'high' && !IS_SSR) {
    const p = loader.register({
      ...option,
      // 必须设置 container，否则沙箱会创建插入一个新的 body
      container: document.body,
      dynamicConfig: typeof dynamicConfig === 'boolean' ? dynamicConfig : !manifest,
    });

    preLoader = async () => p;
  }

  const passedInOption = { ...option };

  // 非 oneConsole 环境下设置 iframe 沙箱地址为 about:blank
  // 避免沙箱创建失败
  if (passedInOption.sandbox && !passedInOption.sandbox.sandBoxUrl && !isOneConsole()) {
    passedInOption.sandbox.sandBoxUrl = 'about:blank';
  }

  const useDelay = () => {
    return useMemo(() => {
      if (typeof delay === 'number') {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, delay);
        });
      }

      if (typeof delay === 'function') {
        const fnReturn = delay();
        if (typeof fnReturn.then === 'function') return fnReturn;
        if (typeof fnReturn === 'number') return fnReturn;
      }

      return undefined;
    }, []);
  };

  if (priority === 'low' && !IS_SSR) {
    return (props: P & IProps) => {
      const delayPromise = useDelay();

      // Compatible with old logic
      // props should not passed in errorBoundary
      return (
        <LazyLoad
          placeholder={<Loading loading={loading} />}
          {...{ ...lazyLoad }}
        >
          <ErrorBoundary {...props}>
            <Application
              {...passedInOption}
              delayPromise={delayPromise}
              style={props.style || passedInOption.style}
              deps={dependencies || {}}
              customProps={{ ...props }}
              preLoader={preLoader}
            />
          </ErrorBoundary>
        </LazyLoad>
      );
    };
  }

  return (props: P & IProps) => {
    const delayPromise = useDelay();

    // Compatible with old logic
    // props should not passed in errorBoundary
    return (
      <ErrorBoundary {...props}>
        <Application
          {...passedInOption}
          delayPromise={delayPromise}
          style={props.style || passedInOption.style}
          deps={dependencies || {}}
          customProps={{ ...props }}
          preLoader={preLoader}
        />
      </ErrorBoundary>
    );
  };
}

/**
 * create memorized app in react function component, just create App after first mounted
 * @param option
 * @returns
 */
export function useAlfaWidget<P = any>(option: AlfaFactoryOption, deps?: any[]) {
  const App = useMemo(() => createAlfaWidget<P>(option), deps || [option?.name, option?.version]);

  return App;
}

export default createAlfaWidget;
