'use client';

import { usePuzzle } from '@/hooks/usePuzzle';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function VariantSwitcher() {
  const { state, dispatch } = usePuzzle();
  
  if (!state.variants || state.variants.length === 0) {
    return null;
  }

  const { variants, activeVariantIndex } = state;
  const currentVariant = variants[activeVariantIndex];

  const handlePrevious = () => {
    if (activeVariantIndex > 0) {
      dispatch({ type: 'SET_ACTIVE_VARIANT', index: activeVariantIndex - 1 });
    }
  };

  const handleNext = () => {
    if (activeVariantIndex < variants.length - 1) {
      dispatch({ type: 'SET_ACTIVE_VARIANT', index: activeVariantIndex + 1 });
    }
  };

  const scorePercentage = Math.round(currentVariant.score * 100);
  const totalWords = currentVariant.placedWords.length + currentVariant.unplacedWords.length;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={activeVariantIndex === 0}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Önceki varyasyon"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex items-center gap-2">
          {variants.map((_, idx) => (
            <button
              key={idx}
              onClick={() => dispatch({ type: 'SET_ACTIVE_VARIANT', index: idx })}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                idx === activeVariantIndex 
                  ? "bg-brand-500 w-6" 
                  : "bg-slate-200 hover:bg-slate-300"
              )}
              aria-label={`Varyasyon ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={activeVariantIndex === variants.length - 1}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Sonraki varyasyon"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex flex-col">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Yerleşim</span>
          <span className="font-semibold text-slate-800">
            {currentVariant.placedWords.length} / {totalWords} Kelime
          </span>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex flex-col">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Skor</span>
          <span className={cn(
            "font-semibold",
            scorePercentage > 80 ? "text-emerald-600" : scorePercentage > 50 ? "text-amber-600" : "text-slate-800"
          )}>
            %{scorePercentage}
          </span>
        </div>
      </div>
    </div>
  );
}
