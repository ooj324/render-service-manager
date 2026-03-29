import { API_CONFIG } from '../config/constants.js';

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取重试延迟时间
 * @param {Response} response - 响应对象
 * @param {number} attempt - 当前尝试次数
 * @returns {number} - 延迟毫秒数
 */
function getRetryDelayMs(response, attempt) {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }
  }
  return 500 * attempt;
}

/**
 * 发起带重试的 API 请求
 * @param {string} url - 请求地址
 * @param {Object} options - fetch 选项
 * @param {Object} config - 配置 { timeoutMs, maxAttempts }
 * @returns {Promise<Object|null>} - 响应数据
 */
export async function fetchWithRetry(url, options, { timeoutMs = API_CONFIG.TIMEOUT_MS, maxAttempts = API_CONFIG.MAX_ATTEMPTS } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });

      // 如果是 429 或 5xx 错误，尝试重试
      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        // 消费响应体以确保连接正确关闭
        await response.text().catch(() => {});
        await sleep(getRetryDelayMs(response, attempt));
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API 请求失败 (${response.status}): ${text || response.statusText}`);
      }

      if (response.status === 204) {
        return null;
      }

      // 处理可能为空的响应体
      const text = await response.text();
      if (!text || text.trim() === '') {
        return null;
      }

      return JSON.parse(text);
    } catch (error) {
      if (error?.name === 'AbortError' && attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('请求失败: 超出重试次数');
}
