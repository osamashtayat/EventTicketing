import type { ComponentPropsWithRef } from 'react';
export function Button({
  className = '',
  variant = 'primary',
  type = 'button',
  ...props
}: ComponentPropsWithRef<'button'> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button type={type} className={`button ${variant} ${className}`} {...props} />;
}
