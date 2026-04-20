// =============================================
// NAVBAR SCROLL EFFECT
// =============================================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// =============================================
// ACTIVE NAV LINK HIGHLIGHTING
// =============================================
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const highlightNav = () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 100;
    if (window.scrollY >= top) current = section.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.style.color = link.getAttribute('href') === `#${current}` ? 'var(--accent1)' : '';
  });
};
window.addEventListener('scroll', highlightNav);

// =============================================
// REVEAL ON SCROLL (INTERSECTION OBSERVER)
// =============================================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// =============================================
// ANIMATED COUNTERS
// =============================================
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const step = target / (duration / 16);
  let current = 0;

  const tick = () => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString();
    if (current < target) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-target]').forEach(el => counterObserver.observe(el));

// =============================================
// SMOOTH NAV CLICK WITH OFFSET
// =============================================
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// =============================================
// PARALLAX ORB MOVE ON MOUSE
// =============================================
const orbs = document.querySelectorAll('.hero-orb');
document.addEventListener('mousemove', e => {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = (e.clientX - cx) / cx;
  const dy = (e.clientY - cy) / cy;
  orbs.forEach((orb, i) => {
    const factor = (i + 1) * 18;
    orb.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
  });
});

// =============================================
// IMAGE LIGHTBOX
// =============================================
const overlay = document.createElement('div');
overlay.id = 'lightbox';
Object.assign(overlay.style, {
  display: 'none', position: 'fixed', inset: '0',
  background: 'rgba(0,0,0,.92)', zIndex: '999',
  alignItems: 'center', justifyContent: 'center',
  cursor: 'zoom-out', backdropFilter: 'blur(6px)',
  padding: '2rem',
});
overlay.innerHTML = `<img id="lb-img" style="max-width:90vw;max-height:88vh;border-radius:12px;box-shadow:0 0 80px rgba(0,0,0,.8);" />`;
document.body.appendChild(overlay);

const lbImg = document.getElementById('lb-img');

document.querySelectorAll('.viz-card img').forEach(img => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => {
    lbImg.src = img.src;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
});

overlay.addEventListener('click', () => {
  overlay.style.display = 'none';
  document.body.style.overflow = '';
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { overlay.style.display = 'none'; document.body.style.overflow = ''; }
});

