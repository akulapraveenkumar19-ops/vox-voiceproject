# VoxWeb – Intelligent Voice Website Assistant 🎙️🌐

> “Talk. Search. Explore. With VoxWeb.”

**VoxWeb** is a modern, voice-first AI assistant web application that empowers users to speak natural voice commands, ask general intelligence questions, launch supported websites, execute Google searches, and receive spoken audio & visual responses in real time.

Built with a **dark navy & deep blue + purple/blue gradient** SaaS aesthetic featuring glassmorphism cards, glowing borders, smooth sound visualizers, and responsive desktop/tablet/mobile layouts.

---

## ⚡ Core Architecture

```
User Voice / Speech
        ↓
Browser Web Speech API (STT: Speech-to-Text)
        ↓
Command Router (Fast Command vs AI Question)
 ┌─────────────────────────┴─────────────────────────┐
 │                                                   │
Fast Command (Latency < 10ms)                  AI Question
 │                                                   │
 ├─ "Open YouTube" → https://youtube.com             ▼
 ├─ "Open Google"  → https://google.com        FastAPI Backend
 ├─ "Search Google for {query}"                      ▼
 └─ "What time is it?"                         OpenAI LLM (gpt-4o-mini)
 │                                                   │
 └─────────────────────────┬─────────────────────────┘
                           ▼
                  Visual Chat Stream
                           ▼
     Browser Web Speech API (TTS: Text-to-Speech)
                           ▼
               Spoken Audio to User 🔊
```

---

## 🛠️ Technology Stack

### Frontend:
- **React.js & Vite**: Fast modular client with fast HMR
- **Web Speech API**:
  - `SpeechRecognition` / `webkitSpeechRecognition` for real-time Speech-to-Text
  - `SpeechSynthesis` for natural Text-to-Speech playback
- **Lucide React**: Modern icons
- **Axios**: Configured client with automatic JWT bearer tokens & HTTP-only cookies
- **React Router**: Protected dashboard and authentication routing
- **Custom CSS3 Glassmorphism System**: Responsive from mobile (320px) to desktop (1920px)

### Backend:
- **Python 3.12 & FastAPI**: High-performance asynchronous API
- **Uvicorn**: Lightning-fast ASGI server
- **Pydantic v2**: Strict schema validation & type safety
- **JWT (pyjwt)**: Token creation, decoding, and session lifecycle
- **Bcrypt**: Cryptographic password hashing
- **OpenAI Async Client**: Conversational AI responses tailored for voice

### Database:
- **MongoDB / Motor**: Native asynchronous MongoDB driver
- **Resilient Fallback Engine**: Embedded async in-memory document store that allows the app to run seamlessly even without a pre-installed MongoDB daemon, transitioning automatically to live MongoDB Atlas when `MONGODB_URI` is provided!

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create/verify environment configuration
copy .env.example .env

# Install backend dependencies
python -m pip install -r requirements.txt

# Start backend server (runs on port 8000)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server (runs on port 5173 with API proxy)
npm run dev
```

Open your browser and visit:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 Environment Variables (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | OpenAI API key for live LLM completions | Optional (Built-in offline knowledge bank provided) |
| `OPENAI_MODEL` | Target OpenAI model | `gpt-4o-mini` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `voxweb` |
| `JWT_SECRET_KEY` | Cryptographic secret for signing JWTs | Auto-configured |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Optional (Demo 1-click login enabled) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Optional |
| `SMTP_HOST` / `SMTP_PORT` | SMTP Email host for OTP | `smtp.gmail.com:587` |
| `SMTP_USERNAME` / `SMTP_PASSWORD`| Credentials for sending real OTP emails | Optional (Dev OTP logged in console & toast) |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

---

## 🎙️ Spoken Voice Commands Supported

### ⚡ Fast Actions (Zero LLM latency):
- **“Open YouTube”** → Opens `https://youtube.com`
- **“Open Google”** → Opens `https://google.com`
- **“Open WhatsApp”** → Opens `https://web.whatsapp.com`
- **“Open GitHub”** → Opens `https://github.com`
- **“Open Twitter”** or **“Open X”** → Opens `https://x.com`
- **“Open Reddit”** → Opens `https://reddit.com`
- **“Search Google for Python tutorials”** → Opens Google search with encoded query
- **“Search for React components”** → Performs web search
- **“What time is it?”** / **“Current time”** → Speaks and prints current local time
- **“What date is it?”** / **“Today's date”** → Speaks today's date

### 🤖 AI Voice Questions:
- **“What is Artificial Intelligence?”**
- **“What is Python?”**
- **“What is Machine Learning?”**
- **“Tell me about Aurora University”**
- **“Who are you?”**
- Any open-ended question — VoxWeb responds with concise, spoken-friendly answers!

---

## 🧪 Verified Feature Checklist

- [x] **Split-Screen Login**: Left side branding with animated waveform & feature cards, right side sign-in form.
- [x] **Google OAuth & 1-Click Login**: Seamless Google sign-in integration.
- [x] **Email & Password Registration**: With password confirmation and bcrypt hashing.
- [x] **Forgot Password & Email OTP**: 6-digit OTP verification with expiration and reset flow.
- [x] **JWT Authentication**: Protected API routes, bearer tokens, and session cookies.
- [x] **Web Speech Recognition (STT)**: Microphone permissions, interim transcript preview, listening animations.
- [x] **Web Speech Synthesis (TTS)**: Natural voice playback, customizable rate, pitch, persona, and mute toggle.
- [x] **Fast Command Router**: Instant execution of website opening, search queries, and clock checks.
- [x] **OpenAI LLM Integration**: Asynchronous completions with spoken-friendly system prompting and smart knowledge fallback.
- [x] **Chat History**: Full conversation logging, search filtering, individual deletion, and clear all.
- [x] **User Profile**: Plan status, member since date, command usage statistics, and avatar/password updates.
- [x] **Settings**: Voice speed slider, pitch slider, voice persona selection, language selector, and session controls.
- [x] **Responsive Mobile Layout**: Tested for desktop, tablet, and mobile with slide-out drawer.
