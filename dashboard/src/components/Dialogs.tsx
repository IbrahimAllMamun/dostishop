import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Info, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Promise-based replacements for the browser's `confirm` / `alert` / `prompt`.
 *
 * The native ones are unstyled Chrome chrome, they block the main thread, and
 * they cannot be animated. Everything in the dashboard goes through this
 * provider instead:
 *
 *   const { confirm } = useDialogs();
 *   if (!(await confirm({ title: 'Delete?', tone: 'danger' }))) return;
 */

type Tone = 'default' | 'danger';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

interface NotifyOptions {
  title: string;
  description?: string;
  tone?: Tone;
  /** Rendered in a read-only field with a copy button (e.g. a temporary password) */
  value?: string;
}

interface PromptOptions {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}

interface DialogsApi {
  confirm(options: ConfirmOptions): Promise<boolean>;
  notify(options: NotifyOptions): Promise<void>;
  prompt(options: PromptOptions): Promise<string | null>;
}

type Request =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'notify'; options: NotifyOptions; resolve: (v: void) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void };

const DialogsContext = createContext<DialogsApi | null>(null);

export function useDialogs(): DialogsApi {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error('useDialogs must be used inside <DialogsProvider>');
  return ctx;
}

export function DialogsProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  // Radix needs the content mounted through its exit animation, so the payload
  // is dropped on a timer rather than the moment the promise settles.
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openRequest = useCallback((next: Request, initialText = '') => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setText(initialText);
    setCopied(false);
    setRequest(next);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    clearTimer.current = setTimeout(() => setRequest(null), 200);
  }, []);

  const api = useMemo<DialogsApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => openRequest({ kind: 'confirm', options, resolve })),
      notify: (options) =>
        new Promise<void>((resolve) => openRequest({ kind: 'notify', options, resolve })),
      prompt: (options) =>
        new Promise<string | null>((resolve) =>
          openRequest({ kind: 'prompt', options, resolve }, options.defaultValue ?? ''),
        ),
    }),
    [openRequest],
  );

  /** Dismissing via Escape / overlay / ✕ counts as "no". */
  function settle(confirmed: boolean) {
    if (!request) return;
    if (request.kind === 'confirm') request.resolve(confirmed);
    else if (request.kind === 'notify') request.resolve();
    else request.resolve(confirmed ? text : null);
    close();
  }

  const tone: Tone =
    request && request.kind !== 'prompt' ? (request.options.tone ?? 'default') : 'default';
  const danger = tone === 'danger';
  const Icon = danger ? (request?.kind === 'confirm' ? Trash2 : AlertTriangle) : Info;

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the value is selectable in the field regardless */
    }
  }

  return (
    <DialogsContext.Provider value={api}>
      {children}

      <Dialog open={open} onOpenChange={(next) => !next && settle(false)}>
        {request && (
          <DialogContent
            hideClose={request.kind !== 'notify'}
            className="w-[min(92vw,26rem)]"
            // A destructive action should never be one stray Enter away
            onOpenAutoFocus={
              request.kind === 'confirm' && danger
                ? (e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement)
                      .querySelector<HTMLButtonElement>('[data-cancel]')
                      ?.focus();
                  }
                : undefined
            }
          >
            {request.kind === 'prompt' ? (
              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  settle(true);
                }}
              >
                <DialogHeader>
                  <DialogTitle>{request.options.title}</DialogTitle>
                  {request.options.description && (
                    <DialogDescription>{request.options.description}</DialogDescription>
                  )}
                </DialogHeader>
                <div>
                  {request.options.label && <label className="label">{request.options.label}</label>}
                  <input
                    autoFocus
                    className="input"
                    value={text}
                    placeholder={request.options.placeholder}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <button type="button" onClick={() => settle(false)} className="btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" disabled={!text.trim()} className="btn-primary">
                    {request.options.confirmLabel ?? 'Save'}
                  </button>
                </DialogFooter>
              </form>
            ) : (
              <>
                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      danger ? 'bg-sale/10 text-sale' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <DialogHeader className="flex-1 pr-0">
                    <DialogTitle>{request.options.title}</DialogTitle>
                    {request.options.description && (
                      <DialogDescription>{request.options.description}</DialogDescription>
                    )}
                  </DialogHeader>
                </div>

                {request.kind === 'notify' && request.options.value && (
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={request.options.value}
                      onFocus={(e) => e.currentTarget.select()}
                      className="input font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => copyValue(request.options.value!)}
                      className="btn-ghost btn-sm shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                )}

                <DialogFooter>
                  {request.kind === 'confirm' && (
                    <button
                      type="button"
                      data-cancel
                      onClick={() => settle(false)}
                      className="btn-ghost"
                    >
                      {request.options.cancelLabel ?? 'Cancel'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => settle(true)}
                    className={
                      danger && request.kind === 'confirm'
                        ? 'btn bg-sale text-canvas shadow-lift transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-sale/90 hover:shadow-float active:scale-[0.97]'
                        : 'btn-primary'
                    }
                  >
                    {request.kind === 'confirm'
                      ? (request.options.confirmLabel ?? 'Confirm')
                      : 'OK'}
                  </button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        )}
      </Dialog>
    </DialogsContext.Provider>
  );
}
