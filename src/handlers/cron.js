import { getAccounts } from '../utils/helpers.js';
import { providers } from '../providers/registry.js';
import { CRON_CONFIG } from '../config/constants.js';

/**
 * 定时任务主处理函数
 * @param {Object} env - 环境变量
 * @param {AbortSignal} signal - 可选的中止信号
 */
export async function handleScheduled(env, signal) {
  const startTime = Date.now();

  const checkTimeout = () => {
    if (signal?.aborted) {
      throw new Error('Cron 任务已超时');
    }
    if (Date.now() - startTime > CRON_CONFIG.TIMEOUT_MS) {
      throw new Error('Cron 任务执行超时');
    }
  };

  try {
    const allAccounts = await getAccounts(env);
    if (allAccounts.length === 0) {
      console.log('[Cron] 无账户配置，跳过');
      return;
    }

    checkTimeout();

    for (const [providerKey, providerDef] of Object.entries(providers)) {
      if (!providerDef.needsKeepAlive) {
        continue;
      }

      const providerAccounts = allAccounts.filter(a => a.provider === providerKey);
      if (providerAccounts.length === 0) {
        continue;
      }

      try {
        const keepAliveModule = await providerDef.keepAlive();
        if (keepAliveModule && keepAliveModule.keepAlive) {
          await keepAliveModule.keepAlive(env, providerAccounts, checkTimeout);
        }
      } catch (err) {
        console.error(`[Cron] 运行 provider [${providerKey}] 的保活任务失败:`, err);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] 任务总计耗时 ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Cron] 任务异常终止 (${duration}ms):`, error.message);
  }
}
