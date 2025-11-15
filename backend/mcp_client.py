import json
from contextlib import AsyncExitStack
from typing import Dict, Any, Optional, List
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import ollama
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    model: str = "qwen2.5:3b"
    conversation_history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    response: str
    model: str
    tool_calls: Optional[List[Dict[str, Any]]] = None


class MCPClient:
    """
    Simplified MCP Client following official MCP documentation patterns.
    Replaces the complex Agent + MCP Manager + Ollama service architecture.
    """

    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.ollama_client = ollama.AsyncClient()
        self.connected_servers: List[str] = []
        self.available_tools: List[Dict[str, Any]] = []
        self.conversation_history: List[
            ChatMessage
        ] = []  # Maintain conversation history
        self.system_prompt = """You are a helpful AI assistant with access to powerful analytical tools through the Model Context Protocol (MCP).

**Your Personality:**
- You are knowledgeable, friendly, and professional
- You explain complex concepts clearly and concisely
- You are proactive in using tools when they can help answer questions
- You provide context and insights beyond just raw data

**Your Capabilities:**
You have access to real-time Indian stock market tools that can:
- Get current stock prices and company fundamentals
- Analyze historical data and technical indicators
- Provide market overviews and sector performance
- Search for stocks and retrieve recent news

**Guidelines:**
- Always use tools when they can provide more accurate or current information
- Explain what tools you're using and why
- Provide both data and insights/analysis
- Be conversational but focused on helping the user
- If you don't have information, be honest about limitations

You are here to help with stock market analysis, financial data, and investment insights using your specialized tools."""

    async def connect_to_servers(self, config_path: str = "mcp.json"):
        """
        Connect to MCP servers using configuration file.
        Follows the official MCP client pattern.
        """
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"MCP configuration file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in configuration file: {e}")

        if "mcpServers" not in config:
            raise ValueError("Configuration must contain 'mcpServers' section")

        # For simplicity, connect to the first server
        # In the future, we could support multiple servers
        server_name, server_config = next(iter(config["mcpServers"].items()))

        print(f"Connecting to MCP server: {server_name}")

        # Build server parameters following official pattern
        server_params = StdioServerParameters(
            command=server_config["command"],
            args=server_config["args"],
            env=server_config.get("env"),
        )

        try:
            # Create stdio transport using official SDK
            stdio_transport = await self.exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self.stdio, self.write = stdio_transport

            # Create client session using official SDK
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(self.stdio, self.write)
            )

            # Initialize the session
            await self.session.initialize()

            # List available tools
            response = await self.session.list_tools()
            self.available_tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema,
                }
                for tool in response.tools
            ]

            self.connected_servers.append(server_name)

            print(f"Successfully connected to {server_name}")
            print(f"Available tools: {[tool['name'] for tool in self.available_tools]}")

        except Exception as e:
            print(f"Failed to connect to server {server_name}: {e}")
            raise

    async def process_query(self, request: ChatRequest) -> ChatResponse:
        """
        Process a query using Ollama with MCP tools.
        Follows official MCP client pattern for tool execution.
        """
        if not self.session:
            raise RuntimeError(
                "MCP Client not connected. Call connect_to_servers() first."
            )

        # Add user message to conversation history
        self.conversation_history.append(
            ChatMessage(role="user", content=request.message)
        )

        # Build conversation context with system prompt
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(
            [
                {"role": msg.role, "content": msg.content}
                for msg in self.conversation_history
            ]
        )

        try:
            if not self.available_tools:
                # No tools available, just use Ollama directly
                response = await self._call_ollama_directly_with_history(
                    messages, request.model
                )
            else:
                # Call Ollama with available tools
                ollama_response = await self._call_ollama_with_tools(
                    messages=messages, model=request.model, tools=self.available_tools
                )

                # Handle tool calls if present
                if ollama_response.message.tool_calls:
                    final_response = await self._handle_tool_calls(
                        ollama_response.message.tool_calls, messages, request.model
                    )
                    response = final_response.response
                else:
                    # No tool calls, just get the response content
                    response = ollama_response.message.content

            # Add assistant response to conversation history
            self.conversation_history.append(
                ChatMessage(role="assistant", content=response)
            )

            # Convert ToolCall objects to dictionaries for ChatResponse
            tool_calls_dict = None
            if self.available_tools and ollama_response.message.tool_calls:
                tool_calls_dict = []
                for i, tool_call in enumerate(ollama_response.message.tool_calls):
                    tool_calls_dict.append({
                        'id': f"call_{i}",  # Generate simple ID
                        'type': 'function',
                        'function': {
                            'name': tool_call.function.name,
                            'arguments': tool_call.function.arguments
                        }
                    })

            return ChatResponse(
                response=response,
                model=request.model,
                tool_calls=tool_calls_dict,
            )

        except ollama.ResponseError as e:
            print(f"Ollama SDK error: {e.error} (status: {e.status_code})")
            # Fallback response
            error_response = f"I encountered an Ollama API error: {e.error}"
            self.conversation_history.append(
                ChatMessage(role="assistant", content=error_response)
            )

            return ChatResponse(
                response=error_response, model=request.model, tool_calls=None
            )
        except Exception as e:
            print(f"Error processing query: {e}")
            # Fallback response
            error_response = f"I encountered an error processing your request: {str(e)}"
            self.conversation_history.append(
                ChatMessage(role="assistant", content=error_response)
            )

            return ChatResponse(
                response=error_response, model=request.model, tool_calls=None
            )

    async def _call_ollama_with_tools(
        self, messages: List[Dict], model: str, tools: List[Dict]
    ) -> Dict:
        """Call Ollama API with tools using proper Ollama tools format"""

        # Convert our tool format to Ollama's format
        ollama_tools = []
        for tool in tools:
            ollama_tool = {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["input_schema"],
                },
            }
            ollama_tools.append(ollama_tool)

        # Use Ollama SDK with 32k context window
        response = await self.ollama_client.chat(
            model=model,
            messages=messages,
            tools=ollama_tools,
            options={"num_ctx": 32768},  # 32k context window
            stream=False,
        )
        return response

    async def _call_ollama_directly_with_history(
        self, messages: List[Dict], model: str
    ) -> str:
        """Call Ollama directly without tools using chat endpoint"""

        response = await self.ollama_client.chat(
            model=model,
            messages=messages,
            options={"num_ctx": 32768},  # 32k context window
            stream=False,
        )
        return response.message.content

    async def _handle_tool_calls(
        self, tool_calls: List[Dict], messages: List[Dict], model: str
    ) -> ChatResponse:
        """Handle tool calls using MCP protocol"""
        tool_results = []

        for tool_call in tool_calls:
            try:
                # Parse tool call from Ollama's format
                function_call = tool_call.get("function", {})
                tool_name = function_call.get("name")
                tool_args = function_call.get("arguments", {})

                if not tool_name:
                    continue

                # Execute tool call via MCP
                result = await self.session.call_tool(tool_name, tool_args)

                # Format tool result for Ollama
                tool_result_content = (
                    str(result.content) if hasattr(result, "content") else str(result)
                )

                tool_results.append(
                    {
                        "tool_call_id": tool_call.get("id", ""),
                        "output": tool_result_content,
                    }
                )

                # Add tool result to conversation for context
                messages.append(
                    {
                        "role": "tool",
                        "content": tool_result_content,
                        "tool_call_id": tool_call.get("id", ""),
                    }
                )

            except Exception as e:
                error_message = f"Tool call {tool_name} failed: {str(e)}"
                print(f"Error executing tool {tool_name}: {e}")

                tool_results.append(
                    {"tool_call_id": tool_call.get("id", ""), "output": error_message}
                )

                messages.append(
                    {
                        "role": "tool",
                        "content": error_message,
                        "tool_call_id": tool_call.get("id", ""),
                    }
                )

        # Get final response from Ollama with tool results
        final_response = await self.ollama_client.chat(
            model=model,
            messages=messages,
            options={"num_ctx": 32768},  # 32k context window
            stream=False,
        )

        final_content = final_response.message.content

        # Convert ToolCall objects to dictionaries for ChatResponse
        tool_calls_dict = []
        for i, tool_call in enumerate(tool_calls):
            tool_calls_dict.append({
                'id': f"call_{i}",  # Generate simple ID
                'type': 'function',
                'function': {
                    'name': tool_call.function.name,
                    'arguments': tool_call.function.arguments
                }
            })

        return ChatResponse(response=final_content, model=model, tool_calls=tool_calls_dict)

    def _build_conversation_prompt(self, messages: List[Dict]) -> str:
        """Build conversation prompt from message list"""
        prompt_parts = []
        for msg in messages:
            role_prefix = ""
            if msg["role"] == "user":
                role_prefix = "User: "
            elif msg["role"] == "assistant":
                role_prefix = "Assistant: "
            elif msg["role"] == "system":
                role_prefix = "System: "

            prompt_parts.append(f"{role_prefix}{msg['content']}")

        return "\n".join(prompt_parts)

    async def list_tools(self) -> List[Dict[str, Any]]:
        """Get list of available tools"""
        if not self.session:
            raise RuntimeError("MCP Client not connected")
        return self.available_tools

    async def get_connection_status(self) -> Dict[str, Any]:
        """Get connection status"""
        return {
            "connected_servers": self.connected_servers,
            "available_tools_count": len(self.available_tools),
            "tools": self.available_tools,
        }

    async def cleanup(self):
        """Clean up resources"""
        try:
            await self.exit_stack.aclose()
        except Exception as e:
            print(f"Error during cleanup: {e}")
