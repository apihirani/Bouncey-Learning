/* =========================================================
   GigglyLearn — script.js
   Loader, navbar, mobile menu, theme toggle, GSAP scroll reveals,
   adventure-path draw, counters, countdown, tilt, ripple, confetti.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Year in footer ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- LOADER ---------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('is-hidden');
      document.body.style.overflow = '';
      initScrollAnimations();
    }, 1200);
  });
  document.body.style.overflow = 'hidden';
  // safety fallback in case 'load' fires very late
  setTimeout(() => {
    if (!loader.classList.contains('is-hidden')) {
      loader.classList.add('is-hidden');
      document.body.style.overflow = '';
      initScrollAnimations();
    }
  }, 4000);

  /* ---------- NAVBAR SCROLL STATE ---------- */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 30);
    const btt = document.getElementById('backToTop');
    if (btt) btt.classList.toggle('is-visible', window.scrollY > 600);
  });

  /* ---------- SEARCH TOGGLE ---------- */
  const searchToggle = document.getElementById('searchToggle');
  const searchBar = document.getElementById('searchBar');
  searchToggle?.addEventListener('click', () => {
    searchBar.classList.toggle('is-open');
    if (searchBar.classList.contains('is-open')) {
      searchBar.querySelector('input')?.focus();
    }
  });

  /* ---------- THEME TOGGLE ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const savedTheme = localStorage.getItem ? null : null; // storage intentionally not persisted (artifact-safe pattern)
  themeToggle?.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  });

  /* ---------- HAMBURGER / MOBILE MENU ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    hamburger.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('is-open');
    hamburger.classList.remove('is-open');
  }));

  /* ---------- BACK TO TOP ---------- */
  document.getElementById('backToTop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- SMOOTH ANCHOR SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ---------- RIPPLE EFFECT ---------- */
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      circle.style.cssText = `
        position:absolute; border-radius:50%; pointer-events:none;
        width:${size}px; height:${size}px;
        left:${e.clientX - rect.left - size / 2}px; top:${e.clientY - rect.top - size / 2}px;
        background:rgba(255,255,255,.55); transform:scale(0); opacity:1;
        animation:rippleAnim .6s ease-out forwards;`;
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 650);
    });
  });
  const rippleStyle = document.createElement('style');
  rippleStyle.textContent = `@keyframes rippleAnim{to{transform:scale(2.6);opacity:0;}}`;
  document.head.appendChild(rippleStyle);

  /* ---------- CARD TILT EFFECT ---------- */
  const tiltTargets = document.querySelectorAll('.cat-card, .game-card, .badge-card, .testimonial-card, .blog-card');
  tiltTargets.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ---------- DAILY CHALLENGE COUNTDOWN (to next local midnight) ---------- */
  const cdH = document.getElementById('cd-hours');
  const cdM = document.getElementById('cd-minutes');
  const cdS = document.getElementById('cd-seconds');
  function pad(n) { return String(n).padStart(2, '0'); }
  function tickCountdown() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const diff = next - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (cdH) cdH.textContent = pad(h);
    if (cdM) cdM.textContent = pad(m);
    if (cdS) cdS.textContent = pad(s);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ---------- CONFETTI ON "ACCEPT CHALLENGE" ---------- */
  const acceptBtn = document.getElementById('acceptChallenge');
  acceptBtn?.addEventListener('click', () => {
    fireConfetti();
  });

  /* ---------- NEWSLETTER FORM ---------- */
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterMsg = document.getElementById('newsletterMsg');
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    newsletterMsg.textContent = "🎉 You're on the list! Watch your inbox for new games.";
    newsletterForm.reset();
    fireConfetti(60);
  });

  /* ---------- GSAP SCROLL REVEALS + ADVENTURE PATH DRAW ---------- */
  function initScrollAnimations() {
    if (typeof gsap === 'undefined') {
      document.querySelectorAll('.reveal-up').forEach(el => el.style.opacity = 1);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.reveal-up').forEach((el, i) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: (i % 3) * 0.08,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      });
    });

    // Hero entrance sequence
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.hero-title', { opacity: 0, y: 30, duration: 0.9 })
      .from('.hero-sub', { opacity: 0, y: 20, duration: 0.7 }, '-=0.5')
      .from('.hero-cta-row', { opacity: 0, y: 20, duration: 0.7 }, '-=0.4')
      .from('.hero-stats', { opacity: 0, y: 20, duration: 0.7 }, '-=0.4')
      .from('.hero-card', { opacity: 0, scale: .9, duration: 0.9 }, '-=0.9')
      .from('.floating-chip', { opacity: 0, scale: .7, stagger: 0.15, duration: 0.5 }, '-=0.4');

    // Adventure path draw-on-scroll
    const pathLine = document.getElementById('adventurePathLine');
    if (pathLine) {
      const len = pathLine.getTotalLength();
      pathLine.style.strokeDasharray = len;
      pathLine.style.strokeDashoffset = len;
      gsap.to(pathLine, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.adventure-path-wrap',
          start: 'top 70%',
          end: 'bottom 60%',
          scrub: 1
        }
      });
    }

    // Counter animation
    document.querySelectorAll('.stat-num').forEach(el => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      const obj = { val: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            val: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.floor(obj.val).toLocaleString(); }
          });
        }
      });
    });

    // Gentle parallax on hero floaters
    gsap.utils.toArray('.hf').forEach((el, i) => {
      gsap.to(el, {
        y: (i % 2 === 0 ? -30 : 30),
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------- CONFETTI ENGINE (canvas) ---------- */
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const confettiColors = ['#7C3AED', '#06B6D4', '#FACC15', '#EC4899', '#10B981'];
  let particles = [];
  let confettiRAF = null;

  function fireConfetti(count = 120) {
    const originX = window.innerWidth / 2;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: originX + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * -10 - 4,
        size: Math.random() * 8 + 4,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        life: 0
      });
    }
    if (!confettiRAF) confettiRAF = requestAnimationFrame(updateConfetti);
  }

  function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.vy += 0.28;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    particles = particles.filter(p => p.y < window.innerHeight + 40 && p.life < 220);
    if (particles.length > 0) {
      confettiRAF = requestAnimationFrame(updateConfetti);
    } else {
      confettiRAF = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // If GSAP already available before window 'load' fires (cached), reveal fallback quickly too
  if (document.readyState === 'complete') {
    setTimeout(initScrollAnimations, 1300);
  }

  // Expose confetti so the Arcade module can celebrate round/game wins
  window.fireConfetti = fireConfetti;
});
