import { PlacedWord, Word, Grid } from '../../types/puzzle';

/**
 * Calculates a score for a puzzle variant based on several factors:
 * 1. Placement ratio: % of words placed (High weight: 60%)
 * 2. Intersections: Number of intersections between words (Medium weight: 25%)
 * 3. Compactness: How tightly the words are packed (Low weight: 15%)
 */
export function calculateScore(
  placed: PlacedWord[],
  unplaced: Word[],
  grid: Grid
): number {
  const totalWords = placed.length + unplaced.length;
  if (totalWords === 0) return 0;

  // 1. Placement count (dominant factor)
  // Multiplying by 10000 ensures that placing more words always outweighs other metrics
  const placementScore = placed.length * 10000;

  // 2. Intersections (secondary tie-breaker)
  const intersections = countIntersections(placed, grid);
  const intersectionScore = intersections * 10;

  // 3. Compactness (tertiary tie-breaker)
  const compactness = calculateCompactness(placed, grid.length);
  const compactnessScore = compactness * 100; // compactness is between 0 and 1

  return placementScore + intersectionScore + compactnessScore;
}

/**
 * Count the total number of intersections in the grid.
 * An intersection is defined as a cell shared by an 'across' and a 'down' word.
 */
function countIntersections(placed: PlacedWord[], grid: Grid): number {
  if (placed.length < 2) return 0;

  let count = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col];
      if (cell.letter && !cell.isBlack) {
        // A simple way to check if it's an intersection is to see if both horizontal and vertical neighbors
        // (or within words) exist. Actually, we can count how many words occupy this cell.
        // If 2 words occupy this cell, it's an intersection.
        let wordCount = 0;
        
        // Let's iterate through placed words to see if they cover this cell.
        for (const word of placed) {
          if (word.direction === 'across') {
            if (row === word.row && col >= word.col && col < word.col + word.answer.length) {
              wordCount++;
            }
          } else {
            if (col === word.col && row >= word.row && row < word.row + word.answer.length) {
              wordCount++;
            }
          }
        }
        
        if (wordCount > 1) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Calculates compactness based on the bounding box of placed words.
 * Smaller bounding box compared to the grid size yields a higher compactness score.
 */
function calculateCompactness(placed: PlacedWord[], gridSize: number): number {
  if (placed.length === 0) return 0;

  let minRow = gridSize;
  let maxRow = -1;
  let minCol = gridSize;
  let maxCol = -1;

  for (const word of placed) {
    minRow = Math.min(minRow, word.row);
    minCol = Math.min(minCol, word.col);
    
    if (word.direction === 'across') {
      maxRow = Math.max(maxRow, word.row);
      maxCol = Math.max(maxCol, word.col + word.answer.length - 1);
    } else {
      maxRow = Math.max(maxRow, word.row + word.answer.length - 1);
      maxCol = Math.max(maxCol, word.col);
    }
  }

  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;
  const boundingBoxArea = width * height;
  const gridArea = gridSize * gridSize;

  // A completely compact puzzle has words forming a solid block (rare).
  // This ratio gives higher values for smaller bounding boxes.
  // Using 1 - (boundingBoxArea / gridArea)
  const ratio = 1 - (boundingBoxArea / gridArea);
  
  return Math.max(0, ratio);
}
