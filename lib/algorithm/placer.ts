import { Word, PlacedWord, Grid, PuzzleVariant, GridCell, Direction } from '../../types/puzzle';
import { calculateScore } from './scorer';

export interface PlacerConfig {
  gridCols: number;
  gridRows: number;
  maxAttempts: number;
  seed?: number;
  hasPhoto: boolean;
  photoOrientation?: 'horizontal' | 'vertical';
}

interface PlacedPosition {
  row: number;
  col: number;
  direction: Direction;
}

export function calculateHole(config: PlacerConfig) {
  if (!config.hasPhoto) return null;
  // Rectangular hole, e.g. 8x6 or 6x8 depending on orientation
  const baseW = config.photoOrientation === 'vertical' ? 6 : 8;
  const baseH = config.photoOrientation === 'vertical' ? 8 : 6;
  
  const holeMinRow = Math.floor((config.gridRows - baseH) / 2);
  const holeMaxRow = holeMinRow + baseH - 1;
  const holeMinCol = Math.floor((config.gridCols - baseW) / 2);
  const holeMaxCol = holeMinCol + baseW - 1;

  return { holeMinRow, holeMaxRow, holeMinCol, holeMaxCol, holeW: baseW, holeH: baseH };
}

/**
 * Pseudo-random number generator used for varying word placements
 */
function random(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Creates an empty grid of the given size.
 */
function createEmptyGrid(cols: number, rows: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      letter: null,
      isBlack: true,
    }))
  );
}

/**
 * Generates multiple puzzle variants and returns them sorted by score.
 */
export function generateVariants(
  words: Word[],
  config: PlacerConfig,
  variantCount: number = 3
): PuzzleVariant[] {
  const variants: PuzzleVariant[] = [];

  for (let i = 0; i < variantCount; i++) {
    const result = attemptPlacement(words, {
      ...config,
      seed: (config.seed ?? Date.now()) + i * 1000,
    });
    variants.push(result);
  }

  return variants.sort((a, b) => b.score - a.score);
}

function attemptPlacement(words: Word[], config: PlacerConfig): PuzzleVariant {
  const grid = createEmptyGrid(config.gridCols, config.gridRows);
  
  // Create a copy of words and sort them descending by length as a heuristic
  let sorted = [...words].sort((a, b) => b.answer.length - a.answer.length);
  
  // We can shuffle slightly to introduce variance based on seed
  const currentSeed = config.seed ?? 1;
  if (currentSeed % 2 === 0) {
    // slight randomization for same lengths to create variants
    sorted = sorted.sort((a, b) => {
      if (a.answer.length === b.answer.length) {
        return random(currentSeed + a.answer.length) > 0.5 ? 1 : -1;
      }
      return b.answer.length - a.answer.length;
    });
  }

  const placed: PlacedWord[] = [];
  const unplaced: Word[] = [];

  for (const word of sorted) {
    if (word.answer.length > Math.max(config.gridCols, config.gridRows)) {
      unplaced.push(word);
      continue;
    }

    const position = findBestPosition(grid, word, config);
    if (position) {
      const placedWord: PlacedWord = { ...word, ...position, number: 0 };
      placeWord(grid, placedWord);
      placed.push(placedWord);
    } else {
      unplaced.push(word);
    }
  }

  const finalizedGrid = finalizeGrid(grid, placed);
  const numberedPlaced = numberWords(placed, finalizedGrid);

  return {
    id: crypto.randomUUID(),
    grid: finalizedGrid,
    placedWords: numberedPlaced,
    unplacedWords: unplaced,
    score: calculateScore(numberedPlaced, unplaced, finalizedGrid),
    trimOffset: { minR: 0, minC: 0 },
  };
}

function findBestPosition(
  grid: Grid,
  word: Word,
  config: PlacerConfig
): PlacedPosition | null {
  const candidates: Array<PlacedPosition & { priority: number }> = [];
  const letters = word.answer.toUpperCase().split('');
  let isGridEmpty = true;

  // Search existing letters for intersections
  for (let row = 0; row < config.gridRows; row++) {
    for (let col = 0; col < config.gridCols; col++) {
      const cell = grid[row][col];
      if (!cell.letter) continue;
      isGridEmpty = false;

      // Find all matching letters in the word
      for (let i = 0; i < letters.length; i++) {
        if (letters[i] === cell.letter) {
          // Try Horizontal
          if (canPlace(grid, word, row, col - i, 'across', config)) {
            candidates.push({ row, col: col - i, direction: 'across', priority: 1 });
          }
          // Try Vertical
          if (canPlace(grid, word, row - i, col, 'down', config)) {
            candidates.push({ row: row - i, col, direction: 'down', priority: 1 });
          }
        }
      }
    }
  }

  if (isGridEmpty) {
    const centerCol = Math.floor(config.gridCols / 2);
    const centerRow = Math.floor(config.gridRows / 2);
    
    if (config.photoOrientation) {
      // Place first word near the top edge, centered horizontally
      return {
        row: 1,
        col: Math.max(1, centerCol - Math.floor(word.answer.length / 2)),
        direction: 'across',
      };
    }
    
    return {
      row: centerRow,
      col: centerCol - Math.floor(word.answer.length / 2),
      direction: 'across',
    };
  }

  // Pick the best candidate (can be expanded to prioritize multiple intersections)
  if (candidates.length > 0) {
    // Shuffle candidates of same priority using seed if desired, 
    // but taking the first one is often fine for backtracking.
    // We sort descending by priority.
    candidates.sort((a, b) => b.priority - a.priority);
    // Pick randomly among top candidates if needed, but for simplicity:
    return candidates[0];
  }

  return null;
}

