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
    },

    menuItemLink: {
      'color': theme.colors.primary.normal,
      'cursor': 'pointer',
      ':hover': {
        color: theme.colors.primary.highlighted,
        textDecoration: 'none'
      }
    }
  };
});

export function useStyles() {
  return getStyles(useTheme());
}
