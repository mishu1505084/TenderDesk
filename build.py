#!/usr/bin/env python3
"""Builds index.html from src/tender-desk.html (the app) for hosting on GitHub Pages."""
import pathlib
root = pathlib.Path(__file__).parent
app = (root / "src" / "tender-desk.html").read_text(encoding="utf-8")
cut = app.index("<header")
head, body = app[:cut], app[cut:]
FB = "https://www.gstatic.com/firebasejs/10.12.2/"
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
{head.strip()}
<script src="{FB}firebase-app-compat.js"></script>
<script src="{FB}firebase-auth-compat.js"></script>
<script src="{FB}firebase-firestore-compat.js"></script>
<script src="firebase-config.js"></script>
<script src="firebase-adapter.js"></script>
</head>
<body>
{body.strip()}
</body>
</html>
"""
(root / "index.html").write_text(page, encoding="utf-8")
print("index.html written,", len(page), "bytes")
