from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
from dotenv import load_dotenv

from services.ingestion import extract_video_id, fetch_transcript, create_chunks, format_timestamp
from services.embeddings import VectorStore

load_dotenv()

app = FastAPI(title="TubeMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
if not MISTRAL_API_KEY:
    raise Exception("MISTRAL_API_KEY not found in environment variables")

vector_stores: Dict[str, VectorStore] = {}


class IngestRequest(BaseModel):
    url: str


class IngestResponse(BaseModel):
    video_id: str
    chunks_processed: int
    message: str


class AskRequest(BaseModel):
    video_id: str
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list


class SummaryRequest(BaseModel):
    video_id: str
    summary_type: str = "brief"  # brief, detailed, bullet_points


class SummaryResponse(BaseModel):
    summary: str
    key_points: list
    sources: list


@app.get("/")
async def root():
    return {
        "message": "TubeMind API - Real-Time YouTube RAG Assistant",
        "version": "1.0.0",
        "endpoints": {
            "POST /ingest": "Ingest a YouTube video",
            "POST /ask": "Ask a question about an ingested video",
            "POST /summary": "Get a comprehensive summary of a video",
            "GET /videos": "List all ingested videos"
        }
    }


@app.post("/ingest", response_model=IngestResponse)
async def ingest_video(request: IngestRequest):
    """
    Ingest a YouTube video by extracting transcript and creating embeddings.
    
    This endpoint:
    1. Extracts the video ID from the URL
    2. Fetches the transcript using youtube-transcript-api
    3. Chunks the transcript into manageable pieces
    4. Creates embeddings using Mistral AI
    5. Stores embeddings in FAISS index
    """
    try:
        video_id = extract_video_id(request.url)
        
        print(f"Fetching transcript for video: {video_id}")
        transcript = fetch_transcript(video_id)
        
        print(f"Creating chunks from {len(transcript)} transcript segments")
        chunks = create_chunks(transcript, chunk_size=500)
        
        print(f"Building vector store with {len(chunks)} chunks")
        vector_store = VectorStore(MISTRAL_API_KEY)
        vector_store.build_index(chunks)
        
        vector_stores[video_id] = vector_store
        
        return IngestResponse(
            video_id=video_id,
            chunks_processed=len(chunks),
            message=f"Video ingested successfully! Processed {len(chunks)} chunks."
        )
        
    except ValueError as e:
        print(f"ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Exception during ingestion: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error ingesting video: {str(e)}")


@app.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """
    Ask a question about an ingested video.
    
    This endpoint:
    1. Converts the question into an embedding
    2. Searches FAISS for the most relevant chunks
    3. Sends chunks + question to Mistral Chat
    4. Returns AI-generated answer with timestamps
    """
    try:
        if request.video_id not in vector_stores:
            raise HTTPException(
                status_code=404,
                detail=f"Video {request.video_id} not found. Please ingest it first."
            )
        
        vector_store = vector_stores[request.video_id]
        
        print(f"Searching for relevant chunks for question: {request.question}")
        relevant_chunks = vector_store.search(request.question, top_k=2)
        
        print(f"Generating answer using {len(relevant_chunks)} chunks")
        answer = vector_store.generate_answer(request.question, relevant_chunks)
        
        sources = [
            {
                "text": chunk['text'][:200] + "...",
                "timestamp": format_timestamp(chunk['start_time']),
                "start_time": chunk['start_time']
            }
            for chunk in relevant_chunks
        ]
        
        return AskResponse(
            answer=answer,
            sources=sources
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@app.post("/summary", response_model=SummaryResponse)
async def get_summary(request: SummaryRequest):
    """
    Get a comprehensive summary of an ingested video.
    
    This endpoint:
    1. Retrieves all relevant chunks from the video
    2. Generates a comprehensive summary using Mistral AI
    3. Extracts key points with timestamps
    4. Returns structured summary with sources
    """
    try:
        if request.video_id not in vector_stores:
            raise HTTPException(
                status_code=404,
                detail=f"Video {request.video_id} not found. Please ingest it first."
            )
        
        vector_store = vector_stores[request.video_id]
        
        # Get more chunks for comprehensive summary
        print(f"Getting comprehensive chunks for summary")
        relevant_chunks = vector_store.search("main topics key points summary overview", top_k=4)
        
        print(f"Generating {request.summary_type} summary using {len(relevant_chunks)} chunks")
        summary = vector_store.generate_summary(relevant_chunks, request.summary_type)
        
        # Extract key points from chunks
        key_points = []
        for chunk in relevant_chunks[:5]:  # Top 5 chunks as key points
            key_points.append({
                "point": chunk['text'][:150] + "...",
                "timestamp": format_timestamp(chunk['start_time']),
                "start_time": chunk['start_time']
            })
        
        sources = [
            {
                "text": chunk['text'][:200] + "...",
                "timestamp": format_timestamp(chunk['start_time']),
                "start_time": chunk['start_time']
            }
            for chunk in relevant_chunks
        ]
        
        return SummaryResponse(
            summary=summary,
            key_points=key_points,
            sources=sources
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")


@app.get("/videos")
async def list_videos():
    """
    List all ingested videos.
    """
    return {
        "videos": list(vector_stores.keys()),
        "count": len(vector_stores)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
