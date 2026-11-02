const test = require('node:test')
const assert = require('node:assert')
const Health = require('../js/health.js')

test('BMI is weight over height squared, to one decimal place', () => {
  const r = Health.bmi(170, 65, 30)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.bmi, 22.5)
  assert.strictEqual(r.band, 'Healthy weight')
})

test('adult ranges follow the WHO cut-offs, including the edges', () => {
  assert.strictEqual(Health.band(18.4), 'Underweight')
  assert.strictEqual(Health.band(18.5), 'Healthy weight')
  assert.strictEqual(Health.band(24.9), 'Healthy weight')
  assert.strictEqual(Health.band(25), 'Overweight')
  assert.strictEqual(Health.band(29.9), 'Overweight')
  assert.strictEqual(Health.band(30), 'Obesity')
})

test('under 18 gets a number but no range', () => {
  const r = Health.bmi(160, 50, 15)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.adult, false)
  assert.strictEqual(r.band, null)
  assert.strictEqual(Health.bmi(160, 50, 18).band, 'Healthy weight') // 18 counts as an adult
})

test('missing, silly or out-of-range input is refused with a message', () => {
  for (const args of [['', 60, 20], [170, '', 20], [170, 60, ''], ['abc', 60, 20], [20, 60, 20], [170, 5, 20], [170, 60, 1], [170, 60, 200], [300, 60, 20]]) {
    const r = Health.bmi(...args)
    assert.strictEqual(r.ok, false, JSON.stringify(args))
    assert.ok(r.error.length > 10)
  }
})

test('quiz scoring counts only right picks', () => {
  const qs = [{ answer: 2 }, { answer: 0 }, { answer: 1 }]
  assert.strictEqual(Health.scoreQuiz(qs, [2, 0, 1]), 3)
  assert.strictEqual(Health.scoreQuiz(qs, [2, 1, undefined]), 1)
  assert.strictEqual(Health.scoreQuiz(qs, []), 0)
})

test('every site quiz question has a valid answer position and four options', () => {
  global.window = {}
  require('../js/data.js')
  const quiz = global.window.HB_DATA.QUIZ
  assert.strictEqual(quiz.length, 6)
  for (const q of quiz) {
    assert.strictEqual(q.options.length, 4)
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, q.q)
  }
})

test('the visit counter only runs when it should', () => {
  const live = { doNotTrack: null, protocol: 'https:', hostname: 'projecthealthbridge.github.io' }
  assert.strictEqual(Health.shouldCount('projecthealthbridge', live), true)
  assert.strictEqual(Health.shouldCount('', live), false, 'no code, no counting')
  assert.strictEqual(Health.shouldCount(undefined, live), false)
  assert.strictEqual(Health.shouldCount('bad code!', live), false, 'a code with odd characters is refused')
  assert.strictEqual(Health.shouldCount('https://evil.example/x', live), false, 'a web address is not a code')
  assert.strictEqual(Health.shouldCount('abc', { ...live, doNotTrack: '1' }), false, 'respects Do Not Track')
  for (const hostname of ['localhost', '127.0.0.1', '192.168.1.70', '10.0.0.5', '']) assert.strictEqual(Health.shouldCount('abc', { ...live, hostname }), false, hostname || '(no host)')
  assert.strictEqual(Health.shouldCount('abc', { ...live, protocol: 'file:' }), false, 'not from a file on disk')
})

test('the verdict matches the score', () => {
  assert.match(Health.verdict(6, 6), /Perfect/)
  assert.match(Health.verdict(0, 6), /started here/)
  assert.doesNotThrow(() => Health.verdict(0, 0))
})
