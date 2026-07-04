/* =========================================================
   Bouncy Learning — Player Profile System
   Additive module. Does not modify existing site/game code.
   Persists locally (this is a real deployed static site, so
   localStorage is appropriate here — unlike in-chat artifacts).
   ========================================================= */

(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const STORAGE_KEY = 'bouncyLearningProfile_v1';

  const AVATARS = [
    { name: 'Panda', emoji: '🐼' }, { name: 'Fox', emoji: '🦊' },
    { name: 'Owl', emoji: '🦉' }, { name: 'Robot', emoji: '🤖' },
    { name: 'Tiger', emoji: '🐯' }, { name: 'Dino', emoji: '🦕' },
    { name: 'Monkey', emoji: '🐵' }, { name: 'Rabbit', emoji: '🐰' },
    { name: 'Koala', emoji: '🐨' }, { name: 'Penguin', emoji: '🐧' }
  ];

  const XP_PER_LEVEL = 200;

  const BADGES = [
    { id: 'first_steps', icon: '🎮', name: 'First Steps', desc: 'Play your first game', check: s => s.totalGames >= 1 },
    { id: 'explorer', icon: '🕹️', name: 'Game Explorer', desc: 'Try 4 different games', check: s => s.gamesPlayed.length >= 4 },
    { id: 'champion', icon: '🏆', name: 'Arcade Champion', desc: 'Play all 8 games', check: s => s.gamesPlayed.length >= 8 },
    { id: 'century', icon: '💯', name: 'Century Club', desc: 'Score 100+ in one game', check: s => s.bestScore >= 100 },
    { id: 'dedicated', icon: '🔥', name: 'Dedicated Player', desc: 'Complete 10 games', check: s => s.totalGames >= 10 },
    { id: 'level5', icon: '⭐', name: 'Rising Star', desc: 'Reach Level 5', check: s => levelFromXp(s.xp) >= 5 }
  ];

  function levelFromXp(xp) { return Math.floor(xp / XP_PER_LEVEL) + 1; }

  function defaultState() {
    return { name: 'Explorer', avatarIdx: 2, xp: 0, coins: 0, gamesPlayed: [], totalGames: 0, bestScore: 0, badges: [] };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable — profile stays in-memory for this visit */ }
  }

  let state = load();

  /* ---------------- public: record a finished arcade game ---------------- */
  function recordGameResult({ gameId, winningScore }) {
    const beforeLevel = levelFromXp(state.xp);
    const xpGain = Math.max(5, winningScore);
    const coinGain = Math.max(1, Math.floor(xpGain / 5));

    state.xp += xpGain;
    state.coins += coinGain;
    state.totalGames += 1;
    state.bestScore = Math.max(state.bestScore, winningScore);
    if (!state.gamesPlayed.includes(gameId)) state.gamesPlayed.push(gameId);

    const newlyUnlocked = [];
    BADGES.forEach(b => {
      if (!state.badges.includes(b.id) && b.check(state)) {
        state.badges.push(b.id);
        newlyUnlocked.push(b);
      }
    });

    const afterLevel = levelFromXp(state.xp);
    save();
    renderProfileButton();
    if ($('#profileOverlay')?.classList.contains('is-open')) renderProfilePanel();

    showEarnToast(xpGain, coinGain);
    if (afterLevel > beforeLevel) {
      setTimeout(() => showLevelUpToast(afterLevel), 900);
    }
    newlyUnlocked.forEach((b, i) => {
      setTimeout(() => showBadgeToast(b), 1400 + i * 1200);
    });
  }
  window.BouncyProfile = { recordGameResult, AVATARS, getState: () => state };

  /* ---------------- toasts ---------------- */
  function toast(html, duration) {
    const el = document.createElement('div');
    el.className = 'bl-toast';
    el.innerHTML = html;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 400);
    }, duration || 2200);
  }
  function showEarnToast(xp, coins) {
    toast(`<span class="bl-toast-icon">✨</span> +${xp} XP &nbsp; <span class="bl-toast-icon">🪙</span> +${coins} coins`);
  }
  function showLevelUpToast(level) {
    toast(`<span class="bl-toast-icon">🎉</span> Level Up! You're now Level ${level}`, 2600);
    if (typeof window.fireConfetti === 'function') window.fireConfetti(90);
  }
  function showBadgeToast(badge) {
    toast(`<span class="bl-toast-icon">${badge.icon}</span> Badge unlocked: <strong>${badge.name}</strong>`, 2800);
  }

  /* ---------------- navbar button ---------------- */
  function renderProfileButton() {
    const btn = $('#profileToggle');
    if (!btn) return;
    const level = levelFromXp(state.xp);
    btn.innerHTML = `<span class="profile-btn-avatar">${AVATARS[state.avatarIdx].emoji}</span><span class="profile-btn-level">${level}</span>`;
  }

  /* ---------------- profile panel ---------------- */
  function xpProgress() {
    const level = levelFromXp(state.xp);
    const intoLevel = state.xp - (level - 1) * XP_PER_LEVEL;
    return { level, intoLevel, pct: Math.round((intoLevel / XP_PER_LEVEL) * 100) };
  }

  function renderProfilePanel() {
    const panel = $('#profileOverlay');
    if (!panel) return;
    const prog = xpProgress();

    $('#profileAvatarBig').textContent = AVATARS[state.avatarIdx].emoji;
    $('#profileNameInput').value = state.name;
    $('#profileLevelLabel').textContent = `Level ${prog.level}`;
    $('#profileXpLabel').textContent = `${prog.intoLevel} / ${XP_PER_LEVEL} XP`;
    $('#profileXpBar').style.width = `${prog.pct}%`;
    $('#profileCoins').textContent = state.coins;
    $('#profileGamesPlayed').textContent = state.totalGames;
    $('#profileBestScore').textContent = state.bestScore;

    const avatarGrid = $('#profileAvatarGrid');
    avatarGrid.innerHTML = AVATARS.map((a, i) => `
      <button type="button" class="profile-avatar-opt ${i === state.avatarIdx ? 'is-selected' : ''}" data-avatar="${i}" aria-label="${a.name}">${a.emoji}</button>
    `).join('');
    $$('.profile-avatar-opt', avatarGrid).forEach(b => {
      b.addEventListener('click', () => {
        state.avatarIdx = parseInt(b.dataset.avatar, 10);
        save();
        renderProfilePanel();
        renderProfileButton();
      });
    });

    const badgeGrid = $('#profileBadgeGrid');
    badgeGrid.innerHTML = BADGES.map(b => {
      const unlocked = state.badges.includes(b.id);
      return `<div class="profile-badge ${unlocked ? 'is-unlocked' : 'is-locked'}" title="${b.desc}">
        <span class="profile-badge-icon">${unlocked ? b.icon : '🔒'}</span>
        <span class="profile-badge-name">${b.name}</span>
      </div>`;
    }).join('');
  }

  function openProfilePanel() {
    renderProfilePanel();
    $('#profileOverlay').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeProfilePanel() {
    $('#profileOverlay').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ---------------- wiring ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderProfileButton();

    $('#profileToggle')?.addEventListener('click', openProfilePanel);
    $('#profileClose')?.addEventListener('click', closeProfilePanel);
    $('#profileNameInput')?.addEventListener('input', (e) => {
      state.name = e.target.value.trim() || 'Explorer';
      save();
    });
    $('#profileOverlay')?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeProfilePanel();
    });
  });
})();
