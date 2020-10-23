const rawAddEventListener = window.addEventListener;
const rawRemoveEventListener = window.removeEventListener;

export const domEventsListeningTo = ['resize', 'scroll', 'foucs', 'blur'];

export const addEventListener = (context) => (type, listener, options) => {
  const listeners = context._listenerMap.get(type) || [];
  context._listenerMap.set(type, [...listeners, listener]);

  if (domEventsListeningTo.indexOf(type) === -1) {
    return context.baseFrame.addEventListener.apply(context.baseFrame.contentWindow, [type, listener, options]);
  }
  return rawAddEventListener.apply(window, [type, listener, options]);
}

export const removeEventListener = (context) => (type, listener, options) => {
  const storedTypeListeners = context._listenerMap.get(type);
  if (storedTypeListeners && storedTypeListeners.length && storedTypeListeners.indexOf(listener) !== -1) {
    storedTypeListeners.splice(storedTypeListeners.indexOf(listener), 1);
  }

  if (domEventsListeningTo.indexOf(type) === -1) {
    return context.baseFrame.removeEventListener.apply(context.baseFrame.contentWindow, [type, listener, options]);
  }
  return rawRemoveEventListener.apply(window, [type, listener, options]);
}