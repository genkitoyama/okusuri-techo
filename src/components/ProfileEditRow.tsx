import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Profile } from '@/db/queries';
import { Colors, Radius, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';
import { persistProfilePhoto } from '@/utils/profilePhoto';
import { Button } from './Button';

const DOG_EMOJIS = ['🐶', '🐕', '🐩', '🦴', '🐾'];
const HUMAN_EMOJIS = ['👩', '👨', '👧', '👦', '👵', '👴', '🧑'];

type Props = {
  profile: Profile;
  onSave: (name: string, emoji: string, photo_uri: string | null) => Promise<void>;
};

export function ProfileEditRow({ profile, onSave }: Props) {
  const [name, setName] = useState(profile.name);
  const [emoji, setEmoji] = useState(profile.avatar_emoji);
  const [photoUri, setPhotoUri] = useState<string | null>(profile.photo_uri ?? null);

  useEffect(() => {
    setName(profile.name);
    setEmoji(profile.avatar_emoji);
    setPhotoUri(profile.photo_uri ?? null);
  }, [profile.id, profile.name, profile.avatar_emoji, profile.photo_uri]);

  const options = profile.kind === 'dog' ? DOG_EMOJIS : HUMAN_EMOJIS;
  const dirty =
    name !== profile.name ||
    emoji !== profile.avatar_emoji ||
    photoUri !== (profile.photo_uri ?? null);

  const adoptPickerResult = async (uri: string) => {
    try {
      const persisted = await persistProfilePhoto(uri);
      setPhotoUri(persisted);
    } catch (e) {
      console.warn('[profile] persist photo error', e);
      Alert.alert('写真の保存に失敗しました', 'もう一度お試しください。');
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('写真へのアクセスが必要です', '端末の設定から写真の権限を許可してください。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await adoptPickerResult(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('カメラへのアクセスが必要です', '端末の設定からカメラの権限を許可してください。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await adoptPickerResult(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={pickPhoto} style={styles.avatarBox}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarPhoto} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={14} color="#FFF" />
          </View>
        </Pressable>
        <View style={styles.nameCol}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="名前"
            placeholderTextColor={Colors.textSub}
          />
          <View style={styles.photoActions}>
            <Pressable onPress={pickPhoto} style={styles.photoBtn}>
              <Ionicons name="images-outline" size={14} color={Colors.text} />
              <Text style={styles.photoBtnLabel}>写真を選ぶ</Text>
            </Pressable>
            <Pressable onPress={takePhoto} style={styles.photoBtn}>
              <Ionicons name="camera-outline" size={14} color={Colors.text} />
              <Text style={styles.photoBtnLabel}>撮影</Text>
            </Pressable>
            {photoUri ? (
              <Pressable onPress={() => setPhotoUri(null)} style={styles.photoBtn}>
                <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                <Text style={[styles.photoBtnLabel, { color: Colors.danger }]}>削除</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={styles.subLabel}>写真がないときの絵文字</Text>
      <View style={styles.emojiRow}>
        {options.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={[styles.emojiOption, e === emoji && styles.emojiOptionActive]}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>

      {dirty ? (
        <Button
          label="変更を保存"
          variant="secondary"
          onPress={async () => {
            await onSave(name.trim() || profile.name, emoji, photoUri);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  topRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  avatarBox: { width: 72, height: 72, position: 'relative' },
  avatarPhoto: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarEmoji: { fontSize: 36 },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  nameCol: { flex: 1, gap: Spacing.sm },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoActions: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoBtnLabel: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.text },
  subLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSub,
    marginTop: Spacing.xs,
  },
  emojiRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiOptionActive: { borderColor: Colors.primary, backgroundColor: '#FFFFFF' },
  emojiText: { fontSize: 22 },
});
