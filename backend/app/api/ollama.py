from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import logging

from ..ollama.service import ollama_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ollama", tags=["ollama"])


# Request/Response models
class CreateConversationRequest(BaseModel):
    model: Optional[str] = None
    system_prompt: Optional[str] = None


class SendMessageRequest(BaseModel):
    message: str
    available_tools: Optional[List[Dict[str, Any]]] = None


class ExecuteToolRequest(BaseModel):
    tool_call_id: str
    tool_name: str
    arguments: Dict[str, Any]


class UpdatePreferencesRequest(BaseModel):
    default_model: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None
    use_json_mode: Optional[bool] = None


class SearchModelsRequest(BaseModel):
    query: str


# Dependency to ensure Ollama service is initialized
async def ensure_ollama_initialized():
    """Ensure Ollama service is initialized"""
    if not ollama_service.is_initialized:
        initialized = await ollama_service.initialize()
        if not initialized:
            raise HTTPException(
                status_code=503,
                detail="Ollama service is not available. Please make sure Ollama is running.",
            )
    return ollama_service


@router.get("/status")
async def get_status():
    """Get Ollama service status"""
    try:
        return await ollama_service.get_service_status()
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/initialize")
async def initialize_service():
    """Initialize Ollama service"""
    try:
        success = await ollama_service.initialize()
        if success:
            return {"message": "Ollama service initialized successfully"}
        else:
            raise HTTPException(
                status_code=503,
                detail="Failed to initialize Ollama service. Make sure Ollama is running.",
            )
    except Exception as e:
        logger.error(f"Failed to initialize service: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def get_available_models(service=Depends(ensure_ollama_initialized)):
    """Get all available models"""
    try:
        models = await service.get_available_models()
        return {"models": [model.dict() for model in models]}
    except Exception as e:
        logger.error(f"Failed to get models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_name}/capabilities")
async def get_model_capabilities(
    model_name: str, service=Depends(ensure_ollama_initialized)
):
    """Get capabilities for a specific model"""
    try:
        capabilities = await service.get_model_capabilities(model_name)
        return capabilities
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model capabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/refresh")
async def refresh_models(service=Depends(ensure_ollama_initialized)):
    """Refresh available models and detect capabilities"""
    try:
        result = await service.refresh_models()
        return result
    except Exception as e:
        logger.error(f"Failed to refresh models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/search")
async def search_models(
    request: SearchModelsRequest, service=Depends(ensure_ollama_initialized)
):
    """Search models by name or family"""
    try:
        results = await service.search_models(request.query)
        return {"models": results}
    except Exception as e:
        logger.error(f"Failed to search models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/best")
async def get_best_model(
    requires_tools: bool = False,
    requires_json: bool = False,
    service=Depends(ensure_ollama_initialized),
):
    """Get the best model for a specific task"""
    try:
        model_name = await service.get_best_model_for_task(
            requires_tools, requires_json
        )
        return {"model": model_name}
    except Exception as e:
        logger.error(f"Failed to get best model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations")
async def create_conversation(
    request: CreateConversationRequest, service=Depends(ensure_ollama_initialized)
):
    """Create a new conversation"""
    try:
        return await service.create_conversation(
            model=request.model, system_prompt=request.system_prompt
        )
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str, service=Depends(ensure_ollama_initialized)
):
    """Get conversation details"""
    try:
        return await service.get_conversation(conversation_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    service=Depends(ensure_ollama_initialized),
):
    """Send a message and get response"""
    try:
        return await service.send_message(
            conversation_id, request.message, request.available_tools
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/tools/execute")
async def execute_tool(
    conversation_id: str,
    request: ExecuteToolRequest,
    service=Depends(ensure_ollama_initialized),
):
    """Execute a tool call"""
    try:
        return await service.execute_tool_call(
            conversation_id, request.tool_call_id, request.tool_name, request.arguments
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to execute tool: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}/history")
async def get_conversation_history(
    conversation_id: str, service=Depends(ensure_ollama_initialized)
):
    """Get conversation history"""
    try:
        history = await service.get_conversation_history(conversation_id)
        return {"messages": history}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str, service=Depends(ensure_ollama_initialized)
):
    """Delete a conversation"""
    try:
        return await service.delete_conversation(conversation_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preferences")
async def get_model_preferences(service=Depends(ensure_ollama_initialized)):
    """Get current model preferences"""
    try:
        return await service.get_model_preferences()
    except Exception as e:
        logger.error(f"Failed to get preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/preferences")
async def update_model_preferences(
    request: UpdatePreferencesRequest, service=Depends(ensure_ollama_initialized)
):
    """Update model preferences"""
    try:
        # Filter out None values
        preferences = {k: v for k, v in request.dict().items() if v is not None}
        return await service.update_model_preferences(preferences)
    except Exception as e:
        logger.error(f"Failed to update preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))
