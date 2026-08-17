import { Hammer, Shuffle, Sparkles } from 'lucide-react';

const BOOSTERS = [
  { key: 'hammer', label: 'Hammer', icon: Hammer },
  { key: 'shuffle', label: 'Shuffle', icon: Shuffle },
  { key: 'bomb', label: 'Color Bomb', icon: Sparkles },
];

export default function BoosterBar({ counts, active, onSelect }) {
  return (
    <div className="booster-bar">
      {BOOSTERS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`booster-btn ${active === key ? 'active' : ''}`}
          disabled={counts[key] <= 0}
          onClick={() => onSelect(key)}
        >
          <Icon size={20} />
          <span>{label}</span>
          <span className="booster-count">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}
