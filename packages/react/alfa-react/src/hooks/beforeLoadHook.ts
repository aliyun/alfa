import { IAppConfig, getConfig, getI18nMessages, IWin } from '@alicloud/alfa-core';

import { getConsoleConfig } from '../utils/getConsoleConfig';
import { getConsoleGlobal } from '../utils/getConsoleGlobal';

interface IAliyunWin extends IWin {
  ALIYUN_WIND_MESSAGE?: Partial<Record<string, string>>;
}

// inject consoleConfig & locales after load
async function afterLoadHook(appConfig: IAppConfig) {
  const { app, logger, sandbox, dynamicConfig } = appConfig;

  const defaultConsoleConfig = (window as IWin).ALIYUN_CONSOLE_CONFIG || {};
  const defaultConsoleGlobal = (window as IWin).ALIYUN_CONSOLE_GLOBAL || {};

  const CONFIG_START_TIME = Date.now();
  let CONFIG_END_TIME = Date.now();

  if (dynamicConfig) {
    const configData = await getConfig(appConfig);

    const [consoleConfig, consoleGlobal, messages] = await Promise.all([
      getConsoleConfig(configData, defaultConsoleConfig),
      getConsoleGlobal(configData, defaultConsoleGlobal),
      getI18nMessages(appConfig),
    ]);

    CONFIG_END_TIME = Date.now();

    const i18nMessages = {
      ...(window as IAliyunWin).ALIYUN_CONSOLE_I18N_MESSAGE,
      ...messages,
    };

    // inject global variables when sandbox is valid
    if (app?.context && !sandbox?.disable) {
      (app.context.window as IAliyunWin).ALIYUN_CONSOLE_CONFIG = consoleConfig;
      (app.context.window as IAliyunWin).ALIYUN_CONSOLE_GLOBAL = consoleGlobal;
      (app.context.window as IAliyunWin).ALIYUN_CONSOLE_I18N_MESSAGE = i18nMessages;
      (app.context.window as IAliyunWin).ALIYUN_WIND_MESSAGE = (window as IAliyunWin).ALIYUN_WIND_MESSAGE;
    }
  } else if (app?.context && !sandbox?.disable) {
    (app.context.window as IAliyunWin).ALIYUN_CONSOLE_CONFIG = defaultConsoleConfig;
    (app.context.window as IAliyunWin).ALIYUN_CONSOLE_GLOBAL = defaultConsoleGlobal;
    (app.context.window as IAliyunWin).ALIYUN_CONSOLE_I18N_MESSAGE = (window as IAliyunWin).ALIYUN_CONSOLE_I18N_MESSAGE;
    (app.context.window as IAliyunWin).ALIYUN_WIND_MESSAGE = (window as IAliyunWin).ALIYUN_WIND_MESSAGE;
  }

  const overrides = sandbox?.overrideGlobalVars;

  if (overrides && app) {
    Object.entries(overrides).forEach(([key, value]) => {
      (app.context.window as any)[key] = value;
    });
  }

  logger?.record && logger.record({
    CONFIG_START_TIME,
    CONFIG_END_TIME,
    COST: CONFIG_END_TIME - CONFIG_START_TIME,
  });

  return appConfig;
}

export default afterLoadHook;
