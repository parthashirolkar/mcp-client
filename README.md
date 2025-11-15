# MCP Client - Simplified AI Chat Interface

A streamlined Model Context Protocol (MCP) client web application that connects to local Ollama models and MCP servers. The project has been completely refactored from a complex multi-service architecture to a focused, maintainable chat application with a modern Claude.ai-inspired interface.

## 🚀 What's New (November 2025)

- **Major Architecture Refactor**: 60% code reduction from ~2000+ to ~800 lines
- **Claude.ai-Inspired UI**: Complete redesign with orange accent colors and dark/light themes
- **Simplified Backend**: Consolidated from 15+ services to 2 core files
- **Enhanced Chat Experience**: Real-time WebSocket communication with markdown rendering
- **Focus on Simplicity**: Removed complex features while preserving core functionality

## Architecture Overview

### Current Implementation (Post-Refactor)

```
mcp-client/
├── backend/                     # Simplified FastAPI backend (~800 lines)
│   ├── mcp_client.py           # Core MCP client with Ollama integration
│   ├── simple_main.py          # FastAPI server with WebSocket support
│   ├── run_server.py           # Server startup script
│   ├── mcp.json                # MCP server configuration
│   └── pyproject.toml          # Minimal dependencies (FastAPI, MCP, Ollama)
└── frontend/                   # React 19 + TypeScript + Material-UI
    ├── src/
    │   ├── components/Chat/     # Chat interface components
    │   │   ├── ChatInterface.tsx # Main chat with markdown rendering
    │   │   └── Sidebar.tsx     # Collapsible navigation
    │   ├── context/ThemeContext.tsx # Theme management
    │   ├── hooks/useThemeMode.ts   # Theme persistence
    │   └── App.tsx              # Main app component
    └── package.json             # React + Material-UI dependencies
```

### Key Simplifications

- **Removed**: Database persistence, hot reload, multi-service architecture
- **Consolidated**: 15+ backend files → 2 core files
- **Streamlined**: Complex dependency management → 5 core packages
- **Maintained**: All chat, MCP, and Ollama functionality

## Features

### ✅ Core Functionality
- **Real-time Chat**: WebSocket-based communication with local Ollama models
- **MCP Integration**: Connect to MCP servers and use their tools
- **Tool Calling**: Full function calling support with JSON schema validation
- **32k Context Window**: Extended conversation context for better continuity
- **Modern UI**: Claude.ai-inspired design with dark/light themes

### 🎨 User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Themes**: Comprehensive theme system with localStorage persistence
- **Collapsible Sidebar**: Space-efficient navigation (280px ↔ 60px)
- **Markdown Rendering**: Rich text with code highlighting and table support
- **Real-time Updates**: Instant message delivery without page refreshes

### ⚡ Technical Features
- **TypeScript**: Full type safety across the application
- **Material-UI 7**: Modern component library
- **WebSocket Integration**: Real-time bidirectional communication
- **Error Handling**: Comprehensive error recovery and user feedback
- **Docker Ready**: Designed to work with Docker-based MCP servers

## Quick Start

### Prerequisites

