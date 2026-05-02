/* ─── Match-3 Royal Puzzle — Core Game Engine ─── */
/* Pure logic — no DOM / Canvas dependency          */

import {
  Gem, GemType, SpecialType, Pos, MatchGroup, LevelData, LevelObjective,
} from './types';

/* ─── ID Generator ─── */
let _nextId = 1;
export function resetIdCounter() { _nextId = 1; }

/* ─── Gem Factory ─── */
export function createGem(
  type: GemType, row: number, col: number, special = SpecialType.None,
): Gem {
  return { id: _nextId++, type, special, row, col };
}

export function randomType(gems: GemType[]): GemType {
  return gems[Math.floor(Math.random() * gems.length)];
}

/* ─── Grid Initialisation (no pre-existing matches) ─── */
export function initGrid(level: LevelData): Gem[][] {
  const grid: Gem[][] = [];
  for (let r = 0; r < level.rows; r++) {
    grid[r] = [];
    for (let c = 0; c < level.cols; c++) {
      let t: GemType;
      do {
        t = randomType(level.gems);
      } while (
        (c >= 2 && grid[r][c - 1].type === t && grid[r][c - 2].type === t) ||
        (r >= 2 && grid[r - 1][c].type === t && grid[r - 2][c].type === t)
      );
      grid[r][c] = createGem(t, r, c);
    }
  }
  return grid;
}

/* ─── Adjacency ─── */
export function areAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/* ─── Swap ─── */
export function swapGems(grid: Gem[][], a: Pos, b: Pos) {
  const ga = grid[a.row][a.col];
  const gb = grid[b.row][b.col];
  grid[a.row][a.col] = gb;
  grid[b.row][b.col] = ga;
  ga.row = b.row; ga.col = b.col;
  gb.row = a.row; gb.col = a.col;
}

/* ─── Match Detection ─── */
export function findMatches(grid: (Gem | null)[][]): MatchGroup[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const matches: MatchGroup[] = [];

  // Horizontal
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const gem = grid[r][c];
      if (!gem) { c++; continue; }
      const t = gem.type;
      let len = 1;
      while (c + len < cols && grid[r][c + len]?.type === t) len++;
      if (len >= 3) {
        const cells: Pos[] = [];
        for (let i = 0; i < len; i++) cells.push({ row: r, col: c + i });
        matches.push({ cells, horizontal: true });
      }
      c += len;
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const gem = grid[r][c];
      if (!gem) { r++; continue; }
      const t = gem.type;
      let len = 1;
      while (r + len < rows && grid[r + len]?.[c]?.type === t) len++;
      if (len >= 3) {
        const cells: Pos[] = [];
        for (let i = 0; i < len; i++) cells.push({ row: r + i, col: c });
        matches.push({ cells, horizontal: false });
      }
      r += len;
    }
  }

  return matches;
}

/* ─── Collect all matched positions into a Set ─── */
export function matchedPositionSet(matches: MatchGroup[]): Set<string> {
  const s = new Set<string>();
  for (const m of matches) for (const c of m.cells) s.add(`${c.row},${c.col}`);
  return s;
}

/* ─── Determine what specials to create from matches ─── */
export function getSpecials(
  matches: MatchGroup[],
  grid: (Gem | null)[][],
  swapPos?: Pos,
): { pos: Pos; special: SpecialType; type: GemType }[] {
  const result: { pos: Pos; special: SpecialType; type: GemType }[] = [];
  const used = new Set<string>();

  // 1. L / T intersections → Bomb (highest priority)
  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      if (matches[i].horizontal === matches[j].horizontal) continue;
      for (const a of matches[i].cells) {
        for (const b of matches[j].cells) {
          if (a.row === b.row && a.col === b.col) {
            const key = `${a.row},${a.col}`;
            if (!used.has(key)) {
              used.add(key);
              result.push({ pos: a, special: SpecialType.Bomb, type: grid[a.row]![a.col]!.type });
            }
          }
        }
      }
    }
  }

  // 2. Match 5+ → Rainbow
  for (const m of matches) {
    if (m.cells.length >= 5) {
      let pos = m.cells[Math.floor(m.cells.length / 2)];
      if (swapPos) {
        const sp = m.cells.find(c => c.row === swapPos.row && c.col === swapPos.col);
        if (sp) pos = sp;
      }
      const key = `${pos.row},${pos.col}`;
      if (!used.has(key)) {
        used.add(key);
        result.push({ pos, special: SpecialType.Rainbow, type: grid[pos.row]![pos.col]!.type });
      }
    }
  }

  // 3. Match 4 → Rocket
  for (const m of matches) {
    if (m.cells.length === 4) {
      let pos = m.cells[1];
      if (swapPos) {
        const sp = m.cells.find(c => c.row === swapPos.row && c.col === swapPos.col);
        if (sp) pos = sp;
      }
      const key = `${pos.row},${pos.col}`;
      if (!used.has(key)) {
        used.add(key);
        const special = m.horizontal ? SpecialType.RocketV : SpecialType.RocketH;
        result.push({ pos, special, type: grid[pos.row]![pos.col]!.type });
      }
    }
  }

  return result;
}

