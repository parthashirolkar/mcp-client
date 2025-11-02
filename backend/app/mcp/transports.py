from typing import Optional, Dict, Any, List
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import logging

logger = logging.getLogger(__name__)


class MCPStdioTransport:
    """Handles stdio-based MCP server connections following the official documentation"""

    def __init__(self, command: str, args: List[str] = None):
        self.command = command
        self.args = args or []
        self.exit_stack = AsyncExitStack()
        self.session: Optional[ClientSession] = None
        self.stdio = None
        self.write = None

    async def connect(self) -> ClientSession:
        """Connect to MCP server using stdio transport"""
        try:
            # Create server parameters as per documentation
            server_params = StdioServerParameters(
                command=self.command, args=self.args, env=None
            )

            # Create stdio transport
            stdio_transport = await self.exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self.stdio, self.write = stdio_transport

            # Create and initialize session
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(self.stdio, self.write)
            )

            await self.session.initialize()
            logger.info(
                f"Connected to stdio MCP server: {self.command} {' '.join(self.args)}"
            )

            return self.session

        except Exception as e:
            logger.error(f"Failed to connect to stdio MCP server {self.command}: {e}")
            await self.cleanup()
            raise

    async def list_tools(self) -> List[Any]:
        """List available tools from the MCP server"""
        if not self.session:
            raise RuntimeError("Not connected to MCP server")

        response = await self.session.list_tools()
        return response.tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool on the MCP server"""
        if not self.session:
            raise RuntimeError("Not connected to MCP server")

        result = await self.session.call_tool(tool_name, arguments)
        return result

    async def list_resources(self) -> List[Any]:
        """List available resources from the MCP server"""
        if not self.session:
            raise RuntimeError("Not connected to MCP server")

        response = await self.session.list_resources()
        return response.resources

    async def cleanup(self):
        """Clean up resources"""
        try:
            await self.exit_stack.aclose()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
        finally:
            self.session = None
            self.stdio = None
            self.write = None


class MCPHTTPTransport:
    """Custom HTTP-based MCP server bridge (not part of official spec)"""

    def __init__(self, url: str, headers: Dict[str, str] = None, timeout: int = 30):
        self.url = url.rstrip("/")
        self.headers = headers or {}
        self.timeout = timeout
        self.session: Optional[Any] = None  # Will store session reference

    async def connect(self):
        """For HTTP servers, this is a placeholder connection"""
        # Note: HTTP transport is not part of the official MCP spec
        # This would require a custom bridge server that translates HTTP to MCP protocol
        logger.info(f"HTTP transport initialized for: {self.url}")
        return self

    async def list_tools(self) -> List[Any]:
        """List tools - would need HTTP endpoint implementation"""
        # This would need to be implemented via HTTP API calls to a bridge server
        raise NotImplementedError(
            "HTTP transport requires custom bridge implementation"
        )

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call tool - would need HTTP endpoint implementation"""
        raise NotImplementedError(
            "HTTP transport requires custom bridge implementation"
        )

    async def cleanup(self):
        """Clean up HTTP transport"""
        self.session = None


def create_stdio_transport(command: str, args: List[str] = None) -> MCPStdioTransport:
    """Create stdio transport for MCP server"""
    return MCPStdioTransport(command=command, args=args or [])


def create_http_transport(url: str, headers: Dict[str, str] = None) -> MCPHTTPTransport:
    """Create HTTP transport (requires custom bridge implementation)"""
    return MCPHTTPTransport(url=url, headers=headers)
