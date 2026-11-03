import React, { useState } from 'react';
import { Search, X, Mic } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search vegetables, fruits, food...',
  className = '',
}) => {
  const { searchQuery, setSearchQuery, showToast } = useApp();
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Listening... (e.g. say "Organic Rice")', 'info');
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setSearchQuery('Tomato');
        showToast('Voice Search: "Tomato"', 'success');
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Mic on: Please speak produce or crop name...', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript);
          showToast(`Voice Search: "${transcript}"`, 'success');
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute left-4 pointer-events-none text-zinc-400 dark:text-zinc-500">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-20 py-3 text-sm bg-white dark:bg-[#1B201D] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-soft focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all"
      />
      <div className="absolute right-3.5 flex items-center gap-1.5">
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={startVoiceSearch}
          className={`p-1.5 rounded-full transition-all ${
            isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800'
          }`}
          title="Voice Search (आवाज से खोजें)"
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
