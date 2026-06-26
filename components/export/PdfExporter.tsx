'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import { PuzzleState } from '@/hooks/usePuzzle';
import { calculateHole } from '@/lib/algorithm/placer';
import { Download } from 'lucide-react';

// Use Roboto font which supports Turkish characters
if (typeof window !== 'undefined') {
  Font.register({
    family: 'NotoSans', // Keeping the name so styles don't break
    fonts: [
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    ],
  });
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'NotoSans',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  gridContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  grid: {
    flexDirection: 'column',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 24,
    height: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellBlack: {
    backgroundColor: 'transparent',
  },
  cellWhite: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#cbd5e1',
  },
  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  cellBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  cellNumber: {
    position: 'absolute',
    top: 1,
    left: 2,
    fontSize: 6,
    fontWeight: 'bold',
  },
  cellNumberBlue: {
    color: '#2563eb',
  },
  cellNumberRed: {
    color: '#dc2626',
  },
  cellNumberPurple: {
    color: '#9333ea',
  },
  cellLetter: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  photoOverlay: {
    position: 'absolute',
    zIndex: 10,
    padding: 1,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cluesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 30,
    marginTop: 'auto',
  },
  cluesColumn: {
    flex: 1,
  },
  cluesHeaderBlue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#dbeafe',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  cluesHeaderRed: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#fee2e2',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  clueItem: {
    flexDirection: 'row',
    marginBottom: 6,
    fontSize: 10,
  },
  clueNumberBlue: {
    fontWeight: 'bold',
    color: '#2563eb',
    width: 20,
  },
  clueNumberRed: {
    fontWeight: 'bold',
    color: '#dc2626',
    width: 20,
  },
  clueText: {
    flex: 1,
    color: '#334155',
    lineHeight: 1.3,
  },
});

interface CrosswordDocumentProps {
  state: PuzzleState;
  showSolution?: boolean;
}

const CrosswordDocument = ({ state, showSolution = false }: CrosswordDocumentProps) => {
  const currentVariant = state.variants[state.activeVariantIndex];
  if (!currentVariant) return null;

  const grid = currentVariant.grid;
  const N = grid.length;

  let holeMinRow = -1, holeMinCol = -1, holeW = 0, holeH = 0;
  if (state.hasPhoto) {
    const hole = calculateHole({
      gridCols: grid[0]?.length || 0,
      gridRows: grid.length,
      hasPhoto: state.hasPhoto,
      photoOrientation: state.photo?.orientation || 'horizontal',
      maxAttempts: 50
    });
    if (hole) {
      holeW = hole.holeW;
      holeH = hole.holeH;
      holeMinRow = hole.holeMinRow;
      holeMinCol = hole.holeMinCol;
    }
  }

  const holeMaxRow = holeMinRow !== -1 ? holeMinRow + holeH - 1 : -1;
  const holeMaxCol = holeMinCol !== -1 ? holeMinCol + holeW - 1 : -1;

  const isInHole = (r: number, c: number) => {
    if (!state.hasPhoto || holeMinRow === -1) return false;
    return r >= holeMinRow && r <= holeMaxRow && c >= holeMinCol && c <= holeMaxCol;
  };

  // Ayır clues into across and down
  const acrossClues = currentVariant.placedWords
    .filter((w) => w.direction === 'across')
    .sort((a, b) => a.number - b.number);
    
  const downClues = currentVariant.placedWords
    .filter((w) => w.direction === 'down')
    .sort((a, b) => a.number - b.number);

  const CELL_SIZE = Math.floor(Math.min(26, 450 / Math.max(1, grid[0]?.length || 1)));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{state.title || 'Bulmaca'}</Text>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.grid}>
            {state.hasPhoto && state.photo?.url && (
              <View 
                style={[
                  styles.photoOverlay, 
                  { 
                    top: `${(holeMinRow / N) * 100}%`,
                    left: `${(holeMinCol / grid[0].length) * 100}%`,
                    width: `${(holeW / grid[0].length) * 100}%`,
                    height: `${(holeH / N) * 100}%`,
                  }
                ]}
              >
                <Image src={state.photo.url} style={styles.photoImage} />
              </View>
            )}

            {grid.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((cell, colIndex) => {
                  const inHole = isInHole(rowIndex, colIndex);
                  const isTopBorderNeeded = rowIndex === 0 || isInHole(rowIndex - 1, colIndex);
                  const isLeftBorderNeeded = colIndex === 0 || isInHole(rowIndex, colIndex - 1);

                  const cellStyles: any[] = [
                    styles.cell,
                    { width: CELL_SIZE, height: CELL_SIZE },
                    inHole ? styles.cellBlack : styles.cellWhite,
                  ];

                  if (!inHole) {
                    if (isTopBorderNeeded) cellStyles.push(styles.cellBorderTop);
                    if (isLeftBorderNeeded) cellStyles.push(styles.cellBorderLeft);
                  }

                  let numColorStyle = {};
                  if (cell.numberDirections) {
                    if (cell.numberDirections.includes('across') && cell.numberDirections.includes('down')) {
                      numColorStyle = styles.cellNumberPurple;
                    } else if (cell.numberDirections.includes('across')) {
                      numColorStyle = styles.cellNumberBlue;
                    } else if (cell.numberDirections.includes('down')) {
                      numColorStyle = styles.cellNumberRed;
                    }
                  }

                  return (
                    <View
                      key={`${rowIndex}-${colIndex}`}
                      style={cellStyles}
                    >
                      {!inHole && cell.number && (
                        <Text style={[styles.cellNumber, numColorStyle, { fontSize: Math.max(5, CELL_SIZE * 0.25) }]}>
                          {cell.number}
                        </Text>
                      )}
                      {!inHole && showSolution && cell.letter && (
                        <Text style={[styles.cellLetter, { fontSize: CELL_SIZE * 0.5 }]}>
                          {cell.letter}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cluesSection}>
          <View style={styles.cluesColumn}>
            <Text style={styles.cluesHeaderBlue}>Soldan Sağa</Text>
            {acrossClues.map((clue) => (
              <View key={clue.id} style={styles.clueItem}>
                <Text style={styles.clueNumberBlue}>{clue.number}.</Text>
                <Text style={styles.clueText}>{clue.clue}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.cluesColumn}>
            <Text style={styles.cluesHeaderRed}>Yukarıdan Aşağı</Text>
            {downClues.map((clue) => (
              <View key={clue.id} style={styles.clueItem}>
                <Text style={styles.clueNumberRed}>{clue.number}.</Text>
                <Text style={styles.clueText}>{clue.clue}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export function PdfExporter({ state }: { state: any }) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !state.variants || state.variants.length === 0) return null;

  return (
    <PDFDownloadLink
      document={<CrosswordDocument state={state as PuzzleState} showSolution={false} />}
      fileName={`${state.title ? state.title.replace(/\s+/g, '-').toLowerCase() : 'bulmaca'}.pdf`}
      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
    >
      {/* react-pdf's PDFDownloadLink child can be a function or a React node. We'll use a simple button. */}
      {/* @ts-ignore - Some TS issues with react-pdf children */}
      {({ loading }) => (
        <>
          <Download size={16} />
          <span>{loading ? 'PDF Hazırlanıyor...' : 'PDF İndir'}</span>
        </>
      )}
    </PDFDownloadLink>
  );
}
