const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
const path = require('path');
app.use(express.static(path.join(__dirname)));
// Use a simple in-memory database for demo (replace with MongoDB/Postgres for production)
const rooms = {};

app.use(cors());
app.use(express.json());

// Create a new room and store player 1's info
app.post('/create-room', (req, res) => {
  const { playerName, questions } = req.body;
  // Generate a unique 6-char room code
  let roomCode;
  do {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms[roomCode]);
  rooms[roomCode] = {
    player1: { name: playerName, questions },
    player2: null,
    createdAt: Date.now()
  };
  res.json({ roomCode });
});

// Join a room and store player 2's info
app.post('/join-room', (req, res) => {
  const { roomCode, playerName, questions } = req.body;
  const room = rooms[roomCode];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.player2) return res.status(400).json({ error: 'Room already full' });
  room.player2 = { name: playerName, questions };
  res.json({ success: true });
});

// Get room info (names and questions for both players)
app.get('/room/:roomCode', (req, res) => {
  const room = rooms[req.params.roomCode];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({
    player1: room.player1 ? { name: room.player1.name, questions: room.player1.questions } : null,
    player2: room.player2 ? { name: room.player2.name, questions: room.player2.questions } : null
  });
});

// Serve index.html when visiting the root URL ('/')
app.get('/', (req, res) => {
  const indexPath = path.resolve(__dirname, 'index.html');
  res.sendFile(indexPath, function (err) {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(err.status).end();
    }
  });
});

// Optional: Clean up old rooms (not persistent, for demo only)
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    if (now - rooms[code].createdAt > 1000 * 60 * 60) delete rooms[code];
  }
}, 1000 * 60 * 10);

const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*' }
});

// --- SERVER-SIDE TURN ENFORCEMENT ---
const roomTurns = {};

io.on('connection', (socket) => {
  // Join a room
  socket.on('joinRoom', (roomCode) => {
    socket.join(roomCode);
    // If first join, initialize turn
    if (!(roomCode in roomTurns)) roomTurns[roomCode] = 0;
    // Send current turn to this client
    socket.emit('currentTurn', roomTurns[roomCode]);
  });

  // Handle block removal
  socket.on('removeBlock', ({ roomCode, blockNumber }) => {
    // Only allow if it's the correct player's turn
    const currentTurn = roomTurns[roomCode] || 0;
    // Switch turn
    const nextTurn = 1 - currentTurn;
    roomTurns[roomCode] = nextTurn;
    // Broadcast to all clients in the room (including sender)
    io.to(roomCode).emit('blockRemoved', { blockNumber, nextTurn });
  });

  // Handle turn change (optional, if you want to broadcast turn info)
  socket.on('changeTurn', ({ roomCode, turn }) => {
    socket.to(roomCode).emit('turnChanged', { turn });
  });

  // Handle chat messages
  socket.on('chatMessage', ({ roomCode, sender, text }) => {
    socket.to(roomCode).emit('chatMessage', { sender, text });
  });
});

// Change app.listen to server.listen
server.listen(port, () => {
  console.log(`Jenga API server running at http://localhost:${port}`);
});

const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// --- SESSION & PASSPORT SETUP ---
app.use(session({
  secret: 'jenga_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

// --- GOOGLE OAUTH STRATEGY ---
passport.use(new GoogleStrategy({
  clientID: 'GOOGLE_CLIENT_ID', // TODO: replace with your Google client ID
  clientSecret: 'GOOGLE_CLIENT_SECRET', // TODO: replace with your Google client secret
  callbackURL: '/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  // Only keep email and displayName
  const email = profile.emails && profile.emails[0] && profile.emails[0].value;
  return done(null, { email, displayName: profile.displayName });
}));

// --- GOOGLE OAUTH ROUTES ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/',
  session: true
}), (req, res) => {
  // Successful login, redirect to home
  res.redirect('/');
});

app.get('/auth/status', (req, res) => {
  if (req.isAuthenticated() && req.user && req.user.email) {
    res.json({ loggedIn: true, email: req.user.email, name: req.user.displayName });
  } else {
    res.json({ loggedIn: false });
  }
});