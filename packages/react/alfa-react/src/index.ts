export { default as Skeleton } from './components/Loading/Skeleton';
export { default as createAlfaApp, useAlfaApp } from './createAlfaApp';
export { default as createAlfaWidget, useAlfaWidget } from './createAlfaWidget';
export { eventEmitter as widgetEventEmitter } from './widget/index';
export { default as addGlobalRequestInterceptor } from './addGlobalRequestInterceptor';
export * from './utils';
export { forceCheck } from 'react-lazyload';
// todo
export { createEventBus, prefetch } from '@alicloud/alfa-core';
