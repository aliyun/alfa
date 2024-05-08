import React from 'react';
import ReactDOM from 'react-dom';
import SingleSpaReact from 'single-spa-react';
import { EventEmitter } from '@alicloud/console-os-events';

import { getPathNameWithQueryAndSearch, isOsContext, isOsBundle } from './utils';
import { Context } from './Context';
import { IContextProps } from './types';
import ErrorBoundary, { Logger } from './ErrorBoundary';

interface EmitterProps {
  emitter?: EventEmitter;
}

interface IProps {
  customProps?: EmitterProps;
  appProps?: EmitterProps;
  appDidCatch?: (error: Error) => void;
  logger?: Logger;
}

const globalEventEmitter = (data: any) => {
  window.postMessage(data.data, '*');
};

const bindEvents = (emitter: EventEmitter) => {
  emitter && emitter.on('main:postMessage', globalEventEmitter);
};

const unbindEvents = (emitter: EventEmitter) => {
  emitter && emitter.off('main:postMessage', globalEventEmitter);
};

const getProps = (props) => {
  const appProps = { ...props, ...(props.appProps || {}) };

  delete appProps.domElement;
  delete appProps.singleSpa;
  delete appProps.mountParcel;

  return appProps || {};
};

type AppComponent<T> = React.ComponentClass<T & EmitterProps, any> | React.FunctionComponent<T & EmitterProps> | string;

const exposeModuleMap: Record<string, any> = {};

export function registerExposedModule(moduleName: string, modules: any) {
  if (exposeModuleMap[moduleName]) {
    console.error('module has been registered in expose module map');
    return;
  }

  exposeModuleMap[moduleName] = modules;
}

export function mount<T extends EmitterProps>(App: AppComponent<T>, container?: Element | null, id?: string) {
  class ConsoleApp extends React.Component<EmitterProps & IProps> {
    constructor(props) {
      super(props);

      // @deprecated
      if (props.__enableInitialHistoryAction && props?.appProps?.path && props?.appProps?.path !== getPathNameWithQueryAndSearch()) {
        window.history.replaceState(null, null, props?.appProps?.path);
      }
    }

    componentDidCatch() { /* Empty */ }

    componentDidMount() { /* Empty */ }

    componentWillUnmount() { /* Empty */ }

    render() {
      const props = getProps(this.props);
      const { logger, appDidCatch } = props;
      const contextValue: IContextProps = {
        inOsSandBox: isOsContext(),
        appProps: props,
      };

      return (
        <ErrorBoundary
          logger={logger}
          appDidCatch={appDidCatch}
        >
          { Context ? (
            <Context.Provider value={contextValue}>
              <App {...Object.assign(props || {})} />
            </Context.Provider>
          ) : <App {...Object.assign(props || {})} />
          }
        </ErrorBoundary>
      );
    }
  }

  if (isOsBundle() || isOsContext()) {
    const reactLifeCycles = SingleSpaReact({
      React,
      ReactDOM,
      rootComponent: ConsoleApp,
      domElementGetter: () => document.getElementsByTagName(id)[0],
    });

    /**
     * 针对 外跳 的路由提供简单的方式通知宿主
     * @param e 点击事件
     */
    let handleExternalLinks;

    return {
      bootstrap: [
        reactLifeCycles.bootstrap,
      ],
      mount: [
        reactLifeCycles.mount,
        // 全局事件托管
        async (props) => {
          const { domElement } = props;
          const { emitter, name } = getProps(props);

          bindEvents(emitter);

          if (isOsContext()) {
            handleExternalLinks = (e: Event) => {
              const target = e.target as HTMLAnchorElement;
              if (target.tagName === 'A' && target.hasAttribute('data-alfa-external-router')) {
                e.preventDefault();
                e.stopPropagation();
                emitter && emitter.emit(`${name || id}:external-router`, target.getAttribute('href'));
              }
            };
            domElement?.addEventListener('click', handleExternalLinks, true);
          }
        },
      ],
      unmount: [
        // 注销全局事件托管
        async (props) => {
          const { domElement } = props;
          const { emitter } = getProps(props);

          unbindEvents(emitter);

          if (isOsContext() && handleExternalLinks) {
            domElement?.removeEventListener('click', handleExternalLinks, true);
            handleExternalLinks = undefined;
          }
        },
        reactLifeCycles.unmount,
      ],
      update: [
        reactLifeCycles.update,
      ],
      exposedModule: exposeModuleMap,
    };
  } else {
    ReactDOM.render(<ConsoleApp />, container);
  }
}
