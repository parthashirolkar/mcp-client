import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from .client import OllamaClient, ChatMessage
from .models import (
    OllamaModelInfo,
    ModelFamily,
    ModelCapability,
    ConversationContext,
    ConversationMessage,
    AgentResponse,
    ToolCall,
    ToolResult,
    ModelPreferences,
)

logger = logging.getLogger(__name__)


class OllamaModelManager:
    """Manages Ollama models, capabilities detection, and conversation orchestration"""

    def __init__(self, base_url: str = "http://localhost:11434"):
        self.client = OllamaClient(base_url)
        self.available_models: Dict[str, OllamaModelInfo] = {}
        self.model_capabilities: Dict[str, ModelCapability] = {}
        self.active_conversations: Dict[str, ConversationContext] = {}
        self.preferences = ModelPreferences(
            default_model="qwen2.5:latest",
            temperature=0.1,
            top_p=0.9,
            max_tokens=8192,
            use_json_mode=False,
            system_prompt="You are a helpful AI assistant. Use tools when appropriate to help users accomplish your tasks.",
        )

    async def initialize(self) -> bool:
        """Initialize the model manager by scanning available models"""
        try:
            # Check connection first
            if not await self.client.check_connection():
                logger.error("Cannot connect to Ollama. Make sure Ollama is running.")
                return False

            # Load available models
            await self.refresh_models()

            # Detect capabilities for each model
            await self.detect_all_capabilities()

            logger.info(f"Initialized with {len(self.available_models)} models")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize model manager: {e}")
            return False

    async def refresh_models(self) -> None:
        """Refresh the list of available models from Ollama"""
        try:
            models = await self.client.list_models()
            self.available_models.clear()

            for model in models:
                # Get detailed info for each model
                model_info = await self._get_model_info(model.name)
                self.available_models[model.name] = model_info

            logger.info(f"Refreshed {len(self.available_models)} models")

        except Exception as e:
            logger.error(f"Failed to refresh models: {e}")

    async def _get_model_info(self, model_name: str) -> OllamaModelInfo:
        """Get detailed information about a specific model"""
        try:
            info = await self.client.get_model_info(model_name)

            # Parse model family from info
            family = self._detect_model_family(info)

            # Build model info object
            model_info = OllamaModelInfo(
                name=model_name,
                model=model_name,
                modified_at=info.get("modified_at", ""),
                size=info.get("size", 0),
                digest=info.get("digest", ""),
                family=family,
                families=info.get("families", []),
                format=info.get("details", {}).get("format", ""),
                parameter_size=info.get("details", {}).get("parameter_size", ""),
                quantization_level=info.get("details", {}).get(
                    "quantization_level", ""
                ),
                template=info.get("template", ""),
                licenses=info.get("license", []),
                known_as=info.get("known_as", None),
            )

            return model_info

        except Exception as e:
            logger.error(f"Failed to get info for model {model_name}: {e}")
            # Return basic info
            return OllamaModelInfo(
                name=model_name, model=model_name, modified_at="", size=0, digest=""
            )

    def _detect_model_family(self, model_info: Dict[str, Any]) -> Optional[ModelFamily]:
        """Detect model family from model info"""
        families = model_info.get("families", [])
        model_name = model_info.get("name", "").lower()

        # Check families first
        for family in families:
            if "llama" in family.lower():
                return ModelFamily.LLAMA
            elif "mistral" in family.lower():
                return ModelFamily.MISTRAL
            elif "phi" in family.lower():
                return ModelFamily.PHI
            elif "codellama" in family.lower():
                return ModelFamily.CODELLAMA
            elif "deepseek" in family.lower():
                return ModelFamily.DEEPSEEK
            elif "qwen" in family.lower():
                return ModelFamily.QWEN
            elif "gemma" in family.lower():
                return ModelFamily.GEMMA
            elif "neural" in family.lower():
                return ModelFamily.NEURAL

        # Check model name as fallback
        if "llama" in model_name:
            return ModelFamily.LLAMA
        elif "mistral" in model_name:
            return ModelFamily.MISTRAL
        elif "phi" in model_name:
            return ModelFamily.PHI
        elif "codellama" in model_name:
            return ModelFamily.CODELLAMA
        elif "deepseek" in model_name:
            return ModelFamily.DEEPSEEK
        elif "qwen" in model_name:
            return ModelFamily.QWEN
        elif "gemma" in model_name:
            return ModelFamily.GEMMA
        elif "neural" in model_name:
            return ModelFamily.NEURAL

        return None

    async def detect_all_capabilities(self) -> None:
        """Detect capabilities for all available models"""
        for model_name in self.available_models:
            capabilities = await self._detect_model_capabilities(model_name)
            self.model_capabilities[model_name] = capabilities

    async def _detect_model_capabilities(self, model_name: str) -> ModelCapability:
        """Set fixed capabilities for models - hardcoded approach"""
        capabilities = ModelCapability()

        try:
            # All models get the same capabilities (optimized for low VRAM)
            capabilities.context_length = 8192    # Conservative context length for low VRAM
            capabilities.has_json_mode = True     # Support JSON mode
            capabilities.supports_tools = True    # Support tools
            capabilities.max_tokens = 2048        # Conservative max tokens for low VRAM

        except Exception as e:
            logger.error(f"Failed to set capabilities for {model_name}: {e}")

        return capabilities

    def get_available_models(self) -> List[OllamaModelInfo]:
        """Get list of available models"""
        return list(self.available_models.values())

    def get_model_capabilities(self, model_name: str) -> Optional[ModelCapability]:
        """Get capabilities for a specific model"""
        return self.model_capabilities.get(model_name)

    def get_best_model_for_task(
        self, requires_tools: bool = False, requires_json: bool = False
    ) -> str:
        """Get the best model for a specific task - always return hardcoded default"""
        return self.preferences.default_model

    def create_conversation(
        self,
        conversation_id: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> ConversationContext:
        """Create a new conversation context"""
        if not model:
            model = self.preferences.default_model

        context = ConversationContext(
            model=model,
            system_prompt=system_prompt or self.preferences.system_prompt,
            max_context_length=self.model_capabilities.get(
                model, ModelCapability()
            ).context_length
            or 4000,
        )

        self.active_conversations[conversation_id] = context
        return context

    def get_conversation(self, conversation_id: str) -> Optional[ConversationContext]:
        """Get conversation context by ID"""
        return self.active_conversations.get(conversation_id)

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Add a message to conversation"""
        context = self.active_conversations.get(conversation_id)
        if context:
            message = ConversationMessage(
                role=role,
                content=content,
                timestamp=datetime.utcnow().isoformat(),
                tool_calls=tool_calls,
            )
            context.messages.append(message)

    async def generate_response(
        self,
        conversation_id: str,
        user_message: str,
        available_tools: Optional[List[Dict[str, Any]]] = None,
    ) -> AgentResponse:
        """Generate a response from the model using chat API with tool calling"""
        context = self.active_conversations.get(conversation_id)
        if not context:
            raise ValueError(f"Conversation {conversation_id} not found")

        start_time = datetime.utcnow()

        try:
            # Add user message to context
            self.add_message(conversation_id, "user", user_message)

            # Use clean system prompt - tools will be passed as API parameter
            system_prompt = context.system_prompt

            # 🚨 CRITICAL LOGGING: System Prompt
            logger.info("🔍 SYSTEM PROMPT SENT TO MODEL:")
            logger.info(f"   Model: {context.model}")
            logger.info(
                f"   Supports tools: {self.model_capabilities.get(context.model, ModelCapability()).supports_tools}"
            )
            logger.info(
                f"   Available tools: {len(available_tools) if available_tools else 0}"
            )
            logger.info(f"   System prompt length: {len(system_prompt)} chars")
            logger.info(f"   System prompt preview: {system_prompt[:200]}...")

            # Build messages list for chat API
            messages = []

            # Add system message first
            if system_prompt:
                messages.append(ChatMessage(role="system", content=system_prompt))

            # Add conversation history
            for msg in context.messages[:-1]:  # Exclude the user message we just added
                messages.append(ChatMessage(role=msg.role, content=msg.content))

            # Add current user message
            messages.append(ChatMessage(role="user", content=user_message))

            # Use tools as-is (they should already be in OpenAI format)
            tools_for_ollama = None
            if available_tools and self.model_capabilities.get(context.model, ModelCapability()).supports_tools:
                tools_for_ollama = available_tools

            # Generate response using chat API
            logger.info("🔍 GENERATING RESPONSE FROM MODEL...")
            logger.info(f"   Tools count: {len(tools_for_ollama) if tools_for_ollama else 0}")
            logger.info(f"   Messages count: {len(messages)}")

            response = await self.client.chat_completion(
                model=context.model,
                messages=messages,
                tools=tools_for_ollama,
                think=True,
                stream=False,
            )

            # 🚨 CRITICAL LOGGING: Raw Model Response
            logger.info("🔍 RAW MODEL RESPONSE:")
            logger.info(f"   Response keys: {list(response.keys())}")
            logger.info(f"   Message keys: {list(response.get('message', {}).keys())}")

            message = response.get('message', {})
            logger.info(f"   Has tool_calls: {'tool_calls' in message}")
            logger.info(f"   Tool calls: {message.get('tool_calls', [])}")
            logger.info(f"   Content: {message.get('content', '')[:200]}...")

            # Parse response
            agent_response = self._parse_chat_response(
                response, context.model, start_time, available_tools
            )

            # 🚨 CRITICAL LOGGING: Tool Call Analysis
            user_message_lower = user_message.lower()
            needs_tools = any(
                keyword in user_message_lower
                for keyword in [
                    "list",
                    "show",
                    "which",
                    "what",
                    "folders",
                    "directories",
                    "files",
                    "read",
                    "write",
                    "git",
                    "create",
                    "delete",
                    "search",
                ]
            )
            has_path = "/" in user_message

            logger.info("🔍 TOOL ANALYSIS:")
            logger.info(f"   User message: '{user_message}'")
            logger.info(f"   Needs tools: {needs_tools}")
            logger.info(f"   Has path: {has_path}")
            logger.info(
                f"   Available tools count: {len(available_tools) if available_tools else 0}"
            )
            logger.info(
                f"   Model response has tool_calls: {bool(agent_response.tool_calls)}"
            )

            if needs_tools and has_path and not agent_response.tool_calls:
                logger.error("🚨 MODEL FAILED TO CALL TOOLS!")
                logger.error(
                    f"   Expected tool call but got: {agent_response.content[:100]}..."
                )
                logger.error(
                    f"   Available tools: {[t.get('function', {}).get('name', 'unknown') for t in available_tools][:5]}..."
                )
            elif agent_response.tool_calls:
                logger.info(
                    f"✅ MODEL CALLED TOOLS: {[tc.tool for tc in agent_response.tool_calls]}"
                )
            else:
                logger.info("ℹ️  No tools needed or called - conversational response")

            # Add assistant response to context
            self.add_message(
                conversation_id,
                "assistant",
                agent_response.content,
                [tc.dict() for tc in agent_response.tool_calls]
                if agent_response.tool_calls
                else None,
            )

            return agent_response

        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            # Return error response
            response_time = (datetime.utcnow() - start_time).total_seconds()
            return AgentResponse(
                content=f"I apologize, but I encountered an error while generating a response: {str(e)}",
                model_used=context.model,
                response_time=response_time,
            )

    def _build_conversation_text(self, context: ConversationContext) -> str:
        """Build conversation text for the model"""
        messages = []

        # Include system message if provided
        if context.system_prompt:
            messages.append(f"System: {context.system_prompt}")

        # Include conversation history
        for msg in context.messages:
            prefix = ""
            if msg.role == "user":
                prefix = "User: "
            elif msg.role == "assistant":
                prefix = "Assistant: "
            elif msg.role == "system":
                prefix = "System: "

            messages.append(f"{prefix}{msg.content}")

            # Include tool calls if present
            if msg.tool_calls:
                for tool_call in msg.tool_calls:
                    tool_desc = f"[Tool Call: {tool_call.get('tool', 'unknown')} with arguments {tool_call.get('arguments', {})}]"
                    messages.append(tool_desc)

        return "\n\n".join(messages)

    
    def _parse_response(
        self,
        response: Dict[str, Any],
        model: str,
        start_time: datetime,
        available_tools: Optional[List[Dict[str, Any]]] = None,
    ) -> AgentResponse:
        """Parse model response into AgentResponse"""
        response_time = (datetime.utcnow() - start_time).total_seconds()

        if not response:
            return AgentResponse(
                content="I apologize, but I received an empty response.",
                model_used=model,
                response_time=response_time,
            )

        # Extract content and tool calls from Ollama response
        content = response.get("response", "")
        tool_calls = []

        # Check if Ollama returned tool calls
        if "tool_calls" in response:
            ollama_tool_calls = response["tool_calls"]
            if isinstance(ollama_tool_calls, list):
                for tc in ollama_tool_calls:
                    if isinstance(tc, dict):
                        tool_name = tc.get("function", {}).get("name", "")
                        arguments = tc.get("function", {}).get("arguments", {})

                        # Validate tool exists (tools are in OpenAI format)
                        if tool_name and available_tools:
                            valid_tools = [t.get("function", {}).get("name", "") for t in available_tools]
                            if tool_name in valid_tools:
                                tool_call = ToolCall(
                                    tool=tool_name,
                                    arguments=arguments,
                                    id=tc.get("id", f"call_{len(tool_calls)}"),
                                )
                                tool_calls.append(tool_call)

        # If no structured tool calls but response looks like JSON, try parsing it
        if not tool_calls and content.strip().startswith("{"):
            try:
                parsed = json.loads(content)
                if isinstance(parsed, dict) and "tool_calls" in parsed:
                    content = parsed.get("content", "")
                    for tc in parsed.get("tool_calls", []):
                        if isinstance(tc, dict):
                            tool_name = tc.get("tool", "")
                            arguments = tc.get("arguments", {})

                            # Validate tool exists (tools are in OpenAI format)
                            if tool_name and available_tools:
                                valid_tools = [t.get("function", {}).get("name", "") for t in available_tools]
                                if tool_name in valid_tools:
                                    tool_call = ToolCall(
                                        tool=tool_name,
                                        arguments=arguments,
                                        id=tc.get("id"),
                                    )
                                    tool_calls.append(tool_call)
            except json.JSONDecodeError:
                # Not valid JSON, keep as plain text
                pass

        return AgentResponse(
            content=content,
            tool_calls=tool_calls if tool_calls else None,
            model_used=model,
            response_time=response_time,
        )

    def _parse_chat_response(
        self,
        response: Dict[str, Any],
        model: str,
        start_time: datetime,
        available_tools: Optional[List[Dict[str, Any]]] = None,
    ) -> AgentResponse:
        """Parse chat API response into AgentResponse"""
        response_time = (datetime.utcnow() - start_time).total_seconds()

        if not response or "message" not in response:
            return AgentResponse(
                content="I apologize, but I received an empty response.",
                model_used=model,
                response_time=response_time,
            )

        message = response["message"]
        content = message.get("content", "")
        tool_calls = []

        # Check if the model returned tool calls (chat API format)
        if "tool_calls" in message and message["tool_calls"]:
            for tc in message["tool_calls"]:
                if isinstance(tc, dict) and "function" in tc:
                    func = tc["function"]
                    tool_call = ToolCall(
                        tool=func.get("name", ""),
                        arguments=func.get("arguments", {}),
                        id=str(func.get("index", 0))
                    )
                    tool_calls.append(tool_call)
                    logger.info(f"🔧 PARSED TOOL CALL: {tool_call.tool} with args {tool_call.arguments}")

        logger.info(f"✅ PARSED CHAT RESPONSE:")
        logger.info(f"   Content length: {len(content)}")
        logger.info(f"   Tool calls count: {len(tool_calls)}")
        if tool_calls:
            logger.info(f"   Tool calls: {[tc.tool for tc in tool_calls]}")

        return AgentResponse(
            content=content,
            tool_calls=tool_calls if tool_calls else None,
            model_used=model,
            response_time=response_time,
        )

    async def execute_tool_call(self, tool_call: ToolCall) -> ToolResult:
        """Execute a tool call (this would be overridden by actual tool execution)"""
        # This is a placeholder - actual tool execution would be handled by the MCP server manager
        return ToolResult(
            tool=tool_call.tool,
            arguments=tool_call.arguments,
            result=f"Tool {tool_call.tool} executed with arguments {tool_call.arguments}",
            success=True,
        )

    async def update_preferences(self, **kwargs) -> None:
        """Update model preferences"""
        for key, value in kwargs.items():
            if hasattr(self.preferences, key):
                setattr(self.preferences, key, value)

    def get_conversation_stats(self, conversation_id: str) -> Dict[str, Any]:
        """Get statistics about a conversation"""
        context = self.active_conversations.get(conversation_id)
        if not context:
            return {}

        messages_by_role = {}
        for msg in context.messages:
            messages_by_role[msg.role] = messages_by_role.get(msg.role, 0) + 1

        return {
            "message_count": len(context.messages),
            "model": context.model,
            "messages_by_role": messages_by_role,
            "has_system_prompt": bool(context.system_prompt),
            "max_context_length": context.max_context_length,
        }
