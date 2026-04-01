import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { useS3ConnectionsStore } from '@/lib/s3-connections-store';
import { testS3Connection } from '@/lib/s3-object-storage';

const connectionSchema = z.object({
  url: z.string().url('Enter a valid S3 URL.'),
  accessKey: z.string().min(1, 'Access key is required.'),
  secretKey: z.string().min(1, 'Secret key is required.'),
});

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

type SignInDialogProps = { open: boolean; onOpenChange: (nextOpen: boolean) => void };

function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const connection = useS3ConnectionsStore((state) => state.connection);
  const saveConnection = useS3ConnectionsStore((state) => state.saveConnection);

  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const form = useForm({
    defaultValues: connection ?? { url: '', accessKey: '', secretKey: '' },
    onSubmit: async ({ value }) => {
      const parsed = connectionSchema.safeParse(value);
      if (!parsed.success) {
        setSubmitError(parsed.error.issues[0]?.message ?? 'Invalid connection values.');
        return;
      }
      setIsSubmitting(true);
      setSubmitError(undefined);
      try {
        await testS3Connection(parsed.data);
        saveConnection(parsed.data);
        onOpenChange(false);
      } catch (error) {
        setSubmitError(toRawErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
  });
  const resetForm = useCallback(() => {
    setSubmitError(undefined);
    form.reset(connection ?? { url: '', accessKey: '', secretKey: '' });
  }, [connection, form]);

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  return (
    <Dialog disablePointerDismissal={!connection} onOpenChange={onOpenChange} open={open}>
      <DialogContent className="p-0">
        <DialogHeader>
          <DialogTitle>Connect to S3</DialogTitle>
          <DialogDescription>
            Credentials stay in localStorage in your browser; only direct requests are sent to your object storage.
          </DialogDescription>
        </DialogHeader>
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
            <form.Field name="accessKey">
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

            <form.Field name="secretKey">
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

          <DialogFooter>
            {connection && (
              <Button type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting} variant="outline">
                Close
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Testing...' : 'Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SignInDialog };
