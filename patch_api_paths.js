const fs = require('fs');

let content = fs.readFileSync('src/views/dashboardScript.js', 'utf8');

// Replace standard render endpoints
content = content.replace(/'\/api\/services'/g, "'/api/render/services'");
content = content.replace(/'\/api\/services\?refresh=true'/g, "'/api/render/services?refresh=true'");
content = content.replace(/'\/api\/deploy`/g, "'/api/render/deploy`"); // fallback
content = content.replace(/'\/api\/deploy'/g, "'/api/render/deploy'");

// Template string replacements
content = content.replace(/`\/api\/services\//g, "`/api/render/services/");
content = content.replace(/`\/api\/deploys\//g, "`/api/render/deploys/");
content = content.replace(/`\/api\/logs\//g, "`/api/render/logs/");
content = content.replace(/`\/api\/instances\//g, "`/api/render/instances/");
content = content.replace(/`\/api\/events\//g, "`/api/render/events/");
content = content.replace(/`\/api\/env-vars\//g, "`/api/render/env-vars/");

fs.writeFileSync('src/views/dashboardScript.js', content);
