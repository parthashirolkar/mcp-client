import logging
from typing import Dict, List, Optional, Any
from fastapi import HTTPException
import uuid

from .manager import OllamaModelManager
from .models import OllamaModelInfo, ConversationMessage, ToolCall

logger = logging.getLogger(__name__)


class OllamaService:
    """Service layer for Ollama model management and conversations"""

    def __init__(self, base_url: str = "http://localhost:11434"):
        self.manager = OllamaModelManager(base_url)
        self.is_initialized = False

    async def initialize(self) -> bool:
        """Initialize the Ollama service"""
        try:
            self.is_initialized = await self.manager.initialize()
            if self.is_initialized:
                logger.info("Ollama service initialized successfully")
            else:
                logger.error("Failed to initialize Ollama service")
            return self.is_initialized
        except Exception as e:
            logger.error(f"Error initializing Ollama service: {e}")
            return False

    def check_initialized(self) -> None:
        """Check if service is initialized, raise exception if not"""
        if not self.is_initialized:
            raise HTTPException(
                status_code=503,
                detail="Ollama service is not initialized. Please make sure Ollama is running.",
            )

    async def get_available_models(self) -> List[OllamaModelInfo]:
        """Get all available models"""
        self.check_initialized()
        return self.manager.get_available_models()

    async def get_model_capabilities(self, model_name: str) -> Dict[str, Any]:
        """Get capabilities for a specific model"""
        self.check_initialized()
        capabilities = self.manager.get_model_capabilities(model_name)
        if not capabilities:
            raise HTTPException(
                status_code=404,
                detail=f"Model {model_name} not found or capabilities not detected",
            )
        return capabilities.dict()

    async def refresh_models(self) -> Dict[str, Any]:
        """Refresh available models and detect capabilities"""
        self.check_initialized()
        try:
            await self.manager.refresh_models()
            await self.manager.detect_all_capabilities()
            return {
                "message": "Models refreshed successfully",
                "model_count": len(self.manager.available_models),
            }
        except Exception as e:
            logger.error(f"Failed to refresh models: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to refresh models: {str(e)}"
            )

    async def create_conversation(
        self, model: Optional[str] = None, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new conversation"""
        self.check_initialized()

        try:
            conversation_id = str(uuid.uuid4())
            context = self.manager.create_conversation(
                conversation_id, model, system_prompt
            )

            return {
                "conversation_id": conversation_id,
                "model": context.model,
                "system_prompt": context.system_prompt,
                "max_context_length": context.max_context_length,
                "created_at": "now",
            }
        except Exception as e:
            logger.error(f"Failed to create conversation: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to create conversation: {str(e)}"
            )

    async def get_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Get conversation details"""
        self.check_initialized()

        context = self.manager.get_conversation(conversation_id)
        if not context:
            raise HTTPException(
                status_code=404, detail=f"Conversation {conversation_id} not found"
            )

        stats = self.manager.get_conversation_stats(conversation_id)

        return {
            "conversation_id": conversation_id,
            "model": context.model,
            "system_prompt": context.system_prompt,
            "max_context_length": context.max_context_length,
            "message_count": len(context.messages),
            "messages": [msg.dict() for msg in context.messages],
            "stats": stats,
        }

    async def send_message(
        self,
        conversation_id: str,
        message: str,
        available_tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send a message and get response"""
        self.check_initialized()

        try:
            response = await self.manager.generate_response(
                conversation_id, message, available_tools
            )

            result = {
                "conversation_id": conversation_id,
                "response": response.dict(),
                "timestamp": "now",
            }

            # If there are tool calls, indicate they need to be executed
            if response.tool_calls:
                result["tool_calls"] = [tc.dict() for tc in response.tool_calls]
                result["requires_tool_execution"] = True

            return result

        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to send message: {str(e)}"
            )

    async def execute_tool_call(
        self,
        conversation_id: str,
        tool_call_id: str,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute a tool call and add result to conversation"""
        self.check_initialized()

        try:
            tool_call = ToolCall(tool=tool_name, arguments=arguments, id=tool_call_id)

            result = await self.manager.execute_tool_call(tool_call)

            # Add tool result to conversation
            context = self.manager.get_conversation(conversation_id)
            if context:
                # Add tool result message
                tool_result_msg = ConversationMessage(
                    role="system",
                    content=f"Tool {tool_name} result: {result.result}",
                    timestamp="now",
                )
                context.messages.append(tool_result_msg)

            return {
                "conversation_id": conversation_id,
                "tool_result": result.dict(),
                "timestamp": "now",
            }

        except Exception as e:
            logger.error(f"Failed to execute tool call: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to execute tool call: {str(e)}"
            )

    async def get_conversation_history(
        self, conversation_id: str
    ) -> List[Dict[str, Any]]:
        """Get conversation history"""
        self.check_initialized()

        context = self.manager.get_conversation(conversation_id)
        if not context:
            raise HTTPException(
                status_code=404, detail=f"Conversation {conversation_id} not found"
            )

        return [msg.dict() for msg in context.messages]

    async def update_model_preferences(
        self, preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update model preferences"""
        self.check_initialized()

        try:
            await self.manager.update_preferences(**preferences)
            return {
                "message": "Preferences updated successfully",
                "preferences": self.manager.preferences.dict(),
            }
        except Exception as e:
            logger.error(f"Failed to update preferences: {e}")
            raise HTTPException(
                status_code=500, detail=f"Failed to update preferences: {str(e)}"
            )

    async def get_model_preferences(self) -> Dict[str, Any]:
        """Get current model preferences"""
        self.check_initialized()
        return self.manager.preferences.dict()

    async def get_best_model_for_task(
        self, requires_tools: bool = False, requires_json: bool = False
    ) -> str:
        """Get the best model for a specific task"""
        self.check_initialized()
        return self.manager.get_best_model_for_task(requires_tools, requires_json)

    async def delete_conversation(self, conversation_id: str) -> Dict[str, Any]:
        """Delete a conversation"""
        self.check_initialized()

        if conversation_id in self.manager.active_conversations:
            del self.manager.active_conversations[conversation_id]
            return {"message": f"Conversation {conversation_id} deleted successfully"}
        else:
            raise HTTPException(
                status_code=404, detail=f"Conversation {conversation_id} not found"
            )

    async def get_service_status(self) -> Dict[str, Any]:
        """Get service status"""
        try:
            # Check Ollama connection
            ollama_connected = await self.manager.client.check_connection()

            status = {
                "initialized": self.is_initialized,
                "ollama_connected": ollama_connected,
                "available_models": len(self.manager.available_models)
                if self.is_initialized
                else 0,
                "active_conversations": len(self.manager.active_conversations)
                if self.is_initialized
                else 0,
                "default_model": self.manager.preferences.default_model
                if self.is_initialized
                else None,
            }

            if self.is_initialized:
                # Add model capabilities summary
                capabilities_summary = {}
                for model_name, capabilities in self.manager.model_capabilities.items():
                    capabilities_summary[model_name] = {
                        "supports_tools": capabilities.supports_tools,
                        "has_json_mode": capabilities.has_json_mode,
                        "context_length": capabilities.context_length,
                    }
                status["model_capabilities"] = capabilities_summary

            return status

        except Exception as e:
            logger.error(f"Failed to get service status: {e}")
            return {"initialized": False, "ollama_connected": False, "error": str(e)}

    async def search_models(self, query: str) -> List[Dict[str, Any]]:
        """Search models by name or family"""
        self.check_initialized()

        results = []
        query_lower = query.lower()

        for model_info in self.manager.get_available_models():
            if (
                query_lower in model_info.name.lower()
                or (
                    model_info.family and query_lower in model_info.family.value.lower()
                )
                or (
                    model_info.parameter_size
                    and query_lower in model_info.parameter_size.lower()
                )
            ):
                result = model_info.dict()
                capabilities = self.manager.get_model_capabilities(model_info.name)
                if capabilities:
                    result["capabilities"] = capabilities.dict()
                results.append(result)

        return results


# Global service instance
ollama_service = OllamaService()
