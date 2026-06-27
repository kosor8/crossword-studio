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
  // Rectangular hole, e.g. 10x8 or 8x10 depending on orientation
  const baseW = config.photoOrientation === 'vertical' ? 8 : 10;
  const baseH = config.photoOrientation === 'vertical' ? 10 : 8;
  
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
      directions: [],
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
  const baseSeed = config.seed ?? Date.now();

  // Try to generate at least variantCount variants
  for (let i = 0; i < variantCount; i++) {
    const result = attemptPlacement(words, {
      ...config,
      seed: baseSeed + i * 1000,
    });
    variants.push(result);
  }

  // If the best variant has unplaced words, try more seeds to find a 100% placed solution
  variants.sort((a, b) => b.score - a.score);
  let bestVariant = variants[0];
  const maxAttempts = 15; // Limit to 15 attempts to keep generation time low (completes in <30ms)

  if (bestVariant.unplacedWords.length > 0) {
    for (let i = variantCount; i < maxAttempts; i++) {
      const result = attemptPlacement(words, {
        ...config,
        seed: baseSeed + i * 1000,
      });
      variants.push(result);
      
      // Sort and update the best variant
      variants.sort((a, b) => b.score - a.score);
      bestVariant = variants[0];
      
      // If we found a solution with no unplaced words, stop searching
      if (bestVariant.unplacedWords.length === 0) {
        break;
      }
    }
  }

  return variants;
}

