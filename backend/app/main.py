from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.api import servers, tools, websockets, ollama, config, agent
from app.database import engine, Base
from app.mcp.manager import connection_manager
from app.ollama.service import ollama_service
from app.config.mcp_config import mcp_config_manager
from app.agent.service import agent_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting MCP Client API...")
    await connection_manager.start_health_monitoring()
    logger.info("MCP Connection Manager started")

    # Initialize Ollama service
    try:
        ollama_initialized = await ollama_service.initialize()
        if ollama_initialized:
            logger.info("Ollama service initialized successfully")
        else:
            logger.warning(
                "Ollama service initialization failed - Ollama may not be running"
            )
    except Exception as e:
        logger.error(f"Failed to initialize Ollama service: {e}")

    # Initialize MCP configuration
    try:
        config_loaded = await mcp_config_manager.load_config()
        if config_loaded:
            logger.info("MCP configuration loaded successfully")
            # Start file watcher for hot reload
            mcp_config_manager.start_file_watcher()
            logger.info("MCP configuration file watcher started")

            # Connect to MCP servers from configuration
            server_configs = mcp_config_manager.convert_to_server_configs()
            if server_configs:
                logger.info(
                    f"Connecting to {len(server_configs)} MCP servers from mcp.json..."
                )
                for server_config in server_configs:
                    try:
                        success = await connection_manager.add_server(server_config)
                        if success:
                            logger.info(
                                f"Connected to MCP server: {server_config.name}"
                            )
                        else:
                            logger.warning(
                                f"Failed to connect to MCP server: {server_config.name}"
                            )
                    except Exception as e:
                        logger.error(
                            f"Error connecting to MCP server {server_config.name}: {e}"
                        )
            else:
                logger.info("No MCP servers found in configuration")
        else:
            logger.warning("Failed to load MCP configuration")
    except Exception as e:
        logger.error(f"Failed to initialize MCP configuration: {e}")

    # Initialize Agent service
    try:
        agent_initialized = await agent_service.initialize()
        if agent_initialized:
            logger.info("Agent service initialized successfully")
        else:
            logger.warning("Agent service initialization failed")
    except Exception as e:
        logger.error(f"Failed to initialize Agent service: {e}")

    yield

    # Shutdown
    logger.info("Shutting down MCP Client API...")
    await connection_manager.cleanup()
    mcp_config_manager.stop_file_watcher()

    # Cleanup agent service
    if "agent_service" in globals():
        await agent_service.cleanup()

    logger.info("MCP Client API shutdown complete")


app = FastAPI(
    title="MCP Client API",
    description="Web-based Model Context Protocol client",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(servers.router, prefix="/api/servers", tags=["servers"])
app.include_router(tools.router, prefix="/api/tools", tags=["tools"])
app.include_router(websockets.router, tags=["websockets"])
app.include_router(ollama.router, prefix="/api", tags=["ollama"])
app.include_router(config.router, prefix="/api", tags=["config"])
app.include_router(agent.router, prefix="/api", tags=["agent"])


@app.get("/")
async def root():
    return {
        "message": "MCP Client API is running",
        "version": "1.0.0",
        "endpoints": {
            "servers": "/api/servers",
            "tools": "/api/tools",
            "ollama": "/api/ollama",
            "config": "/api/config",
            "agent": "/api/agent",
            "websockets": "/ws/{connection_id}",
            "health": "/health",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_connections": len(connection_manager.connections),
    }
