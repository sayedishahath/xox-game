const { createServer } = require('http')
const { Server } = require('socket.io')

const port = process.env.PORT || 3001

// Game state management
const games = new Map()

function createGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function checkLine(board, gridSize, start, step, symbol) {
  let count = 0
  for (let i = 0; i < gridSize; i++) {
    const index = start + step * i
    if (board[index] === symbol) {
      count++
    }
  }
  return count === gridSize
}

function checkWin(board, gridSize, symbol, lastIndex) {
  const row = Math.floor(lastIndex / gridSize)
  const col = lastIndex % gridSize
  const lines = []

  // Check horizontal
  const horizontalStart = row * gridSize
  if (checkLine(board, gridSize, horizontalStart, 1, symbol)) {
    lines.push('horizontal')
  }

  // Check vertical
  const verticalStart = col
  if (checkLine(board, gridSize, verticalStart, gridSize, symbol)) {
    lines.push('vertical')
  }

  // Check main diagonal (top-left to bottom-right)
  if (row === col) {
    if (checkLine(board, gridSize, 0, gridSize + 1, symbol)) {
      lines.push('diagonal-main')
    }
  }

  // Check anti-diagonal (top-right to bottom-left)
  if (row + col === gridSize - 1) {
    if (checkLine(board, gridSize, gridSize - 1, gridSize - 1, symbol)) {
      lines.push('diagonal-anti')
    }
  }

  return lines
}

const server = createServer()

// Socket.IO server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id)

  socket.on('joinGame', ({ playerName, gridSize }) => {
    // Find an available game or create a new one
    let game = null
    for (const [gameId, gameData] of games.entries()) {
      if (gameData.players.length < 2 && gameData.gridSize === gridSize) {
        game = gameData
        break
      }
    }

    if (!game) {
      // Create new game
      const gameId = createGameId()
      game = {
        id: gameId,
        gridSize,
        board: Array(gridSize * gridSize).fill(null),
        players: [],
        currentPlayer: null,
        scores: {},
        status: 'waiting',
      }
      games.set(gameId, game)
    }

    const player = {
      id: socket.id,
      name: playerName,
      symbol: game.players.length === 0 ? 'X' : 'O',
    }

    game.players.push(player)
    game.scores[socket.id] = 0
    socket.join(game.id)

    // Notify player of their symbol
    socket.emit('playerSymbol', player.symbol)

    // If we have 2 players, start the game
    if (game.players.length === 2) {
      game.status = 'playing'
      game.currentPlayer = game.players[0].id
    }

    // Send game state to all players in the room
    io.to(game.id).emit('playerJoined', {
      players: game.players,
      currentPlayer: game.currentPlayer,
      scores: game.scores,
      status: game.status,
    })

    socket.emit('gameState', {
      board: game.board,
      currentPlayer: game.currentPlayer,
      status: game.status,
    })

    socket.gameId = game.id
  })

  socket.on('makeMove', ({ index, playerId }) => {
    const game = Array.from(games.values()).find((g) => g.id === socket.gameId)
    if (!game || game.status !== 'playing') return

    if (game.currentPlayer !== playerId) {
      socket.emit('moveResult', { success: false, message: 'Not your turn' })
      return
    }

    if (game.board[index] !== null) {
      socket.emit('moveResult', { success: false, message: 'Cell already taken' })
      return
    }

    const player = game.players.find((p) => p.id === playerId)
    if (!player) return

    game.board[index] = player.symbol

    // Check for wins
    const winningLines = checkWin(game.board, game.gridSize, player.symbol, index)
    
    if (winningLines.length > 0) {
      // Award point for each winning line
      game.scores[playerId] = (game.scores[playerId] || 0) + winningLines.length
      
      // Clear the winning lines (set to null)
      const row = Math.floor(index / game.gridSize)
      const col = index % game.gridSize
      
      if (winningLines.includes('horizontal')) {
        for (let i = 0; i < game.gridSize; i++) {
          game.board[row * game.gridSize + i] = null
        }
      }
      if (winningLines.includes('vertical')) {
        for (let i = 0; i < game.gridSize; i++) {
          game.board[i * game.gridSize + col] = null
        }
      }
      if (winningLines.includes('diagonal-main')) {
        for (let i = 0; i < game.gridSize; i++) {
          game.board[i * game.gridSize + i] = null
        }
      }
      if (winningLines.includes('diagonal-anti')) {
        for (let i = 0; i < game.gridSize; i++) {
          game.board[i * game.gridSize + (game.gridSize - 1 - i)] = null
        }
      }

      // Emit score update
      io.to(game.id).emit('scoreUpdate', {
        scores: game.scores,
        playerId,
        lines: winningLines,
      })
    }

    // Switch turn
    game.currentPlayer = game.players.find((p) => p.id !== playerId).id

    // Send updated game state
    io.to(game.id).emit('moveResult', {
      success: true,
      board: game.board,
      currentPlayer: game.currentPlayer,
      status: game.status,
    })

    io.to(game.id).emit('gameUpdate', {
      players: game.players,
      currentPlayer: game.currentPlayer,
      scores: game.scores,
      status: game.status,
    })
  })

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id)
    const game = Array.from(games.values()).find((g) => g.id === socket.gameId)
    if (game) {
      game.players = game.players.filter((p) => p.id !== socket.id)
      if (game.players.length === 0) {
        games.delete(game.id)
      } else {
        // Notify remaining player
        io.to(game.id).emit('playerLeft', { playerId: socket.id })
      }
    }
  })
})

server.listen(port, () => {
  console.log(`Socket.io server running on port ${port}`)
  console.log(`CORS enabled for: ${process.env.CLIENT_URL || 'all origins'}`)
})

