from fastapi import APIRouter, HTTPException
from app.models.schemas import ToolExecutionRequest, ToolExecutionResult
from app.mcp.manager import connection_manager

router = APIRouter()


@router.get("/list")
async def list_all_tools():
    """List all available tools from all connected servers"""
    try:
        tools = await connection_manager.list_all_tools()
        return {
            "servers": tools,
            "total_tools": sum(len(server_tools) for server_tools in tools.values()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tools: {str(e)}")


@router.get("/servers/{server_id}/tools")
async def list_server_tools(server_id: int):
    """List tools from a specific server"""
    try:
        all_tools = await connection_manager.list_all_tools()
        if server_id not in all_tools:
            return {"tools": [], "server_id": server_id}

        return {
            "tools": all_tools[server_id],
            "server_id": server_id,
            "tool_count": len(all_tools[server_id]),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list tools for server {server_id}: {str(e)}",
        )


@router.post("/execute", response_model=ToolExecutionResult)
async def execute_tool(request: ToolExecutionRequest):
    """Execute a tool on a specific MCP server"""
    try:
        result = await connection_manager.execute_tool(request)

        # Ensure the result matches the expected schema
        return ToolExecutionResult(
            success=result["success"],
            result=result.get("result"),
            error=result.get("error"),
            execution_time=result.get("execution_time"),
        )
    except Exception as e:
        return ToolExecutionResult(success=False, result=None, error=str(e))


@router.get("/servers/{server_id}/tools/{tool_name}/schema")
async def get_tool_schema(server_id: int, tool_name: str):
    """Get the input schema for a specific tool"""
    try:
        all_tools = await connection_manager.list_all_tools()
        if server_id not in all_tools:
            raise HTTPException(
                status_code=404, detail=f"Server {server_id} not found or not connected"
            )

        tools = all_tools[server_id]
        tool = next((t for t in tools if t["name"] == tool_name), None)

        if not tool:
            raise HTTPException(
                status_code=404,
                detail=f"Tool {tool_name} not found on server {server_id}",
            )

        return {
            "name": tool["name"],
            "description": tool["description"],
            "input_schema": tool["input_schema"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get tool schema: {str(e)}"
        )
