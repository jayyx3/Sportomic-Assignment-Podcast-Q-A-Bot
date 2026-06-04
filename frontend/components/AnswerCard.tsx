import React from 'react';

interface AnswerCardProps {
  answer: string;
  youtubeLink: string;
  timestamp: number;
  confidence: string;
}

export default function AnswerCard({ answer, youtubeLink, timestamp, confidence }: AnswerCardProps) {
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mt-6 space-y-5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-gray-600">
      {/* Top row with confidence badge */}
      <div className="flex justify-between items-center border-b border-gray-700/50 pb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Answer</span>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Confidence:</span>
          {confidence === "high" ? (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              High
            </span>
          ) : (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Medium
            </span>
          )}
        </div>
      </div>

      {/* Answer content */}
      <p className="text-white text-base leading-relaxed whitespace-pre-line font-medium">
        {answer}
      </p>

      {/* Action and timestamp */}
      <div className="pt-2 flex flex-col items-center space-y-3">
        <button
          onClick={() => window.open(youtubeLink, '_blank')}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold transition duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-red-600/20"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span>▶ Watch this moment in the podcast</span>
        </button>
        <span className="text-xs text-gray-400 font-medium">
          Jumps to {formatTime(timestamp)} in the video
        </span>
      </div>
    </div>
  );
}
