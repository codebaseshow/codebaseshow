import {jsx} from '@emotion/react';

// Source: https://thenounproject.com/search/?q=menu+rounded&i=118554

export function MoreIcon({
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
      viewBox="0 0 90.003 90"
      className={className}
    >
      <path
        d="M500,455a45.135,45.135,0,0,0-45,44.7A45.069,45.069,0,0,0,499.7,545h.3a45,45,0,1,0,0-90Zm0,83.9h-.3a39.1,39.1,0,0,1-27.5-11.6,38.456,38.456,0,0,1-11.1-27.5A38.951,38.951,0,1,1,500,538.9Z"
        transform="translate(-454.998 -455)"
      />
      <path
        d="M482.2,494.2H482a5.8,5.8,0,0,0,0,11.6h.2a5.8,5.8,0,1,0,0-11.6Zm0,5.8h0Z"
        transform="translate(-454.998 -455)"
      />
      <path
        d="M500.1,494.2h-.2a5.8,5.8,0,1,0,0,11.6h.2a5.8,5.8,0,0,0,0-11.6Zm0,5.8h0Z"
        transform="translate(-454.998 -455)"
      />
      <path
        d="M518.1,494.2h-.2a5.8,5.8,0,1,0,0,11.6h.2a5.8,5.8,0,0,0,0-11.6Zm0,5.8h0Z"
        transform="translate(-454.998 -455)"
      />
    </svg>
  );
}
