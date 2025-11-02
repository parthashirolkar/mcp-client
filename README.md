# MCP Client Web Application

A comprehensive web-based Model Context Protocol (MCP) client that allows users to connect to and manage multiple MCP servers through a modern React interface with real-time updates.

## Architecture

- **Backend**: FastAPI with Python MCP SDK
- **Frontend**: React with Material-UI and TypeScript
- **Database**: SQLite for configuration persistence
- **Communication**: REST API + WebSockets for real-time updates
- **MCP Support**: stdio connections (official) and HTTP bridge support

## Features

### 🚀 Core Functionality
- **Dynamic MCP Server Management**: Add, configure, and manage multiple MCP servers
- **Real-time Connection Monitoring**: Live status updates via WebSockets
- **Tool Discovery & Execution**: Browse and execute tools from connected servers
- **Interactive Dashboard**: Overview of server status and available tools
- **Connection Types**: Support for both stdio and HTTP-based MCP servers

### 🎨 User Interface
- **Modern Design**: Built with Material-UI components
- **Responsive Layout**: Works on desktop and mobile devices
- **Real-time Updates**: Instant feedback on connection status changes
- **Intuitive Configuration**: Easy-to-use forms for server setup
- **Error Handling**: Clear error messages and recovery options

### ⚡ Technical Features
- **TypeScript**: Full type safety across the application
- **WebSocket Integration**: Real-time communication without polling
- **Health Monitoring**: Automatic server health checks and reconnection
- **Tool Execution History**: Track tool executions and results
- **Configuration Persistence**: All settings saved to SQLite database

## Project Structure

```
mcp-client/
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py             # FastAPI app with lifecycle management
│   │   ├── mcp/
│   │   │   ├── manager.py      # MCP connection manager
│   │   │   └── transports.py   # stdio and HTTP transport handlers
│   │   ├── api/
│   │   │   ├── servers.py      # Server CRUD operations
│   │   │   ├── tools.py        # Tool execution endpoints
│   │   │   └── websockets.py   # WebSocket handlers
│   │   ├── models/
│   │   │   ├── schemas.py      # Pydantic models
│   │   │   └── database_models.py # SQLAlchemy models
│   │   └── database.py         # Database configuration
│   ├── run_server.py           # Server startup script
│   └── pyproject.toml          # uv configuration
└── frontend/                   # React application
    ├── src/
    │   ├── components/
    │   │   ├── Layout/
    │   │   │   └── MainLayout.tsx # Main app layout
    │   │   └── Servers/
    │   │       ├── ServerList.tsx # Server list component
    │   │       └── ServerConfigForm.tsx # Server configuration form
    │   ├── pages/
    │   │   ├── Dashboard.tsx   # Main dashboard
    │   │   ├── Servers.tsx     # Server management page
    │   │   └── Tools.tsx       # Tool browser and execution
    │   ├── services/
    │   │   ├── api.ts          # REST API client
    │   │   └── websocket.ts    # WebSocket service
    │   ├── types/
    │   │   └── mcp.ts          # TypeScript type definitions
    │   └── App.tsx             # Main React app
    ├── package.json
    └── .env.example            # Environment variables template
```

## Prerequisites

- **Python 3.8+** with [uv](https://docs.astral.sh/uv/) installed
- **Node.js 17+** with npm installed
- **Git** for cloning the repository

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
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

### 2. Configure Environment

```bash
# Copy environment template
cp frontend/.env.example frontend/.env

# The defaults should work for local development:
# REACT_APP_API_URL=http://localhost:8000
# REACT_APP_WS_URL=ws://localhost:8000
```

### 3. Start the Applications

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

### 4. Access the Application

Open your browser and navigate to **http://localhost:3000**

## Usage Guide

### Adding Your First MCP Server

1. **Navigate to Servers page** using the sidebar
2. **Click the "+" button** to add a new server
3. **Configure the connection:**
   - **STDIO**: Command and arguments (e.g., `python`, `path/to/server.py`)
   - **HTTP**: URL and headers for HTTP-based servers
4. **Save and connect** to start using the server

### Managing Servers

- **Connect/Disconnect**: Use the control buttons on each server card
- **Edit Settings**: Click the menu icon (⋮) and select "Edit"
- **Test Connection**: Verify server connectivity before enabling
- **Monitor Status**: Real-time status indicators show connection health

### Using Tools

1. **Go to Tools page** to see all available tools from connected servers
2. **Browse tools** organized by server
3. **Execute tools** by clicking the "Execute" button and providing required parameters
4. **View results** in the execution dialog with formatted output

## Development

### Backend Development

```bash
cd backend

# Start with hot reload
uv run python run_server.py

# Or use uvicorn directly
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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

## API Documentation

Once the backend is running, visit **http://localhost:8000/docs** for interactive API documentation.

## WebSocket Events

The application uses WebSockets for real-time updates:

- `server_status_update`: Server connection status changes
- `tools_update`: Available tools updates
- `tool_execution_result`: Tool execution results
- `status_update`: General status updates

## Configuration Options

### Server Configuration

- **Connection Type**: STDIO or HTTP
- **Timeout**: Connection timeout in seconds
- **Retry Count**: Number of reconnection attempts
- **Custom Headers**: HTTP headers for HTTP connections
- **Command Arguments**: Arguments for STDIO connections

### Environment Variables

```bash
# Backend (optional)
DATABASE_URL=sqlite:///./mcp_client.db

# Frontend
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

## Troubleshooting

### Common Issues

1. **Backend won't start**:
   - Ensure uv is installed: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Check Python version: `python --version`

2. **Frontend connection errors**:
   - Verify backend is running on port 8000
   - Check environment variables in `.env` file
   - Ensure CORS is properly configured

3. **MCP Server connection issues**:
   - Verify server command and paths are correct
   - Check server dependencies are installed
   - Test connection using the "Test Connection" button

4. **Tools not appearing**:
   - Ensure server is connected (green status)
   - Check server logs for errors
   - Verify server implements the MCP protocol correctly

### Debug Mode

Enable debug logging by setting environment variables:

```bash
# Backend
export RUST_LOG=debug

# Frontend
REACT_APP_DEBUG=true npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation at `/docs`
- Open an issue on GitHub

---

Built with ❤️ using FastAPI, React, Material-UI, and the Model Context Protocol.