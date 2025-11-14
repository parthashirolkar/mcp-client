# MCP Client Backend

A simplified MCP (Model Context Protocol) client with Ollama integration for AI chat with tool calling capabilities.

## Architecture

This backend provides a clean, simplified implementation with just two main files:

- **`mcp_client.py`** - Core MCP client class with Ollama SDK integration
- **`simple_main.py`** - FastAPI web server with REST endpoints and WebSocket support

## Features

- **MCP Protocol Support**: Connect to MCP servers using Claude Desktop-compatible configuration
- **Ollama Integration**: Uses official Ollama Python SDK with 32k context window
- **Tool Calling**: Full function calling support with real-time tool execution
- **WebSocket Support**: Real-time chat interface
- **CORS Enabled**: Frontend-friendly configuration
- **Personality System**: Configurable system prompts for agent behavior

## Quick Start

1. **Install dependencies**:
   ```bash
   uv sync
   ```

2. **Start the server**:
   ```bash
   uv run python run_server.py
   ```

3. **Access API**:
   - Server: http://localhost:8000
   - Health check: http://localhost:8000/health
   - API docs: http://localhost:8000/docs

## Configuration

Edit `mcp.json` to configure MCP servers:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"]
    }
  }
}
```

## API Endpoints

### Core Endpoints
- `POST /chat` - Send chat messages with tool support
- `GET /health` - Health check with MCP status
- `GET /tools` - List available tools
- `GET /status` - Detailed connection status
- `POST /reconnect` - Reconnect to MCP servers

### Frontend Compatibility
- `GET /api/servers/` - Server list for frontend
- `GET /api/tools/list` - Tools list for frontend
- `POST /api/agent/conversations` - Create conversation
- `POST /api/agent/conversations/{id}/messages` - Send message

### WebSocket
- `WS /ws` - Real-time chat interface

## Dependencies

- **fastapi** - Web framework
- **mcp** - Official MCP Python SDK
- **ollama** - Ollama Python SDK for local AI
- **pydantic** - Data validation
- **ruff** - Code formatting and linting
- **uvicorn** - ASGI server

## Development

The entire backend consists of just 4 files:
- `mcp_client.py` (380 lines) - Core MCP functionality
- `simple_main.py` (338 lines) - FastAPI server
- `run_server.py` (12 lines) - Server launcher
- `pyproject.toml` - Dependencies

This is a massive simplification from the original ~2000+ line complex architecture while maintaining all functionality.