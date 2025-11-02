import axios from 'axios';
import {
  MCPServerConfig,
  MCPServerConfigCreate,
  MCPServerConfigUpdate,
  ToolExecutionRequest,
  ToolExecutionResult,
  ServerStatusInfo,
  ToolInfo
} from '../types/mcp';

// Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Server Management API
export const serversAPI = {
  // List all servers
  listServers: async (): Promise<MCPServerConfig[]> => {
    const response = await api.get('/api/servers/');
    return response.data;
  },

  // Create a new server
  createServer: async (serverConfig: MCPServerConfigCreate): Promise<MCPServerConfig> => {
    const response = await api.post('/api/servers/', serverConfig);
    return response.data;
  },

  // Get a specific server
  getServer: async (serverId: number): Promise<MCPServerConfig> => {
    const response = await api.get(`/api/servers/${serverId}`);
    return response.data;
  },

  // Update a server
  updateServer: async (serverId: number, updates: MCPServerConfigUpdate): Promise<MCPServerConfig> => {
    const response = await api.put(`/api/servers/${serverId}`, updates);
    return response.data;
  },

  // Delete a server
  deleteServer: async (serverId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/servers/${serverId}`);
    return response.data;
  },

  // Connect to a server
  connectServer: async (serverId: number): Promise<{ message: string }> => {
    const response = await api.post(`/api/servers/${serverId}/connect`);
    return response.data;
  },

  // Disconnect from a server
  disconnectServer: async (serverId: number): Promise<{ message: string }> => {
    const response = await api.post(`/api/servers/${serverId}/disconnect`);
    return response.data;
  },

  // Get server status
  getServerStatus: async (serverId: number): Promise<ServerStatusInfo> => {
    const response = await api.get(`/api/servers/${serverId}/status`);
    return response.data;
  },

  // Get all server status
  getAllServerStatus: async (): Promise<ServerStatusInfo[]> => {
    const response = await api.get('/api/servers/status/all');
    return response.data;
  },

  // Test server connection
  testConnection: async (serverId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/servers/${serverId}/test-connection`);
    return response.data;
  },
};

// Tools API
export const toolsAPI = {
  // List all tools from all servers
  listAllTools: async (): Promise<{ servers: Record<number, ToolInfo[]>; total_tools: number }> => {
    const response = await api.get('/api/tools/list');
    return response.data;
  },

  // List tools from a specific server
  listServerTools: async (serverId: number): Promise<{ tools: ToolInfo[]; server_id: number; tool_count: number }> => {
    const response = await api.get(`/api/tools/servers/${serverId}/tools`);
    return response.data;
  },

  // Execute a tool
  executeTool: async (request: ToolExecutionRequest): Promise<ToolExecutionResult> => {
    const response = await api.post('/api/tools/execute', request);
    return response.data;
  },

  // Get tool schema
  getToolSchema: async (serverId: number, toolName: string): Promise<ToolInfo> => {
    const response = await api.get(`/api/tools/servers/${serverId}/tools/${toolName}/schema`);
    return response.data;
  },
};

// Health check API
export const healthAPI = {
  checkHealth: async (): Promise<{ status: string; active_connections: number }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;