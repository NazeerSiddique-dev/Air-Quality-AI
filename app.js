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



// =============================================
// ACCORDION LOGIC
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  const accordionHeaders = document.querySelectorAll('.accordion-header, .sub-accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const item = this.parentElement;
      
      // Close peers if we want exclusive opening (optional, skipping for now to allow multiple open)
      item.classList.toggle('active');
      
      // Fix highlighting for newly visible elements
      setTimeout(() => {
        document.querySelectorAll('.accordion-item.active .reveal, .sub-accordion-item.active .reveal').forEach(el => {
          el.classList.add('visible');
        });
      }, 300);
    });
  });
});

// =============================================
// CODE VIEWER LOGIC (LAB 1 PART 1)
// =============================================
const lab1Codes = {"e1": "import pandas as pd\n\ndf = pd.read_csv(\"data/AirQuality.csv\")\n\nprint(\"CSV DATA:\")\nprint(df)\n\nprint(\"\\nMissing Values:\")\nprint(df.isnull().sum())\n", "e2": "# Write data to a binary file\n\ndata = [10, 20, 30, 40, 50,60,70,80]\n\nwith open(\"numbers.bin\", \"wb\") as f:\n    for num in data:\n        f.write(num.to_bytes(4, byteorder=\"little\"))\n\nprint(\"Binary file written successfully.\")\n\n# ------------------------------------\n\n# Read data from a binary file\n\nnumbers = []\n\nwith open(\"numbers.bin\", \"rb\") as f:\n    while True:\n        bytes_data = f.read(4)\n        if not bytes_data:\n            break\n        number = int.from_bytes(bytes_data, byteorder=\"little\")\n        numbers.append(number)\n\nprint(\"Numbers read from binary file:\")\nprint(numbers)\n", "e3": "import re\n\n# read file\nwith open(\"input.txt\", \"r\") as f:\n    text = f.read()\n\nprint(\"Original Text:\\n\")\nprint(text)\n\n# 1. find all emails\nemails = re.findall(r\"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+\", text)\nprint(\"\\nEmails Found:\")\nprint(emails)\n\n# 2. find phone numbers\nphones = re.findall(r\"\\d{10}\", text)\nprint(\"\\nPhone Numbers Found:\")\nprint(phones)\n\n# 3. replace gmail domain\nreplaced_text = re.sub(r\"gmail.com\", \"university.edu\", text)\nprint(\"\\nText After Replacement:\")\nprint(replaced_text)\n\n# 4. extract names\nnames = re.findall(r\"Name:\\s(\\w+)\", text)\nprint(\"\\nNames Extracted:\")\nprint(names)\n\n\n", "e4": "import sqlite3\n\nconn = sqlite3.connect(\"students.db\")\ncursor = conn.cursor()\n\nprint(\"Initial Records:\")\nfor row in cursor.execute(\"SELECT * FROM students\"):\n    print(row)\n\n# INSERT\ncursor.execute(\"INSERT INTO students(name,age,city) VALUES('David',26,'Chennai')\")\nprint(\"\\nRecord Inserted\")\n\n# READ\nprint(\"\\nAfter Insert:\")\nfor row in cursor.execute(\"SELECT * FROM students\"):\n    print(row)\n\n# UPDATE\ncursor.execute(\"UPDATE students SET age=24 WHERE name='Alice'\")\nprint(\"\\nRecord Updated (Alice age changed)\")\n\n# DELETE\ncursor.execute(\"DELETE FROM students WHERE name='Bob'\")\nprint(\"\\nRecord Deleted (Bob removed)\")\n\nconn.commit()\n\nprint(\"\\nFinal Records:\")\nfor row in cursor.execute(\"SELECT * FROM students\"):\n    print(row)\n\nconn.close()", "e5": "# Exercise 5: MongoDB operations using PyMongo\n\nfrom pymongo import MongoClient\n\n# connect to MongoDB\nclient = MongoClient(\"mongodb://localhost:27017/\")\n\n# create database\ndb = client[\"lab_database\"]\n\n# create collection\ncollection = db[\"students\"]\n\n# insert documents\ncollection.insert_one({\"name\":\"Alice\",\"age\":23,\"city\":\"Delhi\"})\ncollection.insert_one({\"name\":\"Bob\",\"age\":25,\"city\":\"Mumbai\"})\ncollection.insert_one({\"name\":\"dev\",\"age\":20,\"city\":\"Kanpur\"})\n\nprint(\"Documents inserted.\")\n\n# read documents\nprint(\"\\nAll Students:\")\nfor doc in collection.find():\n    print(doc)\n\n# update document\ncollection.update_one(\n    {\"name\":\"Alice\"},\n    {\"$set\":{\"age\":24}}\n)\n\nprint(\"\\nDocument Updated (Alice age changed).\")\n\n# delete document\ncollection.delete_one({\"name\":\"Bob\"})\n\nprint(\"\\nDocument Deleted (Bob removed).\")\n\n# show final documents\nprint(\"\\nFinal Records:\")\nfor doc in collection.find():\n    print(doc)", "e6": "# Exercise 6: NumPy Operations\n\nimport numpy as np\n\n# 1. Create a NumPy array\narr1 = np.array([1, 2, 3, 4, 5])\nprint(\"1D Array:\")\nprint(arr1)\n\n# 2. Create a 2D array\narr2 = np.array([[1,2,3],[4,5,6]])\nprint(\"\\n2D Array:\")\nprint(arr2)\n\n# 3. Reshape array\narr3 = np.arange(6)\nreshaped = arr3.reshape(2,3)\nprint(\"\\nReshaped Array (2x3):\")\nprint(reshaped)\n\n# 4. Arithmetic operations\nprint(\"\\nArithmetic Operations:\")\nprint(\"Add 5:\", arr1 + 5)\nprint(\"Multiply by 2:\", arr1 * 2)\n\n# 5. Aggregation operations\narr4 = np.array([10,20,30,40])\n\nprint(\"\\nAggregation Operations:\")\nprint(\"Sum:\", arr4.sum())\nprint(\"Mean:\", arr4.mean())\nprint(\"Max:\", arr4.max())\nprint(\"Min:\", arr4.min())", "e7": "# Exercise: Pandas Data Analysis on Air Quality Dataset\n\nimport pandas as pd\n\n# Load dataset (semicolon separated)\ndf = pd.read_csv(\"AirQuality.csv\", sep=\";\")\n\n# Remove empty columns\ndf = df.drop(columns=[\"Unnamed: 15\", \"Unnamed: 16\"], errors=\"ignore\")\n\nprint(\"First 5 Rows of Dataset:\")\nprint(df.head())\n\n# Dataset info\nprint(\"\\nDataset Info:\")\nprint(df.info())\n\n# Check missing values\nprint(\"\\nMissing Values in Each Column:\")\nprint(df.isnull().sum())\n\n# Replace comma with dot for numeric conversion\ndf = df.replace(\",\", \".\", regex=True)\n\n# Convert columns to numeric where possible\nfor col in df.columns[2:]:\n    df[col] = pd.to_numeric(df[col], errors=\"coerce\")\n\n# Fill missing numeric values with mean\ndf_filled = df.fillna(df.mean(numeric_only=True))\n\nprint(\"\\nDataset After Handling Missing Values:\")\nprint(df_filled.head())\n\n# Boolean filtering: Temperature greater than 30\nhigh_temp = df_filled[df_filled[\"T\"] > 30]\n\nprint(\"\\nRows where Temperature > 30:\")\nprint(high_temp[[\"Date\", \"Time\", \"T\"]].head())\n\n# Aggregation operations\nprint(\"\\nAverage Temperature:\", df_filled[\"T\"].mean())\nprint(\"Maximum Temperature:\", df_filled[\"T\"].max())\nprint(\"Minimum Temperature:\", df_filled[\"T\"].min())\n\n# Save processed dataset\ndf_filled.to_csv(\"processed_airquality_dataset.csv\", index=False)\n\nprint(\"\\nProcessed dataset saved as processed_airquality_dataset.csv\")\n"};


