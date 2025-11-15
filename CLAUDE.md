# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Simplified Model Context Protocol (MCP) Client Web Application** with integrated Ollama support. The project has undergone a major architectural refactoring, transforming from a complex multi-service architecture (~2000+ lines) to a streamlined implementation (~800 lines). It's a focused chat application that connects to MCP servers and provides local AI model interaction through a clean, Claude.ai-inspired interface.

**Current Architecture (Post-Refactor):**
- **Backend**: Simplified FastAPI with Python MCP SDK and Ollama integration
- **Frontend**: React 19 + TypeScript + Material-UI 7 with Claude.ai-inspired design
- **AI Engine**: Local Ollama model execution with MCP tool calling and 32k context window
- **Configuration**: Claude Desktop-compatible mcp.json (no hot reload in current version)
- **Communication**: REST API + WebSocket for real-time chat
- **Database**: No persistent database (removed during simplification)

**Key Design Philosophy:** The application prioritizes simplicity and maintainability over complex feature sets, focusing on core chat functionality with MCP tool integration.

## Development Commands

### Backend Setup (Python 3.13+ with uv)
```bash
cd backend
uv sync                    # Install dependencies
uv run python run_server.py    # Start development server (port 8000)
# Alternative: uv run uvicorn simple_main:app --reload --host 0.0.0.0 --port 8000
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
# No environment variables needed for basic setup
# The application uses default values:
# Backend: http://localhost:8000
# WebSocket: ws://localhost:8000
# Frontend: http://localhost:3000
```

## Architecture Overview

### Backend Structure (Simplified)
- **Single File Architecture**: Core functionality consolidated into two main files
- **MCP Integration**: Direct MCP protocol support using official Python SDK
- **Ollama Service**: Integrated Ollama client with conversation management
- **Configuration**: Simple mcp.json file reading (no hot reload)
- **WebSocket Support**: Real-time chat communication

### Key Backend Files
- `mcp_client.py` - Core MCP client with Ollama integration and chat functionality
- `simple_main.py` - FastAPI server with compatibility endpoints and WebSocket support
- `run_server.py` - Simple server startup script
- `mcp.json` - MCP server configuration (currently: Indian Stock Analysis MCP server)

### Frontend Structure
- **React 19** with TypeScript for type safety
- **Material-UI 7** with Claude.ai-inspired orange accent color scheme
- **Dark/Light Theme**: Comprehensive theme system with localStorage persistence
- **Collapsible Sidebar**: 280px ↔ 60px animated navigation
- **Chat Interface**: Real-time chat with markdown rendering and code highlighting

### Key Frontend Components
- `ChatInterface.tsx` - Main chat component with message rendering
- `Sidebar.tsx` - Collapsible navigation with theme toggle
- `ThemeContext.tsx` - Centralized theme management
- `useThemeMode.ts` - Custom hook for theme persistence

## Key Features & Systems

### 1. MCP Server Integration
- **Single Server Connection**: Connects to one MCP server at a time (simplified approach)
- **Tool Discovery**: Automatic tool loading from connected MCP servers
- **Real-time Status**: Basic connection monitoring and status updates
- **Error Handling**: Comprehensive error handling and recovery

### 2. Ollama Integration
- **32k Context Window**: Extended context for better conversation continuity
- **Tool Support**: Full function calling capabilities with MCP tools
- **Conversation History**: In-memory conversation context management
- **Personality**: Stock market focused AI assistant personality

### 3. Modern UI/UX (Recent Update)
- **Claude.ai Design**: Orange accent color scheme with dark/light themes
- **Responsive Layout**: Mobile-friendly design with collapsible sidebar
- **Markdown Support**: Rich text rendering with code highlighting
- **Theme Persistence**: User preferences saved to localStorage

### 4. Simplified API Design
- **RESTful Endpoints**: Clean, documented API endpoints
- **WebSocket Support**: Real-time chat communication
- **Compatibility Layer**: Maintains frontend compatibility with simplified backend

## Current MCP Configuration

