'use client';

import { useState } from 'react';
import { usePuzzle } from '@/hooks/usePuzzle';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function GridRenderer() {
  const { state } = usePuzzle();
  const [showSolution, setShowSolution] = useState(true);

  if (!state.variants || state.variants.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Henüz Bulmaca Yok</h3>
        <p className="text-slate-500 mt-1 max-w-sm">Kelimelerinizi girin ve "Bulmaca Üret" butonuna tıklayarak oluşturun.</p>
      </div>
    );
  }

  const { variants, activeVariantIndex } = state;
  const currentVariant = variants[activeVariantIndex];
  const grid = currentVariant.grid;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-medium text-slate-800">Bulmaca Önizlemesi</h3>
        <button
          onClick={() => setShowSolution(!showSolution)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
        >
          {showSolution ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{showSolution ? 'Çözümü Gizle' : 'Çözümü Göster'}</span>
        </button>
      </div>

      {currentVariant.unplacedWords.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-100 p-3 px-4 flex items-start gap-3 text-amber-800 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Bazı kelimeler sığmadı:</p>
            <p className="text-amber-700/80 mt-0.5">
              {currentVariant.unplacedWords.map(w => w.answer).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="p-6 flex items-center justify-center bg-[#f8fafc] overflow-auto min-h-[400px]">
        <div 
          className="grid gap-[1px] bg-slate-800 border-2 border-slate-800 p-[1px]"
          style={{ 
            gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))` 
          }}
        >
          {grid.map((row, rowIndex) => (
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  "relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white transition-all",
                  cell.isBlack && "bg-slate-800"
                )}
              >
                {!cell.isBlack && cell.number && (
                  <span className="absolute top-0.5 left-1 text-[10px] leading-none font-medium text-slate-500">
                    {cell.number}
                  </span>
                )}
                {!cell.isBlack && showSolution && cell.letter && (
                  <span className="text-base sm:text-lg md:text-xl font-bold text-slate-800 font-sans uppercase">
                    {cell.letter}
                  </span>
                )}
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
}
