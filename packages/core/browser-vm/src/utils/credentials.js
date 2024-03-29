function isSameOriginUrl(str, origin) {
  try {
    // str 的格式可以被解析成 url
    const url = new URL(str);
    return url.origin === origin;
  } catch (e) { /**/ }

  try {
    // str 是相对路径或绝对路径，无法被解析成 url
    const url = new URL(str, origin);
    return url.origin === origin;
  } catch (e) {
    return false;
  }
}

// 某些情况下，请求静态资源需要带 cookie
export const getFetchCredentials = (url) => {
  // 兼容历史逻辑
  if (url.includes('console.aliyun.com') || url.includes('console.alibabacloud.com')) {
    return 'include';
  }

  // 同域请求
  if (isSameOriginUrl(url, location && location.origin)) {
    return 'include';
  }

  return 'omit';
};
