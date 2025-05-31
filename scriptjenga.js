const tower = document.getElementById('jenga-tower');
const rows = 15;  // now 15 rows
const blocksPerRow = 3;
const blockWidth = 80; // match CSS and createTower
const blockHeight = 22; // match CSS and createTower
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
  // Clear the tower before creating (fixes missing tiles on reload)
  if (tower) tower.innerHTML = '';
  let blockNumber = 1;
  const blockWidth = 80; // px
  const blockHeight = 22; // px
  const gap = 2; // px
  const rows = 15;
  const blocksPerRow = 3;
  // Remove all tower.style assignments (handled by CSS)
  for (let i = 0; i < rows; i++) {
    const isEvenRow = i % 2 === 0;
    for (let j = 0; j < blocksPerRow; j++) {
      if (blockNumber > 45) break;
      const wrapper = document.createElement('div');
      wrapper.className = 'block-wrapper';
      let left = j * (blockWidth + gap);
      if (!isEvenRow) left += blockWidth / 2;
      wrapper.style.position = 'absolute';
      wrapper.style.left = `${left}px`;
      wrapper.style.top = `${i * (blockHeight + gap)}px`;
      wrapper.style.width = `${blockWidth}px`;
      wrapper.style.height = `${blockHeight}px`;
      const block = document.createElement('div');
      block.className = 'block';
      block.textContent = blockNumber;
      block.dataset.number = blockNumber;
      block.style.width = `${blockWidth}px`;
      block.style.height = `${blockHeight}px`;
      block.addEventListener('click', () => removeBlock(block));
      wrapper.appendChild(block);
      tower.appendChild(wrapper);
      blockNumber++;
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

// --- UI/UX Improvements ---
// 1. Highlight current player's turn in the UI
// 2. Add a visual indicator above the tower
// 3. Improve question/task area styling
// 4. Add subtle animation to turn change
// 5. Responsive tweaks for mobile

// --- 1. Update turn display with highlight and animation ---
function updateTurnDisplay() {
  const info = document.getElementById('players-info');
  let p1Style = turn === 0 ? 'color:#fff;background:#b88a4a;padding:6px 18px;border-radius:8px;box-shadow:0 2px 8px #b88a4a33;font-weight:bold;transition:background 0.3s;' : 'color:#b88a4a;';
  let p2Style = turn === 1 ? 'color:#fff;background:#b88a4a;padding:6px 18px;border-radius:8px;box-shadow:0 2px 8px #b88a4a33;font-weight:bold;transition:background 0.3s;' : 'color:#b88a4a;';
  info.innerHTML = `
    <span id='p1-label' style='${p1Style}'>464 Player 1: ${player1}</span>
    <span id='p2-label' style='${p2Style}'>464 Player 2: ${player2}</span>
  `;
  // Show turn indicator above tower
  let turnBanner = document.getElementById('turn-banner');
  if (!turnBanner) {
    turnBanner = document.createElement('div');
    turnBanner.id = 'turn-banner';
    turnBanner.style = 'width:100%;text-align:center;margin:0 0 8px 0;font-size:1.2rem;font-weight:bold;letter-spacing:0.03em;transition:color 0.3s;';
    tower.parentNode.insertBefore(turnBanner, tower);
  }
  turnBanner.innerHTML = turn === myPlayerIndex ? "449 Your Turn!" : "Waiting for Opponent...";
  turnBanner.style.color = turn === myPlayerIndex ? '#b88a4a' : '#888';
  turnBanner.style.textShadow = turn === myPlayerIndex ? '0 2px 8px #fffbe7' : 'none';
  turnBanner.style.animation = turn === myPlayerIndex ? 'pulseTurn 1.2s infinite alternate' : 'none';
}

// --- 2. Improve question/task area styling ---
const task = document.getElementById('task');
task.style.background = '#fffbe7';
task.style.color = '#b88a4a';
task.style.borderRadius = '10px';
task.style.boxShadow = '0 2px 12px #b88a4a22';
task.style.fontWeight = 'bold';
task.style.fontSize = '1.25rem';
task.style.padding = '16px 18px';
task.style.marginTop = '24px';
task.style.transition = 'background 0.3s, color 0.3s';

// --- 3. Add subtle animation for turn change ---
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulseTurn {
  0% { color: #b88a4a; text-shadow: 0 2px 8px #fffbe7; }
  100% { color: #ffcc66; text-shadow: 0 2px 16px #fffbe7; }
}
`;
document.head.appendChild(style);

// --- 4. Responsive tweaks for mobile (players-info, turn-banner, task) ---
const responsiveStyle = document.createElement('style');
responsiveStyle.innerHTML = `
@media (max-width: 600px) {
  #players-info span { font-size: 0.98rem !important; padding: 4px 8px !important; }
  #turn-banner { font-size: 1.05rem !important; }
  #task { font-size: 1.05rem !important; padding: 10px 6px !important; }
}
`;
document.head.appendChild(responsiveStyle);

// --- 5. Add a little bounce to block removal for fun ---
window.removeBlock = function(block) {
  // Only allow if it's my turn
  if (turn !== myPlayerIndex) {
    alert("It's not your turn!");
    return;
  }
  // Show a question from the OPPONENT'S set
  let questions = [];
  if (myPlayerIndex === 0) {
    // Player 1's turn: show a question from player 2's set
    questions = player2Questions;
  } else {
    // Player 2's turn: show a question from player 1's set
    questions = player1Questions;
  }
  let i = Math.floor(Math.random() * questions.length);
  task.innerText = questions[i] || 'No question set.';
  block.style.transition = 'transform 0.4s cubic-bezier(.68,-0.55,.27,1.55), opacity 0.3s';
  block.style.transform = 'translateX(100px) rotate(20deg) scale(1.2)';
  block.style.opacity = '0';
  setTimeout(() => block.remove(), 350);
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

// Add dynamic question sharing
const addQuestionBtn = document.getElementById('add-question-btn');
const dynamicQuestionInput = document.getElementById('dynamic-question-input');
addQuestionBtn.addEventListener('click', function() {
  const newQuestion = dynamicQuestionInput.value.trim();
  if (newQuestion.length === 0) return;
  if (roomCode && socket) {
    socket.emit('addQuestion', { roomCode, question: newQuestion });
  }
  dynamicQuestionInput.value = '';
});
// Listen for new questions from server and add to the correct set
if (socket) {
  socket.on('newQuestion', ({ question, forPlayer }) => {
    // Add to the correct set (opponent's set)
    if (myPlayerIndex === 0 && forPlayer === 1) {
      player2Questions.push(question);
    } else if (myPlayerIndex === 1 && forPlayer === 0) {
      player1Questions.push(question);
    }
  });
}

createTower();
updateTurnDisplay();
