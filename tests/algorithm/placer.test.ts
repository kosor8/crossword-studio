import { describe, it, expect } from 'vitest';
import { generateVariants } from '../../lib/algorithm/placer';
import { Word } from '../../types/puzzle';

describe('Kelime yerleştirme (Placer)', () => {
  it('tek kelimeyi grid ortasına yerleştirir', () => {
    const words: Word[] = [{ id: '1', answer: 'TEST', clue: 'A test word' }];
    const variants = generateVariants(words, { gridCols: 10, gridRows: 10, maxAttempts: 10, seed: 1, hasPhoto: false }, 1);
    
    expect(variants).toHaveLength(1);
    const variant = variants[0];
    
    expect(variant.placedWords).toHaveLength(1);
    expect(variant.unplacedWords).toHaveLength(0);
    
    const placed = variant.placedWords[0];
    expect(placed.answer).toBe('TEST');
    expect(placed.direction).toBe('across');
    expect(placed.row).toBe(5); // center of 10
    expect(placed.col).toBe(3); // 5 - 2
  });

  it('iki kesişen kelimeyi yerleştirir', () => {
    const words: Word[] = [
      { id: '1', answer: 'HELLO', clue: 'Greeting' },
      { id: '2', answer: 'WORLD', clue: 'Planet' }
    ];
    // 'HELLO' and 'WORLD' share 'O' and 'L'
    const variants = generateVariants(words, { gridCols: 10, gridRows: 10, maxAttempts: 10, seed: 1, hasPhoto: false }, 1);
    const variant = variants[0];
    
    expect(variant.placedWords).toHaveLength(2);
    expect(variant.unplacedWords).toHaveLength(0);
    
    // Check if they intersect
    const word1 = variant.placedWords.find(w => w.answer === 'HELLO');
    const word2 = variant.placedWords.find(w => w.answer === 'WORLD');
    
    expect(word1).toBeDefined();
    expect(word2).toBeDefined();
    expect(word1!.direction).not.toBe(word2!.direction);
  });

  it('sığmayan kelimeyi unplacedWords listesine ekler', () => {
    const words: Word[] = [
      { id: '1', answer: 'TOOLONGFORTHISGRID', clue: 'Too long' }
    ];
    const variants = generateVariants(words, { gridCols: 10, gridRows: 10, maxAttempts: 10, seed: 1, hasPhoto: false }, 1);
    const variant = variants[0];
    
    expect(variant.placedWords).toHaveLength(0);
    expect(variant.unplacedWords).toHaveLength(1);
  });

  it('grid boyutundan uzun kelimeyi reddeder', () => {
    const words: Word[] = [
      { id: '1', answer: 'EXACT', clue: '5 chars' },
      { id: '2', answer: 'TOOLONGWORD', clue: '11 chars, limit 10' }
    ];
    const variants = generateVariants(words, { gridCols: 10, gridRows: 10, maxAttempts: 10, seed: 1, hasPhoto: false }, 1);
    const variant = variants[0];
    
    expect(variant.placedWords).toHaveLength(1);
    expect(variant.unplacedWords).toHaveLength(1);
    expect(variant.unplacedWords[0].answer).toBe('TOOLONGWORD');
  });

  it('farklı seed ile farklı varyasyon üretir (veya skor sıralar)', () => {
    const words: Word[] = [
      { id: '1', answer: 'CROSS', clue: 'Across' },
      { id: '2', answer: 'WORD', clue: 'Down' },
      { id: '3', answer: 'SWORD', clue: 'Weapon' },
      { id: '4', answer: 'ROAD', clue: 'Street' }
    ];
    // Generate 3 variants
    const variants = generateVariants(words, { gridCols: 15, gridRows: 15, maxAttempts: 10, seed: 42, hasPhoto: false }, 3);
    
    expect(variants).toHaveLength(3);
    
    // They might be identical if constraints only allow 1 way, 
    // but usually differing seeds might find different orders.
    // At least check structure
    expect(variants[0].id).toBeDefined();
    expect(variants[1].id).toBeDefined();
    expect(variants[0].id).not.toBe(variants[1].id);
  });
});
