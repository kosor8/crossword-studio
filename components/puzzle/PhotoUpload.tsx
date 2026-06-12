'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { usePuzzle } from '@/hooks/usePuzzle';
import { ImagePlus, X, Columns, Rows } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function PhotoUpload() {
  const { state, dispatch } = usePuzzle();
  const photo = state.photo;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const url = URL.createObjectURL(file);
      dispatch({
        type: 'SET_PHOTO',
        photo: {
          url,
          orientation: 'horizontal',
        },
      });
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
  });

  const handleRemove = () => {
    if (photo?.url) {
      URL.revokeObjectURL(photo.url);
    }
    dispatch({ type: 'SET_PHOTO', photo: undefined });
  };

  const setOrientation = (orientation: 'horizontal' | 'vertical') => {
    if (photo) {
      dispatch({
        type: 'SET_PHOTO',
        photo: { ...photo, orientation },
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Fotoğraf Ekle</h2>
          <p className="text-sm text-slate-500 mt-1">Bulmacanıza kişisel bir fotoğraf ekleyin.</p>
        </div>
      </div>

      {!photo ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
            isDragActive 
              ? "border-brand-500 bg-brand-50" 
              : "border-slate-200 hover:border-brand-400 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <ImagePlus size={24} />
          </div>
          <p className="text-slate-700 font-medium mb-1">
            {isDragActive ? "Buraya bırakın..." : "Fotoğraf yüklemek için tıklayın veya sürükleyin"}
          </p>
          <p className="text-slate-400 text-xs">PNG, JPG, WEBP (Maks. 5MB)</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative group rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={photo.url} 
              alt="Yüklenen fotoğraf" 
              className={cn(
                "object-cover transition-all",
                photo.orientation === 'horizontal' ? "w-full h-full" : "h-full aspect-[3/4]"
              )} 
            />
            
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Fotoğrafı sil"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOrientation('horizontal')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                photo.orientation === 'horizontal' 
                  ? "bg-brand-50 border-brand-200 text-brand-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Rows size={16} />
              <span>Yatay</span>
            </button>
            <button
              onClick={() => setOrientation('vertical')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                photo.orientation === 'vertical' 
                  ? "bg-brand-50 border-brand-200 text-brand-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Columns size={16} />
              <span>Dikey</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
