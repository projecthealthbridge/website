import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { parseFeed, detectAuthor, categorise, slugOf, render, detectKind } from '../tools/update-articles.mjs'

// A small feed shaped exactly like Substack's: the author is only named in the opening line.
const item = (title, slug, date, byline, extra = '') => `<item>
  <title><![CDATA[${title}]]></title>
  <description><![CDATA[${byline}]]></description>
  <link>https://projecthealthbridge.substack.com/p/${slug}</link>
  <pubDate>${date}</pubDate>
  <content:encoded><![CDATA[<p>${byline}</p><p>${extra}Body text.</p>]]></content:encoded>
</item>`
const FEED = `<?xml version="1.0"?><rss><channel>
${item('What Stress Really Does to your Brain, Physically', 'what-stress', 'Sun, 18 Oct 2026 05:20:10 GMT', 'By: Anirudh Shukla')}
${item('More Than a Broken Heart: How Stress &amp; the Brain Talk', 'broken-heart', 'Sun, 07 Jun 2026 14:30:34 GMT', 'An Article by Aditya Katakam')}
${item('Literature Review: Who Forms False Memories, and Why', 'lit-review', 'Thu, 29 Oct 2026 09:56:47 GMT', 'Anirudh Shukla, Project Healthbridge')}
${item('Something Unrelated', 'other', 'Mon, 20 Apr 2026 12:00:00 GMT', 'Project HealthBridge')}
<item><title>No link or date</title></item>
</channel></rss>`

test('reads every real post, newest first, and skips broken items', () => {
  const list = parseFeed(FEED)
  assert.equal(list.length, 4)
  assert.deepEqual(list.map((a) => a.date), ['2026-10-29', '2026-10-18', '2026-06-07', '2026-04-20'])
})

test('decodes entities in titles', () => {
  assert.equal(parseFeed(FEED).find((a) => a.url.endsWith('broken-heart')).title, 'More Than a Broken Heart: How Stress & the Brain Talk')
})

test('finds the real author from the byline, not the publication name', () => {
  const by = Object.fromEntries(parseFeed(FEED).map((a) => [slugOf(a.url), a.author]))
  assert.equal(by['what-stress'], 'Anirudh Shukla')
  assert.equal(by['broken-heart'], 'Aditya Katakam')
  assert.equal(by['other'], 'Project HealthBridge')
  assert.equal(detectAuthor('By Anirudh Shukla and Aditya Katakam'), 'Anirudh Shukla and Aditya Katakam')
})

test('sorts new posts into categories by their title, and brain words beat mood words', () => {
  const c = (title) => categorise({ title })
  assert.equal(c('A Matter of Seconds: The Difference Between Heart Attack and Cardiac Arrest'), 'Cardiology')
  assert.equal(c('Sugar and the Brain: How Glucose Shapes Cognition and Mood'), 'Neurology')
  assert.equal(c('Why Sleep Is the Most Underrated Health Habit'), 'Neurology')
  assert.equal(c('Why Loneliness is as Deadly as Smoking'), 'Psychology')
  assert.equal(c('Literature Review: Who Forms False Memories, and Why'), 'Psychology')
  assert.equal(c('Why Vaccines Matter'), 'General')
})

test('a category set by hand always wins', () => {
  assert.equal(categorise({ title: 'Dopamine and the Depressed', slug: 'dopamine' }, { dopamine: 'Psychology' }), 'Psychology')
})

test('marks literature reviews', () => {
  assert.equal(parseFeed(FEED).find((a) => a.url.endsWith('lit-review')).kind, 'Literature review')
})

test('the file it writes loads in a browser-like page and holds the list', () => {
  const sandbox = { window: {} }
  vm.runInNewContext(render(parseFeed(FEED), new Date('2026-11-02T10:00:00Z')), sandbox)
  assert.equal(sandbox.window.HB_ARTICLES.articles.length, 4)
  assert.equal(sandbox.window.HB_ARTICLES.updated, '2026-11-02T10:00:00.000Z')
})

test('the site\'s current articles file is valid, linked to Substack, and has no duplicates', () => {
  const sandbox = { window: {} }
  vm.runInNewContext(fs.readFileSync(new URL('../data/articles.js', import.meta.url), 'utf8'), sandbox)
  const { articles } = sandbox.window.HB_ARTICLES
  assert.ok(articles.length >= 8)
  for (const a of articles) {
    assert.match(a.url, /^https:\/\/projecthealthbridge\.substack\.com\/p\/[a-z0-9-]+$/)
    assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(['Neurology', 'Cardiology', 'Psychology', 'General'].includes(a.category), a.title)
  }
  assert.equal(new Set(articles.map((a) => a.url)).size, articles.length)
})

test('recognises the kind of post from words anywhere in the title, so no exact prefix is needed', () => {
  assert.equal(detectKind('Why false memories happen: a literature review'), 'Literature review')
  assert.equal(detectKind('Sleep and memory (research paper)'), 'Literature review')
  assert.equal(detectKind('MythBuster: you only use 10 percent of your brain'), 'MythBuster')
  assert.equal(detectKind('Interview with a neurologist'), 'Interview')
  assert.equal(detectKind('Case of the month: Phineas Gage'), 'Case of the month')
  assert.equal(detectKind('What stress does to your brain'), '')
})

test('a post with a plain title is still published, just without a kind', () => {
  const list = parseFeed(FEED)
  const plain = list.find((a) => a.url.endsWith('what-stress'))
  assert.ok(plain && plain.title && plain.url && !('kind' in plain))
})

test('a kind can be pinned by hand for one post, and it is not mistaken for a category', () => {
  const pinned = parseFeed(FEED, { 'what-stress': 'Literature review' }).find((a) => a.url.endsWith('what-stress'))
  assert.equal(pinned.kind, 'Literature review')
  assert.equal(pinned.category, 'Neurology')
})