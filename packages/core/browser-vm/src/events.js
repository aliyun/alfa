import { isSSR } from './utils/isSSR';

const rawAddEventListener = !isSSR() ? window.addEventListener : () => {};
const rawRemoveEventListener = !isSSR() ? window.removeEventListener : () => {};

export const domEventsListeningTo = [
  'webkitmouseforcedown', 'webkitmouseforcewillbegin', 'visibilitychange', 'error',
  'mousemove', 'mousedown', 'mouseup', 'touchcancel', 'touchend', 'touchstart', 'auxclick',
  'dblclick', 'pointercancel', 'pointerdown', 'pointerup', 'dragend', 'dragstart', 'drop',
  'compositionend', 'compositionstart', 'keydown', 'keypress', 'keyup', 'input', 'textInput',
  'close', 'cancel', 'copy', 'cut', 'paste', 'click', 'change', 'contextmenu', 'reset', 'submit',
  'resize', 'scroll', 'foucs', 'blur',
];

export const addEventListener = (context) => (type, listener, options) => {
  const listeners = context._listenerMap.get(type) || [];
  context._listenerMap.set(type, [...listeners, listener]);

  if (domEventsListeningTo.indexOf(type) === -1) {
    return context.baseFrame.addEventListener.apply(context.baseFrame.contentWindow, [type, listener, options]);
  }
  return rawAddEventListener.apply(window, [type, listener, options]);
};

export const removeEventListener = (context) => (type, listener, options) => {
  const storedTypeListeners = context._listenerMap.get(type);
  if (storedTypeListeners && storedTypeListeners.length && storedTypeListeners.indexOf(listener) !== -1) {
    storedTypeListeners.splice(storedTypeListeners.indexOf(listener), 1);
  }

  if (domEventsListeningTo.indexOf(type) === -1) {
    return context.baseFrame.removeEventListener.apply(context.baseFrame.contentWindow, [type, listener, options]);
  }
  return rawRemoveEventListener.apply(window, [type, listener, options]);
};
