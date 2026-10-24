"""
Central Security and Permission Manager for Ramya AI.
Enforces four-tier risk classification, tool argument validation,
confirmation gates for consequential operations, and audit logging.
"""
import uuid
import logging
from enum import Enum
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from app.database.db import db

logger = logging.getLogger("ramya.security")

class PermissionTier(str, Enum):
    READ_ONLY = "read_only"
    LOW_RISK = "low_risk"
    MEDIUM_RISK = "medium_risk"
    HIGH_RISK = "high_risk"

class PermissionManager:
    def __init__(self):
        # Allowlisted tools mapped to their permission tier
        self._tool_tiers: Dict[str, PermissionTier] = {
            # Read-only
            "get_system_health": PermissionTier.READ_ONLY,
            "get_weather": PermissionTier.READ_ONLY,
            "get_stock_quote": PermissionTier.READ_ONLY,
            "get_active_window": PermissionTier.READ_ONLY,
            "read_document": PermissionTier.READ_ONLY,
            "search_knowledge_base": PermissionTier.READ_ONLY,
            "list_tasks": PermissionTier.READ_ONLY,
            "list_reminders": PermissionTier.READ_ONLY,
            "list_notes": PermissionTier.READ_ONLY,
            "get_quiz_questions": PermissionTier.READ_ONLY,
            "query_database": PermissionTier.READ_ONLY,

            # Low risk
            "open_application": PermissionTier.LOW_RISK,
            "media_control": PermissionTier.LOW_RISK,
            "create_note": PermissionTier.LOW_RISK,
            "set_reminder": PermissionTier.LOW_RISK,
            "create_task": PermissionTier.LOW_RISK,
            "toggle_task": PermissionTier.LOW_RISK,
            "speak_text": PermissionTier.LOW_RISK,
            "submit_quiz_answer": PermissionTier.LOW_RISK,

            # Medium risk
            "capture_screen": PermissionTier.MEDIUM_RISK,
            "ocr_screen": PermissionTier.MEDIUM_RISK,
            "clipboard_write": PermissionTier.MEDIUM_RISK,
            "write_document_summary": PermissionTier.MEDIUM_RISK,
            "update_settings": PermissionTier.MEDIUM_RISK,

            # High risk (Requires explicit user confirmation)
            "delete_task": PermissionTier.HIGH_RISK,
            "delete_document": PermissionTier.HIGH_RISK,
            "delete_all_data": PermissionTier.HIGH_RISK,
            "initiate_phone_call": PermissionTier.HIGH_RISK,
            "send_message": PermissionTier.HIGH_RISK,
            "execute_system_command": PermissionTier.HIGH_RISK
        }

    def get_tier(self, tool_name: str) -> PermissionTier:
        """Returns the permission tier for the given tool, defaulting to HIGH_RISK if unknown."""
        return self._tool_tiers.get(tool_name, PermissionTier.HIGH_RISK)

    def validate_action(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        is_user_confirmed: bool = False
    ) -> Tuple[bool, str, PermissionTier]:
        """
        Validates whether a tool execution is authorized.
        Returns: (is_allowed, reason, tier)
        """
        tier = self.get_tier(tool_name)
        
        # Check if underlying device capability is enabled
        from app.security.capability_registry import capability_registry, TOOL_TO_CAPABILITY
        cap_id = TOOL_TO_CAPABILITY.get(tool_name)
        if cap_id and not capability_registry.is_capability_enabled(cap_id):
            self.log_audit(tool_name, tier.value, "denied", f"Capability '{cap_id}' is disabled by user policy.")
            return False, f"Feature '{tool_name}' is currently disabled because the '{cap_id}' capability is turned off in Security & Permissions.", tier

        # Guard against prompt injection or malicious command attempts
        if "command" in arguments and isinstance(arguments["command"], str):
            cmd_lower = arguments["command"].lower()
            dangerous_tokens = ["rmdir /s", "del /f", "format ", "powershell -enc", "curl ", "invoke-webrequest", "bash -c", "eval(", "; drop table", "shutdown", "wget "]
            for token in dangerous_tokens:
                if token in cmd_lower:
                    self.log_audit(tool_name, tier.value, "denied", f"Blocked potentially dangerous token: {token}")
                    return False, f"Security Violation: Execution of '{token}' is strictly forbidden by Zero-Trust policy.", tier

        # High risk requires explicit user confirmation
        if tier == PermissionTier.HIGH_RISK:
            if not is_user_confirmed:
                self.log_audit(tool_name, tier.value, "pending", "Awaiting explicit user confirmation")
                return False, f"Action '{tool_name}' is high risk and requires your explicit confirmation before proceeding.", tier

        return True, "Authorized", tier

    def log_audit(self, tool_name: str, permission_level: str, status: str, details: Optional[str] = None):
        """Records an auditable security entry in SQLite."""
        try:
            log_id = str(uuid.uuid4())
            with db.get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO audit_logs (id, action, tool_name, permission_level, status, details, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (log_id, "execute_tool", tool_name, permission_level, status, details or "", datetime.now().isoformat())
                )
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")

permissions = PermissionManager()
