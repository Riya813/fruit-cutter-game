export interface LevelRecord {
  stars: number;      // 0–3
  bestScore: number;
  bestTime: number;   // seconds taken to reach target (lower is better), 0 = none
}

interface SaveData {
  unlocked: number;              // highest playable level (1-based)
  records: LevelRecord[];        // index 0 = level 1
  muted: boolean;
  tutorialSeen: boolean;
  endlessBest: number;
  daily: { date: string; score: number };
  blade: string;                 // selected blade skin id
}

const KEY = 'fruit-cutter-game-save-v1';

function fresh(): SaveData {
  return {
    unlocked: 1,
    records: Array.from({ length: 10 }, () => ({ stars: 0, bestScore: 0, bestTime: 0 })),
    muted: false,
    tutorialSeen: false,
    endlessBest: 0,
    daily: { date: '', score: 0 },
    blade: 'neon',
  };
}

class SaveManagerImpl {
  private data: SaveData;

  constructor() {
    this.data = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
    } catch {
      /* corrupted or unavailable storage → start fresh */
    }
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage may be unavailable (private mode); play session-only */
    }
  }

  get unlocked() { return this.data.unlocked; }
  get muted() { return this.data.muted; }
  get tutorialSeen() { return this.data.tutorialSeen; }
  get endlessBest() { return this.data.endlessBest; }
  get blade() { return this.data.blade; }

  setMuted(m: boolean) { this.data.muted = m; this.persist(); }
  setTutorialSeen() { this.data.tutorialSeen = true; this.persist(); }
  setBlade(id: string) { this.data.blade = id; this.persist(); }

  record(level: number): LevelRecord {
    return this.data.records[level - 1];
  }

  totalStars(): number {
    return this.data.records.reduce((a, r) => a + r.stars, 0);
  }

  get endlessUnlocked(): boolean {
    return this.data.records[9].stars > 0;
  }

  /** Today's date key (UTC) so daily scores are globally comparable. */
  static today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  dailyBest(): number {
    return this.data.daily.date === SaveManagerImpl.today() ? this.data.daily.score : 0;
  }

  /** Returns true if this run set a new daily best. */
  reportDaily(score: number): boolean {
    const today = SaveManagerImpl.today();
    if (this.data.daily.date !== today) this.data.daily = { date: today, score: 0 };
    const record = score > this.data.daily.score;
    if (record) { this.data.daily.score = score; this.persist(); }
    return record;
  }

  /** Returns true if this run set a new endless record. */
  reportEndless(score: number): boolean {
    const record = score > this.data.endlessBest;
    if (record) { this.data.endlessBest = score; this.persist(); }
    return record;
  }

  /** Store a completed run; keeps the best of everything. Returns stars earned this run. */
  reportWin(level: number, score: number, timeTaken: number, retries: number, beatPar: boolean): number {
    const stars = beatPar && retries === 0 ? 3 : retries === 0 ? 2 : 1;
    const rec = this.data.records[level - 1];
    rec.stars = Math.max(rec.stars, stars);
    rec.bestScore = Math.max(rec.bestScore, score);
    if (rec.bestTime === 0 || timeTaken < rec.bestTime) rec.bestTime = timeTaken;
    this.data.unlocked = Math.max(this.data.unlocked, Math.min(10, level + 1));
    this.persist();
    return stars;
  }

  reportScore(level: number, score: number) {
    const rec = this.data.records[level - 1];
    if (score > rec.bestScore) { rec.bestScore = score; this.persist(); }
  }

  reset() {
    this.data = fresh();
    this.persist();
  }
}

export const Save = new SaveManagerImpl();
