// Reads the HealthBridge Substack feed and writes data/articles.js, which the site loads.
//
//   npm run update
//
// A scheduled GitHub Action runs this for you (see .github/workflows/update-articles.yml), so a new
// Substack post shows up on the site by itself. Browsers are not allowed to read the Substack feed
// directly, which is why this runs on a server instead of in the page.
//
// No packages needed: Node 18 or newer.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FEED = 'https://projecthealthbridge.substack.com/feed'

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

const field = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`))
  if (!m) return ''
  return decode(m[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '')).trim()
}

const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

export const slugOf = (url) => (url.match(/\/p\/([^/?#]+)/) || [])[1] || ''

// The feed says the author is the publication ("Project HealthBridge") for every post, so the real
// author is read from the opening of the post ("By: Anirudh Shukla", "An Article by Aditya Katakam").
export function detectAuthor(openingText) {
  const people = ['Anirudh Shukla', 'Aditya Katakam']
  const found = people.filter((p) => openingText.includes(p))
  return found.length === 1 ? found[0] : found.length > 1 ? found.join(' and ') : 'Project HealthBridge'
}

// A best guess from the words in the title and summary. Pin a post to a category yourself in
// data/categories.json (slug: category) and that wins. Anything unmatched is "General".
const RULES = [
  ['Cardiology', /\b(heart|cardi\w*|arrhythm\w*|cholesterol|blood pressure|pulse|circulat\w*)\b/i],
  ['Neurology', /\b(brain|neuro\w*|sleep|stress|dopamine|sugar|glucose|cognit\w*|nervous)\b/i],
  ['Psychology', /\b(lonel\w*|memor(y|ies)|depress\w*|anxi\w*|mental|behaviou?r\w*|psycholog\w*|emotion\w*|trauma\w*|mood)\b/i],
]
export function categorise({ title, slug = '' }, overrides = {}) {
  if (overrides[slug]) return overrides[slug]
  for (const [name, re] of RULES) if (re.test(title)) return name
  return 'General'
}

export function parseFeed(xml, overrides = {}) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1])
  return items
    .map((it) => {
      const title = field(it, 'title')
      const url = field(it, 'link')
      // Substack's "description" is only the post's opening line (usually the byline), but that is
      // exactly where the author is named.
      const opening = `${field(it, 'description')} ${plain(field(it, 'content:encoded')).slice(0, 500)}`
      const slug = slugOf(url)
      const when = new Date(field(it, 'pubDate'))
      if (!title || !url || Number.isNaN(when.getTime())) return null
      const article = { title, url, date: when.toISOString().slice(0, 10), author: detectAuthor(opening), category: categorise({ title, slug }, overrides) }
      if (/^literature review\b/i.test(title)) article.kind = 'Literature review'
      return article
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export const render = (articles, now = new Date()) =>
  `/* Written by tools/update-articles.mjs from ${FEED}. Do not edit by hand: it is overwritten. */\n` +
  `window.HB_ARTICLES = ${JSON.stringify({ updated: now.toISOString(), articles }, null, 2)}\n`

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const out = path.join(root, 'data', 'articles.js')
  const overridesFile = path.join(root, 'data', 'categories.json')
  const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {}

  const res = await fetch(FEED, { headers: { 'user-agent': 'HealthBridge-site-updater' } })
  if (!res.ok) throw new Error(`Substack feed answered ${res.status}`)
  const articles = parseFeed(await res.text(), overrides)
  // Never wipe the site's list because of a bad answer: stop and leave the old file alone.
  if (articles.length === 0) throw new Error('The feed had no posts, so nothing was changed.')

  fs.mkdirSync(path.dirname(out), { recursive: true })
  // Keep the file stable when nothing changed, so the scheduled job makes no needless commits.
  const previous = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  const strip = (s) => s.replace(/"updated": "[^"]*"/, '')
  const next = render(articles)
  if (strip(previous) === strip(next)) { console.log(`No change (${articles.length} posts).`); return }
  fs.writeFileSync(out, next, 'utf8')
  console.log(`Wrote ${articles.length} posts to data/articles.js`)
  for (const a of articles) console.log(`  ${a.date}  ${a.category.padEnd(10)} ${a.author.padEnd(28)} ${a.title}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('Could not update articles:', e.message); process.exit(1) })
}
