import { NEON_API_BASE, API_CONFIG } from '../../config/constants.js';
import { fetchWithRetry } from '../../services/fetchClient.js';

/**
 * 构造请求头
 * @param {string} apiKey - Neon API 密钥
 * @returns {Headers}
 */
function buildHeaders(apiKey) {
  return new Headers({
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  });
}

/**
 * 获取请求基础选项
 * @param {string} apiKey - Neon API 密钥
 * @param {string} method - 请求方法
 * @param {Object} [body] - 请求体
 * @returns {Object} fetch options
 */
function getOptions(apiKey, method = 'GET', body = null) {
  const options = {
    method,
    headers: buildHeaders(apiKey),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return options;
}

/**
 * 测试 API Key 配置
 * @param {string} apiKey - Neon API 密钥
 * @param {string} [orgId] - 组织 ID（可选）
 * @returns {Promise<Object>} 用户信息和权限
 */
export async function testApiKey(apiKey, orgId) {
  const url = orgId
    ? `${NEON_API_BASE}/projects?org_id=${encodeURIComponent(orgId)}`
    : `${NEON_API_BASE}/projects`;
  const response = await fetchWithRetry(url, getOptions(apiKey, 'GET'));
  if (!response || !Array.isArray(response.projects)) {
    throw new Error('API 响应格式无法识别');
  }
  return {
    success: true,
    ownerType: orgId ? 'organization' : 'user',
    ownerName: orgId ? orgId : 'Neon Account',
    ownerEmail: orgId ? `org:${orgId}` : 'verified@neon.tech',
  };
}

/**
 * 获取项目列表
 * @param {string} apiKey - Neon API 密钥
 * @param {string} [orgId] - 组织 ID（可选）
 * @returns {Promise<Array>} 项目列表
 */
export async function listProjects(apiKey, orgId) {
  const url = orgId
    ? `${NEON_API_BASE}/projects?org_id=${encodeURIComponent(orgId)}`
    : `${NEON_API_BASE}/projects`;
  const data = await fetchWithRetry(url, getOptions(apiKey));
  return data?.projects || [];
}

/**
 * 获取单个项目详情
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @returns {Promise<Object>} 项目详情
 */
export async function getProject(apiKey, projectId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}`, getOptions(apiKey));
  return data?.project || null;
}

/**
 * 删除项目
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteProject(apiKey, projectId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}`, getOptions(apiKey, 'DELETE'));
  return data?.project || null;
}

/**
 * 获取分支列表
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @returns {Promise<Array>} 分支列表
 */
export async function listBranches(apiKey, projectId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}/branches`, getOptions(apiKey));
  return data?.branches || [];
}

/**
 * 获取端点列表
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @returns {Promise<Array>} 端点列表
 */
export async function listEndpoints(apiKey, projectId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}/endpoints`, getOptions(apiKey));
  return data?.endpoints || [];
}

/**
 * 启动端点
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @param {string} endpointId - 端点 ID
 * @returns {Promise<Object>} 启动结果
 */
export async function startEndpoint(apiKey, projectId, endpointId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}/endpoints/${endpointId}/start`, getOptions(apiKey, 'POST'));
  return data?.endpoint || null;
}

/**
 * 暂停端点
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @param {string} endpointId - 端点 ID
 * @returns {Promise<Object>} 暂停结果
 */
export async function suspendEndpoint(apiKey, projectId, endpointId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}/endpoints/${endpointId}/suspend`, getOptions(apiKey, 'POST'));
  return data?.endpoint || null;
}

/**
 * 获取数据库列表
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @param {string} branchId - 分支 ID
 * @returns {Promise<Array>} 数据库列表
 */
export async function listDatabases(apiKey, projectId, branchId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}/branches/${branchId}/databases`, getOptions(apiKey));
  return data?.databases || [];
}

/**
 * 获取 Role 列表
 * @param {string} apiKey - Neon API 密钥
 * @param {string} projectId - 项目 ID
 * @param {string} branchId - 分支 ID
 * @returns {Promise<Array>} Role 列表
 */
export async function listRoles(apiKey, projectId, branchId) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects/${projectId}/branches/${branchId}/roles`, getOptions(apiKey));
  return data?.roles || [];
}

/**
 * 获取数据库完整连接 URI（含密码）
 * @param {string} apiKey
 * @param {string} projectId
 * @param {string} branchId
 * @param {string} endpointId
 * @param {string} database
 * @param {string} roleName
 * @param {boolean} [pooled=false]
 * @returns {Promise<string>} 连接 URI
 */
export async function getConnectionUri(apiKey, projectId, branchId, endpointId, database, roleName, pooled = false) {
  const params = new URLSearchParams({
    branch_id: branchId,
    endpoint_id: endpointId,
    database_name: database,
    role_name: roleName,
    pooled: pooled ? 'true' : 'false',
  });
  const data = await fetchWithRetry(
    `${NEON_API_BASE}/projects/${projectId}/connection_uri?${params.toString()}`,
    getOptions(apiKey)
  );
  return data?.uri || null;
}

/**
 * 获取 Role 密码（明文）
 * @param {string} apiKey
 * @param {string} projectId
 * @param {string} branchId
 * @param {string} roleName
 * @returns {Promise<string>} 密码
 */
export async function getRolePassword(apiKey, projectId, branchId, roleName) {
  const data = await fetchWithRetry(
    `${NEON_API_BASE}/projects/${projectId}/branches/${branchId}/roles/${encodeURIComponent(roleName)}/reveal_password`,
    getOptions(apiKey)
  );
  return data?.password || null;
}
