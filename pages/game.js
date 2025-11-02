import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import GameBoard from '../components/GameBoard'

export default function Game() {
  const router = useRouter()
  const { size, player } = router.query
  const [socket, setSocket] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [players, setPlayers] = useState([])
  const [scores, setScores] = useState({})
  const [gridSize, setGridSize] = useState(3)
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState(null)
  const [gameStatus, setGameStatus] = useState('waiting')

  useEffect(() => {
    if (!size || !player) return
    setGridSize(parseInt(size))
  }, [size, player])

  useEffect(() => {
    if (!size || !player) return

    // Use environment variable for Socket.io server URL
    // For production, set NEXT_PUBLIC_SOCKET_URL in Vercel environment variables
    // Example: https://your-socket-server.railway.app or https://your-socket-server.render.com
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : '')
    
    if (!socketUrl) {
      console.error('Socket URL not configured. Please set NEXT_PUBLIC_SOCKET_URL environment variable.')
      setConnectionError('Socket server URL not configured. Please set NEXT_PUBLIC_SOCKET_URL environment variable.')
      setIsConnecting(false)
      return
    }
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setPlayerId(newSocket.id)
      setIsConnecting(false)
      setConnectionError(null)
      newSocket.emit('joinGame', {
        playerName: player,
        gridSize: parseInt(size),
      })
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setIsConnecting(false)
      setConnectionError('Failed to connect to game server. Please check your connection and try again.')
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts')
      setIsConnecting(false)
      setConnectionError(null)
    })

    newSocket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error)
      setIsConnecting(true)
      setConnectionError('Trying to reconnect...')
    })

    newSocket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server')
      setIsConnecting(false)
      setConnectionError('Failed to reconnect to game server. Please refresh the page.')
    })

    newSocket.on('playerJoined', (gameData) => {
      console.log('Player joined event:', gameData)
      setPlayers(gameData.players)
      setCurrentPlayer(gameData.currentPlayer)
      setScores(gameData.scores || {})
      setGameStatus(gameData.status || 'waiting')
    })

    newSocket.on('gameUpdate', (gameData) => {
      setPlayers(gameData.players)
      setCurrentPlayer(gameData.currentPlayer)
      setScores(gameData.scores || {})
      setGameStatus(gameData.status || 'waiting')
    })

    newSocket.on('gameState', (gameData) => {
      setGameStatus(gameData.status || 'waiting')
    })

    newSocket.on('scoreUpdate', (scoreData) => {
      setScores(scoreData.scores)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnecting(true)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [size, player])

  if (!size || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white text-xl sm:text-2xl font-semibold"
        >
          Loading...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 py-3 sm:py-4 md:py-6 lg:py-8 px-2 sm:px-3 md:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0"
        >
          <motion.button
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold hover:bg-white transition-all duration-200 shadow-lg flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </motion.button>
          
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center drop-shadow-lg"
          >
            XOX Multiplayer
          </motion.h1>
          
          <div className="hidden sm:block w-32"></div>
        </motion.div>

        {/* Game Board */}
        <AnimatePresence mode="wait">
          {connectionError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[400px] bg-white/10 backdrop-blur-sm rounded-2xl p-8"
            >
              <div className="text-red-200 text-center mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xl font-bold mb-2">Connection Error</p>
                <p className="text-base">{connectionError}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="bg-white text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Refresh Page
              </motion.button>
            </motion.div>
          ) : socket && !isConnecting ? (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <GameBoard
                gridSize={gridSize}
                playerId={playerId}
                socket={socket}
                currentPlayer={currentPlayer}
                players={players}
                scores={scores}
                gameStatus={gameStatus}
              />
            </motion.div>
          ) : (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[400px]"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white border-t-transparent rounded-full mb-4"
              />
              <p className="text-white text-lg sm:text-xl font-semibold">
                Connecting to server...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
