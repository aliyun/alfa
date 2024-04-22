import { AlfaConfig, IWin } from '@alicloud/alfa-core';
import md5 from 'crypto-js/md5';

/**
 * transform
 * @param features
 */
const processFeatures = (features: AlfaConfig['ALL_FEATURE_STATUS']) => {
  if (!features) return {};

  return Object.keys(features).reduce<Partial<Record<string, boolean>>>((newFeatures, key) => {
    const feature = features?.[key];

    if (!feature) return newFeatures;

    const uid = (window as IWin).ALIYUN_CONSOLE_CONFIG?.MAIN_ACCOUNT_PK || '';
    const md5Uid = md5(uid).toString();

    const {
      enableBlockList, enableSampling, enableWhiteList, sampling, blockList, whiteList,
    } = feature;

    if (enableBlockList && blockList?.includes(md5Uid)) {
      newFeatures[key] = false;
    } else if (enableWhiteList && whiteList?.includes(md5Uid)) {
      newFeatures[key] = true;
    } else if (enableSampling) {
      const gray = uid.substring(uid.length - 2);

      if (Number(gray) >= (sampling ?? 0) * 100 || sampling === 0) {
        newFeatures[key] = false;
      } else {
        newFeatures[key] = true;
      }
    } else {
      newFeatures[key] = false;
    }

    return newFeatures;
  }, {});
};

const getRegions = (regions: string[] | { region?: string[] }) => {
  if (!Array.isArray(regions) && regions.region) {
    return regions.region || [];
  }

  return [];
};

const processChannelFeatures = (allChannelFeatures: AlfaConfig['ALL_CHANNEL_FEATURE_STATUS'], channel: string) => {
  const channelFeatures = allChannelFeatures?.[channel];

  if (!channelFeatures) return {};

  return Object.keys(channelFeatures).reduce<Record<string, {
    status: boolean;
    attribute: {
      customAttrs: Record<string, unknown>;
      regions: string[] | {
        region: string[];
      };
    };
  }>>((newChannelFeatures, key) => {
    const channelFeature = channelFeatures[key];

    if (!channelFeature) return newChannelFeatures;

    if (newChannelFeatures) {
      const { status, attribute } = channelFeature;

      newChannelFeatures[key] = {
        status,
        attribute: {
          ...attribute,
          regions: getRegions(channelFeature.attribute.regions),
        },
      };
    }

    return newChannelFeatures;
  }, {});
};

const mergeConfigDataWithConsoleConfig = (
  configData: AlfaConfig,
  consoleConfig: IWin['ALIYUN_CONSOLE_CONFIG'],
  passInChannel?: string,
) => {
  const channel = passInChannel || (window as IWin)?.ALIYUN_CONSOLE_CONFIG?.CHANNEL || 'OFFICIAL';
  const channelLinks = configData.ALL_CHANNEL_LINKS?.[channel];
  const channelFeatures = configData.ALL_CHANNEL_FEATURE_STATUS;
  const features = configData.ALL_FEATURE_STATUS;

  return {
    ...consoleConfig,
    CHANNEL_LINKS: {
      ...consoleConfig?.CHANNEL_LINKS,
      ...channelLinks,
    },
    CHANNEL_FEATURE_STATUS: {
      ...consoleConfig?.CHANNEL_FEATURE_STATUS,
      ...processChannelFeatures(channelFeatures, channel),
    },
    FEATURE_STATUS: {
      ...consoleConfig?.FEATURE_STATUS,
      ...processFeatures(features),
    },
  };
};

export const getConsoleConfig = async (configData: AlfaConfig, consoleConfig: any, channel?: string) => {
  return mergeConfigDataWithConsoleConfig(configData, consoleConfig, channel);
};
