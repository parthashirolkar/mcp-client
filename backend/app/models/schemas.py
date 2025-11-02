from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class ConnectionType(str, Enum):
    STDIO = "stdio"
    HTTP = "http"


class ServerStatus(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


# MCP Server Configuration
class MCPServerConfigBase(BaseModel):
    name: str = Field(..., description="Human-readable name for the MCP server")
    connection_type: ConnectionType = Field(
        ..., description="Type of connection (stdio or http)"
    )

    # For stdio connections
    command: Optional[str] = Field(
        None, description="Command to execute for stdio connections"
    )
    args: Optional[List[str]] = Field(
        default_factory=list, description="Arguments for stdio command"
    )

    # For HTTP connections
    url: Optional[str] = Field(None, description="URL for HTTP connections")
    headers: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="HTTP headers"
    )

    # Common configuration
    timeout: int = Field(default=30, description="Connection timeout in seconds")
    retry_count: int = Field(default=3, description="Number of retry attempts")
    enabled: bool = Field(default=True, description="Whether this server is enabled")


class MCPServerConfigCreate(MCPServerConfigBase):
    pass


class MCPServerConfigUpdate(BaseModel):
    name: Optional[str] = None
    connection_type: Optional[ConnectionType] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    timeout: Optional[int] = None
    retry_count: Optional[int] = None
    enabled: Optional[bool] = None


class MCPServerConfig(MCPServerConfigBase):
    id: int
    status: ServerStatus = Field(default=ServerStatus.DISCONNECTED)
    last_error: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# Tool-related schemas
class ToolArgument(BaseModel):
    name: str
    description: str
    type: str
    required: bool = False


class ToolInfo(BaseModel):
    name: str
    description: str
    arguments: List[ToolArgument]


class ToolExecutionRequest(BaseModel):
    server_id: int
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class ToolExecutionResult(BaseModel):
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None


# WebSocket message schemas
class WSMessage(BaseModel):
    type: str
    data: Dict[str, Any]


class ServerStatusUpdate(BaseModel):
    server_id: int
    status: ServerStatus
    message: Optional[str] = None