// =============================================
// HERO TITLE TYPING BLINK CURSOR
// =============================================
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
  heroTitle.style.animation = 'fadeInUp .8s ease both';
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity:0; transform:translateY(30px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .hero-badge   { animation: fadeInUp .6s ease .1s both; }
    .hero-title   { animation: fadeInUp .7s ease .2s both; }
    .hero-subtitle{ animation: fadeInUp .7s ease .35s both; }
    .hero-stats   { animation: fadeInUp .7s ease .5s both; }
    .hero-cta     { animation: fadeInUp .7s ease .65s both; }
    .scroll-indicator { animation: fadeInUp .7s ease .8s both; }
  `;
  document.head.appendChild(style);
}

console.log('%c Air Quality · AI 🌬️', 'font-size:18px;font-weight:bold;color:#38bdf8');
console.log('%c Built with: Python · scikit-learn · pandas · seaborn', 'color:#a78bfa');

// =============================================
// LIVE AIR QUALITY MONITOR
// =============================================

const GEO_URL  = 'https://geocoding-api.open-meteo.com/v1/search';
const AQI_URL  = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const el = id => document.getElementById(id);
const show = id => el(id).classList.remove('hidden');
const hide = id => el(id).classList.add('hidden');

// --- WHO thresholds for bar fill % ---
const THRESHOLDS = { co: 4000, no2: 200, pm25: 75, pm10: 150, o3: 240 };

// --- AQI categories (European AQI) ---
function aqiInfo(aqi) {
  if (aqi <= 20) return { label: '🌿 Good',          color: '#34d399' };
  if (aqi <= 40) return { label: '🌤️ Fair',           color: '#86efac' };
  if (aqi <= 60) return { label: '🌫️ Moderate',       color: '#facc15' };
  if (aqi <= 80) return { label: '😷 Poor',           color: '#fb923c' };
  if (aqi <= 100) return { label: '☠️ Very Poor',     color: '#f87171' };
  return                  { label: '🚨 Extremely Poor', color: '#c084fc' };
}

// --- Canvas AQI Gauge ---
function drawAQIGauge(canvasEl, aqi) {
  const ctx = canvasEl.getContext('2d');
  const W = canvasEl.width, H = canvasEl.height;
  const cx = W / 2, cy = H - 10, R = 100, lw = 16;
  ctx.clearRect(0, 0, W, H);

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = lw; ctx.lineCap = 'butt';
  ctx.stroke();

  // Colour segments
  const segments = [
    { from: 0,   to: 20,  color: '#34d399' },
    { from: 20,  to: 40,  color: '#86efac' },
    { from: 40,  to: 60,  color: '#facc15' },
    { from: 60,  to: 80,  color: '#fb923c' },
    { from: 80,  to: 100, color: '#f87171' },
    { from: 100, to: 120, color: '#c084fc' },
  ];
  const maxAQI = 120;
  segments.forEach(seg => {
    const sa = Math.PI + (seg.from / maxAQI) * Math.PI;
    const ea = Math.PI + (seg.to  / maxAQI) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, R, sa, ea);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = lw - 2; ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Active arc
  const pct = Math.min(aqi / maxAQI, 1);
  const endAngle = Math.PI + pct * Math.PI;
  const info = aqiInfo(aqi);
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, endAngle);
  ctx.strokeStyle = info.color;
  ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.shadowColor = info.color; ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Needle
  const needleAngle = Math.PI + pct * Math.PI;
  const nx = cx + (R - 10) * Math.cos(needleAngle);
  const ny = cy + (R - 10) * Math.sin(needleAngle);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.stroke();
  // Centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
}

// --- Hardcoded Prediction Logic ---
function getHardcodedPredictions(c, aqi) {
  // Hardcoded Rule 1: Rush Hour
  const hour = new Date(c.time || new Date()).getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const rushRes = { 
    text: isRushHour ? 'Active Rush Hour' : 'No Rush Hour', 
    cls: isRushHour ? 'rush' : 'norush' 
  };

  // Hardcoded Rule 2: CO Level Class
  const co = c.carbon_monoxide ?? 0;
  const isHighCO = co > 1000; 
  const coClass = { 
    text: isHighCO ? 'High CO Level' : 'Normal CO', 
    cls: isHighCO ? 'high' : 'low' 
  };

  // Hardcoded Rule 3: Benzene Estimate (Proxy from CO)
  const benzene = (co * 0.003).toFixed(2);

  // Hardcoded Rule 4: Cluster
  let cluster = '🌿 Cluster 0 — Clean Air';
  if (aqi > 40) cluster = '🚗 Cluster 1 — Traffic';
  if (aqi > 80) cluster = '🏭 Cluster 2 — Heavy Pollution';

  // Hardcoded Rule 5: Health Risk
  let healthScore = Math.min(100, Math.round(aqi * 0.8));
  let healthLabel = 'Good';
  if (healthScore > 20) healthLabel = 'Moderate';
  if (healthScore > 50) healthLabel = 'Unhealthy';
  if (healthScore > 80) healthLabel = 'Hazardous';
  const health = { score: healthScore, label: healthLabel };

  return { coClass, benzene, rushRes, cluster, health };
}

// --- Update UI ---
function setPoll(id, barId, value, key) {
  if (value == null) { el(id).textContent = 'N/A'; return; }
  el(id).textContent = value < 10 ? value.toFixed(2) : Math.round(value);
  const pct = Math.min(100, (value / THRESHOLDS[key]) * 100).toFixed(1);
  el(barId).style.setProperty('--pct', pct + '%');
}

async function displayData(cityLabel, data) {
  const c = data.current;
  const aqi = c.european_aqi ?? 0;
  const info = aqiInfo(aqi);

  // Header
  el('live-city-name').textContent = cityLabel;
  el('live-updated').textContent = '🕐 Updated: ' + new Date(c.time).toLocaleString();

  // Gauge
  drawAQIGauge(el('aqi-gauge'), aqi);
  el('aqi-value').textContent = aqi;
  el('aqi-value').style.color = info.color;
  const catEl = el('aqi-category');
  catEl.textContent = info.label;
  catEl.style.color = info.color;
  catEl.style.borderColor = info.color + '44';

  // Pollutants
  setPoll('val-co',   'bar-co',   c.carbon_monoxide,  'co');
  setPoll('val-no2',  'bar-no2',  c.nitrogen_dioxide, 'no2');
  setPoll('val-pm25', 'bar-pm25', c.pm2_5,            'pm25');
  setPoll('val-pm10', 'bar-pm10', c.pm10,             'pm10');
  setPoll('val-o3',   'bar-o3',   c.ozone,            'o3');

  // Hardcoded prediction
  const { coClass, benzene, rushRes, cluster, health } = getHardcodedPredictions(c, aqi);
  const setML = (id, res) => {
    el(id).textContent = res.text;
    el(id).className = 'ml-value ' + res.cls;
  };
  setML('ml-co-class', coClass);
  setML('ml-rush', rushRes);
  el('ml-benzene').textContent = health.score + " — " + health.label;
  let cls = 'ml-value';

  if (health.score < 20) cls += ' good';
  else if (health.score < 40) cls += ' moderate';
  else if (health.score < 60) cls += ' unhealthy';
  else if (health.score < 80) cls += ' very-unhealthy';
  else cls += ' hazardous';

el('ml-benzene').className = cls;
  el('ml-cluster').textContent = cluster;
  el('ml-cluster').className = 'ml-value';

  // Show
  hide('live-loading'); hide('live-error');
  show('live-panel');
}

// --- Fetch from Open-Meteo ---
async function fetchCity(city) {
  hide('live-panel'); hide('live-error');
  show('live-loading');

  try {
    // Step 1: Geocoding
    const geoRes = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) throw new Error('City not found');

    const { latitude, longitude, name, country } = geoData.results[0];
    const label = `${name}, ${country}`;

    // Step 2: Air Quality
    const aqRes = await fetch(
      `${AQI_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi,temperature_2m,relative_humidity_2m` +
      `&timezone=auto`
    );
    const aqData = await aqRes.json();
    if (!aqData.current) throw new Error('No data returned');

    await displayData(label, aqData);
  } catch (err) {
    hide('live-loading');
    el('error-msg').textContent = err.message || 'Something went wrong. Try another city.';
    show('live-error');
  }
}

// --- Geolocation ---
async function fetchByLocation() {
  if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
  hide('live-panel'); hide('live-error');
  show('live-loading');
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const { latitude, longitude } = pos.coords;
      const label = `📍 Your Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
      const aqRes = await fetch(
        `${AQI_URL}?latitude=${latitude}&longitude=${longitude}` +
        `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi,temperature_2m,relative_humidity_2m` +
        `&timezone=auto`
      );
      const aqData = await aqRes.json();
      if (!aqData.current) throw new Error('No data returned');
      await displayData(label, aqData);
    } catch (e) {
      hide('live-loading');
      el('error-msg').textContent = 'Could not fetch data for your location.';
      show('live-error');
    }
  }, () => {
    hide('live-loading');
    el('error-msg').textContent = 'Location access denied.';
    show('live-error');
  });
}

// --- Event Listeners ---
el('search-btn').addEventListener('click', () => {
  const city = el('city-input').value.trim();
  if (city) fetchCity(city);
});
el('city-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const city = el('city-input').value.trim(); if (city) fetchCity(city); }
});
el('locate-btn').addEventListener('click', fetchByLocation);
el('refresh-btn').addEventListener('click', () => {
  const city = el('city-input').value.trim();
  if (city) fetchCity(city); else fetchByLocation();
});
document.querySelectorAll('.qc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    el('city-input').value = btn.dataset.city;
    fetchCity(btn.dataset.city);
  });
});

// Auto-load Delhi on first scroll into the Live section
const liveSectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      if (el('live-panel').classList.contains('hidden')) {
        el('city-input').value = 'Delhi';
        fetchCity('Delhi');
      }
      liveSectionObserver.disconnect();
    }
  });
}, { threshold: 0.3 });
const liveSection = document.getElementById('live');
if (liveSection) liveSectionObserver.observe(liveSection);