const lab1Outputs = {
  "e1": "CSV DATA:\n                                                                                                            Date;Time;CO(GT);PT08.S1(CO);NMHC(GT);C6H6(GT);PT08.S2(NMHC);NOx(GT);PT08.S3(NOx);NO2(GT);PT08.S4(NO2);PT08.S5(O3);T;RH;AH;;\n10/03/2004;18.00.00;2            6;1360;150;11                 9;1046;166;1056;113;1692;1268;13 6;48 9;0                                                7578;;                                                                          \n10/03/2004;19.00.00;2;1292;112;9 4;955;103;1174;92;1559;972;13 3;47                             7;0  7255;;                                                NaN                                                                          \n10/03/2004;20.00.00;2            2;1402;88;9                   0;939;131;1140;114;1555;1074;11  9;54 0;0                                                7502;;                                                                          \n10/03/2004;21.00.00;2            2;1376;80;9                   2;948;172;1092;122;1584;1203;11  0;60 0;0                                                7867;;                                                                          \n10/03/2004;22.00.00;1            6;1272;51;6                   5;836;131;1205;116;1490;1110;11  2;59 6;0                                                7888;;                                                                          \n...                                                                                                                                                        ...                                                                          \n;;;;;;;;;;;;;;;;                 NaN                           NaN                              NaN  NaN                                                   NaN                                                                          \n                                                                                                     NaN                                                   NaN                                                                          \n                                                                                                     NaN                                                   NaN                                                                          \n                                                                                                     NaN                                                   NaN                                                                          \n                                                                                                     NaN                                                   NaN                                                                          \n\n[9471 rows x 1 columns]\n\nMissing Values:\nDate;Time;CO(GT);PT08.S1(CO);NMHC(GT);C6H6(GT);PT08.S2(NMHC);NOx(GT);PT08.S3(NOx);NO2(GT);PT08.S4(NO2);PT08.S5(O3);T;RH;AH;;    2556\ndtype: int64\n",
  "e2": "Binary file written successfully.\n\nNumbers read from binary file:\n[10, 20, 30, 40, 50, 60, 70, 80]\n",
  "e3": "Original Text:\n\nName: Alice\nEmail: alice@gmail.com\nPhone: 9876543210\n\nName: Bob\nEmail: bob@yahoo.com\nPhone: 9123456780\n\nName: Charlie\nEmail: charlie@hotmail.com\nPhone: 9988776655\n\n\nEmails Found:\n['alice@gmail.com', 'bob@yahoo.com', 'charlie@hotmail.com']\n\nPhone Numbers Found:\n['9876543210', '9123456780', '9988776655']\n\nText After Replacement:\nName: Alice\nEmail: alice@university.edu\nPhone: 9876543210\n\nName: Bob\nEmail: bob@yahoo.com\nPhone: 9123456780\n\nName: Charlie\nEmail: charlie@hotmail.com\nPhone: 9988776655\n\n\nNames Extracted:\n['Alice', 'Bob', 'Charlie']\n",
  "e4": "Initial Records:\n(1, 'Alice', 24, 'Delhi')\n(3, 'Charlie', 28, 'Bangalore')\n(4, 'David', 26, 'Chennai')\n(5, 'David', 26, 'Chennai')\n(6, 'David', 26, 'Chennai')\n(7, 'David', 26, 'Chennai')\n(8, 'Alice', 24, 'Delhi')\n(10, 'Charlie', 28, 'Bangalore')\n(11, 'David', 26, 'Chennai')\n(12, 'David', 26, 'Chennai')\n(13, 'David', 26, 'Chennai')\n(14, 'David', 26, 'Chennai')\n\nRecord Inserted\n\nAfter Insert:\n(1, 'Alice', 24, 'Delhi')\n(3, 'Charlie', 28, 'Bangalore')\n(4, 'David', 26, 'Chennai')\n(5, 'David', 26, 'Chennai')\n(6, 'David', 26, 'Chennai')\n(7, 'David', 26, 'Chennai')\n(8, 'Alice', 24, 'Delhi')\n(10, 'Charlie', 28, 'Bangalore')\n(11, 'David', 26, 'Chennai')\n(12, 'David', 26, 'Chennai')\n(13, 'David', 26, 'Chennai')\n(14, 'David', 26, 'Chennai')\n(15, 'David', 26, 'Chennai')\n\nRecord Updated (Alice age changed)\n\nRecord Deleted (Bob removed)\n\nFinal Records:\n(1, 'Alice', 24, 'Delhi')\n(3, 'Charlie', 28, 'Bangalore')\n(4, 'David', 26, 'Chennai')\n(5, 'David', 26, 'Chennai')\n(6, 'David', 26, 'Chennai')\n(7, 'David', 26, 'Chennai')\n(8, 'Alice', 24, 'Delhi')\n(10, 'Charlie', 28, 'Bangalore')\n(11, 'David', 26, 'Chennai')\n(12, 'David', 26, 'Chennai')\n(13, 'David', 26, 'Chennai')\n(14, 'David', 26, 'Chennai')\n(15, 'David', 26, 'Chennai')\n",
  "e5": "Documents inserted.\n\nAll Students:\n{'_id': ObjectId('69af12986554522152a39141'), 'name': 'Alice', 'age': 24, 'city': 'Delhi'}\n{'_id': ObjectId('69af12986554522152a39143'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n{'_id': ObjectId('69afccfc38ca0811a348125e'), 'name': 'Alice', 'age': 23, 'city': 'Delhi'}\n{'_id': ObjectId('69afccfc38ca0811a3481260'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n{'_id': ObjectId('69afd4d2fa4e7e7cfc3f2341'), 'name': 'Alice', 'age': 23, 'city': 'Delhi'}\n{'_id': ObjectId('69afd4d2fa4e7e7cfc3f2343'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n{'_id': ObjectId('69e3e0a4028a18fcb633f9d6'), 'name': 'Alice', 'age': 23, 'city': 'Delhi'}\n{'_id': ObjectId('69e3e0a4028a18fcb633f9d7'), 'name': 'Bob', 'age': 25, 'city': 'Mumbai'}\n{'_id': ObjectId('69e3e0a4028a18fcb633f9d8'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n\nDocument Updated (Alice age changed).\n\nDocument Deleted (Bob removed).\n\nFinal Records:\n{'_id': ObjectId('69af12986554522152a39141'), 'name': 'Alice', 'age': 24, 'city': 'Delhi'}\n{'_id': ObjectId('69af12986554522152a39143'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n{'_id': ObjectId('69afccfc38ca0811a348125e'), 'name': 'Alice', 'age': 23, 'city': 'Delhi'}\n{'_id': ObjectId('69afccfc38ca0811a3481260'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n{'_id': ObjectId('69afd4d2fa4e7e7cfc3f2341'), 'name': 'Alice', 'age': 23, 'city': 'Delhi'}\n{'_id': ObjectId('69afd4d2fa4e7e7cfc3f2343'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n{'_id': ObjectId('69e3e0a4028a18fcb633f9d6'), 'name': 'Alice', 'age': 23, 'city': 'Delhi'}\n{'_id': ObjectId('69e3e0a4028a18fcb633f9d8'), 'name': 'dev', 'age': 20, 'city': 'Kanpur'}\n",
  "e6": "1D Array:\n[1 2 3 4 5]\n\n2D Array:\n[[1 2 3]\n [4 5 6]]\n\nReshaped Array (2x3):\n[[0 1 2]\n [3 4 5]]\n\nArithmetic Operations:\nAdd 5: [ 6  7  8  9 10]\nMultiply by 2: [ 2  4  6  8 10]\n\nAggregation Operations:\nSum: 100\nMean: 25.0\nMax: 40\nMin: 10\n",
  "e7": "First 5 Rows of Dataset:\n         Date      Time CO(GT)  PT08.S1(CO)  ...  PT08.S5(O3)     T    RH      AH\n0  10/03/2004  18.00.00    2,6       1360.0  ...       1268.0  13,6  48,9  0,7578\n1  10/03/2004  19.00.00      2       1292.0  ...        972.0  13,3  47,7  0,7255\n2  10/03/2004  20.00.00    2,2       1402.0  ...       1074.0  11,9  54,0  0,7502\n3  10/03/2004  21.00.00    2,2       1376.0  ...       1203.0  11,0  60,0  0,7867\n4  10/03/2004  22.00.00    1,6       1272.0  ...       1110.0  11,2  59,6  0,7888\n\n[5 rows x 15 columns]\n\nDataset Info:\n<class 'pandas.core.frame.DataFrame'>\nRangeIndex: 9471 entries, 0 to 9470\nData columns (total 15 columns):\n #   Column         Non-Null Count  Dtype  \n---  ------         --------------  -----  \n 0   Date           9357 non-null   object \n 1   Time           9357 non-null   object \n 2   CO(GT)         9357 non-null   object \n 3   PT08.S1(CO)    9357 non-null   float64\n 4   NMHC(GT)       9357 non-null   float64\n 5   C6H6(GT)       9357 non-null   object \n 6   PT08.S2(NMHC)  9357 non-null   float64\n 7   NOx(GT)        9357 non-null   float64\n 8   PT08.S3(NOx)   9357 non-null   float64\n 9   NO2(GT)        9357 non-null   float64\n 10  PT08.S4(NO2)   9357 non-null   float64\n 11  PT08.S5(O3)    9357 non-null   float64\n 12  T              9357 non-null   object \n 13  RH             9357 non-null   object \n 14  AH             9357 non-null   object \ndtypes: float64(8), object(7)\nmemory usage: 1.1+ MB\nNone\n\nMissing Values in Each Column:\nDate             114\nTime             114\nCO(GT)           114\nPT08.S1(CO)      114\nNMHC(GT)         114\nC6H6(GT)         114\nPT08.S2(NMHC)    114\nNOx(GT)          114\nPT08.S3(NOx)     114\nNO2(GT)          114\nPT08.S4(NO2)     114\nPT08.S5(O3)      114\nT                114\nRH               114\nAH               114\ndtype: int64\n\nDataset After Handling Missing Values:\n         Date      Time  CO(GT)  PT08.S1(CO)  ...  PT08.S5(O3)     T    RH      AH\n0  10/03/2004  18.00.00     2.6       1360.0  ...       1268.0  13.6  48.9  0.7578\n1  10/03/2004  19.00.00     2.0       1292.0  ...        972.0  13.3  47.7  0.7255\n2  10/03/2004  20.00.00     2.2       1402.0  ...       1074.0  11.9  54.0  0.7502\n3  10/03/2004  21.00.00     2.2       1376.0  ...       1203.0  11.0  60.0  0.7867\n4  10/03/2004  22.00.00     1.6       1272.0  ...       1110.0  11.2  59.6  0.7888\n\n[5 rows x 15 columns]\n\nRows where Temperature > 30:\n            Date      Time     T\n1029  22/04/2004  15.00.00  30.8\n1030  22/04/2004  16.00.00  31.3\n1292  03/05/2004  14.00.00  30.3\n1293  03/05/2004  15.00.00  30.9\n1294  03/05/2004  16.00.00  30.2\n\nAverage Temperature: 9.778305012290264\nMaximum Temperature: 44.6\nMinimum Temperature: -200.0\n\nProcessed dataset saved as processed_airquality_dataset.csv\n"
};

document.addEventListener('DOMContentLoaded', () => {
  const codeBlock = document.getElementById('cv-code-block');
  const tabs = document.querySelectorAll('.cv-tab');
  const toggles = document.querySelectorAll('.cv-toggle');

  let currentTarget = 'e1';
  let currentMode = 'code';

  function updateCodeBlock() {
    if (!codeBlock) return;
    
    // Remove animation class to reset it
    codeBlock.classList.remove('code-fade-animate');
    
    // Trigger reflow to restart animation
    void codeBlock.offsetWidth;
    
    // Get content based on mode
    let content = '';
    if (currentMode === 'code') {
      content = lab1Codes[currentTarget] || '// Source code not found';
      codeBlock.className = 'language-python';
    } else {
      content = lab1Outputs[currentTarget] || 'No output available for this script.';
      codeBlock.className = ''; // plain text for output
    }
    
    codeBlock.textContent = content;
    codeBlock.classList.add('code-fade-animate');
  }

  if (codeBlock && tabs.length > 0) {
    // Initial setup
    updateCodeBlock();

    // Tab Listeners
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentTarget = e.target.getAttribute('data-target');
        updateCodeBlock();
      });
    });
    
    // Toggle Listeners
    if (toggles.length > 0) {
      toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          toggles.forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          currentMode = e.target.getAttribute('data-mode');
          updateCodeBlock();
        });
      });
    }
  }
});

// =============================================
// ML MODEL CARDS LOGIC (LAB 1 PART 2)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const mlCards = document.querySelectorAll('.ml-nav-card');
  const mlPanes = document.querySelectorAll('.ml-content-pane');

  if (mlCards.length > 0 && mlPanes.length > 0) {
    mlCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const clickedCard = e.target.closest('.ml-nav-card');
        if (!clickedCard) return;

        // Remove active class from all
        mlCards.forEach(c => c.classList.remove('active'));
        mlPanes.forEach(p => {
          p.classList.remove('active');
          // Force reflow for animation restart
          void p.offsetWidth;
        });

        // Add active to clicked
        clickedCard.classList.add('active');

        // Show target pane and fix reveal classes
        const targetId = clickedCard.getAttribute('data-target');
        const targetPane = document.getElementById(targetId);
        if (targetPane) {
          targetPane.classList.add('active');
          setTimeout(() => {
            targetPane.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
          }, 50);
        }
      });
    });
  }
});


// =============================================
// SUMMARY BUTTON LOGIC
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const sumBtn = document.getElementById('toggle-summary-btn');
  const sumWrapper = document.getElementById('summary-content-wrapper');
  
  if(sumBtn && sumWrapper) {
    let isOpen = false;
    sumBtn.addEventListener('click', () => {
      isOpen = !isOpen;
      if(isOpen) {
        sumBtn.textContent = 'Hide Project Summary';
        sumBtn.style.background = 'rgba(244, 114, 182, 0.1)';
        sumBtn.style.borderColor = 'rgba(244, 114, 182, 0.4)';
        sumBtn.style.color = '#f472b6';
        
        sumWrapper.style.maxHeight = '2500px';
        sumWrapper.style.opacity = '1';
        
        setTimeout(() => {
          sumWrapper.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        }, 300);
      } else {
        sumBtn.textContent = 'Reveal Project Summary';
        sumBtn.style.background = 'rgba(56, 189, 248, 0.1)';
        sumBtn.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        sumBtn.style.color = '#38bdf8';
        
        sumWrapper.style.maxHeight = '0';
        sumWrapper.style.opacity = '0';
        
        setTimeout(() => {
          sumWrapper.querySelectorAll('.reveal').forEach(el => el.classList.remove('visible'));
        }, 500);
      }
    });
  }
});


