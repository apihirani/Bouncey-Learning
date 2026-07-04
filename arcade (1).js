/* =========================================================
   Bouncy Learning — Arcade Engine
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

  /* ---------------- avatars ----------------
     First 4 kept in original order/index so existing saved sessions
     and defaults are unaffected — everything after Robot is additive. */
  const AVATARS = [
    { name: 'Panda', emoji: '🐼' },
    { name: 'Fox', emoji: '🦊' },
    { name: 'Owl', emoji: '🦉' },
    { name: 'Robot', emoji: '🤖' },
    { name: 'Tiger', emoji: '🐯' },
    { name: 'Dino', emoji: '🦕' },
    { name: 'Monkey', emoji: '🐵' },
    { name: 'Rabbit', emoji: '🐰' },
    { name: 'Koala', emoji: '🐨' },
    { name: 'Penguin', emoji: '🐧' },
    { name: 'Boy', emoji: '🧒' },
    { name: 'Girl', emoji: '👧' },
    { name: 'Lion', emoji: '🦁' },
    { name: 'Elephant', emoji: '🐘' },
    { name: 'Cat', emoji: '🐱' },
    { name: 'Dog', emoji: '🐶' },
    { name: 'Astronaut', emoji: '🧑\u200d🚀' },
    { name: 'Pirate', emoji: '🏴\u200d☠️' },
    { name: 'Princess', emoji: '👸' },
    { name: 'Wizard', emoji: '🧙' },
    { name: 'Explorer', emoji: '🧭' },
    { name: 'Bee', emoji: '🐝' }
  ];

  const RANDOM_NAMES = [
    'Super Owl', 'Math Hero', 'Puzzle Master', 'Rocket Kid', 'Little Genius',
    'Speed Fox', 'Captain Panda', 'Star Learner', 'Galaxy Kid', 'Smart Bunny',
    'Brave Tiger', 'Word Wizard', 'Number Ninja', 'Quiz Champ', 'Turbo Koala'
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
    return { promptType: 'swatch', promptValue: target.h, optType: 'color', options, explain: `That shade is called ${target.n}!` };
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
    const explainMap = { '+': `${a} + ${b} = ${correct} because adding puts the two amounts together.`,
      '−': `${a} − ${b} = ${correct} because you take ${b} away from ${a}.`,
      '×': `${a} × ${b} = ${correct} because that's ${a} groups of ${b}.` };
    return { promptType: 'text', promptValue: `${a} ${op} ${b} = ?`, optType: 'text', options, explain: explainMap[op] };
  }

  function treasureRound() {
    const r = pick(RIDDLES);
    const options = r.options.map((label, i) => ({ label, correct: i === r.correct }));
    return { promptType: 'text', promptValue: r.clue, optType: 'text', options: shuffle(options), explain: `Think about it literally — riddles often hide the answer in a play on words!` };
  }

  function animalRound() {
    const correctAnimal = pick(ANIMALS);
    const distractors = shuffle(ANIMALS.filter(a => a.name !== correctAnimal.name)).slice(0, 3);
    const options = shuffle([correctAnimal, ...distractors]).map(a => ({ label: a.name, emoji: a.emoji, correct: a.name === correctAnimal.name }));
    return { promptType: 'text', promptValue: `Who says ${correctAnimal.sound}`, optType: 'emoji', options, explain: `A ${correctAnimal.name} says ${correctAnimal.sound} — every animal has its own special sound!` };
  }

  /* ---------------- game catalog ---------------- */
  const GAMES = {
    colorBattle: { title: 'Fast Tap Color Battle', icon: '🎨', desc: 'Tap the color before time runs out.', type: 'mcq', roundFn: colorRound, timeLimit: 4200, turnsPerPlayer: 5,
      category: 'Brain', skill: 'Visual Speed', difficulty: 'Easy', age: '5–8', estTime: '2 min', xpReward: 30, coinReward: 6, starReward: 1, isNew: false,
      tutorial: ['A colored circle appears on screen.', 'Tap the button with the matching color name.', 'Faster correct taps earn bonus points!'] },
    mathBattle: { title: 'Math Battle Arena', icon: '➕', desc: 'Solve the equation fastest.', type: 'mcq', roundFn: mathRound, timeLimit: 7000, turnsPerPlayer: 5,
      category: 'Math', skill: 'Arithmetic', difficulty: 'Medium', age: '7–11', estTime: '5 min', xpReward: 45, coinReward: 9, starReward: 2, isNew: false,
      tutorial: ['An equation like 8 + 5 = ? appears.', 'Pick the correct answer from 4 choices.', 'Use a hint if you get stuck!'] },
    treasureHunt: { title: 'Treasure Hunt Race', icon: '🗺️', desc: 'Crack riddles to find the treasure.', type: 'mcq', roundFn: treasureRound, timeLimit: 9000, turnsPerPlayer: 4,
      category: 'Logic', skill: 'Critical Thinking', difficulty: 'Hard', age: '9–14', estTime: '5 min', xpReward: 55, coinReward: 11, starReward: 3, isNew: false,
      tutorial: ['Read the riddle carefully.', 'Think about hidden meanings and wordplay.', 'Pick the answer that fits best.'] },
    animalSound: { title: 'Animal Sound Battle', icon: '🐾', desc: 'Match the sound to the animal.', type: 'mcq', roundFn: animalRound, timeLimit: 5000, turnsPerPlayer: 5,
      category: 'Educational', skill: 'Observation', difficulty: 'Easy', age: '5–8', estTime: '3 min', xpReward: 30, coinReward: 6, starReward: 1, isNew: false,
      tutorial: ['You\'ll see the sound an animal makes.', 'Tap the animal that makes that sound.', 'Learn a fun fact after each round!'] },
    memoryBattle: { title: 'Memory Battle', icon: '🧠', desc: 'Remember card positions faster than everyone.', type: 'memory',
      category: 'Memory', skill: 'Memory', difficulty: 'Medium', age: '5–11', estTime: '5 min', xpReward: 40, coinReward: 8, starReward: 2, isNew: false },
    wordBuilder: { title: 'Word Builder Race', icon: '🔤', desc: 'Build the word before time runs out.', type: 'wordbuilder', timeLimit: 18000, turnsPerPlayer: 3,
      category: 'English', skill: 'Vocabulary', difficulty: 'Medium', age: '6–11', estTime: '5 min', xpReward: 45, coinReward: 9, starReward: 2, isNew: true },
    reactionSpeed: { title: 'Reaction Speed Challenge', icon: '⚡', desc: 'Wait for green, tap as fast as you can.', type: 'reaction', turnsPerPlayer: 3,
      category: 'Multiplayer', skill: 'Reflexes', difficulty: 'Easy', age: '5–14', estTime: '2 min', xpReward: 25, coinReward: 5, starReward: 1, isNew: false },
    puzzleRace: { title: 'Puzzle Race', icon: '🧩', desc: 'Slide the tiles back into order.', type: 'puzzle', timeLimit: 30, turnsPerPlayer: 1,
      category: 'Puzzle', skill: 'Problem Solving', difficulty: 'Hard', age: '8–14', estTime: '3 min', xpReward: 50, coinReward: 10, starReward: 3, isNew: true }
  };
  const CATEGORIES = ['All', 'Math', 'English', 'Brain', 'Educational', 'Memory', 'Puzzle', 'Multiplayer', 'Logic'];
  const DIFFICULTY_DOT = { Easy: '🟢', Medium: '🟡', Hard: '🔴' };

  /* ---------------- state ---------------- */
  const S = {
    playerCount: 2,
    players: [],
    pendingGameId: null,
    session: null,
    timers: [],
    activeCategory: 'All',
    searchTerm: ''
  };

  function clearTimers() {
    S.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    S.timers = [];
  }

  /* ---------------- DOM refs ---------------- */
  let overlay, screens, playerCountRow, playerSetupList, toGameSelectBtn,
    arcadeGameGrid, gameSelectSub, playerHud, arcadeStage, resultsBoard,
    backToSetupBtn, quitGameBtn, playAgainBtn, pickAnotherBtn, arcadeCloseBtn,
    categoryRow, gameSearchInput, pauseBtn, resetAllBtn, returnHomeBtn,
    backToSelectFromIntroBtn, introPlayBtn, introTutorialBtn;

  function cacheDom() {
    overlay = $('#arcadeOverlay');
    screens = {
      setup: $('#screenSetup'), select: $('#screenGameSelect'),
      intro: $('#screenGameIntro'), play: $('#screenPlay'), results: $('#screenResults')
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
    categoryRow = $('#categoryRow');
    gameSearchInput = $('#gameSearchInput');
    pauseBtn = $('#pauseGameBtn');
    resetAllBtn = $('#resetAllPlayersBtn');
    returnHomeBtn = $('#returnHomeBtn');
    backToSelectFromIntroBtn = $('#backToSelectFromIntro');
    introPlayBtn = $('#introPlayBtn');
    introTutorialBtn = $('#introTutorialBtn');
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
    if (window.BouncySound) window.BouncySound.play('popup');
    playOpeningSequence();
  }
  function closeArcade() {
    clearTimers();
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function playOpeningSequence() {
    if (typeof gsap === 'undefined') return;
    const panel = screens.setup;
    gsap.fromTo(overlay, { backdropFilter: 'blur(0px)' }, { backdropFilter: 'blur(6px)', duration: .01 });
    gsap.fromTo(panel, { opacity: 0, scale: .82, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: .6, ease: 'back.out(1.6)' });
    gsap.fromTo('#arcadeMascot', { y: -60, opacity: 0, rotate: -12 },
      { y: 0, opacity: 1, rotate: 0, duration: .7, delay: .15, ease: 'elastic.out(1,.6)' });
    gsap.fromTo('.player-count-row .count-card', { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: .45, stagger: .08, delay: .35, ease: 'power2.out' });
  }

  /* ---------------- setup screen ---------------- */
  function renderPlayerCountRow() {
    $$('.count-card', playerCountRow).forEach(b => b.classList.remove('is-selected'));
    const active = $(`.count-card[data-count="${S.playerCount}"]`, playerCountRow);
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
        score: 0,
        ready: S.playerCount === 1 ? true : (carry ? carry.ready : false)
      });
    }
    S.players.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = `player-setup-card ${p.ready ? 'is-ready' : ''}`;
      card.innerHTML = `
        <div class="avatar-emoji" id="avatarPreview-${i}">${AVATARS[p.avatarIdx].emoji}</div>
        <div class="avatar-picker" data-player="${i}">
          ${AVATARS.map((a, ai) => `<button type="button" class="avatar-opt ${ai === p.avatarIdx ? 'is-selected' : ''}" data-avatar="${ai}" aria-label="${a.name}">${a.emoji}</button>`).join('')}
        </div>
        <input type="text" class="player-name-input" maxlength="14" value="${p.name}" data-player="${i}" aria-label="Player ${i + 1} name" />
        <button type="button" class="random-name-btn" data-player="${i}">🎲 Random Name</button>
        ${S.playerCount > 1 ? `<button type="button" class="ready-btn ${p.ready ? 'is-ready' : ''}" data-player="${i}" aria-pressed="${p.ready}">${p.ready ? '✅ Ready!' : "I'm Ready"}</button>` : ''}
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
        const preview = $(`#avatarPreview-${pIdx}`);
        preview.textContent = AVATARS[aIdx].emoji;
        if (typeof gsap !== 'undefined') gsap.fromTo(preview, { scale: 1.5, rotate: -10 }, { scale: 1, rotate: 0, duration: .4, ease: 'back.out(2)' });
        if (window.BouncySound) window.BouncySound.play('click');
      });
    });
    $$('.player-name-input', playerSetupList).forEach(inp => {
      inp.addEventListener('input', () => {
        const pIdx = parseInt(inp.dataset.player, 10);
        S.players[pIdx].name = inp.value.trim() || `Player ${pIdx + 1}`;
      });
    });
    $$('.random-name-btn', playerSetupList).forEach(btn => {
      btn.addEventListener('click', () => {
        const pIdx = parseInt(btn.dataset.player, 10);
        const newName = pick(RANDOM_NAMES);
        S.players[pIdx].name = newName;
        const input = $(`.player-name-input[data-player="${pIdx}"]`, playerSetupList);
        if (input) input.value = newName;
        if (window.BouncySound) window.BouncySound.play('click');
      });
    });
    $$('.ready-btn', playerSetupList).forEach(btn => {
      btn.addEventListener('click', () => {
        const pIdx = parseInt(btn.dataset.player, 10);
        S.players[pIdx].ready = !S.players[pIdx].ready;
        const card = btn.closest('.player-setup-card');
        card.classList.toggle('is-ready', S.players[pIdx].ready);
        btn.classList.toggle('is-ready', S.players[pIdx].ready);
        btn.setAttribute('aria-pressed', String(S.players[pIdx].ready));
        btn.textContent = S.players[pIdx].ready ? '✅ Ready!' : "I'm Ready";
        if (window.BouncySound) window.BouncySound.play(S.players[pIdx].ready ? 'correct' : 'click');
        if (typeof gsap !== 'undefined' && S.players[pIdx].ready) {
          gsap.fromTo(card, { scale: 1 }, { scale: 1.04, duration: .18, yoyo: true, repeat: 1, ease: 'power1.inOut' });
        }
        updateContinueButtonState();
      });
    });
    updateContinueButtonState();
  }

  function updateContinueButtonState() {
    const allReady = S.players.every(p => p.ready);
    toGameSelectBtn.disabled = !allReady;
    toGameSelectBtn.textContent = allReady ? 'Choose A Game →' : 'Waiting for everyone to be ready…';
  }

  /* ---------------- game select screen ---------------- */
  function renderCategoryRow() {
    if (!categoryRow) return;
    categoryRow.innerHTML = CATEGORIES.map(cat =>
      `<button class="cat-chip ${cat === S.activeCategory ? 'is-active' : ''}" data-cat="${cat}">${cat}</button>`
    ).join('');
    $$('.cat-chip', categoryRow).forEach(btn => {
      btn.addEventListener('click', () => {
        S.activeCategory = btn.dataset.cat;
        renderCategoryRow();
        renderGameGrid();
        if (window.BouncySound) window.BouncySound.play('click');
      });
    });
  }

  function matchesFilters(id, g) {
    const inCategory = S.activeCategory === 'All' || g.category === S.activeCategory;
    const term = S.searchTerm.trim().toLowerCase();
    const inSearch = !term || [g.title, g.category, g.difficulty, g.skill].join(' ').toLowerCase().includes(term);
    return inCategory && inSearch;
  }

  function renderGameGrid() {
    gameSelectSub.textContent = S.playerCount === 1
      ? 'Solo mode: play at your own pace and beat your best score.'
      : `${S.playerCount}-player mode: everyone takes turns on this device.`;

    const visibleIds = Object.keys(GAMES).filter(id => matchesFilters(id, GAMES[id]));

    arcadeGameGrid.innerHTML = visibleIds.length ? visibleIds.map(id => {
      const g = GAMES[id];
      return `<button class="arcade-game-card" data-game-select="${id}">
        ${g.isNew ? '<span class="game-ribbon">NEW</span>' : ''}
        <button type="button" class="fav-btn" data-fav="${id}" aria-label="Favorite ${g.title}" onclick="event.stopPropagation()">♡</button>
        <div class="g-icon">${g.icon}</div>
        <h3>${g.title}</h3>
        <span class="g-category-tag">${g.category}</span>
        <p>${g.desc}</p>
        <div class="g-meta-row">
          <span title="Difficulty">${DIFFICULTY_DOT[g.difficulty]} ${g.difficulty}</span>
          <span title="Estimated time">⏱️ ${g.estTime}</span>
        </div>
        <div class="g-meta-row">
          <span title="Recommended age">👶 ${g.age}</span>
          <span title="Skill learned">🧩 ${g.skill}</span>
        </div>
        <div class="g-reward-row">
          <span>✨ ${g.xpReward} XP</span>
          <span>🪙 ${g.coinReward}</span>
          <span>⭐ ${g.starReward}</span>
        </div>
      </button>`;
    }).join('') : `<p class="g-empty-msg">No games match "${S.searchTerm}" in ${S.activeCategory}. Try a different search.</p>`;

    $$('[data-game-select]', arcadeGameGrid).forEach(btn => {
      btn.addEventListener('click', () => showGameIntro(btn.dataset.gameSelect));
    });
    $$('.fav-btn', arcadeGameGrid).forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('is-fav');
        btn.textContent = btn.classList.contains('is-fav') ? '♥' : '♡';
      });
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

  /* ================= GAME INTRO + TUTORIAL (Phase 2) ================= */
  function showGameIntro(gameId) {
    const g = GAMES[gameId];
    S.introGameId = gameId;
    $('#introIcon').textContent = g.icon;
    $('#introTitle').textContent = g.title;
    $('#introGoal').textContent = `Learn: ${g.skill} — ${g.desc}`;
    $('#introMetaGrid').innerHTML = `
      <span title="Difficulty">${DIFFICULTY_DOT[g.difficulty] || '🟢'} ${g.difficulty || 'Easy'}</span>
      <span title="Recommended age">👶 ${g.age}</span>
      <span title="Players">🧑‍🤝‍🧑 ${S.playerCount} playing</span>
      <span title="Estimated time">⏱️ ${g.estTime}</span>
      <span title="XP reward">✨ ${g.xpReward} XP</span>
      <span title="Coin reward">🪙 ${g.coinReward} coins</span>
      <span title="Star reward">⭐ up to ${g.starReward || 3}</span>
    `;
    showScreen('intro');
  }

  function showTutorial(gameId) {
    const g = GAMES[gameId];
    const steps = g.tutorial || [g.desc, 'Answer correctly to score points and XP.'];
    const modal = document.createElement('div');
    modal.className = 'pause-menu';
    modal.id = 'tutorialModal';
    modal.innerHTML = `
      <div class="pause-menu-card tutorial-card">
        <h3>${g.icon} How To Play</h3>
        <ol class="tutorial-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <button class="cta-btn cta-btn--primary ripple" id="tutorialCloseBtn">Got it!</button>
      </div>`;
    screens.intro.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('is-open'));
    $('#tutorialCloseBtn', modal).addEventListener('click', () => modal.remove());
  }
  function startGame(gameId) {
    clearTimers();
    showScreen('play');
    runCountdown(() => startGameAfterCountdown(gameId));
  }

  function runCountdown(onDone) {
    arcadeStage.innerHTML = `<div class="countdown-overlay" id="countdownOverlay" aria-live="assertive"><span id="countdownNum">3</span></div>`;
    playerHud.innerHTML = '';
    const steps = ['3', '2', '1', 'GO!'];
    let i = 0;
    const numEl = $('#countdownNum', arcadeStage);
    function tick() {
      numEl.textContent = steps[i];
      numEl.className = '';
      void numEl.offsetWidth;
      numEl.classList.add('is-pop');
      if (window.BouncySound) window.BouncySound.play(steps[i] === 'GO!' ? 'go' : 'countdown');
      i++;
      if (i < steps.length) {
        const t = setTimeout(tick, 650);
        S.timers.push(t);
      } else {
        const t = setTimeout(onDone, 550);
        S.timers.push(t);
      }
    }
    tick();
  }

  function startGameAfterCountdown(gameId) {
    const gameDef = GAMES[gameId];
    S.session = { gameId, gameDef, turnIndex: 0 };
    S.players.forEach(p => { p.combo = 0; p.maxCombo = 0; p.correctCount = 0; p.totalCount = 0; });
    if (gameDef.type === 'mcq') startMCQGame(gameDef);
    else if (gameDef.type === 'memory') startMemoryGame(gameDef);
    else if (gameDef.type === 'reaction') startReactionGame(gameDef);
    else if (gameDef.type === 'puzzle') startPuzzleGame(gameDef);
    else if (gameDef.type === 'wordbuilder') startWordBuilderGame(gameDef);
  }

  /* ---------------- pause menu ---------------- */
  function openPauseMenu() {
    clearTimers();
    const menu = document.createElement('div');
    menu.className = 'pause-menu';
    menu.id = 'pauseMenu';
    menu.innerHTML = `
      <div class="pause-menu-card">
        <h3>⏸ Paused</h3>
        <button class="cta-btn cta-btn--primary ripple" id="resumeBtn">▶ Resume</button>
        <button class="cta-btn cta-btn--ghost" id="restartBtn">↺ Restart Game</button>
        <button class="cta-btn cta-btn--ghost" id="changeGameBtn">🎮 Change Game</button>
        <button class="cta-btn cta-btn--ghost" id="exitArcadeBtn">✕ Exit Arcade</button>
      </div>`;
    screens.play.appendChild(menu);
    requestAnimationFrame(() => menu.classList.add('is-open'));

    $('#resumeBtn', menu).addEventListener('click', () => {
      menu.remove();
      resumeCurrentTurn();
    });
    $('#restartBtn', menu).addEventListener('click', () => {
      menu.remove();
      S.players.forEach(p => p.score = 0);
      startGame(S.session.gameId);
    });
    $('#changeGameBtn', menu).addEventListener('click', () => {
      menu.remove();
      S.players.forEach(p => p.score = 0);
      renderGameGrid();
      showScreen('select');
    });
    $('#exitArcadeBtn', menu).addEventListener('click', () => {
      menu.remove();
      closeArcade();
    });
  }

  function resumeCurrentTurn() {
    // Timer-based turns are re-started fresh on resume (a new prompt/board state)
    // rather than resuming mid-countdown — simplest safe behavior for a pause feature
    // layered onto an already-working turn engine.
    const gameDef = S.session.gameDef;
    if (gameDef.type === 'mcq') playMCQTurn(gameDef);
    else if (gameDef.type === 'memory') renderMemoryStage();
    else if (gameDef.type === 'reaction') playReactionTurn(gameDef);
    else if (gameDef.type === 'puzzle') playPuzzleTurn(gameDef);
    else if (gameDef.type === 'wordbuilder') playWordBuilderTurn(gameDef);
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

    const comboHtml = player.combo >= 2 ? `<div class="combo-badge">🔥 Combo x${player.combo}</div>` : '';

    arcadeStage.innerHTML = `
      <div class="stage-round-label">Turn ${S.session.turnIndex + 1} of ${S.session.totalTurns} · Round ${roundNum}</div>
      <div class="stage-turn-banner">${AVATARS[player.avatarIdx].emoji} ${player.name}'s turn! ${comboHtml}</div>
      <div class="stage-timer-track"><div class="stage-timer-bar" id="stageTimerBar"></div></div>
      ${promptHtml}
      <div class="stage-options" id="stageOptions">${optionsHtml}</div>
      <button class="hint-btn" id="hintBtn" title="Remove one wrong answer">💡 Hint</button>
      <div class="stage-feedback" id="stageFeedback"></div>
    `;

    setTimerBar($('#stageTimerBar', arcadeStage), gameDef.timeLimit);
    const startedAt = Date.now();
    let hintUsed = false;

    const timeoutId = setTimeout(() => resolveMCQTurn(gameDef, round, null, startedAt), gameDef.timeLimit);
    S.timers.push(timeoutId);

    $$('.opt-btn', arcadeStage).forEach(btn => {
      btn.addEventListener('click', () => {
        clearTimeout(timeoutId);
        if (window.BouncySound) window.BouncySound.play('click');
        resolveMCQTurn(gameDef, round, parseInt(btn.dataset.idx, 10), startedAt);
      });
    });

    $('#hintBtn', arcadeStage).addEventListener('click', () => {
      if (hintUsed) return;
      hintUsed = true;
      const buttons = $$('.opt-btn', arcadeStage);
      const wrongIndexes = round.options.map((o, i) => (!o.correct ? i : -1)).filter(i => i > -1);
      const toHide = pick(wrongIndexes);
      buttons[toHide].disabled = true;
      buttons[toHide].classList.add('is-hinted');
      $('#hintBtn', arcadeStage).disabled = true;
      $('#hintBtn', arcadeStage).textContent = '💡 Used';
      if (window.BouncySound) window.BouncySound.play('click');
    });
  }

  function resolveMCQTurn(gameDef, round, chosenIdx, startedAt) {
    const pIdx = S.session.turnIndex % S.players.length;
    const player = S.players[pIdx];
    const buttons = $$('.opt-btn', arcadeStage);
    buttons.forEach(b => b.disabled = true);
    const hintBtn = $('#hintBtn', arcadeStage);
    if (hintBtn) hintBtn.disabled = true;

    const correctIdx = round.options.findIndex(o => o.correct);
    const feedback = $('#stageFeedback', arcadeStage);
    player.totalCount = (player.totalCount || 0) + 1;

    if (chosenIdx === correctIdx) {
      player.correctCount = (player.correctCount || 0) + 1;
      player.combo = (player.combo || 0) + 1;
      player.maxCombo = Math.max(player.maxCombo || 0, player.combo);

      const elapsed = Date.now() - startedAt;
      const speedBonus = Math.max(0, Math.round((gameDef.timeLimit - elapsed) / gameDef.timeLimit * 10));
      const comboBonus = player.combo >= 2 ? Math.min(4 + (player.combo - 2) * 3, 24) : 0;
      const gained = 10 + speedBonus + comboBonus;
      player.score += gained;
      buttons[chosenIdx].classList.add('is-correct');
      feedback.innerHTML = `<span class="stage-feedback good">⭐ Correct! +${gained} pts${comboBonus ? ` (🔥 combo bonus +${comboBonus})` : ''}</span><span class="stage-explain">${round.explain || ''}</span>`;
      if (window.BouncySound) window.BouncySound.play('correct');
    } else {
      player.combo = 0;
      if (chosenIdx !== null && buttons[chosenIdx]) buttons[chosenIdx].classList.add('is-wrong');
      if (correctIdx > -1 && buttons[correctIdx]) buttons[correctIdx].classList.add('is-correct');
      feedback.innerHTML = `<span class="stage-feedback bad">❌ ${chosenIdx === null ? "Time's up!" : 'Not quite!'}</span><span class="stage-explain">${round.explain || ''}</span>`;
      if (window.BouncySound) window.BouncySound.play('wrong');
    }
    renderHud(pIdx);

    const t = setTimeout(() => {
      S.session.turnIndex++;
      playMCQTurn(gameDef);
    }, 2000);
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
          if (window.BouncySound) window.BouncySound.play('correct');
        } else {
          a.flipped = false; b.flipped = false;
          S.session.activePlayer = (S.session.activePlayer + 1) % S.players.length;
          if (window.BouncySound) window.BouncySound.play('wrong');
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
        if (window.BouncySound) window.BouncySound.play('wrong');
        finishReactionTurn(gameDef, player, 0, 'Too soon — 0 pts');
      } else if (phase === 'go') {
        const reactionMs = Date.now() - goAt;
        const gained = Math.max(10, Math.round(600 - reactionMs));
        box.removeEventListener('click', handler);
        if (window.BouncySound) window.BouncySound.play('correct');
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
    if (window.BouncySound) window.BouncySound.play('click');
    const pIdx = S.session.turnIndex % S.players.length;
    renderPuzzleStage(S.players[pIdx]);

    const isSolved = tiles.every((v, i) => (i === 8 ? v === null : v === i + 1));
    if (isSolved) {
      S.session.solved = true;
      clearTimers();
      if (window.BouncySound) window.BouncySound.play('correct');
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
        if (window.BouncySound) window.BouncySound.play('correct');
        finishWordTurn(gameDef, player, true, S.session.startedAt);
        return;
      } else {
        renderWordBuilderStage(player, roundNum, gameDef);
        const feedback = $('#stageFeedback', arcadeStage);
        feedback.textContent = 'Not quite — try again!';
        feedback.className = 'stage-feedback bad';
        if (window.BouncySound) window.BouncySound.play('wrong');
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
    const gameDef = S.session.gameDef;

    $('.arcade-heading', screens.results).textContent = isSolo ? '🌟 Great Playing!' : '🏆 Results';

    resultsBoard.innerHTML = ranked.map((p, i) => {
      let statsLine = '';
      if (p.totalCount) {
        const accuracy = Math.round((p.correctCount / p.totalCount) * 100);
        const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1;
        statsLine = `<div class="result-stats">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)} &nbsp; ${accuracy}% accuracy &nbsp; 🔥 best combo x${p.maxCombo || 0}</div>`;
      }
      return `
      <div class="result-row-wrap">
        <div class="result-row ${i === 0 && !isSolo ? 'is-winner' : ''}">
          <span class="result-rank">${medals[Math.min(i, 3)]}</span>
          <span class="result-avatar">${AVATARS[p.avatarIdx].emoji}</span>
          <span class="result-name">${p.name}${i === 0 && !isSolo ? ' — Winner!' : ''}</span>
          <span class="result-score">${p.score} pts</span>
        </div>
        ${statsLine}
      </div>`;
    }).join('');

    const rewardsBanner = document.createElement('div');
    rewardsBanner.className = 'results-rewards';
    rewardsBanner.innerHTML = `
      <span title="Skill practiced">🧩 ${gameDef.skill}</span>
      <span title="XP earned">✨ +${gameDef.xpReward} XP</span>
      <span title="Coins earned">🪙 +${gameDef.coinReward}</span>
      <span title="Stars earned">⭐ +${gameDef.starReward}</span>
    `;
    resultsBoard.prepend(rewardsBanner);

    showScreen('results');
    if (window.BouncySound) window.BouncySound.play('win');
    if (typeof window.fireConfetti === 'function') window.fireConfetti(isSolo ? 60 : 140);

    // Additive hook: award XP/coins/badges via the Player Profile system if present.
    if (window.BouncyProfile && typeof window.BouncyProfile.recordGameResult === 'function') {
      window.BouncyProfile.recordGameResult({
        gameId: S.session.gameId,
        winningScore: ranked[0].score
      });
    }
  }

  /* ---------------- wiring ---------------- */
  function bindEvents() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-arcade]');
      if (opener) openArcade(opener.dataset.game || null);
    });

    arcadeCloseBtn.addEventListener('click', closeArcade);

    $$('.count-card', playerCountRow).forEach(btn => {
      btn.addEventListener('click', () => {
        S.playerCount = parseInt(btn.dataset.count, 10);
        renderPlayerCountRow();
        renderPlayerSetupList();
      });
    });

    toGameSelectBtn.addEventListener('click', () => {
      if (S.pendingGameId) {
        showGameIntro(S.pendingGameId);
      } else {
        S.activeCategory = 'All';
        S.searchTerm = '';
        if (gameSearchInput) gameSearchInput.value = '';
        renderCategoryRow();
        renderGameGrid();
        showScreen('select');
      }
    });

    backToSetupBtn.addEventListener('click', () => showScreen('setup'));
    backToSelectFromIntroBtn.addEventListener('click', () => {
      if (S.pendingGameId) { showScreen('setup'); }
      else { renderCategoryRow(); renderGameGrid(); showScreen('select'); }
    });
    introPlayBtn.addEventListener('click', () => startGame(S.introGameId));
    introTutorialBtn.addEventListener('click', () => showTutorial(S.introGameId));

    gameSearchInput?.addEventListener('input', () => {
      S.searchTerm = gameSearchInput.value;
      renderGameGrid();
    });

    pauseBtn?.addEventListener('click', () => {
      if (S.session) openPauseMenu();
    });

    resetAllBtn?.addEventListener('click', () => {
      S.players.forEach((p, i) => { p.name = `Player ${i + 1}`; p.avatarIdx = i % AVATARS.length; p.ready = S.playerCount === 1; });
      renderPlayerSetupList();
    });

    returnHomeBtn?.addEventListener('click', () => {
      closeArcade();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    quitGameBtn.addEventListener('click', () => {
      clearTimers();
      $('#pauseMenu')?.remove();
      S.players.forEach(p => p.score = 0);
      renderCategoryRow();
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
      renderCategoryRow();
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
