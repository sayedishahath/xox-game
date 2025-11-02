import { useState } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

export default function Home() {
  const [gridSize, setGridSize] = useState(3)
  const [playerName, setPlayerName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleStart = (e) => {
    e.preventDefault()
    if (playerName.trim() && gridSize >= 3) {
      setIsSubmitting(true)
      setTimeout(() => {
        router.push({
          pathname: '/game',
          query: { size: gridSize, player: playerName }
        })
      }, 300)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 sm:p-4 md:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 md:p-8 lg:p-10 mx-2"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 sm:mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
          >
            XOX Multiplayer
          </motion.h1>

          <motion.form
            variants={itemVariants}
            onSubmit={handleStart}
            className="space-y-5 sm:space-y-6"
          >
            <motion.div
              variants={itemVariants}
              className="space-y-2"
            >
              <label
                htmlFor="playerName"
                className="block text-sm sm:text-base font-semibold text-gray-700"
              >
                Your Name
              </label>
              <motion.input
                whileFocus={{ scale: 1.02 }}
                whileHover={{ scale: 1.01 }}
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-sm sm:text-base"
                required
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label
                  htmlFor="gridSize"
                  className="block text-sm sm:text-base font-semibold text-gray-700"
                >
                  Grid Size
                </label>
                <motion.span
                  key={gridSize}
                  initial={{ scale: 1.2, color: '#3b82f6' }}
                  animate={{ scale: 1, color: '#1f2937' }}
                  className="text-lg sm:text-xl font-bold"
                >
                  {gridSize}x{gridSize}
                </motion.span>
              </div>
              <input
                id="gridSize"
                type="range"
                min="3"
                max="10"
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value))}
                className="w-full h-3 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer accent-blue-600 slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((gridSize - 3) / 7) * 100}%, #e5e7eb ${((gridSize - 3) / 7) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                <span>3x3</span>
                <span>10x10</span>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center">
                {isSubmitting ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Starting...
                  </motion.span>
                ) : (
                  'Start Game'
                )}
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700"
                initial={{ x: '-100%' }}
                whileHover={{ x: '0%' }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.form>
        </motion.div>
      </motion.div>
    </div>
  )
}
