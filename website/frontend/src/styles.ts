import {useTheme, Theme} from '@emotion/react';
import memoize from 'lodash/memoize';

const getStyles = memoize(function getStyles(theme: Theme) {
  return {
    control: {display: 'flex', flexDirection: 'column' as const},

    label: {
      marginBottom: '.5rem',
      color: theme.colors.text.muted,
      lineHeight: theme.lineHeights.small
    },

    hiddenLink: {
      'color': 'inherit',
      ':hover': {color: 'inherit', textDecoration: 'none'}
    }
  };
});

export function useStyles() {
  return getStyles(useTheme());
}
