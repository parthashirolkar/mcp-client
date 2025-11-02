import json
import os
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

logger = logging.getLogger(__name__)


class MCPServerConfig(BaseModel):
    """MCP Server configuration matching Claude Desktop format"""

    command: Optional[str] = Field(
        None, description="Command to run for stdio connection"
    )
    args: Optional[List[str]] = Field(
        default_factory=list, description="Arguments for the command"
    )
    env: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="Environment variables"
    )
    timeout: Optional[int] = Field(60, description="Connection timeout in seconds")
    disabled: Optional[bool] = Field(
        False, description="Whether this server is disabled"
    )

    # WebSocket connection support
    url: Optional[str] = Field(None, description="WebSocket URL for connection")
    headers: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="WebSocket headers"
    )


class MCPConfiguration(BaseModel):
    """Top-level MCP configuration matching Claude Desktop format"""

    mcpServers: Dict[str, MCPServerConfig] = Field(
        default_factory=dict, description="MCP servers configuration"
    )


class MCPConfigManager:
    """Manages MCP configuration with hot reload support"""

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.path.join(os.getcwd(), "mcp.json")
        self.config: MCPConfiguration = MCPConfiguration()
        self.observer: Optional[Observer] = None
        self._callbacks: List[callable] = []
        self._lock = asyncio.Lock()

    def add_change_callback(self, callback: callable) -> None:
        """Add a callback to be called when configuration changes"""
        self._callbacks.append(callback)

    async def load_config(self) -> bool:
        """Load configuration from file"""
        try:
            config_file = Path(self.config_path)

            if not config_file.exists():
                logger.info(
                    f"Config file {self.config_path} not found, creating default"
                )
                await self._create_default_config()
                return True

            async with self._lock:
                with open(config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Validate and load configuration
                self.config = MCPConfiguration(**data)
                logger.info(f"Loaded MCP configuration from {self.config_path}")
                logger.info(f"Found {len(self.config.mcpServers)} MCP servers")

                return True

        except Exception as e:
            logger.error(f"Failed to load MCP configuration: {e}")
            return False

    async def save_config(self) -> bool:
        """Save current configuration to file"""
        try:
            async with self._lock:
                config_file = Path(self.config_path)
                config_file.parent.mkdir(parents=True, exist_ok=True)

                with open(config_file, "w", encoding="utf-8") as f:
                    json.dump(self.config.dict(), f, indent=2, ensure_ascii=False)

                logger.info(f"Saved MCP configuration to {self.config_path}")
                return True

        except Exception as e:
            logger.error(f"Failed to save MCP configuration: {e}")
            return False

    async def _create_default_config(self) -> None:
        """Create a default configuration file"""
        default_config = {
            "mcpServers": {
                "filesystem": {
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
                },
                "git": {
                    "command": "uvx",
                    "args": ["mcp-server-git", "--repository", "."],
                },
            }
        }

        self.config = MCPConfiguration(**default_config)
        await self.save_config()

    def get_all_servers(self) -> Dict[str, MCPServerConfig]:
        """Get all configured MCP servers"""
        return self.config.mcpServers

    def get_server(self, name: str) -> Optional[MCPServerConfig]:
        """Get a specific server configuration"""
        return self.config.mcpServers.get(name)

    async def add_server(self, name: str, config: MCPServerConfig) -> bool:
        """Add or update a server configuration"""
        try:
            async with self._lock:
                self.config.mcpServers[name] = config
                success = await self.save_config()
                if success:
                    await self._notify_change(
                        "server_added", {"name": name, "config": config}
                    )
                return success
        except Exception as e:
            logger.error(f"Failed to add server {name}: {e}")
            return False

    async def remove_server(self, name: str) -> bool:
        """Remove a server configuration"""
        try:
            async with self._lock:
                if name in self.config.mcpServers:
                    del self.config.mcpServers[name]
                    success = await self.save_config()
                    if success:
                        await self._notify_change("server_removed", {"name": name})
                    return success
                else:
                    logger.warning(f"Server {name} not found in configuration")
                    return False
        except Exception as e:
            logger.error(f"Failed to remove server {name}: {e}")
            return False

    async def update_server(self, name: str, updates: Dict[str, Any]) -> bool:
        """Update a server configuration"""
        try:
            async with self._lock:
                if name not in self.config.mcpServers:
                    return False

                current = self.config.mcpServers[name].dict()
                current.update(updates)
                self.config.mcpServers[name] = MCPServerConfig(**current)

                success = await self.save_config()
                if success:
                    await self._notify_change(
                        "server_updated", {"name": name, "updates": updates}
                    )
                return success
        except Exception as e:
            logger.error(f"Failed to update server {name}: {e}")
            return False

    async def enable_server(self, name: str) -> bool:
        """Enable a server"""
        return await self.update_server(name, {"disabled": False})

    async def disable_server(self, name: str) -> bool:
        """Disable a server"""
        return await self.update_server(name, {"disabled": True})

    def get_enabled_servers(self) -> Dict[str, MCPServerConfig]:
        """Get only enabled servers"""
        return {
            name: config
            for name, config in self.config.mcpServers.items()
            if not config.disabled
        }

    def convert_to_server_configs(self) -> List["MCPServerConfig"]:
        """Convert mcp.json servers to MCPServerConfig format for connection manager"""
        from ..models.schemas import MCPServerConfig, ConnectionType, ServerStatus
        from datetime import datetime

        server_configs = []

        for name, config in self.config.mcpServers.items():
            # Skip disabled servers
            if config.disabled:
                continue

            # Determine connection type
            if config.command and config.command.strip():
                connection_type = ConnectionType.STDIO
            elif config.url and config.url.strip():
                connection_type = ConnectionType.HTTP
            else:
                logger.warning(
                    f"Server '{name}' has no valid connection method, skipping"
                )
                continue

            # Create MCPServerConfig with negative ID to avoid conflicts with DB
            # Connection manager doesn't need DB IDs for config-based servers
            server_config = MCPServerConfig(
                id=hash(name) % 1000000 * -1,  # Negative ID to distinguish from DB
                name=name,
                connection_type=connection_type,
                command=config.command,
                args=config.args or [],
                url=config.url,
                headers=config.headers or {},
                timeout=config.timeout or 60,
                retry_count=3,
                enabled=not config.disabled,
                status=ServerStatus.DISCONNECTED,
                last_error=None,
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
            )

            server_configs.append(server_config)

        logger.info(
            f"Converted {len(server_configs)} servers from mcp.json to connection manager format"
        )
        return server_configs

    def get_servers_by_type(self) -> Dict[str, Dict[str, MCPServerConfig]]:
        """Group servers by connection type"""
        result = {"stdio": {}, "websocket": {}}

        for name, config in self.config.mcpServers.items():
            if config.command and config.command.strip():
                result["stdio"][name] = config
            elif config.url and config.url.strip():
                result["websocket"][name] = config
            else:
                # Default to stdio if unsure
                result["stdio"][name] = config

        return result

    async def validate_config(self) -> List[str]:
        """Validate configuration and return list of issues"""
        issues = []

        for name, config in self.config.mcpServers.items():
            # Check if at least one connection method is defined
            if not config.command and not config.url:
                issues.append(f"Server '{name}' has neither command nor url defined")

            # Check stdio configuration
            if config.command:
                if not config.command.strip():
                    issues.append(f"Server '{name}' has empty command")
                elif config.args and not isinstance(config.args, list):
                    issues.append(f"Server '{name}' args must be a list")

            # Check websocket configuration
            if config.url:
                if not config.url.strip():
                    issues.append(f"Server '{name}' has empty url")
                elif not (
                    config.url.startswith("ws://") or config.url.startswith("wss://")
                ):
                    issues.append(
                        f"Server '{name}' url must start with ws:// or wss://"
                    )

        return issues

    async def _notify_change(self, change_type: str, data: Dict[str, Any]) -> None:
        """Notify all callbacks of configuration changes"""
        try:
            for callback in self._callbacks:
                if asyncio.iscoroutinefunction(callback):
                    await callback(change_type, data)
                else:
                    callback(change_type, data)
        except Exception as e:
            logger.error(f"Error notifying config change callbacks: {e}")

    def start_file_watcher(self) -> None:
        """Start watching the configuration file for changes"""
        try:
            if self.observer:
                return  # Already watching

            event_handler = ConfigFileChangeHandler(self)
            self.observer = Observer()

            config_dir = os.path.dirname(os.path.abspath(self.config_path))
            self.observer.schedule(event_handler, config_dir, recursive=False)
            self.observer.start()

            logger.info(f"Started watching {self.config_path} for changes")

        except Exception as e:
            logger.error(f"Failed to start file watcher: {e}")

    def stop_file_watcher(self) -> None:
        """Stop watching the configuration file"""
        try:
            if self.observer:
                self.observer.stop()
                self.observer.join()
                self.observer = None
                logger.info("Stopped watching configuration file")
        except Exception as e:
            logger.error(f"Failed to stop file watcher: {e}")

    async def reload_config(self) -> bool:
        """Reload configuration from file and notify callbacks"""
        try:
            old_servers = set(self.config.mcpServers.keys())
            success = await self.load_config()

            if success:
                new_servers = set(self.config.mcpServers.keys())

                # Detect changes
                added = new_servers - old_servers
                removed = old_servers - new_servers

                # Notify of changes
                for server_name in added:
                    await self._notify_change(
                        "server_added",
                        {
                            "name": server_name,
                            "config": self.config.mcpServers[server_name],
                        },
                    )

                for server_name in removed:
                    await self._notify_change("server_removed", {"name": server_name})

                # Check for updates in existing servers
                for server_name in old_servers & new_servers:
                    # Simple comparison - could be enhanced
                    await self._notify_change(
                        "server_updated",
                        {
                            "name": server_name,
                            "config": self.config.mcpServers[server_name],
                        },
                    )

            return success

        except Exception as e:
            logger.error(f"Failed to reload configuration: {e}")
            return False


class ConfigFileChangeHandler(FileSystemEventHandler):
    """File system event handler for configuration file changes"""

    def __init__(self, config_manager: MCPConfigManager):
        self.config_manager = config_manager
        self.config_filename = os.path.basename(config_manager.config_path)

    def on_modified(self, event):
        """Handle file modification events"""
        if event.is_directory:
            return

        if event.src_path.endswith(self.config_filename):
            logger.info(f"Configuration file {event.src_path} changed, reloading...")
            try:
                # Use asyncio to schedule the reload
                loop = asyncio.get_event_loop()
                loop.create_task(self.config_manager.reload_config())
            except Exception as e:
                logger.error(f"Failed to schedule config reload: {e}")


# Global configuration manager instance
mcp_config_manager = MCPConfigManager()