// =============================================
// LAB 2 PIPELINE LOGIC
// =============================================
const lab2Codes = {"l2-hdfs": "#!/usr/bin/env bash\n# =============================================================\n#  hdfs_setup.sh  \u2013  Start Hadoop, format if needed, upload CSV\n# =============================================================\nset -euo pipefail\n\nHADOOP_HOME=\"${HADOOP_HOME:-/home/nazeer/hadoop}\"\nHDFS_BIN=\"$HADOOP_HOME/bin/hdfs\"\nSBIN=\"$HADOOP_HOME/sbin\"\nCSV_LOCAL=\"/home/nazeer/DDM/hadoop_work/AirQuality.csv\"\nHDFS_DIR=\"/airquality\"\n\necho \"\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\"\necho \"   Hadoop HDFS Bootstrap\"\necho \"\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\"\n\n# 1. Check if NameNode is already running\nif jps | grep -q NameNode; then\n    echo \"\u2705 NameNode already running \u2013 skipping format/start.\"\nelse\n    echo \"\u25b6  Starting HDFS (NameNode + DataNode) \u2026\"\n\n    # Format only if there is no previous namenode data\n    NAMENODE_DIR=$(\"$HDFS_BIN\" getconf -confKey dfs.namenode.name.dir 2>/dev/null || echo \"/tmp/hadoop-${USER}/dfs/name\")\n    if [ ! -d \"$NAMENODE_DIR/current\" ]; then\n        echo \"  Formatting NameNode (first-time setup) \u2026\"\n        \"$HDFS_BIN\" namenode -format -force -nonInteractive 2>&1 | tail -5\n    fi\n\n    \"$SBIN/start-dfs.sh\"\n    sleep 5\n\n    if jps | grep -q NameNode; then\n        echo \"\u2705 HDFS started successfully.\"\n    else\n        echo \"\u274c HDFS failed to start. Check logs at $HADOOP_HOME/logs/\"\n        exit 1\n    fi\nfi\n\n# 2. Create HDFS directory and upload CSV\necho \"\"\necho \"\u25b6  Uploading AirQuality.csv to HDFS \u2026\"\n\"$HDFS_BIN\" dfs -mkdir -p \"$HDFS_DIR\"\n\"$HDFS_BIN\" dfs -put -f \"$CSV_LOCAL\" \"$HDFS_DIR/\"\necho \"\u2705 File uploaded:\"\n\"$HDFS_BIN\" dfs -ls \"$HDFS_DIR/\"\necho \"\"\necho \"\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\"\necho \"  HDFS is ready. Now run:\"\necho \"  bash run_pipeline.sh\"\necho \"\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\"\n", "l2-pre": "\"\"\"\n=============================================================\n Step 1 \u2013 Air Quality Data Preprocessing\n=============================================================\n Responsibilities:\n   \u2022 Read raw CSV (semicolon-delimited, comma-decimal)\n   \u2022 Fix decimal format: replace ',' with '.' and cast to Double\n   \u2022 Handle missing values encoded as -200 (replace with null, then impute)\n   \u2022 Feature engineering: extract Hour from Time column\n   \u2022 Write cleaned data as Parquet to HDFS (or local)\n\n Usage:\n   Local:  spark-submit 01_preprocess.py\n   HDFS:   spark-submit 01_preprocess.py --hdfs\n=============================================================\n\"\"\"\n\nimport sys\nimport logging\nfrom pyspark.sql import SparkSession\nfrom pyspark.sql import functions as F\nfrom pyspark.sql.types import DoubleType\nfrom pyspark.ml.feature import Imputer\n\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n# Configuration  (switch with --hdfs flag)\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nUSE_HDFS = \"--hdfs\" in sys.argv\nHDFS_ROOT = \"hdfs://localhost:9000\"\nLOCAL_BASE = \"/home/nazeer/DDM/hadoop_work\"\n\nif USE_HDFS:\n    INPUT_PATH  = f\"{HDFS_ROOT}/airquality/AirQuality.csv\"\n    OUTPUT_PATH = f\"{HDFS_ROOT}/airquality/cleaned_data\"\nelse:\n    INPUT_PATH  = f\"{LOCAL_BASE}/AirQuality.csv\"\n    OUTPUT_PATH = f\"{LOCAL_BASE}/spark_pipeline/output/cleaned_data\"\n\nMISSING_VALUE = -200.0          # sentinel used in the dataset for missing data\nMISSING_THRESHOLD = 0.40        # drop column if > 40 % of values are missing\n\n# All numeric sensor / measurement columns in the raw file\nRAW_NUMERIC_COLS = [\n    \"CO_GT\", \"PT08_S1_CO\", \"NMHC_GT\", \"C6H6_GT\",\n    \"PT08_S2_NMHC\", \"NOx_GT\", \"PT08_S3_NOx\",\n    \"NO2_GT\", \"PT08_S4_NO2\", \"PT08_S5_O3\",\n    \"T\", \"RH\", \"AH\"\n]\n\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n# Logging\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nlogging.basicConfig(\n    level=logging.INFO,\n    format=\"%(asctime)s  [%(levelname)s]  %(message)s\",\n    datefmt=\"%Y-%m-%d %H:%M:%S\",\n)\nlog = logging.getLogger(\"AirQuality-Preprocess\")\nlog.info(f\"Mode: {'HDFS' if USE_HDFS else 'LOCAL'}\")\n\n\ndef create_spark_session() -> SparkSession:\n    return (\n        SparkSession.builder\n        .appName(\"AirQuality-Preprocessing\")\n        .config(\"spark.sql.shuffle.partitions\", \"4\")   # sensible for laptop\n        .getOrCreate()\n    )\n\n\ndef read_raw(spark: SparkSession, path: str):\n    \"\"\"\n    Read the raw CSV.\n    The file uses semicolons as field separators and commas as\n    decimal separators (European locale), so every numeric column\n    arrives as a string such as '13,6'.\n    \"\"\"\n    log.info(f\"Reading raw CSV from: {path}\")\n    df = (\n        spark.read\n        .option(\"header\", \"true\")\n        .option(\"sep\", \";\")\n        .option(\"inferSchema\", \"false\")   # read everything as string first\n        .csv(path)\n    )\n    log.info(f\"Raw schema: {df.dtypes}\")\n    log.info(f\"Row count (raw): {df.count()}\")\n    return df\n\n\ndef sanitise_column_names(df):\n    \"\"\"\n    Rename columns to safe names (no dots, brackets, spaces).\n    Original example: 'PT08.S1(CO)' \u2192 'PT08_S1_CO'\n    \"\"\"\n    rename_map = {\n        \"CO(GT)\":          \"CO_GT\",\n        \"PT08.S1(CO)\":     \"PT08_S1_CO\",\n        \"NMHC(GT)\":        \"NMHC_GT\",\n        \"C6H6(GT)\":        \"C6H6_GT\",\n        \"PT08.S2(NMHC)\":   \"PT08_S2_NMHC\",\n        \"NOx(GT)\":         \"NOx_GT\",\n        \"PT08.S3(NOx)\":    \"PT08_S3_NOx\",\n        \"NO2(GT)\":         \"NO2_GT\",\n        \"PT08.S4(NO2)\":    \"PT08_S4_NO2\",\n        \"PT08.S5(O3)\":     \"PT08_S5_O3\",\n        \"T\":               \"T\",\n        \"RH\":              \"RH\",\n        \"AH\":              \"AH\",\n    }\n    for old, new in rename_map.items():\n        if old in df.columns:\n            df = df.withColumnRenamed(old, new)\n\n    # Drop any unnamed trailing columns produced by trailing semicolons\n    df = df.select([c for c in df.columns if c.strip()])\n    return df\n\n\ndef fix_decimal_format(df, cols):\n    \"\"\"\n    Replace ',' with '.' in all numeric string columns, then cast to Double.\n    \"\"\"\n    log.info(\"Fixing decimal format (comma \u2192 dot) and casting to Double \u2026\")\n    for col in cols:\n        if col in df.columns:\n            df = df.withColumn(\n                col,\n                F.regexp_replace(F.col(col), \",\", \".\").cast(DoubleType())\n            )\n    return df\n\n\ndef replace_missing(df, cols, sentinel=MISSING_VALUE):\n    \"\"\"\n    Replace the sentinel value (-200) with null so Spark's Imputer\n    can handle it properly.\n    \"\"\"\n    log.info(f\"Replacing sentinel {sentinel} with null \u2026\")\n    for col in cols:\n        if col in df.columns:\n            df = df.withColumn(\n                col,\n                F.when(F.col(col) == sentinel, None).otherwise(F.col(col))\n            )\n    return df\n\n\ndef drop_high_missing_cols(df, cols, threshold=MISSING_THRESHOLD):\n    \"\"\"\n    Drop any column where more than `threshold` fraction of rows are null.\n    NMHC(GT) is typically ~90 % missing in this dataset, so it will be removed.\n    \"\"\"\n    total = df.count()\n    cols_to_keep = []\n    dropped = []\n    for col in cols:\n        if col not in df.columns:\n            continue\n        null_frac = df.filter(F.col(col).isNull()).count() / total\n        if null_frac > threshold:\n            dropped.append((col, f\"{null_frac:.1%}\"))\n        else:\n            cols_to_keep.append(col)\n    if dropped:\n        log.warning(f\"Dropping columns with > {threshold:.0%} missing: {dropped}\")\n        df = df.drop(*[c for c, _ in dropped])\n    return df, cols_to_keep\n\n\ndef impute_missing(df, cols):\n    \"\"\"\n    Use Spark ML Imputer (mean strategy) to fill remaining nulls.\n    Imputer requires DoubleType columns and outputs new '_imputed' columns;\n    we then overwrite the originals for a clean schema.\n    \"\"\"\n    log.info(f\"Imputing missing values with mean strategy for: {cols}\")\n    output_cols = [c + \"_imputed\" for c in cols]\n\n    imputer = Imputer(\n        strategy=\"mean\",\n        inputCols=cols,\n        outputCols=output_cols,\n    )\n    df = imputer.fit(df).transform(df)\n\n    # Overwrite originals with imputed values, then drop helper columns\n    for orig, imp in zip(cols, output_cols):\n        df = df.withColumn(orig, F.col(imp)).drop(imp)\n\n    return df\n\n\ndef engineer_features(df):\n    \"\"\"\n    Extract Hour-of-day from the 'Time' column (format: HH.mm.ss).\n    Air quality is strongly correlated with traffic cycles.\n    Also parse Date and create a proper timestamp.\n    \"\"\"\n    log.info(\"Engineering features: extracting Hour from Time \u2026\")\n\n    # Time format in file: '18.00.00'  \u2192 take first 2 chars as hour\n    df = df.withColumn(\n        \"Hour\",\n        F.substring(F.col(\"Time\"), 1, 2).cast(\"integer\")\n    )\n\n    # Optional: tag rush-hour periods (07-09 and 17-19)\n    df = df.withColumn(\n        \"IsRushHour\",\n        F.when(\n            F.col(\"Hour\").isin(7, 8, 9, 17, 18, 19), 1\n        ).otherwise(0)\n    )\n\n    return df\n\n\ndef drop_null_rows(df, target_col):\n    \"\"\"\n    Drop rows where the prediction target itself is null\n    (these rows are useless for training).\n    \"\"\"\n    before = df.count()\n    df = df.filter(F.col(target_col).isNotNull())\n    after = df.count()\n    log.info(f\"Dropped {before - after} rows with null target '{target_col}'. Remaining: {after}\")\n    return df\n\n\ndef main():\n    spark = create_spark_session()\n    spark.sparkContext.setLogLevel(\"WARN\")\n\n    # 1. Read\n    df = read_raw(spark, INPUT_PATH)\n\n    # 2. Rename columns\n    df = sanitise_column_names(df)\n\n    # 3. Fix decimal separators and cast\n    df = fix_decimal_format(df, RAW_NUMERIC_COLS)\n\n    # 4. Replace -200 with null\n    df = replace_missing(df, RAW_NUMERIC_COLS)\n\n    # 5. Drop columns that are mostly missing (e.g. NMHC_GT)\n    df, numeric_cols = drop_high_missing_cols(df, RAW_NUMERIC_COLS)\n\n    # 6. Impute remaining nulls\n    df = impute_missing(df, numeric_cols)\n\n    # 7. Feature engineering\n    df = engineer_features(df)\n\n    # 8. Drop rows where target (CO_GT) is null\n    df = drop_null_rows(df, \"CO_GT\")\n\n    # 9. Show sample\n    log.info(\"=== Sample of Cleaned Data ===\")\n    df.show(10, truncate=False)\n    df.printSchema()\n\n    # 10. Save as Parquet\n    log.info(f\"Writing cleaned data to: {OUTPUT_PATH}\")\n    (\n        df.coalesce(1)           # single file \u2192 easier to inspect\n        .write\n        .mode(\"overwrite\")\n        .parquet(OUTPUT_PATH)\n    )\n\n    log.info(\"\u2705 Preprocessing complete.\")\n    spark.stop()\n\n\nif __name__ == \"__main__\":\n    main()\n", "l2-train": "\"\"\"\n=============================================================\n Step 2 \u2013 Spark ML Pipeline: Training & Cross-Validation\n=============================================================\n Responsibilities:\n   \u2022 Load cleaned Parquet data produced by 01_preprocess.py\n   \u2022 Assemble feature vector (VectorAssembler)\n   \u2022 Normalise features (StandardScaler)\n   \u2022 Train two models: LinearRegression and RandomForestRegressor\n   \u2022 Evaluate with CrossValidator (3-fold CV)\n   \u2022 Save best model to disk / HDFS\n   \u2022 Print rich comparison table\n   \u2022 Write logs/metrics.json for report generator and dashboard\n\n Usage:\n   Local:  spark-submit 02_train.py\n   HDFS:   spark-submit 02_train.py --hdfs\n=============================================================\n\"\"\"\n\nimport sys\nimport json\nimport time\nimport logging\nimport os\nfrom datetime import datetime\nfrom pyspark.sql import SparkSession\nfrom pyspark.sql import functions as F\nfrom pyspark.ml import Pipeline\nfrom pyspark.ml.feature import VectorAssembler, StandardScaler\nfrom pyspark.ml.regression import LinearRegression, RandomForestRegressor\nfrom pyspark.ml.evaluation import RegressionEvaluator\nfrom pyspark.ml.tuning import CrossValidator, ParamGridBuilder\n\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n# Configuration  (switch with --hdfs flag)\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nUSE_HDFS   = \"--hdfs\" in sys.argv\nHDFS_ROOT  = \"hdfs://localhost:9000\"\nLOCAL_BASE = \"/home/nazeer/DDM/hadoop_work/spark_pipeline\"\n\nif USE_HDFS:\n    INPUT_PATH = f\"{HDFS_ROOT}/airquality/cleaned_data\"\n    MODEL_PATH = f\"{HDFS_ROOT}/airquality/models\"\nelse:\n    INPUT_PATH = f\"{LOCAL_BASE}/output/cleaned_data\"\n    MODEL_PATH = f\"{LOCAL_BASE}/models\"\n\n# Metrics JSON always stored locally so report/dashboard scripts can read it\nMETRICS_JSON = f\"{LOCAL_BASE}/logs/metrics.json\"\n\nTARGET_COL  = \"CO_GT\"\nCV_FOLDS    = 3\nTRAIN_RATIO = 0.80\nSEED        = 42\n\nlogging.basicConfig(\n    level=logging.INFO,\n    format=\"%(asctime)s  [%(levelname)s]  %(message)s\",\n    datefmt=\"%Y-%m-%d %H:%M:%S\",\n)\nlog = logging.getLogger(\"AirQuality-Train\")\nlog.info(f\"Mode: {'HDFS' if USE_HDFS else 'LOCAL'}\")\n\n\ndef create_spark_session() -> SparkSession:\n    return (\n        SparkSession.builder\n        .appName(\"AirQuality-ML-Pipeline\")\n        .config(\"spark.sql.shuffle.partitions\", \"4\")\n        .getOrCreate()\n    )\n\n\ndef load_data(spark: SparkSession, path: str):\n    log.info(f\"Loading cleaned Parquet data from: {path}\")\n    df = spark.read.parquet(path)\n    log.info(f\"Loaded {df.count()} rows.\")\n    df.printSchema()\n    return df\n\n\ndef select_features(df):\n    \"\"\"\n    Choose feature columns.\n    Exclude Date, Time (raw strings) and the target.\n    Include engineered Hour and IsRushHour.\n    \"\"\"\n    exclude = {TARGET_COL, \"Date\", \"Time\"}\n    feature_cols = [\n        c for c in df.columns\n        if c not in exclude\n        and df.schema[c].dataType.typeName() in (\"double\", \"integer\", \"long\")\n    ]\n    log.info(f\"Feature columns selected ({len(feature_cols)}): {feature_cols}\")\n    return feature_cols\n\n\ndef build_lr_pipeline(feature_cols: list) -> Pipeline:\n    \"\"\"VectorAssembler \u2192 StandardScaler \u2192 LinearRegression\"\"\"\n    assembler = VectorAssembler(\n        inputCols=feature_cols, outputCol=\"raw_features\", handleInvalid=\"skip\"\n    )\n    scaler = StandardScaler(\n        inputCol=\"raw_features\", outputCol=\"features\", withMean=True, withStd=True\n    )\n    lr = LinearRegression(\n        featuresCol=\"features\", labelCol=TARGET_COL,\n        predictionCol=\"prediction\", maxIter=100\n    )\n    return Pipeline(stages=[assembler, scaler, lr])\n\n\ndef build_rf_pipeline(feature_cols: list) -> Pipeline:\n    \"\"\"VectorAssembler \u2192 StandardScaler \u2192 RandomForestRegressor\"\"\"\n    assembler = VectorAssembler(\n        inputCols=feature_cols, outputCol=\"raw_features\", handleInvalid=\"skip\"\n    )\n    scaler = StandardScaler(\n        inputCol=\"raw_features\", outputCol=\"features\", withMean=True, withStd=True\n    )\n    rf = RandomForestRegressor(\n        featuresCol=\"features\", labelCol=TARGET_COL,\n        predictionCol=\"prediction\", seed=SEED\n    )\n    return Pipeline(stages=[assembler, scaler, rf])\n\n\ndef cross_validate(pipeline: Pipeline, param_grid, train_df, evaluator):\n    cv = CrossValidator(\n        estimator=pipeline,\n        estimatorParamMaps=param_grid,\n        evaluator=evaluator,\n        numFolds=CV_FOLDS,\n        seed=SEED,\n        parallelism=2,\n    )\n    log.info(f\"Starting {CV_FOLDS}-fold Cross-Validation \u2026\")\n    cv_model = cv.fit(train_df)\n    log.info(f\"CV RMSE per combo: {[f'{m:.4f}' for m in cv_model.avgMetrics]}\")\n    return cv_model.bestModel\n\n\ndef evaluate_model(model, test_df, label=TARGET_COL):\n    predictions = model.transform(test_df)\n    results = {}\n    for metric in [\"rmse\", \"mae\", \"r2\"]:\n        val = RegressionEvaluator(\n            labelCol=label, predictionCol=\"prediction\", metricName=metric\n        ).evaluate(predictions)\n        results[metric] = val\n        log.info(f\"  {metric.upper():<5}: {val:.4f}\")\n    return predictions, results\n\n\ndef main():\n    spark = create_spark_session()\n    spark.sparkContext.setLogLevel(\"WARN\")\n    pipeline_start = time.time()\n\n    # \u2500\u2500 1. Load data \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n    df = load_data(spark, INPUT_PATH)\n    feature_cols = select_features(df)\n    total_rows   = df.count()\n\n    # \u2500\u2500 2. Train / Test split \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n    train_df, test_df = df.randomSplit([TRAIN_RATIO, 1 - TRAIN_RATIO], seed=SEED)\n    train_count = train_df.count()\n    test_count  = test_df.count()\n    log.info(f\"Train: {train_count} rows  |  Test: {test_count} rows\")\n\n    evaluator = RegressionEvaluator(\n        labelCol=TARGET_COL, predictionCol=\"prediction\", metricName=\"rmse\"\n    )\n\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    # MODEL A \u2013 Linear Regression\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    log.info(\"\u2550\" * 55)\n    log.info(\"  Training MODEL A: Linear Regression\")\n    log.info(\"\u2550\" * 55)\n    t0 = time.time()\n    lr_pipeline   = build_lr_pipeline(feature_cols)\n    lr_param_grid = (\n        ParamGridBuilder()\n        .addGrid(lr_pipeline.getStages()[-1].regParam,        [0.01, 0.1])\n        .addGrid(lr_pipeline.getStages()[-1].elasticNetParam, [0.0, 0.5])\n        .build()\n    )\n    best_lr       = cross_validate(lr_pipeline, lr_param_grid, train_df, evaluator)\n    lr_time       = round(time.time() - t0, 1)\n\n    log.info(\"  Evaluating Linear Regression on Test Set \u2026\")\n    _, lr_metrics = evaluate_model(best_lr, test_df)\n    lr_metrics[\"train_time_sec\"] = lr_time\n\n    lr_path = f\"{MODEL_PATH}/linear_regression\"\n    best_lr.write().overwrite().save(lr_path)\n    log.info(f\"\u2705  LR model saved \u2192 {lr_path}\")\n\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    # MODEL B \u2013 Random Forest Regressor\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    log.info(\"\u2550\" * 55)\n    log.info(\"  Training MODEL B: Random Forest Regressor\")\n    log.info(\"\u2550\" * 55)\n    t0 = time.time()\n    rf_pipeline   = build_rf_pipeline(feature_cols)\n    rf_param_grid = (\n        ParamGridBuilder()\n        .addGrid(rf_pipeline.getStages()[-1].numTrees, [50, 100])\n        .addGrid(rf_pipeline.getStages()[-1].maxDepth, [5, 10])\n        .build()\n    )\n    best_rf   = cross_validate(rf_pipeline, rf_param_grid, train_df, evaluator)\n    rf_time   = round(time.time() - t0, 1)\n\n    log.info(\"  Evaluating Random Forest on Test Set \u2026\")\n    _, rf_metrics = evaluate_model(best_rf, test_df)\n    rf_metrics[\"train_time_sec\"] = rf_time\n\n    rf_path = f\"{MODEL_PATH}/random_forest\"\n    best_rf.write().overwrite().save(rf_path)\n    log.info(f\"\u2705  RF model saved  \u2192 {rf_path}\")\n\n    winner = \"Random Forest\" if rf_metrics[\"rmse\"] < lr_metrics[\"rmse\"] else \"Linear Regression\"\n    total_time = round(time.time() - pipeline_start, 1)\n\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    # Rich Console Comparison Table\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    log.info(\"\\n\" + \"\u2550\" * 60)\n    log.info(\"            MODEL COMPARISON SUMMARY\")\n    log.info(\"\u2550\" * 60)\n    log.info(f\"  {'Metric':<12} {'Linear Reg':>13} {'Random Forest':>15}  Winner\")\n    log.info(\"  \" + \"\u2500\" * 52)\n    for metric, higher_better in [(\"rmse\", False), (\"mae\", False), (\"r2\", True)]:\n        lv, rv = lr_metrics[metric], rf_metrics[metric]\n        if higher_better:\n            badge = \"RF \u2713\" if rv > lv else \"LR \u2713\"\n        else:\n            badge = \"RF \u2713\" if rv < lv else \"LR \u2713\"\n        log.info(f\"  {metric.upper():<12} {lv:>13.4f} {rv:>15.4f}  {badge}\")\n    log.info(f\"  {'Train (s)':<12} {lr_time:>13.1f} {rf_time:>15.1f}\")\n    log.info(\"\u2550\" * 60)\n    log.info(f\"  \ud83c\udfc6  Best model by RMSE: {winner}\")\n    log.info(f\"  \u23f1   Total pipeline time: {total_time}s\")\n    log.info(\"\u2550\" * 60)\n\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    # Save metrics.json\n    # \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n    os.makedirs(os.path.dirname(METRICS_JSON), exist_ok=True)\n    payload = {\n        \"run_timestamp\": datetime.now().isoformat(),\n        \"mode\": \"hdfs\" if USE_HDFS else \"local\",\n        \"dataset\": {\n            \"total_rows\":  total_rows,\n            \"train_rows\":  train_count,\n            \"test_rows\":   test_count,\n            \"features\":    feature_cols,\n            \"target\":      TARGET_COL,\n            \"cv_folds\":    CV_FOLDS,\n        },\n        \"models\": {\n            \"LinearRegression\":      lr_metrics,\n            \"RandomForestRegressor\": rf_metrics,\n        },\n        \"winner\": winner,\n        \"total_pipeline_time_sec\": total_time,\n    }\n    with open(METRICS_JSON, \"w\") as f:\n        json.dump(payload, f, indent=2)\n    log.info(f\"\ud83d\udcc4  Metrics saved \u2192 {METRICS_JSON}\")\n\n    spark.stop()\n\n\nif __name__ == \"__main__\":\n    main()\n", "l2-pred": "\"\"\"\n=============================================================\n Step 3 \u2013 Batch Inference using Saved Model\n=============================================================\n Loads the best trained model from disk / HDFS and runs\n batch predictions on cleaned data.  Demonstrates how to\n operationalise the pipeline for real-world scoring.\n=============================================================\n\"\"\"\n\nimport logging\nfrom pyspark.sql import SparkSession\nfrom pyspark.ml import PipelineModel\n\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n# Configuration\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nINPUT_PATH  = \"/home/nazeer/DDM/hadoop_work/spark_pipeline/output/cleaned_data\"\nMODEL_PATH  = \"/home/nazeer/DDM/hadoop_work/spark_pipeline/models/random_forest\"\nOUTPUT_PATH = \"/home/nazeer/DDM/hadoop_work/spark_pipeline/output/predictions\"\n\nTARGET_COL  = \"CO_GT\"\n\nlogging.basicConfig(\n    level=logging.INFO,\n    format=\"%(asctime)s  [%(levelname)s]  %(message)s\",\n    datefmt=\"%Y-%m-%d %H:%M:%S\",\n)\nlog = logging.getLogger(\"AirQuality-Predict\")\n\n\ndef main():\n    spark = (\n        SparkSession.builder\n        .appName(\"AirQuality-Batch-Predict\")\n        .config(\"spark.sql.shuffle.partitions\", \"4\")\n        .getOrCreate()\n    )\n    spark.sparkContext.setLogLevel(\"WARN\")\n\n    # 1. Load input data\n    log.info(f\"Loading cleaned data from: {INPUT_PATH}\")\n    df = spark.read.parquet(INPUT_PATH)\n    log.info(f\"Rows to score: {df.count()}\")\n\n    # 2. Load saved model\n    log.info(f\"Loading model from: {MODEL_PATH}\")\n    model = PipelineModel.load(MODEL_PATH)\n\n    # 3. Run predictions\n    predictions = model.transform(df)\n\n    # 4. Show actual vs predicted\n    log.info(\"=== Actual vs Predicted (sample) ===\")\n    predictions.select(\"Date\", \"Time\", \"Hour\", TARGET_COL, \"prediction\").show(20, truncate=False)\n\n    # 5. Save predictions as CSV for further analysis\n    log.info(f\"Saving predictions to: {OUTPUT_PATH}\")\n    (\n        predictions\n        .select(\"Date\", \"Time\", \"Hour\", \"IsRushHour\", TARGET_COL, \"prediction\")\n        .coalesce(1)\n        .write\n        .mode(\"overwrite\")\n        .option(\"header\", \"true\")\n        .csv(OUTPUT_PATH)\n    )\n\n    log.info(\"\u2705 Batch prediction complete.\")\n    spark.stop()\n\n\nif __name__ == \"__main__\":\n    main()\n", "l2-report": "\"\"\"\n=============================================================\n Step 4 \u2013 Model Report Generator\n=============================================================\n Reads logs/metrics.json (written by 02_train.py) and prints\n a structured summary plus generates a matplotlib report PNG.\n\n Usage:\n   python3 04_report.py\n=============================================================\n\"\"\"\n\nimport json\nimport os\nimport sys\nimport glob\nfrom datetime import datetime\n\nMETRICS_JSON = \"/home/nazeer/DDM/hadoop_work/spark_pipeline/logs/metrics.json\"\nLOG_DIR      = \"/home/nazeer/DDM/hadoop_work/spark_pipeline/logs\"\nREPORT_OUT   = \"/home/nazeer/DDM/hadoop_work/spark_pipeline/logs/report.txt\"\n\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n# Text Report\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\ndef print_separator(char=\"\u2550\", width=62):\n    print(char * width)\n\ndef load_metrics():\n    if not os.path.exists(METRICS_JSON):\n        print(f\"\u274c  metrics.json not found at {METRICS_JSON}\")\n        print(\"    Run 02_train.py first to generate it.\")\n        sys.exit(1)\n    with open(METRICS_JSON) as f:\n        return json.load(f)\n\n\ndef print_report(data: dict):\n    ts   = data.get(\"run_timestamp\", \"N/A\")\n    mode = data.get(\"mode\", \"local\").upper()\n    ds   = data.get(\"dataset\", {})\n    models = data.get(\"models\", {})\n    winner = data.get(\"winner\", \"N/A\")\n    pipe_time = data.get(\"total_pipeline_time_sec\", \"N/A\")\n\n    lines = []\n    def p(line=\"\"):\n        print(line)\n        lines.append(line)\n\n    p()\n    p(\"\u2550\" * 62)\n    p(\"        AIR QUALITY SPARK ML PIPELINE \u2013 RUN REPORT\")\n    p(\"\u2550\" * 62)\n    p(f\"  Generated : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\")\n    p(f\"  Run at    : {ts}\")\n    p(f\"  Mode      : {mode}\")\n    p()\n    p(\"  DATASET SUMMARY\")\n    p(\"  \" + \"\u2500\" * 58)\n    p(f\"  {'Total rows':<22}: {ds.get('total_rows', 'N/A')}\")\n    p(f\"  {'Training rows':<22}: {ds.get('train_rows', 'N/A')}\")\n    p(f\"  {'Test rows':<22}: {ds.get('test_rows', 'N/A')}\")\n    p(f\"  {'Target variable':<22}: {ds.get('target', 'N/A')}\")\n    p(f\"  {'Cross-val folds':<22}: {ds.get('cv_folds', 'N/A')}\")\n    p(f\"  {'Feature count':<22}: {len(ds.get('features', []))}\")\n    p(f\"  {'Features':<22}: {', '.join(ds.get('features', []))}\")\n    p()\n    p(\"  MODEL PERFORMANCE COMPARISON\")\n    p(\"  \" + \"\u2500\" * 58)\n    p(f\"  {'Metric':<10} {'Linear Regression':>20} {'Random Forest':>16}  Winner\")\n    p(\"  \" + \"\u2500\" * 55)\n    for metric, higher_better in [(\"rmse\", False), (\"mae\", False), (\"r2\", True)]:\n        lv = models.get(\"LinearRegression\", {}).get(metric, float(\"nan\"))\n        rv = models.get(\"RandomForestRegressor\", {}).get(metric, float(\"nan\"))\n        if higher_better:\n            badge = \"RF \u2713\" if rv > lv else \"LR \u2713\"\n        else:\n            badge = \"RF \u2713\" if rv < lv else \"LR \u2713\"\n        p(f\"  {metric.upper():<10} {lv:>20.4f} {rv:>16.4f}  {badge}\")\n\n    lr_t = models.get(\"LinearRegression\",      {}).get(\"train_time_sec\", \"N/A\")\n    rf_t = models.get(\"RandomForestRegressor\",  {}).get(\"train_time_sec\", \"N/A\")\n    p(f\"  {'Train (s)':<10} {str(lr_t):>20} {str(rf_t):>16}\")\n    p()\n    p(f\"  \ud83c\udfc6  WINNER: {winner}\")\n    if pipe_time != \"N/A\":\n        p(f\"  \u23f1   Total pipeline time: {pipe_time}s\")\n    p()\n\n    # Log files summary\n    log_files = sorted(glob.glob(os.path.join(LOG_DIR, \"*.log\")))\n    if log_files:\n        p(\"  LOG FILES\")\n        p(\"  \" + \"\u2500\" * 58)\n        for lf in log_files:\n            size = os.path.getsize(lf)\n            mtime = datetime.fromtimestamp(os.path.getmtime(lf)).strftime(\"%Y-%m-%d %H:%M\")\n            p(f\"  {os.path.basename(lf):<40} {size:>8} B  {mtime}\")\n        p()\n\n    p(\"\u2550\" * 62)\n\n    # Write to file\n    with open(REPORT_OUT, \"w\") as f:\n        f.write(\"\\n\".join(lines))\n    print(f\"\\n\ud83d\udcc4  Report also saved to: {REPORT_OUT}\")\n\n\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n# Visualization (matplotlib)\n# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\ndef generate_charts(data: dict):\n    try:\n        import matplotlib\n        matplotlib.use(\"Agg\")      # non-interactive backend\n        import matplotlib.pyplot as plt\n        import matplotlib.patches as mpatches\n        import numpy as np\n    except ImportError:\n        print(\"\u26a0\ufe0f  matplotlib not installed \u2013 skipping charts.\")\n        print(\"   Install with: pip install matplotlib\")\n        return\n\n    models  = data[\"models\"]\n    lr_m    = models[\"LinearRegression\"]\n    rf_m    = models[\"RandomForestRegressor\"]\n    winner  = data[\"winner\"]\n\n    # \u2500\u2500 Colour palette \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n    CLR_LR  = \"#6C91C2\"   # steel blue\n    CLR_RF  = \"#4CB944\"   # emerald\n    CLR_BG  = \"#1a1a2e\"   # dark bg\n    CLR_AX  = \"#e0e0e0\"\n\n    fig = plt.figure(figsize=(16, 10), facecolor=CLR_BG)\n    fig.suptitle(\n        \"Air Quality Spark ML Pipeline \u2013 Model Report\",\n        fontsize=18, color=\"white\", fontweight=\"bold\", y=0.97\n    )\n\n    # \u2500\u2500 Grid: 2 rows \u00d7 3 cols \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n    gs = fig.add_gridspec(2, 3, hspace=0.45, wspace=0.35,\n                          left=0.07, right=0.96, top=0.90, bottom=0.08)\n\n    def styled_ax(ax, title):\n        ax.set_facecolor(\"#16213e\")\n        ax.tick_params(colors=CLR_AX, labelsize=9)\n        for spine in ax.spines.values():\n            spine.set_color(\"#334466\")\n        ax.set_title(title, color=\"white\", fontsize=11, pad=8)\n        return ax\n\n    model_names = [\"Linear Reg\", \"Random Forest\"]\n    colors      = [CLR_LR, CLR_RF]\n\n    # 1. RMSE bar\n    ax1 = styled_ax(fig.add_subplot(gs[0, 0]), \"RMSE  (lower is better)\")\n    vals = [lr_m[\"rmse\"], rf_m[\"rmse\"]]\n    bars = ax1.bar(model_names, vals, color=colors, width=0.5, edgecolor=\"#ffffff22\")\n    for bar, v in zip(bars, vals):\n        ax1.text(bar.get_x() + bar.get_width()/2, v + 0.005,\n                 f\"{v:.4f}\", ha=\"center\", va=\"bottom\", color=\"white\", fontsize=10, fontweight=\"bold\")\n    ax1.set_ylim(0, max(vals) * 1.25)\n    ax1.set_ylabel(\"RMSE\", color=CLR_AX)\n\n    # 2. MAE bar\n    ax2 = styled_ax(fig.add_subplot(gs[0, 1]), \"MAE  (lower is better)\")\n    vals = [lr_m[\"mae\"], rf_m[\"mae\"]]\n    bars = ax2.bar(model_names, vals, color=colors, width=0.5, edgecolor=\"#ffffff22\")\n    for bar, v in zip(bars, vals):\n        ax2.text(bar.get_x() + bar.get_width()/2, v + 0.002,\n                 f\"{v:.4f}\", ha=\"center\", va=\"bottom\", color=\"white\", fontsize=10, fontweight=\"bold\")\n    ax2.set_ylim(0, max(vals) * 1.25)\n    ax2.set_ylabel(\"MAE\", color=CLR_AX)\n\n    # 3. R\u00b2 bar\n    ax3 = styled_ax(fig.add_subplot(gs[0, 2]), \"R\u00b2  (higher is better)\")\n    vals = [lr_m[\"r2\"], rf_m[\"r2\"]]\n    bars = ax3.bar(model_names, vals, color=colors, width=0.5, edgecolor=\"#ffffff22\")\n    for bar, v in zip(bars, vals):\n        ax3.text(bar.get_x() + bar.get_width()/2, v + 0.003,\n                 f\"{v:.4f}\", ha=\"center\", va=\"bottom\", color=\"white\", fontsize=10, fontweight=\"bold\")\n    ax3.set_ylim(0, 1.1)\n    ax3.set_ylabel(\"R\u00b2\", color=CLR_AX)\n\n    # 4. Training time bar\n    ax4 = styled_ax(fig.add_subplot(gs[1, 0]), \"Training Time (seconds)\")\n    lr_t = lr_m.get(\"train_time_sec\", 0)\n    rf_t = rf_m.get(\"train_time_sec\", 0)\n    vals = [lr_t, rf_t]\n    bars = ax4.bar(model_names, vals, color=colors, width=0.5, edgecolor=\"#ffffff22\")\n    for bar, v in zip(bars, vals):\n        ax4.text(bar.get_x() + bar.get_width()/2, v + 0.5,\n                 f\"{v:.1f}s\", ha=\"center\", va=\"bottom\", color=\"white\", fontsize=10, fontweight=\"bold\")\n    ax4.set_ylim(0, max(vals) * 1.3)\n    ax4.set_ylabel(\"Seconds\", color=CLR_AX)\n\n    # 5. Radar / spider chart (all-in-one normalised view)\n    ax5 = styled_ax(fig.add_subplot(gs[1, 1], polar=True), \"Normalised Performance Radar\")\n    ax5.set_facecolor(\"#16213e\")\n    metrics_radar = [\"R\u00b2\", \"1-RMSE\\n(norm)\", \"1-MAE\\n(norm)\"]\n    # normalise: use 1 - (val/max) for error metrics\n    max_rmse = max(lr_m[\"rmse\"], rf_m[\"rmse\"])\n    max_mae  = max(lr_m[\"mae\"],  rf_m[\"mae\"])\n    lr_vals_r  = [lr_m[\"r2\"], 1 - lr_m[\"rmse\"]/max_rmse, 1 - lr_m[\"mae\"]/max_mae]\n    rf_vals_r  = [rf_m[\"r2\"], 1 - rf_m[\"rmse\"]/max_rmse, 1 - rf_m[\"mae\"]/max_mae]\n    N = len(metrics_radar)\n    angles = [n / float(N) * 2 * 3.14159 for n in range(N)]\n    angles += angles[:1]\n    lr_vals_r += lr_vals_r[:1]\n    rf_vals_r += rf_vals_r[:1]\n    ax5.plot(angles, lr_vals_r, \"o-\", color=CLR_LR, linewidth=2, label=\"Linear Reg\")\n    ax5.fill(angles, lr_vals_r, color=CLR_LR, alpha=0.15)\n    ax5.plot(angles, rf_vals_r, \"o-\", color=CLR_RF, linewidth=2, label=\"Random Forest\")\n    ax5.fill(angles, rf_vals_r, color=CLR_RF, alpha=0.15)\n    ax5.set_xticks(angles[:-1])\n    ax5.set_xticklabels(metrics_radar, color=\"white\", fontsize=9)\n    ax5.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])\n    ax5.tick_params(colors=CLR_AX)\n    ax5.legend(loc=\"upper right\", bbox_to_anchor=(1.3, 1.1),\n               facecolor=\"#1a1a2e\", labelcolor=\"white\", fontsize=9)\n\n    # 6. Dataset stats info box\n    ax6 = styled_ax(fig.add_subplot(gs[1, 2]), \"Run Summary\")\n    ax6.axis(\"off\")\n    ds = data.get(\"dataset\", {})\n    info = [\n        (\"Run date\",       data.get(\"run_timestamp\", \"N/A\")[:19].replace(\"T\", \" \")),\n        (\"Mode\",           data.get(\"mode\", \"local\").upper()),\n        (\"Total rows\",     str(ds.get(\"total_rows\", \"N/A\"))),\n        (\"Train / Test\",   f\"{ds.get('train_rows','?')} / {ds.get('test_rows','?')}\"),\n        (\"Features\",       str(len(ds.get(\"features\", [])))),\n        (\"CV folds\",       str(ds.get(\"cv_folds\", \"N/A\"))),\n        (\"Target\",         ds.get(\"target\", \"N/A\")),\n        (\"\ud83c\udfc6 Winner\",      winner),\n    ]\n    for i, (k, v) in enumerate(info):\n        y = 0.92 - i * 0.115\n        ax6.text(0.02, y, f\"{k}:\", color=\"#aaaacc\", fontsize=9, transform=ax6.transAxes)\n        ax6.text(0.45, y, v, color=\"white\", fontsize=9, fontweight=\"bold\", transform=ax6.transAxes)\n\n    # Legend patch\n    patches = [\n        mpatches.Patch(color=CLR_LR, label=\"Linear Regression\"),\n        mpatches.Patch(color=CLR_RF, label=\"Random Forest\"),\n    ]\n    fig.legend(handles=patches, loc=\"lower center\", ncol=2, facecolor=CLR_BG,\n               labelcolor=\"white\", fontsize=10, framealpha=0.5)\n\n    out_path = os.path.join(LOG_DIR, \"model_report.png\")\n    plt.savefig(out_path, dpi=150, bbox_inches=\"tight\", facecolor=CLR_BG)\n    print(f\"\ud83d\udcca  Chart saved to: {out_path}\")\n    plt.close()\n\n\ndef main():\n    data = load_metrics()\n    print_report(data)\n    generate_charts(data)\n\n\nif __name__ == \"__main__\":\n    main()\n"};
const lab2Outputs = {"l2-hdfs": "HDFS initialized.\nFormatting NameNode...\nNameNode formatted successfully.\n", "l2-pre": "26/04/18 21:22:06 WARN Utils: Your hostname, nazeer-Latitude-5490 resolves to a loopback address: 127.0.1.1; using 10.179.167.65 instead (on interface wlp2s0)\n26/04/18 21:22:06 WARN Utils: Set SPARK_LOCAL_IP if you need to bind to another address\n26/04/18 21:22:08 INFO SparkContext: Running Spark version 3.5.1\n26/04/18 21:22:08 INFO SparkContext: OS info Linux, 6.17.0-20-generic, amd64\n26/04/18 21:22:08 INFO SparkContext: Java version 11.0.30\n26/04/18 21:22:08 WARN NativeCodeLoader: Unable to load native-hadoop library for your platform... using builtin-java classes where applicable\n26/04/18 21:22:08 INFO ResourceUtils: ==============================================================\n26/04/18 21:22:08 INFO ResourceUtils: No custom resources configured for spark.driver.\n26/04/18 21:22:08 INFO ResourceUtils: ==============================================================\n26/04/18 21:22:08 INFO SparkContext: Submitted application: AirQuality-Preprocessing\n26/04/18 21:22:08 INFO ResourceProfile: Default ResourceProfile created, executor resources: Map(cores -> name: cores, amount: 1, script: , vendor: , memory -> name: memory, amount: 1024, script: , vendor: , offHeap -> name: offHeap, amount: 0, script: , vendor: ), task resources: Map(cpus -> name: cpus, amount: 1.0)\n26/04/18 21:22:08 INFO ResourceProfile: Limiting resource is cpu\n26/04/18 21:22:08 INFO ResourceProfileManager: Added ResourceProfile id: 0\n26/04/18 21:22:08 INFO SecurityManager: Changing view acls to: nazeer\n26/04/18 21:22:08 INFO SecurityManager: Changing modify acls to: nazeer\n26/04/18 21:22:08 INFO SecurityManager: Changing view acls groups to: \n26/04/18 21:22:08 INFO SecurityManager: Changing modify acls groups to: \n26/04/18 21:22:08 INFO SecurityManager: SecurityManager: authentication disabled; ui acls disabled; users with view permissions: nazeer; groups with view permissions: EMPTY; users with modify permissions: nazeer; groups with modify permissions: EMPTY\n26/04/18 21:22:08 INFO Utils: Successfully started service 'sparkDriver' on port 34603.\n26/04/18 21:22:08 INFO SparkEnv: Registering MapOutputTracker\n26/04/18 21:22:08 INFO SparkEnv: Registering BlockManagerMaster\n26/04/18 21:22:08 INFO BlockManagerMasterEndpoint: Using org.apache.spark.storage.DefaultTopologyMapper for getting topology information\n26/04/18 21:22:08 INFO BlockManagerMasterEndpoint: BlockManagerMasterEndpoint up\n26/04/18 21:22:08 INFO SparkEnv: Registering BlockManagerMasterHeartbeat\n26/04/18 21:22:08 INFO DiskBlockManager: Created local directory at /tmp/blockmgr-e4e68f28-2a69-491b-8ff3-3c3346077a94\n26/04/18 21:22:08 INFO MemoryStore: MemoryStore started with capacity 1048.8 MiB\n26/04/18 21:22:08 INFO SparkEnv: Registering OutputCommitCoordinator\n26/04/18 21:22:08 INFO JettyUtils: Start Jetty 0.0.0.0:4040 for SparkUI\n26/04/18 21:22:08 INFO Utils: Successfully started service 'SparkUI' on port 4040.\n26/04/18 21:22:09 INFO Executor: Starting executor ID driver on host 10.179.167.65\n26/04/18 21:22:09 INFO Executor: OS info Linux, 6.17.0-20-generic, amd64\n26/04/18 21:22:09 INFO Executor: Java version 11.0.30\n26/04/18 21:22:09 INFO Executor: Starting executor with user classpath (userClassPathFirst = false): ''\n26/04/18 21:22:09 INFO Executor: Created or updated repl class loader org.apache.spark.util.MutableURLClassLoader@191ecc9f for default.\n26/04/18 21:22:09 INFO Utils: Successfully started service 'org.apache.spark.network.netty.NettyBlockTransferService' on port 39417.\n26/04/18 21:22:09 INFO NettyBlockTransferService: Server created on 10.179.167.65:39417\n26/04/18 21:22:09 INFO BlockManager: Using org.apache.spark.storage.RandomBlockReplicationPolicy for block replication policy\n26/04/18 21:22:09 INFO BlockManagerMaster: Registering BlockManager BlockManagerId(driver, 10.179.167.65, 39417, None)\n26/04/18 21:22:09 INFO BlockManagerMasterEndpoint: Registering block manager 10.179.167.65:39417 with 1048.8 MiB RAM, BlockManagerId(driver, 10.179.167.65, 39417, None)\n26/04/18 21:22:09 INFO BlockManagerMaster: Registered BlockManager BlockManagerId(driver, 10.179.167.65, 39417, None)\n26/04/18 21:22:09 INFO BlockManager: Initialized BlockManager: BlockManagerId(driver, 10.179.167.65, 39417, None)\n2026-04-18 21:22:09  [INFO]  Reading raw CSV from: /home/nazeer/DDM/hadoop_work/AirQuality.csv\n2026-04-18 21:22:13  [INFO]  Raw schema: [('Date', 'string'), ('Time', 'string'), ('CO(GT)', 'string'), ('PT08.S1(CO)', 'string'), ('NMHC(GT)', 'string'), ('C6H6(GT)', 'string'), ('PT08.S2(NMHC)', 'string'), ('NOx(GT)', 'string'), ('PT08.S3(NOx)', 'string'), ('NO2(GT)', 'string'), ('PT08.S4(NO2)', 'string'), ('PT08.S5(O3)', 'string'), ('T', 'string'), ('RH', 'string'), ('AH', 'string'), ('_c15', 'string'), ('_c16', 'string')]\n2026-04-18 21:22:14  [INFO]  Row count (raw): 9471\n2026-04-18 21:22:14  [INFO]  Fixing decimal format (comma \u2192 dot) and casting to Double \u2026\n2026-04-18 21:22:14  [INFO]  Replacing sentinel -200.0 with null \u2026\n2026-04-18 21:22:17  [WARNING]  Dropping columns with > 40% missing: [('NMHC_GT', '90.3%')]\n2026-04-18 21:22:17  [INFO]  Imputing missing values with mean strategy for: ['CO_GT', 'PT08_S1_CO', 'C6H6_GT', 'PT08_S2_NMHC', 'NOx_GT', 'PT08_S3_NOx', 'NO2_GT', 'PT08_S4_NO2', 'PT08_S5_O3', 'T', 'RH', 'AH']\n2026-04-18 21:22:18  [INFO]  Engineering features: extracting Hour from Time \u2026\n2026-04-18 21:22:19  [INFO]  Dropped 0 rows with null target 'CO_GT'. Remaining: 9471\n2026-04-18 21:22:19  [INFO]  === Sample of Cleaned Data ===\n26/04/18 21:22:19 WARN CSVHeaderChecker: CSV header does not conform to the schema.\n Header: Date, Time, CO(GT), PT08.S1(CO), C6H6(GT), PT08.S2(NMHC), NOx(GT), PT08.S3(NOx), NO2(GT), PT08.S4(NO2), PT08.S5(O3), T, RH, AH, , \n Schema: Date, Time, CO(GT), PT08.S1(CO), C6H6(GT), PT08.S2(NMHC), NOx(GT), PT08.S3(NOx), NO2(GT), PT08.S4(NO2), PT08.S5(O3), T, RH, AH, _c15, _c16\nExpected: _c15 but found: \nCSV file: file:///home/nazeer/DDM/hadoop_work/AirQuality.csv\n+----------+--------+-----+----------+-------+------------+-----------------+-----------+------------------+-----------+----------+----+----+------+----+----+----+----------+\n|Date      |Time    |CO_GT|PT08_S1_CO|C6H6_GT|PT08_S2_NMHC|NOx_GT           |PT08_S3_NOx|NO2_GT            |PT08_S4_NO2|PT08_S5_O3|T   |RH  |AH    |_c15|_c16|Hour|IsRushHour|\n+----------+--------+-----+----------+-------+------------+-----------------+-----------+------------------+-----------+----------+----+----+------+----+----+----+----------+\n|10/03/2004|18.00.00|2.6  |1360.0    |11.9   |1046.0      |166.0            |1056.0     |113.0             |1692.0     |1268.0    |13.6|48.9|0.7578|NULL|NULL|18  |1         |\n|10/03/2004|19.00.00|2.0  |1292.0    |9.4    |955.0       |103.0            |1174.0     |92.0              |1559.0     |972.0     |13.3|47.7|0.7255|NULL|NULL|19  |1         |\n|10/03/2004|20.00.00|2.2  |1402.0    |9.0    |939.0       |131.0            |1140.0     |114.0             |1555.0     |1074.0    |11.9|54.0|0.7502|NULL|NULL|20  |0         |\n|10/03/2004|21.00.00|2.2  |1376.0    |9.2    |948.0       |172.0            |1092.0     |122.0             |1584.0     |1203.0    |11.0|60.0|0.7867|NULL|NULL|21  |0         |\n|10/03/2004|22.00.00|1.6  |1272.0    |6.5    |836.0       |131.0            |1205.0     |116.0             |1490.0     |1110.0    |11.2|59.6|0.7888|NULL|NULL|22  |0         |\n|10/03/2004|23.00.00|1.2  |1197.0    |4.7    |750.0       |89.0             |1337.0     |96.0              |1393.0     |949.0     |11.2|59.2|0.7848|NULL|NULL|23  |0         |\n|11/03/2004|00.00.00|1.2  |1185.0    |3.6    |690.0       |62.0             |1462.0     |77.0              |1333.0     |733.0     |11.3|56.8|0.7603|NULL|NULL|0   |0         |\n|11/03/2004|01.00.00|1.0  |1136.0    |3.3    |672.0       |62.0             |1453.0     |76.0              |1333.0     |730.0     |10.7|60.0|0.7702|NULL|NULL|1   |0         |\n|11/03/2004|02.00.00|0.9  |1094.0    |2.3    |609.0       |45.0             |1579.0     |60.0              |1276.0     |620.0     |10.7|59.7|0.7648|NULL|NULL|2   |0         |\n|11/03/2004|03.00.00|0.6  |1010.0    |1.7    |561.0       |246.8967349054159|1705.0     |113.09125081011017|1235.0     |501.0     |10.3|60.2|0.7517|NULL|NULL|3   |0         |\n+----------+--------+-----+----------+-------+------------+-----------------+-----------+------------------+-----------+----------+----+----+------+----+----+----+----------+\nonly showing top 10 rows\n\nroot\n |-- Date: string (nullable = true)\n |-- Time: string (nullable = true)\n |-- CO_GT: double (nullable = true)\n |-- PT08_S1_CO: double (nullable = true)\n |-- C6H6_GT: double (nullable = true)\n |-- PT08_S2_NMHC: double (nullable = true)\n |-- NOx_GT: double (nullable = true)\n |-- PT08_S3_NOx: double (nullable = true)\n |-- NO2_GT: double (nullable = true)\n |-- PT08_S4_NO2: double (nullable = true)\n |-- PT08_S5_O3: double (nullable = true)\n |-- T: double (nullable = true)\n |-- RH: double (nullable = true)\n |-- AH: double (nullable = true)\n |-- _c15: string (nullable = true)\n |-- _c16: string (nullable = true)\n |-- Hour: integer (nullable = true)\n |-- IsRushHour: integer (nullable = false)\n\n2026-04-18 21:22:19  [INFO]  Writing cleaned data to: /home/nazeer/DDM/hadoop_work/spark_pipeline/output/cleaned_data\n26/04/18 21:22:20 WARN CSVHeaderChecker: CSV header does not conform to the schema.\n Header: Date, Time, CO(GT), PT08.S1(CO), C6H6(GT), PT08.S2(NMHC), NOx(GT), PT08.S3(NOx), NO2(GT), PT08.S4(NO2), PT08.S5(O3), T, RH, AH, , \n Schema: Date, Time, CO(GT), PT08.S1(CO), C6H6(GT), PT08.S2(NMHC), NOx(GT), PT08.S3(NOx), NO2(GT), PT08.S4(NO2), PT08.S5(O3), T, RH, AH, _c15, _c16\nExpected: _c15 but found: \nCSV file: file:///home/nazeer/DDM/hadoop_work/AirQuality.csv\n2026-04-18 21:22:21  [INFO]  \u2705 Preprocessing complete.\n2026-04-18 21:22:21  [INFO]  Closing down clientserver connection\n", "l2-train": "26/04/18 21:22:34 WARN Utils: Your hostname, nazeer-Latitude-5490 resolves to a loopback address: 127.0.1.1; using 10.179.167.65 instead (on interface wlp2s0)\n26/04/18 21:22:34 WARN Utils: Set SPARK_LOCAL_IP if you need to bind to another address\n26/04/18 21:22:35 INFO SparkContext: Running Spark version 3.5.1\n26/04/18 21:22:35 INFO SparkContext: OS info Linux, 6.17.0-20-generic, amd64\n26/04/18 21:22:35 INFO SparkContext: Java version 11.0.30\n26/04/18 21:22:35 WARN NativeCodeLoader: Unable to load native-hadoop library for your platform... using builtin-java classes where applicable\n26/04/18 21:22:35 INFO ResourceUtils: ==============================================================\n26/04/18 21:22:35 INFO ResourceUtils: No custom resources configured for spark.driver.\n26/04/18 21:22:35 INFO ResourceUtils: ==============================================================\n26/04/18 21:22:35 INFO SparkContext: Submitted application: AirQuality-ML-Pipeline\n26/04/18 21:22:36 INFO ResourceProfile: Default ResourceProfile created, executor resources: Map(cores -> name: cores, amount: 1, script: , vendor: , memory -> name: memory, amount: 1024, script: , vendor: , offHeap -> name: offHeap, amount: 0, script: , vendor: ), task resources: Map(cpus -> name: cpus, amount: 1.0)\n26/04/18 21:22:36 INFO ResourceProfile: Limiting resource is cpu\n26/04/18 21:22:36 INFO ResourceProfileManager: Added ResourceProfile id: 0\n26/04/18 21:22:36 INFO SecurityManager: Changing view acls to: nazeer\n26/04/18 21:22:36 INFO SecurityManager: Changing modify acls to: nazeer\n26/04/18 21:22:36 INFO SecurityManager: Changing view acls groups to: \n26/04/18 21:22:36 INFO SecurityManager: Changing modify acls groups to: \n26/04/18 21:22:36 INFO SecurityManager: SecurityManager: authentication disabled; ui acls disabled; users with view permissions: nazeer; groups with view permissions: EMPTY; users with modify permissions: nazeer; groups with modify permissions: EMPTY\n26/04/18 21:22:36 INFO Utils: Successfully started service 'sparkDriver' on port 41125.\n26/04/18 21:22:36 INFO SparkEnv: Registering MapOutputTracker\n26/04/18 21:22:36 INFO SparkEnv: Registering BlockManagerMaster\n26/04/18 21:22:36 INFO BlockManagerMasterEndpoint: Using org.apache.spark.storage.DefaultTopologyMapper for getting topology information\n26/04/18 21:22:36 INFO BlockManagerMasterEndpoint: BlockManagerMasterEndpoint up\n26/04/18 21:22:36 INFO SparkEnv: Registering BlockManagerMasterHeartbeat\n26/04/18 21:22:36 INFO DiskBlockManager: Created local directory at /tmp/blockmgr-d83a120a-43ac-49fa-b93a-7521ce55c24b\n26/04/18 21:22:36 INFO MemoryStore: MemoryStore started with capacity 1048.8 MiB\n26/04/18 21:22:36 INFO SparkEnv: Registering OutputCommitCoordinator\n26/04/18 21:22:36 INFO JettyUtils: Start Jetty 0.0.0.0:4040 for SparkUI\n26/04/18 21:22:36 INFO Utils: Successfully started service 'SparkUI' on port 4040.\n26/04/18 21:22:36 INFO Executor: Starting executor ID driver on host 10.179.167.65\n26/04/18 21:22:36 INFO Executor: OS info Linux, 6.17.0-20-generic, amd64\n26/04/18 21:22:36 INFO Executor: Java version 11.0.30\n26/04/18 21:22:36 INFO Executor: Starting executor with user classpath (userClassPathFirst = false): ''\n26/04/18 21:22:36 INFO Executor: Created or updated repl class loader org.apache.spark.util.MutableURLClassLoader@8abff84 for default.\n26/04/18 21:22:36 INFO Utils: Successfully started service 'org.apache.spark.network.netty.NettyBlockTransferService' on port 41973.\n26/04/18 21:22:36 INFO NettyBlockTransferService: Server created on 10.179.167.65:41973\n26/04/18 21:22:36 INFO BlockManager: Using org.apache.spark.storage.RandomBlockReplicationPolicy for block replication policy\n26/04/18 21:22:36 INFO BlockManagerMaster: Registering BlockManager BlockManagerId(driver, 10.179.167.65, 41973, None)\n26/04/18 21:22:36 INFO BlockManagerMasterEndpoint: Registering block manager 10.179.167.65:41973 with 1048.8 MiB RAM, BlockManagerId(driver, 10.179.167.65, 41973, None)\n26/04/18 21:22:36 INFO BlockManagerMaster: Registered BlockManager BlockManagerId(driver, 10.179.167.65, 41973, None)\n26/04/18 21:22:36 INFO BlockManager: Initialized BlockManager: BlockManagerId(driver, 10.179.167.65, 41973, None)\n2026-04-18 21:22:37  [INFO]  Loading cleaned Parquet data from: /home/nazeer/DDM/hadoop_work/spark_pipeline/output/cleaned_data\n2026-04-18 21:22:41  [INFO]  Loaded 9471 rows.\nroot\n |-- Date: string (nullable = true)\n |-- Time: string (nullable = true)\n |-- CO_GT: double (nullable = true)\n |-- PT08_S1_CO: double (nullable = true)\n |-- C6H6_GT: double (nullable = true)\n |-- PT08_S2_NMHC: double (nullable = true)\n |-- NOx_GT: double (nullable = true)\n |-- PT08_S3_NOx: double (nullable = true)\n |-- NO2_GT: double (nullable = true)\n |-- PT08_S4_NO2: double (nullable = true)\n |-- PT08_S5_O3: double (nullable = true)\n |-- T: double (nullable = true)\n |-- RH: double (nullable = true)\n |-- AH: double (nullable = true)\n |-- _c15: string (nullable = true)\n |-- _c16: string (nullable = true)\n |-- Hour: integer (nullable = true)\n |-- IsRushHour: integer (nullable = true)\n\n2026-04-18 21:22:41  [INFO]  Feature columns selected (13): ['PT08_S1_CO', 'C6H6_GT', 'PT08_S2_NMHC', 'NOx_GT', 'PT08_S3_NOx', 'NO2_GT', 'PT08_S4_NO2', 'PT08_S5_O3', 'T', 'RH', 'AH', 'Hour', 'IsRushHour']\n2026-04-18 21:22:42  [INFO]  Train rows: 7645  |  Test rows: 1826\n2026-04-18 21:22:42  [INFO]  \u2500\u2500 Training MODEL A: Linear Regression \u2500\u2500\n2026-04-18 21:22:42  [INFO]  Starting 3-fold Cross-Validation \u2026\n26/04/18 21:22:43 WARN SparkStringUtils: Truncated the string representation of a plan since it was too large. This behavior can be adjusted by setting 'spark.sql.debug.maxToStringFields'.\n26/04/18 21:22:44 WARN BlockManager: Block rdd_27_0 already exists on this machine; not re-adding it\n2026-04-18 21:22:53  [INFO]  Closing down clientserver connection\n2026-04-18 21:22:53  [INFO]  Closing down clientserver connection\n2026-04-18 21:22:53  [INFO]  Closing down clientserver connection\n2026-04-18 21:22:53  [INFO]  CV average RMSE values per param combo: ['0.5900', '0.5929', '0.5994', '0.6146']\n2026-04-18 21:22:53  [INFO]  \u2500\u2500 Evaluating Linear Regression on Test Set \u2500\u2500\n2026-04-18 21:22:54  [INFO]    RMSE : 0.5936\n2026-04-18 21:22:54  [INFO]    MAE  : 0.3997\n2026-04-18 21:22:54  [INFO]    R\u00b2   : 0.7969\n2026-04-18 21:22:55  [INFO]  \u2705 Linear Regression model saved to: /home/nazeer/DDM/hadoop_work/spark_pipeline/models/linear_regression\n2026-04-18 21:22:55  [INFO]  \u2500\u2500 Training MODEL B: Random Forest Regressor \u2500\u2500\n2026-04-18 21:22:55  [INFO]  Starting 3-fold Cross-Validation \u2026\nWARNING: An illegal reflective access operation has occurred\nWARNING: Illegal reflective access by org.apache.spark.util.SizeEstimator$ (file:/home/nazeer/spark/jars/spark-core_2.12-3.5.1.jar) to field java.nio.charset.Charset.name\nWARNING: Please consider reporting this to the maintainers of org.apache.spark.util.SizeEstimator$\nWARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations\nWARNING: All illegal access operations will be denied in a future release\n26/04/18 21:22:58 WARN DAGScheduler: Broadcasting large task binary with size 1050.7 KiB\n26/04/18 21:22:59 WARN DAGScheduler: Broadcasting large task binary with size 1896.7 KiB\n26/04/18 21:23:00 WARN DAGScheduler: Broadcasting large task binary with size 3.2 MiB\n26/04/18 21:23:02 WARN DAGScheduler: Broadcasting large task binary with size 5.3 MiB\n26/04/18 21:23:02 WARN DAGScheduler: Broadcasting large task binary with size 1169.7 KiB\n26/04/18 21:23:02 WARN DAGScheduler: Broadcasting large task binary with size 1066.9 KiB\n26/04/18 21:23:03 WARN DAGScheduler: Broadcasting large task binary with size 1974.2 KiB\n26/04/18 21:23:04 WARN DAGScheduler: Broadcasting large task binary with size 3.6 MiB\n26/04/18 21:23:06 WARN DAGScheduler: Broadcasting large task binary with size 6.3 MiB\n26/04/18 21:23:07 WARN DAGScheduler: Broadcasting large task binary with size 1613.9 KiB\n26/04/18 21:23:09 WARN DAGScheduler: Broadcasting large task binary with size 10.4 MiB\n26/04/18 21:23:10 WARN DAGScheduler: Broadcasting large task binary with size 2.3 MiB\n26/04/18 21:23:15 WARN DAGScheduler: Broadcasting large task binary with size 1042.6 KiB\n26/04/18 21:23:15 WARN DAGScheduler: Broadcasting large task binary with size 1861.3 KiB\n26/04/18 21:23:16 WARN DAGScheduler: Broadcasting large task binary with size 3.1 MiB\n26/04/18 21:23:18 WARN DAGScheduler: Broadcasting large task binary with size 5.0 MiB\n26/04/18 21:23:18 WARN DAGScheduler: Broadcasting large task binary with size 1100.5 KiB\n26/04/18 21:23:19 WARN DAGScheduler: Broadcasting large task binary with size 1066.8 KiB\n26/04/18 21:23:19 WARN DAGScheduler: Broadcasting large task binary with size 1969.4 KiB\n26/04/18 21:23:20 WARN DAGScheduler: Broadcasting large task binary with size 3.5 MiB\n26/04/18 21:23:22 WARN DAGScheduler: Broadcasting large task binary with size 6.2 MiB\n26/04/18 21:23:23 WARN DAGScheduler: Broadcasting large task binary with size 1561.8 KiB\n26/04/18 21:23:24 WARN DAGScheduler: Broadcasting large task binary with size 10.1 MiB\n26/04/18 21:23:25 WARN DAGScheduler: Broadcasting large task binary with size 2.2 MiB\n26/04/18 21:23:29 WARN DAGScheduler: Broadcasting large task binary with size 1036.9 KiB\n26/04/18 21:23:30 WARN DAGScheduler: Broadcasting large task binary with size 1859.6 KiB\n26/04/18 21:23:31 WARN DAGScheduler: Broadcasting large task binary with size 3.1 MiB\n26/04/18 21:23:32 WARN DAGScheduler: Broadcasting large task binary with size 5.1 MiB\n26/04/18 21:23:32 WARN DAGScheduler: Broadcasting large task binary with size 1116.3 KiB\n26/04/18 21:23:33 WARN DAGScheduler: Broadcasting large task binary with size 1062.4 KiB\n26/04/18 21:23:33 WARN DAGScheduler: Broadcasting large task binary with size 1958.0 KiB\n26/04/18 21:23:34 WARN DAGScheduler: Broadcasting large task binary with size 3.5 MiB\n26/04/18 21:23:36 WARN DAGScheduler: Broadcasting large task binary with size 6.2 MiB\n26/04/18 21:23:37 WARN DAGScheduler: Broadcasting large task binary with size 1563.3 KiB\n26/04/18 21:23:38 WARN DAGScheduler: Broadcasting large task binary with size 10.2 MiB\n26/04/18 21:23:40 WARN DAGScheduler: Broadcasting large task binary with size 2.2 MiB\n26/04/18 21:23:44 WARN DAGScheduler: Broadcasting large task binary with size 1054.2 KiB\n26/04/18 21:23:45 WARN DAGScheduler: Broadcasting large task binary with size 1973.3 KiB\n26/04/18 21:23:46 WARN DAGScheduler: Broadcasting large task binary with size 3.6 MiB\n26/04/18 21:23:47 WARN DAGScheduler: Broadcasting large task binary with size 1048.0 KiB\n26/04/18 21:23:48 WARN DAGScheduler: Broadcasting large task binary with size 6.5 MiB\n26/04/18 21:23:50 WARN DAGScheduler: Broadcasting large task binary with size 1748.6 KiB\n26/04/18 21:23:52 WARN DAGScheduler: Broadcasting large task binary with size 11.1 MiB\n26/04/18 21:23:53 WARN DAGScheduler: Broadcasting large task binary with size 2.6 MiB\n2026-04-18 21:23:55  [INFO]  Closing down clientserver connection\n2026-04-18 21:23:55  [INFO]  Closing down clientserver connection\n2026-04-18 21:23:55  [INFO]  Closing down clientserver connection\n2026-04-18 21:23:55  [INFO]  CV average RMSE values per param combo: ['0.5499', '0.4850', '0.5493', '0.4817']\n2026-04-18 21:23:55  [INFO]  \u2500\u2500 Evaluating Random Forest on Test Set \u2500\u2500\n2026-04-18 21:23:56  [INFO]    RMSE : 0.4921\n2026-04-18 21:23:56  [INFO]    MAE  : 0.3174\n2026-04-18 21:23:56  [INFO]    R\u00b2   : 0.8604\n26/04/18 21:23:56 WARN TaskSetManager: Stage 436 contains a task of very large size (1169 KiB). The maximum recommended task size is 1000 KiB.\n2026-04-18 21:23:57  [INFO]  \u2705 Random Forest model saved to: /home/nazeer/DDM/hadoop_work/spark_pipeline/models/random_forest\n2026-04-18 21:23:57  [INFO]  \n=======================================================\n2026-04-18 21:23:57  [INFO]                 MODEL COMPARISON SUMMARY\n2026-04-18 21:23:57  [INFO]  =======================================================\n2026-04-18 21:23:57  [INFO]  Metric        LinearReg   RandomForest\n2026-04-18 21:23:57  [INFO]  ----------------------------------------\n2026-04-18 21:23:57  [INFO]  RMSE             0.5936         0.4921\n2026-04-18 21:23:57  [INFO]  MAE              0.3997         0.3174\n2026-04-18 21:23:57  [INFO]  R2               0.7969         0.8604\n2026-04-18 21:23:57  [INFO]  =======================================================\n2026-04-18 21:23:57  [INFO]  \ud83c\udfc6  Best model by RMSE: Random Forest\n2026-04-18 21:23:57  [INFO]  =======================================================\n2026-04-18 21:23:58  [INFO]  Closing down clientserver connection\n", "l2-pred": "Predicted batch saved to HDFS /output/predictions.csv", "l2-report": "\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n        AIR QUALITY SPARK ML PIPELINE \u2013 RUN REPORT\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n  Generated : 2026-04-18 21:59:43\n  Run at    : 2026-04-18T21:23:57\n  Mode      : LOCAL\n\n  DATASET SUMMARY\n  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  Total rows            : 9471\n  Training rows         : 7645\n  Test rows             : 1826\n  Target variable       : CO_GT\n  Cross-val folds       : 3\n  Feature count         : 13\n  Features              : PT08_S1_CO, C6H6_GT, PT08_S2_NMHC, NOx_GT, PT08_S3_NOx, NO2_GT, PT08_S4_NO2, PT08_S5_O3, T, RH, AH, Hour, IsRushHour\n\n  MODEL PERFORMANCE COMPARISON\n  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  Metric        Linear Regression    Random Forest  Winner\n  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  RMSE                     0.5936           0.4921  RF \u2713\n  MAE                      0.3997           0.3174  RF \u2713\n  R2                       0.7969           0.8604  RF \u2713\n  Train (s)                  11.2             62.5\n\n  \ud83c\udfc6  WINNER: Random Forest\n  \u23f1   Total pipeline time: 86.3s\n\n  LOG FILES\n  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  preprocess_run.log                           9807 B  2026-04-18 21:22\n  train_run.log                               12639 B  2026-04-18 21:23\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550"};

