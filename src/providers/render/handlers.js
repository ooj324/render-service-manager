import { jsonResponse, noContentResponse } from '../../utils/response.js';
import { getAccounts, withAccount, safeParseJson, clampNumber } from '../../utils/helpers.js';
import { HTTP_STATUS, VALIDATION_CONFIG } from '../../config/constants.js';
import {
  setServicesCache,
  invalidateServicesCache,
  getAllServicesCaches,
} from '../../services/cache.js';

import {
  getServicesForAccount,
  triggerDeployment,
  getEventsForService,
  getEnvVarsForService,
  updateAllEnvVarsForService,
  updateSingleEnvVarForService,
  deleteEnvVarForService,
  getServiceDetails,
  suspendService,
  resumeService,
  restartService,
  getDeploysForService,
  cancelDeploy,
  rollbackDeploy,
  getServiceInstances,
  getServiceLogs,
  scaleServiceInstances
} from './api.js';

// ==========================================
//  Services & Deploys
// ==========================================

async function refreshAccountServices(env, account) {
  const services = await getServicesForAccount(account);
  const servicesWithAccount = services.map(service => ({
    ...service,
    accountId: account.id,
    accountName: account.name,
  }));
  await setServicesCache(env, account.id, servicesWithAccount);
  return servicesWithAccount;
}

