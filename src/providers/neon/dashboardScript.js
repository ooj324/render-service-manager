export const neonDashboardScript = `
window.fetchNeonProjects = async function(forceRefresh) {
  const container = document.getElementById('services-container');
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('spinning');
  }
  document.getElementById('loading').style.display = 'flex';
  container.style.display = 'none';

  try {
    const url = forceRefresh ? '/api/neon/projects?refresh=true' : '/api/neon/projects';
    const response = await apiJson(url);
    const projects = response.projects || [];
    renderNeonProjects(projects);
    if (typeof updateCacheInfo === 'function') {
      updateCacheInfo(response.cachedAt);
    }
    
    // update stats
    document.getElementById('totalServices').textContent = projects.length;
    document.getElementById('liveServices').textContent = '-';
    document.getElementById('totalAccounts').textContent = [...new Set(projects.map(p => p.accountName))].length;
  } catch (error) {
    console.error('获取 Neon 项目出错:', error);
    showNotification('加载 Neon 项目出错: ' + (error?.message || String(error)), 'error');
  } finally {
    document.getElementById('loading').style.display = 'none';
    container.style.display = 'grid';
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('spinning');
    }
  }
};

function renderNeonProjects(projects) {
  const container = document.getElementById('services-container');
  container.innerHTML = '';
  if (projects.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><h3>未找到 Neon 项目</h3><p>请去账户管理添加 Neon 账户，或前往 Neon 控制台创建项目。</p></div>';
    return;
  }
  projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = \`
      <div class="service-card-header">
        <div class="service-header-top">
          <h3 class="service-name">\${escapeHtml(p.name)}</h3>
          <div class="service-badges">
            <span class="service-type">Neon Project</span>
            <span class="account-badge">\${escapeHtml(p.accountName)}</span>
          </div>
        </div>
        <div class="service-meta">
          <div class="meta-item">\${escapeHtml(p.region_id)}</div>
          <div class="meta-item">创建于 \${new Date(p.created_at).toLocaleDateString()}</div>
        </div>
      </div>
      <div class="service-card-body">
         <div class="service-actions">
           <button class="action-btn primary view-branches-btn" style="width: 100%; justify-content: center;"
             data-project-id="\${p.id}" 
             data-account-id="\${p.accountId}" 
             data-project-name="\${escapeHtml(p.name)}">
             查看详情 (端点与分支)
           </button>
         </div>
      </div>
    \`;
    container.appendChild(card);
  });
}

document.addEventListener('click', async (e) => {
  // Open details
  if (e.target.closest('.view-branches-btn')) {
    const btn = e.target.closest('.view-branches-btn');
    openNeonProjectDetails(btn.dataset.accountId, btn.dataset.projectId, btn.dataset.projectName);
  }
  
  // Start/Suspend
  if (e.target.closest('.neon-start-btn') || e.target.closest('.neon-suspend-btn')) {
    const btn = e.target.closest('.neon-start-btn') || e.target.closest('.neon-suspend-btn');
    const action = btn.classList.contains('neon-start-btn') ? 'start' : 'suspend';
    const acc = btn.dataset.account;
    const proj = btn.dataset.project;
    const ep = btn.dataset.endpoint;
    
    btn.disabled = true;
    btn.textContent = '操作中...';
    try {
      await apiJson(\`/api/neon/projects/\${acc}/\${proj}/endpoints/\${ep}/\${action}\`, {method: 'POST'});
      showNotification('操作成功', 'success');
      // reload
      const name = document.getElementById('neonEndpointModalInfo').textContent;
      openNeonProjectDetails(acc, proj, name);
    } catch (err) {
      showNotification('操作失败: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = action === 'start' ? '启动' : '暂停';
    }
  }
  
  // Close modal
  if (e.target.closest('[data-action="close-neon-endpoint-modal"]')) {
    document.getElementById('neonEndpointModal').classList.remove('show');
  }
});

async function openNeonProjectDetails(accountId, projectId, projectName) {
  const modal = document.getElementById('neonEndpointModal');
  const info = document.getElementById('neonEndpointModalInfo');
  const container = document.getElementById('neonEndpointContainer');
  
  info.innerHTML = \`<strong>\${projectName}</strong>\`;
  container.innerHTML = '<div class="loading" style="padding: 2rem;"><div class="spinner"></div><p>加载中...</p></div>';
  modal.classList.add('show');

  try {
    const res = await apiJson(\`/api/neon/projects/\${accountId}/\${projectId}\`);
    
    let html = '<h3 style="margin-bottom: 12px; font-size: 14px; color: #64748b;">分支 (Branches)</h3><div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">';
    res.branches.forEach(b => {
      html += \`
      <div style="background: #f1f5f9; padding: 6px 12px; border-radius: 16px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M6 3v12c0 2.21 1.79 4 4 4h9" stroke="currentColor" stroke-width="2"/><circle cx="19" cy="19" r="2" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="3" r="2" stroke="currentColor" stroke-width="2"/></svg>
        \${escapeHtml(b.name)}
      </div>\`;
    });
    html += '</div>';
    
    html += '<h3 style="margin-bottom: 12px; font-size: 14px; color: #64748b;">端点控制 (Endpoints & Compute)</h3><div style="display: flex; flex-direction: column; gap: 12px;">';
    if(res.endpoints.length === 0) {
      html += '<div style="color: #94a3b8; font-size: 13px;">无端点</div>';
    }
    
    res.endpoints.forEach(ep => {
      const typeLabel = ep.type === 'read_write' ? '读写节点' : '只读节点';
      const isSuspended = ep.current_state === 'suspend' || ep.current_state === 'idle';
      const statusColor = isSuspended ? '#f59e0b' : '#10b981';
      const statusLabel = isSuspended ? '已暂停/空闲' : '运行中';
      
      html += \`
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; background: #fff;">
          <div>
            <div style="font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
              \${ep.id} <span style="font-size: 12px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 500; margin-left: 6px;">\${typeLabel}</span>
            </div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">状态: <span style="color: \${statusColor}; font-weight: 500;">\${statusLabel}</span></div>
            <div style="font-size: 12px; font-family: monospace; color: #475569; background: #f8fafc; padding: 4px 8px; border-radius: 4px;">\${ep.host}</div>
          </div>
          <div>
            \${isSuspended ? 
              \`<button class="action-btn primary neon-start-btn" style="padding: 6px 16px;" data-account="\${accountId}" data-project="\${projectId}" data-endpoint="\${ep.id}">启动计算节点</button>\` : 
              \`<button class="action-btn suspend-btn neon-suspend-btn" style="padding: 6px 16px;" data-account="\${accountId}" data-project="\${projectId}" data-endpoint="\${ep.id}">暂停节点</button>\`
            }
          </div>
        </div>
      \`;
    });
    html += '</div>';
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = \`<div class="empty-state">获取详情失败: \${err.message}</div>\`;
    console.error(err);
  }
}
`;
