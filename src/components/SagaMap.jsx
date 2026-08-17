import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Star, Settings } from 'lucide-react';
import { LEVELS } from '../data/levels.js';
import { THEMES } from './DynamicBackground.jsx';
import { isUnlocked, readEntry } from '../utils/progression.js';
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

export default function SagaMap({ progress, onSelectLevel }) {
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
  // solid ribbon while the rest stays a faint dotted outline.
  const lastClearedIdx = useMemo(() => {
    let last = -1;
    levelStates.forEach((s) => { if (s.stars > 0) last = s.idx; });
    return last;
  }, [levelStates]);

  const currentState = levelStates.find((s) => s.isCurrent) ?? null;

  // Jump straight to the player's current level on open, instead of always
  // landing on level 1 — SagaMap fully remounts each time the player
  // returns from a level, so a mount-only effect is exactly "every time
  // they land back on the home screen," without yanking the scroll
  // position around on every progress update while already here.
  useEffect(() => {
    const container = scrollAreaRef.current;
    const target = levelStates.find((s) => s.isCurrent) ?? levelStates[levelStates.length - 1];
    if (!container || !target) return undefined;
    const timer = window.setTimeout(() => {
      // topPos is relative to .saga-path, which starts below the scroll
      // area's top padding (added to clear the overlaid header) — offsetTop
      // converts it into the container's scroll coordinate space.
      const pathOffset = pathRef.current ? pathRef.current.offsetTop : 0;
      const scrollTop = Math.max(0, pathOffset + target.topPos - container.clientHeight / 2);
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
        <h1 className="saga-title">Candy Saga</h1>
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
              {lastClearedIdx > 0 && (
                <polyline
                  className="saga-trail-done"
                  points={levelStates
                    .slice(0, lastClearedIdx + 1)
                    .map(({ leftPx, topPos }) => `${leftPx},${topPos}`)
                    .join(' ')}
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
            return (
              <motion.button
                key={level.id}
                type="button"
                className={`level-node ${unlocked ? '' : 'locked'} ${isCurrent ? 'current-level' : ''}`}
                style={{
                  position: 'absolute',
                  left: `calc(${leftPos}% - ${NODE_SIZE / 2}px)`,
                  top: `${topPos - NODE_SIZE / 2}px`,
                }}
                disabled={!unlocked}
                aria-label={
                  unlocked
                    ? `Level ${level.id}, ${level.name}${stars > 0 ? `, ${stars} of 3 stars` : ', not yet completed'}`
                    : `Level ${level.id}, locked`
                }
                onClick={() => unlocked && onSelectLevel(level)}
                whileHover={unlocked ? { scale: 1.1 } : {}}
                whileTap={unlocked ? { scale: 0.92 } : {}}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, type: 'spring' }}
              >
                {unlocked ? (
                  <>
                    <span className="level-number">{level.id}</span>
                    <div className="level-stars">
                      {[1, 2, 3].map((s) => (
                        <Star 
                          key={s} 
                          size={14} 
                          fill={s <= stars ? '#ffd93d' : 'none'} 
                          stroke={s <= stars ? '#ffd93d' : 'rgba(255,255,255,0.4)'} 
                          style={{ filter: s <= stars ? 'drop-shadow(0 0 4px rgba(255,217,61,0.6))' : 'none' }}
                        />
                      ))}
                    </div>
                    {bestScore > 0 && <span className="level-best">{bestScore}</span>}
                  </>
                ) : (
                  <Lock size={22} color="rgba(255,255,255,0.4)" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

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
