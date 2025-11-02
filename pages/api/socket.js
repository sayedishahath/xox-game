// This file is kept for API routing, but Socket.io runs on a separate server
export default function handler(req, res) {
  res.status(200).json({ message: 'Socket server is running separately' })
}

