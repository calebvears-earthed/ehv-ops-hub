/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Mindset Prompt Bank
   Day-of-year rotation. Stoic, operator-grade.
   ═══════════════════════════════════════════════════ */

const DEFAULT_PROMPTS = [
  "Discipline is the bridge between goals and accomplishment.",
  "The standard you walk past is the standard you accept.",
  "Urgency without clarity is just noise. Know the one thing.",
  "Your future self is watching the decisions you make today.",
  "Hard work compounds. So does neglect.",
  "Comfort is the enemy of growth. Lean into the resistance.",
  "You don't rise to the level of your goals — you fall to the level of your systems.",
  "The obstacle is the way.",
  "Control your effort, accept the outcome.",
  "What you do every day matters more than what you do once in a while.",
  "Be ruthless with your time. It's the only asset you can't earn back.",
  "Precision in the small things creates excellence in the big things.",
  "The man who moves a mountain begins by carrying away small stones.",
  "Suffer the pain of discipline or suffer the pain of regret.",
  "Execution beats strategy every single day.",
  "You're not behind. You're building. Stay in your lane.",
  "A good plan violently executed now is better than a perfect plan next week.",
  "The only way to do great work is to love what you do — then outwork everyone else.",
  "Momentum doesn't find you. You create it with the first step.",
  "Your habits are your résumé. What does yours say?",
  "Don't count the days. Make the days count.",
  "Every rep counts. Every decision counts. Every hour counts.",
  "The difference between try and triumph is a little umph.",
  "Champions aren't made in the ring — they are merely recognised there.",
  "Focus is saying no to the hundred other good ideas.",
  "Be so good they can't ignore you.",
  "Pressure is a privilege. It means you're in the arena.",
  "The cost of being wrong is less than the cost of doing nothing.",
  "Your energy introduces you before you even speak.",
  "Consistency will always beat intensity.",
  "What got you here won't get you there. Evolve.",
  "Don't mistake motion for progress.",
  "The person who says it cannot be done should not interrupt the person doing it.",
  "Train like you're second. Compete like you're first.",
  "Small daily improvements lead to staggering long-term results.",
  "You are what you repeatedly do. Excellence is a habit.",
  "If it's important, do it first. If it's not, don't do it at all.",
  "Sweat more in training, bleed less in war.",
  "The harder you work, the luckier you get.",
  "Don't wish for an easy life. Wish for the strength to endure a hard one.",
  "Control the controllables. Release everything else.",
  "You're either growing or dying. There is no maintenance mode.",
  "One disciplined decision creates a cascade of better decisions.",
  "Clarity comes from action, not thought.",
  "Master the fundamentals and the advanced takes care of itself.",
  "The best time to start was yesterday. The second best time is now.",
  "Pain is temporary. Quitting lasts forever.",
  "Results happen over time, not overnight. Work hard, stay consistent, and be patient.",
  "Your potential is a depreciating asset. Use it.",
  "Strong people are harder to kill and more useful in general.",
  "What stands in the way becomes the way.",
  "Don't let perfect be the enemy of done.",
  "You are the CEO of your own life. Start making executive decisions.",
  "Operate with intent. Never drift through a day.",
  "Show me your calendar and I'll show you your priorities.",
  "The world rewards the uncommon. Be uncommon.",
  "Do the work that others won't, so you can live the life that others can't.",
  "Every morning you have two choices: continue to sleep with your dreams, or wake up and chase them.",
  "The grind includes Friday. It includes Saturday. It includes the days you don't feel like it.",
  "Competence is the ultimate credential.",
  "Thinking is useful. Overthinking is self-sabotage.",
  "Speed of implementation separates the top 1% from everyone else.",
  "The quality of your life is determined by the quality of your questions.",
  "Ownership is freedom. Take full responsibility for everything in your life."
];

const Prompts = (() => {
  function getAll() {
    return DataService.getPrompts() || DEFAULT_PROMPTS;
  }

  function getToday() {
    const prompts = getAll();
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return prompts[dayOfYear % prompts.length];
  }

  function save(prompts) {
    DataService.savePrompts(prompts);
  }

  function add(text) {
    const all = getAll();
    all.push(text);
    save(all);
    return all;
  }

  function remove(index) {
    const all = getAll();
    all.splice(index, 1);
    save(all);
    return all;
  }

  return { getAll, getToday, save, add, remove };
})();
