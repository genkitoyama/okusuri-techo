import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
  const palette = paletteFor(variant);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

function paletteFor(v: Variant) {
  if (v === 'primary') {
    return { bg: Colors.primary, fg: '#FFFFFF', border: Colors.primary };
  }
  if (v === 'danger') {
    return { bg: Colors.danger, fg: '#FFFFFF', border: Colors.danger };
  }
  return { bg: Colors.card, fg: Colors.text, border: Colors.border };
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  label: { fontFamily: FontFamily.medium, fontSize: 16 },
});
