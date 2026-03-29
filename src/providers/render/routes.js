import * as handlers from './handlers.js';

/**
 * 静态路由配置 (前缀: /api/render)
 */
export const staticRoutes = [
  { path: '/api/render/services', method: 'GET', handler: handlers.handleGetServices, auth: true },
  { path: '/api/render/deploy', method: 'POST', handler: handlers.handleDeploy, auth: true },
];

/**
 * 动态路由配置 (前缀: /api/render)
 * 路由匹配结果中的 group 应该包含需要的参数
 */
export const dynamicRoutes = [
  // 事件和环境变量路由
  { pattern: /^\/api\/render\/events\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handlers.handleGetEvents, auth: true },
  { pattern: /^\/api\/render\/env-vars\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handlers.handleGetEnvVars, auth: true },
  { pattern: /^\/api\/render\/env-vars\/([^\/]+)\/([^\/]+)$/, method: 'PUT', handler: handlers.handleUpdateAllEnvVars, auth: true },
  { pattern: /^\/api\/render\/env-vars\/([^\/]+)\/([^\/]+)\/(.+)$/, method: 'PUT', handler: handlers.handleUpdateSingleEnvVar, auth: true },
  { pattern: /^\/api\/render\/env-vars\/([^\/]+)\/([^\/]+)\/(.+)$/, method: 'DELETE', handler: handlers.handleDeleteEnvVar, auth: true },
  // 服务控制路由
  { pattern: /^\/api\/render\/services\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handlers.handleGetServiceDetails, auth: true },
  { pattern: /^\/api\/render\/services\/([^\/]+)\/([^\/]+)\/suspend$/, method: 'POST', handler: handlers.handleSuspendService, auth: true },
  { pattern: /^\/api\/render\/services\/([^\/]+)\/([^\/]+)\/resume$/, method: 'POST', handler: handlers.handleResumeService, auth: true },
  { pattern: /^\/api\/render\/services\/([^\/]+)\/([^\/]+)\/restart$/, method: 'POST', handler: handlers.handleRestartService, auth: true },
  // 部署管理路由
  { pattern: /^\/api\/render\/deploys\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handlers.handleGetDeploys, auth: true },
  { pattern: /^\/api\/render\/deploys\/([^\/]+)\/([^\/]+)\/cancel$/, method: 'POST', handler: handlers.handleCancelDeploy, auth: true },
  { pattern: /^\/api\/render\/deploys\/([^\/]+)\/([^\/]+)\/rollback$/, method: 'POST', handler: handlers.handleRollbackDeploy, auth: true },
  // 监控路由
  { pattern: /^\/api\/render\/instances\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handlers.handleGetInstances, auth: true },
  { pattern: /^\/api\/render\/logs\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handlers.handleGetLogs, auth: true },
  { pattern: /^\/api\/render\/services\/([^\/]+)\/([^\/]+)\/scale$/, method: 'POST', handler: handlers.handleScaleService, auth: true },
];
