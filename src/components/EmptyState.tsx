import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

type Props = {
  emoji: string;
  title: string;
  caption?: string;
};

export function EmptyState({ emoji, title, caption }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emoji: { fontSize: 48 },
  title: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.text },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textSub,
    textAlign: 'center',
  },
});
