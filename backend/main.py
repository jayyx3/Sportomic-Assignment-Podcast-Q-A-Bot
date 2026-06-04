import os
import json
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from rag import RAGPipeline

app = FastAPI(title="Podcast Q&A Bot Backend")

# Enable CORS for http://localhost:3000 explicitly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline instance
rag_pipeline = None

@app.on_event("startup")
def startup_event():
    global rag_pipeline
    try:
        rag_pipeline = RAGPipeline()
    except Exception as e:
        print(f"Warning: RAGPipeline could not be initialized on startup: {e}")

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "index_loaded": rag_pipeline is not None
    }

@app.post("/ask")
def ask(payload: AskRequest):
    global rag_pipeline
    if rag_pipeline is None:
        # Attempt lazy initialization in case the index was generated after server start
        try:
            rag_pipeline = RAGPipeline()
        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": f"RAGPipeline not loaded: {str(e)}. Run ingest.py first."}
            )
            
    try:
        result = rag_pipeline.query(payload.question)
        return result
    except Exception as e:
        print(f"Error querying RAG Pipeline: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Something went wrong. Please try again."}
        )

@app.get("/transcript-info")
def transcript_info():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    chunks_file = os.path.join(backend_dir, "data", "chunks.json")
    transcript_file = os.path.join(backend_dir, "data", "transcript.json")
    
    total_chunks = 0
    duration_seconds = 0
    
    if os.path.exists(chunks_file):
        try:
            with open(chunks_file, 'r', encoding='utf-8') as f:
                chunks = json.load(f)
                total_chunks = len(chunks)
        except Exception as e:
            print(f"Error reading chunks.json: {e}")
            
    if os.path.exists(transcript_file):
        try:
            with open(transcript_file, 'r', encoding='utf-8') as f:
                transcript = json.load(f)
                if transcript:
                    duration_seconds = int(float(transcript[-1].get("end", 0.0)))
        except Exception as e:
            print(f"Error reading transcript.json: {e}")
            
    return {
        "total_chunks": total_chunks,
        "duration_seconds": duration_seconds
    }
