import http.server
import socketserver
import os
import socket
from pathlib import Path

PORT = 8888
APK_PATH = Path("c:/mern stack/mernpro/ramya/apps/android/app/build/outputs/apk/debug/app-debug.apk")
WIN_PATH = Path("c:/mern stack/mernpro/ramya/apps/desktop/public/ramya-ai-windows-v1.0.0.zip")

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class ApkDownloadHandler(http.server.BaseHTTPRequestHandler):
    def do_HEAD(self):
        if self.path in ["/download", "/ramya-ai.apk", "/ramya-ai-v1.0.0.apk", "/app-debug.apk"]:
            if not APK_PATH.exists():
                self.send_error(404, "APK not found on host machine.")
                return
            size = APK_PATH.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.android.package-archive")
            self.send_header("Content-Disposition", 'attachment; filename="RamyaAI-Assistant-v1.0.0.apk"')
            self.send_header("Content-Length", str(size))
            self.end_headers()
        elif self.path in ["/windows", "/ramya-ai-windows.zip", "/ramya-ai-windows-v1.0.0.zip"]:
            if not WIN_PATH.exists():
                self.send_error(404, "Windows package not found.")
                return
            size = WIN_PATH.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", 'attachment; filename="RamyaAI-Windows-v1.0.0.zip"')
            self.send_header("Content-Length", str(size))
            self.end_headers()
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()

    def do_GET(self):
        if self.path in ["/download", "/ramya-ai.apk", "/ramya-ai-v1.0.0.apk", "/app-debug.apk"]:
            if not APK_PATH.exists():
                self.send_error(404, "APK not found on host machine.")
                return
            
            size = APK_PATH.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.android.package-archive")
            self.send_header("Content-Disposition", 'attachment; filename="RamyaAI-Assistant-v1.0.0.apk"')
            self.send_header("Content-Length", str(size))
            self.end_headers()
            
            with open(APK_PATH, "rb") as f:
                while chunk := f.read(65536):
                    self.wfile.write(chunk)
            return

        if self.path in ["/windows", "/ramya-ai-windows.zip", "/ramya-ai-windows-v1.0.0.zip"]:
            if not WIN_PATH.exists():
                self.send_error(404, "Windows package not found.")
                return
            size = WIN_PATH.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", 'attachment; filename="RamyaAI-Windows-v1.0.0.zip"')
            self.send_header("Content-Length", str(size))
            self.end_headers()
            with open(WIN_PATH, "rb") as f:
                while chunk := f.read(65536):
                    self.wfile.write(chunk)
            return

        # Serve beautiful mobile download landing page
        ip = get_ip()
        size_mb = APK_PATH.stat().st_size / (1024 * 1024) if APK_PATH.exists() else 0
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download Ramya AI Android APK</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }}
        body {{
            background: radial-gradient(circle at 50% 20%, #0d1527 0%, #050811 100%);
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }}
        .card {{
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(56, 189, 248, 0.25);
            backdrop-filter: blur(16px);
            border-radius: 28px;
            padding: 40px 32px;
            max-width: 460px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.15);
        }}
        .badge {{
            display: inline-block;
            background: rgba(56, 189, 248, 0.12);
            color: #38bdf8;
            font-size: 13px;
            font-weight: 700;
            padding: 6px 14px;
            border-radius: 9999px;
            margin-bottom: 20px;
            border: 1px solid rgba(56, 189, 248, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        .orb {{
            width: 90px;
            height: 90px;
            margin: 0 auto 20px;
            border-radius: 50%;
            background: radial-gradient(circle, #38bdf8 0%, #0284c7 60%, #0369a1 100%);
            box-shadow: 0 0 35px #0284c7;
            animation: pulse 3s infinite alternate;
        }}
        @keyframes pulse {{
            0% {{ transform: scale(0.96); box-shadow: 0 0 25px #0284c7; }}
            100% {{ transform: scale(1.04); box-shadow: 0 0 45px #38bdf8; }}
        }}
        h1 {{ font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 8px; }}
        p.subtitle {{ color: #94a3b8; font-size: 15px; margin-bottom: 28px; }}
        .btn {{
            display: block;
            background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
            color: #fff;
            text-decoration: none;
            padding: 18px 28px;
            font-size: 17px;
            font-weight: 700;
            border-radius: 18px;
            margin-bottom: 24px;
            box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.5);
            transition: all 0.2s ease;
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 15px 30px -5px rgba(2, 132, 199, 0.7);
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
            text-align: left;
        }}
        .meta-item {{
            background: rgba(30, 41, 59, 0.5);
            padding: 12px 16px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }}
        .meta-label {{ font-size: 12px; color: #64748b; margin-bottom: 4px; }}
        .meta-value {{ font-size: 14px; font-weight: 600; color: #e2e8f0; }}
        .footer-note {{
            font-size: 13px;
            color: #64748b;
            line-height: 1.5;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">Official Android Build</div>
        <div class="orb"></div>
        <h1>Ramya AI</h1>
        <p class="subtitle">Personal Voice Assistant Companion</p>
        
        <div class="meta-grid">
            <div class="meta-item">
                <div class="meta-label">App Version</div>
                <div class="meta-value">v1.0.0 (Debug)</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Package Size</div>
                <div class="meta-value">{size_mb:.2f} MB</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Target OS</div>
                <div class="meta-value">Android 8.0 - 14+</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Security</div>
                <div class="meta-value">Zero Secrets Clean</div>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
            <a href="/ramya-ai-v1.0.0.apk" class="btn" style="margin-bottom: 0;">📱 Download Android APK (v1.0.0)</a>
            <a href="/ramya-ai-windows-v1.0.0.zip" class="btn" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); margin-bottom: 0;">🪟 Download Windows Package (v1.0.0)</a>
        </div>

        <div style="margin: 16px 0; background: #ffffff; padding: 14px; border-radius: 18px; display: inline-block;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://{ip}:{PORT}/ramya-ai-v1.0.0.apk" alt="Scan with Phone Camera" width="180" height="180" style="display:block; border-radius: 8px;">
        </div>
        <p style="font-size: 13px; color: #38bdf8; font-weight: 600; margin-bottom: 16px;">
            📱 Scan with phone camera to download Android APK instantly
        </p>

        <p class="footer-note">
            Tap the button above or scan the QR code from your phone camera. After downloading, open <strong>RamyaAI-Assistant.apk</strong> from your notification bar or Downloads folder to install.
        </p>
    </div>
</body>
</html>"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))

if __name__ == "__main__":
    ip = get_ip()
    server = socketserver.TCPServer(("0.0.0.0", PORT), ApkDownloadHandler)
    print(f"============================================================")
    print(f"  RAMYA AI — DIRECT APK DOWNLOAD SERVER RUNNING            ")
    print(f"============================================================")
    print(f"  On this computer:  http://localhost:{PORT}")
    print(f"  On your phone:     http://{ip}:{PORT}")
    print(f"  Direct APK link:   http://{ip}:{PORT}/ramya-ai.apk")
    print(f"============================================================")
    server.serve_forever()
