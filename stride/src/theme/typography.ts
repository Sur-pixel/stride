import { TextStyle } from 'react-native';

export const typography = {
  hero: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 40,
  } satisfies TextStyle,
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 34,
  } satisfies TextStyle,
  section: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  } satisfies TextStyle,
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
  button: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  } satisfies TextStyle,
} as const;
