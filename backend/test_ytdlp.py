"""
Test yt-dlp transcript fetching
"""
from services.ingestion import fetch_transcript

print("Testing yt-dlp transcript fetching...\n")

test_videos = [
    ("jNQXAC9IVRw", "Me at the zoo"),
    ("9bZkp7q19f0", "PSY - GANGNAM STYLE"),
]

for video_id, title in test_videos:
    print(f"Testing: {title} ({video_id})")
    try:
        transcript = fetch_transcript(video_id)
        print(f"✅ SUCCESS! Got {len(transcript)} segments")
        print(f"   First segment: {transcript[0]['text'][:50]}...")
        print()
    except Exception as e:
        print(f"❌ FAILED: {e}")
        print()

print("Test complete!")
