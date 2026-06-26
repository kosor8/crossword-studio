'use client';

import { useState } from 'react';
import { usePuzzle } from '@/hooks/usePuzzle';
import { AlertCircle } from 'lucide-react';
import { PdfExporter } from '@/components/export/PdfExporter';
import { calculateHole } from '@/lib/algorithm/placer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function GridRenderer() {
  const { state } = usePuzzle();

  if (!state.variants || state.variants.length === 0) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-slate-400 min-h-[400px]">
        <p>Bulmaca oluşturduğunuzda önizleme burada görünecektir.</p>
      </div>
    );
  }

  const { variants, activeVariantIndex } = state;
  const currentVariant = variants[activeVariantIndex];
  const grid = currentVariant.grid;

  let holeMinRow = -1, holeMinCol = -1;
  let holeW = 0, holeH = 0;
  
  if (state.hasPhoto) {
    const hole = calculateHole({
      gridCols: grid[0]?.length || 0,
      gridRows: grid.length,
      hasPhoto: state.hasPhoto,
      photoOrientation: state.photo?.orientation || 'horizontal',
      maxAttempts: 50
    });
    if (hole) {
      holeW = hole.holeW;
      holeH = hole.holeH;
      holeMinRow = hole.holeMinRow;
      holeMinCol = hole.holeMinCol;
    }
  }

  const holeMaxRow = holeMinRow !== -1 ? holeMinRow + holeH - 1 : -1;
  const holeMaxCol = holeMinCol !== -1 ? holeMinCol + holeW - 1 : -1;

  const isInHole = (r: number, c: number) => {
    if (!state.hasPhoto || holeMinRow === -1) return false;
    return r >= holeMinRow && r <= holeMaxRow && c >= holeMinCol && c <= holeMaxCol;
  };

  // Split clues into across and down
  const acrossClues = currentVariant.placedWords
    .filter((w) => w.direction === 'across')
    .sort((a, b) => a.number - b.number);
    
  const downClues = currentVariant.placedWords
    .filter((w) => w.direction === 'down')
    .sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col gap-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-800">A4 Önizleme</h3>
        <PdfExporter state={state} />
      </div>

      {currentVariant.unplacedWords.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 text-sm shadow-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Bazı kelimeler sığmadı:</p>
            <p className="text-amber-700/80 mt-0.5">
              {currentVariant.unplacedWords.map(w => w.answer).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* A4 Paper Mockup Container */}
      <div className="w-full overflow-auto bg-slate-100 p-4 rounded-xl flex justify-center">
        <div 
          className="bg-white shadow-xl flex flex-col p-8 sm:p-12 relative overflow-hidden"
          style={{ 
            width: '210mm', 
            height: '297mm',
            transformOrigin: 'top center',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">
              {state.title || 'Bulmaca'}
            </h1>
            <div className="w-24 h-1 bg-slate-800 mx-auto mt-4"></div>
          </div>

          {/* Grid Area */}
          <div className="flex justify-center mb-6 w-full max-w-[115mm] mx-auto">
            <div 
              className="grid relative w-full bg-slate-300 p-[1px] rounded-lg overflow-hidden shadow-sm"
              style={{ 
                gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))`,
                gap: '1px'
              }}
            >
              {state.hasPhoto && (
                <div 
                  className="bg-slate-50 flex items-center justify-center overflow-hidden"
                  style={{
                    gridRowStart: holeMinRow + 1,
                    gridColumnStart: holeMinCol + 1,
                    gridRowEnd: `span ${holeH}`,
                    gridColumnEnd: `span ${holeW}`,
                  }}
                >
                  {state.photo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={state.photo.url} 
                      alt="Crossword Photo" 
                      className="w-full h-full object-cover shadow-sm"
                    />
                  ) : null}
                </div>
              )}

              {grid.map((row, rowIndex) => (
                row.map((cell, colIndex) => {
                  if (isInHole(rowIndex, colIndex)) return null;

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      style={{
                        gridRowStart: rowIndex + 1,
                        gridColumnStart: colIndex + 1,
                      }}
                      className={cn(
                        "relative flex items-center justify-center w-full aspect-square transition-all box-border",
                        cell.isBlack
                          ? "bg-slate-50"
                          : "bg-white"
                      )}
                    >
                      {!cell.isBlack && cell.number && (
                        <span 
                          className={cn(
                            "absolute top-0.5 left-1 text-[8px] sm:text-[10px] leading-none font-bold",
                            // Color logic: blue for across, red for down, purple for both
                            cell.numberDirections?.includes('across') && cell.numberDirections?.includes('down') ? "text-purple-600" :
                            cell.numberDirections?.includes('across') ? "text-blue-600" :
                            cell.numberDirections?.includes('down') ? "text-red-600" : "text-slate-500"
                          )}
                        >
                          {cell.number}
                        </span>
                      )}
                      {!cell.isBlack && cell.letter && (
                        <span className="text-sm sm:text-base md:text-lg font-bold text-slate-800 font-sans uppercase">
                          {cell.letter}
                        </span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>

          {/* Clues Area */}
          <div className="grid grid-cols-2 gap-8 text-sm md:text-base mt-auto">
            {/* Across Clues */}
            <div>
              <h4 className="font-bold text-blue-700 uppercase tracking-wider mb-4 border-b-2 border-blue-100 pb-2 flex items-center gap-2">
                Soldan Sağa
              </h4>
              <ul className="space-y-2">
                {acrossClues.map(clue => (
                  <li key={clue.id} className="flex gap-2">
                    <span className="font-bold text-blue-600 min-w-[1.5rem]">{clue.number}.</span>
                    <span className="text-slate-700 leading-snug">{clue.clue}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Down Clues */}
            <div>
              <h4 className="font-bold text-red-700 uppercase tracking-wider mb-4 border-b-2 border-red-100 pb-2 flex items-center gap-2">
                Yukarıdan Aşağı
              </h4>
              <ul className="space-y-2">
                {downClues.map(clue => (
                  <li key={clue.id} className="flex gap-2">
                    <span className="font-bold text-red-600 min-w-[1.5rem]">{clue.number}.</span>
                    <span className="text-slate-700 leading-snug">{clue.clue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
