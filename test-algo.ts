import { generateVariants } from './lib/algorithm/placer';
import { Word } from './types/puzzle';

const words: Word[] = [
  { id: '1', answer: 'ISTANBUL', clue: 'Metropol' },
  { id: '2', answer: 'ANKARA', clue: 'Başkent' },
  { id: '3', answer: 'IZMIR', clue: 'Ege' },
  { id: '4', answer: 'ANTALYA', clue: 'Turizm' },
  { id: '5', answer: 'BURSA', clue: 'Yeşil' },
  { id: '6', answer: 'ADANA', clue: 'Kebap' }
];

console.log("Bulmaca oluşturuluyor...\n");

const variants = generateVariants(words, { gridCols: 21, gridRows: 29, maxAttempts: 10, seed: 123, hasPhoto: false }, 1);
const bestVariant = variants[0];

console.log(`Puan: ${bestVariant.score.toFixed(2)}`);
console.log(`Yerleştirilen Kelime Sayısı: ${bestVariant.placedWords.length} / ${words.length}`);
if (bestVariant.unplacedWords.length > 0) {
  console.log(`Sığmayan Kelimeler: ${bestVariant.unplacedWords.map(w => w.answer).join(', ')}`);
}

console.log("\n--- GRID ---");

// Grid'i konsolda yazdır
for (let row = 0; row < bestVariant.grid.length; row++) {
  let rowStr = "";
  for (let col = 0; col < bestVariant.grid[row].length; col++) {
    const cell = bestVariant.grid[row][col];
    if (cell.isBlack) {
      rowStr += " ⬛ ";
    } else {
      rowStr += ` ${cell.letter}  `;
    }
  }
  console.log(rowStr);
}

console.log("\nKelimeler:");
bestVariant.placedWords.forEach(w => {
  console.log(`- ${w.answer} (${w.direction === 'across' ? 'Yatay' : 'Dikey'}, Satır: ${w.row}, Sütun: ${w.col})`);
});