- **Python 3.13+** with [uv](https://docs.astral.sh/uv/) installed
- **Node.js 17+** with npm installed
- **Docker** (for MCP server)
- **Ollama** installed locally with `qwen2.5:3b` model

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-client.git
cd mcp-client

# Setup backend
cd backend
uv sync
cd ..

# Setup frontend
cd frontend
npm install
cd ..
```

### 2. Setup Ollama

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the required model
ollama pull qwen2.5:3b

# Start Ollama service
ollama serve
```

### 3. Setup MCP Server (Indian Stock Analysis)

```bash
# Build and run the Indian Stock MCP server
docker build -t indian-stock-mcp-server /path/to/indian-stock-mcp-server
docker run -d --name indian-stock-mcp-server indian-stock-mcp-server
```

### 4. Start the Applications

**Backend (Terminal 1):**
```bash
cd backend
uv run python run_server.py
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm start
```

### 5. Access the Application

Open your browser and navigate to **http://localhost:3000**

## Usage Guide

### Starting a Conversation

1. The application automatically connects to the configured MCP server on startup
2. Type your message in the chat interface and press Enter
3. The AI will respond using local Ollama with access to MCP tools
4. Tool calls are executed automatically when needed for stock market analysis

### Theme Customization

- **Toggle Theme**: Click the sun/moon icon in the sidebar
- **Collapse Sidebar**: Click the hamburger menu to expand/collapse
- **Preferences**: Theme choices are automatically saved

### Current MCP Tools

The application is configured with Indian Stock Market Analysis tools that provide:
- Current stock prices and company fundamentals
- Historical data and technical indicators
- Market overviews and sector performance
- Stock search and recent news

## API Documentation

Once the backend is running, visit **http://localhost:8000/docs** for interactive API documentation.

### Key Endpoints

- `POST /chat` - Send chat messages with MCP tool integration
- `GET /health` - Check application and MCP server status
- `GET /tools` - List available MCP tools
- `WebSocket /ws` - Real-time chat communication

## Configuration

### MCP Server Configuration

Edit `backend/mcp.json` to configure different MCP servers:

```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "container-name",
        "uv",
        "run",
        "python",
        "server.py"
      ]
    }
  }
}
```

### Ollama Model Configuration

The default model is `qwen2.5:3b`. To change it, modify the `default_model` parameter in `mcp_client.py`.

## Development

### Backend Development

```bash
cd backend

# Start with auto-reload
uv run uvicorn simple_main:app --reload --host 0.0.0.0 --port 8000

# Check dependencies
uv tree
```

### Frontend Development

```bash
cd frontend

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Code Quality

```bash
# Backend linting and formatting
cd backend
uv run ruff check .
uv run ruff format .

# Frontend linting (if configured)
cd frontend
npm run lint
```

## Troubleshooting

### Common Issues

1. **Backend won't start**:
   - Ensure uv is installed: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Check Python version: `python --version` (requires 3.13+)
   - Verify Ollama is running: `ollama list`

2. **Frontend connection errors**:
   - Verify backend is running on port 8000
   - Check if ports are available: `netstat -tlnp | grep :8000`
   - Ensure no firewall blocking

3. **MCP Server connection issues**:
   - Verify Docker container is running: `docker ps`
   - Check container name matches `mcp.json` configuration
   - Test MCP server manually if possible

4. **Ollama connection issues**:
   - Ensure Ollama service is running: `ollama serve`
   - Check model is available: `ollama list`
   - Verify model compatibility with tool calling

### Debug Mode

Enable detailed logging:

```bash
# Backend
export RUST_LOG=debug
cd backend && uv run python run_server.py

# Frontend (check browser console)
# No special setup needed - React DevTools recommended
```

## Project History

### Recent Major Refactoring (November 2025)

The project underwent a significant architectural simplification:

**Before:**
- Complex multi-service architecture (~2000+ lines)
- 15+ backend files with separate managers, services, and handlers
- Database persistence with SQLAlchemy
- Hot reload configuration management
- Complex dependency tree

**After:**
- Streamlined implementation (~800 lines)
- 2 core backend files with consolidated functionality
- In-memory conversation management
- Static configuration with mcp.json
- Minimal dependency set

**Benefits:**
- 60% reduction in codebase size
- Faster development and deployment
- Easier to understand and maintain
- Reduced attack surface
- Better performance (less overhead)

### UI/UX Overhaul (November 2025)

Complete interface redesign inspired by Claude.ai:
- Orange accent color scheme
- Dark/light theme system
- Collapsible sidebar navigation
- Enhanced markdown rendering
- Improved accessibility

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the API documentation at `/docs`
- Open an issue on GitHub

---

Built with ❤️ using FastAPI, React, Material-UI, Ollama, and the Model Context Protocol.