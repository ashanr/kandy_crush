import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Star, Settings } from 'lucide-react';
import { LEVELS } from '../data/levels.js';
import { getAnnouncerVoice, setAnnouncerVoice, toggleMute, getMuteState, unlockAudio, getBGMStyle, setBGMStyle } from '../utils/sound.js';

export default function SagaMap({ progress, onSelectLevel }) {
  const [showSettings, setShowSettings] = useState(false);
  const [voice, setVoice] = useState(getAnnouncerVoice());
  const [isMuted, setIsMuted] = useState(getMuteState());
  const [bgmStyle, setBgmStyleState] = useState(getBGMStyle());

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
          <button className="settings-btn" onClick={() => setShowSettings(true)} type="button">
            <Settings size={28} />
          </button>
        </div>
      </div>
      
      <div className="saga-scroll-area">
        {/* Decorative Background Elements */}
        <div className="cloud cloud-1">☁️</div>
        <div className="cloud cloud-2">☁️</div>
        <div className="cloud cloud-3">☁️</div>
        <div className="cloud cloud-4">☁️</div>

        <div className="saga-path" style={{ height: `${LEVELS.length * 110 + 100}px` }}>
          
          {/* Winding SVG Path Connecting Levels */}
          <svg className="saga-path-line" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <polyline 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.2)" 
              strokeWidth="12" 
              strokeDasharray="16 16"
              strokeLinecap="round"
              points={LEVELS.map((_, idx) => {
                const x = 50 + Math.sin(idx * 0.9) * 30; // 20% to 80%
                const y = 50 + idx * 110;
                return `${x}%, ${y}`;
              }).join(' ')}
            />
          </svg>

          {LEVELS.map((level, idx) => {
            const unlocked = idx === 0 || (progress[LEVELS[idx - 1].id]?.stars ?? 0) > 0;
            const stars = progress[level.id]?.stars ?? 0;
            const bestScore = progress[level.id]?.bestScore ?? 0;
            
            // Calculate Winding Position
            const leftPos = 50 + Math.sin(idx * 0.9) * 30; // sine wave
            const topPos = 50 + idx * 110;
            const isCurrent = unlocked && stars === 0;

            return (
              <motion.button
                key={level.id}
                type="button"
                className={`level-node ${unlocked ? '' : 'locked'} ${isCurrent ? 'current-level' : ''}`}
                style={{ 
                  position: 'absolute', 
                  left: `calc(${leftPos}% - 42px)`, // center the 84px node
                  top: `${topPos - 42}px` 
                }}
                disabled={!unlocked}
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
