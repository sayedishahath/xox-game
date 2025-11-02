import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function GameBoard({ gridSize, playerId, socket, currentPlayer, players, scores }) {
  const [board, setBoard] = useState(Array(gridSize * gridSize).fill(null))
  const [yourSymbol, setYourSymbol] = useState(null)
  const [gameStatus, setGameStatus] = useState('waiting')
  const [currentPlayerState, setCurrentPlayerState] = useState(currentPlayer)
  const [scoreAnimation, setScoreAnimation] = useState({})

  useEffect(() => {
    setCurrentPlayerState(currentPlayer)
  }, [currentPlayer])

  useEffect(() => {
    if (!socket) return

    socket.on('gameState', (gameData) => {
      setBoard(gameData.board)
      setCurrentPlayerState(gameData.currentPlayer)
      setGameStatus(gameData.status)
    })

    socket.on('playerSymbol', (symbol) => {
      setYourSymbol(symbol)
    })

    socket.on('moveResult', (result) => {
      if (result.success) {
        setBoard(result.board)
        setCurrentPlayerState(result.currentPlayer)
        setGameStatus(result.status)
      }
    })

    socket.on('scoreUpdate', (scoreData) => {
      // Trigger score animation
      if (scoreData.playerId) {
        setScoreAnimation({
          [scoreData.playerId]: true
        })
        setTimeout(() => {
          setScoreAnimation(prev => ({ ...prev, [scoreData.playerId]: false }))
        }, 1000)
      }
    })

    socket.on('playerLeft', (data) => {
      setGameStatus('waiting')
    })

    return () => {
      socket.off('gameState')
      socket.off('playerSymbol')
      socket.off('moveResult')
      socket.off('scoreUpdate')
      socket.off('playerLeft')
    }
  }, [socket])

  const handleCellClick = (index) => {
    if (board[index] || currentPlayerState !== playerId || gameStatus !== 'playing') {
      return
    }
    socket.emit('makeMove', { index, playerId })
  }

  const getCellColor = (cell, index) => {
    if (!cell) return 'bg-white hover:bg-gray-50'
    if (cell === yourSymbol) {
      return 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-400'
    }
    return 'bg-gradient-to-br from-red-100 to-red-200 border-red-400'
  }

  const cellVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 }
  }

  const playerCardVariants = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6">
      {/* Player Cards */}
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <AnimatePresence>
            {players.map((player, idx) => (
              <motion.div
                key={player.id}
                variants={playerCardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ delay: idx * 0.1 }}
                className={`
                  p-4 sm:p-5 rounded-xl border-2 shadow-lg
                  transition-all duration-300
                  ${currentPlayerState === player.id
                    ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-yellow-200'
                    : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm sm:text-base truncate">
                      {player.name}
                      {player.id === playerId && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="ml-2 text-blue-600"
                        >
                          (You)
                        </motion.span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs sm:text-sm text-gray-600">Symbol:</span>
                      <motion.span
                        key={player.symbol}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-lg sm:text-xl font-bold text-gray-800"
                      >
                        {player.symbol}
                      </motion.span>
                    </div>
                  </div>
                  <motion.div
                    key={scores[player.id] || 0}
                    initial={{ scale: 1 }}
                    animate={scoreAnimation[player.id] ? { scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  >
                    {scores[player.id] || 0}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Game Status */}
        <AnimatePresence mode="wait">
          {gameStatus === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full"
                />
                <span className="text-yellow-700 font-semibold text-sm sm:text-base">
                  Waiting for another player...
                </span>
              </div>
            </motion.div>
          )}
          {gameStatus === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`inline-block px-4 py-2 rounded-full font-bold text-sm sm:text-base ${
                  currentPlayerState === playerId
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {currentPlayerState === playerId ? '✨ Your turn!' : "👀 Opponent's turn"}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Game Board */}
      <div className="flex justify-center overflow-x-auto pb-2">
        <div
          className="grid gap-1.5 sm:gap-2 md:gap-3 p-2 sm:p-3 md:p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl shadow-2xl"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            maxWidth: '100%',
            width: '100%',
            minWidth: gridSize > 6 ? '400px' : 'auto',
          }}
        >
          <AnimatePresence>
            {board.map((cell, index) => (
              <motion.button
                key={index}
                variants={cellVariants}
                initial="initial"
                animate="animate"
                whileHover={
                  !cell && currentPlayerState === playerId && gameStatus === 'playing'
                    ? { scale: 1.1, rotate: 2 }
                    : {}
                }
                whileTap={
                  !cell && currentPlayerState === playerId && gameStatus === 'playing'
                    ? { scale: 0.95 }
                    : {}
                }
                onClick={() => handleCellClick(index)}
                disabled={!!cell || currentPlayerState !== playerId || gameStatus !== 'playing'}
                className={`
                  ${getCellColor(cell, index)}
                  aspect-square flex items-center justify-center
                  border-2 rounded-lg sm:rounded-xl
                  text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold
                  transition-all duration-200
                  min-w-[40px] sm:min-w-[50px] md:min-w-[60px]
                  ${!cell && currentPlayerState === playerId && gameStatus === 'playing'
                    ? 'cursor-pointer border-blue-300 shadow-lg hover:shadow-xl active:scale-95'
                    : 'cursor-not-allowed opacity-75 border-gray-300'
                  }
                `}
              >
                {cell && (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={cell === yourSymbol ? 'text-blue-600' : 'text-red-600'}
                  >
                    {cell}
                  </motion.span>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
