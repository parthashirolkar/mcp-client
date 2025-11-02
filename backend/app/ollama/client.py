import httpx
import json
from typing import List, Dict, Any, Optional, AsyncGenerator
from pydantic import BaseModel
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class OllamaModel(BaseModel):
    name: str
    size: int
    digest: str
    modified_at: str
    details: Optional[Dict[str, Any]] = None


class GenerateRequest(BaseModel):
    model: str
    prompt: str
    format: Optional[str] = None
    system: Optional[str] = None
    context: Optional[List[str]] = None
    options: Optional[Dict[str, Any]] = None
    template: Optional[str] = None
    stream: Optional[bool] = False
    tools: Optional[List[Dict[str, Any]]] = None


class ChatMessage(BaseModel):
    role: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_name: Optional[str] = None


class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: Optional[bool] = False
    tools: Optional[List[Dict[str, Any]]] = None
    think: Optional[bool] = True


class PullRequest(BaseModel):
    model: str
    insecure: Optional[bool] = False


class OllamaClient:
    """Client for interacting with local Ollama instance"""

    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=300.0)

    async def list_models(self) -> List[OllamaModel]:
        """List all available models in Ollama"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()

            models = []
            for model_data in response.json().get("models", []):
                model = OllamaModel(**model_data)
                models.append(model)

            logger.info(f"Found {len(models)} models in Ollama")
            return models

        except httpx.ConnectError:
            logger.error(
                "Cannot connect to Ollama. Make sure Ollama is running and accessible at localhost:11434"
            )
            raise HTTPException(
                status_code=503,
                detail="Ollama not available. Please install and start Ollama first.",
            )
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error listing models: {str(e)}"
            )

    async def pull_model(self, model_name: str, insecure: bool = False) -> bool:
        """Pull a model from Ollama registry"""
        try:
            request = PullRequest(model=model_name, insecure=insecure)
            response = await self.client.post(
                f"{self.base_url}/api/pull", json=request.dict(exclude_none=True)
            )
            response.raise_for_status()

            logger.info(f"Successfully pulled model: {model_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error pulling model: {str(e)}"
            )

    async def generate_response(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        format: Optional[str] = None,
        context: Optional[List[str]] = None,
        options: Optional[Dict[str, Any]] = None,
        template: Optional[str] = None,
        stream: bool = False,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Generate a response from Ollama model"""
        try:
            request = GenerateRequest(
                model=model,
                prompt=prompt,
                system=system,
                format=format,
                context=context,
                options=options,
                template=template,
                tools=tools,
            )

            response = await self.client.post(
                f"{self.base_url}/api/generate", json=request.dict(exclude_none=True)
            )
            response.raise_for_status()

            result = response.json()
            # Return the full result to handle both text and tool calls
            return result

        except Exception as e:
            logger.error(f"Failed to generate response from model {model}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error generating response: {str(e)}"
            )

    async def chat_completion(
        self,
        model: str,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        think: bool = True,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """Generate a chat response with tool calling support"""
        try:
            request_dict = {
                "model": model,
                "messages": [msg.dict(exclude_none=True) for msg in messages],
                "tools": tools,
                "stream": stream,
            }

            # Debug logging
            logger.info(f"🔍 CHAT REQUEST TO OLLAMA:")
            logger.info(f"   Model: {model}")
            logger.info(f"   Messages: {request_dict['messages']}")
            logger.info(f"   Tools count: {len(tools) if tools else 0}")
            logger.info(f"   Think: {think}")
            logger.info(f"   Stream: {stream}")

            # Log first few tools for debugging
            if tools and len(tools) > 0:
                logger.info(f"🔍 FIRST 3 TOOLS BEING SENT:")
                for i, tool in enumerate(tools[:3]):
                    logger.info(f"   Tool {i+1}: {tool}")

            response = await self.client.post(
                f"{self.base_url}/api/chat", json=request_dict
            )
            response.raise_for_status()

            # Handle streaming response
            if stream:
                # For streaming, we'd need to handle multiple JSON objects
                # For now, return the first complete response
                result = response.json()
            else:
                # For non-streaming, parse the response
                response_text = response.text
                # Find the last complete JSON object in the response
                lines = response_text.strip().split('\n')
                last_line = lines[-1] if lines else '{}'
                result = json.loads(last_line)

            logger.info(f"Chat response from {model}: tool_calls present = {'tool_calls' in result.get('message', {})}")
            return result

        except Exception as e:
            logger.error(f"Failed to generate chat response from model {model}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error generating chat response: {str(e)}"
            )

    async def generate_response_stream(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        format: Optional[str] = None,
        context: Optional[List[str]] = None,
        options: Optional[Dict[str, Any]] = None,
        template: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response from Ollama model"""
        try:
            request = GenerateRequest(
                model=model,
                prompt=prompt,
                system=system,
                format=format,
                context=context,
                options=options,
                template=template,
            )

            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=request.dict(exclude_none=True),
            ) as response:
                async for chunk in response.aiter_bytes():
                    if chunk:
                        # Remove "data: " prefix and double newlines
                        line = chunk.decode("utf-8").strip()
                        if line.startswith("data: "):
                            content = line[6:]
                            if content.strip():
                                yield content
                        elif line.strip() == "[DONE]":
                            break
                        elif line.strip() == "[ERROR]":
                            break

        except Exception as e:
            logger.error(
                f"Failed to generate streaming response from model {model}: {e}"
            )
            raise HTTPException(
                status_code=500, detail=f"Error generating streaming response: {str(e)}"
            )

    async def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific model"""
        try:
            response = await self.client.post(
                f"{self.base_url}/api/show", json={"name": model_name}
            )
            response.raise_for_status()

            return response.json()

        except Exception as e:
            logger.error(f"Failed to get model info for {model_name}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error getting model info: {str(e)}"
            )

    async def delete_model(self, model_name: str) -> bool:
        """Delete a model from Ollama"""
        try:
            response = await self.client.delete(f"{self.base_url}/api/delete")
            response.raise_for_status()

            logger.info(f"Successfully deleted model: {model_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete model {model_name}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error deleting model: {str(e)}"
            )

    async def check_connection(self) -> bool:
        """Check if Ollama is running and accessible"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags", timeout=5.0)
            return response.status_code == 200
        except:
            return False
