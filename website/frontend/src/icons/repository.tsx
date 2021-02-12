import {jsx} from '@emotion/react';

// Source: https://thenounproject.com/search/?q=git+repository&i=368566

export function RepositoryIcon({
  size = 32,
  color = 'currentColor',
  className
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill={color}
      viewBox="0 0 46.3 62.4"
      className={className}
    >
      <rect x="14.2" y="6.9" width="4.3" height="4.3" />
      <rect x="14.2" y="15.9" width="4.3" height="4.3" />
      <rect x="14.2" y="24.9" width="4.3" height="4.3" />
      <rect x="14.2" y="33.9" width="4.3" height="4.3" />
      <path
        d="M63.3,15.5H23.2a3.116,3.116,0,0,0-3.1,3.1V68.3a3.116,3.116,0,0,0,3.1,3.1h8.2v6.5l4.8-4,4.8,4V71.4H63.3a3.116,3.116,0,0,0,3.1-3.1V18.6A3.116,3.116,0,0,0,63.3,15.5Zm.1,52.8c0,.1-.1.1-.2.1H41V64H31.3v4.4H23.1a.349.349,0,0,1-.2-.1V62H63.3v6.3Zm0-9.4H31V18.5H63.2a.349.349,0,0,1,.2.1Z"
        transform="translate(-20.1 -15.5)"
      />
    </svg>
  );
}
