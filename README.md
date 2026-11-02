# Project HealthBridge

The website for Project HealthBridge, a student-led health innovation lab: articles, the brain, the heart and the mind in plain language, our experiment plans, a quiz and a BMI check. Plain HTML, CSS and JavaScript. No build step, no accounts, nothing is stored or sent anywhere.

## Run it

```
npm start        # http://localhost:8090
npm test         # 15 tests: BMI and quiz maths, the quiz data, and the Substack feed reader
npm run update   # pull the latest posts from Substack now
```

Or just open `index.html` in a browser.

## New Substack posts appear by themselves

Browsers are not allowed to read the Substack feed directly, so the site does not ask Substack every time someone visits. Instead:

1. `tools/update-articles.mjs` reads `https://projecthealthbridge.substack.com/feed` and writes `data/articles.js` (title, link, date, author, category).
2. The pages load `data/articles.js`, so the home page, the Articles page and the three category pages all update together.
3. `.github/workflows/update-articles.yml` runs step 1 **every 6 hours** on GitHub, saves the file if there is something new, and asks GitHub Pages to rebuild. So a new post shows up on the site within about six hours, with nobody touching anything. To see it sooner: GitHub > Actions > "Update articles from Substack" > Run workflow.

This needs the site to be on GitHub Pages in a GitHub repository (see below). Running `npm run update` yourself works anywhere.

**Author and category.** Substack names the publication as the author of every post, so the real author is read from the byline in the post ("By: Anirudh Shukla"). The category (Neurology, Cardiology, Psychology) is chosen from the words in the title; anything it cannot place shows as "General". To pin a post yourself, add a line to `data/categories.json`: the end of the post's link, then the category.

## Publish it (GitHub Pages)

