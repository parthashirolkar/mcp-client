from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.schemas import (
    MCPServerConfig,
    MCPServerConfigCreate,
    MCPServerConfigUpdate,
    ServerStatus,
)
from app.models.database_models import MCPServer as MCPServerModel
from app.mcp.manager import connection_manager
import json
from datetime import datetime

router = APIRouter()


# Helper function to convert database model to schema
def db_to_schema(db_server: MCPServerModel) -> MCPServerConfig:
    return MCPServerConfig(
        id=db_server.id,
        name=db_server.name,
        connection_type=db_server.connection_type,
        command=db_server.command,
        args=json.loads(db_server.args) if db_server.args else [],
        url=db_server.url,
        headers=json.loads(db_server.headers) if db_server.headers else {},
        timeout=db_server.timeout,
        retry_count=db_server.retry_count,
        enabled=db_server.enabled,
        status=ServerStatus(db_server.status),
        last_error=db_server.last_error,
        created_at=db_server.created_at.isoformat(),
        updated_at=db_server.updated_at.isoformat() if db_server.updated_at else None,
    )


@router.get("/", response_model=List[MCPServerConfig])
async def list_servers(db: Session = Depends(get_db)):
    """List all MCP servers"""
    servers = db.query(MCPServerModel).all()
    return [db_to_schema(server) for server in servers]


@router.post("/", response_model=MCPServerConfig)
async def create_server(
    server_config: MCPServerConfigCreate,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Create a new MCP server configuration"""

    # Validate configuration based on connection type
    if server_config.connection_type == "stdio" and not server_config.command:
        raise HTTPException(
            status_code=400, detail="Command is required for stdio connections"
        )

    if server_config.connection_type == "http" and not server_config.url:
        raise HTTPException(
            status_code=400, detail="URL is required for HTTP connections"
        )

    # Create database record
    db_server = MCPServerModel(
        name=server_config.name,
        connection_type=server_config.connection_type,
        command=server_config.command,
        args=json.dumps(server_config.args) if server_config.args else None,
        url=server_config.url,
        headers=json.dumps(server_config.headers) if server_config.headers else None,
        timeout=server_config.timeout,
        retry_count=server_config.retry_count,
        enabled=server_config.enabled,
        status=ServerStatus.DISCONNECTED,
    )

    db.add(db_server)
    db.commit()
    db.refresh(db_server)

    # Convert to schema
    schema_server = db_to_schema(db_server)

    # Connect to server in background if enabled
    if server_config.enabled:
        background_tasks.add_task(connection_manager.add_server, schema_server)

    return schema_server


@router.get("/{server_id}", response_model=MCPServerConfig)
async def get_server(server_id: int, db: Session = Depends(get_db)):
    """Get a specific MCP server configuration"""
    server = db.query(MCPServerModel).filter(MCPServerModel.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    return db_to_schema(server)


@router.put("/{server_id}", response_model=MCPServerConfig)
async def update_server(
    server_id: int,
    server_update: MCPServerConfigUpdate,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Update an MCP server configuration"""

    server = db.query(MCPServerModel).filter(MCPServerModel.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Update fields if provided
    update_data = server_update.dict(exclude_unset=True)

    # Handle JSON fields
    if "args" in update_data:
        update_data["args"] = (
            json.dumps(update_data["args"]) if update_data["args"] else None
        )

    if "headers" in update_data:
        update_data["headers"] = (
            json.dumps(update_data["headers"]) if update_data["headers"] else None
        )

    # Validate configuration if connection type is being updated
    if "connection_type" in update_data:
        connection_type = update_data["connection_type"]
        if connection_type == "stdio" and not server.command:
            raise HTTPException(
                status_code=400, detail="Command is required for stdio connections"
            )

        if connection_type == "http" and not server.url:
            raise HTTPException(
                status_code=400, detail="URL is required for HTTP connections"
            )

    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(server, field, value)

    db.commit()
    db.refresh(server)

    # Convert to schema
    schema_server = db_to_schema(server)

    # Reconnect in background if server is enabled
    if server.enabled:
        background_tasks.add_task(connection_manager.reconnect_server, server_id)

    return schema_server


@router.delete("/{server_id}")
async def delete_server(server_id: int, db: Session = Depends(get_db)):
    """Delete an MCP server configuration"""

    server = db.query(MCPServerModel).filter(MCPServerModel.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Disconnect from server
    await connection_manager.remove_server(server_id)

    # Delete from database
    db.delete(server)
    db.commit()

    return {"message": "Server deleted successfully"}


@router.post("/{server_id}/connect")
async def connect_server(
    server_id: int, background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Connect to an MCP server"""

    # Get server configuration
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        server = db.query(MCPServerModel).filter(MCPServerModel.id == server_id).first()
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")

        # Convert to schema
        schema_server = db_to_schema(server)

        # Connect in background
        background_tasks.add_task(connection_manager.add_server, schema_server)

        return {"message": f"Connecting to server {server.name}"}
    finally:
        db.close()


@router.post("/{server_id}/disconnect")
async def disconnect_server(server_id: int):
    """Disconnect from an MCP server"""

    await connection_manager.remove_server(server_id)

    # Update status in database
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        server = db.query(MCPServerModel).filter(MCPServerModel.id == server_id).first()
        if server:
            server.status = ServerStatus.DISCONNECTED
            server.last_error = None
            db.commit()
        return {"message": "Server disconnected"}
    finally:
        db.close()


@router.get("/{server_id}/status")
async def get_server_status(server_id: int):
    """Get real-time status of an MCP server"""

    status = connection_manager.get_server_status(server_id)
    if not status:
        raise HTTPException(status_code=404, detail="Server not found")

    return status


@router.get("/status/all")
async def get_all_server_status():
    """Get status of all MCP servers"""

    return connection_manager.get_all_server_status()


@router.post("/{server_id}/test-connection")
async def test_server_connection(server_id: int):
    """Test connection to an MCP server"""

    # Test by attempting to connect
    success = await connection_manager.reconnect_server(server_id)

    return {
        "success": success,
        "message": "Connection successful" if success else "Connection failed",
    }
