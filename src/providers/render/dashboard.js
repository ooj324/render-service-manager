/**
 * Render 提供商的特定面板视图和模态框
 */

export function renderDashboardPartials() {
  return `
  <!-- Render 环境变量模态框 -->
  <div id="envVarsModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <div class="modal-title-section">
            <h2 class="modal-title">环境变量</h2>
            <button class="modal-close" data-action="close-env-vars-modal" type="button">×</button>
          </div>
          <div class="modal-service-info" id="modalServiceInfo">
            <!-- 服务信息将在这里插入 -->
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div id="envVarsContainer" class="env-var-list">
          <!-- 环境变量将在这里加载 -->
        </div>

        <div class="add-env-var-section">
          <div class="add-env-var-header">
            <h3>添加新变量</h3>
            <button class="add-env-btn" data-action="toggle-add-form" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span id="toggleFormText">添加</span>
            </button>
          </div>
          <div class="add-env-var-form" id="addEnvVarForm">
            <div class="add-env-var-inputs">
              <div class="add-env-var-field">
                <label class="add-env-var-label">键</label>
                <input type="text" id="newEnvVarKey" class="add-env-var-input" placeholder="VARIABLE_NAME">
              </div>
              <div class="add-env-var-field add-env-var-field-value">
                <label class="add-env-var-label">值</label>
                <input type="text" id="newEnvVarValue" class="add-env-var-input" placeholder="variable_value">
              </div>
            </div>
            <div class="add-env-var-actions">
              <button class="form-btn secondary" data-action="toggle-add-form" type="button">取消</button>
              <button class="form-btn primary" data-action="add-env-var" type="button">保存</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Render 事件日志模态框 -->
  <div id="eventsModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <div class="modal-title-section">
            <h2 class="modal-title">事件日志</h2>
            <button class="modal-close" data-action="close-events-modal" type="button">×</button>
          </div>
          <div class="modal-service-info" id="eventsModalServiceInfo">
            <!-- 服务信息将在这里插入 -->
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div id="eventsContainer" class="events-list">
          <!-- 事件日志将在这里加载 -->
        </div>
      </div>
    </div>
  </div>

  <!-- Render 部署历史模态框 -->
  <div id="deploysModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <div class="modal-title-section">
            <h2 class="modal-title">部署历史</h2>
            <button class="modal-close" data-action="close-deploys-modal" type="button">×</button>
          </div>
          <div class="modal-service-info" id="deploysModalServiceInfo">
            <!-- 服务信息将在这里插入 -->
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div id="deploysContainer" class="deploys-list">
          <!-- 部署历史将在这里加载 -->
        </div>
      </div>
    </div>
  </div>

  <!-- Render 日志查看模态框 -->
  <div id="logsModal" class="modal">
    <div class="modal-content modal-wide">
      <div class="modal-header">
        <div>
          <div class="modal-title-section">
            <h2 class="modal-title">服务日志</h2>
            <button class="modal-close" data-action="close-logs-modal" type="button">×</button>
          </div>
          <div class="modal-service-info" id="logsModalServiceInfo">
            <!-- 服务信息将在这里插入 -->
          </div>
        </div>
      </div>
      <div class="logs-toolbar">
        <div class="logs-filters">
          <div class="filter-group">
            <label class="filter-label">级别</label>
            <select id="logLevelFilter" class="filter-select">
              <option value="">全部</option>
              <option value="error">错误</option>
              <option value="warn">警告</option>
              <option value="info">信息</option>
              <option value="debug">调试</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">数量</label>
            <select id="logLimitFilter" class="filter-select">
              <option value="20" selected>20 条</option>
              <option value="50">50 条</option>
              <option value="100">100 条</option>
              <option value="200">200 条</option>
            </select>
          </div>
        </div>
        <div class="logs-right-controls">
          <button class="auto-refresh-toggle" id="autoRefreshToggle" data-action="toggle-auto-refresh" type="button" title="自动刷新">
            <span class="toggle-dot"></span>
            <span id="autoRefreshText">自动刷新</span>
          </button>
          <button class="refresh-btn" data-action="refresh-logs" type="button" title="刷新日志">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="modal-body logs-body">
        <div id="logsContainer" class="logs-container">
          <!-- 日志将在这里加载 -->
        </div>
      </div>
    </div>
  </div>

  <!-- Render 实例管理模态框 -->
  <div id="instancesModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <div class="modal-title-section">
            <h2 class="modal-title">实例管理</h2>
            <button class="modal-close" data-action="close-instances-modal" type="button">×</button>
          </div>
          <div class="modal-service-info" id="instancesModalServiceInfo">
            <!-- 服务信息将在这里插入 -->
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div id="instancesContainer" class="instances-container">
          <!-- 实例信息将在这里加载 -->
        </div>
        <div class="scale-section" id="scaleSection" style="display: none;">
          <h3>扩缩容</h3>
          <div class="scale-controls">
            <button class="scale-btn" data-action="adjust-scale" data-delta="-1" type="button">-</button>
            <input type="number" id="scaleInput" min="0" max="10" value="1" class="scale-input">
            <button class="scale-btn" data-action="adjust-scale" data-delta="1" type="button">+</button>
            <button class="action-btn primary" data-action="apply-scale" type="button">应用</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}
