"""
Simplified FastAPI application using the new MCPClient.
Replaces the complex multi-service architecture with a simple wrapper.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import logging
from typing import List
import json

from mcp_client import MCPClient, ChatRequest, ChatResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    # Startup
    try:
        logger.info("Initializing MCP Client...")
        await app.state.mcp_client.connect_to_servers()
        logger.info("MCP Client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize MCP Client: {e}")
        # Continue running - we can try to connect later

    yield

    # Shutdown
    try:
        logger.info("Cleaning up MCP Client...")
        await app.state.mcp_client.cleanup()
        logger.info("MCP Client cleanup completed")
    except Exception as e:
        logger.error(f"Error during MCP Client cleanup: {e}")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Simplified MCP Client",
    description="A simplified MCP client following official documentation patterns",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MCP client in app state
app.state.mcp_client = MCPClient()


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Simplified MCP Client API", "status": "running"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        status = await app.state.mcp_client.get_connection_status()
        return {"status": "healthy", "mcp_status": status}
    except Exception as e:
        return JSONResponse(
            status_code=503, content={"status": "unhealthy", "error": str(e)}
        )


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Process a chat message using Ollama with MCP tools.
    Replaces the complex agent service with a simple endpoint.
    """
    try:
        logger.info(f"Processing chat request: {request.message[:100]}...")
        response = await app.state.mcp_client.process_query(request)
        logger.info(f"Chat response generated: {response.response[:100]}...")
        return response
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error processing request: {str(e)}"
        )


@app.get("/tools")
async def list_tools():
    """Get list of available MCP tools"""
    try:
        tools = await app.state.mcp_client.list_tools()
        return {"tools": tools, "count": len(tools)}
    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing tools: {str(e)}")


@app.get("/status")
async def get_status():
    """Get detailed connection status"""
    try:
        status = await app.state.mcp_client.get_connection_status()
        return status
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")


@app.post("/reconnect")
async def reconnect_mcp():
    """Reconnect to MCP servers"""
    try:
        logger.info("Reconnecting to MCP servers...")
        await app.state.mcp_client.cleanup()
        await app.state.mcp_client.connect_to_servers()
        status = await app.state.mcp_client.get_connection_status()
        logger.info("Reconnected successfully")
        return {"message": "Reconnected successfully", "status": status}
    except Exception as e:
        logger.error(f"Error reconnecting: {e}")
        raise HTTPException(status_code=500, detail=f"Error reconnecting: {str(e)}")


# Frontend compatibility endpoints
@app.get("/api/servers/")
async def list_servers():
    """Compatibility endpoint for frontend - returns servers from mcp.json"""
    try:
        status = await app.state.mcp_client.get_connection_status()
        # Convert mcp.json servers to expected format
        servers = []
        for i, server_name in enumerate(status["connected_servers"]):
            servers.append(
                {
                    "id": i + 1,
                    "name": server_name,
                    "status": "connected",
                    "connected": True,
                    "tool_count": len(status["tools"]),
                }
            )
        return servers
    except Exception as e:
        logger.error(f"Error listing servers: {e}")
        return []


@app.get("/api/servers/status/all")
async def get_all_server_status():
    """Compatibility endpoint for frontend server status"""
    try:
        status = await app.state.mcp_client.get_connection_status()
        server_statuses = []
        for i, server_name in enumerate(status["connected_servers"]):
            server_statuses.append(
                {
                    "server_id": i + 1,
                    "server_name": server_name,
                    "connected": True,
                    "status": "connected",
                    "tool_count": len(status["tools"]),
                    "last_heartbeat": None,
                }
            )
        return server_statuses
    except Exception as e:
        logger.error(f"Error getting server status: {e}")
        return []


@app.get("/api/tools/list")
async def list_all_tools():
    """Compatibility endpoint for frontend tools listing"""
    try:
        status = await app.state.mcp_client.get_connection_status()
        # Format to match frontend expectations
        servers_tools = {1: status["tools"]}  # Server ID 1 for our single server
        return {
            "servers": servers_tools,
            "total_tools": status["available_tools_count"],
        }
    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        return {"servers": {}, "total_tools": 0}


# Conversation endpoints for frontend compatibility
@app.post("/api/agent/conversations")
async def create_conversation(request: dict = None):
    """Create a new conversation session"""
    try:
        conversation_id = (
            f"conv_{asyncio.current_task().get_name()}_{id(asyncio.current_task())}"
        )
        conversation = {
            "conversation_id": conversation_id,
            "status": "active",
            "model": request.get("model", "qwen2.5:3b") if request else "qwen2.5:3b",
            "created_at": "2025-01-01T00:00:00Z",
            "messages": [],
        }
        return conversation
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error creating conversation: {str(e)}"
        )


@app.post("/api/agent/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, message_request: dict):
    """Send a message in a conversation"""
    try:
        user_message = message_request.get("message", "")
        logger.info(
            f"Processing message for conversation {conversation_id}: {user_message[:100]}..."
        )

        # Create chat request for our MCP client
        from mcp_client import ChatRequest

        chat_request = ChatRequest(
            message=user_message, model="qwen2.5:3b", conversation_history=None
        )

        # Process with MCP client
        response = await app.state.mcp_client.process_query(chat_request)

        # Format response to match frontend expectations
        result = {
            "response": {
                "response": {
                    "content": response.response,
                    "model": response.model,
                    "tool_calls": response.tool_calls,
                }
            },
            "conversation_id": conversation_id,
            "message_id": f"msg_{id(asyncio.current_task())}",
            "status": "completed",
        }

        return result
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error processing message: {str(e)}"
        )


class ConnectionManager:
    """Simple WebSocket connection manager"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                # Parse the message
                message_data = json.loads(data)

                # Create chat request
                chat_request = ChatRequest(
                    message=message_data.get("message", ""),
                    model=message_data.get("model", "qwen2.5:3b"),
                    conversation_history=message_data.get("conversation_history"),
                )

                # Process the request
                response = await app.state.mcp_client.process_query(chat_request)

                # Send response back to client
                await manager.send_personal_message(
                    json.dumps(response.dict()), websocket
                )

            except json.JSONDecodeError:
                await manager.send_personal_message(
                    json.dumps({"error": "Invalid JSON format"}), websocket
                )
            except Exception as e:
                await manager.send_personal_message(
                    json.dumps({"error": str(e)}), websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("simple_main:app", host="0.0.0.0", port=8000, reload=True)
