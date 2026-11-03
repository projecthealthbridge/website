// Writes the site's pages (index, articles, neurology, ... credits, 404) from templates, so the header, footer,
// menu and the repeated blocks stay identical on every page.
//
//   node tools/build-pages.mjs
//
// CAUTION: this OVERWRITES the .html files in the project root. Use it to change something that appears on many pages
// (the menu, the footer, the sign-up box) or to add a page; if you edit a page's .html by hand instead, do not run this
// afterwards, or your hand edits are lost. Page text lives in the templates below.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUBSTACK = 'https://projecthealthbridge.substack.com/'
// Substack's plain email box: no plan or payment screens (the publication has payments switched off)
const SUBSTACK_JOIN = SUBSTACK + 'subscribe?simple=true'
const INSTAGRAM = 'https://www.instagram.com/project_healthbridge/'
const LINKEDIN = 'https://www.linkedin.com/company/project-healthbridge/'
const EMAIL = 'projecthealthbridge0701@gmail.com'
// Opens a new message in Gmail on the web (not the computer's default mail app)
const gmail = (subject) => `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}${subject ? '&su=' + encodeURIComponent(subject) : ''}`

/* ---------- Custom icons (stroke icons share one style: 1.6 weight, round caps) ---------- */
const stroke = (d, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const fill = (d, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${d}</svg>`
const I = {
  ext: stroke('<path d="M7 17 17 7M8 7h9v9"/>'),
  arrow: stroke('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  doc: stroke('<path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/>'),
  flask: stroke('<path d="M9 3h6M10 3v6l-5 10a1.5 1.5 0 0 0 1.4 2h11.2a1.5 1.5 0 0 0 1.4-2l-5-10V3M8 15h8"/>'),
  check: stroke('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.5"/>'),
  people: stroke('<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>'),
  mic: stroke('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>'),
  video: stroke('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>'),
  bolt: stroke('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'),
  lock: stroke('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  menu: stroke('<path d="M4 7h16M4 12h16M4 17h16"/>', 'ic menu-ic'),
  instagram: fill('<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zm5.2-3.7a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1z"/>'),
  linkedin: fill('<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zm6.75 0h3.8v1.6h.06c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.78 2.66 4.78 6.1V21h-4v-5.04c0-1.2-.02-2.75-1.67-2.75-1.68 0-1.94 1.31-1.94 2.66V21h-4z"/>'),
  substack: fill('<path d="M4 3h16v2.6H4zm0 4.6h16v2.6H4zM4 12h16v9.5l-8-4.5-8 4.5z"/>'),
}

/* Three line drawings, one per discipline. They share a 64-unit grid and a 1.6 stroke. */
const art = (d) => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const ART = {
  Neurology: art('<path d="M32 9c-5 0-8.5 3-9.5 6.5C17 15.5 13 19.500 13 25c0 3 1.200 5.500 3.200 7.200C14 34.500 13 37 13 40c0 5.500 4 9.500 9.500 9.500C23.500 53 27 55 32 55z"/><path d="M32 9c5 0 8.500 3 9.500 6.500C47 15.500 51 19.500 51 25c0 3-1.200 5.500-3.200 7.200C50 34.500 51 37 51 40c0 5.500-4 9.500-9.500 9.500C40.500 53 37 55 32 55"/><path d="M23 24c3.500 0 5.500 2.200 5.500 5.500M23 40c3.500 0 5.500-2.200 5.500-5.500M41 24c-3.500 0-5.500 2.200-5.500 5.500M41 40c-3.500 0-5.500-2.200-5.500-5.500M32 9v46"/>'),
  Cardiology: art('<path d="M32 55C16 43.500 8 33 8 23.500a12.500 12.500 0 0 1 24-4.500 12.500 12.500 0 0 1 24 4.500C56 33 48 43.500 32 55z"/><path d="M4 34h15l4.500-9 7 19 5-13 3.500 3H60"/>'),
  Psychology: art('<path d="M23 56V46c-7-3.500-11-9.500-11-17.500C12 16.500 20.500 8 32 8s20 8 20 19c0 4-1.200 7-3.200 10l4 7-7.500 2.500V56z"/><path d="M26 29a6 6 0 0 1 12 0M21.500 29a10.500 10.500 0 0 1 21 0M32 29v.1"/>'),
}

const NAV = [
  ['articles.html', 'Articles'], ['library.html', 'Library'], ['neurology.html', 'Neurology'], ['cardiology.html', 'Cardiology'],
  ['psychology.html', 'Psychology'], ['experiments.html', 'Experiments'], ['quiz.html', 'Quiz'], ['about.html', 'About'], ['index.html#contact', 'Contact'],
]

const header = (current) => `
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="index.html"><img src="assets/logo-192.png" alt="" width="37" height="37"><span>HealthBridge</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${I.menu}</button>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${NAV.map(([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
      <a class="btn btn-primary" href="index.html#join">Join us</a>
    </nav>
  </div>
</header>`

const joinButtons = (band) => `<div class="join">
  <a class="btn ${band ? 'btn-band' : 'btn-primary'}" href="${SUBSTACK_JOIN}" target="_blank" rel="noopener">${I.substack}Join us on Substack</a>
  <a class="btn ${band ? 'btn-band-line' : 'btn-line'}" href="${LINKEDIN}" target="_blank" rel="noopener">${I.linkedin}Join us on LinkedIn</a>
  <a class="btn ${band ? 'btn-band-line' : 'btn-line'}" href="${INSTAGRAM}" target="_blank" rel="noopener">${I.instagram}Join us on Instagram</a>
</div>`

const footer = `
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="brand" href="index.html"><img src="assets/logo-192.png" alt="" width="37" height="37"><span>HealthBridge</span></a>
        <p style="margin-top:1rem;max-width:30ch">A student-led health awareness project in Singapore.</p>
      </div>
      <div><h2>Read</h2><ul><li><a href="articles.html">Articles</a></li><li><a href="papers.html">Papers</a></li><li><a href="weekly.html">Weekly</a></li><li><a href="experiments.html">Experiments</a></li><li><a href="quiz.html">Quiz</a></li><li><a href="${SUBSTACK}" target="_blank" rel="noopener">Substack</a></li></ul></div>
      <div><h2>Explore</h2><ul><li><a href="neurology.html">Neurology</a></li><li><a href="cardiology.html">Cardiology</a></li><li><a href="psychology.html">Psychology</a></li><li><a href="glossary.html">Glossary</a></li><li><a href="reading-list.html">Reading list</a></li><li><a href="about.html">About</a></li><li><a href="index.html#join">Join us</a></li></ul></div>
      <div><h2>Need help now?</h2>
        <ul class="help">
          <li><b>Emergency (ambulance, fire):</b> 995</li>
          <li><b>Police:</b> 999</li>
          <li><b>Samaritans of Singapore, 24 hours:</b> 1767 or 1800-221-4444</li>
          <li><b>IMH Mental Health Helpline:</b> 6389 2222</li>
        </ul>
      </div>
    </div>
    <div class="legal">
      <p>For education only. Nothing on this site is medical advice. If you are worried about your health, talk to a doctor.</p>
      <p>© 2026 Project HealthBridge. A student-led, volunteer-run project. <a href="credits.html">Credits</a> <a href="tools/carousel/index.html">Carousel maker</a></p>
    </div>
  </div>
</footer>`

const SCRIPTS = ['data/site.js', 'data/articles.js', 'data/summaries.js', 'data/weekly.js', 'data/founders.js', 'js/data.js', 'js/health.js', 'js/app.js']
const SIGNUP = `<div class="signup">
      <div><h3>Get new articles by email</h3><p>Join our Substack and each new article lands in your inbox. It is free.</p></div>
      <div data-signup-box><a class="btn btn-primary" href="${SUBSTACK_JOIN}" target="_blank" rel="noopener" data-signup-open>Show the sign-up form</a></div>
    </div>`
const page = ({ title, desc, current, body, scripts = SCRIPTS, noPrompt = false }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="theme-color" content="#f3f7f5" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#09191a" media="(prefers-color-scheme: dark)">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:type" content="website">
  <link rel="icon" href="assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="assets/logo-192.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <script>document.documentElement.classList.add('js')</script>
</head>
<body${noPrompt ? ' data-no-prompt' : ''}>${header(current)}
<main id="main">
${body}
</main>${footer}
${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`
const write = (name, html) => fs.writeFileSync(`${OUT}/${name}`, html, 'utf8')

/* The line across the hero: three heartbeats (ECG) that settle into brain waves (EEG). */
const beat = (o) => `L${o + 40},60 C${o + 48},60 ${o + 52},52 ${o + 60},52 C${o + 68},52 ${o + 72},60 ${o + 80},60 L${o + 92},60 L${o + 98},68 L${o + 108},6 L${o + 118},100 L${o + 126},60 L${o + 150},60 C${o + 160},60 ${o + 166},42 ${o + 180},42 C${o + 194},42 ${o + 200},60 ${o + 212},60 L${o + 240},60`
const TRACE = `M0,60 ${beat(0)} ${beat(240)} ${beat(480)} Q738,34 756,60 T792,60 T828,60 T864,60 Q882,8 900,60 T936,60 Q950,102 972,60 T1008,60 Q1022,26 1044,60 T1080,60 T1116,60 T1152,60 T1200,60`

/* ---------- The 3D section: parts and what they do (textbook basics, a draft for the founders to review) ---------- */
const BRAIN_PARTS = [
  ['frontal', 'Frontal lobe', '#2e8b6e', 'Planning, decision making and self-control. It also drives voluntary movement and a large part of your personality.'],
  ['parietal', 'Parietal lobe', '#3aa6a0', 'Brings together touch, temperature and pain, and keeps track of where your body is in space.'],
  ['temporal', 'Temporal lobes', '#7cc4a0', 'Hearing and understanding language, and building memories together with the hippocampus tucked inside them.'],
  ['occipital', 'Occipital lobe', '#4a8fb0', 'Vision. It receives the signals from your eyes and turns them into what you see.'],
  ['cerebellum', 'Cerebellum', '#d9a441', 'Balance, coordination, and smooth, practised movement.'],
  ['brainstem', 'Brainstem', '#c8625a', 'Keeps you alive without thinking: breathing, heart rate, and the sleep and wake cycle. It also links the brain to the spinal cord.'],
  ['hippocampus', 'Hippocampus', '#8e7cc3', 'Turns what you experience into new long-term memories.'],
  ['amygdala', 'Amygdala', '#e0845f', 'Spots threats and drives fear and other strong emotions. It also helps attach emotion to memories.'],
]
const HEART_PARTS = [
  ['rightAtrium', 'Right atrium', '#e29a9c', 'Receives oxygen-poor blood coming back from the body through the vena cava.'],
  ['rightVentricle', 'Right ventricle', '#cc6a70', 'Pumps oxygen-poor blood to the lungs through the pulmonary artery.'],
  ['leftAtrium', 'Left atrium', '#d98486', 'Receives oxygen-rich blood from the lungs through the pulmonary veins.'],
  ['leftVentricle', 'Left ventricle', '#a93a45', 'The strongest chamber. It pumps oxygen-rich blood out to the whole body through the aorta.'],
  ['aorta', 'Aorta', '#d0453f', "The body's largest artery. It carries oxygen-rich blood from the heart to the rest of the body."],
  ['pulmonaryArtery', 'Pulmonary artery', '#3d86b5', 'Carries oxygen-poor blood from the heart to the lungs. It is one of the few arteries that carries oxygen-poor blood.'],
  ['venaCava', 'Vena cava', '#3d86b5', 'The two largest veins, one from the upper body and one from the lower. They bring oxygen-poor blood back to the right atrium.'],
  ['pulmonaryVeins', 'Pulmonary veins', '#d0453f', 'Carry oxygen-rich blood from the lungs to the left atrium. They are among the few veins that carry oxygen-rich blood.'],
  ['coronaryArteries', 'Coronary arteries', '#ff7a45', 'Wrap around the outside of the heart and feed the heart muscle itself with oxygen-rich blood. If one is blocked, part of the muscle is starved of oxygen, which is what causes a heart attack.'],
  ['cardiacVeins', 'Cardiac veins', '#5aa7c9', 'Collect the used, oxygen-poor blood from the heart muscle and drain it into the right atrium, mostly through a large vein called the coronary sinus.'],
  ['valves', 'Heart valves', '#d9a441', 'Four one-way doors, between the atria and ventricles and at the exits of the heart, that stop blood flowing backwards. Their closing makes the sound of a heartbeat.'],
]
const partList = (id, parts) => `<ul class="part-list" data-model="${id}"${id === 'heart' ? ' hidden' : ''}>
${parts.map(([pid, name, colour, fn]) => `        <li><button class="part" type="button" data-part="${pid}" aria-expanded="false"><span class="swatch" style="--c:${colour}" aria-hidden="true"></span><span class="part-name">${name}</span></button><p class="part-fn">${fn}</p></li>`).join('\n')}
      </ul>`
const ANATOMY = `
<section class="block" id="anatomy" aria-labelledby="anat-title" data-anatomy data-current="brain">
  <div class="wrap">
    <div class="head"><h2 id="anat-title">Inside the brain and the heart</h2><p>Pull each one apart to see its working parts. Tap a part, or its name in the list, to read what it does.</p></div>
    <div class="tabs" data-model-tabs role="group" aria-label="Choose a model">
      <button class="tab" type="button" data-model="brain" aria-pressed="true">The brain</button>
      <button class="tab" type="button" data-model="heart" aria-pressed="false">The heart</button>
    </div>
    <div class="anatomy">
      <div class="stage">
        <div class="stage-view" data-stage>
          <div class="stage-art" data-fallback><div data-art="brain">${ART.Neurology}</div><div data-art="heart" hidden>${ART.Cardiology}</div></div>
          <canvas data-canvas tabindex="0" role="img" aria-label="Interactive 3D model, split into its parts. Drag to turn it, or use the arrow keys. The list beside it describes every part."></canvas>
          <div class="labels" data-labels></div>
          <p class="stage-loading" role="status">Loading the 3D model</p>
        </div>
        <div class="stage-tools">
          <label class="explode"><span>Together</span><input type="range" min="0" max="100" value="0" data-explode><span>Apart</span></label>
          <button class="stage-btn" type="button" data-apart>Pull apart</button>
          <button class="stage-btn" type="button" data-reset>Reset</button>
        </div>
        <p class="sr-only" role="status" aria-live="polite" data-status></p>
      </div>
      <div class="parts">
      ${partList('brain', BRAIN_PARTS)}
      ${partList('heart', HEART_PARTS)}
      </div>
    </div>
    <p class="note stage-note" data-note>A model for learning, based on one person's scans, so real brains and hearts vary. In the heart, blue vessels carry oxygen-poor blood and red vessels carry oxygen-rich blood. The amygdala is a simplified shape. If the 3D view does not load, the list still tells you what every part does.</p>
    <p class="note stage-note">3D models: BodyParts3D, © The Database Center for Life Science, licensed under <a class="link" href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noopener">CC Attribution-Share Alike 2.1 Japan</a>. We merged, trimmed, smoothed and recoloured the parts. <a class="link" href="credits.html">All credits</a></p>
  </div>
</section>
`

/* ---------- Home ---------- */
write('index.html', page({
  current: 'index.html',
  title: 'Project HealthBridge | A student-led health innovation lab',
  desc: 'HealthBridge is a student-led innovation lab exploring how the brain, behavior, and heart shape human health, then testing, building, and sharing real-world insights.',
  body: `
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap hero-grid">
    <h1 id="hero-title">Your Health,<br>Our Mission</h1>
    <div>
      <p class="lede">HealthBridge is a student-led innovation lab turning ideas into action by exploring how the brain, behavior, and heart shape human health, then testing, building, and sharing real-world insights.</p>
      <div class="cta">
        <a class="btn btn-primary" href="${SUBSTACK_JOIN}" target="_blank" rel="noopener">${I.substack}Join us on Substack</a>
        <a class="btn btn-line" href="#disciplines">Explore health</a>
      </div>
    </div>
  </div>
  <div class="trace" aria-hidden="true">
    <div class="wrap"><svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="${TRACE}" pathLength="1"/></svg>
    <div class="trace-labels"><span><i class="pulse-dot"></i>Heart rhythm</span><span>Brain waves</span></div></div>
  </div>
</section>

<section class="block" aria-labelledby="vitals-title">
  <div class="wrap">
    <div class="head"><h2 id="vitals-title">Vital signs</h2></div>
    <div class="vitals">
      <div class="vital"><b>20%</b><span>of your body's energy goes to your brain, which is only 2% of your body weight.</span></div>
      <div class="vital"><b>100,000</b><span>heartbeats a day, pumping about 2,000 gallons of blood.</span></div>
      <div class="vital"><b>37.2<small> trillion</small></b><span>cells in your body, constantly being replaced.</span></div>
      <div class="vital"><b>20,000</b><span>breaths a day, without even thinking about it.</span></div>
      <div class="vital"><b>86<small> billion</small></b><span>neurons, talking through electrical and chemical signals.</span></div>
    </div>
  </div>
</section>

<section class="block" id="disciplines" aria-labelledby="disc-title">
  <div class="wrap">
    <div class="head"><h2 id="disc-title">Explore by health category</h2></div>
    <div class="disciplines">
      <a class="discipline" href="neurology.html"><div class="arch">${ART.Neurology}</div><h3>Neurology</h3><p>Explore the fascinating world of your brain, nervous system, and how your mind works. Understand the science behind your thoughts, emotions, and behaviors.</p><span class="link">Explore neurology ${I.arrow}</span></a>
      <a class="discipline" href="cardiology.html"><div class="arch">${ART.Cardiology}</div><h3>Cardiology</h3><p>Discover the secrets of your heart and cardiovascular system. Learn how your heart pumps life through your body and how to keep it healthy.</p><span class="link">Explore cardiology ${I.arrow}</span></a>
      <a class="discipline" href="psychology.html"><div class="arch">${ART.Psychology}</div><h3>Psychology</h3><p>Understand human behavior, emotions, and mental health. Explore the psychological aspects of wellness and how your mind influences your overall health.</p><span class="link">Explore psychology ${I.arrow}</span></a>
    </div>
  </div>
</section>
${ANATOMY}
<section class="block tint" aria-labelledby="latest-title">
  <div class="wrap">
    <div class="head"><h2 id="latest-title">Latest writing</h2><p>Big ideas watered down for the public. New posts appear here by themselves when we publish on Substack.</p></div>
    <ul class="rows" data-articles data-limit="4"></ul>
    <p style="margin-top:1.75rem"><a class="link" href="articles.html">See all articles ${I.arrow}</a></p>
    <div style="margin-top:3rem">${SIGNUP}</div>
  </div>
</section>

<section class="band" id="join" aria-labelledby="join-title">
  <div class="wrap">
    <h2 id="join-title">Join us</h2>
    <p>Follow HealthBridge where you already spend your time.</p>
    ${joinButtons(true)}
  </div>
</section>

<section class="block" aria-labelledby="more-title">
  <div class="wrap">
    <div class="head"><h2 id="more-title">More to explore</h2></div>
    <div class="index">
      <a class="item" href="experiments.html">${I.flask}<div><h3>Experiments</h3><p>The experiments we are planning, and how we aim to run them safely.</p></div></a>
      <a class="item" href="quiz.html">${I.check}<div><h3>Quiz</h3><p>Test your knowledge with multiple-choice questions.</p></div></a>
      <a class="item" href="articles.html">${I.doc}<div><h3>Articles</h3><p>Articles and literature reviews written by our team on neurology, cardiology and psychology.</p></div></a>
      <a class="item" href="#contact">${I.people}<div><h3>Connect</h3><p>Send us a message, or follow us on Substack, Instagram and LinkedIn.</p></div></a>
      <div class="item soon">${I.mic}<div><h3>MedTalk</h3><p>Our podcast: medical talk with evidence-based information.</p><span class="status">Coming soon</span></div></div>
      <div class="item soon">${I.bolt}<div><h3>Knowledge in Motion</h3><p>1-minute educational videos on health topics.</p><span class="status">Coming soon</span></div></div>
    </div>
  </div>
</section>

<section class="block" aria-labelledby="pablo-title">
  <div class="wrap pablo">
    <img src="assets/pablo.jpg" alt="Pablo, a friendly see-through skeleton wearing a red headband, standing in front of a laboratory on a computer screen" width="419" height="746">
    <div>
      <h2 id="pablo-title">Meet Pablo</h2>
      <p>Meet Pablo, the friendly skeleton behind our Knowledge in Motion videos! With his bony charm and endless curiosity, Pablo helps explain biological concepts in a fun, simple, and memorable way. He guides viewers through the fascinating world of the human body, making learning engaging and easy to understand.</p>
      <blockquote>No bones about it: biology comes alive with Pablo!</blockquote>
    </div>
  </div>
</section>

<section class="block tint" aria-labelledby="founders-title">
  <div class="wrap">
    <div class="head"><h2 id="founders-title">Meet our founders</h2></div>
    <div class="founders">
      <!-- Photos to come: replace the .monogram div with <img class="monogram" src="assets/anirudh.jpg" alt="Anirudh Shukla"> (portrait, any size) -->
      <article class="founder">
        <div class="monogram" aria-hidden="true">${ART.Neurology}<span>AS</span></div>
        <div><h3>Anirudh Shukla</h3><p class="role">Co-Founder</p><p class="focus">Brain and mind: neurology and psychology</p><blockquote>“Only when your eyes are closed can you truly see”</blockquote><p class="why" data-why="as" hidden></p></div>
      </article>
      <article class="founder">
        <div class="monogram" aria-hidden="true">${ART.Cardiology}<span>AK</span></div>
        <div><h3>Aditya Katakam</h3><p class="role">Co-Founder</p><p class="focus">Heart and circulation: cardiology</p><blockquote>“What can I say, It's how I Roll”</blockquote><p class="why" data-why="ak" hidden></p></div>
      </article>
      <a class="founder join-card" href="index.html#contact"><div class="plus" aria-hidden="true">+</div><div><h3>Want to help?</h3><p class="role">A small student team</p><p class="focus">If you would like to help with Project HealthBridge, get in touch. ${I.arrow}</p></div></a>
    </div>
  </div>
</section>

<section class="block" id="health-check" aria-labelledby="bmi-title">
  <div class="wrap split">
    <div>
      <h2 id="bmi-title">Health check: BMI calculator</h2>
      <p class="muted">Understand your health metrics based on your age and body measurements.</p>
      <p class="privacy">${I.lock}<span>Your privacy matters. None of your data is saved or stored. All calculations are performed locally on your device.</span></p>
      <p class="note">BMI is a rough screening number. It cannot see muscle, bone or where fat sits, and it is not a diagnosis.</p>
    </div>
    <div class="panel">
      <form id="bmi-form" novalidate>
        <div class="fields">
          <div><label for="height">Height (cm)</label><input id="height" name="height" type="number" inputmode="decimal" min="50" max="250" step="0.1" required></div>
          <div><label for="weight">Weight (kg)</label><input id="weight" name="weight" type="number" inputmode="decimal" min="10" max="300" step="0.1" required></div>
          <div><label for="age">Age (years)</label><input id="age" name="age" type="number" inputmode="numeric" min="2" max="120" step="1" required></div>
        </div>
        <button class="btn btn-primary" type="submit" style="width:100%">Calculate BMI</button>
      </form>
      <div id="bmi-result" class="result" role="status" aria-live="polite"><p class="note" style="margin:0">Enter your details and press Calculate to see your result.</p></div>
    </div>
  </div>
</section>

<section class="block" id="contact" aria-labelledby="contact-title">
  <div class="wrap split">
    <div>
      <h2 id="contact-title">Send us a message</h2>
      <p class="muted">Write your message and press send. It opens your email app with everything filled in, ready to send.</p>
      <div class="ways">
        <div class="way"><h3>Email</h3><p><a href="${gmail()}" target="_blank" rel="noopener">${EMAIL}</a></p><p>We respond within 24-48 hours.</p></div>
        <div class="way"><h3>Location</h3><p>Singapore</p></div>
        <div class="way"><h3>Follow our journey</h3>
          <div class="join" style="margin-top:.6rem"><a class="btn btn-line" href="${SUBSTACK}" target="_blank" rel="noopener">${I.substack}Substack</a><a class="btn btn-line" href="${INSTAGRAM}" target="_blank" rel="noopener">${I.instagram}Instagram</a><a class="btn btn-line" href="${LINKEDIN}" target="_blank" rel="noopener">${I.linkedin}LinkedIn</a></div>
        </div>
      </div>
    </div>
    <form id="contact-form" class="panel" data-to="${EMAIL}">
      <div class="two">
        <div class="field"><label for="first">First name</label><input id="first" name="first" autocomplete="given-name" required></div>
        <div class="field"><label for="last">Last name</label><input id="last" name="last" autocomplete="family-name"></div>
      </div>
      <div class="field"><label for="email">Your email address</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="message">Message</label><textarea id="message" name="message" required></textarea></div>
      <button class="btn btn-primary" type="submit">Send message</button>
    </form>
  </div>
</section>

<section class="block tint" aria-labelledby="mission-title">
  <div class="wrap">
    <h2 id="mission-title" class="sr-only">Our mission</h2>
    <p class="mission">HealthBridge is a student-led initiative dedicated to improving health literacy and combating medical misinformation among teenagers.</p>
    <p class="muted" style="max-width:52ch">We believe that access to accurate health information is a fundamental right. We combine evidence-based medical information with interactive learning tools to help young people make informed decisions about their health.</p>
  </div>
</section>`,
}))

/* ---------- Category pages ---------- */
const category = ({ file, name, tagline, whatIs, blocks, concepts, outro, extra = '' }) => write(file, page({
  current: file,
  title: `${name} | Project HealthBridge`,
  desc: `${tagline}. Beginner-friendly explainers, our articles and the topics we are exploring.`,
  body: `
<div class="page-head"><div class="wrap">
  <a class="back" href="index.html">${I.arrow}Home</a>
  <div class="arch">${ART[name]}</div>
  <h1>${name}</h1>
  <p>${tagline}</p>
</div></div>

<section class="block"><div class="wrap">
  <div class="prose">
    <h2>${whatIs[0]}</h2>
    <p>${whatIs[1]}</p>
    ${blocks.map(([h, p]) => `<h2>${h}</h2>\n    <p>${p}</p>`).join('\n    ')}
  </div>
  <div class="head" style="margin-top:4rem"><h2>Key ${name.toLowerCase()} concepts for beginners</h2></div>
  <div class="concepts">${concepts.map(([h, p]) => `<div><h3>${h}</h3><p>${p}</p></div>`).join('\n    ')}</div>
  ${extra}
</div></section>

<section class="block tint"><div class="wrap">
  <div class="head"><h2>Our ${name.toLowerCase()} writing</h2></div>
  <ul class="rows" data-articles data-category="${name}"></ul>
</div></section>

<section class="block"><div class="wrap">
  <div class="head"><h2>What we are exploring next</h2><p>Topics on our reading list. Some are already articles; the rest are coming.</p></div>
  <ul class="topics" data-topics="${name}"></ul>
  <div class="callout" style="margin-top:3rem"><h3>${outro[0]}</h3><p>${outro[1]}</p><p><a class="link" href="${outro[3]}">${outro[2]} ${I.arrow}</a></p></div>
</div></section>`,
}))

category({
  file: 'neurology.html', name: 'Neurology', tagline: 'Understanding your brain, nervous system, and how your mind works',
  whatIs: ['What is neurology?', 'Neurology is the branch of medicine that studies the nervous system—your brain, spinal cord, and nerves. It explores how these systems control everything you do: thinking, moving, feeling, and remembering.'],
  blocks: [
    ['The brain: your control center', 'Your brain contains about 86 billion neurons (brain cells) that communicate through electrical and chemical signals. It weighs only 3 pounds but controls your entire body and personality.'],
    ['The nervous system network', 'Your nervous system is divided into two parts: the central nervous system (brain and spinal cord) and the peripheral nervous system (nerves throughout your body). Together, they form your body\'s communication network.'],
  ],
  concepts: [
    ['Neurons', 'The basic building blocks of the nervous system. Each neuron communicates with others through synapses (connections), creating the electrical and chemical signals that power your thoughts and actions.'],
    ['Neurotransmitters', 'Chemical messengers that allow neurons to communicate. Examples include dopamine (motivation), serotonin (mood), and acetylcholine (memory). Imbalances can affect mental health.'],
    ['Neuroplasticity', 'Your brain\'s ability to reorganize and form new neural connections throughout life. This means you can learn new skills and recover from brain injuries—your brain is always changing!'],
    ['Gray matter vs white matter', 'Gray matter contains neuron bodies and processes information. White matter contains axons (connections) and transmits signals. Both are essential for brain function.'],
  ],
  outro: ['Curious about your brain?', 'Explore more fascinating topics about neurology, psychology, and how your mind works.', 'Explore psychology', 'psychology.html'],
})

category({
  file: 'cardiology.html', name: 'Cardiology', tagline: 'Understanding your heart, circulation, and cardiovascular health',
  whatIs: ['What is cardiology?', 'Cardiology is the branch of medicine that studies the heart and circulatory system. Your heart is a powerful muscle that pumps blood throughout your body, delivering oxygen and nutrients to every cell.'],
  blocks: [
    ['The heart: your lifeline', 'Your heart beats about 100,000 times per day, pumping approximately 2,000 gallons of blood. It\'s about the size of your fist but powerful enough to sustain your entire body for a lifetime.'],
    ['Blood vessels: the highway network', 'Your circulatory system includes arteries (carry blood away), veins (return blood), and capillaries (tiny vessels for exchange). Together, they form a network over 60,000 miles long—enough to wrap around Earth twice!'],
  ],
  concepts: [
    ['Arteries vs veins', 'Arteries carry oxygen-rich blood away from the heart (usually bright red). Veins return oxygen-poor blood to the heart (usually dark red/blue). Both are essential for circulation.'],
    ['Heart rate and pulse', 'Your heart rate is how many times your heart beats per minute (normal: 60-100 bpm at rest). Your pulse is the heartbeat you can feel in your wrists or neck.'],
    ['Cholesterol and plaque', 'High cholesterol can build up as plaque in arteries, narrowing them and restricting blood flow. This increases heart disease risk. Regular exercise and healthy eating help maintain healthy cholesterol.'],
    ['Arrhythmias', 'Irregular heartbeats can be harmless or serious. Stress, caffeine, or underlying conditions can cause them. Most are manageable with lifestyle changes or medical treatment.'],
  ],
  extra: '<div class="callout warn"><h3>Chest pain, fainting or a racing heart that will not settle?</h3><p>Do not wait. Call 995 (or go to the nearest emergency department). The articles here are for learning, not for checking symptoms.</p></div>',
  outro: ['Keep your heart healthy', 'Your heart works 24/7 to keep you alive. Learn more about psychology and mental health, which also affect your heart.', 'Explore psychology', 'psychology.html'],
})

category({
  file: 'psychology.html', name: 'Psychology', tagline: 'Understanding human behavior, emotions, and mental health',
  whatIs: ['What is psychology?', 'Psychology is the scientific study of human behavior and mental processes. It explores how we think, feel, learn, remember, and interact with others. Understanding psychology helps you understand yourself and others better.'],
  blocks: [
    ['Mind vs brain', 'Your brain is the physical organ (neurons, chemicals). Your mind is what emerges from brain activity—your thoughts, feelings, consciousness, and personality. They work together to create your unique experience.'],
    ['Nature vs nurture', 'Psychology explores how genetics (nature) and environment (nurture) shape who you are. Most behaviors result from both: your genes provide potential, but your experiences and learning determine how that potential develops.'],
  ],
  concepts: [
    ['Self-esteem', 'Your overall evaluation of your own worth. Healthy self-esteem means accepting yourself while recognizing areas for growth. It\'s not arrogance—it\'s self-respect and confidence.'],
    ['Stress and coping', 'Stress is your body\'s response to challenges. Some stress is normal and motivating, but chronic stress harms health. Learning healthy coping strategies (exercise, talking, hobbies) is essential.'],
    ['Mental health vs mental illness', 'Mental health is a spectrum. Everyone has mental health, just like physical health. Mental illness (depression, anxiety, etc.) is treatable. Seeking help is a sign of strength, not weakness.'],
    ['Growth mindset', 'Believing your abilities can be developed through effort and practice. People with growth mindsets embrace challenges, learn from failures, and achieve more than those with fixed mindsets.'],
  ],
  extra: `<div class="callout"><h3>Mental health support</h3><p>If you're struggling with mental health, remember: you're not alone, and help is available. Reach out to a trusted friend, family member, school counselor, or mental health professional. Talking helps.</p><p><b>In Singapore, any time of day:</b> Samaritans of Singapore 1767 or 1800-221-4444. IMH Mental Health Helpline 6389 2222. Emergency 995.</p></div>`,
  outro: ['Your mental health matters', 'Understanding yourself and others is the first step to better mental health and stronger relationships.', 'Back to the home page', 'index.html'],
})

/* ---------- Articles ---------- */
write('articles.html', page({
  current: 'articles.html',
  title: 'Articles | Project HealthBridge',
  desc: 'Articles and literature reviews on neurology, cardiology and psychology, written by the HealthBridge team.',
  body: `
<div class="page-head"><div class="wrap">
  <a class="back" href="index.html">${I.arrow}Home</a>
  <h1>Articles</h1>
  <p>Articles and literature reviews written by our team. Each one opens on our Substack.</p>
</div></div>
<section class="block"><div class="wrap">
  <div class="tabs" data-filters role="group" aria-label="Filter by category">
    <button class="tab" type="button" data-cat="All" aria-pressed="true">All articles</button>
    <button class="tab" type="button" data-cat="Neurology" aria-pressed="false">Neurology</button>
    <button class="tab" type="button" data-cat="Cardiology" aria-pressed="false">Cardiology</button>
    <button class="tab" type="button" data-cat="Psychology" aria-pressed="false">Psychology</button>
  </div>
  <ul class="rows" data-articles></ul>
  <p class="note" style="margin-top:1.25rem" data-updated></p>
  <div style="margin-top:3rem">${SIGNUP}</div>
</div></section>
<section class="band" aria-labelledby="join-title">
  <div class="wrap">
    <h2 id="join-title">Never miss a post</h2>
    <p>New articles go up on our Substack first. Join us there, or follow along on LinkedIn and Instagram.</p>
    ${joinButtons(true)}
  </div>
</section>`,
}))

/* ---------- Experiments ---------- */
write('experiments.html', page({
  current: 'experiments.html',
  title: 'Experiments | Project HealthBridge',
  desc: 'How HealthBridge plans to test health ideas safely: our first two experiment concepts, StrokeSense and AirNudge.',
  body: `
<div class="page-head"><div class="wrap">
  <a class="back" href="index.html">${I.arrow}Home</a>
  <h1>Experiments</h1>
  <p>We believe in learning by doing. Every experiment must have measurable outcomes, and we document what worked, what didn't, and why.</p>
</div></div>
<section class="block"><div class="wrap">
  <div class="callout warn" style="margin-top:0"><h3>Where we are</h3><p>We have not run an experiment yet. These are the first two we are planning. When one runs, its method and results, including anything that fails, will be published here.</p></div>

  <article class="concept">
    <div><h2>StrokeSense</h2><span class="status">Concept, not built or tested yet</span></div>
    <div>
      <p>A purpose-built, dry-electrode EEG headband that detects stroke by measuring electrical asymmetry between the brain's two hemispheres directly, the actual physiological event of a stroke, instead of relying on external, easily-mimicked symptoms like facial drooping or slurred speech.</p>
      <p class="muted">How we would frame it: a screening and early-warning prototype, checked against existing published stroke-EEG datasets, not a certified medical diagnostic device. Every alert would be followed by a call to emergency services.</p>
    </div>
  </article>
  <article class="concept">
    <div><h2>AirNudge</h2><span class="status">Concept, not built or tested yet</span></div>
    <div>
      <p>A wearable sensor-and-actuator system that detects an obstructive sleep apnea event as it happens and delivers a gentle vibration to prompt a position change, reopening the airway without needing a face mask or a machine.</p>
      <p class="muted">How we would frame it: a positional-therapy aid and research prototype, a supplement to, not a replacement for, proper medical diagnosis through a sleep study.</p>
    </div>
  </article>

  <div class="prose" style="margin-top:4rem">
    <h2>How we run experiments</h2>
    <ul class="list">
      <li>Written parental or guardian consent for every volunteer before anything is recorded.</li>
      <li>A teacher or adviser with a science background reviews the plan first. For anything electronic, someone with electronics or physics knowledge checks it before it touches a person.</li>
      <li>We never simulate anything medically risky. Dangerous or rare conditions are studied with existing open, anonymised research data, and live tests only use safe, voluntary, reversible actions.</li>
      <li>Sessions are short and supervised, and anyone can opt out at any time.</li>
      <li>We never give medical advice or run health interventions.</li>
    </ul>
  </div>
</div></section>`,
}))

/* ---------- Quiz ---------- */
write('quiz.html', page({
  current: 'quiz.html', noPrompt: true,
  title: 'Quiz | Project HealthBridge',
  desc: 'Test your knowledge of the brain, the heart and the mind with six multiple-choice questions.',
  body: `
<div class="page-head"><div class="wrap">
  <a class="back" href="index.html">${I.arrow}Home</a>
  <h1>Test your knowledge</h1>
  <p>Six multiple-choice questions on the brain, the heart and the mind. Your answers are not saved.</p>
</div></div>
<section class="block"><div class="wrap"><div class="quiz" id="quiz"><noscript><p>The quiz needs JavaScript. Please turn it on and reload.</p></noscript></div></div></section>`,
}))

/* ===== Pages for the formats in the HealthBridge skill. Only pages with real content, plus two "coming soon". ===== */
const head = (title, lead) => `<div class="page-head"><div class="wrap">
  <a class="back" href="library.html">${I.arrow}Library</a>
  <h1>${title}</h1>
  <p>${lead}</p>
</div></div>`

/* Library: where everything beyond the articles lives */
write('library.html', page({
  current: 'library.html',
  title: 'Library | Project HealthBridge',
  desc: 'Papers, the weekly myth and quiz, interviews, guest posts, a reading list and a glossary from Project HealthBridge.',
  body: `
<div class="page-head"><div class="wrap">
  <a class="back" href="index.html">${I.arrow}Home</a>
  <h1>Library</h1>
  <p>Everything we publish beyond the articles, in one place.</p>
</div></div>
<section class="block"><div class="wrap">
  <div class="index">
    <a class="item" href="papers.html">${I.doc}<div><h3>Papers</h3><p>Research papers and literature reviews.</p></div></a>
    <a class="item" href="weekly.html">${I.check}<div><h3>Weekly</h3><p>Brain Myth of the Week and the weekly quiz, with every answer.</p><span class="status">Coming soon</span></div></a>
    <a class="item" href="interviews.html">${I.people}<div><h3>Interviews</h3><p>Conversations with the people who work in health.</p><span class="status">Coming soon</span></div></a>
    <a class="item" href="guest-posts.html">${I.doc}<div><h3>Guest posts</h3><p>Write for HealthBridge.</p></div></a>
    <a class="item" href="reading-list.html">${I.doc}<div><h3>Reading list</h3><p>The sources behind our papers.</p></div></a>
    <a class="item" href="glossary.html">${I.bolt}<div><h3>Glossary</h3><p>Brain, heart and mind terms in plain language, A to Z.</p></div></a>
    <a class="item" href="articles.html">${I.doc}<div><h3>Articles</h3><p>Everything we have written on Substack.</p></div></a>
    <a class="item" href="experiments.html">${I.flask}<div><h3>Experiments</h3><p>The experiments we are planning.</p></div></a>
  </div>
  <p class="note" style="margin-top:2rem">Planned for later: Case of the Month and Talks. They will get their own pages when there is something to show.</p>
</div></section>`,
}))

/* Papers: the literature review now (read from the Substack feed), the Gage case study later */
write('papers.html', page({
  current: 'library.html',
  title: 'Papers | Project HealthBridge',
  desc: 'Research papers and literature reviews from Project HealthBridge.',
  body: `${head('Papers', 'Research papers and literature reviews. Each one opens on our Substack.')}
<section class="block"><div class="wrap">
  <ul class="rows" data-articles data-kind="Literature review"></ul>
  <p class="note" style="margin-top:1.25rem">The sources behind each paper are on the <a class="link" href="reading-list.html">reading list</a>.</p>
  <div class="coming" style="margin-top:3rem"><span class="status">Coming later</span><h2>A case study on Phineas Gage</h2><p>It will be added here when it is finished.</p></div>
</div></section>`,
}))

/* Weekly: the archive. Empty until the first entry is added to data/weekly.js */
write('weekly.html', page({
  current: 'library.html',
  title: 'Weekly | Project HealthBridge',
  desc: 'Brain Myth of the Week and the weekly quiz from Project HealthBridge, with every answer.',
  body: `${head('Weekly', 'Brain Myth of the Week and the weekly quiz. One myth, two sources, plain language.')}
<section class="block"><div class="wrap">
  <div data-weekly></div>
  <div class="coming" data-weekly-empty><span class="status">Coming soon</span><h2>The first Brain Myth of the Week is on its way</h2><p>Each week we take one myth about the brain, check it against the research, and post the answer with a short quiz. Every past week will be kept here.</p><p><a class="link" href="quiz.html">Try the quiz in the meantime ${I.arrow}</a></p></div>
</div></section>`,
}))

/* Interviews: the second and last "coming soon" page */
write('interviews.html', page({
  current: 'library.html',
  title: 'Interviews | Project HealthBridge',
  desc: 'Conversations with doctors, nurses, public health officials and medical students, from Project HealthBridge.',
  body: `${head('Interviews', 'Conversations with the people who work in health.')}
<section class="block"><div class="wrap">
  <div class="coming"><span class="status">Coming soon</span><h2>Our first interviews are being arranged</h2><p>We want to hear from doctors, nurses and public health officials, and from medical students and residents sharing frontline perspectives.</p><p><a class="link" href="guest-posts.html">Know someone we should talk to, or want to write for us? ${I.arrow}</a></p></div>
</div></section>`,
}))

/* Guest posts: a short "write for us" note (a draft for the founders to edit) */
write('guest-posts.html', page({
  current: 'library.html',
  title: 'Guest posts | Project HealthBridge',
  desc: 'Write for Project HealthBridge: how to send us an idea for a guest post.',
  body: `${head('Guest posts', 'Have something to say about the brain, the heart or the mind?')}
<section class="block"><div class="wrap">
  <div class="write-note">
    <h2>Write for us</h2>
    <p>Send us an email with your idea: a working title and two or three sentences about what you would write and why it matters to teenagers.</p>
    <p>Posts are written by you, in your own words, with your sources listed. We do not publish medical advice.</p>
    <p><a class="btn btn-primary" href="${gmail('Guest post idea')}" target="_blank" rel="noopener">Email your idea</a></p>
    <p class="note">${EMAIL}</p>
  </div>
</div></section>`,
}))

/* Reading list: the real references from the false-memory literature review */
const ref = (authors, year, title, journal, rest, doi) => `<li>${authors} (${year}). ${title} <i>${journal}</i>${rest}${doi ? ` <a href="https://doi.org/${doi}" target="_blank" rel="noopener">https://doi.org/${doi}</a>` : ''}</li>`
write('reading-list.html', page({
  current: 'library.html',
  title: 'Reading list | Project HealthBridge',
  desc: 'The sources behind the Project HealthBridge literature review on false memories.',
  body: `${head('Reading list', 'The sources behind our papers, so you can read them yourself.')}
<section class="block"><div class="wrap">
  <div class="head"><h2>False memory</h2><p>From the literature review “Who Forms False Memories, and Why”.</p></div>
  <ul class="refs">
    ${ref('Brassil, M., O\'Mahony, C., &amp; Greene, C. M.', 2024, 'Do cognitive abilities reduce eyewitness susceptibility to the misinformation effect? A systematic review.', 'Psychonomic Bulletin &amp; Review, 31', '(6), 2410-2436.', '10.3758/s13423-024-02512-5')}
    ${ref('Huan, S.-Y., Otgaar, H., Howe, M., Liu, Y.-R., Xu, H.-Z., Wang, J., &amp; Yu, J.', 2026, 'A meta-analysis of false memory in healthy and pathological cognitive aging.', 'Psychology and Aging, 41', '(4), 497-524.', '10.1037/pag0000966')}
    ${ref('Loftus, E. F.', 2005, 'Planting misinformation in the human mind: A 30-year investigation of the malleability of memory.', 'Learning &amp; Memory, 12', '(4), 361-366.', '10.1101/lm.94705')}
    ${ref('Loftus, E. F., &amp; Palmer, J. C.', 1974, 'Reconstruction of automobile destruction: An example of the interaction between language and memory.', 'Journal of Verbal Learning and Verbal Behavior, 13', '(5), 585-589.', '')}
    ${ref('Patihis, L., Frenda, S. J., &amp; Loftus, E. F.', 2018, 'False memory tasks do not reliably predict other false memories.', 'Psychology of Consciousness: Theory, Research, and Practice, 5', '(2), 140-160.', '')}
    ${ref('Roediger, H. L., III, &amp; McDermott, K. B.', 1995, 'Creating false memories: Remembering words not presented in lists.', 'Journal of Experimental Psychology: Learning, Memory, and Cognition, 21', '(4), 803-814.', '')}
    ${ref('Schincariol, A., Otgaar, H., Greene, C. M., Murphy, G., Riesthuis, P., Mangiulli, I., &amp; Battista, F.', 2024, 'Fake memories: A meta-analysis on the effect of fake news on the creation of false memories and false beliefs.', 'Memory, Mind &amp; Media, 3', ', Article e17.', '10.1017/mem.2024.14')}
  </ul>
  <p class="note" style="margin-top:1.5rem">More sources are added as we publish.</p>
</div></section>`,
}))

/* Glossary: filled from js/data.js */
write('glossary.html', page({
  current: 'library.html',
  title: 'Glossary | Project HealthBridge',
  desc: 'Brain, heart and mind terms in plain language, A to Z.',
  body: `${head('Glossary', 'Brain, heart and mind terms in plain language.')}
<section class="block"><div class="wrap">
  <div class="tabs" data-gloss-tabs role="group" aria-label="Filter by category">
    <button class="tab" type="button" data-cat="All" aria-pressed="true">All terms</button>
    <button class="tab" type="button" data-cat="Neurology" aria-pressed="false">Neurology</button>
    <button class="tab" type="button" data-cat="Cardiology" aria-pressed="false">Cardiology</button>
    <button class="tab" type="button" data-cat="Psychology" aria-pressed="false">Psychology</button>
  </div>
  <div class="search"><label for="gloss-search">Search the glossary</label><input id="gloss-search" type="search" autocomplete="off"></div>
  <p class="note" id="gloss-count" role="status" aria-live="polite"></p>
  <dl class="gloss" data-glossary></dl>
</div></section>`,
}))

/* About: how we work, in the founders' own words from the Blueprint */
write('about.html', page({
  current: 'about.html',
  title: 'About | Project HealthBridge',
  desc: 'HealthBridge is a student-led innovation lab exploring how the brain, behavior, and heart shape human health.',
  body: `
<div class="page-head"><div class="wrap">
  <a class="back" href="index.html">${I.arrow}Home</a>
  <h1>About HealthBridge</h1>
  <p>A student-led innovation lab turning ideas into action.</p>
</div></div>
<section class="block"><div class="wrap">
  <div class="prose">
    <p>HealthBridge explores how the brain, behavior, and heart shape human health, then tests, builds, and shares real-world insights. We are dedicated to improving health literacy and combating medical misinformation among teenagers.</p>
  </div>
  <div class="head" style="margin-top:3rem"><h2>How we work</h2></div>
  <div class="principles">
    <div><h3>Evidence-based everything</h3><p>Every project starts with research. Every decision backed by data. Every outcome is measured. We apply science to do social good.</p></div>
    <div><h3>Experiment-first approach</h3><p>We test small before scaling big. We focus on results, not only ideas.</p></div>
    <div><h3>Public documentation</h3><p>Everything we learn, we share. Research papers publicly available. Experiment results documented. Failed projects analyzed openly. Other students can learn from our mistakes and replicate our successes.</p></div>
  </div>
  <div class="head" style="margin-top:4rem"><h2>Who is behind it</h2></div>
  <p>Anirudh Shukla and Aditya Katakam are the co-founders. <a class="link" href="index.html#founders-title">Meet our founders ${I.arrow}</a></p>
  <p>Our writing lives on <a class="link" href="${SUBSTACK}" target="_blank" rel="noopener">Substack ${I.ext}</a>. Want to write for us? <a class="link" href="guest-posts.html">Read how ${I.arrow}</a></p>
</div></section>
<section class="band" aria-labelledby="join-title">
  <div class="wrap">
    <h2 id="join-title">Join us</h2>
    <p>Follow HealthBridge where you already spend your time.</p>
    ${joinButtons(true)}
  </div>
</section>`,
}))

/* ---------- Credits ---------- */
write('credits.html', page({
  current: '',
  title: 'Credits | Project HealthBridge',
  desc: 'Where the 3D models, fonts and code on this site come from.',
  body: `
<div class="page-head"><div class="wrap">
  <a class="back" href="index.html">${I.arrow}Home</a>
  <h1>Credits</h1>
  <p>The work of other people that this site stands on.</p>
</div></div>
<section class="block"><div class="wrap"><div class="prose">
  <h2>3D brain and heart</h2>
  <p>BodyParts3D, © The Database Center for Life Science, licensed under <a class="link" href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noopener">CC Attribution-Share Alike 2.1 Japan</a>. Source: <a class="link" href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noopener">dbarchive.biosciencedbc.jp</a>.</p>
  <p>We changed the original data: parts were merged, trimmed to the area around the heart where needed, smoothed, recoloured and stored in a compact format. The amygdala is a simplified almond shape placed at the front of the hippocampus, because BodyParts3D has no amygdala. The adapted model files are shared under the same licence.</p>
  <p>The database's own licence page names CC Attribution 4.0, while the files carry the Share-Alike 2.1 Japan notice. We follow the stricter one.</p>
  <h2>Code and type</h2>
  <p>3D drawing: <a class="link" href="https://threejs.org" target="_blank" rel="noopener">three.js</a> (MIT licence), saved on this site. Headlines are set in Newsreader and text in Instrument Sans, both open-source fonts (SIL Open Font Licence) served by Google Fonts.</p>
  <h2>Pictures</h2>
  <p>The logo and Pablo the skeleton belong to Project HealthBridge.</p>
</div></div></section>`,
}))

/* ---------- 404 ---------- */
write('404.html', page({
  current: '', scripts: ['js/app.js'], noPrompt: true,
  title: 'Page not found | Project HealthBridge', desc: 'That page does not exist.',
  body: `<div class="page-head"><div class="wrap"><h1>Page not found</h1><p>That page does not exist, or it has moved.</p><p style="margin-top:1.5rem"><a class="btn btn-primary" href="index.html">Back to the home page</a></p></div></div>`,
}))
console.log('pages written')
