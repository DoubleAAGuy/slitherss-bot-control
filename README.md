# slither.io Bot Control — Chromium Extension

Control your slither.io bot groups from the browser. Start, stop, and live-update target coordinates.

## Install

1. Open Chrome/Edge/Brave and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this repo
5. The extension icon appears in the toolbar

## Usage

| Field / Button | What it does |
|----------------|--------------|
| **Server / Port / Path** | Game server to connect bots to |
| **Groups** | Number of proxy groups (× 4 bots each) |
| **▶ Start** | Calls `/start/{ip}:{port}/{groups}` on the control server |
| **■ Stop** | Calls `/stop` — kills all bot tasks |
| **X / Y** | Target coordinates to steer toward |
| **✏ Update Target** | Calls `/edit?x=...&y=...` — bots change course immediately |
| **Status** | Auto-polls `/status` every 3s |

## Prerequisites

The control server (`main.py`) must be running on `doubleaaguy.duckdns.org:8081`.
