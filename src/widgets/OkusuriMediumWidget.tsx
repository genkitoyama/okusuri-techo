'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WidgetData } from './utils';

const BG = '#FFF8F0';
const CARD = '#FFFFFF';
const TEXT = '#3C3C3C';
const SUB = '#9A9A9A';

export function OkusuriMediumWidget({ data }: { data: WidgetData }) {
  if (!data.profile) {
    return (
      <FlexWidget
        style={{
          backgroundColor: BG,
          height: 'match_parent',
          width: 'match_parent',
          borderRadius: 24,
          padding: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="プロファイル未設定"
          style={{ fontSize: 13, color: SUB }}
        />
      </FlexWidget>
    );
  }

  const items = data.doses.slice(0, 5);

  return (
    <FlexWidget
      style={{
        backgroundColor: BG,
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        padding: 12,
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexGap: 6,
          height: 'wrap_content',
        }}
      >
        <TextWidget text={data.profile.avatar_emoji} style={{ fontSize: 18 }} />
        <FlexWidget style={{ flex: 1, height: 'wrap_content' }}>
          <TextWidget
            text={data.profile.name}
            style={{ fontSize: 14, color: TEXT, fontWeight: 'bold' }}
          />
        </FlexWidget>
        <TextWidget
          text={`${data.takenCount}/${data.doses.length}`}
          style={{ fontSize: 12, color: SUB }}
        />
      </FlexWidget>

      {items.length === 0 ? (
        <FlexWidget
          style={{
            marginTop: 12,
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="🌿 今日のお薬はありません"
            style={{ fontSize: 12, color: SUB }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            marginTop: 8,
            flexDirection: 'column',
            flexGap: 4,
          }}
        >
          {items.map((d, i) => (
            <FlexWidget
              key={`${d.medicationId}-${d.isoKey}-${i}`}
              style={{
                backgroundColor: CARD,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                flexGap: 8,
                height: 'wrap_content',
              }}
            >
              <FlexWidget
                style={{
                  backgroundColor: d.color as any,
                  width: 6,
                  height: 28,
                  borderRadius: 3,
                }}
              />
              <FlexWidget
                style={{
                  flexDirection: 'column',
                  flex: 1,
                  height: 'wrap_content',
                }}
              >
                <TextWidget
                  text={d.name}
                  style={{
                    fontSize: 12,
                    color: d.taken ? SUB : TEXT,
                    fontWeight: d.taken ? 'normal' : 'bold',
                  }}
                />
                <TextWidget
                  text={`${d.timeKey}${d.dose ? ` ・ ${d.dose}` : ''}`}
                  style={{ fontSize: 10, color: SUB }}
                />
              </FlexWidget>
              <TextWidget
                text={d.taken ? '✓' : '・'}
                style={{
                  fontSize: 14,
                  color: d.taken ? '#7AC29A' : SUB,
                  fontWeight: 'bold',
                }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
