import { jsonResponse } from '../utils/response.js';
import { getAccounts, saveAccounts, generateAccountId, getApiKeyPreview, safeParseJson } from '../utils/helpers.js';
import { providers } from '../providers/registry.js';
import { HTTP_STATUS, PROVIDER_TYPES } from '../config/constants.js';

export async function handleGetAccounts(request, env) {
  try {
    const accounts = await getAccounts(env);

    const safeAccounts = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      provider: acc.provider || PROVIDER_TYPES.RENDER,
      email: acc.email || '',
      ownerName: acc.ownerName || acc.name,
      apiKeyPreview: getApiKeyPreview(acc.apiKey),
      createdAt: acc.createdAt || new Date().toISOString(),
      updatedAt: acc.updatedAt,
    }));

    return jsonResponse(safeAccounts);
  } catch (error) {
    console.error('获取账户列表出错:', error);
    return jsonResponse({ error: '获取账户列表失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function handleAddAccount(request, env) {
  try {
    const { data, error: parseError } = await safeParseJson(request);
    if (parseError) {
      return jsonResponse({ error: parseError }, HTTP_STATUS.BAD_REQUEST);
    }

    const { name, apiKey, provider = PROVIDER_TYPES.RENDER } = data || {};

    if (!name || !name.trim()) {
      return jsonResponse({ error: '账户名称不能为空' }, HTTP_STATUS.BAD_REQUEST);
    }

    if (!apiKey || !apiKey.trim()) {
      return jsonResponse({ error: 'API Key 不能为空' }, HTTP_STATUS.BAD_REQUEST);
    }

    const providerDef = providers[provider];
    if (!providerDef) {
       return jsonResponse({ error: '不支持的提供商类型' }, HTTP_STATUS.BAD_REQUEST);
    }

    let ownerInfo;
    try {
      const apiModule = await providerDef.api();
      ownerInfo = await apiModule.testApiKey(apiKey.trim());
    } catch (error) {
      return jsonResponse({
        error: 'API Key 无效或无法连接到提供商 API'
      }, HTTP_STATUS.BAD_REQUEST);
    }

    const accounts = await getAccounts(env);

    if (accounts.some(acc => acc.name.toLowerCase() === name.trim().toLowerCase())) {
      return jsonResponse({ error: '账户名称已存在' }, HTTP_STATUS.BAD_REQUEST);
    }

    // 对于同一个 provider，检查 email 或者 ownerId 是否冲突
    const isConflict = accounts.some(acc => 
      (acc.provider || PROVIDER_TYPES.RENDER) === provider && 
      (acc.email === ownerInfo.ownerEmail || acc.ownerId === ownerInfo.ownerId)
    );
    if (isConflict) {
      return jsonResponse({ error: `该 ${providerDef.name} 账户已添加` }, HTTP_STATUS.BAD_REQUEST);
    }

    const newAccount = {
      id: generateAccountId(),
      provider: provider,
      name: name.trim(),
      apiKey: apiKey.trim(),
      email: ownerInfo.ownerEmail,
      ownerName: ownerInfo.ownerName,
      ownerId: ownerInfo.ownerId,
      ownerType: ownerInfo.ownerType,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    await saveAccounts(accounts, env);

    return jsonResponse({
      id: newAccount.id,
      provider: newAccount.provider,
      name: newAccount.name,
      email: newAccount.email,
      ownerName: newAccount.ownerName,
      apiKeyPreview: getApiKeyPreview(newAccount.apiKey),
      createdAt: newAccount.createdAt
    });
  } catch (error) {
    console.error('添加账户出错:', error);
    return jsonResponse({ error: '添加账户失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function handleUpdateAccount(request, match, env) {
  try {
    const accountId = match[1];
    const { data, error: parseError } = await safeParseJson(request);
    if (parseError) {
      return jsonResponse({ error: parseError }, HTTP_STATUS.BAD_REQUEST);
    }

    const { name, apiKey } = data || {};

    const accounts = await getAccounts(env);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);

    if (accountIndex === -1) {
      return jsonResponse({ error: '账户不存在' }, HTTP_STATUS.NOT_FOUND);
    }
    
    const account = accounts[accountIndex];
    const provider = account.provider || PROVIDER_TYPES.RENDER;
    const providerDef = providers[provider];

    let needsSave = false;

    if (name && name.trim()) {
      const nameExists = accounts.some((acc, idx) =>
        idx !== accountIndex && acc.name.toLowerCase() === name.trim().toLowerCase()
      );

      if (nameExists) {
        return jsonResponse({ error: '账户名称已存在' }, HTTP_STATUS.BAD_REQUEST);
      }

      account.name = name.trim();
      needsSave = true;
    }

    if (apiKey && apiKey.trim()) {
      let ownerInfo;
      try {
        const apiModule = await providerDef.api();
        ownerInfo = await apiModule.testApiKey(apiKey.trim());
      } catch (error) {
        return jsonResponse({
          error: 'API Key 无效或无法连接到 API'
        }, HTTP_STATUS.BAD_REQUEST);
      }

      const emailExists = accounts.some((acc, idx) =>
        idx !== accountIndex && 
        (acc.provider || PROVIDER_TYPES.RENDER) === provider && 
        acc.email === ownerInfo.ownerEmail
      );

      if (emailExists) {
        return jsonResponse({ error: `该 ${providerDef.name} 账户已被其他账户使用` }, HTTP_STATUS.BAD_REQUEST);
      }

      account.apiKey = apiKey.trim();
      account.email = ownerInfo.ownerEmail;
      account.ownerName = ownerInfo.ownerName;
      account.ownerId = ownerInfo.ownerId;
      account.ownerType = ownerInfo.ownerType;
      needsSave = true;
    }

    if (!needsSave) {
      return jsonResponse({ error: '没有要更新的内容' }, HTTP_STATUS.BAD_REQUEST);
    }

    account.updatedAt = new Date().toISOString();
    await saveAccounts(accounts, env);

    return jsonResponse({
      id: account.id,
      provider: account.provider,
      name: account.name,
      email: account.email,
      ownerName: account.ownerName,
      apiKeyPreview: getApiKeyPreview(account.apiKey),
      updatedAt: account.updatedAt
    });
  } catch (error) {
    console.error('更新账户出错:', error);
    return jsonResponse({ error: '更新账户失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function handleDeleteAccount(request, match, env) {
  try {
    const accountId = match[1];

    const accounts = await getAccounts(env);
    const filteredAccounts = accounts.filter(acc => acc.id !== accountId);

    if (filteredAccounts.length === accounts.length) {
      return jsonResponse({ error: '账户不存在' }, HTTP_STATUS.NOT_FOUND);
    }

    await saveAccounts(filteredAccounts, env);

    return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  } catch (error) {
    console.error('删除账户出错:', error);
    return jsonResponse({ error: '删除账户失败' }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function handleTestAccount(request, env) {
  try {
    const { data, error: parseError } = await safeParseJson(request);
    if (parseError) {
      return jsonResponse({ error: parseError }, HTTP_STATUS.BAD_REQUEST);
    }

    const { apiKey, provider = PROVIDER_TYPES.RENDER } = data || {};

    if (!apiKey || !apiKey.trim()) {
      return jsonResponse({ error: 'API Key 不能为空' }, HTTP_STATUS.BAD_REQUEST);
    }
    
    const providerDef = providers[provider];
    if (!providerDef) {
       return jsonResponse({ error: '不支持的提供商类型' }, HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const apiModule = await providerDef.api();
      const ownerInfo = await apiModule.testApiKey(apiKey.trim());
      return jsonResponse({
        success: true,
        message: 'API Key 有效',
        ownerName: ownerInfo.ownerName,
        ownerEmail: ownerInfo.ownerEmail,
        ownerType: ownerInfo.ownerType
      });
    } catch (error) {
      return jsonResponse({
        success: false,
        error: 'API Key 无效或无法连接到 API'
      }, HTTP_STATUS.BAD_REQUEST);
    }
  } catch (error) {
    console.error('测试账户连接出错:', error);
    return jsonResponse({
      error: '测试连接失败'
    }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
