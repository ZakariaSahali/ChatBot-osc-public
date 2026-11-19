# ChatBot-osc

An intelligent, context-aware chatbot assistant for the **Open Source Club (OSC) - University of Algiers 1**. The chatbot serves as an interactive club representative, answering questions about the club's mission, team, meetings, events, courses, and onboarding process using a local Large Language Model (LLM) powered by **Ollama**.

---

## 📌 Features

- **Local LLM Integration**: Uses [Ollama](https://ollama.com/) running lightweight open models (defaults to `qwen2.5:3b`) for private, local inference.
- **Real-time SSE Streaming**: Answers stream live token-by-token using Server-Sent Events with stop-generation support.
- **Context-Grounded Answers**: Restricts the assistant to answer strictly using club data, significantly reducing hallucinations. Manual info always takes precedence over scraped web data.
- **Multilingual Support**: Supports English and French, with experimental / best-effort handling of Algerian Arabic (Darja queries like *"kifash n-inscrire"*).
- **Dynamic In-Memory Caching**: Knowledge base files are cached and checked via file modification timestamps (`mtime`), eliminating disk I/O bottlenecks without requiring server restarts.
- **Web Scraping Pipeline**: Built-in scraper (`scraper.py`) extracting content from the official [Open Source Club Website](https://www.opensourceclub-univ-alger1.dz/).
- **Unanswered Query Analytics**: Automatically logs out-of-scope or unhandled queries to `logs/unanswered.log` so the executive team can identify missing documentation.
- **Rate Limiting & Safety**: Built-in sliding-window rate limiting to prevent denial-of-service or host overload.
- **Modern Responsive UI**: Built with custom club brand identity (Dark Obsidian, Electric Orange, Warm Amber, Fluorescent Lime), quick action chips, markdown/link rendering, and copy action buttons.

---

## 🗂️ Project Structure

```plaintext
Chatbot-osc/
├── app.py                 # Flask server with SSE chat stream, rate limiting & health endpoints
├── scraper.py             # Web scraper for extracting info from OSC website
├── knowledge_base.py      # In-memory cached knowledge loader (manual + scraped data)
├── inspect_site.py        # Utility script to inspect website HTML/structure
├── requirements.txt       # Python dependencies
├── Dockerfile             # Container configuration for production deployment
├── docker-compose.yml     # Multi-container orchestration
├── .dockerignore          # Docker build exclusion rules
├── .env.example           # Environment variables template
├── static/
│   ├── index.html         # Frontend chat interface with welcome card & prompt chips
│   ├── style.css          # OSC branded stylesheet
│   ├── script.js          # SSE client, markdown parser & abort controller
│   └── logo.png           # Club logo
├── Data/
│   ├── club_info.md       # Primary manual markdown context (highest authority)
│   └── scraped_web/       # Extracted text data from official club pages
│       ├── home.txt
│       ├── courses.txt
│       ├── events.txt
│       ├── join.txt
│       └── contact.txt
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Python 3.10+** (Python 3.12 recommended)
- **Ollama**: Download and install from [ollama.com](https://ollama.com/)

Pull the default language model:
```bash
ollama pull qwen2.5:3b
```

### 2. Installation

Clone the repository and set up a Python virtual environment:
```bash
git clone https://github.com/ZakariaSahali/ChatBot-osc-public.git
cd ChatBot-osc-public

python3 -m venv venv
```

Activate the virtual environment:
- **Linux/macOS**:
  ```bash
  source venv/bin/activate
  ```
- **Windows**:
  ```cmd
  venv\Scripts\activate
  ```

Install dependencies:
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```
Adjust parameters such as `PORT`, `OLLAMA_MODEL`, or `SYNC_SECRET` if needed.

### 4. Running the Server

Start the Flask server:
```bash
python app.py
```
To run the server and automatically sync/scrape the club website on boot:
```bash
python app.py --sync
```

Visit the application at:
```
http://localhost:5000
```

---

## 🐳 Docker Deployment

To run via Docker:
```bash
docker compose up -d --build
```
The server will run on port `5000` and communicate with the host's Ollama instance via `host.docker.internal`.

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Web chat interface |
| `/health` | `GET` | Checks Flask, Ollama connection, and model readiness |
| `/chat` | `POST` | Chat endpoint (supports both standard JSON and `stream=true` SSE) |
| `/sync` | `POST` | Re-scrapes the OSC website and refreshes cache (protected by `SYNC_SECRET`) |

---

## 💡 Managing Knowledge & Website Scraping

- **Manual Knowledge (`Data/club_info.md`)**: Always takes precedence over scraped web pages. Edit this file to add room locations, contacts, internal rules, or executive members.
- **Maintenance / Sync**: Rerun `python scraper.py` or run `python app.py --sync` whenever events change, registrations open, or announcements are updated.
- **Never edit files in `Data/scraped_web/` by hand**, as they are regenerated automatically.
- **Privacy & Logs**: The file `logs/unanswered.log` records student queries that the bot could not answer. It is ignored by version control to avoid leaking personal data and should only be accessed by club administrators.

---

## 🏷️ Brand & Attribution

The Open Source Club (OSC) logo and brand identity belong exclusively to the Open Source Club - Université d'Alger 1.

