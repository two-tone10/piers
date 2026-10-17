export const colors = {
  bg: '#f0ede6',
  bgCard: '#e6e1d8',
  bgCardHover: '#ddd8ce',
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.15)',
  text: '#1a1714',
  textMid: '#6b6560',
  textDim: '#a8a39d',
  // Coffee — warm brown, used for active/positive states
  gold: '#7a5230',
  goldBg: 'rgba(122,82,48,0.09)',
  goldBorder: 'rgba(122,82,48,0.22)',
  // Navy — primary accent
  blue: '#1d3a63',
  blueBg: 'rgba(29,58,99,0.07)',
  blueBorder: 'rgba(29,58,99,0.20)',
  // Carolina blue — secondary accent (replaces red/rose)
  rose: '#4a8db5',
  roseBg: 'rgba(74,141,181,0.08)',
  roseBorder: 'rgba(74,141,181,0.22)',
};

export const radius = { sm: 8, md: 14, lg: 20 };

// Bonds deepen the longer two people stand on the same pier together.
// Stranger → Familiar → Confidant. Each tier unlocks a more human interaction.
export const bondTiers = {
  stranger: {
    label: 'Stranger',
    color: '#8a857e',
    bg: 'rgba(138,133,126,0.10)',
    border: 'rgba(138,133,126,0.24)',
    blurb: 'You\'re standing here for the first time.',
    lockedHint: 'Stand together once more, through to acknowledgement, to unlock writing your own words.',
  },
  familiar: {
    label: 'Familiar',
    color: colors.blue,
    bg: colors.blueBg,
    border: colors.blueBorder,
    blurb: 'You\'ve stood together before — you can write in your own words now.',
  },
  confidant: {
    label: 'Confidant',
    color: colors.gold,
    bg: colors.goldBg,
    border: colors.goldBorder,
    blurb: 'You\'ve shown up for them enough times that they trust you with the fuller picture.',
  },
};

export const fonts = {
  regular: 'Raleway_400Regular',
  italic: 'Raleway_400Regular_Italic',
  semiBold: 'Raleway_600SemiBold',
  bold: 'Raleway_700Bold',
  boldItalic: 'Raleway_700Bold_Italic',
  light: 'Raleway_300Light',
};

// Language — plain human words, no maritime jargon
export const copy = {
  goal: 'goal',
  goals: 'goals',
  supporters: 'supporters',
  supporting: 'supporting',
  openGoals: 'Goals seeking support',
  setGoal: 'Set your goal',
  markDone: 'I did it',
  inProgress: 'In progress',
  waiting: 'Waiting for supporters',
  community: 'Community',
  record: 'My Record',
  wordsOfSupport: 'Words of support',
  reckoning: 'Reckoning',
};
