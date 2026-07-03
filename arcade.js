/* =========================================================
   GigglyLearn — Arcade Engine
   Local, same-device, turn-based multiplayer (1–4 players).
   No online play. No accounts. Learning hides inside gameplay.
   ========================================================= */

(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------------- avatars ---------------- */
  const AVATARS = [
    { name: 'Panda', emoji: '🐼' },
    { name: 'Fox', emoji: '🦊' },
    { name: 'Owl', emoji: '🦉' },
    { name: 'Robot', emoji: '🤖' }
  ];

  /* ---------------- content pools ---------------- */
  const COLOR_POOL = [
    { n: 'Red', h: '#EF4444' }, { n: 'Blue', h: '#3B82F6' }, { n: 'Green', h: '#22C55E' },
    { n: 'Yellow', h: '#FACC15' }, { n: 'Purple', h: '#A855F7' }, { n: 'Orange', h: '#F97316' },
    { n: 'Pink', h: '#EC4899' }, { n: 'Teal', h: '#14B8A6' }
  ];

  const RIDDLES = [
    { clue: 'I have leaves but I am not a tree. I have pages but I am not a book. What am I?', options: ['A plant', 'A notebook', 'A calendar', 'A flower'], correct: 2 },
    { clue: 'The more you take, the more you leave behind. What am I?', options: ['Footsteps', 'Money', 'Time', 'Water'], correct: 0 },
    { clue: 'I am tall when young and short when old. What am I?', options: ['A tree', 'A candle', 'A shadow', 'A person'], correct: 1 },
    { clue: 'What has hands but cannot clap?', options: ['A robot', 'A clock', 'A statue', 'A glove'], correct: 1 },
    { clue: 'What has a neck but no head?', options: ['A bottle', 'A shirt', 'A giraffe', 'A guitar'], correct: 0 },
    { clue: 'What gets wetter the more it dries?', options: ['A sponge', 'A towel', 'The sun', 'Sand'], correct: 1 },
    { clue: 'I fly without wings. I cry without eyes. What am I?', options: ['A bird', 'A cloud', 'A kite', 'Wind'], correct: 1 },
    { clue: 'What has many keys but opens no locks?', options: ['A piano', 'A treasure chest', 'A map', 'A door'], correct: 0 }
  ];

  const ANIMALS = [
    { emoji: '🐮', name: 'Cow', sound: '"Moooo! Moooo!"' },
    { emoji: '🐶', name: 'Dog', sound: '"Woof! Woof!"' },
    { emoji: '🐱', name: 'Cat', sound: '"Meow! Meow!"' },
    { emoji: '🦆', name: 'Duck', sound: '"Quack! Quack!"' },
    { emoji: '🦁', name: 'Lion', sound: '"Roooar!"' },
    { emoji: '🐑', name: 'Sheep', sound: '"Baa! Baa!"' },
    { emoji: '🐷', name: 'Pig', sound: '"Oink! Oink!"' },
    { emoji: '🐴', name: 'Horse', sound: '"Neigh!"' }
  ];

  const WORDS = [
    { word: 'CAT', hint: '🐱' }, { word: 'SUN', hint: '☀️' }, { word: 'BALL', hint: '⚽' },
    { word: 'FISH', hint: '🐟' }, { word: 'STAR', hint: '⭐' }, { word: 'BOOK', hint: '📖' },
    { word: 'FROG', hint: '🐸' }, { word: 'MOON', hint: '🌙' }, { word: 'BIRD', hint: '🐦' }, { word: 'CAKE', hint: '🎂' }
  ];

  const MEMORY_ICONS = ['🍎', '🚀', '🐝', '🎈', '🐳', '🌈', '🎵', '⭐', '🦋', '🍩', '🐢', '🔺'];

  /* ---------------- round generators ---------------- */
  function colorRound() {
    const pool = shuffle(COLOR_POOL).slice(0, 4);
    const target = pick(pool);
    const options = shuffle(pool.map(c => ({ label: c.n, bg: c.h, correct: c.n === target.n })));
    return { promptType: 'swatch', promptValue: target.h, optType: 'color', options };
  }

  function mathRound() {
    const ops = ['+', '−', '×'];
    const op = pick(ops);
    let a, b, correct;
    if (op === '+') { a = rand(2, 20); b = rand(2, 20); correct = a + b; }
    else if (op === '−') { a = rand(6, 20); b = rand(1, a - 1); correct = a - b; }
    else { a = rand(2, 10); b = rand(2, 10); correct = a * b; }
    const set = new Set([correct]);
    while (set.size < 4) {
      const delta = rand(-6, 6) || 3;
      const v = correct + delta;
      if (v >= 0) set.add(v);
    }
    const options = shuffle([...set]).map(v => ({ label: String(v), correct: v === correct }));
    return { promptType: 'text', promptValue: `${a} ${op} ${b} = ?`, optType: 'text', options };
  }

  function treasureRound() {
    const r = pick(RIDDLES);
    const options = r.options.map((label, i) => ({ label, correct: i === r.correct }));
    return { promptType: 'text', promptValue: r.clue, optType: 'text', options: shuffle(options) };
  }

  function animalRound() {
    const correctAnimal = pick(ANIMALS);
    const distractors = shuffle(ANIMALS.filter(a => a.name !== correctAnimal.name)).slice(0, 3);
    const options = shuffle([correctAnimal, ...distractors]).map(a => ({ label: a.name, emoji: a.emoji, correct: a.name === correctAnimal.name }));
    return { promptType: 'text', promptValue: `Who says ${correctAnimal.sound}`, optType: 'emoji', options };
  }

  /* ---------------- game catalog ---------------- */
  const GAMES = {
    colorBattle: { title: 'Fast Tap Color Battle', icon: '🎨', desc: 'Tap the color before time runs out.', type: 'mcq', roundFn: colorRound, timeLimit: 4200, turnsPerPlayer: 5 },
    mathBattle: { title: 'Math Battle Arena', icon: '➕', desc: 'Solve the equation fastest.', type: 'mcq', roundFn: mathRound, timeLimit: 7000, turnsPerPlayer: 5 },
    treasureHunt: { title: 'Treasure Hunt Race', icon: '🗺️', desc: 'Crack riddles to find the treasure.', type: 'mcq', roundFn: treasureRound, timeLimit: 9000, turnsPerPlayer: 4 },
    animalSound: { title: 'Animal Sound Battle', icon: '🐾', desc: 'Match the sound to the animal.', type: 'mcq', roundFn: animalRound, timeLimit: 5000, turnsPerPlayer: 5 },
    memoryBattle: { title: 'Memory Battle', icon: '🧠', desc: 'Remember card positions faster than everyone.', type: 'memory' },
    wordBuilder: { title: 'Word Builder Race', icon: '🔤', desc: 'Build the word before time runs out.', type: 'wordbuilder', timeLimit: 18000, turnsPerPlayer: 3 },
    reactionSpeed: { title: 'Reaction Speed Challenge', icon: '⚡', desc: 'Wait for green, tap as fast as you can.', type: 'reaction', turnsPerPlayer: 3 },
    puzzleRace: { title: 'Puzzle Race', icon: '🧩', desc: 'Slide the tiles back into order.', type: 'puzzle', timeLimit: 30, turnsPerPlayer: 1 }
  };

  /* ---------------- state ---------------- */
  const S = {
    playerCount: 2,
    players: [],
    pendingGameId: null,
    session: null,
    timers: []
  };

  function clearTimers() {
    S.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    S.timers = [];
  }

  /* ---------------- DOM refs ---------------- */
  let overlay, screens, playerCountRow, playerSetupList, toGameSelectBtn,
    arcadeGameGrid, gameSelectSub, playerHud, arcadeStage, resultsBoard,
    backToSetupBtn, quitGameBtn, playAgainBtn, pickAnotherBtn, arcadeCloseBtn;

  function cacheDom() {
    overlay = $('#arcadeOverlay');
    screens = {
      setup: $('#screenSetup'), select: $('#screenGameSelect'),
      play: $('#screenPlay'), results: $('#screenResults')
    };
    playerCountRow = $('#playerCountRow');
    playerSetupList = $('#playerSetupList');
    toGameSelectBtn = $('#toGameSelect');
    arcadeGameGrid = $('#arcadeGameGrid');
    gameSelectSub = $('#gameSelectSub');
    playerHud = $('#playerHud');
    arcadeStage = $('#arcadeStage');
    resultsBoard = $('#resultsBoard');
    backToSetupBtn = $('#backToSetup');
    quitGameBtn = $('#quitGame');
    playAgainBtn = $('#playAgainBtn');
    pickAnotherBtn = $('#pickAnotherBtn');
    arcadeCloseBtn = $('#arcadeClose');
  }

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    screens[name].classList.add('is-active');
  }

  /* ---------------- open / close ---------------- */
  function openArcade(gameId) {
    S.pendingGameId = gameId || null;
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    renderPlayerCountRow();
    renderPlayerSetupList();
    showScreen('setup');
  }
  function closeArcade() {
    clearTimers();
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ---------------- setup screen ---------------- */
  function renderPlayerCountRow() {
    $$('.count-btn', playerCountRow).forEach(b => b.classList.remove('is-selected'));
    const active = $(`.count-btn[data-count="${S.playerCount}"]`, playerCountRow);
    if (active) active.classList.add('is-selected');
  }

  function renderPlayerSetupList() {
    playerSetupList.innerHTML = '';
    const prev = S.players;
    S.players = [];
    for (let i = 0; i < S.playerCount; i++) {
      const carry = prev[i];
      S.players.push({
        name: (carry && carry.name) || `Player ${i + 1}`,
        avatarIdx: carry ? carry.avatarIdx : i % AVATARS.length,
        score: 0
      });
    }
    S.players.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'player-setup-card';
      card.innerHTML = `
        <div class="avatar-emoji">${AVATARS[p.avatarIdx].emoji}</div>
        <div class="avatar-picker" data-player="${i}">
          ${AVATARS.map((a, ai) => `<button type="button" class="avatar-opt ${ai === p.avatarIdx ? 'is-selected' : ''}" data-avatar="${ai}" aria-label="${a.name}">${a.emoji}</button>`).join('')}
        </div>
        <input type="text" class="player-name-input" maxlength="12" value="${p.name}" data-player="${i}" aria-label="Player ${i + 1} name" />
      `;
      playerSetupList.appendChild(card);
    });

    $$('.avatar-opt', playerSetupList).forEach(btn => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.avatar-picker');
        const pIdx = parseInt(wrap.dataset.player, 10);
        const aIdx = parseInt(btn.dataset.avatar, 10);
        S.players[pIdx].avatarIdx = aIdx;
        $$('.avatar-opt', wrap).forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        wrap.previousElementSibling.textContent = AVATARS[aIdx].emoji;
      });
    });
    $$('.player-name-input', playerSetupList).forEach(inp => {
      inp.addEventListener('input', () => {
        const pIdx = parseInt(inp.dataset.player, 10);
        S.players[pIdx].name = inp.value.trim() || `Player ${pIdx + 1}`;
      });
    });
  }

  /* ---------------- game select screen ---------------- */
  function renderGameGrid() {
    gameSelectSub.textContent = S.playerCount === 1
      ? 'Solo mode: play at your own pace and beat your best score.'
      : `${S.playerCount}-player mode: everyone takes turns on this device.`;
    arcadeGameGrid.innerHTML = Object.keys(GAMES).map(id => {
      const g = GAMES[id];
      return `<button class="arcade-game-card" data-game-select="${id}">
        <div class="g-icon">${g.icon}</div>
        <h3>${g.title}</h3>
        <p>${g.desc}</p>
      </button>`;
    }).join('');
    $$('[data-game-select]', arcadeGameGrid).forEach(btn => {
      btn.addEventListener('click', () => startGame(btn.dataset.gameSelect));
    });
  }

  /* ---------------- shared HUD ---------------- */
  function renderHud(activeIdx) {
    playerHud.innerHTML = S.players.map((p, i) => `
      <div class="hud-player ${i === activeIdx ? 'is-active' : ''}">
        <span class="hud-avatar">${AVATARS[p.avatarIdx].emoji}</span>
        <span class="hud-name">${p.name}</span>
        <span class="hud-score">${p.score}</span>
      </div>
    `).join('');
  }

  function setTimerBar(barEl, ms) {
    barEl.style.transition = 'none';
    barEl.style.width = '100%';
    void barEl.offsetWidth; // force reflow
    barEl.style.transition = `width ${ms}ms linear`;
    requestAnimationFrame(() => { barEl.style.width = '0%'; });
  }

  /* ---------------- start game router ---------------- */
  function startGame(gameId) {
    clearTimers();
    const gameDef = GAMES[gameId];
    S.session = { gameId, gameDef, turnIndex: 0 };
    showScreen('play');
    if (gameDef.type === 'mcq') startMCQGame(gameDef);
    else if (gameDef.type === 'memory') startMemoryGame(gameDef);
    else if (gameDef.type === 'reaction') startReactionGame(gameDef);
    else if (gameDef.type === 'puzzle') startPuzzleGame(gameDef);
    else if (gameDef.type === 'wordbuilder') startWordBuilderGame(gameDef);
  }

  /* ================= MCQ ENGINE (color / math / treasure / animal) ================= */
  function startMCQGame(gameDef) {
    S.session.totalTurns = S.players.length * gameDef.turnsPerPlayer;
    playMCQTurn(gameDef);
  }

  function playMCQTurn(gameDef) {
    clearTimers();
    if (S.session.turnIndex >= S.session.totalTurns) { endGame(); return; }
    const pIdx = S.session.turnIndex % S.players.length;
    const roundNum = Math.floor(S.session.turnIndex / S.players.length) + 1;
    const player = S.players[pIdx];
    renderHud(pIdx);

    const round = gameDef.roundFn();

    let promptHtml = '';
    if (round.promptType === 'swatch') {
      promptHtml = `<div style="width:120px;height:120px;border-radius:26px;background:${round.promptValue};box-shadow:0 14px 30px -10px rgba(0,0,0,.4)"></div>`;
    } else {
      promptHtml = `<div class="stage-prompt">${round.promptValue}</div>`;
    }

    const optionsHtml = round.options.map((opt, i) => {
      if (round.optType === 'color') {
        return `<button class="opt-btn color-swatch" style="background:${opt.bg}" data-idx="${i}" aria-label="${opt.label}"></button>`;
      } else if (round.optType === 'emoji') {
        return `<button class="opt-btn" data-idx="${i}">${opt.emoji} ${opt.label}</button>`;
      }
      return `<button class="opt-btn" data-idx="${i}">${opt.label}</button>`;
    }).join('');

    arcadeStage.innerHTML = `
      <div class="stage-round-label">Turn ${S.session.turnIndex + 1} of ${S.session.totalTurns} · Round ${roundNum}</div>
      <div class="stage-turn-banner">${AVATARS[player.avatarIdx].emoji} ${player.name}'s turn!</div>
      <div class="stage-timer-track"><div class="stage-timer-bar" id="stageTimerBar"></div></div>
      ${promptHtml}
      <div class="stage-options">${optionsHtml}</div>
      <div class="stage-feedback" id="stageFeedback"></div>
    `;

    setTimerBar($('#stageTimerBar', arcadeStage), gameDef.timeLimit);
    const startedAt = Date.now();

    const timeoutId = setTimeout(() => resolveMCQTurn(gameDef, round, null, startedAt), gameDef.timeLimit);
    S.timers.push(timeoutId);

    $$('.opt-btn', arcadeStage).forEach(btn => {
      btn.addEventListener('click', () => {
        clearTimeout(timeoutId);
        resolveMCQTurn(gameDef, round, parseInt(btn.dataset.idx, 10), startedAt);
      });
    });
  }

  function resolveMCQTurn(gameDef, round, chosenIdx, startedAt) {
    const pIdx = S.session.turnIndex % S.players.length;
    const player = S.players[pIdx];
    const buttons = $$('.opt-btn', arcadeStage);
    buttons.forEach(b => b.disabled = true);

    const correctIdx = round.options.findIndex(o => o.correct);
    const feedback = $('#stageFeedback', arcadeStage);

    if (chosenIdx === correctIdx) {
      const elapsed = Date.now() - startedAt;
      const speedBonus = Math.max(0, Math.round((gameDef.timeLimit - elapsed) / gameDef.timeLimit * 10));
      const gained = 10 + speedBonus;
      player.score += gained;
      buttons[chosenIdx].classList.add('is-correct');
      feedback.textContent = `Correct! +${gained} pts`;
      feedback.className = 'stage-feedback good';
    } else {
      if (chosenIdx !== null && buttons[chosenIdx]) buttons[chosenIdx].classList.add('is-wrong');
      if (correctIdx > -1 && buttons[correctIdx]) buttons[correctIdx].classList.add('is-correct');
      feedback.textContent = chosenIdx === null ? "Time's up!" : 'Not quite!';
      feedback.className = 'stage-feedback bad';
    }
    renderHud(pIdx);

    const t = setTimeout(() => {
      S.session.turnIndex++;
      playMCQTurn(gameDef);
    }, 1100);
    S.timers.push(t);
  }

  /* ================= MEMORY BATTLE ================= */
  function startMemoryGame() {
    const pairCount = S.players.length >= 3 ? 8 : 6;
    const icons = shuffle(MEMORY_ICONS).slice(0, pairCount);
    const deck = shuffle([...icons, ...icons]).map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
    S.session.deck = deck;
    S.session.flippedIdx = [];
    S.session.activePlayer = 0;
    S.session.busy = false;
    renderHud(0);
    renderMemoryStage();
  }

  function renderMemoryStage() {
    const cardsHtml = S.session.deck.map(c => `
      <div class="memory-card ${c.flipped ? 'is-flipped' : ''} ${c.matched ? 'is-matched' : ''}" data-id="${c.id}">
        ${(c.flipped || c.matched) ? c.emoji : ''}
      </div>
    `).join('');
    arcadeStage.innerHTML = `
      <div class="stage-round-label">${S.session.deck.filter(c => c.matched).length / 2} of ${S.session.deck.length / 2} pairs found</div>
      <div class="stage-turn-banner">${AVATARS[S.players[S.session.activePlayer].avatarIdx].emoji} ${S.players[S.session.activePlayer].name}'s turn — flip 2 cards</div>
      <div class="memory-grid">${cardsHtml}</div>
      <div class="stage-feedback" id="stageFeedback"></div>
    `;
    $$('.memory-card', arcadeStage).forEach(el => {
      el.addEventListener('click', () => onMemoryCardClick(parseInt(el.dataset.id, 10)));
    });
  }

  function onMemoryCardClick(id) {
    if (S.session.busy) return;
    const card = S.session.deck.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    card.flipped = true;
    S.session.flippedIdx.push(id);
    renderMemoryStage();

    if (S.session.flippedIdx.length === 2) {
      S.session.busy = true;
      const [aId, bId] = S.session.flippedIdx;
      const a = S.session.deck.find(c => c.id === aId);
      const b = S.session.deck.find(c => c.id === bId);
      const t = setTimeout(() => {
        const feedback = $('#stageFeedback', arcadeStage);
        if (a.emoji === b.emoji) {
          a.matched = true; b.matched = true;
          S.players[S.session.activePlayer].score += 15;
          if (feedback) { feedback.textContent = 'Match! Go again.'; feedback.className = 'stage-feedback good'; }
        } else {
          a.flipped = false; b.flipped = false;
          S.session.activePlayer = (S.session.activePlayer + 1) % S.players.length;
        }
        S.session.flippedIdx = [];
        S.session.busy = false;
        renderHud(S.session.activePlayer);
        if (S.session.deck.every(c => c.matched)) { endGame(); return; }
        renderMemoryStage();
      }, 800);
      S.timers.push(t);
    }
  }

  /* ================= REACTION SPEED CHALLENGE ================= */
  function startReactionGame(gameDef) {
    S.session.totalTurns = S.players.length * gameDef.turnsPerPlayer;
    playReactionTurn(gameDef);
  }

  function playReactionTurn(gameDef) {
    clearTimers();
    if (S.session.turnIndex >= S.session.totalTurns) { endGame(); return; }
    const pIdx = S.session.turnIndex % S.players.length;
    const roundNum = Math.floor(S.session.turnIndex / S.players.length) + 1;
    const player = S.players[pIdx];
    renderHud(pIdx);

    arcadeStage.innerHTML = `
      <div class="stage-round-label">Attempt ${roundNum} of ${gameDef.turnsPerPlayer}</div>
      <div class="stage-turn-banner">${AVATARS[player.avatarIdx].emoji} ${player.name}'s turn!</div>
      <div class="reaction-box state-wait" id="reactionBox">Tap When Ready</div>
      <div class="stage-feedback" id="stageFeedback"></div>
    `;

    const box = $('#reactionBox', arcadeStage);
    let phase = 'idle';
    let goAt = 0;

    box.addEventListener('click', function handler() {
      if (phase === 'idle') {
        phase = 'wait';
        box.textContent = 'Wait for green…';
        box.className = 'reaction-box state-wait';
        const delay = rand(1200, 3200);
        const t = setTimeout(() => {
          phase = 'go';
          goAt = Date.now();
          box.textContent = 'TAP NOW!';
          box.className = 'reaction-box state-go';
        }, delay);
        S.timers.push(t);
      } else if (phase === 'wait') {
        phase = 'early';
        box.textContent = 'Too soon! 😅';
        box.className = 'reaction-box state-early';
        box.removeEventListener('click', handler);
        finishReactionTurn(gameDef, player, 0, 'Too soon — 0 pts');
      } else if (phase === 'go') {
        const reactionMs = Date.now() - goAt;
        const gained = Math.max(10, Math.round(600 - reactionMs));
        box.removeEventListener('click', handler);
        finishReactionTurn(gameDef, player, gained, `${reactionMs}ms — +${gained} pts`);
      }
    });
  }

  function finishReactionTurn(gameDef, player, gained, msg) {
    player.score += gained;
    const feedback = $('#stageFeedback', arcadeStage);
    if (feedback) { feedback.textContent = msg; feedback.className = gained > 0 ? 'stage-feedback good' : 'stage-feedback bad'; }
    renderHud(S.session.turnIndex % S.players.length);
    const t = setTimeout(() => {
      S.session.turnIndex++;
      playReactionTurn(gameDef);
    }, 1300);
    S.timers.push(t);
  }

  /* ================= PUZZLE RACE ================= */
  function startPuzzleGame(gameDef) {
    S.session.totalTurns = S.players.length * gameDef.turnsPerPlayer;
    playPuzzleTurn(gameDef);
  }

  function makeSolvablePuzzle() {
    let tiles = [1, 2, 3, 4, 5, 6, 7, 8, null];
    let blank = 8;
    for (let i = 0; i < 120; i++) {
      const neighbors = [];
      const r = Math.floor(blank / 3), c = blank % 3;
      if (r > 0) neighbors.push(blank - 3);
      if (r < 2) neighbors.push(blank + 3);
      if (c > 0) neighbors.push(blank - 1);
      if (c < 2) neighbors.push(blank + 1);
      const swapWith = pick(neighbors);
      [tiles[blank], tiles[swapWith]] = [tiles[swapWith], tiles[blank]];
      blank = swapWith;
    }
    return tiles;
  }

  function playPuzzleTurn(gameDef) {
    clearTimers();
    if (S.session.turnIndex >= S.session.totalTurns) { endGame(); return; }
    const pIdx = S.session.turnIndex % S.players.length;
    const player = S.players[pIdx];
    renderHud(pIdx);

    S.session.tiles = makeSolvablePuzzle();
    S.session.secondsLeft = gameDef.timeLimit;
    S.session.solved = false;

    renderPuzzleStage(player);

    const interval = setInterval(() => {
      S.session.secondsLeft--;
      const label = $('#puzzleTimer', arcadeStage);
      if (label) label.textContent = `${S.session.secondsLeft}s`;
      if (S.session.secondsLeft <= 0) {
        clearInterval(interval);
        finishPuzzleTurn(gameDef, player, false);
      }
    }, 1000);
    S.timers.push(interval);
  }

  function renderPuzzleStage(player) {
    const tilesHtml = S.session.tiles.map((v, i) => `
      <div class="puzzle-tile ${v === null ? 'is-blank' : ''}" data-idx="${i}">${v || ''}</div>
    `).join('');
    arcadeStage.innerHTML = `
      <div class="stage-round-label">One attempt each — arrange tiles 1 to 8</div>
      <div class="stage-turn-banner">${AVATARS[player.avatarIdx].emoji} ${player.name}'s turn! <span id="puzzleTimer" style="color:var(--yellow)">${S.session.secondsLeft}s</span></div>
      <div class="puzzle-grid">${tilesHtml}</div>
      <div class="stage-feedback" id="stageFeedback"></div>
    `;
    $$('.puzzle-tile', arcadeStage).forEach(el => {
      el.addEventListener('click', () => onPuzzleTileClick(parseInt(el.dataset.idx, 10)));
    });
  }

  function onPuzzleTileClick(idx) {
    if (S.session.solved) return;
    const tiles = S.session.tiles;
    const blank = tiles.indexOf(null);
    const r1 = Math.floor(idx / 3), c1 = idx % 3;
    const r2 = Math.floor(blank / 3), c2 = blank % 3;
    const adjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    if (!adjacent) return;
    [tiles[idx], tiles[blank]] = [tiles[blank], tiles[idx]];
    const pIdx = S.session.turnIndex % S.players.length;
    renderPuzzleStage(S.players[pIdx]);

    const isSolved = tiles.every((v, i) => (i === 8 ? v === null : v === i + 1));
    if (isSolved) {
      S.session.solved = true;
      clearTimers();
      finishPuzzleTurn(GAMES.puzzleRace, S.players[pIdx], true);
    }
  }

  function finishPuzzleTurn(gameDef, player, solved) {
    let gained;
    let msg;
    if (solved) {
      gained = 50 + S.session.secondsLeft * 3;
      msg = `Solved with ${S.session.secondsLeft}s left! +${gained} pts`;
    } else {
      const correctCount = S.session.tiles.filter((v, i) => (i === 8 ? v === null : v === i + 1)).length;
      gained = correctCount * 5;
      msg = `Time's up! ${correctCount} tiles correct — +${gained} pts`;
    }
    player.score += gained;
    const feedback = $('#stageFeedback', arcadeStage);
    if (feedback) { feedback.textContent = msg; feedback.className = solved ? 'stage-feedback good' : 'stage-feedback bad'; }
    renderHud(S.session.turnIndex % S.players.length);
    const t = setTimeout(() => {
      S.session.turnIndex++;
      playPuzzleTurn(GAMES.puzzleRace);
    }, 1400);
    S.timers.push(t);
  }

  /* ================= WORD BUILDER RACE ================= */
  function startWordBuilderGame(gameDef) {
    S.session.totalTurns = S.players.length * gameDef.turnsPerPlayer;
    playWordBuilderTurn(gameDef);
  }

  function playWordBuilderTurn(gameDef) {
    clearTimers();
    if (S.session.turnIndex >= S.session.totalTurns) { endGame(); return; }
    const pIdx = S.session.turnIndex % S.players.length;
    const roundNum = Math.floor(S.session.turnIndex / S.players.length) + 1;
    const player = S.players[pIdx];
    renderHud(pIdx);

    const target = pick(WORDS);
    S.session.word = { target: target.word, hint: target.hint, filled: [], tilesUsed: [] };
    S.session.letters = shuffle(target.word.split(''));

    renderWordBuilderStage(player, roundNum, gameDef);

    const startedAt = Date.now();
    const timeoutId = setTimeout(() => finishWordTurn(gameDef, player, false, startedAt), gameDef.timeLimit);
    S.timers.push(timeoutId);
    S.session.wordTimeout = timeoutId;
    S.session.startedAt = startedAt;
  }

  function renderWordBuilderStage(player, roundNum, gameDef) {
    const slotsHtml = Array.from({ length: S.session.word.target.length }).map((_, i) =>
      `<div class="word-slot">${S.session.word.filled[i] || ''}</div>`).join('');
    const tilesHtml = S.session.letters.map((letter, i) =>
      `<button class="word-tile" data-idx="${i}" ${S.session.word.tilesUsed.includes(i) ? 'disabled' : ''}>${letter}</button>`).join('');

    arcadeStage.innerHTML = `
      <div class="stage-round-label">Turn ${S.session.turnIndex + 1} of ${S.session.totalTurns} · Round ${roundNum}</div>
      <div class="stage-turn-banner">${AVATARS[player.avatarIdx].emoji} ${player.name}'s turn!</div>
      <div class="stage-timer-track"><div class="stage-timer-bar" id="stageTimerBar"></div></div>
      <div class="word-hint">${S.session.word.hint}</div>
      <div class="word-slots">${slotsHtml}</div>
      <div class="word-tiles">${tilesHtml}</div>
      <div class="stage-feedback" id="stageFeedback"></div>
    `;
    setTimerBar($('#stageTimerBar', arcadeStage), gameDef.timeLimit);

    $$('.word-tile', arcadeStage).forEach(btn => {
      btn.addEventListener('click', () => onWordTileClick(gameDef, parseInt(btn.dataset.idx, 10)));
    });
  }

  function onWordTileClick(gameDef, letterIdx) {
    const w = S.session.word;
    if (w.filled.length >= w.target.length) return;
    w.filled.push(S.session.letters[letterIdx]);
    w.tilesUsed.push(letterIdx);
    const pIdx = S.session.turnIndex % S.players.length;
    const player = S.players[pIdx];
    const roundNum = Math.floor(S.session.turnIndex / S.players.length) + 1;

    if (w.filled.length === w.target.length) {
      const formed = w.filled.join('');
      if (formed === w.target) {
        clearTimeout(S.session.wordTimeout);
        finishWordTurn(gameDef, player, true, S.session.startedAt);
        return;
      } else {
        renderWordBuilderStage(player, roundNum, gameDef);
        const feedback = $('#stageFeedback', arcadeStage);
        feedback.textContent = 'Not quite — try again!';
        feedback.className = 'stage-feedback bad';
        const t = setTimeout(() => {
          w.filled = [];
          w.tilesUsed = [];
          renderWordBuilderStage(player, roundNum, gameDef);
        }, 700);
        S.timers.push(t);
        return;
      }
    }
    renderWordBuilderStage(player, roundNum, gameDef);
  }

  function finishWordTurn(gameDef, player, success, startedAt) {
    clearTimeout(S.session.wordTimeout);
    let gained = 0;
    let msg;
    if (success) {
      const elapsed = Date.now() - startedAt;
      const speedBonus = Math.max(0, Math.round((gameDef.timeLimit - elapsed) / gameDef.timeLimit * 20));
      gained = 20 + speedBonus;
      msg = `${S.session.word.target} — Correct! +${gained} pts`;
    } else {
      msg = `Time's up! The word was ${S.session.word.target}`;
    }
    player.score += gained;
    const feedback = $('#stageFeedback', arcadeStage);
    if (feedback) { feedback.textContent = msg; feedback.className = success ? 'stage-feedback good' : 'stage-feedback bad'; }
    renderHud(S.session.turnIndex % S.players.length);
    const t = setTimeout(() => {
      S.session.turnIndex++;
      playWordBuilderTurn(gameDef);
    }, 1300);
    S.timers.push(t);
  }

  /* ================= RESULTS ================= */
  function endGame() {
    clearTimers();
    const ranked = S.players.slice().sort((a, b) => b.score - a.score);
    const medals = ['🥇', '🥈', '🥉', '🏅'];
    const isSolo = S.players.length === 1;

    $('.arcade-heading', screens.results).textContent = isSolo ? '🌟 Great Playing!' : '🏆 Results';

    resultsBoard.innerHTML = ranked.map((p, i) => `
      <div class="result-row ${i === 0 && !isSolo ? 'is-winner' : ''}">
        <span class="result-rank">${medals[Math.min(i, 3)]}</span>
        <span class="result-avatar">${AVATARS[p.avatarIdx].emoji}</span>
        <span class="result-name">${p.name}${i === 0 && !isSolo ? ' — Winner!' : ''}</span>
        <span class="result-score">${p.score} pts</span>
      </div>
    `).join('');

    showScreen('results');
    if (typeof window.fireConfetti === 'function') window.fireConfetti(isSolo ? 60 : 140);
  }

  /* ---------------- wiring ---------------- */
  function bindEvents() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-arcade]');
      if (opener) openArcade(opener.dataset.game || null);
    });

    arcadeCloseBtn.addEventListener('click', closeArcade);

    $$('.count-btn', playerCountRow).forEach(btn => {
      btn.addEventListener('click', () => {
        S.playerCount = parseInt(btn.dataset.count, 10);
        renderPlayerCountRow();
        renderPlayerSetupList();
      });
    });

    toGameSelectBtn.addEventListener('click', () => {
      if (S.pendingGameId) {
        showScreen('play');
        startGame(S.pendingGameId);
      } else {
        renderGameGrid();
        showScreen('select');
      }
    });

    backToSetupBtn.addEventListener('click', () => showScreen('setup'));

    quitGameBtn.addEventListener('click', () => {
      clearTimers();
      S.players.forEach(p => p.score = 0);
      renderGameGrid();
      showScreen('select');
    });

    playAgainBtn.addEventListener('click', () => {
      S.players.forEach(p => p.score = 0);
      startGame(S.session.gameId);
    });

    pickAnotherBtn.addEventListener('click', () => {
      S.players.forEach(p => p.score = 0);
      S.pendingGameId = null;
      renderGameGrid();
      showScreen('select');
    });

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeArcade();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
  });
})();
