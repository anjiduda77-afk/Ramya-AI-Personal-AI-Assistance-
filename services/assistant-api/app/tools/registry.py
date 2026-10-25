"""
Central Automation Registry for Ramya AI.
Provides formal registration, input schema validation, platform compatibility checks,
permission tier enforcement, confirmation gating, bounded timeouts, and structured results.
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from app.security.permissions import permissions, PermissionTier

logger = logging.getLogger("ramya.tools.registry")

class ToolParameterSchema(BaseModel):
    type: str = "string" # "string", "number", "boolean", "list", "dict"
    required: bool = False
    default: Optional[Any] = None
    allowed_values: Optional[List[Any]] = None
    description: Optional[str] = None

class ToolDefinition(BaseModel):
    tool_id: str
    name: str
    description: str
    tier: PermissionTier
    supported_platforms: List[str] = Field(default_factory=lambda: ["windows", "android", "web"])
    parameters: Dict[str, ToolParameterSchema] = Field(default_factory=dict)
    requires_confirmation: bool = False
    timeout_seconds: float = 10.0
    handler_module: str

class AutomationResult(BaseModel):
    success: bool
    status: str # "success", "needs_approval", "attention_required", "unsupported_platform", "validation_error"
    tool_id: str
    message: str
    spoken_response: str
    data: Optional[Dict[str, Any]] = None
    requires_approval: bool = False
    approval_prompt: Optional[str] = None

class CentralAutomationRegistry:
    def __init__(self):
        self._registry: Dict[str, ToolDefinition] = {}

    def register(
        self,
        tool_id: str,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        handler_module: str,
        supported_platforms: Optional[List[str]] = None,
        tier: Optional[PermissionTier] = None,
        requires_confirmation: Optional[bool] = None,
        timeout_seconds: float = 10.0
    ):
        """Registers a verified tool with formal schema and security metadata."""
        computed_tier = tier or permissions.get_tier(tool_id)
        is_confirmation_needed = requires_confirmation if requires_confirmation is not None else (computed_tier == PermissionTier.HIGH_RISK)

        param_schemas: Dict[str, ToolParameterSchema] = {}
        for p_name, p_spec in parameters.items():
            if isinstance(p_spec, dict):
                param_schemas[p_name] = ToolParameterSchema(
                    type=p_spec.get("type", "string"),
                    required=p_spec.get("required", False),
                    default=p_spec.get("default"),
                    allowed_values=p_spec.get("allowed_values"),
                    description=p_spec.get("description")
                )
            else:
                param_schemas[p_name] = ToolParameterSchema()

        definition = ToolDefinition(
            tool_id=tool_id,
            name=name,
            description=description,
            tier=computed_tier,
            supported_platforms=supported_platforms or ["windows", "android", "web"],
            parameters=param_schemas,
            requires_confirmation=is_confirmation_needed,
            timeout_seconds=timeout_seconds,
            handler_module=handler_module
        )
        self._registry[tool_id] = definition

    def get(self, tool_id: str) -> Optional[ToolDefinition]:
        return self._registry.get(tool_id)

    def list_tools(self) -> Dict[str, Any]:
        return {k: v.model_dump() for k, v in self._registry.items()}

    def validate_arguments(self, tool_id: str, arguments: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Strictly validates provided arguments against the registered parameter schema."""
        tool = self.get(tool_id)
        if not tool:
            return False, f"Unknown tool: '{tool_id}' is not in the automation registry.", {}

        cleaned_args: Dict[str, Any] = {}

        # 1. Check required parameters & types
        for param_name, param_spec in tool.parameters.items():
            if param_name not in arguments or arguments[param_name] is None:
                if param_spec.required:
                    return False, f"Missing required parameter '{param_name}' for tool '{tool_id}'.", {}
                cleaned_args[param_name] = param_spec.default
            else:
                val = arguments[param_name]
                # Type validation
                if param_spec.type == "string" and not isinstance(val, str):
                    val = str(val)
                elif param_spec.type == "boolean" and not isinstance(val, bool):
                    val = str(val).lower() in ("true", "1", "yes")
                elif param_spec.type == "number" and not isinstance(val, (int, float)):
                    try:
                        val = float(val)
                    except ValueError:
                        return False, f"Parameter '{param_name}' must be a number.", {}
                elif param_spec.type == "list" and not isinstance(val, list):
                    return False, f"Parameter '{param_name}' must be a list.", {}

                # Allowed values check
                if param_spec.allowed_values and val not in param_spec.allowed_values:
                    return False, f"Parameter '{param_name}' value '{val}' is not in allowed choices: {param_spec.allowed_values}.", {}

                cleaned_args[param_name] = val

        # 2. Prevent malicious code injection tokens in string arguments
        for k, v in cleaned_args.items():
            if isinstance(v, str):
                lower_v = v.lower()
                dangerous_tokens = ["rmdir /s", "del /f", "format ", "powershell -enc", "drop table", "truncate table"]
                for tok in dangerous_tokens:
                    if tok in lower_v:
                        return False, f"Argument security violation: '{tok}' is blocked.", {}

        return True, "Valid", cleaned_args

    def is_platform_supported(self, tool_id: str, platform: str = "windows") -> bool:
        tool = self.get(tool_id)
        if not tool:
            return False
        return platform.lower() in [p.lower() for p in tool.supported_platforms]

