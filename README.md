# XOX Multiplayer Game

A multiplayer Tic-Tac-Toe (XOX) game built with Next.js, JavaScript, and Tailwind CSS. Features custom grid sizes and real-time multiplayer gameplay.

## Features

- 🎮 Multiplayer gameplay with Socket.io
- 📐 Customizable grid sizes (3x3 to 10x10)
- 🏆 Scoring system - earn points for completing lines (diagonal, vertical, horizontal)
- 💅 Modern UI with Tailwind CSS
- ⚡ Real-time updates

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server (includes both Next.js and Socket.io server):

```bash
npm run dev
```

The app will be available at:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Socket Server: [http://localhost:3001](http://localhost:3001)

### How to Play

1. Enter your name and select a grid size (3x3 to 10x10)
2. Click "Start Game" to join
3. Wait for another player to join (or open another browser tab)
4. Take turns placing X or O on the grid
5. Earn points by completing lines (horizontal, vertical, or diagonal)
6. Each completed line awards 1 point and clears that line

## Project Structure

```
xox-game/
├── components/
│   └── GameBoard.js      # Game board component
├── pages/
│   ├── _app.js           # Next.js app wrapper
│   ├── index.js          # Home page with game setup
│   └── game.js           # Game page
├── styles/
│   └── globals.css       # Global styles with Tailwind
└── server.js             # Socket.io server

```

## Technologies

- **Next.js** - React framework
- **Socket.io** - Real-time multiplayer communication
- **Tailwind CSS** - Utility-first CSS framework
- **JavaScript** - No TypeScript

## Scoring System

Players earn 1 point for each completed line:
- Horizontal lines
- Vertical lines  
- Main diagonal (top-left to bottom-right)
- Anti-diagonal (top-right to bottom-left)

When a player completes a line, they gain points and that line is cleared, making those cells available again for future moves.
