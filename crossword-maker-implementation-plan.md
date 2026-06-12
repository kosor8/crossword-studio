# Crossword Studio — Implementation Plan

> **Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Vercel  
> **Hedef:** Kişisel kullanım → gerekirse SaaS'a geçiş  
> **Tahmini süre:** Part-time ~5–6 hafta · Full-time ~3 hafta

---

## İçindekiler

1. [Proje Yapısı](#1-proje-yapısı)
2. [Veri Modeli](#2-veri-modeli)
3. [Faz 1 — Çekirdek Algoritma](#3-faz-1--çekirdek-algoritma)
4. [Faz 2 — UI Temeli](#4-faz-2--ui-temeli)
5. [Faz 3 — PDF Export](#5-faz-3--pdf-export)
6. [Faz 4 — Auth + Kayıt](#6-faz-4--auth--kayıt)
7. [Faz 5 — Cila + SaaS Hazırlık](#7-faz-5--cila--saas-hazırlık)
8. [Teknik Riskler](#8-teknik-riskler)
9. [Test Stratejisi](#9-test-stratejisi)
10. [Dosya Referansı](#10-dosya-referansı)

---

## 1. Proje Yapısı

```
crossword-studioF/
├── app/                        # Next.js 14 App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts   # Supabase OAuth callback
│   ├── (app)/
│   │   ├── layout.tsx          # Ana layout (nav, auth kontrol)
│   │   ├── page.tsx            # Ana sayfa / yeni bulmaca
│   │   └── my-puzzles/
│   │       └── page.tsx        # Kaydedilen bulmacalar
│   └── api/
│       └── generate/route.ts   # Grid üretim endpoint'i
├── components/
│   ├── puzzle/
│   │   ├── WordInput.tsx       # Kelime ekleme formu
│   │   ├── WordList.tsx        # Eklenen kelimeler listesi
│   │   ├── GridRenderer.tsx    # Bulmaca grid gösterimi
│   │   ├── VariantSwitcher.tsx # Varyasyonlar arası geçiş
│   │   └── PhotoUpload.tsx     # Fotoğraf yükleme + yön ayarı
│   ├── export/
│   │   └── PdfExporter.tsx
│   └── ui/                     # Paylaşılan UI bileşenleri
├── lib/
│   ├── algorithm/
│   │   ├── placer.ts           # Grid yerleştirme (backtracking)
│   │   ├── scorer.ts           # Varyasyon puanlama
│   │   └── types.ts            # Algoritma tipleri
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── pdf/
│       └── layout.ts           # PDF şablon mantığı
├── types/
│   └── puzzle.ts               # Global tip tanımları
└── tests/
    └── algorithm/
        ├── placer.test.ts
        └── fixtures/           # Test kelimeleri
```

---

## 2. Veri Modeli

### TypeScript Tipleri (`types/puzzle.ts`)

```typescript
export type Direction = 'across' | 'down';

export interface Word {
  id: string;
  answer: string;      // "ISTANBUL"
  clue: string;        // "Türkiye'nin en büyük şehri"
}

export interface PlacedWord extends Word {
  row: number;
  col: number;
  direction: Direction;
  number: number;      // 1A, 2D gibi numaralandırma için
}

export interface GridCell {
  letter: string | null;
  isBlack: boolean;
  number?: number;
}

export type Grid = GridCell[][];

export interface PuzzleVariant {
  id: string;
  grid: Grid;
  placedWords: PlacedWord[];
  unplacedWords: Word[];   // Sığmayan kelimeler (kullanıcıya göster)
  score: number;           // Yerleşim kalitesi skoru
}

export interface Puzzle {
  id?: string;             // Supabase'den gelir, kayıtlıysa
  title: string;
  words: Word[];
  gridSize: number;        // Örn: 15 (15x15)
  variants: PuzzleVariant[];
  activeVariantIndex: number;
  photo?: {
    url: string;
    orientation: 'horizontal' | 'vertical';
  };
  createdAt?: string;
  updatedAt?: string;
}
```

### Supabase Şeması

```sql
-- Bulmacalar tablosu
create table puzzles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  title      text not null,
  data       jsonb not null,     -- Puzzle nesnesinin tamamı
  thumbnail  text,               -- Base64 veya storage URL
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Satır düzeyinde güvenlik
alter table puzzles enable row level security;

create policy "Kullanıcı kendi bulmacasını görebilir"
  on puzzles for select
  using (auth.uid() = user_id);

create policy "Kullanıcı kendi bulmacasını ekleyebilir"
  on puzzles for insert
  with check (auth.uid() = user_id);

create policy "Kullanıcı kendi bulmacasını güncelleyebilir"
  on puzzles for update
  using (auth.uid() = user_id);

create policy "Kullanıcı kendi bulmacasını silebilir"
  on puzzles for delete
  using (auth.uid() = user_id);
```

---

## 3. Faz 1 — Çekirdek Algoritma

**Süre:** 1–2 hafta  
**Çıktı:** Kelimeleri alıp grid yerleştirme yapan, birden fazla varyasyon üreten saf TypeScript modülü.

### 3.1 Grid Yerleştirme Algoritması (`lib/algorithm/placer.ts`)

Yaklaşım: **Backtracking + Constraint Propagation**

```
Algoritma akışı:
1. Kelimeleri uzunluğa göre büyükten küçüğe sırala
2. İlk kelimeyi grid ortasına yatay yerleştir
3. Her sonraki kelime için:
   a. Mevcut grid ile kesişim noktası ara (ortak harf)
   b. Kesişim noktasına yerleştirmeyi dene
   c. Çakışma yoksa yerleştir, varsa sonraki konumu dene
   d. Hiç konum bulunamazsa önceki kelimeye geri dön (backtrack)
4. Tüm kelimeler denendikten sonra grid'i döndür
```

```typescript
// lib/algorithm/placer.ts

export interface PlacerConfig {
  gridSize: number;
  maxAttempts: number;     // Her kelime için max deneme sayısı
  seed?: number;           // Farklı varyasyonlar için farklı seed
}

export function generateVariants(
  words: Word[],
  config: PlacerConfig,
  variantCount: number = 3
): PuzzleVariant[] {
  const variants: PuzzleVariant[] = [];

  for (let i = 0; i < variantCount; i++) {
    const result = attemptPlacement(words, {
      ...config,
      seed: (config.seed ?? 0) + i * 1000,  // Her varyasyon farklı seed
    });
    variants.push(result);
  }

  // Skora göre sırala (en çok kelime yerleştirilen önce)
  return variants.sort((a, b) => b.score - a.score);
}

function attemptPlacement(words: Word[], config: PlacerConfig): PuzzleVariant {
  const grid = createEmptyGrid(config.gridSize);
  const sorted = [...words].sort((a, b) => b.answer.length - a.answer.length);
  const placed: PlacedWord[] = [];
  const unplaced: Word[] = [];

  for (const word of sorted) {
    const position = findBestPosition(grid, word, config);
    if (position) {
      placeWord(grid, word, position);
      placed.push({ ...word, ...position });
    } else {
      unplaced.push(word);
    }
  }

  return {
    id: crypto.randomUUID(),
    grid: finalizeGrid(grid),
    placedWords: numberWords(placed),
    unplacedWords: unplaced,
    score: calculateScore(placed, unplaced),
  };
}
```

### 3.2 Kesişim Noktası Arama

```typescript
function findBestPosition(
  grid: WorkingGrid,
  word: Word,
  config: PlacerConfig
): PlacedPosition | null {
  const candidates: Array<PlacedPosition & { priority: number }> = [];
  const letters = word.answer.toUpperCase().split('');

  // Grid'deki her mevcut harf ile eşleşme ara
  for (let row = 0; row < config.gridSize; row++) {
    for (let col = 0; col < config.gridSize; col++) {
      const cell = grid[row][col];
      if (!cell.letter) continue;

      const letterIndex = letters.indexOf(cell.letter);
      if (letterIndex === -1) continue;

      // Yatay deneme
      const hPos = tryPlace(grid, word, row, col - letterIndex, 'across', config);
      if (hPos) candidates.push({ ...hPos, priority: 1 });

      // Dikey deneme
      const vPos = tryPlace(grid, word, row - letterIndex, col, 'down', config);
      if (vPos) candidates.push({ ...vPos, priority: 1 });
    }
  }

  // Grid tamamen boşsa ortaya yerleştir
  if (candidates.length === 0 && grid.isEmpty) {
    const center = Math.floor(config.gridSize / 2);
    return { row: center, col: center - Math.floor(word.answer.length / 2), direction: 'across' };
  }

  // En iyi adayı döndür (en fazla kesişim noktasına sahip olan)
  return candidates.sort((a, b) => b.priority - a.priority)[0] ?? null;
}
```

### 3.3 Varyasyon Puanlama (`lib/algorithm/scorer.ts`)

```typescript
export function calculateScore(placed: PlacedWord[], unplaced: Word[]): number {
  const placementRatio = placed.length / (placed.length + unplaced.length);
  const intersections = countIntersections(placed);
  const compactness = calculateCompactness(placed);

  // Ağırlıklı skor:
  // - Yerleştirilen kelime oranı en önemli
  // - Kesişim sayısı bulmacayı daha ilgi çekici yapar
  // - Kompaktlık boşlukları minimize eder
  return (placementRatio * 0.6) + (intersections * 0.25) + (compactness * 0.15);
}
```

### 3.4 Önemli Sınır Durumları

Aşağıdaki durumları baştan ele al, sonra uğraşmak zorunda kalırsın:

| Durum | Davranış |
|-------|----------|
| Hiç kesişim bulunamazsa | `unplacedWords`'e ekle, kullanıcıya göster |
| Grid tam doluysa | Yeni kelime eklemeyi devre dışı bırak |
| Kelime grid'den büyükse | Ekleme anında hata ver |
| Aynı kelime iki kez girilirse | Form validasyonunda engelle |
| Tek kelime girilirse | Grid üretme, minimum 2 kelime iste |

---

## 4. Faz 2 — UI Temeli

**Süre:** 1–2 hafta  
**Çıktı:** Çalışan, kayıt gerektirmeyen tam arayüz.

### 4.1 Kelime Girişi (`components/puzzle/WordInput.tsx`)

```typescript
// Davranış:
// - "Kelime Ekle" butonu → boş satır ekler
// - Her satırda: [Cevap input] [Soru/İpucu input] [Sil butonu]
// - Grid boyutuna göre maksimum kelime sayısı hesaplanır
// - Maksimuma ulaşınca "Ekle" butonu devre dışı kalır + açıklama gösterilir
// - Cevap inputu büyük harfe otomatik çevirir
// - Minimum 3 karakter zorunluluğu

interface WordInputProps {
  words: Word[];
  maxWords: number;
  onAdd: () => void;
  onChange: (id: string, field: 'answer' | 'clue', value: string) => void;
  onRemove: (id: string) => void;
}
```

**Maksimum kelime hesabı:**
```
gridSize = 15
maxWords = Math.floor((gridSize * gridSize) / avgWordLength) * 0.4
// 15x15 grid, ort. 6 harfli kelime → yaklaşık 15 kelime
```

### 4.2 Grid Renderer (`components/puzzle/GridRenderer.tsx`)

```typescript
// Özellikler:
// - Her hücre için: harf, siyah hücre, numara (sol üst köşede küçük)
// - Responsive: container genişliğine göre hücre boyutu otomatik ölçeklenir
// - Çözüm modu toggle: harfleri göster/gizle
// - Sığmayan kelimeler için sarı uyarı banner'ı

interface GridRendererProps {
  grid: Grid;
  showSolution: boolean;
  highlightWord?: string;  // Hover'da ilgili kelimeyi vurgula
}
```

**Hücre boyutu hesabı:**
```typescript
const cellSize = Math.min(
  Math.floor(containerWidth / gridSize),
  40  // Maksimum 40px
);
```

### 4.3 Fotoğraf Yükleme (`components/puzzle/PhotoUpload.tsx`)

```typescript
// Özellikler:
// - Drag & drop + dosya seçici
// - Dosya tipi: JPEG, PNG, WebP
// - Maksimum boyut: 5MB (client-side kontrol)
// - Yatay/Dikey toggle → CSS transform + aspect ratio ile gösterim
// - Fotoğraf kırpma: react-image-crop (opsiyonel, faz sonunda ekle)
// - Preview anlık güncellenir

interface PhotoUploadProps {
  photo: Puzzle['photo'] | undefined;
  onUpload: (file: File, orientation: 'horizontal' | 'vertical') => void;
  onRemove: () => void;
  onOrientationChange: (orientation: 'horizontal' | 'vertical') => void;
}
```

**Fotoğrafı grid ile birleştirme mantığı (PDF için temel):**
```
Yatay fotoğraf: Fotoğraf üstte, bulmaca altında (tam sayfa genişliği)
Dikey fotoğraf: Fotoğraf solda (1/3 genişlik), bulmaca sağda (2/3 genişlik)
```

### 4.4 Varyasyon Geçişi (`components/puzzle/VariantSwitcher.tsx`)

```typescript
// Özellikler:
// - "Varyasyon 1 / 3" gösterimi
// - İleri/geri ok butonları
// - Her varyasyon için yerleştirilen/toplam kelime sayısı
// - Aktif varyasyon kalın gösterilir

interface VariantSwitcherProps {
  variants: PuzzleVariant[];
  activeIndex: number;
  onChange: (index: number) => void;
}
```

### 4.5 State Yönetimi

Karmaşık global state kütüphanesi gerekmez. `useReducer` + `Context` yeterli:

```typescript
// hooks/usePuzzle.ts
type PuzzleAction =
  | { type: 'ADD_WORD' }
  | { type: 'UPDATE_WORD'; id: string; field: 'answer' | 'clue'; value: string }
  | { type: 'REMOVE_WORD'; id: string }
  | { type: 'SET_VARIANTS'; variants: PuzzleVariant[] }
  | { type: 'SET_ACTIVE_VARIANT'; index: number }
  | { type: 'SET_PHOTO'; photo: Puzzle['photo'] }
  | { type: 'SET_TITLE'; title: string };

// Local storage'a otomatik kaydet (kullanıcı oturum açmadan da kaybetmesin)
```

---

## 5. Faz 3 — PDF Export

**Süre:** 1 hafta  
**Çıktı:** İndirilebilir, baskıya hazır PDF.

### 5.1 Kütüphane Seçimi

| Seçenek | Artı | Eksi |
|---------|------|------|
| `jsPDF` | Kolay, yaygın | Canvas tabanlı, piksel hataları |
| `react-pdf` (@react-pdf/renderer) | JSX ile tanımlı, vektörel | Öğrenme eğrisi |
| `html2canvas` + `jsPDF` | Mevcut HTML'i kullanır | Çözünürlük sorunları, font sorunları |

**Öneri: `@react-pdf/renderer`** — SaaS'a geçersen fatura, sertifika gibi belgeler de aynı altyapıyla üretilir.

### 5.2 PDF Şablon Yapısı

```typescript
// lib/pdf/layout.ts

// Sayfa 1: Bulmaca (boş — çözülecek)
// Sayfa 2: İpuçları listesi (yatay / dikey ayrı ayrı)
// Sayfa 3 (opsiyonel): Cevap anahtarı

export interface PdfConfig {
  puzzle: Puzzle;
  variant: PuzzleVariant;
  includeAnswerKey: boolean;
  pageSize: 'A4' | 'Letter';
}
```

**Fotoğraflı layout:**

```
Yatay fotoğraf seçiliyse:
┌─────────────────────────┐
│     FOTOĞRAF (üst)      │
│    (tam genişlik)        │
├─────────────────────────┤
│       BULMACA            │
│   (fotoğraf altında)    │
└─────────────────────────┘

Dikey fotoğraf seçiliyse:
┌───────────┬─────────────┐
│           │             │
│ FOTOĞRAF  │   BULMACA   │
│  (1/3)    │    (2/3)    │
│           │             │
└───────────┴─────────────┘
```

### 5.3 Grid'i PDF'e Dönüştürme

```typescript
// react-pdf ile grid render
// Her hücre: View (border) + Text (harf) + küçük Text (numara)
// Siyah hücre: backgroundColor: '#000'
// Font embed et (Türkçe karakter desteği için — varsayılan fontlar ğ,ş,ı gibi harfleri bozar)

// Önemli: react-pdf'te SVG desteği sınırlı
// Grid'i saf View/Text bileşenleriyle oluştur, SVG kullanma
```

### 5.4 Export API Endpoint (`app/api/generate-pdf/route.ts`)

```typescript
// POST /api/generate-pdf
// Body: { puzzleId veya puzzleData, variantIndex, config }
// Response: PDF binary (application/pdf)

// Neden API route? react-pdf server-side render edilebilir,
// bu sayede büyük grid'lerde tarayıcı donmaz
```

---

## 6. Faz 4 — Auth + Kayıt

**Süre:** 1 hafta  
**Çıktı:** Kullanıcı hesabı, bulmaca kaydetme, "Bulmacalarım" sayfası.

### 6.1 Supabase Auth Kurulumu

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Desteklenen giriş yöntemleri:
// - Google OAuth (önce bunu aç — kullanımı en kolay)
// - Email magic link (şifre yok — kullanıcı dostu)
// - Email + şifre (opsiyonel, sonradan ekle)
```

### 6.2 Bulmaca Kaydetme Mantığı

```typescript
// hooks/useSavePuzzle.ts

async function savePuzzle(puzzle: Puzzle): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  // Oturum açmamışsa local storage'a kaydet
  if (!user) {
    const drafts = JSON.parse(localStorage.getItem('crossword_drafts') ?? '[]');
    const id = crypto.randomUUID();
    drafts.push({ ...puzzle, id, savedLocally: true });
    localStorage.setItem('crossword_drafts', JSON.stringify(drafts));
    return id;
  }

  // Oturum açıksa Supabase'e kaydet
  const { data, error } = await supabase
    .from('puzzles')
    .upsert({
      id: puzzle.id,
      user_id: user.id,
      title: puzzle.title,
      data: puzzle,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Kullanıcı giriş yapınca local draft'ları Supabase'e migrate et
async function migrateLocalDrafts() { ... }
```

### 6.3 "Bulmacalarım" Sayfası

```typescript
// app/(app)/my-puzzles/page.tsx

// Özellikler:
// - Kaydedilen bulmacaların kart görünümü (başlık, tarih, kelime sayısı)
// - Thumbnail: Grid'in küçük SVG önizlemesi
// - İşlemler: Aç, PDF indir, Sil
// - Arama / filtreleme (sonraki aşamada eklenebilir)
// - Oturum açılmamışsa: local draft'ları göster + giriş yapma daveti

// Sıralama: Son güncellenen önce (varsayılan)
```

---

## 7. Faz 5 — Cila + SaaS Hazırlık

**Süre:** 1 hafta  
**Çıktı:** Pürüzsüz kullanıcı deneyimi ve SaaS'a geçiş altyapısı.

### 7.1 Hata Durumları (Kullanıcıya Görünür)

| Durum | Mesaj |
|-------|-------|
| Kelime grid'e sığmadı | "X kelimesi bu varyasyona yerleştirilemedi. Farklı bir varyasyonu deneyin veya kelimeyi çıkarın." |
| Fotoğraf çok büyük | "Fotoğraf 5MB'dan küçük olmalı." |
| Grid tamamen doldu | "Seçilen grid boyutu için maksimum kelime sayısına ulaştınız." |
| PDF üretimi başarısız | "PDF oluşturulamadı. Lütfen tekrar deneyin." |
| Supabase bağlantı hatası | "Bulmaca kaydedilemedi. Taslak olarak kaydedildi." |

### 7.2 Performans

```typescript
// Algoritma ana thread'i bloklamasın
// Web Worker kullan

// workers/placer.worker.ts
self.onmessage = (e: MessageEvent<{ words: Word[], config: PlacerConfig }>) => {
  const variants = generateVariants(e.data.words, e.data.config);
  self.postMessage(variants);
};

// Bileşende:
const worker = new Worker(new URL('../workers/placer.worker.ts', import.meta.url));
worker.postMessage({ words, config });
worker.onmessage = (e) => setVariants(e.data);
```

### 7.3 SaaS'a Geçiş için Hazırlık

Şimdi yazılır, aktif edilmez:

```typescript
// lib/pricing.ts
export const PLANS = {
  free: {
    maxPuzzles: 5,
    maxWords: 10,
    exportWatermark: true,
    photoUpload: false,
  },
  pro: {
    maxPuzzles: Infinity,
    maxWords: Infinity,
    exportWatermark: false,
    photoUpload: true,
  },
} as const;

// hooks/usePlan.ts
// Şimdilik herkese 'pro' döndür
export function usePlan() {
  return PLANS.pro;
}
// İleride Stripe webhook'u ile user metadata'ya plan bilgisi eklenince
// bu hook gerçek planı döndürür — diğer kodda değişiklik gerekmez
```

```typescript
// Stripe entegrasyon iskeleti (aktif değil)
// app/api/webhooks/stripe/route.ts — boş, hazır

// Supabase'e plan kolonu ekle:
// alter table auth.users ... → users tablosuna plan: text default 'free'
```

### 7.4 SEO + Meta

```typescript
// app/layout.tsx
export const metadata = {
  title: 'Crossword Studio — Kendi Bulmacını Oluştur',
  description: 'Kelimelerinizi girin, bulmacayı otomatik oluşturun, PDF olarak indirin.',
  openGraph: {
    images: ['/og-image.png'],
  },
};
```

---

## 8. Teknik Riskler

### Risk 1: Algoritma Her Zaman Tüm Kelimeleri Yerleştiremez

**Etki:** Orta  
**Olasılık:** Yüksek — özellikle ortak harf az olan kelimelerde  
**Çözüm:**
- `unplacedWords` listesini her zaman kullanıcıya göster
- "Sığmayan kelimeler" için sarı uyarı tasarla
- Grid boyutunu artırma seçeneği sun (10x10 → 15x15 → 21x21)
- Kullanıcıya "kelimeyi çıkar" önerisi ver

### Risk 2: PDF'te Fotoğraf + Bulmaca Yerleşimi

**Etki:** Yüksek (kullanıcı beklentisi yüksek)  
**Olasılık:** Orta  
**Çözüm:**
- İlk versiyonda fotoğraf fotoğraf her zaman aynı köşede (sol üst veya üst orta)
- "Etrafında" yerleşim fazın sonuna bırak, erken taahhüt verme
- react-pdf'te text-wrap fotoğraf etrafında çalışmaz — grid boyutunu fotoğrafa göre dinamik küçült

### Risk 3: Türkçe Karakter Desteği (PDF)

**Etki:** Yüksek  
**Olasılık:** Kesin — varsayılan fontlar ğ, ş, ı, ö, ü, ç'yi bozar  
**Çözüm:**
```typescript
// react-pdf'e font embed et
import { Font } from '@react-pdf/renderer';
Font.register({
  family: 'NotoSans',
  src: '/fonts/NotoSans-Regular.ttf',
});
// Noto Sans — tüm Türkçe karakterleri destekler, ücretsiz
```

### Risk 4: Büyük Grid'de Performans

**Etki:** Orta  
**Olasılık:** Düşük (15x15 için sorun değil, 21x21 için olabilir)  
**Çözüm:** Faz 5'te Web Worker ile algoritma main thread'den çıkarılır.

---

## 9. Test Stratejisi

### Birim Testler (Faz 1 ile birlikte)

```typescript
// tests/algorithm/placer.test.ts

describe('Kelime yerleştirme', () => {
  it('tek kelimeyi grid ortasına yerleştirir', () => { ... });
  it('iki kesişen kelimeyi yerleştirir', () => { ... });
  it('sığmayan kelimeyi unplacedWords\'e ekler', () => { ... });
  it('grid boyutundan uzun kelimeyi reddeder', () => { ... });
  it('aynı seed ile aynı sonucu üretir', () => { ... });
  it('farklı seed ile farklı varyasyon üretir', () => { ... });
});

describe('Skor hesaplama', () => {
  it('tüm kelimeler yerleşince maksimum skor verir', () => { ... });
  it('daha fazla kesişim daha yüksek skor verir', () => { ... });
});
```

### Elle Test Edilecekler (Her Faz Sonunda)

```
Faz 1: 5 kelimeyle algoritma, 10 kelimeyle algoritma, 1 kelimeyle algoritma
Faz 2: Kelime ekleme/silme akışı, grid'i görme, varyasyon geçişi, fotoğraf ekleme
Faz 3: PDF indirme (A4), Türkçe karakter kontrolü, fotoğraflı PDF
Faz 4: Google ile giriş, bulmaca kaydetme, "Bulmacalarım" sayfası, giriş olmadan local kayıt
Faz 5: Mobil (tablet), farklı tarayıcılar (Chrome, Firefox, Safari)
```

---

## 10. Dosya Referansı

### Ortam Değişkenleri (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Sadece server-side API route'larda kullan
```

### Bağımlılıklar

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.0.0",
    "@react-pdf/renderer": "^3.4.0",
    "tailwindcss": "^3.4.0",
    "react-dropzone": "^14.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

### Kurulum

```bash
npx create-next-app@latest crossword-studio --typescript --tailwind --app
cd crossword-studio
npm install @supabase/ssr @supabase/supabase-js @react-pdf/renderer react-dropzone
npm install -D vitest @testing-library/react
```

---

*Son güncelleme: İlk versiyon*