function canPlace(
  grid: Grid,
  word: Word,
  startRow: number,
  startCol: number,
  direction: Direction,
  config: PlacerConfig
): boolean {
  const length = word.answer.length;
  const letters = word.answer.toUpperCase().split('');

  // Bounds check
  if (direction === 'across') {
    if (startCol < 0 || startCol + length > config.gridCols) return false;
    if (startRow < 0 || startRow >= config.gridRows) return false;
  } else {
    if (startRow < 0 || startRow + length > config.gridRows) return false;
    if (startCol < 0 || startCol >= config.gridCols) return false;
  }

  // Calculate exclusion zone if photo is present
  const hole = calculateHole(config);

  for (let i = 0; i < length; i++) {
    const r = direction === 'across' ? startRow : startRow + i;
    const c = direction === 'across' ? startCol + i : startCol;
    
    // Check if within hole
    if (hole) {
      if (r >= hole.holeMinRow && r <= hole.holeMaxRow && c >= hole.holeMinCol && c <= hole.holeMaxCol) {
        return false;
      }
    }

    const cell = grid[r][c];

    // Conflict check
    if (cell.letter && cell.letter !== letters[i]) {
      return false;
    }

    // Adjacent checks: Words shouldn't run parallel touching each other
    if (!cell.letter) {
      if (direction === 'across') {
        // Check top and bottom for this new letter
        if (r > 0 && grid[r - 1][c].letter) return false;
        if (r < config.gridRows - 1 && grid[r + 1][c].letter) return false;
      } else {
        // Check left and right for this new letter
        if (c > 0 && grid[r][c - 1].letter) return false;
        if (c < config.gridCols - 1 && grid[r][c + 1].letter) return false;
      }
    }
  }

  // Bounds check for the word as a whole (no immediately adjacent letters before or after)
  if (direction === 'across') {
    if (startCol > 0 && grid[startRow][startCol - 1].letter) return false;
    if (startCol + length < config.gridCols && grid[startRow][startCol + length].letter) return false;
  } else {
    if (startRow > 0 && grid[startRow - 1][startCol].letter) return false;
    if (startRow + length < config.gridRows && grid[startRow + length][startCol].letter) return false;
  }

  return true;
}

function placeWord(grid: Grid, placedWord: PlacedWord) {
  const letters = placedWord.answer.toUpperCase().split('');
  for (let i = 0; i < letters.length; i++) {
    const r = placedWord.direction === 'across' ? placedWord.row : placedWord.row + i;
    const c = placedWord.direction === 'across' ? placedWord.col + i : placedWord.col;
    grid[r][c].letter = letters[i];
    grid[r][c].isBlack = false;
  }
}

function finalizeGrid(grid: Grid, placed: PlacedWord[]): Grid {
  // We can trim or apply numbers here, but we return a deep copy
  return grid.map(row => row.map(cell => ({ ...cell })));
}

function numberWords(placed: PlacedWord[], grid: Grid): PlacedWord[] {
  let counter = 1;
  const numberedPlaced = [...placed];
  
  // Sort positions top-to-bottom, left-to-right
  const positions = [...numberedPlaced].sort((a, b) => {
    if (a.row === b.row) return a.col - b.col;
    return a.row - b.row;
  });

  const assignedNumbers = new Map<string, number>();

  for (const word of positions) {
    const key = `${word.row},${word.col}`;
    if (assignedNumbers.has(key)) {
      word.number = assignedNumbers.get(key)!;
      const cell = grid[word.row][word.col];
      if (cell.numberDirections && !cell.numberDirections.includes(word.direction)) {
        cell.numberDirections.push(word.direction);
      }
    } else {
      word.number = counter;
      assignedNumbers.set(key, counter);
      grid[word.row][word.col].number = counter;
      grid[word.row][word.col].numberDirections = [word.direction];
      counter++;
    }
  }

  return positions;
}
