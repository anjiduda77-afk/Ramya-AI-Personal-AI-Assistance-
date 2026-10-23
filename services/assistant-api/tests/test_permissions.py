"""
Unit tests for Ramya AI Security and Central Permission Manager.
"""
import pytest
from app.security.permissions import permissions, PermissionTier

def test_permission_tiers():
    assert permissions.get_tier("get_weather") == PermissionTier.READ_ONLY
    assert permissions.get_tier("open_application") == PermissionTier.LOW_RISK
    assert permissions.get_tier("capture_screen") == PermissionTier.MEDIUM_RISK
    assert permissions.get_tier("delete_task") == PermissionTier.HIGH_RISK

def test_high_risk_requires_confirmation():
    # Without user confirmation -> Must be rejected
    is_allowed, reason, tier = permissions.validate_action(
        tool_name="delete_task",
        arguments={"task_id": "123"},
        is_user_confirmed=False
    )
    assert not is_allowed
    assert "requires your explicit confirmation" in reason
    assert tier == PermissionTier.HIGH_RISK

    # With user confirmation -> Allowed
    is_allowed, reason, tier = permissions.validate_action(
        tool_name="delete_task",
        arguments={"task_id": "123"},
        is_user_confirmed=True
    )
    assert is_allowed
    assert reason == "Authorized"

def test_blocks_dangerous_tokens():
    # Prompt injection or malicious command attempt
    is_allowed, reason, tier = permissions.validate_action(
        tool_name="execute_system_command",
        arguments={"command": "powershell -enc aXNvbGF0ZQ=="},
        is_user_confirmed=True
    )
    assert not is_allowed
    assert "Security Violation" in reason
