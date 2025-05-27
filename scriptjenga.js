const tower = document.getElementById('jenga-tower');
const rows = 15;  // now 15 rows
const blocksPerRow = 3;
const blockWidth = 60;
const blockHeight = 12;
// Arrays for each player's questions (populated from localStorage)
let player1Questions = [];
let player2Questions = [];

// Determine player mode and load questions from localStorage
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');

if (mode === 'join') {
  // Player 2 joining: their questions are in 'jenga_questions', opponent's in 'jenga_opponent_questions'
  try {
    player2Questions = JSON.parse(localStorage.getItem('jenga_questions')) || [];
    player1Questions = JSON.parse(localStorage.getItem('jenga_opponent_questions')) || [];
  } catch {
    player2Questions = [];
    player1Questions = [];
  }
} else {
  // Player 1: their questions are in 'jenga_questions', opponent's in 'jenga_opponent_questions'
  try {
    player1Questions = JSON.parse(localStorage.getItem('jenga_questions')) || [];
    player2Questions = JSON.parse(localStorage.getItem('jenga_opponent_questions')) || [];
  } catch {
    player1Questions = [];
    player2Questions = [];
  }
}

// Add Socket.IO client connection
let socket;
// Use existing urlParams and roomCode if already declared
if (typeof io !== 'undefined') {
  // roomCode is already set above in the file
  socket = io();
  if (typeof roomCode === 'undefined') {
    roomCode = urlParams.get('room') || localStorage.getItem('jenga_room_code') || '';
  }
  if (roomCode) {
    socket.emit('joinRoom', roomCode);
  }
}

function createTower() {
  let blockNumber = 1;
  const blockWidth = 80; // match CSS
  const blockHeight = 22; // match CSS
  const gap = 2; // small gap between blocks
  for (let i = 0; i < rows; i++) {
    const isEvenRow = i % 2 === 0;
    for (let j = 0; j < blocksPerRow; j++) {
      if (blockNumber > 45) break;
      // Create wrapper for spacing and alignment
      const wrapper = document.createElement('div');
      wrapper.className = 'block-wrapper';
      // Calculate position for wrapper
      let left = j * (blockWidth + gap);
      if (!isEvenRow) left += blockWidth / 2;
      wrapper.style.left = `${left}px`;
      wrapper.style.top = `${i * (blockHeight + gap)}px`;
      // Create the block
      const block = document.createElement('div');
      block.className = 'block';
      block.textContent = blockNumber;
      block.dataset.number = blockNumber;
      blockNumber++;
      block.addEventListener('click', () => removeBlock(block));
      wrapper.appendChild(block);
      tower.appendChild(wrapper);
    }
  }
}

let myPlayerIndex = 0; // Will be set by server
let turn = 0; // 0: player1, 1: player2

// Listen for player index assignment from server
socket.on('playerIndex', (index) => {
  myPlayerIndex = index;
});

// Listen for 'notYourTurn' from server
socket.on('notYourTurn', () => {
  alert("It's not your turn!");
});

function updateTurnDisplay() {
  document.getElementById('players-info').innerHTML =
    `<span style="${turn===0?'text-decoration:underline;':''}">Player 1: ${player1}</span> <span style="${turn===1?'text-decoration:underline;':''}">Player 2: ${player2}</span>`;
}

window.removeBlock = function(block) {
  // Only allow if it's my turn
  if (turn !== myPlayerIndex) {
    alert("It's not your turn!");
    return;
  }
  // Use the correct question set
  let questions = [];
  if (mode === 'join') {
    try { questions = JSON.parse(localStorage.getItem('jenga_questions')) || []; } catch { questions = []; }
  } else {
    try { questions = JSON.parse(localStorage.getItem('jenga_questions')) || []; } catch { questions = []; }
  }
  let i = Math.floor(Math.random() * questions.length);
  document.getElementById('task').innerText = questions[i] || 'No question set.';
  block.style.transform = 'translateX(100px) rotate(20deg)';
  block.style.opacity = '0';
  setTimeout(() => block.remove(), 300);
  // Emit block removal to server for other player, and request turn change
  if (roomCode) {
    const blockNumber = block.dataset.number;
    socket.emit('removeBlock', { roomCode, blockNumber });
  }
};

// Listen for block removals and turn updates from server
socket.on('blockRemoved', ({ blockNumber, nextTurn }) => {
  const block = document.querySelector(`.block[data-number='${blockNumber}']`);
  if (block) {
    block.style.transform = 'translateX(100px) rotate(20deg)';
    block.style.opacity = '0';
    setTimeout(() => block.remove(), 300);
  }
  turn = nextTurn;
  updateTurnDisplay();
});

// On connect, ask server for current turn
socket.on('currentTurn', (serverTurn) => {
  turn = serverTurn;
  updateTurnDisplay();
});

createTower();
updateTurnDisplay();
