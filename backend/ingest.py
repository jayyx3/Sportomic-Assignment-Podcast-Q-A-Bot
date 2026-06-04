import os
import json
import pickle
import shutil
import yt_dlp
import whisper
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

def download_audio(url: str, output_path: str):
    print(f"Downloading audio from {url}...")
    
    # Resolve Node path dynamically for the current user environment
    node_path = shutil.which('node')
    if not node_path:
        winget_path = r"C:\Users\joshi\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.15.0-win-x64\node.exe"
        if os.path.exists(winget_path):
            node_path = winget_path
            
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path.replace('.mp3', '.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3'
        }],
    }
    
    if node_path:
        print(f"Using JavaScript runtime at: {node_path}")
        ydl_opts['js_runtimes'] = {
            'node': {'path': node_path}
        }
    else:
        print("Warning: Node.js runtime not found. Attempting download without custom runtime path.")
        
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    print("Audio download complete.")

def transcribe_audio(audio_path: str) -> list:
    print("Loading Whisper 'base' model...")
    model = whisper.load_model("base")
    print("Transcribing audio (this may take a while)...")
    result = model.transcribe(audio_path, word_timestamps=True)
    
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "id": seg.get("id"),
            "start": float(seg.get("start")),
            "end": float(seg.get("end")),
            "text": seg.get("text", "").strip()
        })
    print("Transcription complete.")
    return segments

def chunk_segments(segments: list, youtube_url: str) -> list:
    print("Chunking segments into ~300-word passages with ~50-word overlap...")
    chunks = []
    current_chunk_segments = []
    current_word_count = 0
    
    # Extract base URL (remove any extra query params besides 'v')
    base_url = youtube_url.split('&')[0] if '&' in youtube_url else youtube_url
    
    i = 0
    while i < len(segments):
        seg = segments[i]
        seg_words = len(seg['text'].split())
        current_chunk_segments.append(seg)
        current_word_count += seg_words
        
        # Check if we reached the word target or the end of segments
        if current_word_count >= 300 or i == len(segments) - 1:
            chunk_text = " ".join([s['text'].strip() for s in current_chunk_segments])
            first_seg = current_chunk_segments[0]
            start_time = first_seg['start']
            start_time_int = int(start_time)
            
            chunks.append({
                "chunk_id": len(chunks),
                "text": chunk_text,
                "start_time": start_time,
                "start_time_int": start_time_int,
                "youtube_link": f"{base_url}&t={start_time_int}s"
            })
            
            # Slide/overlap: Backtrack to get ~50 words overlap
            overlap_words = 0
            backtrack_index = i
            while backtrack_index > 0 and overlap_words < 50:
                overlap_words += len(segments[backtrack_index]['text'].split())
                backtrack_index -= 1
            
            if i < len(segments) - 1:
                # Find start index of first segment in current chunk to ensure we make progress
                current_first_index = segments.index(first_seg)
                next_start_index = max(current_first_index + 1, backtrack_index + 1)
                i = next_start_index
                current_chunk_segments = []
                current_word_count = 0
            else:
                break
        else:
            i += 1
            
    print(f"Generated {len(chunks)} chunks.")
    return chunks

def build_vector_store(chunks: list, index_dir: str):
    print("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    chunk_texts = [c['text'] for c in chunks]
    print(f"Encoding {len(chunk_texts)} chunk embeddings...")
    embeddings = model.encode(chunk_texts, show_progress_bar=True)
    embeddings = np.array(embeddings).astype('float32')
    
    dimension = embeddings.shape[1]
    print(f"Creating FAISS IndexFlatL2 with dimension {dimension}...")
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    faiss_file = os.path.join(index_dir, "index.faiss")
    pkl_file = os.path.join(index_dir, "index.pkl")
    
    faiss.write_index(index, faiss_file)
    with open(pkl_file, 'wb') as f:
        pickle.dump(chunks, f)
        
    print(f"Saved FAISS index to {faiss_file}")
    print(f"Saved metadata pickle to {pkl_file}")

def main():
    # Setup directories relative to this script
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(backend_dir, "data")
    faiss_dir = os.path.join(data_dir, "faiss_index")
    os.makedirs(faiss_dir, exist_ok=True)
    
    primary_url = "https://www.youtube.com/watch?v=5ORTc3sEr18"
    fallback_url = "https://www.youtube.com/watch?v=Rni7Fz7208c"
    audio_path = os.path.join(data_dir, "podcast.mp3")
    
    active_url = primary_url
    
    # 1. Download audio if not exists
    if not os.path.exists(audio_path):
        try:
            download_audio(primary_url, audio_path)
            active_url = primary_url
        except Exception as e:
            print(f"Failed to download primary video: {e}")
            print(f"Attempting fallback to active video: {fallback_url}")
            download_audio(fallback_url, audio_path)
            active_url = fallback_url
            
            # Since active url changed, save metadata to let components know
            meta_path = os.path.join(data_dir, "metadata.json")
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump({"active_url": fallback_url}, f, indent=2)
    else:
        print(f"Audio file already exists at {audio_path}, skipping download.")
        # Load active URL from metadata if exists
        meta_path = os.path.join(data_dir, "metadata.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                    active_url = meta.get("active_url", primary_url)
            except Exception:
                pass
                
    # 2. Transcribe audio if transcript does not exist
    transcript_path = os.path.join(data_dir, "transcript.json")
    if not os.path.exists(transcript_path):
        segments = transcribe_audio(audio_path)
        with open(transcript_path, 'w', encoding='utf-8') as f:
            json.dump(segments, f, indent=2)
    else:
        print(f"Transcript file already exists at {transcript_path}, loading it...")
        with open(transcript_path, 'r', encoding='utf-8') as f:
            segments = json.load(f)
            
    # 3. Chunk segments if chunks.json does not exist
    chunks_path = os.path.join(data_dir, "chunks.json")
    if not os.path.exists(chunks_path):
        chunks = chunk_segments(segments, active_url)
        with open(chunks_path, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, indent=2)
    else:
        print(f"Chunks file already exists at {chunks_path}, loading it...")
        with open(chunks_path, 'r', encoding='utf-8') as f:
            chunks = json.load(f)
            
    # 4. Generate & Save FAISS Index
    faiss_file = os.path.join(faiss_dir, "index.faiss")
    pkl_file = os.path.join(faiss_dir, "index.pkl")
    if not os.path.exists(faiss_file) or not os.path.exists(pkl_file):
        build_vector_store(chunks, faiss_dir)
    else:
        print(f"FAISS index and metadata already exist in {faiss_dir}, skipping indexing.")
        
    print(f"Ingestion complete. Total chunks: {len(chunks)}")

if __name__ == "__main__":
    main()
