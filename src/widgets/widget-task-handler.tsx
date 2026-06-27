import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { runMigrations } from '@/db/migrations';
import { OkusuriMediumWidget } from './OkusuriMediumWidget';
import { OkusuriSmallWidget } from './OkusuriSmallWidget';
import { clearWidgetProfile, loadWidgetDataForWidget } from './utils';

const nameToWidget = {
  OkusuriSmall: OkusuriSmallWidget,
  OkusuriMedium: OkusuriMediumWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget =
    nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];
  if (!Widget) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      try {
        await runMigrations();
      } catch (e) {
        console.warn('[widget] migration error', e);
      }
      try {
        const data = await loadWidgetDataForWidget(widgetInfo.widgetId);
        props.renderWidget(<Widget data={data} />);
      } catch (e) {
        console.warn('[widget] render error', e);
        props.renderWidget(
          <Widget data={{ profile: null, doses: [], takenCount: 0 }} />
        );
      }
      break;
    }
    case 'WIDGET_DELETED': {
      await clearWidgetProfile(widgetInfo.widgetId);
      break;
    }
    case 'WIDGET_CLICK':
      break;
    default:
      break;
  }
}
