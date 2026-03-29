import { PING_CONFIG } from '../../config/constants.js';
import { getServicesForAccount } from './api.js';
import { getServicesCache, setServicesCache } from '../../services/cache.js';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pingService(url, retries = PING_CONFIG.MAX_RETRIES) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PING_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RenderManager-KeepAlive/1.0' }
    });
    return { url, status: response.status, success: true };
  } catch (error) {
    if (retries > 0) {
      const retryDelay = PING_CONFIG.RETRY_DELAY_MS * Math.pow(2, PING_CONFIG.MAX_RETRIES - retries);
      await delay(retryDelay);
      return pingService(url, retries - 1);
    }
    return { url, error: error.message, success: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function pingAllServicesInBatches(services) {
  const results = [];
  const batchSize = PING_CONFIG.BATCH_SIZE;

  for (let i = 0; i < services.length; i += batchSize) {
    const batch = services.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(s => pingService(s.url))
    );

    batchResults.forEach((result, idx) => {
      const service = batch[idx];
      if (result.status === 'fulfilled') {
        results.push({ id: service.id, name: service.name, ...result.value });
      } else {
        results.push({
          id: service.id,
          name: service.name,
          url: service.url,
          success: false,
          error: result.reason?.message
        });
      }
    });

    if (i + batchSize < services.length) {
      await delay(PING_CONFIG.BATCH_INTERVAL_MS);
    }
  }

  return results;
}

async function getServicesWithCache(env, account) {
  const cached = await getServicesCache(env, account.id);

  if (cached && cached.services) {
    return cached.services;
  }

  const services = await getServicesForAccount(account);
  const servicesWithAccount = services.map(service => ({
    ...service,
    accountId: account.id,
    accountName: account.name,
  }));

  await setServicesCache(env, account.id, servicesWithAccount);
  return servicesWithAccount;
}

/**
 * 独立的 Render 保活逻辑
 */
export async function keepAlive(env, accounts, checkTimeout) {
  console.log(`[Cron] 开始执行 Render 保活，账户数: ${accounts.length}`);
  
  const serviceResults = await Promise.allSettled(
    accounts.map(account => getServicesWithCache(env, account))
  );

  const allServices = [];
  serviceResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allServices.push(...result.value);
    } else {
      console.error(`[Cron] 获取账户 ${accounts[index].name} 服务失败:`, result.reason?.message);
    }
  });

  checkTimeout();

  const pingTargets = allServices.filter(s => s.url && s.suspended !== 'suspended');

  if (pingTargets.length === 0) {
    console.log('[Cron] 无可 Ping 的 Render 服务');
    return;
  }

  const results = await pingAllServicesInBatches(pingTargets);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  console.log(`[Cron] Render Ping 完成: ${successCount}/${results.length} 成功, ${failCount} 失败`);

  results.filter(r => !r.success).forEach(r => {
    console.warn(`[Cron] Ping 失败: ${r.name} (${r.url}) - ${r.error}`);
  });
}
