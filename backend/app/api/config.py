from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import logging

from ..config.mcp_config import mcp_config_manager, MCPServerConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/config", tags=["config"])


# Request/Response models
class AddServerRequest(BaseModel):
    name: str
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    timeout: Optional[int] = None
    disabled: Optional[bool] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None


class UpdateServerRequest(BaseModel):
    server_name: str
    updates: Dict[str, Any]


class ServerResponse(BaseModel):
    name: str
    config: MCPServerConfig


class ConfigValidationResponse(BaseModel):
    valid: bool
    issues: List[str]
    server_count: int


async def ensure_config_loaded():
    """Ensure MCP configuration is loaded"""
    if not mcp_config_manager.config.mcpServers:
        loaded = await mcp_config_manager.load_config()
        if not loaded:
            raise HTTPException(
                status_code=500, detail="Failed to load MCP configuration"
            )
    return mcp_config_manager


@router.get("/")
async def get_config(config=Depends(ensure_config_loaded)):
    """Get current MCP configuration"""
    try:
        return {
            "mcpServers": {
                name: server_config.dict()
                for name, server_config in config.get_all_servers().items()
            }
        }
    except Exception as e:
        logger.error(f"Failed to get config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reload")
async def reload_config(config=Depends(ensure_config_loaded)):
    """Reload configuration from file"""
    try:
        success = await config.reload_config()
        if success:
            return {"message": "Configuration reloaded successfully"}
        else:
            raise HTTPException(
                status_code=500, detail="Failed to reload configuration"
            )
    except Exception as e:
        logger.error(f"Failed to reload config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/servers")
async def get_all_servers(config=Depends(ensure_config_loaded)):
    """Get all configured MCP servers"""
    try:
        servers = config.get_all_servers()
        return {
            "servers": {
                name: server_config.dict() for name, server_config in servers.items()
            },
            "count": len(servers),
        }
    except Exception as e:
        logger.error(f"Failed to get servers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/servers/{server_name}")
async def get_server(server_name: str, config=Depends(ensure_config_loaded)):
    """Get a specific server configuration"""
    try:
        server_config = config.get_server(server_name)
        if not server_config:
            raise HTTPException(
                status_code=404, detail=f"Server '{server_name}' not found"
            )

        return {"name": server_name, "config": server_config.dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get server {server_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/servers")
async def add_server(request: AddServerRequest, config=Depends(ensure_config_loaded)):
    """Add a new server configuration"""
    try:
        # Validate server name doesn't already exist
        if config.get_server(request.name):
            raise HTTPException(
                status_code=409, detail=f"Server '{request.name}' already exists"
            )

        # Create server config from request
        server_config_data = {
            k: v for k, v in request.dict().items() if k != "name" and v is not None
        }
        server_config = MCPServerConfig(**server_config_data)

        success = await config.add_server(request.name, server_config)
        if success:
            return {
                "message": f"Server '{request.name}' added successfully",
                "name": request.name,
                "config": server_config.dict(),
            }
        else:
            raise HTTPException(
                status_code=500, detail=f"Failed to add server '{request.name}'"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add server {request.name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/servers/{server_name}")
async def update_server(
    server_name: str, updates: Dict[str, Any], config=Depends(ensure_config_loaded)
):
    """Update a server configuration"""
    try:
        # Validate server exists
        if not config.get_server(server_name):
            raise HTTPException(
                status_code=404, detail=f"Server '{server_name}' not found"
            )

        success = await config.update_server(server_name, updates)
        if success:
            updated_config = config.get_server(server_name)
            return {
                "message": f"Server '{server_name}' updated successfully",
                "name": server_name,
                "config": updated_config.dict(),
            }
        else:
            raise HTTPException(
                status_code=500, detail=f"Failed to update server '{server_name}'"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update server {server_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/servers/{server_name}")
async def remove_server(server_name: str, config=Depends(ensure_config_loaded)):
    """Remove a server configuration"""
    try:
        # Validate server exists
        if not config.get_server(server_name):
            raise HTTPException(
                status_code=404, detail=f"Server '{server_name}' not found"
            )

        success = await config.remove_server(server_name)
        if success:
            return {"message": f"Server '{server_name}' removed successfully"}
        else:
            raise HTTPException(
                status_code=500, detail=f"Failed to remove server '{server_name}'"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove server {server_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/servers/{server_name}/enable")
async def enable_server(server_name: str, config=Depends(ensure_config_loaded)):
    """Enable a server"""
    try:
        success = await config.enable_server(server_name)
        if success:
            return {"message": f"Server '{server_name}' enabled successfully"}
        else:
            raise HTTPException(
                status_code=500, detail=f"Failed to enable server '{server_name}'"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to enable server {server_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/servers/{server_name}/disable")
async def disable_server(server_name: str, config=Depends(ensure_config_loaded)):
    """Disable a server"""
    try:
        success = await config.disable_server(server_name)
        if success:
            return {"message": f"Server '{server_name}' disabled successfully"}
        else:
            raise HTTPException(
                status_code=500, detail=f"Failed to disable server '{server_name}'"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to disable server {server_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/servers/enabled")
async def get_enabled_servers(config=Depends(ensure_config_loaded)):
    """Get only enabled servers"""
    try:
        servers = config.get_enabled_servers()
        return {
            "servers": {
                name: server_config.dict() for name, server_config in servers.items()
            },
            "count": len(servers),
        }
    except Exception as e:
        logger.error(f"Failed to get enabled servers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/servers/by-type")
async def get_servers_by_type(config=Depends(ensure_config_loaded)):
    """Get servers grouped by connection type"""
    try:
        servers_by_type = config.get_servers_by_type()
        return {
            "servers": {
                connection_type: {
                    name: server_config.dict()
                    for name, server_config in servers.items()
                }
                for connection_type, servers in servers_by_type.items()
            }
        }
    except Exception as e:
        logger.error(f"Failed to get servers by type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_config(config=Depends(ensure_config_loaded)):
    """Validate current configuration"""
    try:
        issues = await config.validate_config()
        return ConfigValidationResponse(
            valid=len(issues) == 0,
            issues=issues,
            server_count=len(config.get_all_servers()),
        )
    except Exception as e:
        logger.error(f"Failed to validate config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_config_status(config=Depends(ensure_config_loaded)):
    """Get configuration status and statistics"""
    try:
        all_servers = config.get_all_servers()
        enabled_servers = config.get_enabled_servers()
        servers_by_type = config.get_servers_by_type()

        return {
            "config_path": config.config_path,
            "total_servers": len(all_servers),
            "enabled_servers": len(enabled_servers),
            "disabled_servers": len(all_servers) - len(enabled_servers),
            "servers_by_type": {
                connection_type: len(servers)
                for connection_type, servers in servers_by_type.items()
            },
            "file_watcher_active": config.observer is not None
            and config.observer.is_alive(),
        }
    except Exception as e:
        logger.error(f"Failed to get config status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/watcher/start")
async def start_file_watcher(config=Depends(ensure_config_loaded)):
    """Start watching configuration file for changes"""
    try:
        config.start_file_watcher()
        return {"message": "File watcher started"}
    except Exception as e:
        logger.error(f"Failed to start file watcher: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/watcher/stop")
async def stop_file_watcher(config=Depends(ensure_config_loaded)):
    """Stop watching configuration file for changes"""
    try:
        config.stop_file_watcher()
        return {"message": "File watcher stopped"}
    except Exception as e:
        logger.error(f"Failed to stop file watcher: {e}")
        raise HTTPException(status_code=500, detail=str(e))
