const { createServer } = require('http')
const { Server } = require('socket.io')

const port = process.env.PORT || 3001

// Game state management
const games = new Map()

function createGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getLineIndices(board, gridSize, start, step, symbol) {
  const indices = []
  for (let i = 0; i < gridSize; i++) {
    const index = start + step * i
    if (board[index] === symbol) {
      indices.push(index)
    }
  }
  // Return indices only if all cells in the line match
  return indices.length === gridSize ? indices : []
}

function checkWin(board, gridSize, symbol, lastIndex) {
  const row = Math.floor(lastIndex / gridSize)
  const col = lastIndex % gridSize
  const winningLines = [] // Array of {type, indices}

  // Check horizontal
  const horizontalStart = row * gridSize
  const horizontalIndices = getLineIndices(board, gridSize, horizontalStart, 1, symbol)
  if (horizontalIndices.length === gridSize) {
    winningLines.push({ type: 'horizontal', indices: horizontalIndices })
  }

  // Check vertical
  const verticalStart = col
  const verticalIndices = getLineIndices(board, gridSize, verticalStart, gridSize, symbol)
  if (verticalIndices.length === gridSize) {
    winningLines.push({ type: 'vertical', indices: verticalIndices })
  }

  // Check main diagonal (top-left to bottom-right)
  if (row === col) {
    const diagonalMainIndices = getLineIndices(board, gridSize, 0, gridSize + 1, symbol)
    if (diagonalMainIndices.length === gridSize) {
      winningLines.push({ type: 'diagonal-main', indices: diagonalMainIndices })
    }
  }

  // Check anti-diagonal (top-right to bottom-left)
  if (row + col === gridSize - 1) {
    const diagonalAntiIndices = getLineIndices(board, gridSize, gridSize - 1, gridSize - 1, symbol)
    if (diagonalAntiIndices.length === gridSize) {
      winningLines.push({ type: 'diagonal-anti', indices: diagonalAntiIndices })
    }
  }

  return winningLines
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
    
    // Collect all winning cell indices for animation
    const allWinningIndices = []
    winningLines.forEach(line => {
      allWinningIndices.push(...line.indices)
    })
    
    if (winningLines.length > 0) {
      // Award point for each winning line
      game.scores[playerId] = (game.scores[playerId] || 0) + winningLines.length
      
      // Emit score update with winning indices BEFORE clearing
      console.log(`Score update: Player ${playerId} scored ${winningLines.length} point(s). New scores:`, game.scores)
      io.to(game.id).emit('scoreUpdate', {
        scores: game.scores,
        playerId,
        lines: winningLines.map(l => l.type),
        winningIndices: allWinningIndices, // Send indices for animation
      })
      
      // Wait a bit before clearing to allow animation (we'll clear after animation)
      // For now, clear immediately but send indices for client-side animation
      
      // Clear the winning lines (set to null) after a delay
      setTimeout(() => {
        winningLines.forEach(line => {
          line.indices.forEach(cellIndex => {
            game.board[cellIndex] = null
          })
        })
        
        // Emit updated board after clearing
        io.to(game.id).emit('boardUpdate', {
          board: game.board,
        })
      }, 2000) // 2 seconds for animation
    }

    // Switch turn
    game.currentPlayer = game.players.find((p) => p.id !== playerId).id

    // Send updated game state (but don't clear board yet if there's a win - wait for animation)
    const boardToSend = winningLines.length > 0 ? [...game.board] : game.board
    
    io.to(game.id).emit('moveResult', {
      success: true,
      board: boardToSend,
      currentPlayer: game.currentPlayer,
      status: game.status,
      scores: game.scores, // Include scores in moveResult too
      winningIndices: allWinningIndices.length > 0 ? allWinningIndices : undefined,
    })

    io.to(game.id).emit('gameUpdate', {
      players: game.players,
      currentPlayer: game.currentPlayer,
      scores: game.scores,
      status: game.status,
    })

    // Log for debugging
    console.log(`Move by ${playerId}: Scores updated:`, game.scores)
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

