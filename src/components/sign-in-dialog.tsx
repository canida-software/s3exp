import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog as DialogRoot,
  DialogContent as DialogPrimitiveContent,
  DialogDescription as DialogPrimitiveDescription,
  DialogFooter as DialogPrimitiveFooter,
  DialogHeader as DialogPrimitiveHeader,
  DialogTitle as DialogPrimitiveTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { selectActiveConnection, type S3ConnectionInput, useS3ConnectionsStore } from '@/lib/s3-connections-store';
import { testS3Connection } from '@/lib/s3-object-storage';

type DialogProps = {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  disablePointerDismissal: boolean;
  title: string;
  description: string;
  children: ReactNode;
};

type SignInFormState = {
  form: ReturnType<
    typeof useForm<
      S3ConnectionInput,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    >
  >;
  isSubmitting: boolean;
  resetForm: () => void;
  submitError: string | null;
};

const connectionSchema = z.object({
  accessKeyId: z.string().min(1, 'Access key is required.'),
  secretAccessKey: z.string().min(1, 'Secret key is required.'),
  url: z.string().url('Enter a valid S3 URL.'),
});

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function toDefaultValues(connection: S3ConnectionInput | null): S3ConnectionInput {
  if (!connection) {
    return { accessKeyId: '', secretAccessKey: '', url: '' };
  }
  return connection;
}

function Dialog({ open, onOpenChange, disablePointerDismissal, title, description, children }: DialogProps) {
  return (
    <DialogRoot disablePointerDismissal={disablePointerDismissal} onOpenChange={onOpenChange} open={open}>
      <DialogPrimitiveContent className="p-0">
        <DialogPrimitiveHeader>
          <DialogPrimitiveTitle>{title}</DialogPrimitiveTitle>
          <DialogPrimitiveDescription>{description}</DialogPrimitiveDescription>
        </DialogPrimitiveHeader>
        {children}
      </DialogPrimitiveContent>
    </DialogRoot>
  );
}

function useSignInFormState(connection: S3ConnectionInput | null, onSuccess: () => void): SignInFormState {
  const saveConnection = useS3ConnectionsStore((state) => state.saveConnection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<
    S3ConnectionInput,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  >({
    defaultValues: toDefaultValues(connection),
    onSubmit: async ({ value }) => {
      const parsed = connectionSchema.safeParse(value);
      if (!parsed.success) {
        setSubmitError(parsed.error.issues[0]?.message ?? 'Invalid connection values.');
        return;
      }
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await testS3Connection(parsed.data);
        saveConnection(parsed.data);
        onSuccess();
      } catch (error) {
        setSubmitError(toRawErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const resetForm = useCallback(() => {
    setSubmitError(null);
    form.reset(toDefaultValues(connection));
  }, [connection, form]);

  return { form, isSubmitting, resetForm, submitError };
}

function SignInDialog() {
  const connection = useS3ConnectionsStore(selectActiveConnection);
  const [open, setOpen] = useState<boolean>(() => connection === null);
  const [showSecret, setShowSecret] = useState(false);
  const { form, isSubmitting, resetForm, submitError } = useSignInFormState(connection, () => setOpen(false));

  useEffect(() => {
    resetForm();
    if (!connection) setOpen(true);
  }, [connection, resetForm]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && !connection) return;
    setOpen(nextOpen);
  }, [connection]);

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        Connection
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={!connection} title="Connect to S3" description="Credentials stay in localStorage in your browser; only direct requests are sent to your object storage.">
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="url">
            {(field) => (
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">S3 URL</span>
                <Input
                  autoFocus
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isSubmitting}
                  placeholder="https://bucket.s3.eu-central-1.amazonaws.com/prefix/"
                />
              </label>
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="accessKeyId">
              {(field) => (
                <label className="grid gap-1.5 text-sm">
                  <span className="text-muted-foreground">Access Key</span>
                  <Input
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isSubmitting}
                    placeholder="AKIA..."
                  />
                </label>
              )}
            </form.Field>

            <form.Field name="secretAccessKey">
              {(field) => (
                <label className="grid gap-1.5 text-sm">
                  <span className="text-muted-foreground">Secret Key</span>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      className="pr-10"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      onBlur={field.handleBlur}
                      disabled={isSubmitting}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                      onClick={() => setShowSecret((previous) => !previous)}
                      disabled={isSubmitting}
                      variant="ghost"
                    >
                      {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </label>
              )}
            </form.Field>
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <DialogPrimitiveFooter>
            {connection && (
              <Button type="button" onClick={() => setOpen(false)} disabled={isSubmitting} variant="outline">
                Close
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Testing...' : 'Connect'}
            </Button>
          </DialogPrimitiveFooter>
        </form>
      </Dialog>
    </>
  );
}

export { SignInDialog };
