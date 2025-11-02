from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging
from app.mcp.manager import connection_manager

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.subscribers: Dict[
            str, List[str]
        ] = {}  # event_type -> list of connection_ids

    async def connect(self, websocket: WebSocket, connection_id: str):
        """Accept and store WebSocket connection"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket connection {connection_id} established")

    def disconnect(self, connection_id: str):
        """Remove WebSocket connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        # Remove from all subscriptions
        for event_type in self.subscribers:
            if connection_id in self.subscribers[event_type]:
                self.subscribers[event_type].remove(connection_id)

        logger.info(f"WebSocket connection {connection_id} closed")

    async def send_personal_message(self, message: dict, connection_id: str):
        """Send message to specific connection"""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_text(
                    json.dumps(message)
                )
            except Exception as e:
                logger.error(f"Failed to send message to {connection_id}: {e}")
                self.disconnect(connection_id)

    async def broadcast(self, message: dict, event_type: str = None):
        """Broadcast message to all or specific subscribers"""
        if event_type and event_type in self.subscribers:
            # Send to specific subscribers
            for connection_id in self.subscribers[event_type]:
                await self.send_personal_message(message, connection_id)
        else:
            # Send to all connections
            for connection_id in self.active_connections:
                await self.send_personal_message(message, connection_id)

    def subscribe(self, connection_id: str, event_type: str):
        """Subscribe connection to specific event type"""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        if connection_id not in self.subscribers[event_type]:
            self.subscribers[event_type].append(connection_id)

    def unsubscribe(self, connection_id: str, event_type: str):
        """Unsubscribe connection from specific event type"""
        if (
            event_type in self.subscribers
            and connection_id in self.subscribers[event_type]
        ):
            self.subscribers[event_type].remove(connection_id)


# Global WebSocket manager
ws_manager = ConnectionManager()


@router.websocket("/ws/{connection_id}")
async def websocket_endpoint(websocket: WebSocket, connection_id: str):
    """Main WebSocket endpoint"""
    await ws_manager.connect(websocket, connection_id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle different message types
            await handle_websocket_message(message, connection_id)

    except WebSocketDisconnect:
        ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error for {connection_id}: {e}")
        ws_manager.disconnect(connection_id)


async def handle_websocket_message(message: dict, connection_id: str):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type")
    data = message.get("data", {})

    if message_type == "subscribe":
        # Subscribe to specific events
        event_type = data.get("event_type")
        if event_type:
            ws_manager.subscribe(connection_id, event_type)
            await ws_manager.send_personal_message(
                {"type": "subscription_confirmed", "data": {"event_type": event_type}},
                connection_id,
            )

    elif message_type == "unsubscribe":
        # Unsubscribe from specific events
        event_type = data.get("event_type")
        if event_type:
            ws_manager.unsubscribe(connection_id, event_type)
            await ws_manager.send_personal_message(
                {
                    "type": "unsubscription_confirmed",
                    "data": {"event_type": event_type},
                },
                connection_id,
            )

    elif message_type == "get_status":
        # Request current status of all servers
        await send_current_status(connection_id)

    elif message_type == "get_tools":
        # Request current tools from all servers
        await send_current_tools(connection_id)

    else:
        # Unknown message type
        await ws_manager.send_personal_message(
            {
                "type": "error",
                "data": {"message": f"Unknown message type: {message_type}"},
            },
            connection_id,
        )


async def send_current_status(connection_id: str):
    """Send current status of all servers"""
    try:
        all_status = connection_manager.get_all_server_status()
        await ws_manager.send_personal_message(
            {"type": "status_update", "data": {"servers": all_status}}, connection_id
        )
    except Exception as e:
        logger.error(f"Failed to send status update: {e}")


async def send_current_tools(connection_id: str):
    """Send current tools from all servers"""
    try:
        all_tools = await connection_manager.list_all_tools()
        await ws_manager.send_personal_message(
            {"type": "tools_update", "data": {"servers": all_tools}}, connection_id
        )
    except Exception as e:
        logger.error(f"Failed to send tools update: {e}")


# Functions to be called by other parts of the application
async def notify_server_status_change(server_id: int, status: str, message: str = None):
    """Notify all subscribers about server status change"""
    await ws_manager.broadcast(
        {
            "type": "server_status_update",
            "data": {"server_id": server_id, "status": status, "message": message},
        },
        event_type="server_status",
    )


async def notify_tools_change(server_id: int = None):
    """Notify all subscribers about tools change"""
    if server_id:
        # Notify about specific server
        all_tools = await connection_manager.list_all_tools()
        await ws_manager.broadcast(
            {
                "type": "server_tools_update",
                "data": {"server_id": server_id, "tools": all_tools.get(server_id, [])},
            },
            event_type="tools",
        )
    else:
        # Notify about all tools
        all_tools = await connection_manager.list_all_tools()
        await ws_manager.broadcast(
            {"type": "tools_update", "data": {"servers": all_tools}}, event_type="tools"
        )


async def notify_tool_execution(server_id: int, tool_name: str, result: dict):
    """Notify about tool execution result"""
    await ws_manager.broadcast(
        {
            "type": "tool_execution_result",
            "data": {"server_id": server_id, "tool_name": tool_name, "result": result},
        },
        event_type="tool_execution",
    )
