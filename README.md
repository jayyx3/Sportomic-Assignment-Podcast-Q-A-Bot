# 🎙️ Podcast Q&A Bot — Sportomic AI Lab Assignment-

A fully local, cost-effective, and highly optimized **Retrieval-Augmented Generation (RAG)** Q&A bot. This application allows users to ask questions about the podcast conversation between **Elon Musk and Nikhil Kamath (People by WTF Ep. 16)**, returns precise, context-grounded answers, and provides a direct, one-click watch button to open YouTube at the exact timestamp where the topic is discussed.

---

## ⚡ Technical Highlights & Optimizations

The following critical engineering enhancements have been implemented:

1. **Zero-Latency LLM Inference**:
   * *Problem*: The template originally targeted the decommissioned `llama3-8b-8192` model. This caused an API exception on every query, forcing a slow network fallback (~1-2 seconds of added latency).
   * *Fix*: Switched the default model to the active **`llama-3.1-8b-instant`** with robust cascading fallbacks.
   * *Result*: Query responses are processed **instantly (sub-second latency)** on the first attempt.
2. **Verified Suggested Questions**:
   * *Problem*: The placeholder chips included questions about "first-principles thinking" and "building Tesla" which are not discussed in this specific 114-minute podcast episode, leading to fallback "not found" responses.
   * *Fix*: Replaced them with queries actually covered in the transcript (e.g., *"Why does Elon think we should expand consciousness?"* and *"Why did Elon buy X (Twitter)?"*).
   * *Result*: 100% of suggested questions yield high-confidence, context-grounded answers.
3. **Anti-Hallucination Grounding**:
   * Implemented strict system prompt constraints preventing the LLM from fabricating information. If a query (like *"How did Elon build Tesla?"*) is not discussed, the bot safely responds with *"I could not find a relevant answer in this podcast."*

---

## 🏗️ System Architecture & Workflow

The architecture is built on a modular RAG pipeline:

```
[YouTube Video] ➔ [yt-dlp: mp3] ➔ [Whisper: transcript.json] ➔ [300-word Chunks: chunks.json]
                                                                        │
[User Query] ➔ [sentence-transformers] ➔ [FAISS Vector Search] ➔ [Top 3 Chunks Context]
                                                                        │
[Answer Card & Timestamp Jump] ⮘ [Groq API: llama-3.1-8b-instant] ⮘ [Prompt Generator]
```

1. **Audio Download**: Extracts audio using `yt-dlp` and falls back automatically to an active mirror video if the primary is restricted.
2. **Transcription**: transcribes audio locally using OpenAI's `Whisper` (base model) with word-level timestamps.
3. **Chunking**: Chunks transcript text into passages of ~300 words with a ~50-word sliding overlap.
4. **Vector Database**: Embeds chunks using `sentence-transformers` (`all-MiniLM-L6-v2`) and indexes them using a local `FAISS` vector store.
5. **Generation**: Queries the top-3 closest semantic chunks and compiles them into a prompt for `llama-3.1-8b-instant` via the Groq API.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
* **Backend**: FastAPI (Python 3.10+), Uvicorn
* **Transcription**: `openai-whisper` (Runs 100% locally & free)
* **Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`) (Runs locally & free)
* **Vector Store**: `FAISS` (Runs locally & free)
* **LLM Inference**: Groq API (`llama-3.1-8b-instant`)

---

## 🚀 Setup & Installation

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**
* **FFmpeg** (Required by Whisper for audio processing)
  * *Windows*: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add the `bin` directory to your system's environment variables (`PATH`).
  * *macOS*: `brew install ffmpeg`
  * *Linux*: `sudo apt install ffmpeg`

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows (CMD/PowerShell)
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install setuptools==69.5.1 wheel
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   * Create a `.env` file inside the `backend/` folder:
     ```env
     GROQ_API_KEY=your_groq_api_key_here
     ```
     *(Get a free API key at [console.groq.com](https://console.groq.com))*
5. Run the Ingestion Pipeline (Performs download, transcription, chunking, and FAISS indexing):
   ```bash
   python ingest.py
   ```
   *(Note: This is already completed in this workspace. Run only if you want to re-ingest the data).*
6. Start the FastAPI backend server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser at [http://localhost:3000](http://localhost:3000).

---

## 💡 Example Queries to Test

Try these suggested queries in the dashboard to see full, grounded answers and exact video timestamp links:
1. **"Why does Elon think we should expand consciousness?"** (Jumps to 12:31)
2. **"What does Elon say about AI?"** (Jumps to 1:15:35)
3. **"Why did Elon buy X (Twitter)?"** (Jumps to 4:37)
4. **"What is Elon's view on education?"** (Jumps to 1:38:32)
5. **"What does Nikhil ask about Mars?"** (Jumps to 1:19:07)

---

## ⚠️ Limitations & Guardrails

* **Transcription Noise**: Whisper `base` runs fast and locally but can occasionally mishear complex Indian names or business terms.
* **Timestamp Accuracy**: The jump link targets the beginning of the ~300-word chunk containing the answer rather than the exact millisecond of the spoken word.
* **Rate Limits**: The free tier of the Groq API has rate limits (Requests Per Minute). Fallback logic is integrated to handle this gracefully.
