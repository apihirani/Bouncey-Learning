/* =========================================================
   Bouncy Learning — Player Profile & Progression System
   Phase 1: avatars, XP, coins, basic badges (preserved).
   Phase 3 base: 100-level curve with named tiers, ~24
   achievements, real statistics, daily login + daily quests,
   local leaderboard, animated reward popups.
   Public API kept stable: window.BouncyProfile.recordGameResult,
   .AVATARS, .getState — existing callers keep working unchanged.
   ========================================================= */

(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const STORAGE_KEY = 'bouncyLearningProfile_v1'; // unchanged key — new fields merge in safely

  const AVATARS = [
    { name: 'Panda', emoji: '🐼' }, { name: 'Fox', emoji: '🦊' },
    { name: 'Owl', emoji: '🦉' }, { name: 'Robot', emoji: '🤖' },
    { name: 'Tiger', emoji: '🐯' }, { name: 'Dino', emoji: '🦕' },
    { name: 'Monkey', emoji: '🐵' }, { name: 'Rabbit', emoji: '🐰' },
    { name: 'Koala', emoji: '🐨' }, { name: 'Penguin', emoji: '🐧' }
  ];

  /* ---------------- 100-level curve with named tiers ---------------- */
  function xpRequiredForLevel(level) { return 100 + (level - 1) * 25; }
  const LEVEL_XP_TABLE = (() => {
    const table = [0];
    for (let lvl = 1; lvl <= 100; lvl++) table.push(table[lvl - 1] + xpRequiredForLevel(lvl));
    return table;
  })();
  function levelFromXp(xp) {
    let lvl = 1;
    for (let i = 1; i <= 100; i++) { if (xp >= LEVEL_XP_TABLE[i]) lvl = i + 1; else break; }
    return Math.min(lvl, 100);
  }
  function xpIntoCurrentLevel(xp) {
    const level = levelFromXp(xp);
    const floor = LEVEL_XP_TABLE[level - 1] || 0;
    const need = level >= 100 ? 0 : xpRequiredForLevel(level);
    return { level, into: xp - floor, need: need || 1 };
  }
  const TIERS = [
    { level: 1, name: 'Little Learner' }, { level: 10, name: 'Puzzle Explorer' },
    { level: 25, name: 'Knowledge Hero' }, { level: 50, name: 'Brain Champion' },
    { level: 75, name: 'Super Genius' }, { level: 100, name: 'Master of Bouncy' }
  ];
  function tierNameForLevel(level) {
    let name = TIERS[0].name;
    TIERS.forEach(t => { if (level >= t.level) name = t.name; });
    return name;
  }

  /* ---------------- achievements (~24) ---------------- */
  const BADGES = [
    { id: 'first_steps', icon: '🎮', name: 'First Steps', desc: 'Play your first game', check: s => s.totalGames >= 1 },
    { id: 'explorer', icon: '🕹️', name: 'Game Explorer', desc: 'Try 4 different games', check: s => s.gamesPlayed.length >= 4 },
    { id: 'champion', icon: '🏆', name: 'Arcade Champion', desc: 'Play all 20 games', check: s => s.gamesPlayed.length >= 20 },
    { id: 'century', icon: '💯', name: 'Century Club', desc: 'Score 100+ in one game', check: s => s.bestScore >= 100 },
    { id: 'dedicated', icon: '🔥', name: 'Dedicated Player', desc: 'Complete 10 games', check: s => s.totalGames >= 10 },
    { id: 'level5', icon: '⭐', name: 'Rising Star', desc: 'Reach Level 5', check: s => levelFromXp(s.xp) >= 5 },
    { id: 'first_victory', icon: '🥇', name: 'First Victory', desc: 'Finish your first multiplayer match', check: s => s.wins >= 1 },
    { id: 'math_master', icon: '🧮', name: 'Math Master', desc: 'Play 10 Math games', check: s => (s.categoryStats.Math || 0) >= 10 },
    { id: 'word_wizard', icon: '📚', name: 'Word Wizard', desc: 'Play 10 English games', check: s => (s.categoryStats.English || 0) >= 10 },
    { id: 'memory_king', icon: '🧠', name: 'Memory King', desc: 'Play 10 Memory games', check: s => (s.categoryStats.Memory || 0) >= 10 },
    { id: 'science_explorer', icon: '🔬', name: 'Science Explorer', desc: 'Play 10 Knowledge games', check: s => (s.categoryStats.Knowledge || 0) >= 10 },
    { id: 'flag_expert', icon: '🌍', name: 'Flag Expert', desc: 'Play Flag Quiz 5 times', check: s => (s.gameCounts.flagQuiz || 0) >= 5 },
    { id: 'combo_hero', icon: '🔥', name: 'Combo Hero', desc: 'Reach a combo of 8', check: s => s.maxComboEver >= 8 },
    { id: 'fast_fingers', icon: '⚡', name: 'Fast Fingers', desc: 'Solve a puzzle in 15s or less', check: s => s.fastestPuzzleSolve !== null && s.fastestPuzzleSolve <= 15 },
    { id: 'perfect_accuracy', icon: '🎯', name: 'Perfect Accuracy', desc: 'Score 100% accuracy in a game', check: s => s.perfectGames >= 1 },
    { id: 'weekend_learner', icon: '🌞', name: 'Weekend Learner', desc: 'Play a game on a weekend', check: s => s.playedWeekend === true },
    { id: 'games_100', icon: '💯', name: '100 Games Played', desc: 'Complete 100 games', check: s => s.totalGames >= 100 },
    { id: 'questions_500', icon: '📝', name: '500 Questions Solved', desc: 'Answer 500 questions total', check: s => s.totalQuestions >= 500 },
    { id: 'daily_champion', icon: '📅', name: 'Daily Champion', desc: 'Complete all quests in one day', check: s => s.dailyQuestDaysCompleted >= 1 },
    { id: 'weekly_champion', icon: '🗓️', name: 'Weekly Champion', desc: 'Keep a 7-day login streak', check: s => s.dailyLogin.streak >= 7 },
    { id: 'coin_collector', icon: '🪙', name: 'Coin Collector', desc: 'Earn 500 coins total', check: s => s.coins >= 500 },
    { id: 'star_collector', icon: '✨', name: 'Star Collector', desc: 'Earn 50 stars total', check: s => s.totalStars >= 50 },
    { id: 'level_10', icon: '🎓', name: 'Puzzle Explorer', desc: 'Reach Level 10', check: s => levelFromXp(s.xp) >= 10 },
    { id: 'level_25', icon: '🦸', name: 'Knowledge Hero', desc: 'Reach Level 25', check: s => levelFromXp(s.xp) >= 25 }
  ];

  /* ---------------- Adventure World data model ----------------
     Mirrors the 6-node timeline already built in index.html/style.css
     (Home Village is the starting point, not a completable world).
     Each world completes after `gamesRequired` games from its
     matching categories — reusing the same category field arcade.js
     already sends with every recordGameResult call. */
  const ADVENTURE_WORLDS = [
    { id: 'alphabetForest', name: 'Alphabet Forest', categories: ['English'], gamesRequired: 5, crystal: '🟣', missionTitle: 'Complete 5 English games' },
    { id: 'mathIsland', name: 'Math Island', categories: ['Math'], gamesRequired: 6, crystal: '🔵', missionTitle: 'Complete 6 Math games' },
    { id: 'puzzleValley', name: 'Puzzle Valley', categories: ['Brain', 'Puzzle', 'Memory'], gamesRequired: 6, crystal: '🟢', missionTitle: 'Complete 6 Brain/Puzzle games' },
    { id: 'spaceGalaxy', name: 'Space Galaxy', categories: ['Knowledge'], gamesRequired: 8, crystal: '🟡', missionTitle: 'Complete 8 Science/Knowledge games' },
    { id: 'championCastle', name: 'Champion Castle', isFinal: true, requiredStars: 15, crystal: '🟠', missionTitle: 'Complete every world and earn 15 total stars' }
  ];
  const ADVENTURE_BONUS_CRYSTAL = '❤️'; // awarded once every world above is completed

  /* ---------------- daily quest templates ---------------- */
  const QUEST_TEMPLATES = [
    { id: 'play_n', desc: n => `Play ${n} games`, target: 3, key: 'gamesToday', rewardXp: 20, rewardCoins: 10 },
    { id: 'accuracy_n', desc: n => `Score ${n}%+ accuracy in one game`, target: 80, key: 'bestAccuracyToday', rewardXp: 25, rewardCoins: 12 },
    { id: 'distinct_n', desc: n => `Try ${n} different games`, target: 2, key: 'distinctGamesToday', rewardXp: 20, rewardCoins: 10 },
    { id: 'stars_n', desc: n => `Earn ${n} stars`, target: 5, key: 'starsToday', rewardXp: 25, rewardCoins: 12 },
    { id: 'combo_n', desc: n => `Reach a ${n}x combo`, target: 3, key: 'maxComboToday', rewardXp: 20, rewardCoins: 10 }
  ];

  /* ---------------- weekly mission templates ---------------- */
  const WEEKLY_TEMPLATES = [
    { id: 'play_40', icon: '🎮', title: 'Marathon Player', desc: 'Play 40 games', target: 40, key: 'gamesThisWeek', rewardXp: 150, rewardCoins: 60, rewardStars: 5 },
    { id: 'win_25', icon: '🥇', title: 'Winning Streak', desc: 'Finish 25 multiplayer games', target: 25, key: 'multiplayerThisWeek', rewardXp: 150, rewardCoins: 60, rewardStars: 5 },
    { id: 'xp_5000', icon: '✨', title: 'XP Hunter', desc: 'Earn 5000 XP', target: 5000, key: 'xpThisWeek', rewardXp: 200, rewardCoins: 80, rewardStars: 6 },
    { id: 'stars_400', icon: '⭐', title: 'Star Collector', desc: 'Earn 400 stars', target: 400, key: 'starsThisWeek', rewardXp: 180, rewardCoins: 70, rewardStars: 8 },
    { id: 'math_20', icon: '🧮', title: 'Math Marathon', desc: 'Complete 20 Math games', target: 20, key: 'catMathThisWeek', rewardXp: 150, rewardCoins: 60, rewardStars: 5 },
    { id: 'english_20', icon: '📚', title: 'Word Marathon', desc: 'Complete 20 English games', target: 20, key: 'catEnglishThisWeek', rewardXp: 150, rewardCoins: 60, rewardStars: 5 },
    { id: 'combo_15', icon: '🔥', title: 'Combo Master', desc: 'Reach a combo of 15', target: 15, key: 'maxComboThisWeek', rewardXp: 180, rewardCoins: 70, rewardStars: 6 },
    { id: 'correct_300', icon: '📝', title: 'Answer Machine', desc: 'Solve 300 correct answers', target: 300, key: 'correctThisWeek', rewardXp: 200, rewardCoins: 80, rewardStars: 6 }
  ];

  /* ---------------- monthly challenge templates ---------------- */
  const MONTHLY_TEMPLATES = [
    { id: 'knowledge_champion', icon: '🏛️', title: 'Knowledge Champion', desc: 'Play 15 Knowledge games this month', target: 15, key: 'catKnowledgeThisMonth', lifetime: false, rewardXp: 300, rewardCoins: 120, badge: '🏛️' },
    { id: 'ultimate_explorer', icon: '🧭', title: 'Ultimate Explorer', desc: 'Play every game category in one month', target: 6, key: 'distinctCategoriesThisMonth', lifetime: false, rewardXp: 350, rewardCoins: 140, badge: '🧭' },
    { id: 'puzzle_master', icon: '🧩', title: 'Puzzle Master', desc: 'Play 15 Brain/Puzzle games this month', target: 15, key: 'catPuzzleThisMonth', lifetime: false, rewardXp: 300, rewardCoins: 120, badge: '🧩' },
    { id: 'reading_hero', icon: '📖', title: 'Reading Hero', desc: 'Play 15 English games this month', target: 15, key: 'catEnglishThisMonth', lifetime: false, rewardXp: 300, rewardCoins: 120, badge: '📖' },
    { id: 'math_genius', icon: '➗', title: 'Math Genius', desc: 'Play 15 Math games this month', target: 15, key: 'catMathThisMonth', lifetime: false, rewardXp: 300, rewardCoins: 120, badge: '➗' },
    { id: 'family_champion', icon: '👨‍👩‍👧‍👦', title: 'Family Champion', desc: 'Finish 40 multiplayer matches this month', target: 40, key: 'multiplayerThisMonth', lifetime: false, rewardXp: 350, rewardCoins: 140, badge: '👨‍👩‍👧‍👦' },
    { id: 'learning_legend', icon: '👑', title: 'Learning Legend', desc: 'Reach Level 25 (lifetime)', target: 25, key: 'levelLifetime', lifetime: true, rewardXp: 500, rewardCoins: 200, badge: '👑' }
  ];

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function isYesterday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  }
  function seededPick(seedStr, arr, count) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    const pool = arr.slice();
    const picked = [];
    for (let i = 0; i < count && pool.length; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const idx = seed % pool.length;
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  function generateDailyQuests(dateStr) {
    const templates = seededPick(dateStr, QUEST_TEMPLATES, 3);
    return templates.map(t => ({
      id: t.id, desc: t.desc(t.target), target: t.target, key: t.key,
      progress: 0, rewardXp: t.rewardXp, rewardCoins: t.rewardCoins, completed: false, claimed: false
    }));
  }

  /* ---------------- week / month keys (for Weekly Missions & Monthly Challenges) ---------------- */
  function weekInfo() {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - day);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    const key = `${monday.getFullYear()}-W${String(Math.ceil((((monday - new Date(monday.getFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, '0')}`;
    return { key, resetsAt: nextMonday };
  }
  function monthInfo() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { key, resetsAt: nextFirst };
  }
  function formatCountdown(target) {
    const ms = target - new Date();
    if (ms <= 0) return 'resetting…';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    return days > 0 ? `resets in ${days}d ${hours}h` : `resets in ${hours}h`;
  }

  function generateWeeklyMissions(weekKey) {
    const templates = seededPick(weekKey, WEEKLY_TEMPLATES, 6);
    return templates.map(t => ({
      id: t.id, icon: t.icon, title: t.title, desc: t.desc, target: t.target, key: t.key,
      progress: 0, rewardXp: t.rewardXp, rewardCoins: t.rewardCoins, rewardStars: t.rewardStars, completed: false, claimed: false
    }));
  }
  function generateMonthlyChallenges() {
    // All 7 shown every month (thematic, not randomized) — progress resets monthly except lifetime ones.
    return MONTHLY_TEMPLATES.map(t => ({
      id: t.id, icon: t.icon, title: t.title, desc: t.desc, target: t.target, key: t.key, lifetime: !!t.lifetime,
      progress: 0, rewardXp: t.rewardXp, rewardCoins: t.rewardCoins, badge: t.badge, completed: false, claimed: false
    }));
  }

  /* ---------------- 30-day login reward cycle ---------------- */
  function rewardForDay(day) {
    const d = ((day - 1) % 30) + 1;
    if (d === 3) return { coins: 0, xp: 0, special: 'New Avatar Unlocked!' };
    if (d === 5 || d === 15) return { coins: 0, xp: 0, special: 'Lucky Spin Ready! (coming soon)' };
    if (d === 7 || d === 30) return { coins: 150, xp: 60, special: d === 30 ? 'Monthly Champion Bonus!' : 'Weekly Bonus!' };
    return { coins: 30 + d * 6, xp: 10 + d * 3, special: null };
  }

  /* ---------------- default state ---------------- */
  function defaultState() {
    return {
      name: 'Explorer', avatarIdx: 2, xp: 0, coins: 0, totalStars: 0,
      gamesPlayed: [], totalGames: 0, bestScore: 0, badges: [],
      wins: 0, categoryStats: {}, gameCounts: {}, maxComboEver: 0,
      fastestPuzzleSolve: null, perfectGames: 0, playedWeekend: false,
      totalQuestions: 0, leaderboard: {},
      dailyLogin: { lastDate: null, streak: 0, claimedToday: false },
      dailyQuests: { date: null, quests: [] },
      dailyQuestDaysCompleted: 0,
      weeklyMissions: { weekKey: null, missions: [] },
      monthlyChallenges: { monthKey: null, challenges: [] },
      adventureProgress: {
        currentWorld: 'alphabetForest', completedWorlds: [], completedMissions: [],
        collectedCrystals: [], worldStars: {}, worldGameCounts: {}
      }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultState(), parsed);
      merged.categoryStats = Object.assign({}, parsed.categoryStats);
      merged.gameCounts = Object.assign({}, parsed.gameCounts);
      merged.leaderboard = Object.assign({}, parsed.leaderboard);
      merged.dailyLogin = Object.assign({ lastDate: null, streak: 0, claimedToday: false }, parsed.dailyLogin);
      merged.dailyQuests = Object.assign({ date: null, quests: [] }, parsed.dailyQuests);
      merged.weeklyMissions = Object.assign({ weekKey: null, missions: [] }, parsed.weeklyMissions);
      merged.monthlyChallenges = Object.assign({ monthKey: null, challenges: [] }, parsed.monthlyChallenges);
      merged.adventureProgress = Object.assign({
        currentWorld: 'alphabetForest', completedWorlds: [], completedMissions: [],
        collectedCrystals: [], worldStars: {}, worldGameCounts: {}
      }, parsed.adventureProgress);
      merged.adventureProgress.worldStars = Object.assign({}, parsed.adventureProgress?.worldStars);
      merged.adventureProgress.worldGameCounts = Object.assign({}, parsed.adventureProgress?.worldGameCounts);
      return merged;
    } catch (e) { return defaultState(); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable — profile stays in-memory for this visit */ }
  }

  let state = load();

  /* ---------------- daily quest lifecycle ---------------- */
  function ensureDailyQuests() {
    const today = todayStr();
    if (state.dailyQuests.date !== today) {
      state.dailyQuests = { date: today, quests: generateDailyQuests(today) };
      state.questCounters = { gamesToday: 0, bestAccuracyToday: 0, distinctGamesToday: 0, starsToday: 0, maxComboToday: 0, distinctSetToday: [] };
      save();
    } else if (!state.questCounters) {
      state.questCounters = { gamesToday: 0, bestAccuracyToday: 0, distinctGamesToday: 0, starsToday: 0, maxComboToday: 0, distinctSetToday: [] };
    }
  }
  ensureDailyQuests();

  /* ---------------- weekly mission lifecycle ---------------- */
  function ensureWeeklyMissions() {
    const { key } = weekInfo();
    if (state.weeklyMissions.weekKey !== key) {
      state.weeklyMissions = { weekKey: key, missions: generateWeeklyMissions(key) };
      state.weeklyCounters = { gamesThisWeek: 0, multiplayerThisWeek: 0, xpThisWeek: 0, starsThisWeek: 0, maxComboThisWeek: 0, correctThisWeek: 0, catMathThisWeek: 0, catEnglishThisWeek: 0 };
      save();
    } else if (!state.weeklyCounters) {
      state.weeklyCounters = { gamesThisWeek: 0, multiplayerThisWeek: 0, xpThisWeek: 0, starsThisWeek: 0, maxComboThisWeek: 0, correctThisWeek: 0, catMathThisWeek: 0, catEnglishThisWeek: 0 };
    }
  }
  ensureWeeklyMissions();

  function updateWeeklyProgress(payload, rewards) {
    ensureWeeklyMissions();
    const wc = state.weeklyCounters;
    wc.gamesThisWeek += 1;
    if (payload.isMultiplayer) wc.multiplayerThisWeek += 1;
    wc.xpThisWeek += rewards.xp;
    wc.starsThisWeek += rewards.stars;
    wc.maxComboThisWeek = Math.max(wc.maxComboThisWeek, payload.maxCombo || 0);
    wc.correctThisWeek += (payload.accuracy !== null ? Math.round(((payload.questionsAnswered || 0) * (payload.accuracy / 100))) : 0);
    if (payload.category === 'Math') wc.catMathThisWeek += 1;
    if (payload.category === 'English') wc.catEnglishThisWeek += 1;

    state.weeklyMissions.missions.forEach(m => {
      if (m.completed) return;
      m.progress = wc[m.key] || 0;
      if (m.progress >= m.target) m.completed = true;
    });
  }

  function claimWeeklyMission(id) {
    const m = state.weeklyMissions.missions.find(x => x.id === id);
    if (!m || !m.completed || m.claimed) return;
    m.claimed = true;
    state.xp += m.rewardXp;
    state.coins += m.rewardCoins;
    state.totalStars += (m.rewardStars || 0);
    save();
    toast(`<span class="bl-toast-icon">🏅</span> Weekly mission claimed! +${m.rewardXp} XP, +${m.rewardCoins} coins`);
    if (window.BouncySound) window.BouncySound.play('coin');
    if (typeof window.fireConfetti === 'function') window.fireConfetti(70);
    renderProfileButton();
    renderProfilePanel();
  }

  /* ---------------- monthly challenge lifecycle ---------------- */
  function ensureMonthlyChallenges() {
    const { key } = monthInfo();
    if (state.monthlyChallenges.monthKey !== key) {
      state.monthlyChallenges = { monthKey: key, challenges: generateMonthlyChallenges() };
      state.monthlyCounters = { catKnowledgeThisMonth: 0, catPuzzleThisMonth: 0, catEnglishThisMonth: 0, catMathThisMonth: 0, multiplayerThisMonth: 0, distinctCategoriesSetThisMonth: [] };
      save();
    } else if (!state.monthlyCounters) {
      state.monthlyCounters = { catKnowledgeThisMonth: 0, catPuzzleThisMonth: 0, catEnglishThisMonth: 0, catMathThisMonth: 0, multiplayerThisMonth: 0, distinctCategoriesSetThisMonth: [] };
    }
  }
  ensureMonthlyChallenges();

  function updateMonthlyProgress(payload) {
    ensureMonthlyChallenges();
    const mc = state.monthlyCounters;
    if (payload.category === 'Knowledge') mc.catKnowledgeThisMonth += 1;
    if (payload.category === 'Puzzle' || payload.category === 'Brain') mc.catPuzzleThisMonth += 1;
    if (payload.category === 'English') mc.catEnglishThisMonth += 1;
    if (payload.category === 'Math') mc.catMathThisMonth += 1;
    if (payload.isMultiplayer) mc.multiplayerThisMonth += 1;
    if (payload.category && !mc.distinctCategoriesSetThisMonth.includes(payload.category)) mc.distinctCategoriesSetThisMonth.push(payload.category);
    mc.distinctCategoriesThisMonth = mc.distinctCategoriesSetThisMonth.length;

    state.monthlyChallenges.challenges.forEach(c => {
      if (c.completed) return;
      c.progress = c.lifetime ? (c.key === 'levelLifetime' ? levelFromXp(state.xp) : (state.badges.length)) : (mc[c.key] || 0);
      if (c.progress >= c.target) c.completed = true;
    });
  }

  /* ---------------- Adventure World progression ----------------
     Fully automatic — no buttons, no manual unlock action anywhere.
     A world "completes" once enough games from its matching
     categories have been played, which auto-unlocks the next world
     in the ADVENTURE_WORLDS sequence and awards that world's crystal. */
  function updateAdventureProgress(payload, rewards) {
    const ap = state.adventureProgress;
    if (!ap.currentWorld) return; // adventure already finished

    const world = ADVENTURE_WORLDS.find(w => w.id === ap.currentWorld);
    if (!world) return;

    if (world.isFinal) {
      // Champion Castle has no category gate. It can only ever become currentWorld after
      // Alphabet Forest -> Math Island -> Puzzle Valley -> Space Galaxy have each completed
      // in sequence (completeWorld only advances currentWorld to the next array entry), so
      // "all previous worlds completed" is structurally guaranteed here, not just checked.
      // Every completed game's stars count toward it; it completes once the total is reached.
      ap.worldStars[world.id] = (ap.worldStars[world.id] || 0) + (rewards.stars || 0);
      const totalStars = Object.values(ap.worldStars).reduce((sum, n) => sum + n, 0);
      if (totalStars >= world.requiredStars) completeWorld(world);
      return;
    }

    if (!payload.category || !world.categories.includes(payload.category)) return; // doesn't count toward the active world's mission

    ap.worldGameCounts[world.id] = (ap.worldGameCounts[world.id] || 0) + 1;
    ap.worldStars[world.id] = (ap.worldStars[world.id] || 0) + (rewards.stars || 0);

    if (ap.worldGameCounts[world.id] >= world.gamesRequired) completeWorld(world);
  }

  function completeWorld(world) {
    const ap = state.adventureProgress;
    if (ap.completedWorlds.includes(world.id)) return; // duplicate-prevention guard — a world/crystal can only ever be awarded once

    ap.completedWorlds.push(world.id);
    ap.completedMissions.push(world.id);
    ap.collectedCrystals.push(world.crystal);

    const nextWorld = ADVENTURE_WORLDS[ADVENTURE_WORLDS.indexOf(world) + 1];
    if (nextWorld) {
      ap.currentWorld = nextWorld.id;
    } else {
      if (!ap.collectedCrystals.includes(ADVENTURE_BONUS_CRYSTAL)) ap.collectedCrystals.push(ADVENTURE_BONUS_CRYSTAL);
      ap.currentWorld = null;
    }

    // Reuses the existing toast/confetti/sound system only — no new notification code.
    // Staggered like the existing badge-unlock cascade elsewhere in this file.
    toast(`<span class="bl-toast-icon">🎉</span> Mission Complete! ${world.name} finished.`, 2800);
    setTimeout(() => toast(`<span class="bl-toast-icon">💎</span> Crystal Collected! ${world.crystal}`, 2800), 1300);
    if (nextWorld) {
      setTimeout(() => toast(`<span class="bl-toast-icon">🌍</span> New World Unlocked: ${nextWorld.name}!`, 3000), 2600);
    } else {
      setTimeout(() => toast(`<span class="bl-toast-icon">🏆</span> Adventure Complete! Every crystal collected.`, 3200), 2600);
    }
    if (window.BouncySound) window.BouncySound.play('levelup');
    if (typeof window.fireConfetti === 'function') window.fireConfetti(100);
  }


  function claimMonthlyChallenge(id) {
    const c = state.monthlyChallenges.challenges.find(x => x.id === id);
    if (!c || !c.completed || c.claimed) return;
    c.claimed = true;
    state.xp += c.rewardXp;
    state.coins += c.rewardCoins;
    if (c.badge && !state.badges.includes('monthly_' + c.id)) state.badges.push('monthly_' + c.id);
    save();
    toast(`<span class="bl-toast-icon">${c.badge}</span> ${c.title} complete! +${c.rewardXp} XP, +${c.rewardCoins} coins`, 3000);
    if (window.BouncySound) window.BouncySound.play('levelup');
    if (typeof window.fireConfetti === 'function') window.fireConfetti(120);
    renderProfileButton();
    renderProfilePanel();
  }

  function updateQuestProgress(payload, starsEarned) {
    ensureDailyQuests();
    const qc = state.questCounters;
    qc.gamesToday += 1;
    if (payload.accuracy !== null) qc.bestAccuracyToday = Math.max(qc.bestAccuracyToday, payload.accuracy);
    if (!qc.distinctSetToday.includes(payload.gameId)) qc.distinctSetToday.push(payload.gameId);
    qc.distinctGamesToday = qc.distinctSetToday.length;
    qc.starsToday += starsEarned;
    qc.maxComboToday = Math.max(qc.maxComboToday, payload.maxCombo || 0);

    let anyNewlyCompleted = false;
    state.dailyQuests.quests.forEach(q => {
      if (q.completed) return;
      q.progress = qc[q.key] || 0;
      if (q.progress >= q.target) { q.completed = true; anyNewlyCompleted = true; }
    });
    if (anyNewlyCompleted && state.dailyQuests.quests.every(q => q.completed)) {
      state.dailyQuestDaysCompleted = (state.dailyQuestDaysCompleted || 0) + 1;
    }
  }

  function claimQuest(questId) {
    const q = state.dailyQuests.quests.find(x => x.id === questId);
    if (!q || !q.completed || q.claimed) return;
    q.claimed = true;
    state.xp += q.rewardXp;
    state.coins += q.rewardCoins;
    save();
    toast(`<span class="bl-toast-icon">✅</span> Quest claimed! +${q.rewardXp} XP, +${q.rewardCoins} coins`);
    if (window.BouncySound) window.BouncySound.play('coin');
    renderProfileButton();
    renderProfilePanel();
  }

  /* ---------------- daily login lifecycle ---------------- */
  function checkDailyLogin() {
    const today = todayStr();
    if (state.dailyLogin.lastDate === today) return;
    const wasYesterday = isYesterday(state.dailyLogin.lastDate);
    state.dailyLogin.streak = wasYesterday ? state.dailyLogin.streak + 1 : 1;
    state.dailyLogin.lastDate = today;
    state.dailyLogin.claimedToday = false;
    save();
  }

  function claimDailyLogin() {
    if (state.dailyLogin.claimedToday) return;
    const reward = rewardForDay(state.dailyLogin.streak);
    state.xp += reward.xp;
    state.coins += reward.coins;
    state.dailyLogin.claimedToday = true;
    save();
    renderProfileButton();
    renderDailyButton();
    if (window.BouncySound) window.BouncySound.play('coin');
    if (typeof window.fireConfetti === 'function') window.fireConfetti(50);
    toast(`<span class="bl-toast-icon">🎁</span> Day ${state.dailyLogin.streak}: +${reward.xp} XP, +${reward.coins} coins${reward.special ? ' — ' + reward.special : ''}`, 3200);
  }

  /* ---------------- reward computation (single source of truth) ---------------- */
  function computeRewards(payload) {
    let xp = payload.baseXp || 20;
    let coins = payload.baseCoins || 4;
    let stars = payload.baseStars || 1;
    let xpBonus = false;

    if (payload.accuracy !== null && payload.accuracy !== undefined) {
      stars = payload.accuracy >= 90 ? 3 : payload.accuracy >= 60 ? 2 : 1;
      if (payload.accuracy >= 90) { xp = Math.round(xp * 1.3); xpBonus = true; }
      else if (payload.accuracy < 40) { xp = Math.round(xp * 0.7); }
    }
    if (payload.maxCombo >= 5) { xp += 10; coins += 2; xpBonus = true; }
    else if (payload.maxCombo >= 3) { xp += 5; }
    if (payload.solveTimeSeconds !== null && payload.solveTimeSeconds !== undefined && payload.solveTimeSeconds <= 15) {
      xp += 8; xpBonus = true;
    }
    xp = Math.max(5, Math.round(xp));
    coins = Math.max(1, Math.round(coins));
    stars = Math.max(1, Math.min(3, stars));
    return { xp, coins, stars, xpBonus };
  }

  /* ---------------- public: record a finished arcade game ---------------- */
  function recordGameResult(payload) {
    ensureDailyQuests();
    const beforeLevel = levelFromXp(state.xp);
    const rewards = computeRewards(payload);

    state.xp += rewards.xp;
    state.coins += rewards.coins;
    state.totalStars += rewards.stars;
    state.totalGames += 1;
    state.bestScore = Math.max(state.bestScore, payload.winningScore || 0);
    if (!state.gamesPlayed.includes(payload.gameId)) state.gamesPlayed.push(payload.gameId);
    if (payload.category) state.categoryStats[payload.category] = (state.categoryStats[payload.category] || 0) + 1;
    state.gameCounts[payload.gameId] = (state.gameCounts[payload.gameId] || 0) + 1;
    if (payload.isMultiplayer) state.wins += 1;
    if (payload.maxCombo) state.maxComboEver = Math.max(state.maxComboEver, payload.maxCombo);
    if (payload.questionsAnswered) state.totalQuestions += payload.questionsAnswered;
    if (payload.accuracy === 100) state.perfectGames += 1;
    if (payload.solveTimeSeconds !== null && payload.solveTimeSeconds !== undefined) {
      if (state.fastestPuzzleSolve === null || payload.solveTimeSeconds < state.fastestPuzzleSolve) state.fastestPuzzleSolve = payload.solveTimeSeconds;
    }
    const dow = new Date().getDay();
    if (dow === 0 || dow === 6) state.playedWeekend = true;

    if (!state.leaderboard[payload.gameId]) state.leaderboard[payload.gameId] = [];
    state.leaderboard[payload.gameId].push({ name: payload.winnerName || state.name, score: payload.winningScore || 0, date: todayStr() });
    state.leaderboard[payload.gameId] = state.leaderboard[payload.gameId].sort((a, b) => b.score - a.score).slice(0, 3);

    updateQuestProgress(payload, rewards.stars);
    updateWeeklyProgress(payload, rewards);
    updateMonthlyProgress(payload);
    updateAdventureProgress(payload, rewards);

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

    showEarnToast(rewards.xp, rewards.coins, rewards.stars);
    if (afterLevel > beforeLevel) setTimeout(() => showLevelUpToast(afterLevel), 900);
    newlyUnlocked.forEach((b, i) => setTimeout(() => showBadgeToast(b), 1400 + i * 1200));

    return rewards;
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
  function showEarnToast(xp, coins, stars) {
    toast(`<span class="bl-toast-icon">✨</span> +${xp} XP &nbsp; <span class="bl-toast-icon">🪙</span> +${coins} coins &nbsp; ${'⭐'.repeat(stars)}`);
  }
  function showLevelUpToast(level) {
    toast(`<span class="bl-toast-icon">🎉</span> Level Up! You're now Level ${level} — ${tierNameForLevel(level)}`, 2800);
    if (typeof window.fireConfetti === 'function') window.fireConfetti(90);
    if (window.BouncySound) window.BouncySound.play('levelup');
  }
  function showBadgeToast(badge) {
    toast(`<span class="bl-toast-icon">${badge.icon}</span> Badge unlocked: <strong>${badge.name}</strong>`, 2800);
  }

  /* ---------------- navbar button ---------------- */
  function renderProfileButton() {
    const btn = $('#profileToggle');
    if (btn) {
      const level = levelFromXp(state.xp);
      btn.innerHTML = `<span class="profile-btn-avatar">${AVATARS[state.avatarIdx].emoji}</span><span class="profile-btn-level">${level}</span>`;
    }
    const navCoins = $('#navCoins');
    const navStars = $('#navStars');
    if (navCoins) navCoins.textContent = state.coins;
    if (navStars) navStars.textContent = state.totalStars;
    renderHomepageWidgets();
  }

  /* ---------------- homepage widgets (hero daily card + rewards dashboard) ---------------- */
  function renderHomepageWidgets() {
    ensureWeeklyMissions(); ensureMonthlyChallenges(); ensureDailyQuests();
    const { level, into, need } = xpIntoCurrentLevel(state.xp);
    const pct = level >= 100 ? 100 : Math.round((into / need) * 100);

    const heroStreak = $('#heroDailyStreak');
    if (heroStreak) {
      heroStreak.textContent = state.dailyLogin.claimedToday
        ? `Streak: ${state.dailyLogin.streak} 🔥 (claimed today)`
        : `Streak: ${state.dailyLogin.streak} 🔥 — tap to claim!`;
    }
    const heroCard = $('#heroDailyCard');
    if (heroCard) heroCard.classList.toggle('is-claimable', !state.dailyLogin.claimedToday);

    const dashAvatar = $('#dashAvatar');
    if (dashAvatar) dashAvatar.textContent = AVATARS[state.avatarIdx].emoji;
    const dashName = $('#dashName');
    if (dashName) dashName.textContent = state.name;
    const dashTier = $('#dashTier');
    if (dashTier) dashTier.textContent = tierNameForLevel(level);
    const dashXpBar = $('#dashXpBar');
    if (dashXpBar) dashXpBar.style.width = `${pct}%`;
    const dashXpLabel = $('#dashXpLabel');
    if (dashXpLabel) dashXpLabel.textContent = level >= 100 ? 'Max Level!' : `Level ${level} · ${into}/${need} XP`;
    const dashCoins = $('#dashCoins');
    if (dashCoins) dashCoins.textContent = state.coins;
    const dashStars = $('#dashStars');
    if (dashStars) dashStars.textContent = state.totalStars;
    const dashBadges = $('#dashBadges');
    if (dashBadges) dashBadges.textContent = `${state.badges.length}/${BADGES.length}`;

    const questPreview = $('#dashQuestPreview');
    if (questPreview) {
      questPreview.innerHTML = state.dailyQuests.quests.slice(0, 2).map(q => {
        const p = Math.min(100, Math.round((q.progress / q.target) * 100));
        return `<div class="dash-mini-quest"><span>${q.completed ? '✅' : '⏳'} ${q.desc}</span><div class="quest-progress-track"><div class="quest-progress-bar" style="width:${p}%"></div></div></div>`;
      }).join('') || `<p class="dash-empty-note">Play a game to start today's quests!</p>`;
    }

    const badgePreview = $('#dashBadgePreview');
    if (badgePreview) {
      const recent = state.badges.slice(-4).reverse();
      badgePreview.innerHTML = recent.length
        ? recent.map(id => {
            const b = BADGES.find(x => x.id === id);
            return b ? `<span class="dash-badge-icon" title="${b.name}">${b.icon}</span>` : '';
          }).join('')
        : `<p class="dash-empty-note">Play games to unlock your first badge!</p>`;
    }

    const lbPreview = $('#dashLeaderboardPreview');
    if (lbPreview) {
      const gameIds = Object.keys(state.leaderboard).filter(id => state.leaderboard[id].length)
        .sort((a, b) => state.leaderboard[b][0].score - state.leaderboard[a][0].score).slice(0, 3);
      lbPreview.innerHTML = gameIds.length
        ? gameIds.map(id => `<div class="dash-mini-score"><span>${GAME_TITLES[id] || id}</span><strong>${state.leaderboard[id][0].score} pts</strong></div>`).join('')
        : `<p class="dash-empty-note">Play a game to set your first high score!</p>`;
    }
  }

  /* ---------------- profile panel ---------------- */
  function renderProfilePanel() {
    const panel = $('#profileOverlay');
    if (!panel) return;
    const { level, into, need } = xpIntoCurrentLevel(state.xp);
    const pct = level >= 100 ? 100 : Math.round((into / need) * 100);

    $('#profileAvatarBig').textContent = AVATARS[state.avatarIdx].emoji;
    $('#profileNameInput').value = state.name;
    $('#profileTierLabel').textContent = tierNameForLevel(level);
    $('#profileLevelLabel').textContent = `Level ${level}`;
    $('#profileXpLabel').textContent = level >= 100 ? 'Max Level!' : `${into} / ${need} XP`;
    $('#profileXpBar').style.width = `${pct}%`;
    $('#profileCoins').textContent = state.coins;
    $('#profileTotalStars').textContent = state.totalStars;
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

    renderStatsGrid();
    renderQuestList();
    renderWeeklyList();
    renderMonthlyList();
    renderLeaderboardList();
    renderDailyButton();
    renderAdventureSummary();
  }

  function renderStatsGrid() {
    const grid = $('#statsGrid');
    if (!grid) return;
    const favoriteCategory = Object.keys(state.categoryStats).sort((a, b) => state.categoryStats[b] - state.categoryStats[a])[0] || '—';
    grid.innerHTML = `
      <div class="stat-card"><strong>${state.totalGames}</strong><span>Games Played</span></div>
      <div class="stat-card"><strong>${state.wins}</strong><span>Multiplayer Matches</span></div>
      <div class="stat-card"><strong>${favoriteCategory}</strong><span>Favorite Category</span></div>
      <div class="stat-card"><strong>${state.maxComboEver}</strong><span>Best Combo Ever</span></div>
      <div class="stat-card"><strong>${state.fastestPuzzleSolve !== null ? state.fastestPuzzleSolve + 's' : '—'}</strong><span>Fastest Puzzle Solve</span></div>
      <div class="stat-card"><strong>${state.totalQuestions}</strong><span>Questions Answered</span></div>
      <div class="stat-card"><strong>${state.perfectGames}</strong><span>Perfect Games</span></div>
      <div class="stat-card"><strong>${state.badges.length}/${BADGES.length}</strong><span>Achievements</span></div>
    `;
  }

  function renderAdventureSummary() {
    const el = $('#adventureSummaryCard');
    if (!el) return;
    const ap = state.adventureProgress;
    const world = ADVENTURE_WORLDS.find(w => w.id === ap.currentWorld);
    const pct = Math.round((ap.completedWorlds.length / ADVENTURE_WORLDS.length) * 100);

    $('#advCurrentWorld').textContent = world ? world.name : '🏆 Adventure Complete!';
    $('#advCurrentMission').textContent = world ? world.missionTitle : 'All missions complete';
    $('#advWorldsCompleted').textContent = `${ap.completedWorlds.length} / ${ADVENTURE_WORLDS.length}`;
    $('#advCrystals').textContent = ap.collectedCrystals.length ? ap.collectedCrystals.join(' ') : '—';
    $('#advSummaryProgressBar').style.width = `${pct}%`;
    $('#advProgressPct').textContent = `${pct}% complete`;

    if (world && world.isFinal) {
      const earned = Object.values(ap.worldStars).reduce((sum, n) => sum + n, 0);
      const remaining = Math.max(0, world.requiredStars - earned);
      $('#advNextUnlock').textContent = remaining > 0
        ? `${remaining} more star${remaining === 1 ? '' : 's'} needed to complete your journey`
        : 'Completing your journey…';
    } else if (world) {
      const done = ap.worldGameCounts[world.id] || 0;
      const remaining = Math.max(0, world.gamesRequired - done);
      const nextWorld = ADVENTURE_WORLDS[ADVENTURE_WORLDS.indexOf(world) + 1];
      const unlockLabel = nextWorld ? nextWorld.name : 'the final crystal';
      $('#advNextUnlock').textContent = remaining > 0
        ? `${remaining} more ${world.categories.join('/')} game${remaining === 1 ? '' : 's'} to unlock ${unlockLabel}`
        : `Unlocking ${unlockLabel}…`;
    } else {
      $('#advNextUnlock').textContent = 'You\'ve collected every crystal!';
    }
  }

  function renderQuestList() {
    const list = $('#questList');
    if (!list) return;
    list.innerHTML = state.dailyQuests.quests.map(q => {
      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
      return `<div class="quest-item ${q.completed ? 'is-complete' : ''}">
        <div class="quest-item-top"><span>${q.desc}</span><span>${Math.min(q.progress, q.target)}/${q.target}</span></div>
        <div class="quest-progress-track"><div class="quest-progress-bar" style="width:${pct}%"></div></div>
        ${q.completed
          ? (q.claimed
            ? `<span class="quest-claimed-label">✅ Claimed</span>`
            : `<button class="cta-btn cta-btn--primary quest-claim-btn" data-quest="${q.id}">Claim +${q.rewardXp} XP, +${q.rewardCoins} 🪙</button>`)
          : `<span class="quest-reward-label">Reward: +${q.rewardXp} XP, +${q.rewardCoins} 🪙</span>`}
      </div>`;
    }).join('');
    $$('.quest-claim-btn', list).forEach(btn => btn.addEventListener('click', () => claimQuest(btn.dataset.quest)));
  }

  function renderWeeklyList() {
    ensureWeeklyMissions();
    const list = $('#weeklyMissionList');
    const countdownEl = $('#weeklyCountdown');
    if (countdownEl) countdownEl.textContent = formatCountdown(weekInfo().resetsAt);
    if (!list) return;
    list.innerHTML = state.weeklyMissions.missions.map(m => {
      const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
      return `<div class="mission-card ${m.completed ? 'is-complete' : ''}">
        <div class="mission-card-icon">${m.icon}</div>
        <div class="mission-card-body">
          <div class="mission-card-title">${m.title}</div>
          <div class="mission-card-desc">${m.desc}</div>
          <div class="quest-progress-track"><div class="quest-progress-bar" style="width:${pct}%"></div></div>
          <div class="mission-card-bottom">
            <span>${Math.min(m.progress, m.target)}/${m.target}</span>
            ${m.completed
              ? (m.claimed
                ? `<span class="quest-claimed-label">✅ Claimed</span>`
                : `<button class="cta-btn cta-btn--primary quest-claim-btn" data-weekly="${m.id}">Claim +${m.rewardXp} XP</button>`)
              : `<span class="quest-reward-label">+${m.rewardXp} XP, +${m.rewardCoins} 🪙, +${m.rewardStars} ⭐</span>`}
          </div>
        </div>
      </div>`;
    }).join('');
    $$('[data-weekly]', list).forEach(btn => btn.addEventListener('click', () => claimWeeklyMission(btn.dataset.weekly)));
  }

  function renderMonthlyList() {
    ensureMonthlyChallenges();
    const list = $('#monthlyChallengeList');
    const countdownEl = $('#monthlyCountdown');
    if (countdownEl) countdownEl.textContent = formatCountdown(monthInfo().resetsAt);
    if (!list) return;
    list.innerHTML = state.monthlyChallenges.challenges.map(c => {
      const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
      return `<div class="challenge-card ${c.completed ? 'is-complete' : ''}">
        <div class="challenge-card-icon">${c.icon}</div>
        <div class="challenge-card-title">${c.title}</div>
        <div class="challenge-card-desc">${c.desc}</div>
        <div class="quest-progress-track"><div class="quest-progress-bar" style="width:${pct}%"></div></div>
        <div class="challenge-card-pct">${pct}%</div>
        ${c.completed
          ? (c.claimed
            ? `<span class="quest-claimed-label">✅ Claimed</span>`
            : `<button class="cta-btn cta-btn--primary quest-claim-btn" data-monthly="${c.id}">Claim +${c.rewardXp} XP, +${c.rewardCoins} 🪙</button>`)
          : `<span class="quest-reward-label">Reward: +${c.rewardXp} XP, +${c.rewardCoins} 🪙, badge ${c.badge}</span>`}
      </div>`;
    }).join('');
    $$('[data-monthly]', list).forEach(btn => btn.addEventListener('click', () => claimMonthlyChallenge(btn.dataset.monthly)));
  }

  const GAME_TITLES = {
    colorBattle: 'Fast Tap Color Battle', mathBattle: 'Math Battle Arena', treasureHunt: 'Treasure Hunt Race', animalSound: 'Animal Sound Battle',
    memoryBattle: 'Memory Battle', wordBuilder: 'Word Builder Race', reactionSpeed: 'Reaction Speed Challenge', puzzleRace: 'Puzzle Race',
    countFruits: 'Count the Fruits', missingNumber: 'Missing Number', multiplicationMaster: 'Multiplication Master', abcBalloonPop: 'ABC Balloon Pop',
    spellingBee: 'Spelling Bee', missingLetter: 'Missing Letter Challenge', patternMatch: 'Pattern Match', spotDifference: 'Spot the Difference',
    flagQuiz: 'Flag Quiz', solarSystem: 'Solar System Explorer', scienceQuest: 'Science Quest', emojiMatchRace: 'Emoji Match Race'
  };

  function renderLeaderboardList() {
    const list = $('#leaderboardList');
    if (!list) return;
    const gameIds = Object.keys(state.leaderboard).filter(id => state.leaderboard[id].length);
    if (!gameIds.length) { list.innerHTML = `<p class="leaderboard-empty">Play a game to set your first high score!</p>`; return; }
    list.innerHTML = gameIds.map(id => {
      const top = state.leaderboard[id][0];
      return `<div class="leaderboard-row"><span class="lb-game">${GAME_TITLES[id] || id}</span><span class="lb-score">🏆 ${top.score} pts</span></div>`;
    }).join('');
  }

  function renderDailyButton() {
    const btn = $('#profileDailyBtn');
    const flame = $('#profileStreakFlame');
    if (!btn) return;
    if (flame) flame.textContent = state.dailyLogin.streak > 1 ? ` 🔥${state.dailyLogin.streak}` : '';
    btn.classList.toggle('is-claimable', !state.dailyLogin.claimedToday);
    btn.textContent = state.dailyLogin.claimedToday ? '🎁 Come back tomorrow!' : '🎁 Claim Daily Reward';
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

  /* ---------------- tabs ---------------- */
  function switchToTab(tabName) {
    const tab = $(`.profile-tab[data-tab="${tabName}"]`);
    const panel = $(`.profile-tab-panel[data-panel="${tabName}"]`);
    if (!tab || !panel) return;
    $$('.profile-tab').forEach(t => t.classList.remove('is-active'));
    $$('.profile-tab-panel').forEach(p => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    panel.classList.add('is-active');
  }
  function bindTabs() {
    $$('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => switchToTab(tab.dataset.tab));
    });
  }

  /* ---------------- wiring ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    checkDailyLogin();
    renderProfileButton();
    bindTabs();

    $('#profileToggle')?.addEventListener('click', openProfilePanel);
    $('#profileClose')?.addEventListener('click', closeProfilePanel);
    $('#profileDailyBtn')?.addEventListener('click', claimDailyLogin);
    $('#profileNameInput')?.addEventListener('input', (e) => {
      state.name = e.target.value.trim() || 'Explorer';
      save();
    });
    $('#profileOverlay')?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeProfilePanel();
    });

    // Homepage widgets (hero daily card + rewards dashboard) reuse the same profile panel/tabs — no separate logic.
    $('#heroRewardsBtn')?.addEventListener('click', () => { openProfilePanel(); switchToTab('overview'); });
    $('#heroDailyCard')?.addEventListener('click', () => { openProfilePanel(); switchToTab('overview'); });
    $$('[data-open-profile]').forEach(btn => {
      btn.addEventListener('click', () => {
        openProfilePanel();
        if (btn.dataset.tabTarget) switchToTab(btn.dataset.tabTarget);
      });
    });

    if (!state.dailyLogin.claimedToday) {
      setTimeout(() => {
        toast(`<span class="bl-toast-icon">🎁</span> Your daily reward is ready — tap your profile to claim it!`, 3200);
      }, 2500);
    }
  });
})();
