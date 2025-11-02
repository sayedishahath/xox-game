const { createServer } = require('http')
const { Server } = require('socket.io')

const port = process.env.PORT || 3001

// Game state management
const games = new Map()

function createGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Check for X-O-X or O-X-O pattern (alternating pattern)
function checkXOXPattern(board, gridSize, start, step) {
  const pattern = []
  
  // Check the entire line for X-O-X or O-X-O pattern
  for (let i = 0; i < gridSize; i++) {
    const index = start + step * i
    if (index >= 0 && index < board.length) {
      pattern.push({ index, symbol: board[index] })
    }
  }
  
  // Check for X-O-X pattern (alternating starting with X)
  for (let i = 0; i <= pattern.length - 3; i++) {
    const three = pattern.slice(i, i + 3)
    if (three[0].symbol === 'X' && three[1].symbol === 'O' && three[2].symbol === 'X') {
      return {
        type: 'XOX',
        indices: three.map(cell => cell.index),
        completingSymbol: 'X' // Last X completes the pattern
      }
    }
  }
  
  // Check for O-X-O pattern (alternating starting with O)
  for (let i = 0; i <= pattern.length - 3; i++) {
    const three = pattern.slice(i, i + 3)
    if (three[0].symbol === 'O' && three[1].symbol === 'X' && three[2].symbol === 'O') {
      return {
        type: 'OXO',
        indices: three.map(cell => cell.index),
        completingSymbol: 'O' // Last O completes the pattern
      }
    }
  }
  
  return null
}

function checkWin(board, gridSize, symbol, lastIndex) {
  const row = Math.floor(lastIndex / gridSize)
  const col = lastIndex % gridSize
  const winningLines = [] // Array of {type, indices, completingSymbol}

  console.log(`\n🔎 Checking XOX pattern for symbol '${symbol}' at position (${row}, ${col}) = index ${lastIndex}`)

  // Check horizontal - check the row containing the last move
  const horizontalStart = row * gridSize
  const horizontalPattern = checkXOXPattern(board, gridSize, horizontalStart, 1)
  console.log(`   Horizontal row ${row}: checking indices ${horizontalStart} to ${horizontalStart + gridSize - 1}`)
  if (horizontalPattern && horizontalPattern.completingSymbol === symbol) {
    console.log(`   ✅ HORIZONTAL XOX pattern detected: ${horizontalPattern.type}`)
    winningLines.push({ 
      type: 'horizontal', 
      indices: horizontalPattern.indices,
      patternType: horizontalPattern.type
    })
  }

  // Check vertical - check the column containing the last move
  const verticalStart = col
  const verticalPattern = checkXOXPattern(board, gridSize, verticalStart, gridSize)
  console.log(`   Vertical col ${col}: checking indices`, Array.from({ length: gridSize }, (_, i) => verticalStart + i * gridSize))
  if (verticalPattern && verticalPattern.completingSymbol === symbol) {
    console.log(`   ✅ VERTICAL XOX pattern detected: ${verticalPattern.type}`)
    winningLines.push({ 
      type: 'vertical', 
      indices: verticalPattern.indices,
      patternType: verticalPattern.type
    })
  }

  // Check main diagonal (top-left to bottom-right)
  const diagonalMainStart = 0
  const diagonalMainStep = gridSize + 1
  const diagonalMainPattern = checkXOXPattern(board, gridSize, diagonalMainStart, diagonalMainStep)
  console.log(`   Main diagonal: checking indices`, Array.from({ length: gridSize }, (_, i) => diagonalMainStart + i * diagonalMainStep))
  if (diagonalMainPattern && diagonalMainPattern.completingSymbol === symbol) {
    console.log(`   ✅ MAIN DIAGONAL XOX pattern detected: ${diagonalMainPattern.type}`)
    winningLines.push({ 
      type: 'diagonal-main', 
      indices: diagonalMainPattern.indices,
      patternType: diagonalMainPattern.type
    })
  }

  // Check anti-diagonal (top-right to bottom-left)
  const diagonalAntiStart = gridSize - 1
  const diagonalAntiStep = gridSize - 1
  const diagonalAntiPattern = checkXOXPattern(board, gridSize, diagonalAntiStart, diagonalAntiStep)
  console.log(`   Anti-diagonal: checking indices`, Array.from({ length: gridSize }, (_, i) => diagonalAntiStart + i * diagonalAntiStep))
  if (diagonalAntiPattern && diagonalAntiPattern.completingSymbol === symbol) {
    console.log(`   ✅ ANTI-DIAGONAL XOX pattern detected: ${diagonalAntiPattern.type}`)
    winningLines.push({ 
      type: 'diagonal-anti', 
      indices: diagonalAntiPattern.indices,
      patternType: diagonalAntiPattern.type
    })
  }

  console.log(`   Total XOX patterns found: ${winningLines.length}`)
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
    
    console.log(`\n🔍 Checking win for player ${playerId}, symbol ${player.symbol}, at index ${index}`)
    console.log(`   Board:`, game.board.map((cell, i) => cell || '.').join(' '))
    console.log(`   Winning lines found:`, winningLines.length, winningLines)
    
    // Collect all winning cell indices for animation (remove duplicates)
    const allWinningIndices = []
    const uniqueIndices = new Set()
    winningLines.forEach(line => {
      line.indices.forEach(idx => {
        if (!uniqueIndices.has(idx)) {
          uniqueIndices.add(idx)
          allWinningIndices.push(idx)
        }
      })
    })
    
    if (winningLines.length > 0) {
      // Award point for each winning line
      const oldScore = game.scores[playerId] || 0
      game.scores[playerId] = oldScore + winningLines.length
      
      console.log(`\n✅ WIN DETECTED! Player ${playerId} (${player.name}) scored ${winningLines.length} point(s)`)
      console.log(`   Old score: ${oldScore}, New score: ${game.scores[playerId]}`)
      console.log(`   Winning indices:`, allWinningIndices)
      console.log(`   All scores:`, JSON.stringify(game.scores))
      
      // Emit score update with winning indices (cells stay on board)
      io.to(game.id).emit('scoreUpdate', {
        scores: { ...game.scores }, // Send a copy to ensure it's fresh
        playerId,
        lines: winningLines.map(l => l.type),
        winningIndices: [...allWinningIndices], // Send copy of array
      })
      
      // Note: Cells are NOT cleared - they remain on board with strike-through
    }

    // Switch turn
    game.currentPlayer = game.players.find((p) => p.id !== playerId).id

    // Send updated game state (cells stay on board even after scoring)
    console.log(`\n📤 Emitting moveResult with scores:`, JSON.stringify(game.scores))
    io.to(game.id).emit('moveResult', {
      success: true,
      board: game.board, // Board stays as-is, cells are not cleared
      currentPlayer: game.currentPlayer,
      status: game.status,
      scores: { ...game.scores }, // Include scores in moveResult too (force copy)
      winningIndices: allWinningIndices.length > 0 ? allWinningIndices : undefined,
    })

    console.log(`📤 Emitting gameUpdate with scores:`, JSON.stringify(game.scores))
    io.to(game.id).emit('gameUpdate', {
      players: game.players,
      currentPlayer: game.currentPlayer,
      scores: { ...game.scores }, // Force copy to ensure fresh data
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

