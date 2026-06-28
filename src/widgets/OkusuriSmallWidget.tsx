'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WidgetData } from './utils';

const BG = '#FFF8F0';
const CARD = '#FFFFFF';
const TEXT = '#3C3C3C';
const SUB = '#9A9A9A';

export function OkusuriSmallWidget({ data }: { data: WidgetData }) {
  if (!data.profile) {
    return (
      <FlexWidget
        style={{
          backgroundColor: BG,
          height: 'match_parent',
          width: 'match_parent',
          borderRadius: 24,
          padding: 12,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="プロファイル未設定"
          style={{ fontSize: 12, color: SUB }}
        />
      </FlexWidget>
    );
  }

  const next = data.doses.find((d) => !d.taken);

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
            style={{ fontSize: 13, color: TEXT, fontWeight: 'bold' }}
          />
        </FlexWidget>
        <TextWidget
          text={`${data.takenCount}/${data.doses.length}`}
          style={{ fontSize: 12, color: SUB }}
        />
      </FlexWidget>

      {next ? (
        <FlexWidget
          style={{
            marginTop: 10,
            backgroundColor: CARD,
            borderRadius: 12,
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 8,
            flex: 1,
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: next.color as any,
              width: 6,
              height: 32,
              borderRadius: 3,
            }}
          />
          <FlexWidget
            style={{ flexDirection: 'column', flex: 1, height: 'wrap_content' }}
          >
            <TextWidget
              text={next.name}
              style={{ fontSize: 13, color: TEXT, fontWeight: 'bold' }}
            />
            <TextWidget
              text={`${next.timeKey}${next.dose ? ` ・ ${next.dose}` : ''}`}
              style={{ fontSize: 11, color: SUB, marginTop: 2 }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            marginTop: 10,
            backgroundColor: CARD,
            borderRadius: 12,
            padding: 8,
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <TextWidget
            text="🌿 今日のお薬は全部おわり！"
            style={{ fontSize: 12, color: SUB }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
