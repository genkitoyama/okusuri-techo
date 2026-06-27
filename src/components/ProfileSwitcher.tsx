import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Profile } from '@/db/queries';
import { Colors, Radius, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

type Props = {
  profiles: Profile[];
  selectedId: number;
  onSelect: (id: number) => void;
};

export function ProfileSwitcher({ profiles, selectedId, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {profiles.map((p) => {
        const active = p.id === selectedId;
        const tint = p.kind === 'dog' ? Colors.accent.dog : Colors.accent.human;
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? tint : Colors.card,
                borderColor: tint,
              },
            ]}
          >
            {p.photo_uri ? (
              <Image source={{ uri: p.photo_uri }} style={styles.avatar} />
            ) : (
              <Text style={styles.emoji}>{p.avatar_emoji}</Text>
            )}
            <Text
              style={[
                styles.name,
                {
                  color: active ? Colors.text : Colors.textSub,
                  fontFamily: active ? FontFamily.medium : FontFamily.regular,
                },
              ]}
            >
              {p.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    gap: 6,
  },
  emoji: { fontSize: 18 },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  name: { fontSize: 14, paddingRight: 4 },
});
