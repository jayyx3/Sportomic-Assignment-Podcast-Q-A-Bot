import os
import pickle
import faiss
import numpy as np
from dotenv import load_dotenv
from groq import Groq
from sentence_transformers import SentenceTransformer

# Load environment variables
backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(backend_dir, ".env"))

class RAGPipeline:
    def __init__(self):
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        faiss_dir = os.path.join(backend_dir, "data", "faiss_index")
        faiss_file = os.path.join(faiss_dir, "index.faiss")
        pkl_file = os.path.join(faiss_dir, "index.pkl")
        
        # If index files don't exist, raise FileNotFoundError with exact required message
        if not os.path.exists(faiss_file) or not os.path.exists(pkl_file):
            raise FileNotFoundError("Run ingest.py first")
            
        print("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        print("Loading FAISS index...")
        self.index = faiss.read_index(faiss_file)
        
        print("Loading chunk metadata...")
        with open(pkl_file, 'rb') as f:
            self.chunks = pickle.load(f)
            
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment. Please set it in .env file.")
            
        self.client = Groq(api_key=groq_api_key)
        print("RAGPipeline initialized successfully.")

    def query(self, question: str) -> dict:
        # Embed the question
        question_vector = self.model.encode([question])
        question_vector = np.array(question_vector).astype('float32')
        
        # Search FAISS for top 3 nearest chunks (k=3)
        D, I = self.index.search(question_vector, 3)
        
        distances = D[0]
        indices = I[0]
        
        # Get matching chunks
        matched_chunks = []
        for idx in indices:
            if idx != -1 and idx < len(self.chunks):
                matched_chunks.append(self.chunks[idx])
                
        if not matched_chunks:
            return {
                "answer": "I could not find a relevant answer in this podcast.",
                "timestamp": 0,
                "youtube_link": "https://www.youtube.com/watch?v=5ORTc3sEr18&t=0s",
                "confidence": "medium"
            }
            
        # Build context string by joining chunk texts
        context = "\n\n".join([chunk["text"] for chunk in matched_chunks])
        
        # Best match is the first one
        best_chunk = matched_chunks[0]
        best_distance = float(distances[0])
        
        # Call Groq API
        system_prompt = (
            "You are an expert assistant that answers questions based strictly on a podcast "
            "conversation between Elon Musk and Nikhil Kamath (People by WTF Ep. 16). "
            "Use only the context provided. Be concise, clear, and insightful. "
            "If the answer is not in the context, say: "
            "'I could not find a relevant answer in this podcast.'"
        )
        
        user_message = f"Context:\n{context}\n\nQuestion: {question}"
        
        model_name = "llama-3.1-8b-instant"
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                model=model_name,
                max_tokens=400,
                temperature=0.0
            )
        except Exception as e:
            print(f"Model {model_name} failed: {e}. Falling back to llama-3.3-70b-versatile...")
            model_name = "llama-3.3-70b-versatile"
            try:
                chat_completion = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    model=model_name,
                    max_tokens=400,
                    temperature=0.0
                )
            except Exception as e2:
                print(f"Model {model_name} failed: {e2}. Falling back to legacy llama3-8b-8192...")
                model_name = "llama3-8b-8192"
                chat_completion = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    model=model_name,
                    max_tokens=400,
                    temperature=0.0
                )
        
        answer = chat_completion.choices[0].message.content.strip()
        confidence = "high" if best_distance < 1.0 else "medium"
        
        return {
            "answer": answer,
            "timestamp": best_chunk["start_time_int"],
            "youtube_link": best_chunk["youtube_link"],
            "confidence": confidence
        }
