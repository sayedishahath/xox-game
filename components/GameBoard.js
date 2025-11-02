import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function GameBoard({ gridSize, playerId, socket, currentPlayer, players, scores = {}, gameStatus: externalGameStatus }) {
  const [board, setBoard] = useState(Array(gridSize * gridSize).fill(null))
  const [yourSymbol, setYourSymbol] = useState(null)
  const [gameStatus, setGameStatus] = useState(externalGameStatus || 'waiting')
  const [currentPlayerState, setCurrentPlayerState] = useState(currentPlayer)
  const [scoreAnimation, setScoreAnimation] = useState({})
  const [winningIndices, setWinningIndices] = useState([])
  const [strikedCells, setStrikedCells] = useState(new Set())

  // Update game status when prop changes
  useEffect(() => {
    if (externalGameStatus) {
      setGameStatus(externalGameStatus)
    }
  }, [externalGameStatus])

  // Debug: Log when scores change
  useEffect(() => {
    console.log('Scores prop updated in GameBoard:', scores)
  }, [scores])

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
        // Note: Scores are updated via props from parent (game.js)
        
        // Handle winning line animation
        if (result.winningIndices && result.winningIndices.length > 0) {
          setWinningIndices(result.winningIndices)
          setStrikedCells(new Set(result.winningIndices))
          
          // Clear strike animation after 2 seconds
          setTimeout(() => {
            setWinningIndices([])
            setStrikedCells(new Set())
          }, 2000)
        }
      }
    })

    socket.on('scoreUpdate', (scoreData) => {
      console.log('🎯 Score update received in GameBoard:', scoreData)
      console.log('   Winning indices:', scoreData.winningIndices)
      console.log('   Scores:', scoreData.scores)
      
      // Handle winning line animation FIRST (before score animation)
      if (scoreData.winningIndices && scoreData.winningIndices.length > 0) {
        console.log('✨ Setting winning indices for strike animation:', scoreData.winningIndices)
        setWinningIndices([...scoreData.winningIndices])
        setStrikedCells(new Set(scoreData.winningIndices))
        
        // Clear strike animation after 2.5 seconds
        setTimeout(() => {
          console.log('🧹 Clearing strike animation')
          setWinningIndices([])
          setStrikedCells(new Set())
        }, 2500)
      }
      
      // Trigger score animation
      if (scoreData.playerId) {
        console.log('📊 Triggering score animation for player:', scoreData.playerId)
        setScoreAnimation({
          [scoreData.playerId]: true
        })
        setTimeout(() => {
          setScoreAnimation(prev => ({ ...prev, [scoreData.playerId]: false }))
        }, 1000)
      }
    })
    
    socket.on('boardUpdate', (data) => {
      // Board was cleared after animation
      setBoard(data.board)
      setWinningIndices([])
      setStrikedCells(new Set())
    })

    socket.on('playerLeft', (data) => {
      setGameStatus('waiting')
    })

    // Also listen to playerJoined for status updates
    socket.on('playerJoined', (gameData) => {
      if (gameData.status) {
        setGameStatus(gameData.status)
      }
    })

    socket.on('gameUpdate', (gameData) => {
      if (gameData.status) {
        setGameStatus(gameData.status)
      }
    })

    return () => {
      socket.off('gameState')
      socket.off('playerSymbol')
      socket.off('moveResult')
      socket.off('scoreUpdate')
      socket.off('playerLeft')
      socket.off('playerJoined')
      socket.off('gameUpdate')
      socket.off('boardUpdate')
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
    
    const isStriked = strikedCells.has(index)
    const isWinning = winningIndices.includes(index)
    
    if (cell === yourSymbol) {
      // Your symbol (X) - red
      if (isWinning) {
        return 'bg-gradient-to-br from-red-300 to-red-400 border-red-500 ring-4 ring-yellow-400'
      }
      return 'bg-gradient-to-br from-red-100 to-red-200 border-red-400'
    } else {
      // Opponent's symbol (O) - green
      if (isWinning) {
        return 'bg-gradient-to-br from-green-300 to-green-400 border-green-500 ring-4 ring-yellow-400'
      }
      return 'bg-gradient-to-br from-green-100 to-green-200 border-green-400'
    }
  }
  
  const getStrikeOverlay = () => {
    if (winningIndices.length === 0) {
      console.log('No winning indices, no strike overlay')
      return null
    }
    
    console.log('🎨 Creating strike overlay for indices:', winningIndices)
    
    // Sort indices to get first and last
    const sortedIndices = [...winningIndices].sort((a, b) => a - b)
    const firstIndex = sortedIndices[0]
    const lastIndex = sortedIndices[sortedIndices.length - 1]
    
    const row1 = Math.floor(firstIndex / gridSize)
    const col1 = firstIndex % gridSize
    const row2 = Math.floor(lastIndex / gridSize)
    const col2 = lastIndex % gridSize
    
    console.log(`   First: (${row1}, ${col1}), Last: (${row2}, ${col2})`)
    
    // Calculate positions in pixels (we'll use viewBox approach)
    // The grid has gaps, so we need to account for that
    const cellWidth = 100 / gridSize // percentage width per cell
    const gapPercentage = 0.5 // approximate gap between cells
    
    let x1, y1, x2, y2
    
    if (row1 === row2 && Math.abs(col2 - col1) === gridSize - 1) {
      // Horizontal line - all in same row
      x1 = col1 * cellWidth + 5
      y1 = row1 * cellWidth + cellWidth / 2
      x2 = (col2 + 1) * cellWidth - 5
      y2 = row2 * cellWidth + cellWidth / 2
      console.log('   Horizontal line')
    } else if (col1 === col2 && Math.abs(row2 - row1) === gridSize - 1) {
      // Vertical line - all in same column
      x1 = col1 * cellWidth + cellWidth / 2
      y1 = row1 * cellWidth + 5
      x2 = col2 * cellWidth + cellWidth / 2
      y2 = (row2 + 1) * cellWidth - 5
      console.log('   Vertical line')
    } else if (Math.abs(row2 - row1) === gridSize - 1 && Math.abs(col2 - col1) === gridSize - 1) {
      // Diagonal line
      if (col1 < col2) {
        // Main diagonal (top-left to bottom-right)
        x1 = col1 * cellWidth + 5
        y1 = row1 * cellWidth + 5
        x2 = (col2 + 1) * cellWidth - 5
        y2 = (row2 + 1) * cellWidth - 5
      } else {
        // Anti-diagonal (top-right to bottom-left)
        x1 = (col1 + 1) * cellWidth - 5
        y1 = row1 * cellWidth + 5
        x2 = col2 * cellWidth + 5
        y2 = (row2 + 1) * cellWidth - 5
      }
      console.log('   Diagonal line')
    } else {
      // Fallback: draw line connecting first and last
      x1 = col1 * cellWidth + cellWidth / 2
      y1 = row1 * cellWidth + cellWidth / 2
      x2 = (col2 + 1) * cellWidth - cellWidth / 2
      y2 = (row2 + 1) * cellWidth - cellWidth / 2
      console.log('   Fallback line')
    }
    
    console.log(`   Line coordinates: (${x1}, ${y1}) to (${x2}, ${y2})`)
    
    return (
      <motion.div
        key={`strike-${winningIndices.join('-')}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 20 }}
      >
        <svg 
          className="w-full h-full" 
          style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <motion.line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ 
              filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 1))',
              strokeWidth: '4'
            }}
          />
        </svg>
      </motion.div>
    )
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
                    key={`score-${player.id}-${scores[player.id] || 0}`}
                    initial={{ scale: 1 }}
                    animate={scoreAnimation[player.id] ? { scale: [1, 1.5, 1], rotate: [0, 10, -10, 0] } : { scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  >
                    {scores[player.id] !== undefined ? scores[player.id] : 0}
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
          className="grid gap-1.5 sm:gap-2 md:gap-3 p-2 sm:p-3 md:p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl shadow-2xl relative"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            maxWidth: '100%',
            width: '100%',
            minWidth: gridSize > 6 ? '400px' : 'auto',
          }}
        >
          {/* Strike line overlay */}
          {getStrikeOverlay()}
          <AnimatePresence>
            {board.map((cell, index) => (
              <motion.button
                key={index}
                variants={cellVariants}
                initial="initial"
                animate={winningIndices.includes(index) ? { scale: [1, 1.2, 1] } : "animate"}
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
                  relative
                  ${!cell && currentPlayerState === playerId && gameStatus === 'playing'
                    ? 'cursor-pointer border-blue-300 shadow-lg hover:shadow-xl active:scale-95'
                    : 'cursor-not-allowed opacity-75 border-gray-300'
                  }
                `}
              >
                {cell && (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={winningIndices.includes(index) ? { 
                      scale: [1, 1.3, 1], 
                      rotate: [0, 360],
                      filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                    } : { scale: 1, rotate: 0 }}
                    transition={{ 
                      type: winningIndices.includes(index) ? "spring" : "spring",
                      stiffness: 300, 
                      damping: 20 
                    }}
                    className={cell === 'X' ? 'text-red-600' : 'text-green-600'}
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
