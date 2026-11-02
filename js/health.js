/* BMI and quiz scoring. No page code in here, so it can be tested on its own. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.Health = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  var LIMITS = { height: [50, 250], weight: [10, 300], age: [2, 120] }

  // Adult cut-offs from the World Health Organization. Under 18 the same number means something
  // different (it has to be read against growth charts for age and sex), so no band is given.
  function band(value) {
    if (value < 18.5) return 'Underweight'
    if (value < 25) return 'Healthy weight'
    if (value < 30) return 'Overweight'
    return 'Obesity'
  }

  function bmi(heightCm, weightKg, ageYears) {
    var h = Number(heightCm), w = Number(weightKg), a = Number(ageYears)
    if (![h, w, a].every(isFinite) || heightCm === '' || weightKg === '' || ageYears === '') {
      return { ok: false, error: 'Please fill in your height, weight and age.' }
    }
    if (h < LIMITS.height[0] || h > LIMITS.height[1]) return { ok: false, error: 'Height should be between ' + LIMITS.height[0] + ' and ' + LIMITS.height[1] + ' cm.' }
    if (w < LIMITS.weight[0] || w > LIMITS.weight[1]) return { ok: false, error: 'Weight should be between ' + LIMITS.weight[0] + ' and ' + LIMITS.weight[1] + ' kg.' }
    if (a < LIMITS.age[0] || a > LIMITS.age[1]) return { ok: false, error: 'This tool is for ages ' + LIMITS.age[0] + ' to ' + LIMITS.age[1] + '.' }
    var value = Math.round((w / Math.pow(h / 100, 2)) * 10) / 10
    var adult = a >= 18
    return { ok: true, bmi: value, adult: adult, band: adult ? band(value) : null }
  }

  // Should the visit counter run on this page? Only when a valid site code is set, never on a
  // developer's own computer or a file opened from disk, and never when the visitor says "do not track".
  function shouldCount(code, env) {
    if (typeof code !== 'string' || !/^[a-z0-9][a-z0-9-]{0,40}$/i.test(code)) return false
    if (env.doNotTrack === '1' || env.doNotTrack === 'yes') return false
    if (env.protocol === 'file:') return false
    if (/^(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(env.hostname || '') || env.hostname === '') return false
    return true
  }

  // How many answers were right. `picks[i]` is the option chosen for question i (or undefined).
  function scoreQuiz(questions, picks) {
    var score = 0
    for (var i = 0; i < questions.length; i++) if (picks[i] === questions[i].answer) score++
    return score
  }

  function verdict(score, total) {
    var share = total === 0 ? 0 : score / total
    if (share === 1) return 'Perfect score. Nicely done.'
    if (share >= 0.67) return 'Strong work. A quick look at the articles will fill the gaps.'
    if (share >= 0.34) return 'A good start. The article pages cover every question here.'
    return 'Every expert started here. Have a read, then try again.'
  }

  return { bmi: bmi, band: band, scoreQuiz: scoreQuiz, verdict: verdict, shouldCount: shouldCount }
})
