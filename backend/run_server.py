#!/usr/bin/env python3
"""
Simple script to run the MCP Client API server
"""

import uvicorn

if __name__ == "__main__":
    # Configure uvicorn to use our simplified implementation
    uvicorn.run(
        "simple_main:app", host="0.0.0.0", port=8000, reload=True, log_level="info"
    )