export async function handleGetServices(request, env, ctx) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const allAccounts = await getAccounts(env);
    const accounts = allAccounts.filter(a => !a.provider || a.provider === 'render');

    if (accounts.length === 0) {
      return jsonResponse({
        services: [],
        cachedAt: null,
      });
    }

    const cacheResults = await getAllServicesCaches(env, accounts);

    let allServices = [];
    const refreshPromises = [];
    const cacheTimes = [];
    const needsSyncRefresh = [];

    for (const { accountId, account, cache } of cacheResults) {
      if (forceRefresh || !cache) {
        needsSyncRefresh.push({ accountId, account });
      } else if (cache.status === 'stale') {
        allServices.push(...cache.services);
        cacheTimes.push(cache.cachedAt);
        refreshPromises.push(refreshAccountServices(env, account));
      } else {
        allServices.push(...cache.services);
        cacheTimes.push(cache.cachedAt);
      }
    }

    if (needsSyncRefresh.length > 0) {
      const refreshResults = await Promise.allSettled(
        needsSyncRefresh.map(({ account }) => refreshAccountServices(env, account))
      );

      refreshResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allServices.push(...result.value);
          cacheTimes.push(Date.now());
        } else {
          console.error(`刷新账户 ${needsSyncRefresh[index].account.name} 失败:`, result.reason);
        }
      });
    }

    if (refreshPromises.length > 0 && ctx && ctx.waitUntil) {
      ctx.waitUntil(
        Promise.allSettled(refreshPromises).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error('后台刷新失败:', result.reason);
            }
          });
        })
      );
    }

    let oldestCacheTime = Date.now();
    if (cacheTimes.length > 0) {
      oldestCacheTime = Math.min(...cacheTimes);
    }

    allServices.sort((a, b) => {
      const accountA = (a.accountName || '').toLowerCase();
      const accountB = (b.accountName || '').toLowerCase();
      if (accountA !== accountB) return accountA < accountB ? -1 : 1;

      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (nameA !== nameB) return nameA < nameB ? -1 : 1;

      const idA = a.id || '';
      const idB = b.id || '';
      if (idA !== idB) return idA < idB ? -1 : 1;

      return 0;
    });

    return jsonResponse({
      services: allServices,
      cachedAt: oldestCacheTime,
    });
  } catch (error) {
    console.error('获取服务出错:', error);
    return jsonResponse({ error: '获取服务失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function handleDeploy(request, env) {
  try {
    const { data, error: parseError } = await safeParseJson(request);
    if (parseError) {
      return jsonResponse({ error: parseError }, HTTP_STATUS.BAD_REQUEST);
    }

    const { accountId, serviceId } = data || {};

    if (!accountId || !serviceId) {
      return jsonResponse({ error: '缺少必需参数: accountId 和 serviceId' }, HTTP_STATUS.BAD_REQUEST);
    }

    return withAccount(
      env,
      accountId,
      { notFoundMessage: '找不到账户', errorLogLabel: '触发部署出错:', errorResponseMessage: '触发部署失败' },
      async (account) => {
        const deployResult = await triggerDeployment(account, serviceId);
        await invalidateServicesCache(env, account.id);
        return jsonResponse(deployResult);
      }
    );
  } catch (error) {
    console.error('触发部署出错:', error);
    return jsonResponse({ error: '触发部署失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

// ==========================================
//  Service Control
// ==========================================

function createServiceControlHandler(apiFn, errorLogLabel, successMessage, invalidateCache = true) {
  return async (request, match, env) => {
    const [, accountId, serviceId] = match;
    return withAccount(
      env, accountId,
      { notFoundMessage: '账户不存在', errorLogLabel, errorResponseMessage: null },
      async (account) => {
        const result = await apiFn(account, serviceId);
        if (invalidateCache) {
          await invalidateServicesCache(env, account.id);
        }
        return jsonResponse({ success: true, message: successMessage, data: result });
      }
    );
  };
}

function createDeployControlHandler(apiFn, errorLogLabel, successMessage) {
  return async (request, match, env) => {
    const [, accountId, deployId] = match;
    return withAccount(
      env, accountId,
      { notFoundMessage: '账户不存在', errorLogLabel, errorResponseMessage: null },
      async (account) => {
        const result = await apiFn(account, deployId);
        await invalidateServicesCache(env, account.id);
        return jsonResponse({ success: true, message: successMessage, data: result });
      }
    );
  };
}

export async function handleGetServiceDetails(request, match, env) {
  const [, accountId, serviceId] = match;
  return withAccount(
    env, accountId,
    { notFoundMessage: '账户不存在', errorLogLabel: '获取服务详情失败:', errorResponseMessage: null },
    async (account) => {
      const service = await getServiceDetails(account, serviceId);
      return jsonResponse(service);
    }
  );
}

export const handleSuspendService = createServiceControlHandler(suspendService, '暂停服务失败:', '服务已暂停');
export const handleResumeService = createServiceControlHandler(resumeService, '恢复服务失败:', '服务已恢复');
export const handleRestartService = createServiceControlHandler(restartService, '重启服务失败:', '服务已重启');

export async function handleGetDeploys(request, match, env) {
  const [, accountId, serviceId] = match;
  return withAccount(
    env, accountId,
    { notFoundMessage: '账户不存在', errorLogLabel: '获取部署列表失败:', errorResponseMessage: null },
    async (account) => {
      const url = new URL(request.url);
      const limit = clampNumber(url.searchParams.get('limit'), 10, VALIDATION_CONFIG.MIN_LIMIT, VALIDATION_CONFIG.MAX_DEPLOY_LIMIT);
      const deploys = await getDeploysForService(account, serviceId, limit);
      return jsonResponse(deploys);
    }
  );
}

export const handleCancelDeploy = createDeployControlHandler(cancelDeploy, '取消部署失败:', '部署已取消');
export const handleRollbackDeploy = createDeployControlHandler(rollbackDeploy, '回滚部署失败:', '已回滚到此部署');


// ==========================================
//  Env Vars
// ==========================================

export async function handleGetEnvVars(request, match, env) {
  const accountNameOrId = match[1];
  const serviceId = match[2];
  return withAccount(
    env, accountNameOrId,
    { notFoundMessage: '找不到账户', errorLogLabel: '获取环境变量出错:', errorResponseMessage: '获取环境变量失败' },
    async (account) => {
      const envVars = await getEnvVarsForService(account, serviceId);
      return jsonResponse(envVars);
    }
  );
}

export async function handleUpdateAllEnvVars(request, match, env) {
  const accountNameOrId = match[1];
  const serviceId = match[2];
  return withAccount(
    env, accountNameOrId,
    { notFoundMessage: '找不到账户', errorLogLabel: '更新环境变量出错:', errorResponseMessage: '更新环境变量失败' },
    async (account) => {
      const { data: envVars, error: parseError } = await safeParseJson(request);
      if (parseError) {
        return jsonResponse({ error: parseError }, HTTP_STATUS.BAD_REQUEST);
      }
      if (!Array.isArray(envVars)) {
        return jsonResponse({ error: '环境变量必须是数组格式' }, HTTP_STATUS.BAD_REQUEST);
      }
      const result = await updateAllEnvVarsForService(account, serviceId, envVars);
      return jsonResponse(result);
    }
  );
}

export async function handleUpdateSingleEnvVar(request, match, env) {
  const accountNameOrId = match[1];
  const serviceId = match[2];
  const envVarKey = match[3];
  return withAccount(
    env, accountNameOrId,
    { notFoundMessage: '找不到账户', errorLogLabel: '更新环境变量出错:', errorResponseMessage: '更新环境变量失败' },
    async (account) => {
      const { data, error: parseError } = await safeParseJson(request);
      if (parseError) return jsonResponse({ error: parseError }, HTTP_STATUS.BAD_REQUEST);
      const { value } = data || {};
      if (value === undefined) return jsonResponse({ error: '缺少必需参数: value' }, HTTP_STATUS.BAD_REQUEST);
      
      const result = await updateSingleEnvVarForService(account, serviceId, envVarKey, value);
      return jsonResponse(result);
    }
  );
}

export async function handleDeleteEnvVar(request, match, env) {
  const accountNameOrId = match[1];
  const serviceId = match[2];
  const envVarKey = match[3];
  return withAccount(
    env, accountNameOrId,
    { notFoundMessage: '找不到账户', errorLogLabel: '删除环境变量出错:', errorResponseMessage: '删除环境变量失败' },
    async (account) => {
      await deleteEnvVarForService(account, serviceId, envVarKey);
      return noContentResponse();
    }
  );
}

// ==========================================
//  Monitoring & Events
// ==========================================

export async function handleGetInstances(request, match, env) {
  const [, accountId, serviceId] = match;
  return withAccount(
    env, accountId,
    { notFoundMessage: '账户不存在', errorLogLabel: '获取实例列表失败:', errorResponseMessage: null },
    async (account) => {
      const instances = await getServiceInstances(account, serviceId);
      return jsonResponse(instances);
    }
  );
}

export async function handleGetLogs(request, match, env) {
  const [, accountId, serviceId] = match;
  return withAccount(
    env, accountId,
    { notFoundMessage: '账户不存在', errorLogLabel: '获取日志失败:', errorResponseMessage: null },
    async (account) => {
      const url = new URL(request.url);
      const levelFilter = url.searchParams.get('level') || undefined;
      const options = {
        startTime: url.searchParams.get('startTime') || undefined,
        endTime: url.searchParams.get('endTime') || undefined,
        limit: clampNumber(url.searchParams.get('limit'), 20, VALIDATION_CONFIG.MIN_LIMIT, VALIDATION_CONFIG.MAX_DEPLOY_LIMIT)
      };

      const data = await getServiceLogs(account, serviceId, options);
      let logs = data.logs || [];

      if (levelFilter) {
        logs = logs.filter(log => {
          const levelLabel = log.labels?.find(l => l.name === 'level');
          const logLevel = (levelLabel?.value || '').toLowerCase();
          return logLevel === levelFilter.toLowerCase();
        });
      }

      const formattedLogs = logs.map(log => {
        const levelLabel = log.labels?.find(l => l.name === 'level');
        const level = levelLabel?.value || 'info';
        let message = typeof log.message === 'object' ? (log.message.message || JSON.stringify(log.message)) : (log.message || '');
        return { id: log.id, timestamp: log.timestamp, level, message };
      });

      return jsonResponse({
        logs: formattedLogs,
        hasMore: data.hasMore,
        nextStartTime: data.nextStartTime,
        nextEndTime: data.nextEndTime
      });
    }
  );
}

export async function handleScaleService(request, match, env) {
  const [, accountId, serviceId] = match;
  return withAccount(
    env, accountId,
    { notFoundMessage: '账户不存在', errorLogLabel: '扩缩容服务失败:', errorResponseMessage: null },
    async (account) => {
      const { data, error: parseError } = await safeParseJson(request);
      if (parseError) return jsonResponse({ error: parseError }, HTTP_STATUS.BAD_REQUEST);

      const numInstances = parseInt(data?.numInstances, 10);
      if (isNaN(numInstances) || numInstances < 0) return jsonResponse({ error: '无效的实例数量' }, HTTP_STATUS.BAD_REQUEST);
      if (numInstances > VALIDATION_CONFIG.MAX_INSTANCES) return jsonResponse({ error: `实例数量不能超过 ${VALIDATION_CONFIG.MAX_INSTANCES}` }, HTTP_STATUS.BAD_REQUEST);

      const result = await scaleServiceInstances(account, serviceId, numInstances);
      await invalidateServicesCache(env, account.id);
      return jsonResponse({ success: true, message: `服务已扩缩容至 ${numInstances} 个实例`, data: result });
    }
  );
}

export async function handleGetEvents(request, match, env) {
  const accountNameOrId = match[1];
  const serviceId = match[2];
  return withAccount(
    env, accountNameOrId,
    { notFoundMessage: '找不到账户', errorLogLabel: '获取事件日志出错:', errorResponseMessage: '获取事件日志失败' },
    async (account) => {
      const events = await getEventsForService(account, serviceId);
      return jsonResponse(events);
    }
  );
}
