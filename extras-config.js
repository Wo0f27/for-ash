/* Optional storybook extras. This is separate from your original config.js.
   Replace only the placeholder messages with your own words before sharing.
   No existing letters, memories or birthday messages are changed. */
window.STORYBOOK_EXTRAS_CONFIG = {
  typewriterSpeedMs: 52, // 40–60ms is a gentle starting range.
  scratchThreshold: 0.42, // Coating fraction removed before it finishes revealing.
  scratchCards: [
    {label: 'A tiny discovery', message: '[Write your first scratch-card message here.]'},
    {label: 'A little more magic', message: '[Write your second scratch-card message here.]'},
    {label: 'One for another day', message: '[Write your third scratch-card message here.]'}
  ],
  openWhenLetters: [
    {label: 'Open When You Need a Smile', message: '[Write your note for a smile here.]'},
    {label: "Open When You're Feeling Down", message: '[Write your note for a difficult day here.]'},
    {label: 'Open When You Miss Someone', message: '[Write your note for missing someone here.]'},
    {label: 'Open When You Need Encouragement', message: '[Write your encouraging note here.]'}
  ]
};
