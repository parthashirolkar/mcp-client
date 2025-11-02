from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, Optional
import json
import logging

from ..agent.service import agent_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])


# Request/Response models
class CreateConversationRequest(BaseModel):
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    conversation_id: Optional[str] = None


class SendMessageRequest(BaseModel):
    message: str
    stream: Optional[bool] = False


class ConversationResponse(BaseModel):
    conversation_id: str
    model: str
    system_prompt: Optional[str]
    message_count: int
    created_at: str
    updated_at: str


class AgentStatusResponse(BaseModel):
    active_conversations: int
    available_tools: int
    connected_mcp_servers: int
    ollama_available: bool
    tools_last_updated: Optional[str]


# WebSocket connection manager
class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket connected: {connection_id}")

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_message(self, connection_id: str, message: dict):
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(
                    f"Failed to send WebSocket message to {connection_id}: {e}"
                )
                self.disconnect(connection_id)


websocket_manager = WebSocketManager()


@router.post("/initialize")
async def initialize_agent():
    """Initialize the agent service"""
    try:
        success = await agent_service.initialize()
        if success:
            return {"message": "Agent service initialized successfully"}
        else:
            raise HTTPException(
                status_code=500, detail="Failed to initialize agent service"
            )
    except Exception as e:
        logger.error(f"Failed to initialize agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(request: CreateConversationRequest):
    """Create a new agent conversation"""
    try:
        result = await agent_service.create_conversation(
            model=request.model,
            system_prompt=request.system_prompt,
            conversation_id=request.conversation_id,
        )

        return ConversationResponse(
            conversation_id=result["conversation_id"],
            model=result["model"],
            system_prompt=result.get("system_prompt"),
            message_count=0,
            created_at=result["created_at"],
            updated_at=result["created_at"],
        )
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation details"""
    try:
        conversation = await agent_service.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=404, detail=f"Conversation {conversation_id} not found"
            )
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """Send a message to the agent"""
    try:
        if request.stream:
            # For streaming, we'll return a different endpoint
            raise HTTPException(
                status_code=400, detail="Use WebSocket endpoint for streaming messages"
            )

        response = await agent_service.send_message(
            conversation_id, request.message, stream=False
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}/history")
async def get_conversation_history(conversation_id: str):
    """Get conversation message history"""
    try:
        history = await agent_service.get_conversation_history(conversation_id)
        return {"messages": history}
    except Exception as e:
        logger.error(f"Failed to get conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation"""
    try:
        success = await agent_service.delete_conversation(conversation_id)
        if success:
            return {"message": f"Conversation {conversation_id} deleted successfully"}
        else:
            raise HTTPException(
                status_code=404, detail=f"Conversation {conversation_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def list_conversations():
    """List all active conversations"""
    try:
        conversations = []
        for conv_id, context in agent_service.active_conversations.items():
            conversations.append(
                {
                    "conversation_id": conv_id,
                    "model": context.model,
                    "message_count": len(context.messages),
                    "created_at": context.created_at.isoformat(),
                    "updated_at": context.updated_at.isoformat(),
                }
            )
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tools")
async def get_available_tools():
    """Get all available tools from MCP servers"""
    try:
        tools = await agent_service.get_available_tools()
        return tools
    except Exception as e:
        logger.error(f"Failed to get available tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tools/refresh")
async def refresh_tools():
    """Refresh available tools from MCP servers"""
    try:
        await agent_service.refresh_mcp_tools()
        return {"message": "Tools refreshed successfully"}
    except Exception as e:
        logger.error(f"Failed to refresh tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=AgentStatusResponse)
async def get_agent_status():
    """Get agent service status"""
    try:
        status = await agent_service.get_agent_status()
        return AgentStatusResponse(**status)
    except Exception as e:
        logger.error(f"Failed to get agent status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for streaming conversations"""
    connection_id = f"{conversation_id}_{id(websocket)}"

    try:
        await websocket_manager.connect(websocket, connection_id)

        # Send initial connection confirmation
        await websocket_manager.send_message(
            connection_id,
            {
                "type": "connected",
                "conversation_id": conversation_id,
                "timestamp": "now",
            },
        )

        # Listen for messages
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)

                if message_data.get("type") == "message":
                    # Handle incoming message
                    message = message_data.get("message", "")
                    if not message:
                        await websocket_manager.send_message(
                            connection_id,
                            {"type": "error", "error": "Message cannot be empty"},
                        )
                        continue

                    # Stream response
                    async for chunk in agent_service.send_message_stream(
                        conversation_id, message
                    ):
                        await websocket_manager.send_message(connection_id, chunk)

                elif message_data.get("type") == "ping":
                    # Handle ping/pong for connection health
                    await websocket_manager.send_message(
                        connection_id, {"type": "pong", "timestamp": "now"}
                    )

            except json.JSONDecodeError:
                await websocket_manager.send_message(
                    connection_id, {"type": "error", "error": "Invalid JSON message"}
                )
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await websocket_manager.send_message(
                    connection_id, {"type": "error", "error": str(e)}
                )

    except WebSocketDisconnect:
        websocket_manager.disconnect(connection_id)
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(connection_id)


@router.post("/demo")
async def demo_agent():
    """Demo endpoint to test agent functionality"""
    try:
        # Create a conversation
        conv = await agent_service.create_conversation(
            system_prompt="You are a helpful AI assistant with access to various tools. Use tools when appropriate to help users."
        )

        conversation_id = conv["conversation_id"]

        # Send a test message
        response = await agent_service.send_message(
            conversation_id, "Hello! What tools do you have available?"
        )

        return {
            "conversation_id": conversation_id,
            "response": response,
            "tools_available": len(agent_service.available_tools),
        }
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
