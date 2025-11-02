import asyncio
import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
from datetime import datetime, timedelta
import uuid
from collections import deque

from ..ollama.service import ollama_service
from ..mcp.manager import connection_manager
from ..ollama.models import ConversationMessage, ToolResult

logger = logging.getLogger(__name__)


class AgentService:
    """Service for managing AI agent conversations with Ollama models and MCP tools"""

    # Resource limits to prevent memory leaks
    MAX_CONVERSATIONS = 1000
    MAX_MESSAGES_PER_CONVERSATION = 500
    MAX_CONVERSATION_AGE_HOURS = 24
    MAX_TOOL_EXECUTION_TIME = 60  # seconds

    def __init__(self):
        self.active_conversations: Dict[str, ConversationContext] = {}
        self.available_tools: Dict[str, Any] = {}
        self.mcp_tools_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.last_tools_update: Optional[datetime] = None

        # Add concurrency protection
        self._conversation_lock = asyncio.Lock()
        self._tools_lock = asyncio.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None

    async def initialize(self) -> bool:
        """Initialize the agent service"""
        try:
            # Load available MCP tools
            await self.refresh_mcp_tools()

            # Start background cleanup task
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

            logger.info("Agent service initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize agent service: {e}")
            return False

    async def cleanup(self) -> None:
        """Cleanup resources and stop background tasks"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

    async def _periodic_cleanup(self) -> None:
        """Periodic cleanup of old conversations and resources"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                await self._cleanup_old_conversations()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")

    async def _cleanup_old_conversations(self) -> None:
        """Clean up old conversations to prevent memory leaks"""
        try:
            async with self._conversation_lock:
                current_time = datetime.utcnow()
                conversations_to_remove = []

                for conv_id, context in self.active_conversations.items():
                    # Check conversation age
                    age = current_time - context.updated_at
                    if age > timedelta(hours=self.MAX_CONVERSATION_AGE_HOURS):
                        conversations_to_remove.append(conv_id)
                        continue

                    # Check message count
                    if len(context.messages) > self.MAX_MESSAGES_PER_CONVERSATION:
                        # Keep only the most recent messages
                        # Always keep system messages and the last N messages
                        system_messages = [
                            msg for msg in context.messages if msg.role == "system"
                        ]
                        recent_messages = context.messages[
                            -self.MAX_MESSAGES_PER_CONVERSATION :
                        ]
                        context.messages = system_messages + recent_messages

                # Remove old conversations
                for conv_id in conversations_to_remove:
                    context = self.active_conversations.pop(conv_id, None)
                    if context:
                        # Clean up Ollama conversation
                        try:
                            await ollama_service.delete_conversation(
                                context.ollama_conversation_id
                            )
                        except Exception as e:
                            logger.error(
                                f"Failed to delete Ollama conversation {conv_id}: {e}"
                            )

                if conversations_to_remove:
                    logger.info(
                        f"Cleaned up {len(conversations_to_remove)} old conversations"
                    )

        except Exception as e:
            logger.error(f"Error during conversation cleanup: {e}")

    def _convert_mcp_tool_to_openai(self, tool: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MCP tool format to OpenAI-compatible format for Ollama"""
        parameters = tool["inputSchema"]

        # Remove $schema field as Ollama doesn't support it
        if isinstance(parameters, dict) and "$schema" in parameters:
            parameters = parameters.copy()
            del parameters["$schema"]

        # Remove additionalProperties field as some models don't support it
        if isinstance(parameters, dict) and "additionalProperties" in parameters:
            parameters = parameters.copy()
            del parameters["additionalProperties"]

        return {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": parameters
            }
        }

    def get_tools_in_openai_format(self) -> List[Dict[str, Any]]:
        """Get all available tools in OpenAI-compatible format for Ollama"""
        if not self.available_tools:
            return []

        openai_tools = []
        for tool_key, tool in self.available_tools.items():
            openai_tool = self._convert_mcp_tool_to_openai(tool)
            openai_tools.append(openai_tool)

        return openai_tools

    async def refresh_mcp_tools(self) -> None:
        """Refresh available tools from MCP connection manager (MCP compliant)"""
        try:
            async with self._tools_lock:
                tools = []
                self.mcp_tools_cache.clear()

                # Use the existing MCP connection manager instead of creating direct connections
                all_tools = await connection_manager.list_all_tools()

                for server_id, server_tools in all_tools.items():
                    # Get server connection details
                    server_status = connection_manager.get_server_status(server_id)
                    if not server_status or server_status["status"] != "connected":
                        continue

                    server_name = server_status["name"]

                    # Convert tools to agent format
                    formatted_tools = []
                    for tool in server_tools:
                        # Use proper MCP tool naming convention
                        tool_key = f"{server_id}_{tool['name']}"
                        formatted_tool = {
                            "name": tool["name"],
                            "description": tool["description"],
                            "inputSchema": tool["input_schema"],
                            "server_id": server_id,
                            "server_name": server_name,
                            "key": tool_key,
                        }
                        formatted_tools.append(formatted_tool)

                    tools.extend(formatted_tools)
                    self.mcp_tools_cache[server_name] = {
                        "server_id": server_id,
                        "tools": server_tools,
                        "connected": True,
                    }

                self.available_tools = {tool["key"]: tool for tool in tools}
                self.last_tools_update = datetime.utcnow()

                # Get detailed connection info for logging
                connected_servers = connection_manager.get_connected_servers()
                total_servers = len(connection_manager.connections)

                logger.info(
                    f"Refreshed {len(tools)} tools from {len(connected_servers)}/{total_servers} MCP servers via connection manager"
                )
                logger.info(
                    f"Connected servers: {[conn.config.name for conn in connected_servers]}"
                )
                if len(connected_servers) < total_servers:
                    disconnected = [
                        conn.config.name
                        for conn in connection_manager.connections.values()
                        if conn.status != "connected"
                    ]
                    logger.warning(f"Disconnected servers: {disconnected}")

        except Exception as e:
            logger.error(f"Failed to refresh MCP tools: {e}")

    def _convert_to_openai_format(self, mcp_tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert MCP tool format to OpenAI function calling format"""
        openai_tools = []

        for tool in mcp_tools:
            try:
                # Extract the schema from MCP tool
                input_schema = tool.get("inputSchema", {})
                if hasattr(input_schema, "dict"):
                    input_schema = input_schema.dict()
                elif not isinstance(input_schema, dict):
                    input_schema = {}

                # Remove unsupported schema properties for Ollama
                cleaned_schema = input_schema.copy()
                for field in ["$schema", "additionalProperties"]:
                    if field in cleaned_schema:
                        del cleaned_schema[field]

                # Ensure required field exists and is valid
                if "required" in cleaned_schema:
                    if not isinstance(cleaned_schema["required"], list):
                        cleaned_schema["required"] = []
                else:
                    cleaned_schema["required"] = []

                # Ensure properties field exists
                if "properties" not in cleaned_schema:
                    cleaned_schema["properties"] = {}

                # Convert to OpenAI format
                openai_tool = {
                    "type": "function",
                    "function": {
                        "name": tool.get("name", "unknown"),
                        "description": tool.get("description", "No description available"),
                        "parameters": cleaned_schema
                    }
                }

                openai_tools.append(openai_tool)

            except Exception as e:
                logger.warning(f"Error converting tool {tool.get('name', 'unknown')} to OpenAI format: {e}")
                # Add a minimal tool entry even if conversion fails
                openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool.get("name", "unknown"),
                        "description": f"Tool with format conversion error: {str(e)}",
                        "parameters": {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    }
                })

        return openai_tools

    async def create_conversation(
        self,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new agent conversation"""
        try:
            if not conversation_id:
                conversation_id = str(uuid.uuid4())

            # Get best model if not specified
            if not model:
                model = await ollama_service.get_best_model_for_task(
                    requires_tools=len(self.available_tools) > 0, requires_json=True
                )

            # Create conversation in Ollama service
            ollama_conv = await ollama_service.create_conversation(model, system_prompt)

            # Create agent conversation context
            context = ConversationContext(
                conversation_id=conversation_id,
                ollama_conversation_id=ollama_conv["conversation_id"],
                model=model,
                system_prompt=system_prompt,
                available_tools=list(self.available_tools.values()),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            self.active_conversations[conversation_id] = context

            return {
                "conversation_id": conversation_id,
                "model": model,
                "system_prompt": system_prompt,
                "available_tools_count": len(self.available_tools),
                "created_at": context.created_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to create conversation: {e}")
            raise

    async def send_message(
        self, conversation_id: str, message: str, stream: bool = False
    ) -> Dict[str, Any]:
        """Send a message to the agent and get response"""
        try:
            context = self.active_conversations.get(conversation_id)
            if not context:
                raise ValueError(f"Conversation {conversation_id} not found")

            # Prepare available tools for this message in OpenAI format
            tools_for_message = None
            if self.available_tools:
                tools_for_message = self.get_tools_in_openai_format()

            # Send message to Ollama with tools
            response = await ollama_service.send_message(
                context.ollama_conversation_id, message, tools_for_message
            )

            # Update conversation timestamp
            context.updated_at = datetime.utcnow()

            # Process tool calls if any
            tool_results = []
            if response.get("requires_tool_execution") and response.get("tool_calls"):
                tool_results = await self._execute_tool_calls(
                    conversation_id, response["tool_calls"]
                )

                # If tools were executed, get a follow-up response
                if tool_results:
                    followup_response = await self._get_followup_response(
                        conversation_id, tool_results
                    )
                    response["followup_response"] = followup_response

            # Add to conversation history
            context.add_message("user", message)
            context.add_message("assistant", response["response"]["content"])

            return {
                "conversation_id": conversation_id,
                "response": response,
                "tool_results": tool_results,
                "has_tool_calls": bool(response.get("tool_calls")),
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise

    async def send_message_stream(
        self, conversation_id: str, message: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send a message and stream the response"""
        try:
            context = self.active_conversations.get(conversation_id)
            if not context:
                raise ValueError(f"Conversation {conversation_id} not found")

            # Yield initial status
            yield {
                "type": "start",
                "conversation_id": conversation_id,
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Prepare tools in OpenAI format for Ollama
            # TEMPORARILY DISABLE TOOLS TO TEST IF TOOLS ARE CAUSING 400 ERROR
            tools_for_message = None
            logger.info("🔧 DEBUG: Tools disabled to test if they cause 400 error")

            # This would need streaming support in Ollama service
            # For now, we'll simulate streaming
            response = await ollama_service.send_message(
                context.ollama_conversation_id, message, tools_for_message
            )

            # Process tool calls if any
            tool_results = []
            if response.get("requires_tool_execution") and response.get("tool_calls"):
                yield {
                    "type": "tools_start",
                    "tool_calls": response["tool_calls"],
                    "timestamp": datetime.utcnow().isoformat(),
                }

                tool_results = await self._execute_tool_calls(
                    conversation_id, response["tool_calls"]
                )

                yield {
                    "type": "tools_complete",
                    "tool_results": tool_results,
                    "timestamp": datetime.utcnow().isoformat(),
                }

            # Yield final response
            yield {
                "type": "complete",
                "response": response,
                "tool_results": tool_results,
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Update conversation
            context.updated_at = datetime.utcnow()
            context.add_message("user", message)
            context.add_message("assistant", response["response"]["content"])

        except Exception as e:
            logger.error(f"Failed to stream message: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def _execute_tool_calls(
        self, conversation_id: str, tool_calls: List[Dict[str, Any]]
    ) -> List[ToolResult]:
        """Execute a list of tool calls with MCP-compliant security validation"""
        try:
            results = []
            context = self.active_conversations.get(conversation_id)

            for tool_call in tool_calls:
                # Security: Validate tool call format
                if not isinstance(tool_call, dict):
                    results.append(
                        ToolResult(
                            tool="invalid",
                            arguments={},
                            result="Error: Invalid tool call format",
                            success=False,
                            error="Invalid tool call format",
                        )
                    )
                    continue

                tool_name = tool_call.get("tool")
                arguments = tool_call.get("arguments", {})
                tool_call.get("id", str(uuid.uuid4()))

                # Security: Validate tool name
                if not tool_name or not isinstance(tool_name, str):
                    results.append(
                        ToolResult(
                            tool="invalid",
                            arguments=arguments,
                            result="Error: Tool name is required and must be a string",
                            success=False,
                            error="Invalid tool name",
                        )
                    )
                    continue

                # Security: Validate arguments
                if not isinstance(arguments, dict):
                    results.append(
                        ToolResult(
                            tool=tool_name,
                            arguments={},
                            result="Error: Tool arguments must be a dictionary",
                            success=False,
                            error="Invalid tool arguments",
                        )
                    )
                    continue

                # Find the tool in available tools
                tool_info = None
                for tool_key, tool_data in self.available_tools.items():
                    if tool_data.get("name") == tool_name:
                        tool_info = tool_data
                        break

                if not tool_info:
                    result = ToolResult(
                        tool=tool_name,
                        arguments=arguments,
                        result=f"Error: Tool '{tool_name}' not found in available tools",
                        success=False,
                        error="Tool not found",
                    )
                else:
                    # Execute the tool via MCP connection manager (MCP compliant)
                    server_id = tool_info.get("server_id")
                    if server_id is not None:
                        try:
                            # Create execution request for MCP manager
                            from ..models.schemas import ToolExecutionRequest

                            execution_request = ToolExecutionRequest(
                                server_id=server_id,
                                tool_name=tool_name,
                                arguments=arguments,
                            )

                            # Execute tool with timeout via MCP manager
                            execution_result = await asyncio.wait_for(
                                connection_manager.execute_tool(execution_request),
                                timeout=self.MAX_TOOL_EXECUTION_TIME,
                            )

                            if execution_result.get("success"):
                                # Clean up the result for display per MCP spec
                                tool_result = execution_result.get("result")
                                if isinstance(tool_result, dict):
                                    # Handle MCP tool result format
                                    if "content" in tool_result:
                                        display_result = tool_result["content"]
                                    elif "data" in tool_result:
                                        display_result = tool_result["data"]
                                    else:
                                        display_result = str(tool_result)
                                elif hasattr(tool_result, "content"):
                                    # Handle MCP TextContent/ImageContent objects
                                    display_result = str(
                                        getattr(tool_result, "content", tool_result)
                                    )
                                else:
                                    display_result = str(tool_result)

                                result = ToolResult(
                                    tool=tool_name,
                                    arguments=arguments,
                                    result=display_result,
                                    success=True,
                                )
                            else:
                                error_msg = execution_result.get(
                                    "error", "Unknown MCP execution error"
                                )
                                result = ToolResult(
                                    tool=tool_name,
                                    arguments=arguments,
                                    result=f"MCP tool execution failed: {error_msg}",
                                    success=False,
                                    error=error_msg,
                                )

                        except asyncio.TimeoutError:
                            result = ToolResult(
                                tool=tool_name,
                                arguments=arguments,
                                result=f"Tool execution timed out after {self.MAX_TOOL_EXECUTION_TIME} seconds",
                                success=False,
                                error="Tool execution timeout",
                            )
                        except Exception as e:
                            logger.error(
                                f"MCP tool execution error for {tool_name}: {e}"
                            )
                            result = ToolResult(
                                tool=tool_name,
                                arguments=arguments,
                                result=f"Error executing tool via MCP: {str(e)}",
                                success=False,
                                error=str(e),
                            )
                    else:
                        result = ToolResult(
                            tool=tool_name,
                            arguments=arguments,
                            result=f"Error: Tool '{tool_name}' has no server_id configured",
                            success=False,
                            error="No server ID configured - tool discovery may be incomplete",
                        )

                results.append(result)

                # Add tool result to conversation
                if context:
                    context.add_tool_result(result)

            return results

        except Exception as e:
            logger.error(f"Failed to execute tool calls: {e}")
            return []

    async def _get_followup_response(
        self, conversation_id: str, tool_results: List[ToolResult]
    ) -> Dict[str, Any]:
        """Get a follow-up response after tool execution"""
        try:
            context = self.active_conversations.get(conversation_id)
            if not context:
                return {"response": {"content": "Conversation not found"}}

            # Create tool results message for the model
            tool_results_message = "Tool execution completed. Results:\n"
            for i, result in enumerate(tool_results, 1):
                status = "✅ Success" if result.success else "❌ Failed"
                tool_results_message += f"{i}. {result.tool}: {status}\n"
                if result.success:
                    # Truncate long results for readability
                    result_text = str(result.result)
                    if len(result_text) > 500:
                        result_text = result_text[:500] + "... (truncated)"
                    tool_results_message += f"   Result: {result_text}\n"
                else:
                    tool_results_message += f"   Error: {result.error}\n"
                tool_results_message += "\n"

            # Get follow-up response with context
            response = await ollama_service.send_message(
                context.ollama_conversation_id,
                f"Please respond to the user based on these tool results:\n\n{tool_results_message}",
            )

            return response

        except Exception as e:
            logger.error(f"Failed to get followup response: {e}")
            return {
                "response": {
                    "content": f"I encountered an error while processing the tool results: {str(e)}"
                }
            }

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation details"""
        context = self.active_conversations.get(conversation_id)
        if not context:
            return None

        return {
            "conversation_id": conversation_id,
            "model": context.model,
            "system_prompt": context.system_prompt,
            "message_count": len(context.messages),
            "created_at": context.created_at.isoformat(),
            "updated_at": context.updated_at.isoformat(),
            "available_tools_count": len(self.available_tools),
        }

    async def get_conversation_history(
        self, conversation_id: str
    ) -> List[Dict[str, Any]]:
        """Get conversation message history"""
        context = self.active_conversations.get(conversation_id)
        if not context:
            return []

        return [message.dict() for message in context.messages]

    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation"""
        try:
            context = self.active_conversations.get(conversation_id)
            if not context:
                return False

            # Delete from Ollama service
            await ollama_service.delete_conversation(context.ollama_conversation_id)

            # Remove from active conversations
            del self.active_conversations[conversation_id]

            return True

        except Exception as e:
            logger.error(f"Failed to delete conversation: {e}")
            return False

    async def get_available_tools(self) -> Dict[str, Any]:
        """Get all available tools from MCP servers"""
        return {
            "tools": list(self.available_tools.values()),
            "count": len(self.available_tools),
            "servers": list(self.mcp_tools_cache.keys()),
            "last_updated": self.last_tools_update.isoformat()
            if self.last_tools_update
            else None,
        }

    async def get_agent_status(self) -> Dict[str, Any]:
        """Get overall agent service status"""
        connected_servers = len(
            [
                conn
                for conn in connection_manager.connections.values()
                if conn.status == "connected"
            ]
        )

        return {
            "active_conversations": len(self.active_conversations),
            "available_tools": len(self.available_tools),
            "connected_mcp_servers": connected_servers,
            "ollama_available": ollama_service.is_initialized,
            "tools_last_updated": self.last_tools_update.isoformat()
            if self.last_tools_update
            else None,
            "mcp_servers": {
                name: {
                    "status": conn.status,
                    "tools": len(self.mcp_tools_cache.get(name, [])),
                }
                for name, conn in connection_manager.connections.items()
            },
        }


class ConversationContext:
    """Context for an active conversation"""

    def __init__(
        self,
        conversation_id: str,
        ollama_conversation_id: str,
        model: str,
        system_prompt: Optional[str],
        available_tools: List[Dict[str, Any]],
        created_at: datetime,
        updated_at: datetime,
    ):
        self.conversation_id = conversation_id
        self.ollama_conversation_id = ollama_conversation_id
        self.model = model
        self.system_prompt = system_prompt
        self.available_tools = available_tools
        # Use deque with maxlen for automatic memory management
        self.messages: deque = deque(maxlen=AgentService.MAX_MESSAGES_PER_CONVERSATION)
        self.tool_results: deque = deque(maxlen=100)  # Limit tool results
        self.created_at = created_at
        self.updated_at = updated_at

    def add_message(self, role: str, content: str) -> None:
        """Add a message to the conversation"""
        message = ConversationMessage(
            role=role, content=content, timestamp=datetime.utcnow().isoformat()
        )
        self.messages.append(message)
        self.updated_at = datetime.utcnow()

    def add_tool_result(self, result: ToolResult) -> None:
        """Add a tool execution result"""
        self.tool_results.append(result)
        self.updated_at = datetime.utcnow()

    def get_message_count(self) -> int:
        """Get the current number of messages"""
        return len(self.messages)

    def get_recent_messages(
        self, limit: Optional[int] = None
    ) -> List[ConversationMessage]:
        """Get recent messages from the conversation"""
        if limit is None:
            return list(self.messages)
        else:
            return list(self.messages)[-limit:]


# Global agent service instance
agent_service = AgentService()