/* ─── Special Gem Activation — positions cleared ─── */
export function specialClearPositions(
  gem: Gem, grid: (Gem | null)[][], targetType?: GemType,
): Pos[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const pos: Pos[] = [];

  switch (gem.special) {
    case SpecialType.RocketH:
      for (let c = 0; c < cols; c++) pos.push({ row: gem.row, col: c });
      break;
    case SpecialType.RocketV:
      for (let r = 0; r < rows; r++) pos.push({ row: r, col: gem.col });
      break;
    case SpecialType.Bomb:
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const r = gem.row + dr, c = gem.col + dc;
          if (r >= 0 && r < rows && c >= 0 && c < cols) pos.push({ row: r, col: c });
        }
      break;
    case SpecialType.Rainbow:
      if (targetType !== undefined)
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++)
            if (grid[r][c]?.type === targetType) pos.push({ row: r, col: c });
      break;
  }
  return pos;
}

/* ─── Process a set of matches: remove gems, create specials, handle chains ─── */
export function processMatches(
  grid: (Gem | null)[][],
  matches: MatchGroup[],
  swapPos?: Pos,
): { removed: Set<string>; specials: { pos: Pos; special: SpecialType; type: GemType }[] } {
  const toRemove = matchedPositionSet(matches);
  const specials = getSpecials(matches, grid, swapPos);
  const specialKeys = new Set(specials.map(s => `${s.pos.row},${s.pos.col}`));

  // Activate specials that are being removed
  const activated = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const key of toRemove) {
      if (activated.has(key)) continue;
      const [r, c] = key.split(',').map(Number);
      const gem = grid[r]?.[c];
      if (gem && gem.special !== SpecialType.None) {
        activated.add(key);
        const extra = specialClearPositions(gem, grid, gem.type);
        for (const p of extra) {
          const pk = `${p.row},${p.col}`;
          if (!toRemove.has(pk)) { toRemove.add(pk); changed = true; }
        }
      }
    }
  }

  // Remove gems from grid (except where new specials land)
  for (const key of toRemove) {
    if (specialKeys.has(key)) continue;
    const [r, c] = key.split(',').map(Number);
    grid[r][c] = null;
  }

  // Place new special gems
  for (const s of specials) {
    grid[s.pos.row][s.pos.col] = createGem(s.type, s.pos.row, s.pos.col, s.special);
  }

  return { removed: toRemove, specials };
}

/* ─── Gravity — fill empty cells, return movement info ─── */
export interface FallMove {
  gem: Gem;
  fromRow: number;
  toRow: number;
  col: number;
  isNew: boolean;
}

export function applyGravity(grid: (Gem | null)[][], level: LevelData): FallMove[] {
  const moves: FallMove[] = [];

  for (let c = 0; c < level.cols; c++) {
    const existing: Gem[] = [];
    for (let r = 0; r < level.rows; r++) {
      if (grid[r][c]) existing.push(grid[r][c]!);
    }

    const emptyCount = level.rows - existing.length;
    const newGems: Gem[] = [];
    for (let i = 0; i < emptyCount; i++) {
      newGems.push(createGem(randomType(level.gems), -(emptyCount - i), c));
    }

    const all = [...newGems, ...existing];
    for (let r = 0; r < level.rows; r++) {
      const gem = all[r];
      const oldRow = gem.row;
      if (oldRow !== r) {
        moves.push({ gem, fromRow: oldRow, toRow: r, col: c, isNew: oldRow < 0 });
      }
      gem.row = r;
      gem.col = c;
      grid[r][c] = gem;
    }
  }
  return moves;
}

/* ─── Valid Move Check ─── */
export function hasValidMoves(grid: Gem[][]): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) {
        swapGems(grid, { row: r, col: c }, { row: r, col: c + 1 });
        if (findMatches(grid).length > 0) {
          swapGems(grid, { row: r, col: c }, { row: r, col: c + 1 });
          return true;
        }
        swapGems(grid, { row: r, col: c }, { row: r, col: c + 1 });
      }
      if (r + 1 < rows) {
        swapGems(grid, { row: r, col: c }, { row: r + 1, col: c });
        if (findMatches(grid).length > 0) {
          swapGems(grid, { row: r, col: c }, { row: r + 1, col: c });
          return true;
        }
        swapGems(grid, { row: r, col: c }, { row: r + 1, col: c });
      }
    }
  }
  return false;
}

/* ─── Score Calculation ─── */
export function calcScore(matches: MatchGroup[], combo: number): number {
  let base = 0;
  for (const m of matches) {
    const len = m.cells.length;
    if (len === 3) base += 100;
    else if (len === 4) base += 300;
    else base += 500 + (len - 5) * 200;
  }
  return Math.floor(base * (1 + combo * 0.5));
}

/* ─── Star Rating ─── */
export function calcStars(score: number, thresholds: [number, number, number]): number {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

/* ─── Objective Progress ─── */
export function updateObjectives(
  objectives: (LevelObjective & { current: number })[],
  removed: Set<string>,
  grid: (Gem | null)[][],
  prevGrid: Map<string, GemType>,
): void {
  for (const obj of objectives) {
    if (obj.type === 'collect' && obj.gemType !== undefined) {
      for (const key of removed) {
        const t = prevGrid.get(key);
        if (t === obj.gemType) obj.current++;
      }
    }
  }
}

export function objectivesComplete(
  objectives: (LevelObjective & { current: number })[],
  score: number,
): boolean {
  return objectives.every(o => {
    if (o.type === 'score') return score >= o.target;
    return o.current >= o.target;
  });
}
