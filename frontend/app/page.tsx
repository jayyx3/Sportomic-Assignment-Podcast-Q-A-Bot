'use client';

import React, { useState, useEffect } from 'react';
import QueryBox from '../components/QueryBox';
import AnswerCard from '../components/AnswerCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { askQuestion, fetchTranscriptInfo, checkBackendHealth } from '../lib/api';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [timestamp, setTimestamp] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasResult, setHasResult] = useState(false);
  const [confidence, setConfidence] = useState('');

  // Extra state for metadata and backend connectivity
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [stats, setStats] = useState<{ totalChunks: number; durationSeconds: number } | null>(null);

  useEffect(() => {
    async function init() {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
      if (isOnline) {
        try {
          const info = await fetchTranscriptInfo();
          setStats({
            totalChunks: info.total_chunks,
            durationSeconds: info.duration_seconds,
          });
        } catch (e) {
          console.error("Failed to load transcript stats", e);
        }
      }
    }
    init();
  }, []);

  const handleAsk = async (questionText: string) => {
    setIsLoading(true);
    setError('');
    setHasResult(false);
    try {
      // First check health just to be sure
      const isOnline = await checkBackendHealth();
      if (!isOnline) {
        setBackendOnline(false);
        throw new Error("Backend server is not running on http://localhost:8000. Please start the server first.");
      }
      setBackendOnline(true);
      
      const res = await askQuestion(questionText);
      setAnswer(res.answer);
      setYoutubeLink(res.youtube_link);
      setTimestamp(res.timestamp);
      setConfidence(res.confidence || 'medium');
      setHasResult(true);
      
      // Update stats if we haven't loaded them yet
      if (!stats) {
        const info = await fetchTranscriptInfo();
        setStats({
          totalChunks: info.total_chunks,
          durationSeconds: info.duration_seconds,
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (sec: number): string => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col justify-between">
      <div className="max-w-3xl w-full mx-auto px-4 py-12 space-y-8 flex-grow">
        {/* Header Section */}
        <div className="space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2 justify-center sm:justify-start">
              <span className="text-3xl">🎙️</span>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Podcast Q&A Bot
              </h1>
            </div>
            
            {/* Status indicator */}
            <div className="flex justify-center sm:justify-end">
              {backendOnline === null ? (
                <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full flex items-center space-x-1.5 border border-gray-700">
                  <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
                  <span>Checking backend...</span>
                </span>
              ) : backendOnline ? (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full flex items-center space-x-1.5 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Backend Online</span>
                </span>
              ) : (
                <span className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full flex items-center space-x-1.5 border border-red-500/20 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Backend Offline</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <span className="bg-gray-800/80 text-gray-300 border border-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
              People by WTF · Ep. 16
            </span>
            {stats && stats.totalChunks > 0 && (
              <span className="text-xs text-gray-400">
                • {stats.totalChunks} chunks indexed ({formatDuration(stats.durationSeconds)})
              </span>
            )}
          </div>
          
          <p className="text-gray-400 text-base max-w-xl">
            Ask anything about the podcast conversation between Elon Musk and Nikhil Kamath. Get direct answers sourced from the transcript along with video timestamps.
          </p>
        </div>

        {/* Input Area */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <QueryBox
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleAsk}
            isLoading={isLoading}
          />
        </div>

        {/* Output / Status Area */}
        <div className="space-y-4">
          {isLoading && <LoadingSpinner />}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-red-400 text-sm flex flex-col space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Error</span>
              </div>
              <p>{error}</p>
              {!backendOnline && (
                <p className="text-xs text-gray-400 mt-1">
                  Make sure you have started the FastAPI server on port 8000: <code className="bg-gray-900 px-1 py-0.5 rounded text-gray-300">python -m uvicorn main:app --reload --port 8000</code>
                </p>
              )}
            </div>
          )}

          {hasResult && !isLoading && (
            <AnswerCard
              answer={answer}
              youtubeLink={youtubeLink}
              timestamp={timestamp}
              confidence={confidence}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-900 text-center text-xs text-gray-500">
        Sportomic AI Intern Assignment · Powered by Whisper, FAISS, and Groq API
      </footer>
    </main>
  );
}