The application is configured for Indian Stock Market Analysis:
```json
{
  "mcpServers": {
    "indian-stock-analysis-mcp": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "indian-stock-mcp-server",
        "uv",
        "run",
        "python",
        "server.py"
      ]
    }
  }
}
```

### Key Configuration Files
- `backend/pyproject.toml` - Minimal Python dependencies (FastAPI, MCP, Ollama, Pydantic)
- `frontend/package.json` - React + Material-UI + markdown dependencies
- `backend/mcp.json` - MCP server configuration

## API Endpoints

### Core APIs
- `/chat` - Main chat endpoint with MCP tool integration
- `/health` - Application health check with MCP status
- `/tools` - List available MCP tools
- `/status` - Detailed connection status
- `/reconnect` - Reconnect to MCP servers

### Frontend Compatibility Endpoints
- `/api/servers/` - Server list compatibility
- `/api/servers/status/all` - Server status compatibility
- `/api/tools/list` - Tools listing compatibility
- `/api/agent/conversations` - Conversation management compatibility

### WebSocket
- `/ws` - Real-time chat communication

### API Documentation
- `/docs` - Interactive FastAPI documentation

## Development Workflow

### Starting the Application
1. **Terminal 1**: Start backend - `cd backend && uv run python run_server.py`
2. **Terminal 2**: Start frontend - `cd frontend && npm start`
3. **Browser**: Navigate to http://localhost:3000
4. **API Docs**: Visit http://localhost:8000/docs for interactive API docs

### Current MCP Server Setup
The application expects a Docker container named `indian-stock-mcp-server` running with the Indian Stock Analysis MCP server tools.

## Recent Major Changes

### Architecture Simplification (Nov 2025)
- **60% Code Reduction**: From ~2000+ lines to ~800 lines
- **Removed Complex Features**: Database persistence, hot reload, multi-service architecture
- **Streamlined Dependencies**: Reduced from 15+ to 5 core dependencies
- **Maintained Functionality**: All core chat and MCP features preserved

### UI/UX Overhaul (Nov 2025)
- **Claude.ai Inspired Design**: Complete visual redesign with orange accents
- **Dark/Light Theme System**: Comprehensive theme support with persistence
- **Collapsible Sidebar**: Improved space utilization with animations
- **Enhanced Chat Interface**: Better message rendering and markdown support

## Important Implementation Details

### MCP Protocol Support
- **Official SDK**: Uses the official Python MCP SDK
- **Stdio Connections**: Supports stdio-based MCP servers
- **Tool Execution**: Full MCP tool calling with proper error handling
- **Conversation Context**: Maintains conversation history for better responses

### Ollama Model Integration
- **Default Model**: Uses `qwen2.5:3b` by default
- **Tool Calling**: Supports function calling with JSON schema validation
- **Extended Context**: 32k context window for longer conversations
- **Error Recovery**: Graceful handling of Ollama API errors

### Simplified Configuration
- **Static Configuration**: Reads mcp.json at startup (no hot reload)
- **Docker Integration**: Designed to work with Docker-based MCP servers
- **Error Reporting**: Clear error messages for configuration issues

## Current Development Status

### ✅ Completed Features
- Simplified MCP client architecture
- Ollama integration with 32k context window
- Claude.ai-inspired UI with dark/light themes
- Real-time chat with WebSocket support
- MCP tool integration and execution
- Collapsible sidebar with animations
- Markdown rendering with code highlighting
- Theme persistence with localStorage
- Frontend compatibility layer

### 🚧 Current Focus
- Stock market analysis functionality (through Indian Stock MCP server)
- Conversation quality and context management
- Error handling and user feedback
- Performance optimization

### 📋 Potential Future Enhancements
- Multiple MCP server support
- Configuration hot reload
- Database persistence for conversations
- Model selection UI
- Advanced tool management
- Performance monitoring

This codebase represents a focused, maintainable approach to MCP client development, prioritizing simplicity and user experience over complex feature sets. The recent refactoring demonstrates a commitment to code quality and sustainable development practices while preserving all core functionality.