import {
  handleGetProjects,
  handleGetProjectDetails,
  handleControlEndpoint
} from './handlers.js';

export const staticRoutes = [
  // 静态路由
  { path: '/api/neon/projects', method: 'GET', handler: handleGetProjects, auth: true },
];

export const dynamicRoutes = [
  // 动态路由
  { pattern: /^\/api\/neon\/projects\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handleGetProjectDetails, auth: true },
  { pattern: /^\/api\/neon\/projects\/([^\/]+)\/([^\/]+)\/endpoints\/([^\/]+)\/(start|suspend)$/, method: 'POST', handler: handleControlEndpoint, auth: true },
];
