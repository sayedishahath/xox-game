# Fix for Render Deployment Error

## The Problem
Render is trying to build Next.js when deploying the Socket server, but the Socket server only needs Socket.io.

## Quick Fix (Manual Configuration)

In your Render dashboard, update these settings:

### Build & Deploy Settings:
1. **Build Command**: 
   ```
   npm install socket.io --save
   ```
   (This installs only Socket.io, skipping Next.js)

2. **Start Command**: 
   ```
   node socket-server.js
   ```

3. **Environment Variables**:
   - `CLIENT_URL` = `https://xox-game-roan.vercel.app` (your Vercel URL)
   - `NODE_ENV` = `production` (optional)

### Important Settings:
- **Root Directory**: Leave empty (or `/`)
- **Auto-Deploy**: Yes
- **Pull Request Previews**: Optional

## Alternative: Delete and Redeploy

If the above doesn't work:

1. **Delete the current service** in Render dashboard
2. **Create a new Web Service**
3. **Connect your GitHub repo**
4. **Set these EXACT settings:**

   ```
   Name: xox-socket-server
   Environment: Node
   Region: (closest to you)
   Branch: main
   Root Directory: (leave empty)
   Build Command: npm install socket.io --save
   Start Command: node socket-server.js
   ```

5. **Add Environment Variables:**
   - `CLIENT_URL` = Your Vercel URL
   
6. **Click "Create Web Service"**

## Verify It Works

After deployment:
1. Check the Render logs - you should see "Socket.io server running on port..."
2. Copy the Render URL (e.g., `https://xox-socket-server.onrender.com`)
3. Add it to Vercel as `NEXT_PUBLIC_SOCKET_URL`
4. Test your game - the WebSocket connection should work!

## Still Having Issues?

If you still get build errors:

1. **Option 1**: Use Railway instead (simpler setup)
   - Follow instructions in `QUICK-FIX.md`

2. **Option 2**: Create a separate branch for Socket server
   - Create a new branch with only `socket-server.js` and minimal package.json
   - Deploy that branch to Render

3. **Option 3**: Contact Render support
   - They can help configure the build process

