# Score Update Flow Explanation

## Current Flow:

### 1. **Server Side (socket-server.js):**
   - When a player makes a move → `socket.on('makeMove')` handler
   - Step 1: Place symbol on board: `game.board[index] = player.symbol`
   - Step 2: Check for wins: `const winningLines = checkWin(...)`
   - Step 3: If wins found:
     ```javascript
     game.scores[playerId] = (game.scores[playerId] || 0) + winningLines.length
     io.to(game.id).emit('scoreUpdate', {
       scores: { ...game.scores },
       playerId,
       winningIndices: [...]
     })
     ```
   - Step 4: Always emit `moveResult` with scores:
     ```javascript
     io.to(game.id).emit('moveResult', {
       scores: game.scores,
       ...
     })
     ```
   - Step 5: Always emit `gameUpdate` with scores:
     ```javascript
     io.to(game.id).emit('gameUpdate', {
       scores: game.scores,
       ...
     })
     ```

### 2. **Client Side (pages/game.js):**
   - Listens to `scoreUpdate` → calls `setScores({ ...scoreData.scores })`
   - Listens to `gameUpdate` → calls `setScores(gameData.scores)`
   - Scores state is passed as prop to GameBoard

### 3. **GameBoard Component:**
   - Receives `scores` prop
   - Displays: `scores[player.id] || 0`

## Potential Issues:
1. `moveResult` includes scores but `game.js` doesn't listen to it for scores
2. Scores might be getting overwritten
3. Win detection might not be working

