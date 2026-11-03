/* The quiz and the topic lists. To change a quiz question, edit QUIZ (`answer` is the position of
   the right option, counting from 0). Articles are not here: they load by themselves from the
   Substack feed into data/articles.js (see tools/update-articles.mjs). */
window.HB_DATA = (function () {

  // The six questions from the original site. Options are as written there, with two spelling fixes.
  var QUIZ = [
    { topic: 'Neurology', level: 'medium', q: 'Which part of the brain is most involved in decision making?', options: ['Cerebellum', 'Hippocampus', 'Prefrontal cortex', 'Brainstem'], answer: 2 },
    { topic: 'Cardiology', level: 'easy', q: 'Which blood vessel carries oxygenated blood from the lungs to the heart?', options: ['Pulmonary artery', 'Aorta', 'Pulmonary vein', 'Vena cava'], answer: 2 },
    { topic: 'Psychology', level: 'medium', q: 'What is it called when one positive trait makes you view someone more positively overall?', options: ['Halo effect', 'Anchoring bias', 'Availability heuristic', 'Framing effect'], answer: 0 },
    { topic: 'Cardiology', level: 'medium', q: 'Which valve prevents blood from flowing back into the left atrium?', options: ['Pulmonary valve', 'Tricuspid valve', 'Mitral (bicuspid) valve', 'Aortic valve'], answer: 2 },
    { topic: 'Neurology', level: 'medium', q: 'Which type of brain cell is primarily responsible for transmitting electrical signals?', options: ['Astrocyte', 'Microglia', 'Neuron', 'Oligodendrocyte'], answer: 2 },
    { topic: 'Cardiology', level: 'easy', q: "During exercise, which of the following usually increases the most to meet the body's oxygen demands?", options: ['Heart rate only', 'Stroke volume only', 'Cardiac output', 'Blood pressure only'], answer: 2 },
  ]

  // From the "Content Topics & Post Formats" document: what the team plans to write about.
  var TOPICS = {
    Neurology: [
      'Neuroplasticity: how the brain rewires itself after injury or learning',
      'The gut-brain axis: how your intestinal bacteria affect mood and cognition',
      'How chronic stress physically changes brain structure over time',
      'Sleep deprivation and its measurable effects on memory consolidation',
      "Alzheimer's disease: early detection biomarkers and prevention strategies",
      'The neuroscience of addiction: dopamine pathways and reward circuits',
      'Traumatic brain injury in young athletes: risks of contact sports',
      'How meditation and mindfulness alter brain grey matter density',
      'Neurological consequences of long COVID: brain fog and cognitive decline',
      "Deep brain stimulation as a treatment for Parkinson's disease",
    ],
    Cardiology: [
      'Cardiovascular disease in young people: why rates are rising globally',
      'How aerobic exercise structurally changes the heart over time',
      'Salt, hypertension and silent cardiovascular damage in adolescents',
      'The link between chronic inflammation and heart disease',
      'Wearable technology and early detection of arrhythmias',
      'Congenital heart defects: prevalence, detection and surgical outcomes',
      'Psychological stress as an independent risk factor for heart attacks',
      'The Mediterranean diet and its measurable cardiovascular benefits',
      'Air pollution and cardiovascular mortality: a global public health crisis',
      'Gender differences in heart attack symptoms and why women are underdiagnosed',
    ],
    Psychology: [
      'The global mental health crisis: why depression and anxiety are rising in young people',
      'Social media and adolescent mental health: what the research actually shows',
      'The treatment gap: why so many people with mental illness receive no treatment',
      'Burnout: the neuroscience behind chronic stress and exhaustion',
      'Trauma and the body: how PTSD physically alters the nervous system',
      'The effectiveness of therapy vs medication for depression: comparing the evidence',
      'Stigma as a barrier to mental health care: causes, consequences and solutions',
      'Student mental health in high-pressure academic systems: Singapore as a case study',
      'The link between physical exercise and mental health: mechanisms and evidence',
      'Digital mental health tools: apps, AI therapy and their real-world effectiveness',
    ],
  }

  // The 12 definitions already on the Neurology, Cardiology and Psychology pages, in A-Z order on the
  // Glossary page. Add a term here as the team writes more.
  var GLOSSARY = [
    { term: 'Neurons', category: 'Neurology', definition: 'The basic building blocks of the nervous system. Each neuron communicates with others through synapses (connections), creating the electrical and chemical signals that power your thoughts and actions.' },
    { term: 'Neurotransmitters', category: 'Neurology', definition: 'Chemical messengers that allow neurons to communicate. Examples include dopamine (motivation), serotonin (mood), and acetylcholine (memory). Imbalances can affect mental health.' },
    { term: 'Neuroplasticity', category: 'Neurology', definition: "Your brain's ability to reorganize and form new neural connections throughout life. This means you can learn new skills and recover from brain injuries—your brain is always changing!" },
    { term: 'Gray matter vs white matter', category: 'Neurology', definition: 'Gray matter contains neuron bodies and processes information. White matter contains axons (connections) and transmits signals. Both are essential for brain function.' },
    { term: 'Arteries vs veins', category: 'Cardiology', definition: 'Arteries carry oxygen-rich blood away from the heart (usually bright red). Veins return oxygen-poor blood to the heart (usually dark red/blue). Both are essential for circulation.' },
    { term: 'Heart rate and pulse', category: 'Cardiology', definition: 'Your heart rate is how many times your heart beats per minute (normal: 60-100 bpm at rest). Your pulse is the heartbeat you can feel in your wrists or neck.' },
    { term: 'Cholesterol and plaque', category: 'Cardiology', definition: 'High cholesterol can build up as plaque in arteries, narrowing them and restricting blood flow. This increases heart disease risk. Regular exercise and healthy eating help maintain healthy cholesterol.' },
    { term: 'Arrhythmias', category: 'Cardiology', definition: 'Irregular heartbeats can be harmless or serious. Stress, caffeine, or underlying conditions can cause them. Most are manageable with lifestyle changes or medical treatment.' },
    { term: 'Self-esteem', category: 'Psychology', definition: "Your overall evaluation of your own worth. Healthy self-esteem means accepting yourself while recognizing areas for growth. It's not arrogance—it's self-respect and confidence." },
    { term: 'Stress and coping', category: 'Psychology', definition: "Stress is your body's response to challenges. Some stress is normal and motivating, but chronic stress harms health. Learning healthy coping strategies (exercise, talking, hobbies) is essential." },
    { term: 'Mental health vs mental illness', category: 'Psychology', definition: 'Mental health is a spectrum. Everyone has mental health, just like physical health. Mental illness (depression, anxiety, etc.) is treatable. Seeking help is a sign of strength, not weakness.' },
    { term: 'fMRI', category: 'Neurology', definition: 'A brain scan (functional magnetic resonance imaging) that shows which parts of the brain are more active at a given moment.' },
    { term: 'Epilepsy', category: 'Neurology', definition: 'A condition where the brain sometimes has sudden bursts of abnormal activity, called seizures.' },
    { term: 'Neuroscientist', category: 'Neurology', definition: 'A scientist who studies the brain and nervous system.' },
    { term: 'Growth mindset', category: 'Psychology', definition: 'Believing your abilities can be developed through effort and practice. People with growth mindsets embrace challenges, learn from failures, and achieve more than those with fixed mindsets.' },
  ]

  return { QUIZ: QUIZ, TOPICS: TOPICS, GLOSSARY: GLOSSARY }
})()
