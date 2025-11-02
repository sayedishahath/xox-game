# Quick Fix for Vercel WebSocket Error

## The Problem
Vercel uses serverless functions which don't support WebSocket connections. You need to deploy the Socket.io server separately.

## Quick Solution (5 minutes)

### Step 1: Deploy Socket Server to Railway (Free)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Empty Project"
3. Click "Add Service" → "GitHub Repo" (connect your repo)
4. In Railway settings:
   - **Root Directory**: Leave as root
   - **Start Command**: `node socket-server.js`
   - Add Environment Variable:
     - Key: `CLIENT_URL`
     - Value: `https://xox-game-roan.vercel.app` (your Vercel URL)
5. Railway will deploy and give you a URL like `https://your-app.up.railway.app`

### Step 2: Update Vercel Environment Variable

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add new variable:
   - **Key**: `NEXT_PUBLIC_SOCKET_URL`
   - **Value**: Your Railway URL (e.g., `https://your-app.up.railway.app`)
   - **Environments**: Production, Preview, Development (select all)
4. Click "Save"
5. Go to Deployments → Click "..." on latest deployment → "Redeploy"

### Step 3: Test

1. Visit your Vercel app
2. Open browser console (F12)
3. You should see "Connected to server" instead of WebSocket errors

## Alternative: Render.com (Free)

**IMPORTANT**: If you get build errors about Next.js, follow these EXACT steps:

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure with these EXACT settings:
   - **Name**: `xox-socket-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install socket.io --save` ⚠️ **This is critical!**
   - **Start Command**: `node socket-server.js`
   - **Environment Variables**:
     - `CLIENT_URL` = `https://xox-game-roan.vercel.app`
5. Copy the Render URL and add it to Vercel as `NEXT_PUBLIC_SOCKET_URL`

**If you already created the service and it's failing:**
- Go to your Render service → Settings
- Update the **Build Command** to: `npm install socket.io --save`
- Click "Save Changes" → It will redeploy automatically

## Important Files

- `socket-server.js` - Deploy this to Railway/Render (NOT to Vercel)
- `pages/game.js` - Already updated to use `NEXT_PUBLIC_SOCKET_URL`
- Vercel only needs the frontend code

## Still Having Issues?

1. Check that `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
2. Verify your Socket server is running (check Railway/Render logs)
3. Make sure `CLIENT_URL` in Socket server matches your Vercel URL exactly
4. Check browser console for specific error messages

