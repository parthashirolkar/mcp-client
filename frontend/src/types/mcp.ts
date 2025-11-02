export enum ConnectionType {
  STDIO = 'stdio',
  HTTP = 'http'
}

export enum ServerStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface MCPServerConfig {
  id: number;
  name: string;
  connection_type: ConnectionType;
  command?: string;
  args: string[];
  url?: string;
  headers: Record<string, string>;
  timeout: number;
  retry_count: number;
  enabled: boolean;
  status: ServerStatus;
  last_error?: string;
  created_at: string;
  updated_at?: string;
}

export interface MCPServerConfigCreate {
  name: string;
  connection_type: ConnectionType;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retry_count?: number;
  enabled?: boolean;
}

export interface MCPServerConfigUpdate {
  name?: string;
  connection_type?: ConnectionType;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retry_count?: number;
  enabled?: boolean;
}

export interface ToolArgument {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

export interface ToolInfo {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface ToolExecutionRequest {
  server_id: number;
  tool_name: string;
  arguments: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  execution_time?: number;
}

export interface WSMessage {
  type: string;
  data: Record<string, any>;
}

export interface ServerStatusUpdate {
  server_id: number;
  status: ServerStatus;
  message?: string;
}

export interface ServerStatusInfo {
  id: number;
  name: string;
  status: ServerStatus;
  last_error?: string;
  tool_count: number;
  enabled: boolean;
}