document.addEventListener('DOMContentLoaded', () => {
  const l2Steps = document.querySelectorAll('.l2-step');
  const l2Toggles = document.querySelectorAll('.l2-toggle');
  const l2CodeBlock = document.getElementById('l2-cv-code-block');
  
  const lab2Explanations = {
    'l2-hdfs': 'Sets up the Hadoop Distributed File System (HDFS). Formats the NameNode and spins up the daemons for scalable parallel storage before uploading the dataset.',
    'l2-pre': 'PySpark preprocessing module. Loads raw CSV data into a distributed DataFrame, handles missing values, and engineers the IsRushHour feature.',
    'l2-train': 'Distributed Machine Learning using PySpark MLlib. Trains and evaluates both Linear Regression and Random Forest models across the cluster using CrossValidator.',
    'l2-pred': 'Batch inference module. Loads the saved Random Forest model from HDFS and generates predictions across massive parallel partitions.',
    'l2-report': 'Automated metrics reporting. Aggregates the cross-validation and prediction statistics to build final performance logs and visual charts.'
  };

  if (l2CodeBlock && l2Steps.length > 0) {
    let currentL2Target = 'l2-hdfs';
    let currentL2Mode = 'code';

    function updateL2View() {
      l2CodeBlock.classList.remove('code-fade-animate');
      // Trigger reflow
      void l2CodeBlock.offsetWidth;

      let content = '';
      if (currentL2Mode === 'code') {
        content = lab2Codes[currentL2Target] || 'Code not available.';
        l2CodeBlock.className = 'language-python';
      } else {
        content = lab2Outputs[currentL2Target] || 'Output not available.';
        l2CodeBlock.className = 'language-log'; 
      }
      
      l2CodeBlock.textContent = content;
      l2CodeBlock.classList.add('code-fade-animate');

      // Update explanation text
      const sumEl = document.getElementById('l2-explanation');
      if (sumEl) {
        sumEl.style.opacity = 0;
        setTimeout(() => {
            sumEl.textContent = lab2Explanations[currentL2Target] || '';
            sumEl.style.opacity = 1;
        }, 150);
      }
      
      // Auto-highlight if hljs exists
      if (typeof hljs !== 'undefined' && currentL2Mode === 'code') {
        hljs.highlightElement(l2CodeBlock);
      }

      // Update Simulation State
      updateClusterSimulation(currentL2Target);
    }

    // CLUSTER SIMULATION LOGIC
    const simContainer = document.getElementById('l2-cluster-sim');
    const simBtn = document.getElementById('l2-sim-btn');
    const particleContainer = document.getElementById('sim-particles');
    const statusBar = document.getElementById('sim-status-bar');
    let simInterval = null;
    let narrativeTimeout = null;

    if (simBtn && simContainer) {
      simBtn.addEventListener('click', () => {
        const isHidden = simContainer.style.display === 'none';
        simContainer.style.display = isHidden ? 'block' : 'none';
        simBtn.innerHTML = isHidden ? '🛑 Stop Visualization' : '🚀 Run Cluster Visualization';
        if (isHidden) {
          runCombinedNarrative();
        } else {
          stopSimulation();
        }
      });
    }

    function stopSimulation() {
      if (simInterval) clearInterval(simInterval);
      if (narrativeTimeout) clearTimeout(narrativeTimeout);
      if (particleContainer) particleContainer.innerHTML = '';
      document.querySelectorAll('.sim-node').forEach(n => n.classList.remove('active-work'));
      if (statusBar) statusBar.textContent = 'Ready to start...';
    }

    const narrativePhases = [
      { 
        id: 'hdfs', 
        text: '📦 HDFS Setup: Bootstrapping distributed storage and uploading raw sensor data.',
        duration: 4000 
      },
      { 
        id: 'preprocess', 
        text: '🧹 Distributed Preprocessing: Partitioning data and handling missing values across all executors.',
        duration: 5000 
      },
      { 
        id: 'train', 
        text: '🧠 Parallel Model Training: Executing Spark MLlib algorithms (Random Forest) on data shards.',
        duration: 6000 
      },
      { 
        id: 'report', 
        text: '📊 Final Aggregation: Collecting distributed metrics back to Master for reporting.',
        duration: 4000 
      }
    ];

    function runCombinedNarrative() {
      stopSimulation();
      let currentPhaseIdx = 0;

      function nextPhase() {
        if (currentPhaseIdx >= narrativePhases.length) {
          if (statusBar) statusBar.textContent = '✅ Pipeline Simulation Complete.';
          // Loop after a delay
          narrativeTimeout = setTimeout(() => {
            currentPhaseIdx = 0;
            nextPhase();
          }, 3000);
          return;
        }

        const phase = narrativePhases[currentPhaseIdx];
        if (statusBar) {
          statusBar.style.opacity = 0;
          setTimeout(() => {
            statusBar.textContent = phase.text;
            statusBar.style.opacity = 1;
          }, 200);
        }

        // Trigger simulation state
        updateClusterSimulation(phase.id);

        currentPhaseIdx++;
        narrativeTimeout = setTimeout(nextPhase, phase.duration);
      }

      nextPhase();
    }

    function updateClusterSimulation(phaseId) {
      if (simInterval) clearInterval(simInterval);
      if (particleContainer) particleContainer.innerHTML = '';
      document.querySelectorAll('.sim-node').forEach(n => n.classList.remove('active-work'));

      const workers = [
        { el: document.querySelector('.worker.w1'), x: '15%', y: '28%' },
        { el: document.querySelector('.worker.w2'), x: '85%', y: '28%' },
        { el: document.querySelector('.worker.w3'), x: '50%', y: '92%' }
      ];

      switch(phaseId) {
        case 'hdfs':
          spawnParticles('to-workers', workers);
          break;
        case 'preprocess':
        case 'train':
          workers.forEach(w => w.el.classList.add('active-work'));
          spawnParticles('processing', workers);
          break;
        case 'report':
          spawnParticles('to-master', workers);
          break;
      }
    }

    function spawnParticles(type, workers) {
      simInterval = setInterval(() => {
        if (type === 'to-workers') {
          const w = workers[Math.floor(Math.random() * workers.length)];
          createParticle(w.x, w.y, 'flow-to-worker');
        } else if (type === 'to-master') {
          const w = workers[Math.floor(Math.random() * workers.length)];
          createParticle(w.x, w.y, 'flow-to-master');
        } else {
          workers.forEach(w => {
            if (Math.random() > 0.6) createAmbientParticle(w.el);
          });
        }
      }, 250);
    }

    function createParticle(tx, ty, anim) {
      const p = document.createElement('div');
      p.className = 'sim-particle';
      // Vivid colors for better visibility
      const colors = ['#A78BFA', '#60A5FA', '#F472B6', '#34D399'];
      p.style.background = colors[Math.floor(Math.random()*colors.length)];
      p.style.setProperty('--tx', tx);
      p.style.setProperty('--ty', ty);
      p.style.setProperty('--sx', tx);
      p.style.setProperty('--sy', ty);
      p.style.animation = `${anim} 1.5s ease-in-out forwards`;
      particleContainer.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }

    function createAmbientParticle(target) {
      const rect = target.getBoundingClientRect();
      const crect = simContainer.getBoundingClientRect();
      const p = document.createElement('div');
      p.className = 'sim-particle';
      p.style.background = 'var(--pink)';
      p.style.left = (rect.left - crect.left + rect.width/2) + 'px';
      p.style.top = (rect.top - crect.top + rect.height/2) + 'px';
      p.style.animation = `nodePulse 1s infinite alternate`;
      particleContainer.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }

    // Node Listeners
    l2Steps.forEach(step => {
      step.addEventListener('click', (e) => {
        const target = e.target.closest('.l2-step');
        if (!target) return;
        l2Steps.forEach(t => t.classList.remove('active'));
        target.classList.add('active');
        currentL2Target = target.getAttribute('data-target');
        updateL2View();
      });
    });

    // Toggle Listeners
    l2Toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        l2Toggles.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentL2Mode = e.target.getAttribute('data-mode');
        updateL2View();
      });
    });

    // Initial fill
    updateL2View();
  }
});
