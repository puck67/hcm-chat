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
        DOTNET_API: 'http://localhost:9000/api'
    },
    
    // Production URLs  
    production: {
        PYTHON_AI_API: 'https://hcm-chat-2.onrender.com',
        DOTNET_API: 'https://hcm-webapi-full.fly.dev'
    }
};

// Export current config based on environment
const CURRENT_CONFIG = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// Export individual APIs
window.PYTHON_AI_API = CURRENT_CONFIG.PYTHON_AI_API;
window.DOTNET_API = CURRENT_CONFIG.DOTNET_API;

console.log('🌐 Current hostname:', window.location.hostname);
console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');
console.log('🔧 Python AI API:', window.PYTHON_AI_API);
console.log('🔧 .NET API:', window.DOTNET_API);
console.log('📋 Full config:', CURRENT_CONFIG);
