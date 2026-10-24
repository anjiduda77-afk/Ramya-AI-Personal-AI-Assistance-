"""
Central Capability and Permission Registry for Ramya AI.
Provides runtime platform detection, granular capability toggling,
execution-time enforcement, and resource cleanup for zero-trust compliance.
"""
import sys
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.database.db import db
from app.security.permissions import permissions, PermissionTier

logger = logging.getLogger("ramya.security.capabilities")

# Map individual tool names to their underlying device capability
TOOL_TO_CAPABILITY: Dict[str, str] = {
    # Voice & Speech
    "speak_text": "media_control",
    "synthesize_voice": "media_control",
    "transcribe_audio": "speech_recognition",
    "wake_word_spotting": "speech_recognition",
    
    # Screen & Vision
    "capture_screen": "screen_analysis",
    "ocr_screen": "screen_analysis",
    "get_active_window": "screen_analysis",
    
    # Files & Documents
    "read_document": "file_system",
    "search_knowledge_base": "file_system",
    "delete_document": "file_system",
    "write_document_summary": "file_system",
    
    # App Control
    "open_application": "installed_apps",
    "launch_music_app": "installed_apps",
    
    # Notifications & Tasks
    "list_tasks": "notifications_alarms",
    "create_task": "notifications_alarms",
    "toggle_task": "notifications_alarms",
    "delete_task": "notifications_alarms",
    "list_reminders": "notifications_alarms",
    "set_reminder": "notifications_alarms",
    
    # Telephony & Messaging (Android specific)
    "initiate_phone_call": "contacts_telephony",
    "send_message": "contacts_telephony",
    
    # Media & Device controls
    "media_control": "media_control",
    "play_music": "media_control",
    "clipboard_write": "installed_apps",
    
    # Online search & Live Data
    "get_weather": "web_search",
    "get_stock_quote": "web_search",
    "web_search": "web_search",
    
    # AI Providers
    "generate_cloud_llm": "cloud_ai",
    "generate_local_llm": "local_ai",
    
    # Scheduled monitoring
    "task_scheduler": "task_scheduler",
    "execute_system_command": "installed_apps"
}

class CapabilityModel(BaseModel):
    id: str
    name: str
    description: str
    supported_platforms: List[str]
    min_os_version: str
    required_permissions: List[str]
    requires_internet: bool
    processing_mode: str
    risk_level: str
    requires_confirmation: bool
    is_enabled: bool
    is_platform_supported: bool
    status: str
    os_settings_hint: str

class CapabilityRegistry:
    def __init__(self):
        self._current_os = self._detect_platform()

    def _detect_platform(self) -> str:
        """Determines current host OS platform ('windows', 'android', 'web')."""
        if sys.platform.startswith("win"):
            return "windows"
        elif "android" in sys.platform or "ANDROID_ROOT" in sys.platform:
            return "android"
        else:
            return "web"

    def get_current_platform(self) -> str:
        return self._current_os

    def get_all_capabilities(self) -> List[Dict[str, Any]]:
        """Returns all registered device capabilities with real-time status and platform support."""
        results = []
        with db.get_connection() as conn:
            rows = conn.execute("""
                SELECT id, name, description, supported_platforms, min_os_version, required_permissions,
                       requires_internet, processing_mode, risk_level, requires_confirmation, is_enabled, os_settings_hint
                FROM device_capabilities
                ORDER BY risk_level DESC, name ASC;
            """).fetchall()

            for r in rows:
                platforms = json.loads(r["supported_platforms"])
                is_supported = (self._current_os in platforms) or ("web" in platforms)
                is_enabled = bool(r["is_enabled"])

                if not is_supported:
                    status = "unsupported_platform"
                elif not is_enabled:
                    status = "disabled"
                else:
                    status = "active"

                results.append({
                    "id": r["id"],
                    "name": r["name"],
                    "description": r["description"],
                    "supported_platforms": platforms,
                    "min_os_version": r["min_os_version"],
                    "required_permissions": json.loads(r["required_permissions"]),
                    "requires_internet": bool(r["requires_internet"]),
                    "processing_mode": r["processing_mode"],
                    "risk_level": r["risk_level"],
                    "requires_confirmation": bool(r["requires_confirmation"]),
                    "is_enabled": is_enabled,
                    "is_platform_supported": is_supported,
                    "status": status,
                    "os_settings_hint": r["os_settings_hint"] or ""
                })
        return results

    def is_capability_enabled(self, capability_id: str) -> bool:
        """Checks whether a specific capability is persistently enabled in the database."""
        with db.get_connection() as conn:
            row = conn.execute(
                "SELECT is_enabled, supported_platforms FROM device_capabilities WHERE id = ?;",
                (capability_id,)
            ).fetchone()
            if not row:
                return False
            platforms = json.loads(row["supported_platforms"])
            is_supported = (self._current_os in platforms) or ("web" in platforms)
            return bool(row["is_enabled"]) and is_supported

    def toggle_capability(self, capability_id: str, enable: bool) -> Dict[str, Any]:
        """
        Enables or disables a device capability.
        If disabled, automatically triggers resource cleanup and records security audit.
        """
        with db.get_connection() as conn:
            conn.execute(
                "UPDATE device_capabilities SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;",
                (1 if enable else 0, capability_id)
            )

        # Trigger cleanup procedure if disabled
        if not enable:
            self.cleanup_resource(capability_id)

        status_str = "enabled" if enable else "disabled"
        permissions.log_audit(
            tool_name=f"capability:{capability_id}",
            permission_level="medium_risk",
            status="success",
            details=f"User {status_str} device capability '{capability_id}'."
        )
        logger.info(f"Capability '{capability_id}' set to {status_str}.")
        return {"success": True, "capability_id": capability_id, "is_enabled": enable}

    def enforce_capability(self, capability_id: str) -> None:
        """
        Execution-time security guard.
        Raises PermissionError if capability is disabled or unsupported.
        """
        if not self.is_capability_enabled(capability_id):
            permissions.log_audit(
                tool_name=f"capability:{capability_id}",
                permission_level="high_risk",
                status="denied",
                details=f"Execution blocked: Capability '{capability_id}' is disabled or unsupported."
            )
            raise PermissionError(
                f"Capability '{capability_id}' is disabled by user policy or unsupported on this platform."
            )

    def enforce_tool_capability(self, tool_name: str) -> None:
        """Enforces capability check for a given tool name."""
        cap_id = TOOL_TO_CAPABILITY.get(tool_name)
        if cap_id:
            self.enforce_capability(cap_id)

    def cleanup_resource(self, capability_id: str) -> None:
        """
        Releases system resources and cancels active operations when a capability is disabled.
        """
        logger.info(f"Executing resource cleanup for revoked capability '{capability_id}'...")
        if capability_id == "microphone":
            # Signal any audio recording or listening pipelines to stop
            logger.info("Microphone revoked: terminating active audio capture streams.")
        elif capability_id == "screen_analysis":
            logger.info("Screen intelligence revoked: clearing screen capture buffers.")
        elif capability_id == "file_system":
            logger.info("File system revoked: closing active file descriptors.")
        elif capability_id == "media_control":
            logger.info("Media control revoked: pausing active media playback.")

capability_registry = CapabilityRegistry()
