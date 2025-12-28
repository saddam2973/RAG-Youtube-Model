import os
import faiss
import numpy as np
from typing import List, Dict
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
import time


class VectorStore:
    """
    Manages embeddings and FAISS index for semantic search.
    """
    
    def __init__(self, api_key: str):
        self.client = MistralClient(api_key=api_key)
        self.index = None
        self.chunks = []
        self.dimension = 1024
        
    def create_embeddings(self, texts: List[str], batch_size: int = 10) -> List[List[float]]:
        """
        Create embeddings for a list of texts using Mistral AI.
        
        Args:
            texts: List of text strings to embed
            batch_size: Number of texts to process at once (rate limiting)
        
        Returns:
            List of embedding vectors
        """
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            try:
                embeddings_response = self.client.embeddings(
                    model="mistral-embed",
                    input=batch
                )
                
                batch_embeddings = [item.embedding for item in embeddings_response.data]
                all_embeddings.extend(batch_embeddings)
                
                if i + batch_size < len(texts):
                    time.sleep(0.5)
                    
            except Exception as e:
                print(f"Error creating embeddings for batch {i}: {str(e)}")
                raise
        
        return all_embeddings
    
    def build_index(self, chunks: List[Dict]):
        """
        Build FAISS index from chunks.
        
        Args:
            chunks: List of chunks with 'text', 'start_time', 'end_time'
        """
        self.chunks = chunks
        texts = [chunk['text'] for chunk in chunks]
        
        print(f"Creating embeddings for {len(texts)} chunks...")
        embeddings = self.create_embeddings(texts)
        
        embeddings_array = np.array(embeddings).astype('float32')
        
        self.index = faiss.IndexFlatL2(self.dimension)
        self.index.add(embeddings_array)
        
        print(f"FAISS index built with {self.index.ntotal} vectors")
    
    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        Search for most relevant chunks given a query.
        
        Args:
            query: User's question
            top_k: Number of top results to return
        
        Returns:
            List of most relevant chunks with scores
        """
        if self.index is None or len(self.chunks) == 0:
            raise Exception("Index not built. Please ingest a video first.")
        
        query_embedding = self.create_embeddings([query])[0]
        query_vector = np.array([query_embedding]).astype('float32')
        
        distances, indices = self.index.search(query_vector, top_k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.chunks):
                chunk = self.chunks[idx].copy()
                chunk['score'] = float(distances[0][i])
                results.append(chunk)
        
        return results
    
    def generate_answer(self, query: str, context_chunks: List[Dict]) -> str:
        """
        Generate an answer using Mistral Chat with retrieved context.
        
        Args:
            query: User's question
            context_chunks: Retrieved relevant chunks
        
        Returns:
            AI-generated answer with timestamps
        """
        context_text = ""
        for i, chunk in enumerate(context_chunks):
            minutes = int(chunk['start_time'] // 60)
            seconds = int(chunk['start_time'] % 60)
            timestamp = f"[{minutes:02d}:{seconds:02d}]"
            # Limit chunk text to reduce tokens
            chunk_text = chunk['text'][:300] + "..." if len(chunk['text']) > 300 else chunk['text']
            context_text += f"\n{timestamp} {chunk_text}"
        
        # Detect if user wants a summary
        is_summary_request = any(word in query.lower() for word in ['summarize', 'summary', 'recap', 'overview', 'main points'])
        
        if is_summary_request:
            prompt = f"Summarize: {context_text}\n\n{query}"
        else:
            prompt = f"Answer: {context_text}\n\nQ: {query}"

        messages = [
            ChatMessage(role="user", content=prompt)
        ]
        
        try:
            chat_response = self.client.chat(
                model="mistral-small-latest",
                messages=messages,
                temperature=0.3,
                max_tokens=200  # Further reduced to avoid token limit
            )
            
            return chat_response.choices[0].message.content
            
        except Exception as e:
            print(f"Error generating answer: {str(e)}")
            raise
    
    def generate_summary(self, context_chunks: List[Dict], summary_type: str = "brief") -> str:
        """
        Generate a comprehensive summary using Mistral Chat with retrieved context.
        
        Args:
            context_chunks: Retrieved relevant chunks
            summary_type: Type of summary (brief, detailed, bullet_points)
        
        Returns:
            AI-generated summary with timestamps
        """
        context_text = ""
        for i, chunk in enumerate(context_chunks):
            minutes = int(chunk['start_time'] // 60)
            seconds = int(chunk['start_time'] % 60)
            timestamp = f"[{minutes:02d}:{seconds:02d}]"
            # Limit chunk text to reduce tokens
            chunk_text = chunk['text'][:300] + "..." if len(chunk['text']) > 300 else chunk['text']
            context_text += f"\n{timestamp} {chunk_text}"
        
        if summary_type == "bullet_points":
            prompt = f"Bullet summary: {context_text}"
        elif summary_type == "detailed":
            prompt = f"Detailed summary: {context_text}"
        else:  # brief
            prompt = f"Brief summary: {context_text}"

        messages = [
            ChatMessage(role="user", content=prompt)
        ]
        
        try:
            chat_response = self.client.chat(
                model="mistral-small-latest",
                messages=messages,
                temperature=0.3,
                max_tokens=250  # Further reduced to avoid token limit
            )
            
            return chat_response.choices[0].message.content
            
        except Exception as e:
            print(f"Error generating summary: {str(e)}")
            raise
