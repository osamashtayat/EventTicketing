import * as Primitive from '@radix-ui/react-dialog';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  busy?: boolean;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <Primitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <Primitive.Portal>
        <Primitive.Overlay className="dialog-overlay" />
        <Primitive.Content
          className="dialog-content"
          onOpenAutoFocus={() => {
            previousFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = previousFocus.current;
            if (target?.isConnected) target.focus();
            else document.querySelector<HTMLElement>('h1')?.focus();
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <Primitive.Title>{title}</Primitive.Title>
          <Primitive.Description className="muted">{description}</Primitive.Description>
          {children}
          <Primitive.Close asChild>
            <Button variant="secondary" disabled={busy} className="dialog-close">
              Close
            </Button>
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
