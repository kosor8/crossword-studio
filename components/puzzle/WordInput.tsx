'use client';

import { usePuzzle } from '@/hooks/usePuzzle';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function WordInput() {
  const { state, dispatch } = usePuzzle();

  const handleAddWord = () => {
    dispatch({ type: 'ADD_WORD' });
  };

  const handleRemoveWord = (id: string) => {
    dispatch({ type: 'REMOVE_WORD', id });
  };

  const handleChange = (id: string, field: 'answer' | 'clue', value: string) => {
    // Sadece büyük harf ve rakamlara izin ver (Türkçe karakterler dahil)
    const sanitizedValue = field === 'answer' 
      ? value.toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞIİÖŞÜ0-9]/g, '') 
      : value;
    
    dispatch({ type: 'UPDATE_WORD', id, field, value: sanitizedValue });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6 pb-6 border-b border-slate-100">
        <label htmlFor="puzzle-title" className="block text-sm font-medium text-slate-700 mb-2">Bulmaca Başlığı</label>
        <input
          id="puzzle-title"
          type="text"
          value={state.title}
          onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
          className="w-full text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          placeholder="Örn: Hafta Sonu Bulmacası"
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Kelimeler</h2>
          <p className="text-sm text-slate-500 mt-1">Bulmacanızda yer alacak kelimeleri ve ipuçlarını girin.</p>
        </div>
        <div className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
          {state.words.length} Kelime
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <AnimatePresence>
          {state.words.map((word, index) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 group"
            >
              <div className="flex items-center h-10 px-1 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500">
                <GripVertical size={16} />
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <input
                    type="text"
                    placeholder="CEVAP"
                    value={word.answer}
                    onChange={(e) => handleChange(word.id, 'answer', e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 uppercase transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="İpucu veya soru"
                    value={word.clue}
                    onChange={(e) => handleChange(word.id, 'clue', e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={() => handleRemoveWord(word.id)}
                disabled={state.words.length <= 2}
                className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                aria-label="Kelimeyi sil"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={handleAddWord}
        className="w-full h-12 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all font-medium"
      >
        <Plus size={20} />
        <span>Yeni Kelime Ekle</span>
      </button>
    </div>
  );
}
