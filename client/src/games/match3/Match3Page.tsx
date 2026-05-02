/* ─── Match-3 Royal Puzzle — Main Page (World Select + Level Select + Game) ─── */

import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { LEVELS, WORLDS, getLevelsForWorld, getWorldForLevel } from './levels';
import type { LevelData, SavedProgress } from './types';
import { GEM_STYLES, GemType } from './types';
import type { WorldData } from './levels';
import Match3Game from './Match3Game';

const STORAGE_KEY = 'match3-progress';

function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(p: SavedProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/* ═══════════════════════════════════════════════
   ███  WORLD SELECT SCREEN
   ═══════════════════════════════════════════════ */

function WorldSelect({ onSelectWorld, progress }: { onSelectWorld: (world: WorldData) => void; progress: SavedProgress }) {
  const [, navigate] = useLocation();

  const worldStats = useMemo(() => {
    return WORLDS.map(world => {
      const levels = getLevelsForWorld(world.id);
      const completed = levels.filter(l => (progress[l.id]?.stars ?? 0) > 0).length;
      const totalStars = levels.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0);
      const maxStars = levels.length * 3;
      const isUnlocked = world.id === 1 || (progress[(world.id - 1) * 10]?.stars ?? 0) > 0;
      return { world, completed, totalStars, maxStars, isUnlocked, total: levels.length };
    });
  }, [progress]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white select-none">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg, rgba(26,26,46,0.98) 60%, transparent 100%)' }}>
        <button
          onClick={() => navigate('/child-games')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-lg transition backdrop-blur-sm"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">👑</span>
          <span className="text-lg font-bold bg-gradient-to-r from-yellow-200 to-amber-400 bg-clip-text text-transparent">
            مملكة الجواهر
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* World Cards */}
      <div className="px-4 pb-8 pt-4 space-y-4 max-w-md mx-auto">
        {worldStats.map(({ world, completed, totalStars, maxStars, isUnlocked, total }) => (
          <button
            key={world.id}
            disabled={!isUnlocked}
            onClick={() => isUnlocked && onSelectWorld(world)}
            className={`w-full text-right rounded-2xl p-5 transition-all duration-300 ${
              isUnlocked
                ? 'hover:scale-[1.02] active:scale-95 shadow-xl'
                : 'opacity-40 grayscale'
            }`}
            style={isUnlocked ? {
              background: `linear-gradient(135deg, ${world.color} 0%, ${world.colorEnd} 100%)`,
              border: totalStars === maxStars ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.15)',
            } : {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{isUnlocked ? world.emoji : '🔒'}</span>
                <div>
                  <div className="text-lg font-bold">{world.name}</div>
                  <div className="text-xs text-white/70">{world.nameEn}</div>
                </div>
              </div>
              {isUnlocked && (
                <div className="text-left">
                  <div className="text-sm font-bold text-yellow-300">⭐ {totalStars}/{maxStars}</div>
                  <div className="text-xs text-white/60">{completed}/{total} مكتمل</div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {isUnlocked && (
              <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(totalStars / maxStars) * 100}%`,
                    background: totalStars === maxStars
                      ? 'linear-gradient(90deg, #FFD700, #FFA502)'
                      : 'linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.3))',
                  }}
                />
              </div>
            )}

            {/* Perfect badge */}
            {totalStars === maxStars && (
              <div className="mt-2 text-center text-xs font-bold text-yellow-300">
                🏆 مكتمل بالكامل!
              </div>
            )}
          </button>
        ))}

        {/* Global Stats */}
        <div className="bg-white/10 rounded-2xl p-4 border border-white/15 backdrop-blur-sm">
          <h3 className="text-sm font-bold text-yellow-300 mb-3 text-center">الإحصائيات العامة</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-yellow-400">
                {Object.keys(progress).filter(k => progress[Number(k)]?.stars > 0).length}
              </div>
              <div className="text-[10px] text-white/60">مكتمل</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-400">
                {Object.values(progress).reduce((sum, p) => sum + (p?.stars ?? 0), 0)}
              </div>
              <div className="text-[10px] text-white/60">⭐ مجموع النجوم</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-400">
                {Math.max(0, ...Object.values(progress).map(p => p?.score ?? 0)).toLocaleString()}
              </div>
              <div className="text-[10px] text-white/60">أعلى نقاط</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ███  LEVEL SELECT SCREEN
   ═══════════════════════════════════════════════ */

function LevelSelect({ world, onPlay, onBack }: { world: WorldData; onPlay: (level: LevelData) => void; onBack: () => void }) {
  const progress = loadProgress();
  const levels = getLevelsForWorld(world.id);

  const isUnlocked = (id: number) => {
    if (id === levels[0]?.id) return true; // first level of world always unlocked if world is
    return !!(progress[id - 1]?.stars && progress[id - 1].stars > 0);
  };

  return (
    <div className="min-h-screen text-white select-none"
      style={{ background: `linear-gradient(180deg, ${world.color} 0%, ${world.colorEnd} 50%, #1a1a2e 100%)` }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{ background: `linear-gradient(180deg, ${world.color}ee 60%, transparent 100%)` }}>
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-lg transition backdrop-blur-sm"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{world.emoji}</span>
          <span className="text-lg font-bold bg-gradient-to-r from-yellow-200 to-amber-300 bg-clip-text text-transparent">
            {world.name}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Level Grid */}
      <div className="px-4 pb-8 pt-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-md mx-auto">
          {levels.map((lvl) => {
            const unlocked = isUnlocked(lvl.id);
            const saved = progress[lvl.id];
            const earned = saved?.stars ?? 0;
            const levelNum = lvl.id - (world.id - 1) * 10; // 1-10 within world

            return (
              <button
                key={lvl.id}
                disabled={!unlocked}
                onClick={() => unlocked && onPlay(lvl)}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  unlocked
                    ? 'bg-white/15 border border-white/25 hover:border-yellow-400/60 hover:scale-105 active:scale-95 shadow-lg backdrop-blur-sm'
                    : 'bg-black/20 border border-white/10 opacity-50'
                }`}
              >
                <span className={`text-2xl font-black ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                  {unlocked ? levelNum : '🔒'}
                </span>

                {unlocked && (
                  <span className="text-[8px] text-white/80 font-medium leading-tight text-center px-1 line-clamp-1">
                    {lvl.name}
                  </span>
                )}

                {unlocked && (
                  <div className="flex gap-0.5 mt-0.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`text-[10px] ${earned > i ? 'text-yellow-300' : 'text-white/25'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                )}

                {earned === 3 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] shadow-md">
                    💎
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* How to play */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="bg-white/10 rounded-2xl p-4 border border-white/15 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-yellow-300 mb-3 text-center">كيف تلعب؟</h3>
            <div className="space-y-2 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <span className="text-base">👆</span>
                <span>اسحب أو انقر لتبديل الجواهر المتجاورة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">💥</span>
                <span>طابق 3 أو أكثر من نفس اللون لتدميرها</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <span>طابق 4 = صاروخ | شكل L = قنبلة | طابق 5 = قوس قزح</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                <span>حقق الأهداف قبل نفاد الحركات واحصل على 3 نجوم!</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              {([GemType.Ruby, GemType.Sapphire, GemType.Emerald, GemType.Amethyst, GemType.Topaz, GemType.Diamond] as GemType[]).map(gt => (
                <div key={gt} className="w-6 h-6 rounded-full border border-white/25 shadow-lg"
                  style={{ backgroundColor: GEM_STYLES[gt].bg }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ███  MAIN PAGE WRAPPER
   ═══════════════════════════════════════════════ */

export default function Match3Page() {
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);
  const [currentWorld, setCurrentWorld] = useState<WorldData | null>(null);
  const [progress, setProgress] = useState<SavedProgress>(loadProgress);

  const handleSelectWorld = useCallback((world: WorldData) => {
    setCurrentWorld(world);
  }, []);

  const handlePlay = useCallback((level: LevelData) => {
    setCurrentLevel(level);
  }, []);

  const handleBackToWorlds = useCallback(() => {
    setCurrentWorld(null);
    setProgress(loadProgress());
  }, []);

  const handleBackToLevels = useCallback(() => {
    setCurrentLevel(null);
    setProgress(loadProgress());
  }, []);

  const handleComplete = useCallback((stars: number, score: number) => {
    if (!currentLevel) return;
    const prog = loadProgress();
    const prev = prog[currentLevel.id];
    if (!prev || stars > prev.stars || score > prev.score) {
      prog[currentLevel.id] = {
        stars: Math.max(stars, prev?.stars ?? 0),
        score: Math.max(score, prev?.score ?? 0),
      };
      saveProgress(prog);
      setProgress({ ...prog });
    }
  }, [currentLevel]);

  if (currentLevel) {
    return <Match3Game level={currentLevel} onBack={handleBackToLevels} onComplete={handleComplete} />;
  }

  if (currentWorld) {
    return <LevelSelect world={currentWorld} onPlay={handlePlay} onBack={handleBackToWorlds} />;
  }

  return <WorldSelect onSelectWorld={handleSelectWorld} progress={progress} />;
}
