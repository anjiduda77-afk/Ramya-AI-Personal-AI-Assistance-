"""
Tool Registry for Ramya AI.
Stores available tools, argument definitions, and permission specifications.
"""
from typing import Dict, Any, Callable, Optional
from pydantic import BaseModel
from app.security.permissions import permissions, PermissionTier

class ToolDefinition(BaseModel):
    name: str
    description: str
    tier: PermissionTier
    parameters: Dict[str, Any]
    handler_module: str

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(self, name: str, description: str, parameters: Dict[str, Any], handler_module: str):
        tier = permissions.get_tier(name)
        self._tools[name] = ToolDefinition(
            name=name,
            description=description,
            tier=tier,
            parameters=parameters,
            handler_module=handler_module
        )

    def get(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def list_tools(self) -> Dict[str, Any]:
        return {k: v.model_dump() for k, v in self._tools.items()}

tool_registry = ToolRegistry()

# Register core built-in tools
tool_registry.register(
    name="open_application",
    description="Launch an allowlisted Windows or system application (e.g. Chrome, Notepad, Calculator, VS Code)",
    parameters={"app_name": {"type": "string", "required": True}},
    handler_module="app.tools.desktop_control"
)

tool_registry.register(
    name="media_control",
    description="Control media playback: play, pause, next, previous, mute, volume_up, volume_down",
    parameters={"action": {"type": "string", "required": True}},
    handler_module="app.tools.desktop_control"
)

tool_registry.register(
    name="capture_screen",
    description="Capture screenshot of primary screen or active window with user permission",
    parameters={"mode": {"type": "string", "default": "full_screen"}},
    handler_module="app.tools.screen_intelligence"
)

tool_registry.register(
    name="get_weather",
    description="Fetch live real-world weather forecast for a specified city or default location",
    parameters={"city": {"type": "string", "default": "Hyderabad"}},
    handler_module="app.tools.live_data"
)

tool_registry.register(
    name="get_stock_quote",
    description="Fetch live or delayed stock price quote and metrics from public market data",
    parameters={"symbol": {"type": "string", "required": True}},
    handler_module="app.tools.live_data"
)

tool_registry.register(
    name="create_task",
    description="Add a productivity task to the user's task list",
    parameters={"title": {"type": "string", "required": True}, "priority": {"type": "string", "default": "medium"}},
    handler_module="app.tools.productivity"
)

tool_registry.register(
    name="set_reminder",
    description="Schedule a reminder for a specific time",
    parameters={"text": {"type": "string", "required": True}, "trigger_time": {"type": "string", "required": True}},
    handler_module="app.tools.productivity"
)

tool_registry.register(
    name="search_knowledge_base",
    description="Perform semantic search and grounded retrieval across indexed documents",
    parameters={"query": {"type": "string", "required": True}},
    handler_module="app.rag.engine"
)
