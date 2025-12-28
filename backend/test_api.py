"""
Simple test script to verify the TubeMind API is working correctly.
Run this after starting the backend server.

Usage:
    python test_api.py
"""

import requests
import time

BASE_URL = "http://localhost:8000"

def test_root():
    """Test the root endpoint"""
    print("\n=== Testing Root Endpoint ===")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    print("✓ Root endpoint working")

def test_ingest():
    """Test video ingestion"""
    print("\n=== Testing Video Ingestion ===")
    
    test_url = input("Enter a YouTube URL to test (or press Enter for default): ").strip()
    if not test_url:
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    print(f"Ingesting: {test_url}")
    print("This may take 30-60 seconds...")
    
    response = requests.post(
        f"{BASE_URL}/ingest",
        json={"url": test_url}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Video ingested successfully!")
        print(f"  Video ID: {data['video_id']}")
        print(f"  Chunks processed: {data['chunks_processed']}")
        return data['video_id']
    else:
        print(f"✗ Error: {response.json()}")
        return None

def test_ask(video_id):
    """Test asking questions"""
    print("\n=== Testing Question Answering ===")
    
    if not video_id:
        print("✗ No video ID available. Skipping test.")
        return
    
    question = input("Enter a question to ask (or press Enter for default): ").strip()
    if not question:
        question = "What is this video about?"
    
    print(f"Asking: {question}")
    
    response = requests.post(
        f"{BASE_URL}/ask",
        json={
            "video_id": video_id,
            "question": question
        }
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Answer received!")
        print(f"\nAnswer:\n{data['answer']}\n")
        print(f"Sources ({len(data['sources'])}):")
        for i, source in enumerate(data['sources'], 1):
            print(f"  {i}. [{source['timestamp']}] {source['text'][:100]}...")
    else:
        print(f"✗ Error: {response.json()}")

def test_list_videos():
    """Test listing ingested videos"""
    print("\n=== Testing List Videos ===")
    response = requests.get(f"{BASE_URL}/videos")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} ingested video(s)")
        if data['videos']:
            print("Videos:")
            for vid in data['videos']:
                print(f"  - {vid}")
    else:
        print(f"✗ Error: {response.json()}")

def main():
    """Run all tests"""
    print("=" * 50)
    print("TubeMind API Test Suite")
    print("=" * 50)
    
    try:
        test_root()
        video_id = test_ingest()
        
        if video_id:
            time.sleep(1)
            test_ask(video_id)
        
        test_list_videos()
        
        print("\n" + "=" * 50)
        print("All tests completed!")
        print("=" * 50)
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Error: Could not connect to the API.")
        print("Make sure the backend server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")

if __name__ == "__main__":
    main()
