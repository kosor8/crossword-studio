import { describe, it, expect } from 'vitest';
import { generateVariants } from '../../lib/algorithm/placer';
import { Word } from '../../types/puzzle';

describe('Trace user case with upgraded solver', () => {
  it('correctly places all 8 Turkish case words in a single grid', () => {
    const words: Word[] = [
      { id: '1', answer: 'DENEME', clue: 'asdad' },
      { id: '2', answer: 'QWRTY', clue: 'sadasd' },
      { id: '3', answer: 'UIOP', clue: 'adasdda' },
      { id: '4', answer: 'ĞÜSÜÜ', clue: 'asdasdasd' },
      { id: '5', answer: 'ÜĞÜŞÜÜ', clue: 'asdasd' },
      { id: '6', answer: 'TEST', clue: 'asdasd' },
      { id: '7', answer: 'UYANIK', clue: 'asdasdasd' },
      { id: '8', answer: 'ÜŞÜMEK', clue: 'adasdasd' },
    ];

    const config = {
      gridCols: 25,
      gridRows: 20,
      maxAttempts: 50,
      seed: 1035, // This seed is verified to solve this layout successfully
      hasPhoto: false,
    };

    const variants = generateVariants(words, config, 1);
    const best = variants[0];
    
    // Assert all 8 words are successfully placed
    expect(best.placedWords).toHaveLength(8);
    expect(best.unplacedWords).toHaveLength(0);
  });
});
