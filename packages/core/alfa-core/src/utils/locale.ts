import { getCookie } from '@alicloud/cookie';

import { IWin } from '../types';

const globalLocale = 'en_US';

const localeMap: Record<string, string> = {
  zh: 'zh_CN',
  en: 'en_US',
  ja: 'ja_JP',
  'zh-TW': 'zh_TW',
  ko: 'ko_KR',
  fr: 'fr_FR',
  de: 'de_DE',
};

/**
 * 1. x-X-Y to x_X_Y
 * 2. zh to zh_CN
 * @param key
 * @returns
 */
const formatLocale = (key: string) => {
  return localeMap[key] ? localeMap[key] : key.replace('-', '_');
};

/**
 * getLocale
 * @returns
 */
export const getLocale = (key?: string): string => {
  return formatLocale(
    key || (window as IWin)?.ALIYUN_CONSOLE_CONFIG?.LOCALE || getCookie('aliyun_lang') || globalLocale,
  );
};
