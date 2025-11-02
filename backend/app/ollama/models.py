from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any, Literal, Union
from enum import Enum


class ModelSize(str, Enum):
    TINY = "tiny"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    XLARGE = "xlarge"
    XXLARGE = "xxlarge"


class ModelFamily(str, Enum):
    LLAMA = "llama"
    MISTRAL = "mistral"
    PHI = "phi"
    CODELLAMA = "codellama"
    DEEPSEEK = "deepseek"
    QWEN = "qwen"
    GEMMA = "gemma"
    NEURAL = "neural-chat"


class ModelCapability(BaseModel):
    has_json_mode: bool = False
    supports_tools: bool = False
    context_length: Optional[int] = None
    max_tokens: Optional[int] = None
    embedding_dimension: Optional[int] = None


class OllamaModelInfo(BaseModel):
    name: str
    model: str
    modified_at: str
    size: int
    digest: str
    family: Optional[ModelFamily] = None
    families: Optional[List[str]] = None
    format: Optional[str] = None
    parameter_size: Optional[str] = None
    quantization_level: Optional[str] = None
    capabilities: ModelCapability = ModelCapability()
    template: Optional[str] = None
    licenses: Optional[Union[List[str], str]] = None

    @field_validator("licenses", mode="before")
    @classmethod
    def parse_licenses(cls, v):
        if isinstance(v, str):
            # Split string by newlines and clean up
            return [line.strip() for line in v.split("\n") if line.strip()]
        return v

    known_as: Optional[str] = None
    likes: int = 0


class ConversationMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str
    timestamp: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


class ToolCall(BaseModel):
    tool: str
    arguments: Dict[str, Any]
    id: Optional[str] = None


class ToolResult(BaseModel):
    tool: str
    arguments: Dict[str, Any]
    result: Any
    success: bool
    error: Optional[str] = None
    execution_time: Optional[float] = None


class AgentResponse(BaseModel):
    content: str
    tool_calls: Optional[List[ToolCall]] = None
    tool_results: Optional[List[ToolResult]] = None
    thinking_steps: Optional[List[str]] = None
    model_used: str
    response_time: Optional[float] = None


class ConversationContext(BaseModel):
    messages: List[ConversationMessage] = []
    system_prompt: Optional[str] = None
    available_tools: Optional[List[Dict[str, Any]]] = None
    model: str
    max_context_length: int = 4000


class ModelPreferences(BaseModel):
    default_model: str
    temperature: float = 0.1  # Lower temperature for more consistent tool calling
    top_p: float = 0.9
    max_tokens: int = 2048
    system_prompt: Optional[str] = None
    use_json_mode: bool = False  # Let model choose format naturally
    fallback_patterns: bool = False
