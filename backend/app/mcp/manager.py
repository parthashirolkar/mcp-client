import asyncio
import logging
from typing import Dict, List, Optional, Any
from app.models.schemas import (
    MCPServerConfig,
    ConnectionType,
    ServerStatus,
    ToolExecutionRequest,
)
from app.mcp.transports import create_stdio_transport, create_http_transport

logger = logging.getLogger(__name__)


class MCPServerConnection:
    """Represents a connection to an MCP server"""

    def __init__(self, config: MCPServerConfig):
        self.config = config
        self.transport = None
        self.status = ServerStatus.DISCONNECTED
        self.last_error = None
        self.available_tools = []
        self._lock = asyncio.Lock()

    async def connect(self) -> bool:
        """Connect to the MCP server"""
        async with self._lock:
            try:
                self.status = ServerStatus.CONNECTING
                logger.info(f"Connecting to MCP server: {self.config.name}")

                if self.config.connection_type == ConnectionType.STDIO:
                    if not self.config.command:
                        raise ValueError("Command is required for stdio connections")

                    self.transport = create_stdio_transport(
                        command=self.config.command, args=self.config.args or []
                    )
                elif self.config.connection_type == ConnectionType.HTTP:
                    if not self.config.url:
                        raise ValueError("URL is required for HTTP connections")

                    self.transport = create_http_transport(
                        url=self.config.url, headers=self.config.headers or {}
                    )
                else:
                    raise ValueError(
                        f"Unsupported connection type: {self.config.connection_type}"
                    )

                # Establish connection
                await self.transport.connect()

                # List available tools (only for stdio for now)
                if self.config.connection_type == ConnectionType.STDIO:
                    try:
                        self.available_tools = await self.transport.list_tools()
                        logger.info(
                            f"Found {len(self.available_tools)} tools: {[tool.name for tool in self.available_tools]}"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Could not list tools from {self.config.name}: {e}"
                        )
                        self.available_tools = []

                self.status = ServerStatus.CONNECTED
                self.last_error = None
                logger.info(f"Successfully connected to MCP server: {self.config.name}")
                return True

            except Exception as e:
                self.status = ServerStatus.ERROR
                self.last_error = str(e)
                logger.error(f"Failed to connect to MCP server {self.config.name}: {e}")
                return False

    async def disconnect(self):
        """Disconnect from the MCP server"""
        async with self._lock:
            if self.transport:
                try:
                    await self.transport.cleanup()
                except Exception as e:
                    logger.error(f"Error disconnecting from {self.config.name}: {e}")
                finally:
                    self.transport = None

            self.status = ServerStatus.DISCONNECTED
            self.available_tools = []
            logger.info(f"Disconnected from MCP server: {self.config.name}")

    async def execute_tool(
        self, tool_name: str, arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a tool on this MCP server"""
        if self.status != ServerStatus.CONNECTED or not self.transport:
            raise RuntimeError(f"Server {self.config.name} is not connected")

        if not any(tool.name == tool_name for tool in self.available_tools):
            raise ValueError(
                f"Tool {tool_name} not available on server {self.config.name}"
            )

        try:
            logger.info(f"Executing tool {tool_name} on server {self.config.name}")
            result = await self.transport.call_tool(tool_name, arguments)
            logger.info(f"Tool {tool_name} executed successfully on {self.config.name}")
            return {"success": True, "result": result, "error": None}
        except Exception as e:
            logger.error(f"Tool execution failed on {self.config.name}: {e}")
            return {"success": False, "result": None, "error": str(e)}

    async def health_check(self) -> bool:
        """Check if the connection is still healthy"""
        if self.status != ServerStatus.CONNECTED:
            return False

        try:
            # Try to list tools as a health check
            if self.config.connection_type == ConnectionType.STDIO and self.transport:
                await self.transport.list_tools()
                return True
            # HTTP health check would require custom implementation
            return True
        except Exception as e:
            logger.warning(f"Health check failed for {self.config.name}: {e}")
            self.status = ServerStatus.ERROR
            self.last_error = str(e)
            return False


class MCPConnectionManager:
    """Manages multiple MCP server connections"""

    def __init__(self):
        self.connections: Dict[int, MCPServerConnection] = {}
        self._health_check_task: Optional[asyncio.Task] = None
        self._running = False

    async def add_server(self, server_config: MCPServerConfig) -> bool:
        """Add and connect to a new MCP server"""
        if server_config.id in self.connections:
            logger.warning(f"Server {server_config.id} already exists, removing first")
            await self.remove_server(server_config.id)

        connection = MCPServerConnection(server_config)
        self.connections[server_config.id] = connection

        if server_config.enabled:
            return await connection.connect()
        else:
            logger.info(f"Server {server_config.name} is disabled, not connecting")
            return True

    async def remove_server(self, server_id: int):
        """Remove and disconnect an MCP server"""
        if server_id in self.connections:
            await self.connections[server_id].disconnect()
            del self.connections[server_id]
            logger.info(f"Removed server {server_id}")

    async def reconnect_server(self, server_id: int) -> bool:
        """Reconnect to a specific server"""
        if server_id not in self.connections:
            logger.error(f"Server {server_id} not found")
            return False

        connection = self.connections[server_id]
        await connection.disconnect()
        return await connection.connect()

    async def execute_tool(self, request: ToolExecutionRequest) -> Dict[str, Any]:
        """Execute a tool on a specific server"""
        if request.server_id not in self.connections:
            return {
                "success": False,
                "result": None,
                "error": f"Server {request.server_id} not found",
            }

        connection = self.connections[request.server_id]
        return await connection.execute_tool(request.tool_name, request.arguments)

    async def list_all_tools(self) -> Dict[int, List[Dict[str, Any]]]:
        """List all available tools from all connected servers (MCP compliant)"""
        all_tools = {}
        for server_id, connection in self.connections.items():
            if connection.status == ServerStatus.CONNECTED:
                tools = []
                for tool in connection.available_tools:
                    try:
                        # Handle different MCP tool schema formats
                        input_schema = {}
                        if hasattr(tool, "inputSchema") and tool.inputSchema:
                            input_schema = tool.inputSchema
                        elif hasattr(tool, "input_schema") and tool.input_schema:
                            input_schema = tool.input_schema

                        # Ensure schema is serializable and follows JSON Schema
                        if hasattr(input_schema, "dict"):
                            input_schema = input_schema.dict()
                        elif not isinstance(input_schema, dict):
                            input_schema = {}

                        # Remove $schema field as Ollama doesn't support it
                        if isinstance(input_schema, dict) and "$schema" in input_schema:
                            input_schema = input_schema.copy()
                            del input_schema["$schema"]

                        tool_info = {
                            "name": getattr(tool, "name", "unknown"),
                            "description": getattr(
                                tool, "description", "No description available"
                            ),
                            "input_schema": input_schema,
                        }
                        tools.append(tool_info)

                    except Exception as e:
                        logger.warning(
                            f"Error processing tool {getattr(tool, 'name', 'unknown')}: {e}"
                        )
                        # Add minimal tool info even if schema processing fails
                        tools.append(
                            {
                                "name": getattr(tool, "name", "unknown"),
                                "description": f"Tool with schema processing error: {str(e)}",
                                "input_schema": {},
                            }
                        )

                all_tools[server_id] = tools
        return all_tools

    def get_server_status(self, server_id: int) -> Optional[Dict[str, Any]]:
        """Get status of a specific server"""
        if server_id not in self.connections:
            return None

        connection = self.connections[server_id]
        return {
            "id": server_id,
            "name": connection.config.name,
            "status": connection.status,
            "last_error": connection.last_error,
            "tool_count": len(connection.available_tools),
            "enabled": connection.config.enabled,
        }

    def get_all_server_status(self) -> List[Dict[str, Any]]:
        """Get status of all servers"""
        return [
            self.get_server_status(server_id) for server_id in self.connections.keys()
        ]

    def get_connected_servers(self) -> List[MCPServerConnection]:
        """Get all connected server connections"""
        return [
            connection
            for connection in self.connections.values()
            if connection.status == ServerStatus.CONNECTED
        ]

    async def start_health_monitoring(self, interval: int = 30):
        """Start periodic health checks"""
        self._running = True
        self._health_check_task = asyncio.create_task(self._health_check_loop(interval))

    async def stop_health_monitoring(self):
        """Stop health checks"""
        self._running = False
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass

    async def _health_check_loop(self, interval: int):
        """Background health check loop"""
        while self._running:
            try:
                for server_id, connection in list(self.connections.items()):
                    if (
                        connection.config.enabled
                        and connection.status == ServerStatus.CONNECTED
                    ):
                        is_healthy = await connection.health_check()
                        if not is_healthy:
                            logger.warning(
                                f"Server {connection.config.name} failed health check, attempting reconnection"
                            )
                            await connection.connect()

                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(5)

    async def cleanup(self):
        """Clean up all connections"""
        await self.stop_health_monitoring()

        for connection in self.connections.values():
            await connection.disconnect()

        self.connections.clear()
        logger.info("MCP Connection Manager cleaned up")


# Global instance
connection_manager = MCPConnectionManager()
