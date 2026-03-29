import {
  handleGetProjects,
  handleGetProjectDetails,
  handleControlEndpoint,
  handleGetConnectionUri,
  handleGetRolePassword,
} from './handlers.js';

export const staticRoutes = [
  { path: '/api/neon/projects', method: 'GET', handler: handleGetProjects, auth: true },
];

export const dynamicRoutes = [
  // GET /api/neon/projects/:accountId/:projectId - 分支、端点、数据库、Role
  { pattern: /^\/api\/neon\/projects\/([^\/]+)\/([^\/]+)$/, method: 'GET', handler: handleGetProjectDetails, auth: true },
  // GET /api/neon/projects/:accountId/:projectId/connection-uri - 完整连接 URI
  { pattern: /^\/api\/neon\/projects\/([^\/]+)\/([^\/]+)\/connection-uri$/, method: 'GET', handler: handleGetConnectionUri, auth: true },
  // GET /api/neon/projects/:accountId/:projectId/branches/:branchId/roles/:roleName/password - Role 密码
  { pattern: /^\/api\/neon\/projects\/([^\/]+)\/([^\/]+)\/branches\/([^\/]+)\/roles\/([^\/]+)\/password$/, method: 'GET', handler: handleGetRolePassword, auth: true },
  // POST /api/neon/projects/:accountId/:projectId/endpoints/:endpointId/(start|suspend)
  { pattern: /^\/api\/neon\/projects\/([^\/]+)\/([^\/]+)\/endpoints\/([^\/]+)\/(start|suspend)$/, method: 'POST', handler: handleControlEndpoint, auth: true },
];
