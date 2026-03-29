/**
 * Provider 注册中心
 * 集中管理所有支持的服务提供商
 */

export const providers = {
  render: {
    name: 'Render',
    needsKeepAlive: true,
    api: () => import('./render/api.js'),
    handlers: () => import('./render/handlers.js'),
    routes: () => import('./render/routes.js'),
    keepAlive: () => import('./render/keepAlive.js'),
    dashboard: () => import('./render/dashboard.js'),
  },
  neon: {
    name: 'Neon',
    needsKeepAlive: false,
    api: () => import('./neon/api.js'),
    handlers: () => import('./neon/handlers.js'),
    routes: () => import('./neon/routes.js'),
    dashboard: () => import('./neon/dashboard.js'),
  }
};

/**
 * 获取指定 provider 的配置
 * @param {string} providerId 
 * @returns {Object|null}
 */
export function getProvider(providerId) {
  return providers[providerId] || null;
}
