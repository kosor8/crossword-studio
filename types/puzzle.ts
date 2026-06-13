export type Direction = 'across' | 'down';

export interface Word {
  id: string;
  answer: string;      // e.g. "ISTANBUL"
  clue: string;        // e.g. "Türkiye'nin en büyük şehri"
}

export interface PlacedWord extends Word {
  row: number;
  col: number;
  direction: Direction;
  number: number;      // e.g. 1 (for 1 Across, 1 Down)
}

export interface GridCell {
  letter: string | null;
  isBlack: boolean;
  number?: number;
  numberDirections?: Direction[]; // Indicates which directions start at this numbered cell
}

export type Grid = GridCell[][];

export interface PuzzleVariant {
  id: string;
  grid: Grid;
  placedWords: PlacedWord[];
  unplacedWords: Word[];   // Words that didn't fit
  score: number;           // Quality of placement
  trimOffset?: { minR: number; minC: number };
}

export interface Puzzle {
  id?: string;
  title: string;
  words: Word[];
  gridSize: number;
  variants: PuzzleVariant[];
  activeVariantIndex: number;
  photo?: {
    url: string;
    orientation: 'horizontal' | 'vertical';
  };
  createdAt?: string;
  updatedAt?: string;
}
