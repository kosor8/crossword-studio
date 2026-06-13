'use client';

import { useState } from 'react';
import { PuzzleProvider, usePuzzle } from '@/hooks/usePuzzle';
import { WordInput } from '@/components/puzzle/WordInput';
import { GridRenderer } from '@/components/puzzle/GridRenderer';
import { VariantSwitcher } from '@/components/puzzle/VariantSwitcher';
import { generateVariants } from '@/lib/algorithm/placer';
import { Play, Loader2 } from 'lucide-react';
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
          gridSize: state.gridSize,
          maxAttempts: 50,
          seed: Date.now(),
          photoOrientation: state.photo?.orientation,
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
