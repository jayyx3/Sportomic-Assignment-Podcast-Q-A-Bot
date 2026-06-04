import React from 'react';

interface QueryBoxProps {
  question: string;
  setQuestion: (q: string) => void;
  onSubmit: (questionText: string) => void;
  isLoading: boolean;
}

export default function QueryBox({ question, setQuestion, onSubmit, isLoading }: QueryBoxProps) {
  const exampleQuestions = [
    "Why does Elon think we should expand consciousness?",
    "What does Elon say about AI?",
    "Why did Elon buy X (Twitter)?",
    "What is Elon's view on education?",
    "What does Nikhil ask about Mars?"
  ];

  const handleChipClick = (q: string) => {
    if (isLoading) return;
    setQuestion(q);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || question.length > 500 || isLoading) return;
    onSubmit(question.trim());
  };

  return (
    <div className="w-full space-y-5">
      {/* Example Chips */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Suggested Questions
        </label>
        <div className="flex flex-wrap gap-2">
          {exampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChipClick(q)}
              disabled={isLoading}
              className="text-xs bg-gray-800 hover:bg-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-3.5 py-2 rounded-full border border-gray-700 transition duration-200 text-left disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Main Query Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={question}
          onChange={handleTextareaChange}
          placeholder="e.g. What does Elon think about first-principles thinking?"
          disabled={isLoading}
          className="bg-gray-800 border border-gray-700 text-white rounded-xl p-4 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition duration-200 disabled:opacity-50"
        />

        <div className="flex justify-between items-center">
          {/* Character counter */}
          <span className={`text-xs ${question.length > 500 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
            {question.length} / 500
          </span>

          {/* Action button */}
          <button
            type="submit"
            disabled={isLoading || !question.trim() || question.length > 500}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-semibold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-blue-500/20"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Thinking...</span>
              </>
            ) : (
              <span>Ask Bot</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
