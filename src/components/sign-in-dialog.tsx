import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { selectActiveConnection, type S3ConnectionInput, useS3ConnectionsStore } from '@/lib/s3-connections-store';
import { testS3Connection } from '@/lib/s3-object-storage';

type ConnectionFormApi = ReturnType<
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

type DialogFormProps = {
  connection: S3ConnectionInput | null;
  form: ConnectionFormApi;
  isSubmitting: boolean;
  setOpen: (value: boolean) => void;
  setShowSecret: (updater: (previous: boolean) => boolean) => void;
  showSecret: boolean;
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

function DialogForm({
  connection,
  form,
  isSubmitting,
  setOpen,
  setShowSecret,
  showSecret,
  submitError,
}: DialogFormProps) {
  return (
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
              disabled={isSubmitting}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="https://bucket.s3.eu-central-1.amazonaws.com/prefix/"
              value={field.state.value}
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
                disabled={isSubmitting}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="AKIA..."
                value={field.state.value}
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
                  className="pr-10"
                  disabled={isSubmitting}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="••••••••"
                  type={showSecret ? 'text' : 'password'}
                  value={field.state.value}
                />
                <Button
                  aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                  disabled={isSubmitting}
                  onClick={() => setShowSecret((previous) => !previous)}
                  type="button"
                  variant="ghost"
                >
                  {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </label>
          )}
        </form.Field>
      </div>

      {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

      <DialogFooter>
        {connection ? (
          <Button disabled={isSubmitting} onClick={() => setOpen(false)} type="button" variant="outline">
            Close
          </Button>
        ) : null}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Testing...' : 'Connect'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SignInDialog() {
  const connection = useS3ConnectionsStore(selectActiveConnection);
  const saveConnection = useS3ConnectionsStore((state) => state.saveConnection);
  const [open, setOpen] = useState<boolean>(() => connection === null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
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
        setOpen(false);
      } catch (error) {
        setSubmitError(toRawErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    form.reset(toDefaultValues(connection));
    if (!connection) {
      setOpen(true);
    }
  }, [connection, form]);

  return (
    <>
      <Button
        onClick={() => {
          setSubmitError(null);
          form.reset(toDefaultValues(connection));
          setOpen(true);
        }}
        type="button"
      >
        Connection
      </Button>

      <Dialog
        disablePointerDismissal={!connection}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !connection) {
            return;
          }
          setOpen(nextOpen);
        }}
        open={open}
      >
        <DialogContent className="p-0">
          <DialogHeader>
            <DialogTitle>Connect to S3</DialogTitle>
            <DialogDescription>
              Credentials stay in localStorage in your browser; only direct requests are sent to your object storage.
            </DialogDescription>
          </DialogHeader>

          <DialogForm
            connection={connection}
            form={form}
            isSubmitting={isSubmitting}
            setOpen={setOpen}
            setShowSecret={setShowSecret}
            showSecret={showSecret}
            submitError={submitError}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { SignInDialog };
