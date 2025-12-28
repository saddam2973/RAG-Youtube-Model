import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import ReactPlayer from 'react-player/youtube';

const VideoPlayer = forwardRef(({ url, onReady }, ref) => {
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds, 'seconds');
      }
    },
    getCurrentTime: () => {
      if (playerRef.current) {
        return playerRef.current.getCurrentTime();
      }
      return 0;
    }
  }));

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      {url ? (
        <ReactPlayer
          ref={playerRef}
          url={url}
          width="100%"
          height="100%"
          controls
          onReady={onReady}
          config={{
            youtube: {
              playerVars: { showinfo: 1 }
            }
          }}
        />
      ) : (
        <div className="text-center p-12">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <svg
              className="relative z-10 mx-auto h-32 w-32 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-400 mb-3">No Video Selected</p>
          <p className="text-gray-500">Paste a YouTube URL above and click Ingest Video</p>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
