'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Word, PuzzleVariant, Puzzle } from '@/types/puzzle';

type PuzzleState = Puzzle;

type PuzzleAction =
  | { type: 'ADD_WORD' }
  | { type: 'UPDATE_WORD'; id: string; field: 'answer' | 'clue'; value: string }
  | { type: 'REMOVE_WORD'; id: string }
  | { type: 'SET_VARIANTS'; variants: PuzzleVariant[] }
  | { type: 'SET_ACTIVE_VARIANT'; index: number }
  | { type: 'SET_PHOTO'; photo: Puzzle['photo'] }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'LOAD_STATE'; state: PuzzleState };

const initialState: PuzzleState = {
  title: 'Yeni Bulmaca',
  words: [
    { id: '1', answer: '', clue: '' },
    { id: '2', answer: '', clue: '' },
  ],
  gridSize: 15,
  variants: [],
  activeVariantIndex: 0,
};

function puzzleReducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  switch (action.type) {
    case 'ADD_WORD':
      return {
        ...state,
        words: [...state.words, { id: crypto.randomUUID(), answer: '', clue: '' }],
      };
    case 'UPDATE_WORD':
      return {
        ...state,
        words: state.words.map((word) =>
          word.id === action.id ? { ...word, [action.field]: action.value } : word
        ),
      };
    case 'REMOVE_WORD':
      return {
        ...state,
        words: state.words.filter((word) => word.id !== action.id),
      };
    case 'SET_VARIANTS':
      return {
        ...state,
        variants: action.variants,
        activeVariantIndex: 0,
      };
    case 'SET_ACTIVE_VARIANT':
      return {
        ...state,
        activeVariantIndex: action.index,
      };
    case 'SET_PHOTO':
      return {
        ...state,
        photo: action.photo,
      };
    case 'SET_TITLE':
      return {
        ...state,
        title: action.title,
      };
    case 'LOAD_STATE':
      return action.state;
    default:
      return state;
  }
}

const PuzzleContext = createContext<{
  state: PuzzleState;
  dispatch: React.Dispatch<PuzzleAction>;
} | null>(null);

export function PuzzleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(puzzleReducer, initialState);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('crossword_draft_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', state: parsed });
      } catch (e) {
        console.error('Failed to load puzzle draft', e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('crossword_draft_state', JSON.stringify(state));
  }, [state]);

  return (
    <PuzzleContext.Provider value={{ state, dispatch }}>
      {children}
    </PuzzleContext.Provider>
  );
}

export function usePuzzle() {
  const context = useContext(PuzzleContext);
  if (!context) {
    throw new Error('usePuzzle must be used within a PuzzleProvider');
  }
  return context;
}
