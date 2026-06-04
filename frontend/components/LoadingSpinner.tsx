import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-4">
      <div className="relative w-12 h-12">
        {/* Outer glowing ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/10"></div>
        {/* Inner spinning gradient border */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
      </div>
      <p className="text-gray-400 text-sm font-medium animate-pulse">Searching the podcast...</p>
    </div>
  );
}
