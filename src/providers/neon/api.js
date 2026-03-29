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
 * @returns {Promise<Object>} 用户信息和权限
 */
export async function testApiKey(apiKey) {
  // 尝试获取项目列表作为认证测试
  const response = await fetchWithRetry(`${NEON_API_BASE}/projects`, getOptions(apiKey, 'GET'));
  if (!response || !Array.isArray(response.projects)) {
    throw new Error('API 响应格式无法识别');
  }
  return {
    success: true,
    ownerType: 'user',
    ownerName: 'Neon Account',
    ownerEmail: 'verified@neon.tech'
  };
}
/**
 * 获取项目列表
 * @param {string} apiKey - Neon API 密钥
 * @returns {Promise<Array>} 项目列表
 */
export async function listProjects(apiKey) {
  const data = await fetchWithRetry(`${NEON_API_BASE}/projects`, getOptions(apiKey));
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
