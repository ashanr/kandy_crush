import { AnimatePresence, motion } from 'framer-motion';

export default function AnnouncerOverlay({ message }) {
  return (
    <div className="announcer-overlay">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            className="announcer-text"
            initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
