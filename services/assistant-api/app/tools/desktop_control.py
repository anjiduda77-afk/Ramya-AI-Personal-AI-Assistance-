"""
Windows Desktop Control and Automation Module for Ramya AI.
Provides verified application launching, active window detection,
media controls, and clipboard operations.
"""
import subprocess
import webbrowser
import ctypes
import os
import time
import logging
import psutil
import pyperclip
from typing import Dict, Any, Optional

logger = logging.getLogger("ramya.tools.desktop")

# Windows Virtual-Key Codes for Media & Volume
VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF
VK_MEDIA_NEXT_TRACK = 0xB0
VK_MEDIA_PREV_TRACK = 0xB1
VK_MEDIA_PLAY_PAUSE = 0xB3

# Allowlisted Applications
ALLOWLISTED_APPS = {
    "chrome": {
        "names": ["chrome", "google chrome", "browser"],
        "executables": ["chrome.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"],
        "launch_cmd": ["cmd", "/c", "start", "chrome"],
        "process_name": "chrome.exe"
    },
    "edge": {
        "names": ["edge", "microsoft edge"],
        "executables": ["msedge.exe"],
        "launch_cmd": ["cmd", "/c", "start", "msedge"],
        "process_name": "msedge.exe"
    },
    "notepad": {
        "names": ["notepad", "text editor"],
        "executables": ["notepad.exe"],
        "launch_cmd": ["notepad.exe"],
        "process_name": "notepad.exe"
    },
    "calculator": {
        "names": ["calculator", "calc"],
        "executables": ["calc.exe"],
        "launch_cmd": ["calc.exe"],
        "process_name": "CalculatorApp.exe"
    },
    "explorer": {
        "names": ["file explorer", "explorer", "files", "my computer"],
        "executables": ["explorer.exe"],
        "launch_cmd": ["explorer.exe"],
        "process_name": "explorer.exe"
    },
    "vscode": {
        "names": ["vs code", "vscode", "visual studio code", "code editor"],
        "executables": ["code.cmd", "code"],
        "launch_cmd": ["cmd", "/c", "code"],
        "process_name": "Code.exe"
    },
    "terminal": {
        "names": ["terminal", "powershell", "cmd", "command prompt"],
        "executables": ["wt.exe", "powershell.exe"],
        "launch_cmd": ["powershell.exe"],
        "process_name": "powershell.exe"
    },
    "youtube": {
        "names": ["youtube", "yt"],
        "url": "https://www.youtube.com"
    },
    "spotify": {
        "names": ["spotify", "music player"],
        "executables": ["spotify.exe"],
        "launch_cmd": ["cmd", "/c", "start", "spotify:"],
        "process_name": "Spotify.exe"
    }
}

class DesktopController:
    def open_app(self, app_query: str) -> Dict[str, Any]:
        """Launches an allowlisted desktop application and verifies execution."""
        clean_query = app_query.lower().strip()
        matched_key = None
        matched_spec = None

        for key, spec in ALLOWLISTED_APPS.items():
            if clean_query in spec["names"] or key in clean_query:
                matched_key = key
                matched_spec = spec
                break

        if not matched_spec:
            return {
                "success": False,
                "message": f"Application '{app_query}' is not in the verified allowlist for security.",
                "verified": False
            }

        # URL based app (e.g. YouTube)
        if "url" in matched_spec:
            webbrowser.open(matched_spec["url"])
            return {
                "success": True,
                "app": matched_key,
                "message": f"Opened {matched_key.capitalize()} in default browser.",
                "verified": True
            }

        # Process based launch
        try:
            subprocess.Popen(matched_spec["launch_cmd"], shell=True)
            # Verify process launched
            time.sleep(0.6)
            proc_name = matched_spec.get("process_name", "")
            is_running = any(proc_name.lower() in p.name().lower() for p in psutil.process_iter(['name'])) if proc_name else True
            
            return {
                "success": True,
                "app": matched_key,
                "message": f"Successfully launched {matched_key.capitalize()}.",
                "verified": is_running
            }
        except Exception as e:
            logger.error(f"Failed to launch app {matched_key}: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to open {matched_key}: {str(e)}",
                "verified": False
            }

    def get_active_window(self) -> Dict[str, Any]:
        """Returns the title and process of the currently active window on Windows."""
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            buff = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value

            pid = ctypes.c_ulong()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            proc_name = ""
            if pid.value:
                try:
                    proc_name = psutil.Process(pid.value).name()
                except Exception:
                    pass

            return {
                "success": True,
                "title": title or "Desktop",
                "process": proc_name,
                "hwnd": hwnd
            }
        except Exception as e:
            return {
                "success": False,
                "title": "Unknown",
                "error": str(e)
            }

    def media_control(self, action: str) -> Dict[str, Any]:
        """Simulates native Windows media and volume key strokes."""
        action_clean = action.lower().replace(" ", "_")
        key_map = {
            "play": VK_MEDIA_PLAY_PAUSE,
            "pause": VK_MEDIA_PLAY_PAUSE,
            "play_pause": VK_MEDIA_PLAY_PAUSE,
            "next": VK_MEDIA_NEXT_TRACK,
            "previous": VK_MEDIA_PREV_TRACK,
            "prev": VK_MEDIA_PREV_TRACK,
            "mute": VK_VOLUME_MUTE,
            "unmute": VK_VOLUME_MUTE,
            "volume_up": VK_VOLUME_UP,
            "volume_down": VK_VOLUME_DOWN
        }

        vk_code = key_map.get(action_clean)
        if not vk_code:
            return {
                "success": False,
                "message": f"Unsupported media action: {action}. Supported: play, pause, next, previous, mute, volume_up, volume_down."
            }

        try:
            # Press and release virtual key
            ctypes.windll.user32.keybd_event(vk_code, 0, 0, 0)
            ctypes.windll.user32.keybd_event(vk_code, 0, 2, 0) # KEYEVENTF_KEYUP = 2
            return {
                "success": True,
                "action": action_clean,
                "message": f"Media command '{action}' sent successfully."
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to execute media action: {str(e)}"
            }

    def clipboard_read(self) -> str:
        """Reads current clipboard text."""
        try:
            return pyperclip.paste()
        except Exception:
            return ""

    def clipboard_write(self, text: str) -> bool:
        """Copies text to clipboard."""
        try:
            pyperclip.copy(text)
            return True
        except Exception:
            return False

desktop_control = DesktopController()
