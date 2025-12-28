import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const ChatInterface = ({ videoId, onTimestampClick }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseTimestamps = (text) => {
    const timestampRegex = /\[(\d{2}):(\d{2})\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timestampRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const totalSeconds = minutes * 60 + seconds;

      parts.push({
        type: 'timestamp',
        content: match[0],
        seconds: totalSeconds
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !videoId) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          question: input
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      const aiMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please make sure the video is ingested first.`,
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimestampClick = (seconds) => {
    onTimestampClick(seconds);
  };

  const handleGetSummary = async (summaryType = "brief") => {
    if (!videoId) return;
    
    setSummaryLoading(true);
    
    const summaryMessage = { 
      role: 'assistant', 
      content: `Generating ${summaryType} summary...`,
      isSummary: true
    };
    setMessages(prev => [...prev, summaryMessage]);

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          summary_type: summaryType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get summary');
      }

      const data = await response.json();
      
      // Replace loading message with actual summary
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: data.summary,
          sources: data.sources,
          keyPoints: data.key_points,
          isSummary: true
        };
        return newMessages;
      });
    } catch (error) {
      // Replace loading message with error
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `Error: ${error.message}. Please make sure the video is ingested first.`,
          isError: true,
          isSummary: true
        };
        return newMessages;
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      {/* <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        <div className="relative z-10">
          <div className="flex items-center mb-2">
            <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h2 className="text-2xl font-bold">AI Assistant</h2>
          </div>
          <p className="text-sm opacity-90 font-light">Ask anything about the video content</p>
        </div>
      </div> */}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12 animate-fadeIn">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <svg
                className="relative z-10 mx-auto h-20 w-20 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-700 mb-2">Ready to Chat!</p>
            <p className="text-sm text-gray-500">Ingest a video and start asking questions</p>
            <div className="mt-6 flex justify-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Instant Answers</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Timestamp Links</span>
              <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">AI-Powered</span>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : message.isError
                  ? 'bg-red-50 text-red-800 border-2 border-red-200'
                  : 'bg-white text-gray-800 border border-gray-100'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <div className="leading-relaxed">
                  {parseTimestamps(message.content).map((part, i) => (
                    <span key={i}>
                      {part.type === 'timestamp' ? (
                        <button
                          onClick={() => handleTimestampClick(part.seconds)}
                          className="inline-flex items-center px-2 py-0.5 mx-1 -my-1 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-md hover:from-blue-600 hover:to-purple-600 hover:scale-105 transition-all duration-200 shadow-sm align-middle"
                          title="Jump to this timestamp"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                          {part.content}
                        </button>
                      ) : (
                        <ReactMarkdown components={{ p: React.Fragment }}>{part.content}</ReactMarkdown>
                      )}
                    </span>
                  ))}
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}

              {/* Enhanced Sources Section */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Source Clips
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {message.sources.map((source, i) => (
                      <button
                        key={i}
                        onClick={() => handleTimestampClick(source.start_time)}
                        className="group flex items-start text-left w-full bg-gray-50 hover:bg-white p-3 rounded-xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <span className="flex-shrink-0 inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
                           <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                           </svg>
                           {source.timestamp}
                        </span>
                        <span className="ml-3 text-xs text-gray-600 group-hover:text-gray-900 line-clamp-2 leading-relaxed transition-colors duration-200">
                          {source.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-slideIn">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-800 rounded-2xl p-4 shadow-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <div className="absolute inset-0 rounded-full bg-blue-400 blur-sm opacity-50 animate-pulse"></div>
                </div>
                <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {videoId && (
        <div className="border-t border-gray-200 p-3 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Quick Actions</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGetSummary("brief")}
              disabled={summaryLoading}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 hover:shadow-md disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Brief Summary
            </button>
            <button
              onClick={() => handleGetSummary("detailed")}
              disabled={summaryLoading}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm rounded-lg hover:from-purple-600 hover:to-purple-700 hover:shadow-md disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Detailed
            </button>
            <button
              onClick={() => handleGetSummary("bullet_points")}
              disabled={summaryLoading}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-sm rounded-lg hover:from-pink-600 hover:to-pink-700 hover:shadow-md disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Bullet Points
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-white to-blue-50">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={videoId ? "Ask anything about the video..." : "Ingest a video first..."}
            disabled={!videoId || loading}
            className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all duration-300 text-gray-800 placeholder-gray-400 shadow-inner"
          />
          <button
            type="submit"
            disabled={!videoId || loading || !input.trim()}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 font-bold flex items-center shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;