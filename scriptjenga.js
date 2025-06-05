// --- SOCKET.IO REAL-TIME MULTIPLAYER ---
let socket;
let myPlayerIndex = 0;
let roomCode = null;
let playerNames = ["Player 1", "Player 2"];
let currentPlayer = 0;
let playerQuestions = [];
let opponentQuestions = [];

function updatePlayerStatus() {
  const statusDiv = document.getElementById('player-status');
  if (!statusDiv) return;
  statusDiv.innerHTML =
    `<span class="${currentPlayer === 0 ? 'active' : ''}">${playerNames[0]}</span> vs <span class="${currentPlayer === 1 ? 'active' : ''}">${playerNames[1]}</span><br><span style='font-size:1rem;color:#888;'>${playerNames[currentPlayer]}'s turn</span>`;
}

async function fetchRoomData() {
  const urlParams = new URLSearchParams(window.location.search);
  roomCode = urlParams.get('code');
  if (!roomCode) return;
  try {
    const res = await fetch(`/room/${encodeURIComponent(roomCode)}`);
    if (!res.ok) return;
    const data = await res.json();
    // Determine which player we are by matching localStorage name
    const myName = localStorage.getItem('jenga_player_name') || '';
    if (data.player1 && data.player1.name === myName) {
      myPlayerIndex = 0;
      playerNames = [data.player1.name, data.player2 ? data.player2.name : 'Waiting...'];
      playerQuestions = data.player1.questions || [];
      opponentQuestions = (data.player2 && data.player2.questions) || [];
    } else if (data.player2 && data.player2.name === myName) {
      myPlayerIndex = 1;
      playerNames = [data.player1 ? data.player1.name : 'Waiting...', data.player2.name];
      playerQuestions = data.player2.questions || [];
      opponentQuestions = (data.player1 && data.player1.questions) || [];
    } else {
      // Fallback: just use localStorage
      playerQuestions = JSON.parse(localStorage.getItem('jenga_questions') || '[]');
    }
  } catch (e) {
    playerQuestions = JSON.parse(localStorage.getItem('jenga_questions') || '[]');
  }
}

function setupSocket() {
  socket = io();
  socket.emit('joinRoom', roomCode);
  socket.on('currentTurn', (turn) => {
    currentPlayer = turn;
    updatePlayerStatus();
  });
  socket.on('playerIndex', (idx) => {
    myPlayerIndex = idx;
  });
  socket.on('blockRemoved', ({ blockNumber, nextTurn, question }) => {
    // Remove the block with the given number
    const block = Array.from(document.querySelectorAll('.jenga-block')).find(b => b.textContent == blockNumber);
    if (block && !block.classList.contains('block-removing')) {
      block.classList.add('block-removing');
      setTimeout(() => block.remove(), 480);
    }
    currentPlayer = nextTurn;
    updatePlayerStatus();
    // Show the question for both users if provided
    if (question) {
      const qDisplay = document.getElementById('Question');
      if (qDisplay) qDisplay.innerHTML = question;
    }
  });
  socket.on('notYourTurn', () => {
    // Optionally show a message
  });
  // Listen for new questions from the server
  socket.on('newQuestion', ({ question, forPlayer }) => {
    // Add to the correct set
    if (myPlayerIndex === forPlayer) {
      playerQuestions.push(question);
    } else {
      opponentQuestions.push(question);
    }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchRoomData();
  // Render tower
  const tower = document.getElementById('jenga-tower');
  if (!tower) return;
  const rows = 15;
  const blocksPerRow = 3;
  let blockNumber = 1;
  for (let i = 0; i < rows; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'jenga-row ' + (i % 2 === 0 ? 'odd' : 'even');
    for (let j = 0; j < blocksPerRow; j++) {
      const block = document.createElement('div');
      block.className = 'jenga-block';
      block.textContent = blockNumber;
      block.dataset.blockNumber = blockNumber;
      blockNumber++;
      rowDiv.appendChild(block);
    }
    tower.appendChild(rowDiv);
  }
  updatePlayerStatus();
  setupSocket();
  document.querySelectorAll('.jenga-block').forEach(block => {
    block.addEventListener('click', function onBlockClick() {
      if (block.classList.contains('block-removing')) return;
      // Only allow current player to remove a block
      if (myPlayerIndex !== currentPlayer) return;
      const blockNum = block.textContent;
      // If I'm player 0, send a random question from opponent's set
      let question = undefined;
      if (myPlayerIndex === 0 && opponentQuestions.length > 0) {
        question = opponentQuestions[Math.floor(Math.random() * opponentQuestions.length)];
      }
      socket.emit('removeBlock', { roomCode, blockNumber: blockNum, question });
    });
  });

  // Add question input logic
  const addBtn = document.getElementById('add-question-btn');
  const input = document.getElementById('extra-question-input');
  if (addBtn && input) {
    addBtn.onclick = function() {
      const q = input.value.trim();
      if (!q) return;
      if (socket && roomCode) {
        socket.emit('addQuestion', { roomCode, question: q });
      }
      input.value = '';
    };
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });
  }
});
