(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  const setHeaderState = () => {
    header?.classList.toggle('scrolled', window.scrollY > 42);
  };
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  const closeMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!open));
    mobileMenu?.classList.toggle('open', !open);
    mobileMenu?.setAttribute('aria-hidden', String(open));
    document.body.classList.toggle('menu-open', !open);
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  // The source logo is kept as-is. If an external host is unavailable, the textual lockup
  // preserves a useful, intentional fallback without distorting or replacing the asset.
  document.querySelectorAll('.brand-image').forEach((image) => {
    image.addEventListener('error', () => {
      image.hidden = true;
      const fallback = image.nextElementSibling;
      if (fallback) fallback.style.display = 'inline-block';
    });
  });

  // Ambient canvas: a deliberately light 2D enhancement. All meaningful hero content
  // remains in the DOM and CSS, so a slow or unsupported canvas never leaves a blank scene.
  const canvas = document.querySelector('[data-ambient]');
  const scene = document.querySelector('[data-scene]');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) {
      let width = 0;
      let height = 0;
      let particles = [];
      let raf = 0;
      const particleCount = () => window.innerWidth < 700 ? 12 : 22;

      const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        particles = Array.from({ length: particleCount() }, (_, index) => ({
          x: Math.random() * width,
          y: Math.random() * height,
          size: index % 5 === 0 ? 1.5 : .7 + Math.random() * .9,
          speed: .08 + Math.random() * .18,
          drift: (Math.random() - .5) * .08,
          opacity: .15 + Math.random() * .36,
        }));
      };
      const draw = () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((particle) => {
          particle.y -= particle.speed;
          particle.x += particle.drift;
          if (particle.y < -10) particle.y = height + 10;
          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
          ctx.beginPath();
          ctx.fillStyle = `rgba(162, 206, 72, ${particle.opacity})`;
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        });
        raf = window.requestAnimationFrame(draw);
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });
      draw();
      window.addEventListener('pagehide', () => window.cancelAnimationFrame(raf), { once: true });
    }
  }

  // A restrained pointer shift adds depth on large screens only; it is not required to use the site.
  if (scene && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    scene.addEventListener('pointermove', (event) => {
      const bounds = scene.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      scene.style.setProperty('--pointer-x', `${x * 8}px`);
      scene.style.setProperty('--pointer-y', `${y * 5}px`);
    });
    scene.addEventListener('pointerleave', () => {
      scene.style.setProperty('--pointer-x', '0px');
      scene.style.setProperty('--pointer-y', '0px');
    });
  }

  // Simple, keyboard-accessible visual comparison divider.
  const comparison = document.querySelector('[data-comparison]');
  const handle = comparison?.querySelector('.comparison-handle');
  const after = comparison?.querySelector('.comparison-after');
  const setComparison = (value) => {
    if (!comparison || !handle || !after) return;
    const safeValue = Math.max(10, Math.min(90, Number(value)));
    after.style.width = `${safeValue}%`;
    handle.style.left = `${safeValue}%`;
    handle.setAttribute('aria-valuenow', String(Math.round(safeValue)));
  };
  const updateFromPointer = (event) => {
    if (!comparison) return;
    const bounds = comparison.getBoundingClientRect();
    setComparison(((event.clientX - bounds.left) / bounds.width) * 100);
  };
  comparison?.addEventListener('pointerdown', (event) => {
    comparison.setPointerCapture?.(event.pointerId);
    updateFromPointer(event);
  });
  comparison?.addEventListener('pointermove', (event) => {
    if (event.buttons) updateFromPointer(event);
  });
  handle?.addEventListener('keydown', (event) => {
    const current = Number(handle.getAttribute('aria-valuenow')) || 52;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setComparison(current - 4);
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setComparison(current + 4);
    }
    if (event.key === 'Home') { event.preventDefault(); setComparison(10); }
    if (event.key === 'End') { event.preventDefault(); setComparison(90); }
  });

  const fileInput = document.querySelector('.file-field input[type=file]');
  const fileLabel = document.querySelector('.file-label');
  fileInput?.addEventListener('change', () => {
    const name = fileInput.files?.[0]?.name;
    if (name && fileLabel) fileLabel.innerHTML = `${name}<b>✓</b>`;
  });

  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-form-status]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = new FormData(form).get('name')?.toString().trim() || 'there';
    if (status) {
      status.textContent = `Thanks, ${name}. This demo is not connected to a live inbox yet. Please call (813) 833-7124 to reach Bugs at Bay directly.`;
      status.classList.add('visible');
      status.focus();
    }
  });
})();