central_registry = CentralAutomationRegistry()

# ==============================================================================
# REGISTER ALL VERIFIED RAMYA AI SYSTEM CAPABILITIES
# ==============================================================================

# 1. Desktop & Native System Controls
central_registry.register(
    tool_id="open_application",
    name="Open Verified Application",
    description="Launch an allowlisted Windows application or deep link (Chrome, Notepad, Calc, VS Code, Spotify, etc.)",
    parameters={
        "app_name": {"type": "string", "required": True, "description": "Target application name or key"}
    },
    handler_module="app.tools.desktop_control",
    supported_platforms=["windows", "android"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=5.0
)

central_registry.register(
    tool_id="media_control",
    name="Media & Audio Control",
    description="Control native media playback (play, pause, next, previous, mute, volume_up, volume_down)",
    parameters={
        "action": {
            "type": "string",
            "required": True,
            "allowed_values": ["play", "pause", "next", "previous", "mute", "volume_up", "volume_down"],
            "description": "Media action"
        }
    },
    handler_module="app.tools.desktop_control",
    supported_platforms=["windows", "android"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=3.0
)

central_registry.register(
    tool_id="capture_screen",
    name="Screen Intelligence & Vision",
    description="Capture screenshot of primary display and analyze layout or active window",
    parameters={
        "mode": {"type": "string", "default": "full_screen", "allowed_values": ["full_screen", "active_window"]},
        "prompt": {"type": "string", "required": False, "description": "User question regarding screen"}
    },
    handler_module="app.tools.screen_intelligence",
    supported_platforms=["windows", "android"],
    tier=PermissionTier.MEDIUM_RISK,
    timeout_seconds=8.0
)

# 2. Live Information & Knowledge
central_registry.register(
    tool_id="get_weather",
    name="Live Weather Radar",
    description="Fetch live real-world weather forecast for a specified city or location",
    parameters={
        "city": {"type": "string", "default": "Hyderabad", "description": "City name"}
    },
    handler_module="app.tools.live_data",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=6.0
)

central_registry.register(
    tool_id="get_stock_quote",
    name="Market & Stock Watchlist",
    description="Fetch stock quotes, price changes, and financial data for a specified symbol",
    parameters={
        "symbol": {"type": "string", "required": True, "description": "Stock ticker symbol (e.g. RELIANCE.NS, AAPL)"}
    },
    handler_module="app.tools.live_data",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=6.0
)

central_registry.register(
    tool_id="web_search",
    name="Privacy-Friendly Web Search",
    description="Search DuckDuckGo and Wikipedia for instant factual knowledge and summary citations",
    parameters={
        "query": {"type": "string", "required": True, "description": "Search inquiry"}
    },
    handler_module="app.tools.web_search",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=8.0
)

# 3. Productivity & Personal Organization
central_registry.register(
    tool_id="create_task",
    name="Create Productivity Task",
    description="Add a task item to user's persistent SQLite task list",
    parameters={
        "title": {"type": "string", "required": True, "description": "Task description"},
        "priority": {"type": "string", "default": "medium", "allowed_values": ["low", "medium", "high"]}
    },
    handler_module="app.tools.productivity",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=4.0
)

central_registry.register(
    tool_id="set_reminder",
    name="Schedule Reminder",
    description="Schedule a reminder notification for a specific time",
    parameters={
        "text": {"type": "string", "required": True, "description": "Reminder text"},
        "trigger_time": {"type": "string", "required": True, "description": "Target trigger time or date"}
    },
    handler_module="app.tools.productivity",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=4.0
)

central_registry.register(
    tool_id="delete_task",
    name="Delete Productivity Task",
    description="Permanently removes a task item from the user's task list (High Risk - Requires Confirmation)",
    parameters={
        "task_id": {"type": "string", "required": True, "description": "ID of task to delete"}
    },
    handler_module="app.tools.productivity",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.HIGH_RISK,
    requires_confirmation=True,
    timeout_seconds=4.0
)

# 4. Personal Memory & Learning
central_registry.register(
    tool_id="save_memory",
    name="Save Personal Memory",
    description="Record an explicit personal fact or preference into user-controlled persistent memory",
    parameters={
        "content": {"type": "string", "required": True, "description": "Fact or preference to remember"},
        "category": {"type": "string", "default": "general"}
    },
    handler_module="app.memory.engine",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=4.0
)

central_registry.register(
    tool_id="delete_memory",
    name="Delete Stored Memory",
    description="Deletes a specific user memory entry (High Risk - Requires Confirmation)",
    parameters={
        "memory_id": {"type": "string", "required": True, "description": "Memory ID"}
    },
    handler_module="app.memory.engine",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.HIGH_RISK,
    requires_confirmation=True,
    timeout_seconds=4.0
)

central_registry.register(
    tool_id="search_knowledge_base",
    name="Document RAG Search",
    description="Semantic search across indexed user documents with source citations",
    parameters={
        "query": {"type": "string", "required": True, "description": "Document question"}
    },
    handler_module="app.rag.engine",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=10.0
)

central_registry.register(
    tool_id="english_learning",
    name="English Learning Tutor",
    description="Retrieve daily lessons, conversational exercises, and spaced repetition revision checks",
    parameters={
        "action": {"type": "string", "default": "daily_lesson", "allowed_values": ["daily_lesson", "revision_check", "progress"]}
    },
    handler_module="app.tools.english_tutor",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=5.0
)

central_registry.register(
    tool_id="translate_meaning",
    name="Telugu to English Meaning Translator",
    description="Translates Telugu conversational expressions into natural, idiomatic conversational English",
    parameters={
        "text": {"type": "string", "required": True, "description": "Telugu or mixed speech"}
    },
    handler_module="app.tools.english_tutor",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=6.0
)

# 5. Media & Free Legal Music
central_registry.register(
    tool_id="play_music",
    name="Play Free Legal Music Stream",
    description="Play curated public domain and Creative Commons focus, lofi, or ambient music",
    parameters={
        "query": {"type": "string", "default": "relaxing", "description": "Music mood or genre"}
    },
    handler_module="app.tools.music_player",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=4.0
)

central_registry.register(
    tool_id="purge_user_data",
    name="Purge User History & Audio Logs",
    description="Clears all conversation history, audio logs, and audit trails (High Risk - Requires Confirmation)",
    parameters={},
    handler_module="app.security.purge",
    supported_platforms=["windows", "android", "web"],
    tier=PermissionTier.HIGH_RISK,
    requires_confirmation=True,
    timeout_seconds=5.0
)

# 6. Phase 8 Native Device Actions Registry
central_registry.register(
    tool_id="find_contact",
    name="Find Contact",
    description="Query user authorized address book for contacts matching name or relationship",
    parameters={
        "query": {"type": "string", "required": True, "description": "Contact name or search term"}
    },
    handler_module="app.tools.productivity",
    supported_platforms=["android", "windows"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=4.0
)

central_registry.register(
    tool_id="prepare_message",
    name="Prepare Message",
    description="Formulate and prefill a mobile message (WhatsApp/SMS) with target recipient and body",
    parameters={
        "recipient": {"type": "string", "required": True, "description": "Recipient name or phone number"},
        "message": {"type": "string", "required": True, "description": "Message content"},
        "platform": {"type": "string", "default": "whatsapp", "allowed_values": ["whatsapp", "sms"]}
    },
    handler_module="app.tools.productivity",
    supported_platforms=["android"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=4.0
)

central_registry.register(
    tool_id="send_message_when_supported",
    name="Send Message (High Risk Confirmation)",
    description="Dispatches message when supported or opens prefilled chat with confirmation",
    parameters={
        "recipient": {"type": "string", "required": True, "description": "Recipient contact"},
        "message": {"type": "string", "required": True, "description": "Message text"}
    },
    handler_module="app.tools.productivity",
    supported_platforms=["android"],
    tier=PermissionTier.HIGH_RISK,
    requires_confirmation=True,
    timeout_seconds=5.0
)

central_registry.register(
    tool_id="search_music",
    name="Search Music Tracks",
    description="Search music catalog across Spotify, YouTube Music, or authorized providers",
    parameters={
        "query": {"type": "string", "required": True, "description": "Song title or artist search query"}
    },
    handler_module="app.tools.music_player",
    supported_platforms=["android", "windows", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=5.0
)

central_registry.register(
    tool_id="identify_song_from_lyrics",
    name="Identify Song From Lyrics",
    description="Multi-stage lyric fragment matcher resolving remembered phrases to song and artist",
    parameters={
        "lyrics": {"type": "string", "required": True, "description": "Remembered lyric fragment"}
    },
    handler_module="app.tools.music_player",
    supported_platforms=["android", "windows", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=6.0
)

central_registry.register(
    tool_id="identify_song_from_audio_when_supported",
    name="Identify Song From Audio / Melody",
    description="Audio capture and melody identification mode for hummed or recorded music",
    parameters={
        "sample_duration": {"type": "number", "default": 5.0, "description": "Audio sample duration in seconds"}
    },
    handler_module="app.tools.music_player",
    supported_platforms=["android"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=8.0
)

central_registry.register(
    tool_id="control_playback",
    name="Control Media Playback",
    description="Native media session playback control (pause, resume, next, previous, stop, volume)",
    parameters={
        "action": {
            "type": "string",
            "required": True,
            "allowed_values": ["pause", "resume", "next", "previous", "stop", "volume_up", "volume_down"],
            "description": "Playback control action"
        }
    },
    handler_module="app.tools.music_player",
    supported_platforms=["android", "windows"],
    tier=PermissionTier.LOW_RISK,
    timeout_seconds=3.0
)

central_registry.register(
    tool_id="answer_question",
    name="Answer General Question",
    description="General knowledge, calculations, translations, and conversational explanation",
    parameters={
        "question": {"type": "string", "required": True, "description": "User question"}
    },
    handler_module="app.providers.router",
    supported_platforms=["android", "windows", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=10.0
)

central_registry.register(
    tool_id="retrieve_conversation_context",
    name="Retrieve Conversation Context",
    description="Retrieve multi-turn dialogue context, last mentioned contacts, songs, and preferences",
    parameters={},
    handler_module="app.intelligence.context_engine",
    supported_platforms=["android", "windows", "web"],
    tier=PermissionTier.READ_ONLY,
    timeout_seconds=2.0
)

central_registry.register(
    tool_id="manage_user_preferences",
    name="Manage User Preferences",
    description="Update or inspect persistent preferences (preferred music app, wake-word sensitivity)",
    parameters={
        "key": {"type": "string", "required": True, "description": "Preference key"},
        "value": {"type": "string", "required": True, "description": "Preference value"}
    },
    handler_module="app.memory.engine",
    supported_platforms=["android", "windows", "web"],
    tier=PermissionTier.MEDIUM_RISK,
    timeout_seconds=3.0
)