1. Create a repository on GitHub and push this folder to it (the folder's contents at the top level).
2. Repository **Settings > Pages**: source `main` branch, folder `/ (root)`.
3. Repository **Settings > Actions > General**: under "Workflow permissions" choose **Read and write permissions**, then Save. (The scheduled job needs this to save the new article list.)
4. The site appears at `https://<username>.github.io/<repository>/`.

## What to edit

| To change | Edit |
| --- | --- |
| A quiz question or the topic lists | `js/data.js` (`answer` counts from 0) |
| Words on a page | the page's `.html` file |
| Colours and fonts | the top of `css/style.css` |
| Contact email | `data-to` on the form in `index.html` |
| A post's category | `data/categories.json` |
| A one-line summary under an article (write it yourself) | `data/summaries.js` |
| A new Brain Myth of the Week and quiz | `data/weekly.js` (the template is in the file) |
| A glossary term | `GLOSSARY` in `js/data.js` |
| A source on the reading list | `reading-list.html` |

Do not edit `data/articles.js` by hand: the updater overwrites it.

## Founders' photos (not added yet)

In `index.html`, find **Meet our founders**. Each founder has an arch with their initials. When you have the photos, put them in `assets/` and replace each `<div class="monogram" ...>AS</div>` with
`<img class="monogram" src="assets/anirudh.jpg" alt="Anirudh Shukla">` (and the same for Aditya). Portrait photos fit the arch best.

## Design

A medical journal for young people. Porcelain paper and forest-teal ink, the green from the logo, Newsreader for headlines and Instrument Sans for the interface. The arch (a bridge) is the one repeated shape. The line across the home page starts as a heartbeat (ECG) and settles into brain waves (EEG); it is the only animation, and it is switched off for people who ask their device for less motion. No emoji: all icons and the three discipline drawings are custom SVG.

## The 3D brain and heart

The home page has an "Inside the brain and the heart" section. The models are real anatomy from **BodyParts3D** (a university anatomy database, based on one person's scans), already split into their real parts: the brain into the frontal, parietal, temporal and occipital lobes (left and right), the cerebellum, brainstem and hippocampus, plus a simplified amygdala; the heart into its four chambers, the aorta, pulmonary artery, vena cava and pulmonary veins, the coronary arteries and cardiac veins on its surface, and the four valves (the ventricles' muscle wall is grown from the blood space the data stores, so the coronary arteries sit on its surface). Visitors pull it apart with the slider, drag to turn it, and tap a part (or its name in the list) to read what it does. In the heart, blue vessels carry oxygen-poor blood and red vessels carry oxygen-rich blood. The big vessels are each built as one smooth tube along the real vessel's path, so nothing looks cut or joined.

- **Licence and credit (important):** BodyParts3D is licensed **CC Attribution-Share Alike 2.1 Japan**. The credit line is shown under the 3D section and on `credits.html`; keep it if you move or change the section. The database's licence page now says CC BY 4.0 while the downloaded files carry the Share-Alike notice, so we follow the stricter one, state that we changed the data, and share the adapted model files (`assets/anatomy/`) under the same licence. If you want it settled, you can email the Database Center for Life Science (the licensor contact is on their licence page).
- **Files:** `js/anatomy.js` loads and runs the models. `assets/anatomy/` holds the adapted models (about 2 MB) and `CREDITS.txt`. `js/vendor/three.module.min.js` is a saved copy of Three.js r160 (MIT licence, `js/vendor/three.LICENSE.txt`), so nothing is fetched from another site. All of it is only downloaded when a visitor scrolls near the section.
- **Rebuilding the models:** `node tools/build-anatomy.mjs <folder>` turns the BodyParts3D download (`partof_BP3D_4.0_obj_99.zip` unpacked into `<folder>/obj/`, plus `partof_element_parts.txt`) into the files in `assets/anatomy/`. It merges the small pieces of each part, trims vessels near the heart, smooths them, and writes them compactly. Change which parts go where, and which way they fly apart, at the top of that script.
- **What each part says:** it is plain text in the list in `index.html` (look for `part-fn`). Edit the wording there; the 3D view reads the names from the same list. These sentences are standard textbook basics written as a draft, so read them over.
- **If 3D cannot run** (an old browser, no WebGL, or the page opened straight from disk with `index.html`), the section falls back to the list, which still describes every part. Use `npm start` or the published site to see the 3D view.
- **Reduced motion:** no spinning and no animated pull-apart; the parts simply start pulled apart.
- **Phones:** touch drags turn the model, and scrolling the page still works over it.

## Get new articles by email (Substack sign-up box)

The home page and Articles page have a "Get new articles by email" box. It shows Substack's own sign-up form, but only after a visitor clicks, so nothing from Substack loads until they choose. Without JavaScript the button is a plain link to Substack's subscribe page. Subscribers go straight to your Substack list; this site never sees their email address.

## Visit counter (off until you turn it on)

To see how many people visit and what they read, use GoatCounter: free for non-commercial sites, no cookies, no personal data. Make a free account at goatcounter.com, choose a site code, put it in `data/site.js`, and publish again. It never runs on your own computer or for visitors with "Do Not Track" on, and the footer then says that visits are counted. With the code left empty, nothing is counted.

## Carousel maker (for Instagram)

Linked from the footer of every page ("Carousel maker"). It asks for a 5-digit code first (a polite lock for the team, not real security: the site is plain files, so the code is only stored scrambled and a determined person could still get in; to change the code, edit the number in the gate script at the top of the page and the scramble value - ask Claude to do it). You can also open `tools/carousel/index.html` (at `http://localhost:8090/tools/carousel/` after `npm start`). It turns text you write into branded Instagram images and has a form for each kind of post:

- **Article**: cover, one idea per slide (blank line between slides), last slide pointing to the article. 1080 x 1350.
- **Experiment**: the question, who took part, what you expected, method (one step per line), results, conclusion and what it cannot tell us. The cover says it is a student experiment and not medical advice.
- **MythBuster**: the myth, a verdict (Myth, Partly true, True, Not proven), what the evidence shows, two sources, one thing to remember. It warns if you give fewer than two sources.
- **Quiz (Story)**: Instagram Story frames, 1080 x 1920, with the top and bottom kept clear of Instagram's own buttons. Add up to 5 questions with four options, the right answer and a reason; make the question frames on Friday and the answer frames on Saturday.
- **Podcast**: cover with a sound wave, what the episode is about, takeaways and where to listen.

You write every word; the tool only lays it out. It warns about long slides and Instagram's 10-slide limit. Each form's draft is kept in your browser only (nothing is uploaded). The page asks search engines to skip it, so it is easy to reach from the site but will not show in search results.
## Motion

Small and slow-in, using only transform and opacity. All of it is switched off for visitors whose device asks for reduced motion, and the page is complete without it.

- The headline, paragraph and buttons rise in one after another as the heartbeat line draws.
- Sections, article rows and columns slide up once as they arrive (only things below the fold, so nothing flashes at load).
- The vital-signs numbers count up when seen, and always finish on the exact written values.
- A small "Follow along" card with a Join us on Substack button slides in from the corner after a visitor has read part of a page. Once per visit, and not again for two weeks after it is closed. It never appears on the quiz or the 404 page. To change it, see the prompt section at the bottom of `js/app.js` (40% scroll depth, 25 seconds, 14 days) and `.prompt` in `css/style.css`.
- Quiz options slide in, the right answer pops, and the score counts up. The article filters swap with a short rise.

## Notes

- **Not on this site, on purpose:** the admin login, AI question bot, AI calorie estimator and symptom checker from the earlier version. They need a server, and a symptom checker should not be guessed at. The contact form opens the visitor's own email app.
- **Experiments** are shown as plans, because none has run yet. Keep them labelled that way until real results exist.
- **Helpline numbers** in the footer should be checked against the official sites before launch: Samaritans of Singapore (1767, 1800-221-4444), IMH Mental Health Helpline (6389 2222), SCDF 995, Police 999.
- Fonts load from Google Fonts. Without internet the site falls back to the system fonts.

## Email links and the founders section

Every email link and the contact form open a new message in **Gmail on the web** (not the computer's mail app), addressed to the project inbox. The address is set once at the top of `tools/build-pages.mjs`; the contact form's code is in `js/app.js`.

The founders section shows each founder's field (a line drawing in the arch), their quote, and a "Want to help?" strip. To add a line in a founder's own words, write it in `data/founders.js`; nothing shows while it is empty. When photos are ready, replace the arch `div` in the template with an `img` of class `monogram`.

## Join us on Substack

The join buttons go to Substack's plain email box (`subscribe?simple=true`), which has no plan or payment screens. The publication has payments switched off in Substack, so there is no paid tier; to keep it that way, do not turn on paid subscriptions in Substack's settings.
