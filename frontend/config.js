/**
 * Configuration file for HCM Chatbot Frontend
 * Manages API endpoints for different environments
 */

// Auto-detect environment and set API URLs
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '0.0.0.0';

const API_CONFIG = {
    // Development URLs (local)
    development: {
        PYTHON_AI_API: 'http://localhost:8000',
        NODEJS_API: 'http://localhost:8001'
    },
    
    // Production URLs  
    production: {
        PYTHON_AI_API: 'https://hcm-chat-2.onrender.com',
        NODEJS_API: 'https://hcm-chatbot-nodejs-api.fly.dev'
    }
};

// Export current config based on environment
const CURRENT_CONFIG = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// Export individual APIs
window.PYTHON_AI_API = CURRENT_CONFIG.PYTHON_AI_API;
window.NODEJS_API = CURRENT_CONFIG.NODEJS_API;
// Legacy support - keep old variable names for compatibility
window.DOTNET_API = CURRENT_CONFIG.NODEJS_API;
window.API_BASE_URL = CURRENT_CONFIG.NODEJS_API;

console.log('🌐 Current hostname:', window.location.hostname);
console.log('🌐 Current URL:', window.location.href);
console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');
console.log('🔧 isDevelopment flag:', isDevelopment);
console.log('🔧 Python AI API:', window.PYTHON_AI_API);
console.log('🔧 Node.js API:', window.NODEJS_API);
console.log('🔧 API Base URL:', window.API_BASE_URL);
console.log('📋 Full config:', CURRENT_CONFIG);
console.log('🚨 WARNING: Check Network tab - should NOT see localhost!');
