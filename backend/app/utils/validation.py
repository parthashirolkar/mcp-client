"""Input validation and sanitization utilities"""

import re
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
import html

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when input validation fails"""

    pass


class SanitizedMessage(BaseModel):
    """A sanitized user message"""

    content: str
    original_length: int
    was_sanitized: bool


class SanitizedToolArguments(BaseModel):
    """Sanitized tool arguments"""

    arguments: Dict[str, Any]
    was_sanitized: bool
    warnings: List[str]


def sanitize_message(message: str, max_length: int = 10000) -> SanitizedMessage:
    """
    Sanitize user messages to prevent injection attacks

    Args:
        message: The user message to sanitize
        max_length: Maximum allowed message length

    Returns:
        SanitizedMessage with the cleaned content
    """
    if not isinstance(message, str):
        raise ValidationError("Message must be a string")

    original_length = len(message)
    was_sanitized = False
    warnings = []

    # Check length
    if len(message) > max_length:
        message = message[:max_length] + "... [truncated]"
        was_sanitized = True
        warnings.append(f"Message truncated to {max_length} characters")

    # Remove potentially dangerous content
    # Remove null bytes
    message = message.replace("\x00", "")

    # Normalize line endings
    message = message.replace("\r\n", "\n").replace("\r", "\n")

    # Remove excessive whitespace
    message = re.sub(r"\n\s*\n\s*\n", "\n\n", message)

    # Remove control characters except newlines and tabs
    message = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", message)

    # Escape HTML entities if needed
    message = html.escape(message)

    if message != message[:original_length]:
        was_sanitized = True

    return SanitizedMessage(
        content=message.strip(),
        original_length=original_length,
        was_sanitized=was_sanitized,
    )


def validate_tool_name(tool_name: str) -> str:
    """
    Validate tool names to prevent injection

    Args:
        tool_name: The tool name to validate

    Returns:
        Validated tool name

    Raises:
        ValidationError: If tool name is invalid
    """
    if not isinstance(tool_name, str):
        raise ValidationError("Tool name must be a string")

    if not tool_name:
        raise ValidationError("Tool name cannot be empty")

    # Only allow alphanumeric, underscores, hyphens, and dots
    if not re.match(r"^[a-zA-Z0-9._-]+$", tool_name):
        raise ValidationError("Tool name contains invalid characters")

    if len(tool_name) > 100:
        raise ValidationError("Tool name too long")

    return tool_name


def sanitize_tool_arguments(
    arguments: Dict[str, Any], tool_schema: Optional[Dict[str, Any]] = None
) -> SanitizedToolArguments:
    """
    Sanitize tool arguments to prevent injection attacks

    Args:
        arguments: The tool arguments to sanitize
        tool_schema: Optional JSON schema for the tool

    Returns:
        SanitizedToolArguments with cleaned arguments
    """
    if not isinstance(arguments, dict):
        raise ValidationError("Tool arguments must be a dictionary")

    was_sanitized = False
    warnings = []
    sanitized_args = {}

    for key, value in arguments.items():
        try:
            # Validate key
            if not isinstance(key, str):
                warnings.append(f"Invalid argument key type: {type(key)}")
                continue

            if not re.match(r"^[a-zA-Z0-9_]+$", key):
                warnings.append(f"Invalid argument key format: {key}")
                continue

            # Sanitize value based on type
            if isinstance(value, str):
                # Sanitize string values
                if len(value) > 10000:  # 10KB limit per argument
                    value = value[:10000] + "... [truncated]"
                    warnings.append(f"Argument '{key}' truncated")
                    was_sanitized = True

                # Remove null bytes and control characters
                value = value.replace("\x00", "")
                value = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", value)

                # Check for suspicious patterns
                suspicious_patterns = [
                    r"<script[^>]*>.*?</script>",  # Script tags
                    r"javascript:",  # JavaScript URLs
                    r"data:text/html",  # Data URLs
                    r"\$\([^)]*\)",  # Command substitution
                    r"`[^`]*`",  # Backticks (command substitution)
                    r"\|\s*.*\s*\|",  # Pipes
                ]

                for pattern in suspicious_patterns:
                    if re.search(pattern, value, re.IGNORECASE):
                        value = re.sub(pattern, "[REMOVED]", value, flags=re.IGNORECASE)
                        warnings.append(
                            f"Suspicious content removed from argument '{key}'"
                        )
                        was_sanitized = True

            elif isinstance(value, (list, dict)):
                # Recursively sanitize nested structures
                if isinstance(value, list):
                    sanitized_value = []
                    for item in value:
                        if isinstance(item, str):
                            item = item.replace("\x00", "")
                            item = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", item)
                            sanitized_value.append(item)
                        elif isinstance(item, (dict, list)):
                            # Recursively sanitize
                            nested_result = sanitize_tool_arguments({"item": item})
                            sanitized_value.append(nested_result.arguments["item"])
                        else:
                            sanitized_value.append(item)
                    value = sanitized_value
                else:
                    # Recursively sanitize dictionaries
                    nested_result = sanitize_tool_arguments(value)
                    value = nested_result.arguments

            sanitized_args[key] = value

        except Exception as e:
            logger.warning(f"Failed to sanitize argument '{key}': {e}")
            warnings.append(f"Failed to sanitize argument '{key}'")

    return SanitizedToolArguments(
        arguments=sanitized_args, was_sanitized=was_sanitized, warnings=warnings
    )


def validate_conversation_id(conversation_id: str) -> str:
    """
    Validate conversation ID format

    Args:
        conversation_id: The conversation ID to validate

    Returns:
        Validated conversation ID

    Raises:
        ValidationError: If conversation ID is invalid
    """
    if not isinstance(conversation_id, str):
        raise ValidationError("Conversation ID must be a string")

    if not conversation_id:
        raise ValidationError("Conversation ID cannot be empty")

    # Check if it's a valid UUID format or similar
    if len(conversation_id) > 100:
        raise ValidationError("Conversation ID too long")

    # Allow alphanumeric, hyphens, and underscores
    if not re.match(r"^[a-zA-Z0-9_-]+$", conversation_id):
        raise ValidationError("Conversation ID contains invalid characters")

    return conversation_id


def sanitize_command_args(command: str, args: List[str]) -> List[str]:
    """
    Sanitize command arguments for safe execution

    Args:
        command: The command to execute
        args: List of arguments

    Returns:
        Sanitized arguments list

    Raises:
        ValidationError: If command or args are unsafe
    """
    if not isinstance(command, str):
        raise ValidationError("Command must be a string")

    if not isinstance(args, list):
        raise ValidationError("Arguments must be a list")

    # Validate command
    allowed_commands = [
        "python",
        "python3",
        "node",
        "npm",
        "npx",
        "uvx",
        "uv",
        "git",
        "ls",
        "cat",
        "find",
        "grep",
        "echo",
        "mkdir",
    ]

    command_base = command.split()[-1]  # Get the actual command (last part of path)
    if command_base not in allowed_commands:
        raise ValidationError(f"Command '{command}' not allowed")

    # Check for dangerous patterns in command
    dangerous_patterns = ["&&", "||", ";", "|", "`", "$(", "${", ">", ">>", "<"]

    for pattern in dangerous_patterns:
        if pattern in command:
            raise ValidationError(f"Command contains dangerous pattern: {pattern}")

    # Sanitize arguments
    sanitized_args = []
    for arg in args:
        if not isinstance(arg, str):
            raise ValidationError("All arguments must be strings")

        # Remove dangerous characters
        sanitized_arg = re.sub(r'[;&|`$(){}[\]<>"\'\\]', "", arg)

        # Prevent path traversal
        sanitized_arg = sanitized_arg.replace("../", "").replace("..\\", "")

        # Prevent environment variable expansion
        sanitized_arg = re.sub(r"\$\{[^}]*\}", "", sanitized_arg)
        sanitized_arg = re.sub(r"\$[a-zA-Z_][a-zA-Z0-9_]*", "", sanitized_arg)

        sanitized_args.append(sanitized_arg)

    return sanitized_args


def validate_system_prompt(prompt: str, max_length: int = 5000) -> str:
    """
    Validate and sanitize system prompts

    Args:
        prompt: The system prompt to validate
        max_length: Maximum allowed length

    Returns:
        Sanitized system prompt
    """
    if not isinstance(prompt, str):
        raise ValidationError("System prompt must be a string")

    if len(prompt) > max_length:
        raise ValidationError(f"System prompt too long (max {max_length} characters)")

    # Remove dangerous content
    prompt = prompt.replace("\x00", "")
    prompt = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", prompt)

    # Check for suspicious patterns
    suspicious_patterns = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"data:text/html",
    ]

    for pattern in suspicious_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            raise ValidationError("System prompt contains suspicious content")

    return prompt.strip()


class InputValidator:
    """Main input validation class"""

    @staticmethod
    def validate_message_input(message: str) -> SanitizedMessage:
        """Validate user message input"""
        return sanitize_message(message)

    @staticmethod
    def validate_tool_input(tool_name: str, arguments: Dict[str, Any]) -> tuple:
        """Validate tool execution input"""
        validated_tool_name = validate_tool_name(tool_name)
        sanitized_args = sanitize_tool_arguments(arguments)
        return validated_tool_name, sanitized_args

    @staticmethod
    def validate_conversation_input(conversation_id: str) -> str:
        """Validate conversation ID input"""
        return validate_conversation_id(conversation_id)

    @staticmethod
    def validate_system_prompt_input(prompt: str) -> str:
        """Validate system prompt input"""
        return validate_system_prompt(prompt)
