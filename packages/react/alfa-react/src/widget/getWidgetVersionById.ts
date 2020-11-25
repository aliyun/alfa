import axios from 'axios';
import template from 'lodash/template';

import { AlfaFactoryOption, WidgetReleaseConfig } from '../types';

export let cachedRelease: Record<string, any> | null = null;

const WIDGET_ENTRY_URL = 'https://g.alicdn.com/${id}/${version}/index.js';

const normalizeEntryUrl = (id: string, version: string) => {
  const gitRepoId = id.replace('@ali/', '').replace('widget-', 'widget/')
  return template(WIDGET_ENTRY_URL)({id: gitRepoId, version})
}

export const getWidgetVersionById = async (option: AlfaFactoryOption) => {
  if (!option.version) {
    throw new Error('No Version for Widget')
  }
  if (!option.version.endsWith('.x')) {
    return {
      version: option.version,
      entryUrl: normalizeEntryUrl(option.name, option.version)
    }
  }

  if (!cachedRelease) {
    const resp = await axios.get<WidgetReleaseConfig>('https://cws.alicdn.com/release.json');
    cachedRelease = resp.data;
  }

  const version = cachedRelease[option.name][option.version].latest;

  return {
    version,
    entryUrl: normalizeEntryUrl(option.name, version)
  }
}