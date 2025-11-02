# Deployment Guide for XOX Multiplayer Game

Since Vercel uses serverless functions which don't support WebSocket connections, you need to deploy the Socket.io server separately.

## Quick Setup

### Option 1: Deploy Socket Server to Railway (Recommended - Free tier available)

1. **Create a new project on Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign up/login
   - Click "New Project"
   - Select "Empty Project"

2. **Deploy the Socket Server:**
   - In Railway dashboard, click "Add Service"
   - Connect your GitHub repo (or upload the `socket-server.js` file)
   - Set the root directory to your project root
   - Add environment variable:
     - `CLIENT_URL`: Your Vercel deployment URL (e.g., `https://xox-game-roan.vercel.app`)
     - `PORT`: Railway will set this automatically
   - Railway will automatically detect Node.js and install dependencies
   - Make sure `socket-server.js` is in the root directory
   - Add a `package.json` with Socket.io dependency (or use the provided `socket-server-package.json`)

3. **Get your Socket Server URL:**
   - Railway will provide a URL like `https://your-app.up.railway.app`
   - Copy this URL

4. **Update Vercel Environment Variables:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add: `NEXT_PUBLIC_SOCKET_URL` = `https://your-app.up.railway.app`
   - Redeploy your Vercel app

### Option 2: Deploy Socket Server to Render (Free tier available)

1. **Create a new Web Service on Render:**
   - Go to [render.com](https://render.com)
   - Sign up/login
   - Click "New +" → "Web Service"
   - Connect your GitHub repo

2. **Configure the service:**
   - Build Command: Leave empty (or `npm install`)
   - Start Command: `node socket-server.js`
   - Environment Variables:
     - `CLIENT_URL`: Your Vercel URL
     - `NODE_ENV`: `production`

3. **Get your Socket Server URL and add to Vercel** (same as Railway steps above)

### Option 3: Deploy Socket Server to Heroku

1. **Create a new Heroku app:**
   ```bash
   heroku create your-socket-server
   ```

2. **Deploy:**
   ```bash
   git subtree push --prefix . heroku main
   # Or use Heroku CLI to deploy
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set CLIENT_URL=https://your-vercel-app.vercel.app
   ```

4. **Update Vercel with Heroku URL**

## Local Development

For local development, you can run both servers:

1. **Terminal 1 - Next.js Frontend:**
   ```bash
   npm run dev
   ```

2. **Terminal 2 - Socket.io Server:**
   ```bash
   node socket-server.js
   ```

3. **Set local environment variable:**
   Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

## Environment Variables

### Socket Server (.env or platform settings):
- `CLIENT_URL`: Your frontend URL (Vercel deployment URL)
- `PORT`: Server port (automatically set by hosting platform)

### Vercel (Environment Variables in dashboard):
- `NEXT_PUBLIC_SOCKET_URL`: Your Socket.io server URL (Railway/Render/Heroku URL)

## Troubleshooting

### Connection Errors:
1. **Check CORS settings:** Make sure `CLIENT_URL` in Socket server matches your Vercel URL exactly
2. **Check environment variables:** Verify `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
3. **Check firewall:** Some platforms block WebSocket connections - ensure your hosting platform allows WebSockets
4. **Use polling fallback:** The client is configured to fall back to polling if WebSocket fails

### Testing Connection:
Open browser console and check for:
- "Connected to server" message = Success
- WebSocket connection errors = Check server URL and CORS settings

## File Structure

```
xox-game/
├── socket-server.js          # Standalone Socket.io server (deploy separately)
├── socket-server-package.json # Package.json for Socket server
├── server.js                 # Combined server (for local dev only)
├── pages/
│   └── game.js              # Client connects to NEXT_PUBLIC_SOCKET_URL
└── ...
```

## Notes

- The Socket server must be running continuously (not serverless)
- Make sure your Socket server hosting platform supports WebSocket connections
- Railway and Render both support WebSockets on their free tiers
- Vercel only hosts the frontend; the Socket server must be hosted elsewhere

