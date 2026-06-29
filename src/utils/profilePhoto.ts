import * as FileSystem from 'expo-file-system/legacy';

const baseDir = FileSystem.documentDirectory ?? '';
const PROFILE_DIR = baseDir + 'profiles/';

async function ensureDir(): Promise<void> {
  if (!baseDir) return;
  const info = await FileSystem.getInfoAsync(PROFILE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PROFILE_DIR, { intermediates: true });
  }
}

function extractExt(uri: string): string {
  const cleaned = uri.split('?')[0];
  const last = cleaned.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot === -1 || dot === last.length - 1) return 'jpg';
  const ext = last.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg';
}

/**
 * 写真ピッカー / カメラから返された一時 URI を documentDirectory にコピーして
 * 永続的なパスを返す。OS が cache を消しても写真が残るようにする。
 */
export async function persistProfilePhoto(tempUri: string): Promise<string> {
  await ensureDir();
  const ext = extractExt(tempUri);
  const stamp = Date.now();
  const fileName = `profile-${stamp}.${ext}`;
  const target = PROFILE_DIR + fileName;
  await FileSystem.copyAsync({ from: tempUri, to: target });
  return target;
}

export function isPersistedPhoto(uri: string | null | undefined): boolean {
  if (!uri || !baseDir) return false;
  return uri.startsWith(PROFILE_DIR);
}

/**
 * 既存の photo_uri を確認し、 必要なら永続パスに移し替える。
 * - 既に PROFILE_DIR 配下 → そのまま返す
 * - 別パス(cache directory 等) で実体が残っている → copy して新 URI を返す
 * - 別パスで実体が消えている → null を返す(消失扱い)
 */
export async function migrateProfilePhotoIfNeeded(
  uri: string | null
): Promise<string | null> {
  if (!uri || !baseDir) return uri;
  if (isPersistedPhoto(uri)) return uri;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return await persistProfilePhoto(uri);
  } catch {
    return null;
  }
}
