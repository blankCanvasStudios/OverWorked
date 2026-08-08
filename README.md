# OverWorked
the project files for my ai made simulator, overWorked


# OVERWORKED: A Corporate Work Simulator
**Overworked** is a satirical corporate work simulator web application. The player assumes the role of a junior "Operational Data & Compliance Analyst" at a mega-corporation (*OmniCorp Enterprise Systems*). 
The goal of the game is to survive a "standard workday" while navigating increasingly absurd, contradictory, passive-aggressive corporate bureaucracy, broken enterprise software, and especially infuriating, annoying colleagues and a micromanaging boss.
## Features
- **OmniOS Desktop Workspace**: A dense, dark-themed enterprise desktop suite mimicking Windows, Teams, Zoom, and Excel.
- **SyncTalk (Chat Desk)**: Branching dialogues with coworkers (Brad, Karen, Chad, Priya, Derek, and Greg) featuring unhelpful responses, passive-aggressive remarks, and sudden demands.
- **MeetStream (Zoom Simulator)**: Click-to-progress audio-less video call engine with non-skippable slides, closed captions, and sudden interactive check-ins.
- **DataGrid (Spreadsheet Workbench)**: Reconcile financial data while avoiding hidden validation traps, volatile formulas, and trailing whitespaces.
- **System Obstacles**: Deal with password rotations, 2FA modals, disk defragmentation lockouts, standing desk height calibration, and quarantine updates.
- **Synthesized Corporate Sounds**: Custom chimes programmatically generated via browser Web Audio API for message pings, notifications, call joins, and task additions (zero-asset overhead).
---
## Local Development & Setup
### Prerequisites
- Node.js (v16+) installed.
### Setup and Launch
1. Clone or extract the project directory.
2. Install local proxy dependencies:
   ```bash
   npm install
   ```
3. Run the AI proxy server:
   ```bash
   node server.js
   ```
   *(Alternatively, run `start.bat` on Windows to install dependencies and run the server automatically).*
4. Navigate to `http://localhost:3001` in your browser to play the game!
---
## Public Deployment
The application is pre-configured to be hosted directly on the web:
- **Render**: Connect your GitHub repository as a **Web Service** running `node server.js`.
- **Cloudflare Pages**: Connect your GitHub repository as a **Pages** application. Cloudflare will automatically build the static assets and deploy the backend `/api/chat` and `/health` endpoints using the edge handlers inside the `functions/` folder.
---
