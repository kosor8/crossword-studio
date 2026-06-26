'use client';

import { useState } from 'react';
import { PuzzleProvider, usePuzzle } from '@/hooks/usePuzzle';
import { WordInput } from '@/components/puzzle/WordInput';
import { GridRenderer } from '@/components/puzzle/GridRenderer';
import { VariantSwitcher } from '@/components/puzzle/VariantSwitcher';
import { PhotoUpload } from '@/components/puzzle/PhotoUpload';
import { generateVariants } from '@/lib/algorithm/placer';
import { Play, Loader2, Image as ImageIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function StudioContent() {
  const { state, dispatch } = usePuzzle();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    // Only valid words (min 2 letters)
    const validWords = state.words.filter(w => w.answer.trim().length >= 2);
    
    if (validWords.length < 2) {
      alert("Bulmaca oluşturmak için en az 2 geçerli kelime girmelisiniz.");
      return;
    }

    setIsGenerating(true);
    
    // Asynchronous wrapper to prevent blocking UI if algorithm takes long
    setTimeout(() => {
      try {
        const variants = generateVariants(validWords, {
          gridCols: 21,
          gridRows: 29,
          maxAttempts: 50,
          seed: Date.now(),
          hasPhoto: state.hasPhoto,
          photoOrientation: state.photo?.orientation || 'horizontal',
        }, 3);
        
        dispatch({ type: 'SET_VARIANTS', variants });
      } catch (error) {
        console.error("Error generating variants:", error);
        alert("Bulmaca oluşturulurken bir hata oluştu.");
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500/30">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center font-bold text-lg leading-none shadow-sm">
              C
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Crossword Studio
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <WordInput />

            {/* Fotoğraf Alanı Toggle */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg flex items-center justify-center",
                  state.hasPhoto ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"
                )}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Fotoğraf Alanı</h3>
                  <p className="text-sm text-slate-500">Bulmacanın ortasında fotoğraf için yer aç</p>
                </div>
              </div>
              
              <button
                onClick={() => dispatch({ type: 'TOGGLE_PHOTO' })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500",
                  state.hasPhoto ? "bg-brand-600" : "bg-slate-200"
                )}
                role="switch"
                aria-checked={state.hasPhoto}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    state.hasPhoto ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {state.hasPhoto && (
              <PhotoUpload />
            )}
          </div>

          {/* Right Column: Preview & Generation */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Bulmaca Oluştur</h2>
                <p className="text-sm text-slate-500 mt-1">Kelimeleriniz hazır olduğunda bulmacayı oluşturun.</p>
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={isGenerating || state.words.filter(w => w.answer.trim().length >= 2).length < 2}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:pointer-events-none",
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Üretiliyor...</span>
                  </>
                ) : (
                  <>
                    <Play size={20} className="fill-white" />
                    <span>Bulmaca Üret</span>
                  </>
                )}
              </button>
            </div>

            {state.variants && state.variants.length > 0 && (
              <VariantSwitcher />
            )}

            <GridRenderer />
            
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <PuzzleProvider>
      <StudioContent />
    </PuzzleProvider>
  );
}
