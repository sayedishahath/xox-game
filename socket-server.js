const { createServer } = require('http')
const { Server } = require('socket.io')

const port = process.env.PORT || 3001

// Game state management
const games = new Map()

function createGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Check for 3 consecutive matching symbols (XOX requirement)
function getConsecutiveLineIndices(board, gridSize, start, step, symbol, requiredLength = 3) {
  let currentSequence = []
  
  // Check the entire line and find consecutive sequences
  for (let i = 0; i < gridSize; i++) {
    const index = start + step * i
    if (index >= 0 && index < board.length) {
      if (board[index] === symbol) {
        currentSequence.push(index)
        // If we found enough consecutive symbols, return them
        if (currentSequence.length >= requiredLength) {
          return currentSequence.slice(0, requiredLength) // Return exactly requiredLength
        }
      } else {
        // Reset if we find a non-matching cell (break in sequence)
        currentSequence = []
      }
    }
  }
  
  return []
}

// Legacy function kept for compatibility (checks entire line)
function getLineIndices(board, gridSize, start, step, symbol) {
  return getConsecutiveLineIndices(board, gridSize, start, step, symbol, gridSize)
}

function checkWin(board, gridSize, symbol, lastIndex) {
  const row = Math.floor(lastIndex / gridSize)
  const col = lastIndex % gridSize
  const winningLines = [] // Array of {type, indices}

  console.log(`\n🔎 Checking win for symbol '${symbol}' at position (${row}, ${col}) = index ${lastIndex}`)

  // Check for 3 consecutive symbols (XOX requirement) in each direction
  const requiredLength = 3

  // Check horizontal - check the row containing the last move for 3 consecutive
  const horizontalStart = row * gridSize
  const horizontalIndices = getConsecutiveLineIndices(board, gridSize, horizontalStart, 1, symbol, requiredLength)
  console.log(`   Horizontal row ${row}: checking indices ${horizontalStart} to ${horizontalStart + gridSize - 1}`)
  console.log(`   Horizontal indices found:`, horizontalIndices)
  if (horizontalIndices.length >= requiredLength) {
    console.log(`   ✅ HORIZONTAL WIN detected in row ${row} with ${horizontalIndices.length} consecutive`)
    // Only take the first 3 consecutive indices
    winningLines.push({ type: 'horizontal', indices: horizontalIndices.slice(0, requiredLength) })
  }

  // Check vertical - check the column containing the last move for 3 consecutive
  const verticalStart = col
  const verticalIndices = getConsecutiveLineIndices(board, gridSize, verticalStart, gridSize, symbol, requiredLength)
  console.log(`   Vertical col ${col}: checking indices`, Array.from({ length: gridSize }, (_, i) => verticalStart + i * gridSize))
  console.log(`   Vertical indices found:`, verticalIndices)
  if (verticalIndices.length >= requiredLength) {
    console.log(`   ✅ VERTICAL WIN detected in column ${col} with ${verticalIndices.length} consecutive`)
    winningLines.push({ type: 'vertical', indices: verticalIndices.slice(0, requiredLength) })
  }

  // Check main diagonal (top-left to bottom-right) - check if last move is on or near this diagonal
  // Check if there are 3 consecutive on the main diagonal
  const diagonalMainStart = 0
  const diagonalMainStep = gridSize + 1
  const diagonalMainIndices = getConsecutiveLineIndices(board, gridSize, diagonalMainStart, diagonalMainStep, symbol, requiredLength)
  console.log(`   Main diagonal: checking indices`, Array.from({ length: gridSize }, (_, i) => diagonalMainStart + i * diagonalMainStep))
  console.log(`   Main diagonal indices found:`, diagonalMainIndices)
  if (diagonalMainIndices.length >= requiredLength) {
    console.log(`   ✅ MAIN DIAGONAL WIN detected with ${diagonalMainIndices.length} consecutive`)
    winningLines.push({ type: 'diagonal-main', indices: diagonalMainIndices.slice(0, requiredLength) })
  }

  // Check anti-diagonal (top-right to bottom-left) - check if there are 3 consecutive
  const diagonalAntiStart = gridSize - 1
  const diagonalAntiStep = gridSize - 1
  const diagonalAntiIndices = getConsecutiveLineIndices(board, gridSize, diagonalAntiStart, diagonalAntiStep, symbol, requiredLength)
  console.log(`   Anti-diagonal: checking indices`, Array.from({ length: gridSize }, (_, i) => diagonalAntiStart + i * diagonalAntiStep))
  console.log(`   Anti-diagonal indices found:`, diagonalAntiIndices)
  if (diagonalAntiIndices.length >= requiredLength) {
    console.log(`   ✅ ANTI-DIAGONAL WIN detected with ${diagonalAntiIndices.length} consecutive`)
    winningLines.push({ type: 'diagonal-anti', indices: diagonalAntiIndices.slice(0, requiredLength) })
  }

  console.log(`   Total winning lines found: ${winningLines.length}`)
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
      
      // Emit score update with winning indices BEFORE clearing
      io.to(game.id).emit('scoreUpdate', {
        scores: { ...game.scores }, // Send a copy to ensure it's fresh
        playerId,
        lines: winningLines.map(l => l.type),
        winningIndices: [...allWinningIndices], // Send copy of array
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
    
    console.log(`\n📤 Emitting moveResult with scores:`, JSON.stringify(game.scores))
    io.to(game.id).emit('moveResult', {
      success: true,
      board: boardToSend,
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

