/* The Weekly archive: MythBusters and the weekly quiz. Add the newest entry to the
   list. Every field is written by you; the page shows whatever is here, newest first.

   A finished entry looks like this (remove the // and fill it in):

   {
     date: '2026-11-11',                         // the day it was posted, year-month-day
     title: 'MythBuster: ...',
     author: 'Anirudh Shukla',                   // who wrote it (any name in data/members.js)
     topic: 'Neurology',                         // Neurology, Cardiology or Psychology (used by the topic filter)
     claim: 'The myth, as people usually say it.',
     verdict: 'Myth',                            // Myth, Fact, Partly true or Not proven (shown as a stamp, used by the verdict filter)
     points: [ 'Short point 1.', 'Short point 2.', 'Short point 3.' ],   // 2 or 3 short points (or use explanation: '...' for one paragraph)
     remember: 'The one thing to remember.',
     slides: [ 'assets/weekly/<post>/1.png', 'assets/weekly/<post>/2.png' ],   // the Instagram slides, shown as a swipeable gallery (optional)
     sources: [ { label: 'Author (year). Title.', url: 'https://doi.org/...' }, { label: '...', url: '...' } ],
     quiz: [ { q: 'A question', options: ['A', 'B', 'C', 'D'], answer: 2 } ]   // optional; answer counts from 0
   },
   Slide pictures: in the carousel maker, the MythBuster slides can be saved straight into assets/weekly/<post>/ while
   `npm start` is running (Claude does this), or download them and put them in that folder yourself.
*/
window.HB_WEEKLY = {
  entries: [
  ],
}
