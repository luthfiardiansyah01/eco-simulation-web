'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Achievement } from '@/types'
import { usePreferences } from '@/components/settings/PreferencesProvider'

export default function AchievementToast({ achievements }: { achievements: Achievement[] }) {
  const { notifications } = usePreferences()
  if (!notifications) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {achievements.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.3 }}
            className="bg-yellow-900/90 border border-yellow-500 rounded px-4 py-3 flex items-center gap-3 min-w-[240px] font-mono text-xs"
          >
            <span className="text-2xl">{a.icon}</span>
            <div>
              <p className="text-yellow-400 font-bold tracking-widest">ACHIEVEMENT UNLOCKED</p>
              <p className="text-white">{a.title}</p>
              <p className="text-gray-400">{a.description}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
