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
  const { name, dependencies, priority, dynamicConfig, manifest } = option || {};

  if (name.match(/@ali\/widget-/)) {
    // TODO load style
    return createCWSWidget<P>(option);
  }

  // check app option
  if (!name) return () => null;

  let preLoader: () => Promise<any>;

  if (priority === 'high') {
    const p = loader.register({
      ...option,
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

  if (priority === 'low') {
    return (props: P & IProps) => (
      // Compatible with old logic
      // props should not passed in errorBoundary
      <LazyLoad height={1} once>
        <ErrorBoundary {...props}>
          <Application
            {...passedInOption}
          // name={name}
            style={props.style || passedInOption.style}
            deps={dependencies || {}}
            customProps={{ ...props }}
            preLoader={preLoader}
          />
        </ErrorBoundary>
      </LazyLoad>
    );
  }

  return (props: P & IProps) => (
    // Compatible with old logic
    // props should not passed in errorBoundary
    <ErrorBoundary {...props}>
      <Application
        {...passedInOption}
          // name={name}
        style={props.style || passedInOption.style}
        deps={dependencies || {}}
        customProps={{ ...props }}
        preLoader={preLoader}
      />
    </ErrorBoundary>
  );
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
