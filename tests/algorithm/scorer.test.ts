import { describe, it, expect } from 'vitest';
import { calculateScore } from '../../lib/algorithm/scorer';
import { PlacedWord, Grid, GridCell } from '../../types/puzzle';

function createMockGrid(size: number): Grid {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      letter: null,
      isBlack: true,
    } as GridCell))
  );
}

describe('Skor hesaplama (Scorer)', () => {
  it('tüm kelimeler yerleşince yüksek skor verir (placementRatio = 1)', () => {
    const grid = createMockGrid(10);
    const placed: PlacedWord[] = [
      { id: '1', answer: 'ONE', clue: '', row: 0, col: 0, direction: 'across', number: 1 },
    ];
    const unplaced: any[] = [];
    
    const score = calculateScore(placed, unplaced, grid);
    
    // placementRatio = 1 (60 points) + intersections = 0 + compactness > 0
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it('daha fazla kesişim daha yüksek skor verir', () => {
    const grid1 = createMockGrid(10);
    // Grid 1: No intersections
    const placed1: PlacedWord[] = [
      { id: '1', answer: 'A', clue: '', row: 0, col: 0, direction: 'across', number: 1 },
      { id: '2', answer: 'B', clue: '', row: 2, col: 2, direction: 'across', number: 2 },
    ];
    
    const score1 = calculateScore(placed1, [], grid1);
    
    const grid2 = createMockGrid(10);
    // Make them intersect (faking grid for intersection logic)
    grid2[0][0] = { letter: 'A', isBlack: false };
    const placed2: PlacedWord[] = [
      { id: '1', answer: 'A', clue: '', row: 0, col: 0, direction: 'across', number: 1 },
      { id: '2', answer: 'A', clue: '', row: 0, col: 0, direction: 'down', number: 1 }, // overlaps at 0,0
    ];
    const score2 = calculateScore(placed2, [], grid2);
    
    expect(score2).toBeGreaterThan(score1);
  });
});
