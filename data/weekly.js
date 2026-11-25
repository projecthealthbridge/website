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
    {
      date: '2026-11-25',
      title: 'MythBuster: You can multitask',
      author: 'Anirudh Shukla',
      topic: 'Psychology',
      claim: 'You can multitask.',
      verdict: 'Myth',
      points: [
        'People cannot do two demanding tasks at once. They switch back and forth, and every switch costs time and causes mistakes.',
        'Each switch costs only a few tenths of a second, but the costs add up. Psychologist David Meyer says brief mental blocks from switching can cost as much as 40 percent of productive time.',
        'People almost always take longer and make more errors when they switch between tasks than when they stay on one. Even half a second matters when a driver is on the phone.',
      ],
      remember: 'Do one demanding task at a time. Easy tasks done together, like laundry while talking to a friend, are usually fine.',
      slides: ['assets/weekly/multitasking/1.png', 'assets/weekly/multitasking/2.png', 'assets/weekly/multitasking/3.png', 'assets/weekly/multitasking/4.png', 'assets/weekly/multitasking/5.png', 'assets/weekly/multitasking/6.png', 'assets/weekly/multitasking/7.png', 'assets/weekly/multitasking/8.png'],
      sources: [
        { label: 'American Psychological Association (2006). Multitasking: Switching costs.', url: 'https://www.apa.org/topics/research/multitasking' },
        { label: 'Madore KP, Wagner AD, Cerebrum (2019). Multicosts of Multitasking.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7075496/' },
      ],
    },
    {
      date: '2026-11-18',
      title: 'MythBuster: We only use 10% of our brain',
      author: 'Anirudh Shukla',
      topic: 'Neurology',
      claim: 'We only use 10% of our brain.',
      verdict: 'Myth',
      points: [
        'fMRI scans show that every part of the brain is active during different activities, though not all at once. Thousands of brain scans show activity moving through the whole brain, even when people try to think of nothing.',
        'Even small areas of damage can cause serious problems. During epilepsy surgery, surgeons stimulate the brain to avoid harming key areas, and the stimulation never produces nothing.',
        'It is not clear how the myth started. Many writers trace it to Dale Carnegie’s 1936 book and a loose reading of William James, who never gave a 10% figure.',
      ],
      remember: 'You already use your whole brain. It can learn and adapt, but there is no hidden 90% waiting to be unlocked.',
      slides: ['assets/weekly/10-percent-brain/1.png', 'assets/weekly/10-percent-brain/2.png', 'assets/weekly/10-percent-brain/3.png', 'assets/weekly/10-percent-brain/4.png', 'assets/weekly/10-percent-brain/5.png', 'assets/weekly/10-percent-brain/6.png', 'assets/weekly/10-percent-brain/7.png', 'assets/weekly/10-percent-brain/8.png', 'assets/weekly/10-percent-brain/9.png'],
      sources: [
        { label: 'Avery Hurt, Discover Magazine (2021). The 10-Percent-of-Your-Brain Myth That Just Won’t Die.', url: 'https://www.discovermagazine.com/the-10-percent-of-your-brain-myth-that-just-wont-die-42817' },
        { label: 'Christian Jarrett, The Psychologist, British Psychological Society (2014). Great myths of the brain: We only use 10 per cent (book extract).', url: 'https://www.bps.org.uk/psychologist/great-myths-brain-we-only-use-10-cent' },
      ],
    },
  ],
}
