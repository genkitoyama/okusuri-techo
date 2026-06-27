export const Colors = {
  background: '#FFF8F0',
  card: '#FFFFFF',
  primary: '#D4A574',
  primaryDark: '#A88555',
  accent: {
    dog: '#FFB6B9',
    human: '#A8D8B9',
  },
  text: '#3C3C3C',
  textSub: '#9A9A9A',
  border: '#EFE5D6',
  shadow: 'rgba(60, 60, 60, 0.08)',
  success: '#7AC29A',
  danger: '#E08B8B',
} as const;

export const MedColors = [
  '#FFB6B9',
  '#A8D8B9',
  '#FFD6A5',
  '#C5B5E3',
  '#A5C8E3',
  '#F4B7C7',
] as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#3C3C3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
