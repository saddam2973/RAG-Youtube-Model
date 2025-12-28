import re
from typing import List, Dict
import yt_dlp
import json


def extract_video_id(url: str) -> str:
    """
    Extract YouTube video ID from various URL formats.
    
    Supports:
    - https://www.youtube.com/watch?v=dQw4w9WgXcQ
    - https://youtu.be/dQw4w9WgXcQ
    - https://www.youtube.com/embed/dQw4w9WgXcQ
    """
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    raise ValueError("Invalid YouTube URL. Could not extract video ID.")


def fetch_transcript(video_id: str) -> List[Dict]:
    """
    Fetch transcript for a YouTube video using yt-dlp.
    
    Returns:
        List of dicts with 'text', 'start', and 'duration' keys
    
    Raises:
        Exception: If no transcript can be retrieved
    """
    print(f"Fetching transcript for video: {video_id}")
    
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    import os
    cookies_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'cookies.txt')
    
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'en-US', 'en-GB'],
        'subtitlesformat': 'json3',
        'quiet': True,
        'no_warnings': True,
    }
    
    if os.path.exists(cookies_path):
        ydl_opts['cookiefile'] = cookies_path
        print(f"Using cookies from: {cookies_path}")
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if 'subtitles' in info and info['subtitles']:
                for lang in ['en', 'en-US', 'en-GB']:
                    if lang in info['subtitles']:
                        subtitle_url = info['subtitles'][lang][0]['url']
                        transcript = _download_and_parse_subtitles(subtitle_url)
                        if transcript:
                            print(f"✓ Successfully fetched {len(transcript)} transcript segments")
                            return transcript
            
            if 'automatic_captions' in info and info['automatic_captions']:
                for lang in ['en', 'en-US', 'en-GB']:
                    if lang in info['automatic_captions']:
                        subtitle_url = info['automatic_captions'][lang][0]['url']
                        transcript = _download_and_parse_subtitles(subtitle_url)
                        if transcript:
                            print(f"✓ Successfully fetched {len(transcript)} auto-generated transcript segments")
                            return transcript
            
            raise Exception("No transcripts or captions available for this video")
            
    except Exception as e:
        error_msg = str(e)
        if "No transcripts" in error_msg:
            raise Exception(
                f"No captions available for video {video_id}. "
                f"Please try a video with captions enabled (look for the CC button on YouTube)."
            )
        else:
            raise Exception(f"Error fetching transcript: {error_msg}")


def _download_and_parse_subtitles(subtitle_url: str) -> List[Dict]:
    """
    Download and parse subtitle data from URL.
    
    Returns:
        List of dicts with 'text', 'start', and 'duration' keys
    """
    import urllib.request
    
    try:
        with urllib.request.urlopen(subtitle_url) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        transcript = []
        
        if 'events' in data:
            for event in data['events']:
                if 'segs' in event and event.get('tStartMs') is not None:
                    text = ''.join(seg.get('utf8', '') for seg in event['segs'])
                    if text.strip():
                        transcript.append({
                            'text': text.strip(),
                            'start': event['tStartMs'] / 1000.0,
                            'duration': event.get('dDurationMs', 0) / 1000.0
                        })
        
        return transcript
        
    except Exception as e:
        print(f"Error parsing subtitles: {e}")
        return []


def create_chunks(transcript: List[Dict], chunk_size: int = 500) -> List[Dict]:
    """
    Create text chunks from transcript with timestamps.
    
    Args:
        transcript: List of transcript segments
        chunk_size: Target size for each chunk in characters
    
    Returns:
        List of chunks with 'text', 'start_time', and 'end_time'
    """
    chunks = []
    current_chunk = ""
    chunk_start_time = 0
    chunk_end_time = 0
    
    for i, segment in enumerate(transcript):
        if not current_chunk:
            chunk_start_time = segment['start']
        
        current_chunk += segment['text'] + " "
        chunk_end_time = segment['start'] + segment.get('duration', 0)
        
        if len(current_chunk) >= chunk_size or i == len(transcript) - 1:
            chunks.append({
                'text': current_chunk.strip(),
                'start_time': chunk_start_time,
                'end_time': chunk_end_time
            })
            current_chunk = ""
    
    return chunks


def format_timestamp(seconds: float) -> str:
    """
    Convert seconds to MM:SS format.
    
    Args:
        seconds: Time in seconds
    
    Returns:
        Formatted timestamp string like "04:20"
    """
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"
