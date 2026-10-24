"""
Unit tests for Ramya AI Security, Central Permission Manager, and Automation Registry.
"""
import pytest
from app.security.permissions import permissions, PermissionTier
from app.tools.registry import central_registry

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

def test_central_automation_registry_validation():
    # Test valid arguments for open_application
    valid, msg, cleaned = central_registry.validate_arguments("open_application", {"app_name": "notepad"})
    assert valid is True
    assert cleaned["app_name"] == "notepad"

    # Test missing required argument
    invalid, err_msg, _ = central_registry.validate_arguments("open_application", {})
    assert invalid is False
    assert "Missing required parameter" in err_msg

    # Test allowed choices validation
    invalid_action, act_err, _ = central_registry.validate_arguments("media_control", {"action": "unsupported_action"})
    assert invalid_action is False
    assert "allowed choices" in act_err

    # Test platform compatibility
    assert central_registry.is_platform_supported("open_application", "windows") is True
    assert central_registry.is_platform_supported("get_weather", "web") is True

    # Test dangerous injection blocked in argument
    blocked, block_msg, _ = central_registry.validate_arguments("create_task", {"title": "rmdir /s /q c:"})
    assert blocked is False
    assert "security violation" in block_msg.lower()
