from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.database import Base
from app.models.schemas import ServerStatus


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    connection_type = Column(String, nullable=False)  # "stdio" or "http"

    # stdio connection fields
    command = Column(String, nullable=True)
    args = Column(JSON, nullable=True)  # List of arguments

    # HTTP connection fields
    url = Column(String, nullable=True)
    headers = Column(JSON, nullable=True)  # Dict of headers

    # Common configuration
    timeout = Column(Integer, default=30)
    retry_count = Column(Integer, default=3)
    enabled = Column(Boolean, default=True)

    # Status tracking
    status = Column(String, default=ServerStatus.DISCONNECTED)
    last_error = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ToolExecution(Base):
    __tablename__ = "tool_executions"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, nullable=False, index=True)
    tool_name = Column(String, nullable=False)
    arguments = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    success = Column(Boolean, default=False)
    execution_time = Column(Integer, nullable=True)  # milliseconds
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
