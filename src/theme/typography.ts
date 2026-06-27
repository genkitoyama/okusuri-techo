import { TextStyle } from 'react-native';
import { Colors } from './colors';

export const FontFamily = {
  regular: 'MPlusRounded1c_400Regular',
  medium: 'MPlusRounded1c_500Medium',
  bold: 'MPlusRounded1c_700Bold',
} as const;

export const Typography: Record<string, TextStyle> = {
  h1: { fontFamily: FontFamily.bold, fontSize: 28, color: Colors.text },
  h2: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.text },
  h3: { fontFamily: FontFamily.medium, fontSize: 18, color: Colors.text },
  body: { fontFamily: FontFamily.regular, fontSize: 15, color: Colors.text },
  bodyBold: { fontFamily: FontFamily.medium, fontSize: 15, color: Colors.text },
  caption: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.textSub },
  button: { fontFamily: FontFamily.medium, fontSize: 16, color: Colors.text },
};