function attemptPlacement(words: Word[], config: PlacerConfig): PuzzleVariant {
  const grid = createEmptyGrid(config.gridCols, config.gridRows);
  
  // Sort descending by length first, but shuffle items of the same length using the seed
  const currentSeed = config.seed ?? 1;
  const sorted = [...words].sort((a, b) => {
    if (a.answer.length === b.answer.length) {
      return random(currentSeed + a.answer.charCodeAt(0)) > 0.5 ? 1 : -1;
    }
    return b.answer.length - a.answer.length;
  });

  const { placed, unplaced } = solve(sorted, grid, config);

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

function removeWord(grid: Grid, placedWord: PlacedWord) {
  const letters = placedWord.answer.toUpperCase().split('');
  for (let i = 0; i < letters.length; i++) {
    const r = placedWord.direction === 'across' ? placedWord.row : placedWord.row + i;
    const c = placedWord.direction === 'across' ? placedWord.col + i : placedWord.col;
    if (grid[r][c].directions) {
      grid[r][c].directions = grid[r][c].directions!.filter(d => d !== placedWord.direction);
      if (grid[r][c].directions!.length === 0) {
        grid[r][c].letter = null;
        grid[r][c].isBlack = true;
        delete grid[r][c].directions;
      }
    }
  }
}

function countIntersections(
  grid: Grid,
  word: Word,
  startRow: number,
  startCol: number,
  direction: Direction
): number {
  let count = 0;
  const length = word.answer.length;
  for (let i = 0; i < length; i++) {
    const r = direction === 'across' ? startRow : startRow + i;
    const c = direction === 'across' ? startCol + i : startCol;
    if (grid[r] && grid[r][c] && grid[r][c].letter) {
      count++;
    }
  }
  return count;
}

function solve(
  words: Word[],
  grid: Grid,
  config: PlacerConfig
): { placed: PlacedWord[]; unplaced: Word[] } {
  let bestPlaced: PlacedWord[] = [];
  let bestGridCopy: Grid = finalizeGrid(grid, []);

  let steps = 0;
  const maxSteps = 1500; // Cap steps to prevent infinite loop or browser hang
  const startTime = Date.now();
  const limitMs = 400; // Max 400ms per variant search

  function search(wordsToPlace: Word[], currentPlaced: PlacedWord[]): boolean {
    steps++;
    if (steps > maxSteps || Date.now() - startTime > limitMs) {
      return false; // timeout or step limit reached
    }

    // If current placement is better than the best found so far, save it
    if (currentPlaced.length > bestPlaced.length) {
      bestPlaced = [...currentPlaced];
      bestGridCopy = finalizeGrid(grid, currentPlaced);
      
      // If we placed all words, we can stop immediately!
      if (wordsToPlace.length === 0) {
        return true;
      }
    }

    // If all words are placed, we are done!
    if (wordsToPlace.length === 0) {
      return true;
    }

    // Choose the next word to place.
    // We want to select a word that has at least one intersection with the grid.
    // If multiple words match, we can prioritize the longest one.
    let selectedWord: Word | null = null;
    let selectedIndex = -1;

    // Find all matching letters on the grid
    const gridLetters = new Set<string>();
    for (let r = 0; r < config.gridRows; r++) {
      for (let c = 0; c < config.gridCols; c++) {
        if (grid[r][c].letter) {
          gridLetters.add(grid[r][c].letter!);
        }
      }
    }

    if (gridLetters.size === 0) {
      // Grid is empty, pick the first word (which is the longest due to sorting)
      selectedWord = wordsToPlace[0];
      selectedIndex = 0;
    } else {
      // Find a word that can intersect with the grid
      for (let i = 0; i < wordsToPlace.length; i++) {
        const w = wordsToPlace[i];
        const wLetters = w.answer.toUpperCase().split('');
        const hasIntersection = wLetters.some(l => gridLetters.has(l));
        if (hasIntersection) {
          selectedWord = w;
          selectedIndex = i;
          break; // Since wordsToPlace is sorted descending by length, this is the longest matching word!
        }
      }
    }

    // If no remaining words can intersect with the grid, we cannot place them in this connected component.
    if (!selectedWord) {
      return true; 
    }

    // Find all candidate positions for selectedWord
    const candidates: Array<PlacedPosition & { priority: number }> = [];
    const letters = selectedWord.answer.toUpperCase().split('');

    if (gridLetters.size === 0) {
      // Place first word in center
      const centerCol = Math.floor(config.gridCols / 2);
      const centerRow = Math.floor(config.gridRows / 2);

      // Try Across start
      const startColAcross = centerCol - Math.floor(selectedWord.answer.length / 2);
      let startRowAcross = centerRow;
      if (config.photoOrientation) {
        startRowAcross = 1;
      }
      if (canPlace(grid, selectedWord, startRowAcross, startColAcross, 'across', config)) {
        candidates.push({ row: startRowAcross, col: startColAcross, direction: 'across', priority: 1 });
      }

      // Try Down start
      let startRowDown = centerRow - Math.floor(selectedWord.answer.length / 2);
      let startColDown = centerCol;
      if (config.photoOrientation) {
        startRowDown = 1;
        startColDown = Math.max(1, centerCol);
      }
      if (canPlace(grid, selectedWord, startRowDown, startColDown, 'down', config)) {
        candidates.push({ row: startRowDown, col: startColDown, direction: 'down', priority: 1 });
      }
    } else {
      // Find candidate positions by scanning the grid for matching letters
      for (let r = 0; r < config.gridRows; r++) {
        for (let c = 0; c < config.gridCols; c++) {
          const cell = grid[r][c];
          if (!cell.letter) continue;

          for (let i = 0; i < letters.length; i++) {
            if (letters[i] === cell.letter) {
              // Try Horizontal
              if (canPlace(grid, selectedWord, r, c - i, 'across', config)) {
                const intersections = countIntersections(grid, selectedWord, r, c - i, 'across');
                candidates.push({ row: r, col: c - i, direction: 'across', priority: intersections });
              }
              // Try Vertical
              if (canPlace(grid, selectedWord, r - i, c, 'down', config)) {
                const intersections = countIntersections(grid, selectedWord, r - i, c, 'down');
                candidates.push({ row: r - i, col: c, direction: 'down', priority: intersections });
              }
            }
          }
        }
      }
    }

    // Sort candidates descending by priority (intersection count)
    const currentSeed = config.seed ?? 1;
    candidates.sort((a, b) => {
      if (b.priority === a.priority) {
        return random(currentSeed + a.row + a.col + steps) > 0.5 ? 1 : -1;
      }
      return b.priority - a.priority;
    });

    // Try each candidate position
    for (const cand of candidates) {
      const placedWord: PlacedWord = { ...selectedWord, ...cand, number: 0 };
      placeWord(grid, placedWord);

      const nextWords = wordsToPlace.filter((_, idx) => idx !== selectedIndex);
      const nextPlaced = [...currentPlaced, placedWord];

      if (search(nextWords, nextPlaced)) {
        return true;
      }

      // Backtrack
      removeWord(grid, placedWord);
    }

    // If we couldn't place this word at any candidate position, we try to skip it!
    const nextWordsWithoutSelected = wordsToPlace.filter((_, idx) => idx !== selectedIndex);
    if (search(nextWordsWithoutSelected, currentPlaced)) {
      return true;
    }

    return false;
  }

  search(words, []);

  // Restore the best grid state
  for (let r = 0; r < config.gridRows; r++) {
    for (let c = 0; c < config.gridCols; c++) {
      grid[r][c] = { ...bestGridCopy[r][c] };
    }
  }

  const unplaced = words.filter(w => !bestPlaced.some(p => p.id === w.id));
  return { placed: bestPlaced, unplaced };
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
    if (cell.letter) {
      if (cell.letter !== letters[i]) {
        return false;
      }
      // Two words in the same direction cannot overlap or share cells
      if (cell.directions && cell.directions.includes(direction)) {
        return false;
      }
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
    if (!grid[r][c].directions) {
      grid[r][c].directions = [];
    }
    if (!grid[r][c].directions!.includes(placedWord.direction)) {
      grid[r][c].directions!.push(placedWord.direction);
    }
  }
}

function finalizeGrid(grid: Grid, placed: PlacedWord[]): Grid {
  // We can trim or apply numbers here, but we return a deep copy
  return grid.map(row => row.map(cell => ({
    ...cell,
    directions: cell.directions ? [...cell.directions] : [],
    numberDirections: cell.numberDirections ? [...cell.numberDirections] : [],
  })));
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
