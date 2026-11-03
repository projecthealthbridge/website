/* Page behaviour: the mobile menu, article lists, the BMI check, the quiz and the contact form.
   Everything runs in the browser; nothing is sent anywhere or saved. */
;(function () {
  'use strict'
  var data = window.HB_DATA || {}

  /* Refreshing a page starts again at the top, instead of where the visitor had scrolled to or at an old #section. */
  try {
    var navEntry = performance.getEntriesByType('navigation')[0]
    if (navEntry && navEntry.type === 'reload') {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
      if (location.hash) history.replaceState(null, '', location.pathname + location.search)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  } catch (err) { /* older browsers just keep their own behaviour */ }

  /* Arriving on a link such as index.html#join: the page keeps growing and shrinking while it loads (articles, the 3D
     models), which left the visitor far from the section. Put the section back under the header a few times while the
     page settles, and stop at once if the visitor scrolls themselves. */
  if (location.hash.length > 1) {
    var hashTarget = null
    try { hashTarget = document.getElementById(decodeURIComponent(location.hash.slice(1))) } catch (err) { /* not a valid id */ }
    if (hashTarget) {
      var hashDone = false
      var stopHash = function () { hashDone = true }
      ;['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (n) { window.addEventListener(n, stopHash, { passive: true, once: true }) })
      var realign = function () { if (!hashDone) hashTarget.scrollIntoView({ behavior: 'instant', block: 'start' }) }
      window.addEventListener('load', realign)
      ;[300, 900, 1800, 3000].forEach(function (ms) { setTimeout(function () { realign(); if (ms === 3000) hashDone = true }, ms) })
    }
  }
  var Health = window.Health

  function el(tag, attrs, children) {
    var node = document.createElement(tag)
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k]
      else if (k === 'text') node.textContent = attrs[k]
      else node.setAttribute(k, attrs[k])
    })
    ;(children || []).forEach(function (c) { node.appendChild(c) })
    return node
  }

  /* Motion helpers. All of it is skipped for people who ask for reduced motion. */
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  // Play a CSS animation class again, even if it was already on the element.
  function retrigger(node, cls) {
    if (calm || !node) return
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  // Count a number up from zero. `render(n)` returns the text for the current value; `final` is the
  // exact text it ends on, so the finished page never depends on the animation being accurate.
  function countUp(to, render, apply, final, ms, delay) {
    if (calm) { apply(final); return }
    var start = null
    function frame(t) {
      if (start === null) start = t
      var p = Math.min(1, Math.max(0, (t - start - delay) / ms))
      var eased = 1 - Math.pow(1 - p, 3)
      apply(p >= 1 ? final : render(to * eased))
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }

  /* Mobile menu */
  var menuBtn = document.querySelector('.menu-btn')
  var nav = document.getElementById('site-nav')
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open')
      menuBtn.setAttribute('aria-expanded', String(open))
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus() }
    })
  }

  /* Articles come from data/articles.js, which tools/update-articles.mjs rewrites from the Substack
     feed, so new posts appear without anyone editing the site. <ul data-articles data-category="Neurology" data-limit="3"> */
  var feed = window.HB_ARTICLES || { articles: [] }
  var ARROW = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'

  function niceDate(iso) {
    var d = new Date(iso + 'T00:00:00')
    return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  var summaries = window.HB_SUMMARIES || {}

  function articleRow(a) {
    var title = el('span', { class: 'row-title', text: a.title })
    var by = el('span', { class: 'row-by', text: a.kind ? a.author + ', ' + a.kind.toLowerCase() : a.author })
    var blurb = summaries[(a.url.match(/\/p\/([^/?#]+)/) || [])[1]]
    var link = el('a', { class: 'row', href: a.url, target: '_blank', rel: 'noopener' }, [
      el('time', { datetime: a.date, text: niceDate(a.date) }),
      el('span', {}, blurb ? [title, el('span', { class: 'row-sum', text: blurb }), by] : [title, by]),
      el('span', { class: 'row-cat', text: a.category }),
    ])
    link.insertAdjacentHTML('beforeend', ARROW)
    var li = el('li')
    li.appendChild(link)
    return li
  }

  function renderArticles(box, category, limit, kind) {
    var list = feed.articles.filter(function (a) { return (!category || category === 'All' || a.category === category) && (!kind || a.kind === kind) })
    if (limit) list = list.slice(0, limit)
    box.textContent = ''
    if (list.length === 0) {
      var li = el('li', { class: 'empty' })
      li.appendChild(document.createTextNode(feed.articles.length ? 'Nothing here yet. ' : 'The list could not load. '))
      li.appendChild(el('a', { class: 'link', href: 'https://projecthealthbridge.substack.com/', target: '_blank', rel: 'noopener', text: 'Read everything on our Substack' }))
      box.appendChild(li)
      return
    }
    list.forEach(function (a) { box.appendChild(articleRow(a)) })
  }

  document.querySelectorAll('[data-updated]').forEach(function (n) {
    if (feed.updated) n.textContent = 'List checked against our Substack on ' + niceDate(feed.updated.slice(0, 10)) + '. New posts are added automatically.'
  })

  document.querySelectorAll('[data-articles]').forEach(function (box) {
    var limit = Number(box.getAttribute('data-limit')) || 0
    var fixed = box.getAttribute('data-category')
    renderArticles(box, fixed, limit, box.getAttribute('data-kind'))
    var filters = document.querySelector('[data-filters]')
    if (filters && !fixed) {
      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-cat]')
        if (!btn) return
        filters.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)) })
        renderArticles(box, btn.getAttribute('data-cat'), limit)
        retrigger(box, 'swap')
      })
    }
  })

  /* Weekly archive: entries come from data/weekly.js. With none yet, the "coming soon" note shows. */
  document.querySelectorAll('[data-weekly]').forEach(function (box) {
    var entries = ((window.HB_WEEKLY || {}).entries || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date) })
    var soon = document.querySelector('[data-weekly-empty]')
    if (entries.length === 0) { box.hidden = true; return }
    if (soon) soon.hidden = true
    entries.forEach(function (w) {
      var inside = [el('p', { class: 'verdict', text: w.verdict + '. ' + w.explanation })]
      if (w.sources && w.sources.length) {
        var ul = el('ul', { class: 'list' })
        w.sources.forEach(function (s) { var li = el('li'); li.appendChild(el('a', { class: 'link', href: s.url, target: '_blank', rel: 'noopener', text: s.label })); ul.appendChild(li) })
        inside.push(el('h3', { text: 'Sources' }), ul)
      }
      if (w.quiz && w.quiz.length) {
        inside.push(el('h3', { text: 'Quiz answers' }))
        w.quiz.forEach(function (q) { inside.push(el('p', { text: q.q + ' ' + q.options[q.answer] + '.' })) })
      }
      var details = el('details', {}, [el('summary', { text: 'Show the answer' })].concat(inside))
      box.appendChild(el('article', { class: 'weekly' }, [el('time', { datetime: w.date, text: niceDate(w.date) }), el('h2', { text: w.title })].concat(w.author ? [el('p', { class: 'row-by', text: 'By ' + w.author })] : [], [el('p', { text: 'The claim: ' + w.claim }), details])))
    })
  })

  /* Glossary: A to Z, with a search box and category tabs. */
  var gloss = document.querySelector('[data-glossary]')
  if (gloss) {
    var terms = (data.GLOSSARY || []).slice().sort(function (a, b) { return a.term.localeCompare(b.term) })
    var search = document.getElementById('gloss-search')
    var tabs = document.querySelector('[data-gloss-tabs]')
    var cat = 'All'
    var status = document.getElementById('gloss-count')
    function drawGlossary() {
      var q = search.value.trim().toLowerCase()
      var shown = terms.filter(function (t) { return (cat === 'All' || t.category === cat) && (!q || t.term.toLowerCase().indexOf(q) >= 0 || t.definition.toLowerCase().indexOf(q) >= 0) })
      gloss.textContent = ''
      shown.forEach(function (t) {
        gloss.appendChild(el('div', { class: 'gloss-item' }, [el('dt', { text: t.term }), el('dd', {}, [el('span', { class: 'cat', text: t.category }), document.createTextNode(t.definition)])]))
      })
      status.textContent = shown.length ? shown.length + (shown.length === 1 ? ' term' : ' terms') : 'No terms match. Try fewer letters.'
    }
    search.addEventListener('input', drawGlossary)
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]'); if (!b) return
      cat = b.getAttribute('data-cat')
      tabs.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)) })
      drawGlossary()
    })
    drawGlossary()
  }

  /* Topic lists on the category pages. <ul data-topics="Neurology"> */
  document.querySelectorAll('[data-topics]').forEach(function (ul) {
    ;(data.TOPICS[ul.getAttribute('data-topics')] || []).forEach(function (t) { ul.appendChild(el('li', { text: t })) })
  })

  /* BMI check */
  var bmiForm = document.getElementById('bmi-form')
  if (bmiForm) {
    var out = document.getElementById('bmi-result')
    bmiForm.addEventListener('submit', function (e) {
      e.preventDefault()
      var r = Health.bmi(bmiForm.height.value, bmiForm.weight.value, bmiForm.age.value)
      out.textContent = ''
      out.className = 'result'
      retrigger(out, 'rise')
      if (!r.ok) { out.className = 'result err'; out.textContent = r.error; return }
      out.appendChild(el('div', { class: 'big', text: String(r.bmi) }))
      out.appendChild(el('p', { text: 'Your BMI (kg/m²)' }))
      if (r.adult) {
        out.appendChild(el('p', { text: 'Adult range: ' + r.band, style: 'font-weight:600;margin-bottom:.4rem' }))
        out.appendChild(el('p', { class: 'note', text: 'These are the standard World Health Organization ranges. For people of Asian descent, health bodies use lower cut-offs (overweight from about 23), so ask a doctor what is right for you.' }))
      } else {
        out.appendChild(el('p', { class: 'note', text: 'Under 18, a BMI number only means something when compared with growth charts for your age and sex, so this tool does not give a range. A doctor or school nurse can plot it for you.' }))
      }
    })
  }

  /* Founders: each can add a line in their own words in data/founders.js; nothing shows while it is empty. */
  var why = window.FOUNDER_WHY || {}
  document.querySelectorAll('[data-why]').forEach(function (p) {
    var t = String(why[p.getAttribute('data-why')] || '').trim()
    if (t) { p.textContent = t; p.hidden = false }
  })

  /* Knowledge in Motion: hidden until the first video is out (data/site.js, videos.live). */
  var videos = (window.HB_SITE && window.HB_SITE.videos) || {}
  if (videos.live) {
    var pab = document.getElementById('pablo')
    if (pab) {
      pab.hidden = false
      if (videos.url) {
        var pt = pab.querySelector('blockquote')
        if (pt) { var wl = document.createElement('p'); var wa = document.createElement('a'); wa.className = 'btn btn-primary'; wa.href = videos.url; wa.target = '_blank'; wa.rel = 'noopener'; wa.textContent = 'Watch our videos'; wl.appendChild(wa); pt.parentNode.appendChild(wl) }
      }
    }
    var vcard = document.querySelector('[data-videos-card]')
    if (vcard) {
      var va = document.createElement('a'); va.className = 'item'; va.href = videos.url || '#pablo-title'
      if (videos.url) { va.target = '_blank'; va.rel = 'noopener' }
      va.innerHTML = vcard.innerHTML
      var vs = va.querySelector('.status'); if (vs) vs.remove()
      vcard.replaceWith(va)
    }
  }

  /* Contact form: sent straight to the HealthBridge inbox through Web3Forms, and the visitor stays on the page. If sending fails,
     the message is kept in the form and the email address is shown instead. */
  var contact = document.getElementById('contact-form')
  if (contact) {
    var status = contact.querySelector('[data-status]')
    var send = contact.querySelector('button[type="submit"]')
    var say = function (text, bad) { status.textContent = text; status.hidden = false; status.classList.toggle('bad', !!bad) }
    contact.addEventListener('submit', function (e) {
      e.preventDefault()
      if (contact.botcheck && contact.botcheck.checked) return // a bot filled the hidden box
      var name = (contact.first.value + ' ' + contact.last.value).trim()
      send.disabled = true
      say('Sending...')
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: contact.getAttribute('data-key'),
          subject: 'Message from ' + name + ' via the HealthBridge site',
          from_name: 'HealthBridge website',
          name: name,
          email: contact.email.value,
          message: contact.message.value,
          botcheck: ''
        })
      }).then(function (r) { return r.json() }).then(function (res) {
        if (!res.success) throw new Error(res.message || 'failed')
        contact.reset()
        say('Thank you, your message is on its way. We reply within 24-48 hours.')
      }).catch(function () {
        say('Sorry, that did not send. Your message is still here. Try again, or email us at ' + contact.getAttribute('data-to') + '.', true)
      }).then(function () { send.disabled = false })
    })
  }

  /* Quiz: one question at a time, answer shown straight away. */
  var quiz = document.getElementById('quiz')
  if (quiz) {
    var questions = data.QUIZ
    var picks = []
    var index = 0

    function show() {
      quiz.textContent = ''
      if (index >= questions.length) return finish()
      var q = questions[index]
      var bar = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(questions.length), 'aria-valuenow': String(index) }, [el('span', { style: 'width:' + Math.round((index / questions.length) * 100) + '%' })])
      var live = el('p', { class: 'note', role: 'status', 'aria-live': 'polite' })
      var next = el('button', { type: 'button', class: 'btn btn-primary', text: index === questions.length - 1 ? 'See my score' : 'Next question', hidden: '' })
      var options = el('div', { class: 'options' })
      q.options.forEach(function (text, i) {
        var b = el('button', { type: 'button', class: 'option', style: '--i:' + i }, [el('span', { text: text })])
        b.addEventListener('click', function () {
          picks[index] = i
          options.querySelectorAll('button').forEach(function (o, j) {
            o.disabled = true
            if (j === q.answer) { o.classList.add('right'); o.appendChild(el('span', { class: 'small', text: 'Correct answer' })) }
            else if (j === i) { o.classList.add('wrong'); o.appendChild(el('span', { class: 'small', text: 'Your answer' })) }
          })
          live.textContent = i === q.answer ? 'Correct.' : 'Not quite. The right answer is ' + q.options[q.answer] + '.'
          next.hidden = false
          next.focus()
        })
        options.appendChild(b)
      })
      next.addEventListener('click', function () { index++; show() })
      quiz.appendChild(bar)
      quiz.appendChild(el('div', { class: 'q-meta' }, [el('span', { text: 'Question ' + (index + 1) + ' of ' + questions.length }), el('span', { text: q.topic }), el('span', { text: q.level })]))
      quiz.appendChild(el('h2', { text: q.q }))
      quiz.appendChild(options)
      quiz.appendChild(live)
      quiz.appendChild(next)
    }

    function finish() {
      var score = Health.scoreQuiz(questions, picks)
      var again = el('button', { type: 'button', class: 'btn btn-primary', text: 'Try again' })
      again.addEventListener('click', function () { picks = []; index = 0; show() })
      quiz.appendChild(el('div', { class: 'result-box' }, [
        el('h2', { text: 'Your score' }),
        el('div', { class: 'score-big', text: score + ' / ' + questions.length }),
        el('p', { text: Health.verdict(score, questions.length), style: 'margin:1rem 0 1.5rem' }),
        again,
      ]))
      quiz.querySelector('.result-box').setAttribute('tabindex', '-1')
      quiz.querySelector('.result-box').focus()
      var big = quiz.querySelector('.score-big')
      countUp(score, function (n) { return Math.round(n) + ' / ' + questions.length }, function (t) { big.textContent = t }, score + ' / ' + questions.length, 900, 250)
    }
    show()
  }

  /* The 3D brain and the 3D heart, side by side. The list works on its own; the 3D view (js/anatomy.js and a
     saved copy of Three.js) is only fetched when this part of the page is about to be seen. */
  document.querySelectorAll('[data-anatomy]').forEach(function (anat) {
    if (!('IntersectionObserver' in window)) return
    var anatIO = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return
      anatIO.disconnect()
      anat.setAttribute('data-loading', '')
      import('./anatomy.js').then(function (m) { return m.init(anat) }).catch(function (err) {
        anat.removeAttribute('data-loading')
        anat.setAttribute('data-failed', '')
        if (window.console) console.warn('3D view unavailable:', err && err.message)
      })
    }, { rootMargin: '500px' })
    anatIO.observe(anat)
  })

  /* Substack sign-up form: Substack's own form, loaded only when someone asks for it. Without JavaScript the
     button is just a link to Substack's subscribe page. */
  document.querySelectorAll('[data-signup-open]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      var promo = document.querySelector('.prompt') // someone already signing up does not need the "Follow along" card on top
      if (promo) promo.remove()
      try { sessionStorage.setItem('hb-join-shown', '1') } catch (err) { /* fine */ }
      var box = btn.closest('[data-signup-box]')
      var frame = document.createElement('iframe')
      frame.src = 'https://projecthealthbridge.substack.com/embed'
      frame.title = 'Subscribe to the HealthBridge newsletter on Substack'
      frame.className = 'signup-frame'
      frame.setAttribute('loading', 'lazy')
      box.textContent = ''
      box.appendChild(frame)
      box.appendChild(el('p', { class: 'note', text: 'This form is run by Substack, not by us.' }))
    })
  })

  /* Visit counter: off unless data/site.js has a GoatCounter code (see that file). */
  var site = window.HB_SITE || {}
  if (Health && Health.shouldCount && Health.shouldCount(site.goatcounter, { doNotTrack: navigator.doNotTrack, protocol: location.protocol, hostname: location.hostname })) {
    var counter = document.createElement('script')
    counter.async = true
    counter.src = 'https://gc.zgo.at/count.js'
    counter.setAttribute('data-goatcounter', 'https://' + site.goatcounter + '.goatcounter.com/count')
    document.head.appendChild(counter)
    var legal = document.querySelector('.legal')
    if (legal) legal.appendChild(el('p', { text: 'We count visits with GoatCounter, which sets no cookies and keeps no personal data.' }))
  }

  /* ---------- Motion ---------- */

  // A soft shadow under the header once the page has moved.
  var header = document.querySelector('.site-header')
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8) }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  // Slide-ins: only things below the fold are hidden, so nothing flashes at load. Each one rises once,
  // as it arrives, a beat after its neighbours.
  var REVEAL = ['.head', '.vital', '.discipline', '.rows > li', '.item', '.pablo > *', '.founder', '.panel', '.principles > div', '.concepts > div', '.coming', '.callout', '.mission', '.band .wrap > *', '.write-note', '.weekly', '.refs > li', '.trace-labels'].join(',')
  if (!calm && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target) } })
    }, { rootMargin: '0px 0px -8% 0px' })
    var groups = new Map()
    document.querySelectorAll(REVEAL).forEach(function (node) {
      if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return // already on screen
      var n = groups.get(node.parentNode) || 0
      groups.set(node.parentNode, n + 1)
      node.style.setProperty('--d', Math.min(n * 80, 320) + 'ms')
      node.classList.add('reveal')
      seen.observe(node)
    })
  }

  // The vital signs count up when they come into view.
  var vitals = document.querySelector('.vitals')
  if (vitals && !calm) {
    var items = [].slice.call(vitals.querySelectorAll('.vital b')).map(function (b) {
      var node = b.firstChild
      var m = node && node.nodeType === 3 && node.nodeValue.match(/^([\d,]*\.?\d+)(%?)(\s*)$/)
      if (!m) return null
      var decimals = (m[1].split('.')[1] || '').length
      return { node: node, final: node.nodeValue, to: parseFloat(m[1].replace(/,/g, '')), decimals: decimals, group: m[1].indexOf(',') >= 0, suffix: m[2] + m[3] }
    }).filter(Boolean)
    var run = function () {
      items.forEach(function (it, i) {
        countUp(it.to, function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: it.decimals, maximumFractionDigits: it.decimals, useGrouping: it.group }) + it.suffix }, function (t) { it.node.nodeValue = t }, it.final, 1300, i * 120)
      })
    }
    if ('IntersectionObserver' in window && vitals.getBoundingClientRect().top > window.innerHeight * 0.85) {
      items.forEach(function (it) { it.node.nodeValue = '0' + it.suffix }) // start at zero only if it will really play
      var vio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { vio.disconnect(); run() } }, { rootMargin: '0px 0px -15% 0px' })
      vio.observe(vitals)
    } else run()
  }

  // The join prompt: once per visit, after you have read part of a page, never after you close it
  // (for two weeks), and never on the quiz or the 404 page.
  var KEY = 'hb-join-closed'
  function remembered() { try { var t = Number(localStorage.getItem(KEY)); return t && Date.now() - t < 14 * 864e5 } catch (e) { return false } }
  function shownThisVisit() { try { return sessionStorage.getItem('hb-join-shown') === '1' } catch (e) { return false } }
  if (!document.body.hasAttribute('data-no-prompt') && !remembered() && !shownThisVisit()) {
    var armed = true
    var openPrompt = function () {
      if (!armed || document.querySelector('.prompt')) return
      armed = false
      window.removeEventListener('scroll', check)
      try { sessionStorage.setItem('hb-join-shown', '1') } catch (e) { /* fine */ }
      var box = el('aside', { class: 'prompt', role: 'region', 'aria-label': 'Join us' })
      box.innerHTML = '<button type="button" class="x" aria-label="Close"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
        '<h2>Follow along</h2><p>New articles go up on our Substack first.</p>' +
        '<a class="btn btn-primary" href="https://projecthealthbridge.substack.com/subscribe?simple=true" target="_blank" rel="noopener">Join us on Substack</a>'
      document.body.appendChild(box)
      void box.offsetWidth
      box.classList.add('show')
      var close = function () {
        try { localStorage.setItem(KEY, String(Date.now())) } catch (e) { /* fine */ }
        box.classList.remove('show')
        setTimeout(function () { box.remove() }, calm ? 0 : 700)
        document.removeEventListener('keydown', onKey)
      }
      var onKey = function (e) { if (e.key === 'Escape') close() }
      box.querySelector('.x').addEventListener('click', close)
      document.addEventListener('keydown', onKey)
    }
    var check = function () {
      var room = document.documentElement.scrollHeight - window.innerHeight
      var join = document.getElementById('join')
      var onJoin = join && join.getBoundingClientRect().top < window.innerHeight && join.getBoundingClientRect().bottom > 0
      if (room > 400 && window.scrollY / room > 0.4 && !onJoin) openPrompt()
    }
    window.addEventListener('scroll', check, { passive: true })
    setTimeout(function () { var join = document.getElementById('join'); if (!(join && join.getBoundingClientRect().top < window.innerHeight && join.getBoundingClientRect().bottom > 0)) openPrompt() }, 25000)
  }
})()
