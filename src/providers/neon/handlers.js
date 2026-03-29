import {
  listProjects,
  listBranches,
  listEndpoints,
  listDatabases,
  listRoles,
  startEndpoint,
  suspendEndpoint,
  getConnectionUri,
  getRolePassword,
} from './api.js';
import { jsonResponse } from '../../utils/response.js';
import { getAccounts } from '../../utils/helpers.js';
import { HTTP_STATUS } from '../../config/constants.js';

/**
 * 获取所有 Neon 项目
 */
export async function handleGetProjects(request, env) {
  try {
    const accounts = await getAccounts(env, 'neon');
    if (accounts.length === 0) {
      return jsonResponse({ projects: [], cachedAt: Date.now() });
    }

    const projectsPromises = accounts.map(async (account) => {
      try {
        const p = await listProjects(account.apiKey, account.orgId || null);
        return p.map(project => ({
          ...project,
          accountId: account.id,
          accountName: account.name,
          provider: 'neon'
        }));
      } catch (err) {
        console.error(`无法获取 Neon 账户 ${account.name} 的项目:`, err);
        return [];
      }
    });

    const results = await Promise.all(projectsPromises);
    const allProjects = results.flat();

    return jsonResponse({ projects: allProjects, cachedAt: Date.now() });
  } catch (error) {
    console.error('获取 Neon 项目列表失败:', error);
    return jsonResponse({ error: '获取项目列表失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * 获取单个项目的子资源（分支、端点、数据库、Role）
 */
export async function handleGetProjectDetails(request, match, env) {
  const accountId = match[1];
  const projectId = match[2];

  try {
    const accounts = await getAccounts(env, 'neon');
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      return jsonResponse({ error: '未找到 Neon 账户' }, HTTP_STATUS.NOT_FOUND);
    }

    const [branches, endpoints] = await Promise.all([
      listBranches(account.apiKey, projectId),
      listEndpoints(account.apiKey, projectId),
    ]);

    // 获取默认分支的 databases 和 roles
    let databases = [];
    let roles = [];
    if (branches.length > 0) {
      const defaultBranch = branches.find(b => b.primary) || branches[0];
      [databases, roles] = await Promise.all([
        listDatabases(account.apiKey, projectId, defaultBranch.id),
        listRoles(account.apiKey, projectId, defaultBranch.id),
      ]);
    }

    return jsonResponse({ branches, endpoints, databases, roles });
  } catch (error) {
    console.error('获取 Neon 项目详情失败:', error);
    return jsonResponse({ error: '获取项目详情失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * 管理端点状态 (start 或 suspend)
 */
export async function handleControlEndpoint(request, match, env) {
  const accountId = match[1];
  const projectId = match[2];
  const endpointId = match[3];
  const action = match[4]; // 'start' or 'suspend'

  try {
    const accounts = await getAccounts(env, 'neon');
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      return jsonResponse({ error: '未找到 Neon 账户' }, HTTP_STATUS.NOT_FOUND);
    }

    let result;
    if (action === 'start') {
      result = await startEndpoint(account.apiKey, projectId, endpointId);
    } else if (action === 'suspend') {
      result = await suspendEndpoint(account.apiKey, projectId, endpointId);
    } else {
      return jsonResponse({ error: '未知操作' }, HTTP_STATUS.BAD_REQUEST);
    }

    return jsonResponse({ success: true, endpoint: result });
  } catch (error) {
    console.error(`管理 Neon 端点 (${action}) 失败:`, error);
    return jsonResponse({ error: `操作失败: ${error.message}` }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * 获取数据库完整连接 URI（含密码）
 * Route: GET /api/neon/projects/:accountId/:projectId/connection-uri
 * Query: branch_id, endpoint_id, database_name, role_name, pooled
 */
export async function handleGetConnectionUri(request, match, env) {
  const accountId = match[1];
  const projectId = match[2];

  try {
    const accounts = await getAccounts(env, 'neon');
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      return jsonResponse({ error: '未找到 Neon 账户' }, HTTP_STATUS.NOT_FOUND);
    }

    const url = new URL(request.url);
    const branchId = url.searchParams.get('branch_id');
    const endpointId = url.searchParams.get('endpoint_id');
    const database = url.searchParams.get('database_name');
    const roleName = url.searchParams.get('role_name');
    const pooled = url.searchParams.get('pooled') === 'true';

    if (!branchId || !endpointId || !database || !roleName) {
      return jsonResponse({ error: '缺少必要参数: branch_id, endpoint_id, database_name, role_name' }, HTTP_STATUS.BAD_REQUEST);
    }

    const uri = await getConnectionUri(account.apiKey, projectId, branchId, endpointId, database, roleName, pooled);
    return jsonResponse({ uri });
  } catch (error) {
    console.error('获取 Neon 连接 URI 失败:', error);
    return jsonResponse({ error: `获取连接信息失败: ${error.message}` }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * 获取 Role 密码（明文）
 * Route: GET /api/neon/projects/:accountId/:projectId/branches/:branchId/roles/:roleName/password
 */
export async function handleGetRolePassword(request, match, env) {
  const accountId = match[1];
  const projectId = match[2];
  const branchId = match[3];
  const roleName = match[4];

  try {
    const accounts = await getAccounts(env, 'neon');
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      return jsonResponse({ error: '未找到 Neon 账户' }, HTTP_STATUS.NOT_FOUND);
    }

    const password = await getRolePassword(account.apiKey, projectId, branchId, roleName);
    return jsonResponse({ password });
  } catch (error) {
    console.error('获取 Neon Role 密码失败:', error);
    return jsonResponse({ error: `获取密码失败: ${error.message}` }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
