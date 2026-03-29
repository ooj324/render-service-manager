import { neonDashboardScript } from './dashboardScript.js';

export function renderDashboardPartials() {
  return `
  <!-- Neon Endpoint Control Modal -->
  <div id="neonEndpointModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <div class="modal-title-section">
            <h2 class="modal-title">端点管理</h2>
            <button class="modal-close" data-action="close-neon-endpoint-modal" type="button">×</button>
          </div>
          <div class="modal-service-info" id="neonEndpointModalInfo">
            <!-- 信息将在这里插入 -->
          </div>
        </div>
      </div>
      <div class="modal-body">
        <div id="neonEndpointContainer" class="instances-container">
          <!-- 端点操作面板将在这里加载 -->
        </div>
      </div>
    </div>
  </div>
  `;
}

export { neonDashboardScript };
