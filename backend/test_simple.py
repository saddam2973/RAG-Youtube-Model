"""
test_simple.py - Updated for youtube-transcript-api v1.2.3
"""
from youtube_transcript_api import YouTubeTranscriptApi
import os

print("Testing with cookies (v1.2.3 compatible)...")
video_id = "jNQXAC9IVRw"  # Me at the zoo

if not os.path.exists("cookies.txt"):
    print("⚠️ WARNING: 'cookies.txt' not found! You may get a block error.")

try:
    # 1. Instantiate the API Class (REQUIRED in v1.2.3)
    yt = YouTubeTranscriptApi()

    # 2. Use .fetch() instead of .get_transcript()
    # Pass the cookies file path directly to the method
    transcript = yt.fetch(video_id, cookies="cookies.txt")

    print(f"✅ SUCCESS! Got {len(transcript)} segments")
    print(f"First line: {transcript[0]['text']}")

except AttributeError:
    print("❌ API Error: It seems this version is very new.")
    print("Try running: dir(YouTubeTranscriptApi) to see available methods.")
except Exception as e:
    print(f"❌ FAILED: {e}")