import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Star, Settings } from 'lucide-react';
import { LEVELS } from '../data/levels.js';
import { THEMES } from './DynamicBackground.jsx';
import { isUnlocked, readEntry, totalStars, maxStars } from '../utils/progression.js';
import { getAnnouncerVoice, setAnnouncerVoice, toggleMute, getMuteState, unlockAudio, getBGMStyle, setBGMStyle } from '../utils/sound.js';

// Vertical distance between level nodes. Generous enough that the map has real
// scroll travel — the zone gradient and parallax layers are imperceptible when
// the whole path fits on one screen.
const LEVEL_SPACING = 170;
const PATH_TOP = 90;
const PATH_BOTTOM_PAD = 130;
const NODE_SIZE = 84;
// Horizontal sway of the winding path, as a fraction of the map width.
const SWAY = 0.28;

const PATH_HEIGHT = PATH_TOP + (LEVELS.length - 1) * LEVEL_SPACING + PATH_BOTTOM_PAD;

// Celebration beats, in ms from mount. The trail draws first, then the next
// level cracks open, then control returns to the player.
const TRAIL_DRAW_MS = 950;
const UNLOCK_DELAY_MS = 1150;
const CELEBRATION_TOTAL_MS = 2400;

export default function SagaMap({ progress, celebration, onCelebrationDone, onSelectLevel }) {
  const [showSettings, setShowSettings] = useState(false);
  const [voice, setVoice] = useState(getAnnouncerVoice());
  const [isMuted, setIsMuted] = useState(getMuteState());
  const [bgmStyle, setBgmStyleState] = useState(getBGMStyle());
  const scrollAreaRef = useRef(null);
  const pathRef = useRef(null);
  const [mapWidth, setMapWidth] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // The trail is an SVG <polyline>, whose `points` attribute accepts bare
  // numbers only — the previous "50%, 120" form was invalid and the browser
  // stopped parsing at the first '%', so the connecting path never drew.
  // Measuring the map lets us emit real pixel coordinates.
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return undefined;
    const sync = () => setMapWidth(el.clientWidth);
    sync();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync);
      return () => window.removeEventListener('resize', sync);
    }
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Parallax: track scroll position, rAF-throttled so we never do more than
  // one state update per frame.
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return undefined;
    let frame = null;
    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        setScrollY(el.scrollTop);
        frame = null;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Precompute each level's unlocked/star/position state once, shared by
  // both the render loop and the auto-scroll effect below (previously this
  // logic was duplicated inline in the JSX map).
  const levelStates = useMemo(
    () => LEVELS.map((level, idx) => {
      const unlocked = isUnlocked(progress, LEVELS, idx);
      const { stars, bestScore, completed } = readEntry(progress, level.id);
      const swayFraction = Math.sin(idx * 0.9) * SWAY;
      return {
        level,
        idx,
        unlocked,
        stars,
        bestScore,
        // "Current" means cleared-nothing-here-yet, not zero-stars — a level
        // beaten for 0 stars is still behind you.
        isCurrent: unlocked && !completed,
        // Percentage drives CSS positioning (valid there, and correct before
        // the first measurement); pixels drive the SVG trail.
        leftPos: 50 + swayFraction * 100,
        leftPx: mapWidth ? mapWidth / 2 + swayFraction * mapWidth : 0,
        topPos: PATH_TOP + idx * LEVEL_SPACING,
      };
    }),
    [progress, mapWidth],
  );

  // Zone gradient built from the per-level backdrops, so each stretch of the
  // world map previews the level it leads to.
  const zoneGradient = useMemo(() => {
    const stops = levelStates.map(({ level, topPos }) => {
      const theme = THEMES[level.id] || THEMES[1];
      const pct = ((topPos / PATH_HEIGHT) * 100).toFixed(1);
      return `${theme.gradient[0]} ${pct}%`;
    });
    return `linear-gradient(180deg, ${THEMES[LEVELS[0].id]?.gradient[1] ?? '#2b0a3d'} 0%, ${stops.join(', ')}, #120425 100%)`;
  }, [levelStates]);

  // Trail is split so the stretch the player has already cleared reads as a
  // solid ribbon while the rest stays a faint dotted outline. Keyed on
  // completion rather than stars: a level beaten for zero stars is still
  // behind you, and the ribbon previously stopped short of it.
  const lastClearedIdx = useMemo(() => {
    let last = -1;
    levelStates.forEach((s) => { if (readEntry(progress, s.level.id).completed) last = s.idx; });
    return last;
  }, [levelStates, progress]);

  const currentState = levelStates.find((s) => s.isCurrent) ?? null;

  // --- Return-from-win celebration -----------------------------------------
  // The map fully remounts after every level, and used to replay the identical
  // staggered pop-in whether you had just taken a level for three stars or
  // opened the app cold. These drive the payoff: the newly-earned segment of
  // trail draws itself, then the level it leads to cracks open.
  const celebratedIdx = useMemo(() => {
    if (!celebration) return -1;
    return levelStates.findIndex((s) => s.level.id === celebration.levelId);
  }, [celebration, levelStates]);

  const isCelebrating = celebratedIdx >= 0;
  const unlockedIdx = isCelebrating ? celebratedIdx + 1 : -1;
  // Hold the freshly-drawn segment back from the static ribbon so it can be
  // animated separately; everything before it is drawn immediately.
  const staticTrailEnd = isCelebrating
    ? Math.min(lastClearedIdx, celebratedIdx - 1)
    : lastClearedIdx;

  useEffect(() => {
    if (!isCelebrating) return undefined;
    const timer = window.setTimeout(() => onCelebrationDone?.(), CELEBRATION_TOTAL_MS);
    return () => window.clearTimeout(timer);
  }, [isCelebrating, onCelebrationDone]);

  const totalEarned = totalStars(progress, LEVELS);
  const totalPossible = maxStars(LEVELS);

  // Jump straight to the player's current level on open, instead of always
  // landing on level 1 — SagaMap fully remounts each time the player
  // returns from a level, so a mount-only effect is exactly "every time
  // they land back on the home screen," without yanking the scroll
  // position around on every progress update while already here.
  useEffect(() => {
    const container = scrollAreaRef.current;
    // After a win, frame the midpoint between the level just beaten and the one
    // it unlocks, so the trail drawing between them happens on screen. Landing
    // on the next level alone would put the whole animation above the fold.
    const celebrated = celebratedIdx >= 0 ? levelStates[celebratedIdx] : null;
    const target = celebrated
      ?? levelStates.find((s) => s.isCurrent)
      ?? levelStates[levelStates.length - 1];
    if (!container || !target) return undefined;
    const focusY = celebrated ? target.topPos + LEVEL_SPACING / 2 : target.topPos;
    const timer = window.setTimeout(() => {
      // topPos is relative to .saga-path, which starts below the scroll
      // area's top padding (added to clear the overlaid header) — offsetTop
      // converts it into the container's scroll coordinate space.
      const pathOffset = pathRef.current ? pathRef.current.offsetTop : 0;
      const scrollTop = Math.max(0, pathOffset + focusY - container.clientHeight / 2);
      container.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceChange = (v) => {
    setVoice(v);
    setAnnouncerVoice(v);
  };

  const handleBGMChange = (style) => {
    setBgmStyleState(style);
    setBGMStyle(style);
  };

  const handleToggleMute = () => {
    setIsMuted(toggleMute());
  };

  return (
    <div className="saga-map" onClick={unlockAudio}>
      <div className="saga-header">
        <div className="saga-title-block">
          <h1 className="saga-title">Candy Saga</h1>
          {/* The number the map is actually played for. Per-level stars were
              shown on each node but never summed. */}
          <motion.div
            className="saga-stars-total"
            key={totalEarned}
            initial={isCelebrating ? { scale: 1 } : false}
            animate={isCelebrating ? { scale: [1, 1.3, 1] } : {}}
            transition={{ delay: 1.0, duration: 0.5 }}
            aria-label={`${totalEarned} of ${totalPossible} stars earned`}
          >
            <Star size={15} fill="#ffd93d" stroke="#ffd93d" />
            <span>{totalEarned}<span className="saga-stars-max">/{totalPossible}</span></span>
          </motion.div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="settings-btn" onClick={handleToggleMute} type="button" aria-label="Toggle Music">
            {isMuted ? '🔇' : '🎵'}
          </button>
          <button className="settings-btn" onClick={() => setShowSettings(true)} type="button" aria-label="Open settings">
            <Settings size={28} />
          </button>
        </div>
      </div>
      
      <div className="saga-scroll-area" ref={scrollAreaRef}>
        {/* Decorative Background Elements */}
        <div className="cloud cloud-1">☁️</div>
        <div className="cloud cloud-2">☁️</div>
        <div className="cloud cloud-3">☁️</div>
        <div className="cloud cloud-4">☁️</div>

        <div
          ref={pathRef}
          className="saga-path"
          style={{ height: `${PATH_HEIGHT}px`, background: zoneGradient }}
        >
          {/* Parallax depth layers — drift slower than the trail itself. */}
          <div className="saga-parallax" style={{ top: PATH_HEIGHT * 0.18, transform: `translateY(${scrollY * 0.28}px)` }}>
            <svg className="saga-hills saga-hills--far" viewBox="0 0 400 120" preserveAspectRatio="none" height="120">
              <path d="M0 120 L0 70 Q 60 30 120 62 T 240 55 T 400 78 L400 120 Z" fill="#ffffff" />
            </svg>
          </div>
          <div className="saga-parallax" style={{ top: PATH_HEIGHT * 0.55, transform: `translateY(${scrollY * 0.14}px)` }}>
            <svg className="saga-hills" viewBox="0 0 400 140" preserveAspectRatio="none" height="140">
              <path d="M0 140 L0 88 Q 80 40 170 76 T 320 62 T 400 92 L400 140 Z" fill="#ffffff" />
            </svg>
          </div>

          {/* Winding candy trail. Rendered only once the map has been measured,
              since SVG points must be numeric pixel coordinates. */}
          {mapWidth > 0 && (
            <svg
              className="saga-path-line"
              width={mapWidth}
              height={PATH_HEIGHT}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              <polyline
                className="saga-trail-base"
                points={levelStates.map(({ leftPx, topPos }) => `${leftPx},${topPos}`).join(' ')}
              />
              {staticTrailEnd > 0 && (
                <polyline
                  className="saga-trail-done"
                  points={levelStates
                    .slice(0, staticTrailEnd + 1)
                    .map(({ leftPx, topPos }) => `${leftPx},${topPos}`)
                    .join(' ')}
                />
              )}
              {/* The stretch just earned, drawn on arrival. */}
              {isCelebrating && celebratedIdx > 0 && (
                <motion.polyline
                  className="saga-trail-done saga-trail-new"
                  points={levelStates
                    .slice(celebratedIdx - 1, celebratedIdx + 1)
                    .map(({ leftPx, topPos }) => `${leftPx},${topPos}`)
                    .join(' ')}
                  initial={{ pathLength: 0, opacity: 0.6 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: TRAIL_DRAW_MS / 1000, ease: 'easeOut' }}
                />
              )}
            </svg>
          )}

          {/* Player marker — sits on top of the current level node. */}
          {currentState && (
            <motion.div
              className="saga-avatar"
              style={{
                left: `calc(${currentState.leftPos}% - 16px)`,
                top: currentState.topPos - NODE_SIZE / 2 - 34,
              }}
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              🍬
            </motion.div>
          )}

          {levelStates.map(({ level, idx, unlocked, stars, bestScore, isCurrent, leftPos, topPos }) => {
            const justBeaten = idx === celebratedIdx;
            const justUnlocked = idx === unlockedIdx && unlocked;
            return (
              <motion.button
                key={level.id}
                type="button"
                className={`level-node ${unlocked ? '' : 'locked'} ${isCurrent ? 'current-level' : ''} ${justUnlocked ? 'just-unlocked' : ''}`}
                style={{
                  position: 'absolute',
                  left: `calc(${leftPos}% - ${NODE_SIZE / 2}px)`,
                  top: `${topPos - NODE_SIZE / 2}px`,
                }}
                disabled={!unlocked}
                aria-label={
                  unlocked
                    ? `Level ${level.id}, ${level.name}${stars > 0 ? `, ${stars} of 3 stars` : ', not yet completed'}${bestScore > 0 ? `, best score ${bestScore}` : ''}`
                    : `Level ${level.id}, locked`
                }
                onClick={() => unlocked && onSelectLevel(level)}
                whileHover={unlocked ? { scale: 1.1 } : {}}
                whileTap={unlocked ? { scale: 0.92 } : {}}
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  justUnlocked
                    // Held shut until the trail reaches it, then bursts open.
                    ? { opacity: 1, scale: [0, 1.35, 0.92, 1], rotate: [0, -8, 4, 0] }
                    : { opacity: 1, scale: 1 }
                }
                transition={
                  justUnlocked
                    ? { delay: UNLOCK_DELAY_MS / 1000, duration: 0.65, ease: 'easeOut' }
                    : { delay: idx * 0.05, type: 'spring' }
                }
              >
                {unlocked ? (
                  <>
                    <span className="level-number">{level.id}</span>
                    <div className="level-stars">
                      {[1, 2, 3].map((s) => {
                        const earned = s <= stars;
                        const star = (
                          <Star
                            size={14}
                            fill={earned ? '#ffd93d' : 'none'}
                            stroke={earned ? '#ffd93d' : 'rgba(255,255,255,0.4)'}
                            style={{ filter: earned ? 'drop-shadow(0 0 4px rgba(255,217,61,0.6))' : 'none' }}
                          />
                        );
                        // On the level just beaten, the stars drop in one by one
                        // rather than being present from the first frame.
                        return earned && justBeaten ? (
                          <motion.span
                            key={s}
                            style={{ display: 'inline-flex' }}
                            initial={{ scale: 0, y: -18, opacity: 0 }}
                            animate={{ scale: [0, 1.6, 1], y: 0, opacity: 1 }}
                            transition={{ delay: 0.25 + s * 0.18, duration: 0.5, ease: 'easeOut' }}
                          >
                            {star}
                          </motion.span>
                        ) : (
                          <span key={s} style={{ display: 'inline-flex' }}>{star}</span>
                        );
                      })}
                    </div>
                    {/* Was a bare number with no indication of what it meant. */}
                    {bestScore > 0 && (
                      <span className="level-best" title={`Best score: ${bestScore.toLocaleString()}`}>
                        🏆 {bestScore.toLocaleString()}
                      </span>
                    )}
                  </>
                ) : (
                  <Lock size={22} color="rgba(255,255,255,0.4)" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Anchored call to action — the player no longer has to locate the right
          node on a scrolling map to keep going. Appears after the celebration
          so it doesn't compete with the unlock animation. */}
      <AnimatePresence>
        {currentState && !isCelebrating && (
          <motion.div
            className="saga-play-bar"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <button
              type="button"
              className="saga-play-btn"
              onClick={() => onSelectLevel(currentState.level)}
            >
              <span className="saga-play-label">ගේම් එක පටන් ගන්න</span>
              <span className="saga-play-level">
                Level {currentState.level.id} · {currentState.level.name}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            className="result-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="result-card settings-card"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2>⚙️ Settings (සැකසුම්)</h2>
              
              <div className="settings-option">
                <label>Announcer Voice (කටහඬ)</label>
                <div className="voice-toggle">
                  <button 
                    type="button" 
                    className={`toggle-btn ${voice === 'male' ? 'active' : ''}`}
                    onClick={() => handleVoiceChange('male')}
                  >
                    Male (පිරිමි)
                  </button>
                  <button 
                    type="button" 
                    className={`toggle-btn ${voice === 'female' ? 'active' : ''}`}
                    onClick={() => handleVoiceChange('female')}
                  >
                    Female (ගැහැණු)
                  </button>
                </div>
              </div>

              <div className="settings-option">
                <label>Music Style (සංගීතය)</label>
                <div className="voice-toggle" style={{ flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className={`toggle-btn ${bgmStyle === 'baila' ? 'active' : ''}`}
                    onClick={() => handleBGMChange('baila')}
                    style={{ padding: '8px 4px', fontSize: '0.85rem' }}
                  >
                    Baila
                  </button>
                  <button 
                    type="button" 
                    className={`toggle-btn ${bgmStyle === 'papare' ? 'active' : ''}`}
                    onClick={() => handleBGMChange('papare')}
                    style={{ padding: '8px 4px', fontSize: '0.85rem' }}
                  >
                    Papare
                  </button>
                  <button 
                    type="button" 
                    className={`toggle-btn ${bgmStyle === 'kandyan' ? 'active' : ''}`}
                    onClick={() => handleBGMChange('kandyan')}
                    style={{ padding: '8px 4px', fontSize: '0.85rem' }}
                  >
                    Kandyan
                  </button>
                </div>
              </div>

              <button type="button" className="close-btn" onClick={() => setShowSettings(false)}>
                Close (වසන්න)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
