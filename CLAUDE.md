# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Model Context Protocol (MCP) Client Web Application** with integrated Ollama support that transforms into a local AI agent chatbot. It's a full-stack application that allows users to connect to MCP servers and interact with local Ollama models through a modern web interface.

**Core Architecture:**
- **Backend**: FastAPI with Python MCP SDK and Ollama integration
- **Frontend**: React 19 + TypeScript + Material-UI 7
- **AI Engine**: Local Ollama model execution with MCP tool calling
- **Configuration**: Claude Desktop-compatible mcp.json with hot reload
- **Communication**: REST API + WebSockets for real-time chat

## Development Commands

### Backend Setup (Python 3.13+ with uv)
```bash
cd backend
uv sync                    # Install dependencies
uv run python run_server.py    # Start development server (port 8000)
# Alternative: uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup (Node.js 17+)
```bash
cd frontend
npm install               # Install dependencies
npm start                 # Start development server (port 3000)
npm run build            # Build for production
npm test                  # Run tests
```

### Environment Configuration
```bash
# Copy environment template
cp frontend/.env.example frontend/.env

# Key environment variables:
# REACT_APP_API_URL=http://localhost:8000
# REACT_APP_WS_URL=ws://localhost:8000
# NODE_OPTIONS=--max-old-space-size=4096
```

## Architecture Overview

### Backend Structure
- **FastAPI Application**: Main web framework with automatic API documentation
- **MCP Integration**: Full MCP protocol support for stdio and HTTP connections
- **Ollama Service**: Local AI model management and conversation engine
- **Configuration System**: Claude Desktop-compatible mcp.json with hot reload
- **WebSocket Support**: Real-time communication for chat interfaces

### Key Backend Modules
- `app/main.py` - FastAPI app with lifecycle management and service initialization
- `app/mcp/manager.py` - MCP connection manager and health monitoring
- `app/ollama/service.py` - Ollama service layer for model management
- `app/ollama/manager.py` - Model capability detection and conversation orchestration
- `app/config/mcp_config.py` - Claude Desktop-style configuration with file watching
- `app/api/` - REST API endpoints for all functionality

### Frontend Structure
- **React 19** with TypeScript for type safety
- **Material-UI 7** component library for modern UI
- **Real-time Updates** via WebSocket integration
- **Component Architecture**: Layout, Servers, Tools, and Chat components

## Key Features & Systems

### 1. MCP Server Management
- **Connection Types**: Both stdio (official) and HTTP bridge support
- **Real-time Monitoring**: Live status updates via WebSockets
- **Health Checks**: Automatic server health monitoring and reconnection
- **Tool Discovery**: Dynamic tool loading from connected servers

### 2. Ollama Integration
- **Model Management**: Automatic model detection and capability analysis
- **Smart Selection**: Intelligent model selection based on task requirements
- **Conversation Engine**: Full conversation context with message history
- **Local Execution**: Complete privacy with local model execution

### 3. Configuration System
- **Claude Desktop Compatible**: Uses exact same mcp.json format
- **Hot Reload**: File watcher automatically detects configuration changes
- **Validation**: Comprehensive configuration validation and error reporting
- **API Management**: Full CRUD operations for server configurations

### 4. Agent Architecture (In Progress)
- **Function Calling**: JSON schema-based tool execution
- **Conversation Context**: Persistent conversation management
- **Real-time Chat**: WebSocket-based streaming responses
- **Tool Integration**: Seamless MCP tool calling through conversation

## API Endpoints

### Core REST APIs
- `/api/servers` - MCP server CRUD operations
- `/api/tools` - Tool discovery and execution
- `/api/ollama` - Model management and conversations
- `/api/config` - Configuration management with hot reload
- `/health` - Application health check
- `/docs` - Interactive API documentation (when backend is running)

### WebSocket Events
- `server_status_update` - Server connection status changes
- `tools_update` - Available tools updates
- `tool_execution_result` - Tool execution results
- `conversation_update` - Real-time chat messages (future)

## Configuration Files

### MCP Configuration (mcp.json)
The application uses Claude Desktop-compatible configuration:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "."]
    }
  }
}
```

### Key Configuration Files
- `backend/pyproject.toml` - Python dependencies and project metadata
- `frontend/package.json` - Node.js dependencies and scripts
- `frontend/.env` - Environment variables for API URLs and settings
- `backend/mcp.json` - MCP server configuration (auto-created if missing)

## Database Schema
- **SQLite Database**: Automatic database creation and management
- **Server Configurations**: MCP server settings and status tracking
- **Tool Execution History**: Complete audit trail of tool usage
- **Conversation History**: Chat conversation persistence (future)

## Development Workflow

### Starting the Application
1. **Terminal 1**: Start backend - `cd backend && uv run python run_server.py`
2. **Terminal 2**: Start frontend - `cd frontend && npm start`
3. **Browser**: Navigate to http://localhost:3000
4. **API Docs**: Visit http://localhost:8000/docs for interactive API docs

### Testing and Validation
- **Backend Tests**: `uv run pytest` (when available)
- **Frontend Tests**: `npm test`
- **Configuration Validation**: Automatic validation on startup
- **Connection Testing**: Built-in connection test functionality

## Important Implementation Details

### MCP Protocol Support
- **Official SDK**: Uses the official Python MCP SDK
- **Transport Handlers**: Separate handlers for stdio and HTTP connections
- **Error Handling**: Comprehensive error handling and recovery
- **Health Monitoring**: Background health checking with automatic reconnection

### Ollama Model Management
- **Capability Detection**: Automatic detection of model capabilities (context length, tool support, JSON mode)
- **Smart Selection**: Intelligent model selection based on task requirements
- **Conversation Context**: Full conversation history and context management
- **Streaming Support**: Real-time streaming responses for chat interfaces

### Configuration Hot Reload
- **File Watching**: Uses watchdog library for file system monitoring
- **Validation**: Real-time configuration validation and error reporting
- **Graceful Updates**: Automatic service updates without restart
- **Change Notifications**: WebSocket notifications for configuration changes

## Current Development Status

### ✅ Completed Features
- MCP server management with real-time status
- Ollama integration and model management
- Claude Desktop-compatible configuration system
- Hot reload functionality for configuration changes
- REST API with comprehensive documentation
- WebSocket infrastructure for real-time updates

### 🚧 In Progress
- Agent conversation logic with local LLM
- Function calling support with JSON schema mode
- Chat interface transformation
- Real-time agent updates via WebSocket

### 📋 Planned Features
- Model selection and management UI
- Enhanced conversation orchestration
- Advanced tool execution workflows
- Performance monitoring and analytics

This codebase represents a sophisticated, modern web application that bridges the gap between local AI execution and external tool integration through the Model Context Protocol, with a strong emphasis on privacy, offline operation, and user experience.