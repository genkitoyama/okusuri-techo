import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function hhmm(date: Date): string {
  return format(date, 'HH:mm');
}

export function isoNow(): string {
  const d = new Date();
  return `${ymd(d)}T${hhmm(d)}`;
}

export function jpDateLong(date: Date): string {
  return format(date, 'M月d日 (E)', { locale: ja });
}

export function jpDateShort(date: Date): string {
  return format(date, 'M/d (E)', { locale: ja });
}
