import { useState, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer';
import ChatInterface from './components/ChatInterface';
 
function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const playerRef = useRef(null);
 
  const extractVideoId = (url) => {
    const patterns = [
      /(?:v=|\/)([0-9A-Za-z_-]{11}).*/,
      /(?:embed\/)([0-9A-Za-z_-]{11})/,
      /^([0-9A-Za-z_-]{11})$/
    ];
 
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };
 
  const handleIngest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
 
    const extractedId = extractVideoId(videoUrl);
    if (!extractedId) {
      setError('Invalid YouTube URL. Please check and try again.');
      return;
    }
 
    setLoading(true);
 
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl })
      });
 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to ingest video');
      }
 
      const data = await response.json();
      setVideoId(data.video_id);
      setCurrentVideoUrl(videoUrl);
      setSuccess(`Successfully ingested! Processed ${data.chunks_processed} chunks.`);
      setVideoUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
 
  const handleTimestampClick = (seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
    }
  };
 
  return (
    <div className="h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 relative overflow-hidden flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
 
      <div className="container mx-auto px-4 pt-3 flex flex-col h-full relative z-10">
       
        <div className="flex-none">
          {/* Ultra Compact Header */}
          <header className="mb-2 text-center flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-75"></div>
                <svg
                  className="w-6 h-6 text-white relative z-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 tracking-tight">
                TubeMind
              </h1>
            </div>
            {/* Moved subtitle to right side to save vertical space */}
            <span className="hidden sm:block text-blue-200/60 text-xs font-light border-l border-white/20 pl-3">AI-Powered YouTube Intelligence</span>
          </header>
 
          {/* Ultra Compact URL Input */}
          <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-lg p-2 mb-3 border border-white/20">
            <form onSubmit={handleIngest} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste YouTube URL here..."
                  className="w-full px-3 py-2 bg-white/90 backdrop-blur-sm border border-transparent rounded-md focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 text-sm"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !videoUrl.trim()}
                className="relative px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md hover:shadow-lg hover:scale-[1.02] focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 font-medium text-sm whitespace-nowrap"
              >
                {loading ? 'Processing...' : 'Ingest'}
              </button>
            </form>
 
            {(error || success) && (
              <div className={`mt-2 p-1.5 rounded-md flex items-center text-xs ${error ? 'bg-red-500/20 text-red-100' : 'bg-green-500/20 text-green-100'}`}>
                <p>{error || success}</p>
              </div>
            )}
          </div>
        </div>
 
        {/* MAIN CONTENT AREA - FIXED */}
        {/* Ikkada removed the fixed height and kept the flex part */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 pb-2">
         
          {/* Video Player */}
          <div className="lg:col-span-7 bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-white/10 flex flex-col h-full">
            <div className="flex-1 min-h-0 h-full relative">
              {currentVideoUrl ? (
                <div className="h-full w-full">
                  <VideoPlayer
                    ref={playerRef}
                    url={currentVideoUrl}
                    onReady={() => console.log('Player ready')}
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40 text-center p-6">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                    <svg className="w-8 h-8 text-white/40 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium mb-1">Ready to Watch</h3>
                  <p className="text-white/50 text-sm">Paste a YouTube URL above to begin</p>
                </div>
              )}
            </div>
          </div>
 
          {/* Chat Interface - FULL HEIGHT */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-white/20 flex flex-col h-full transform transition-all">
           
            {/* Header with AI Icon */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-none">
              <div className="flex items-center gap-2">
                {/* AI Icon SVG */}
                <div className="p-1.5 bg-indigo-100/50 rounded-lg">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
               
                <div>
                  <h3 className="font-bold text-gray-800 text-sm tracking-wide">AI Assistant</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-500 font-medium">Online</span>
                  </div>
                </div>
              </div>
             
              {/* Model Badge */}
              <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[10px] text-indigo-600 font-bold"></span>
              </div>
            </div>
           
           
            {/* Chat Container - Takes all remaining space */}
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0">
                <ChatInterface
                  videoId={videoId}
                  onTimestampClick={handleTimestampClick}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>
 
        {/* Minimal Footer - Optional, can be removed to give even more space */}
        <footer className="py-2 text-center flex-none">
          <p className="text-white/20 text-[10px]">Built by Ajay ✨</p>
        </footer>
      </div>
    </div>
  );
}
 
export default App;