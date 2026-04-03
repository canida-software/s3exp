import { useForm } from '@tanstack/react-form';
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
import { PasswordInput } from '@/components/ui/password-input';
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

  const [isTesting, setIsTesting] = useState(false);
  const [testErrorMessage, setTestErrorMessage] = useState<string>();
  const [testSuccessMessage, setTestSuccessMessage] = useState<string>();

  const form = useForm({
    defaultValues: connection ?? { url: '', accessKey: '', secretKey: '' },
    validators: { onSubmit: connectionSchema },
    onSubmit: ({ value }) => {
      saveConnection(value);
      setTestErrorMessage(undefined);
      setTestSuccessMessage(undefined);
      onOpenChange(false);
    },
  });

  const runConnectionCheck = useCallback(async () => {
    await form.validate('submit');
    if (!form.state.isValid) {
      setTestSuccessMessage(undefined);
      setTestErrorMessage('Please fix the form values before testing.');
      return;
    }

    setIsTesting(true);
    setTestErrorMessage(undefined);
    setTestSuccessMessage(undefined);
    try {
      await testS3Connection(form.state.values);
      setTestSuccessMessage('Connection test succeeded.');
    } catch (error) {
      setTestErrorMessage(toRawErrorMessage(error));
    } finally {
      setIsTesting(false);
    }
  }, [form]);
  const hasValidationError = Boolean(form.state.errorMap.onSubmit);

  const resetForm = useCallback(() => {
    setIsTesting(false);
    setTestErrorMessage(undefined);
    setTestSuccessMessage(undefined);
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
                  disabled={isTesting}
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
                    disabled={isTesting}
                    placeholder="AKIA..."
                  />
                </label>
              )}
            </form.Field>

            <form.Field name="secretKey">
              {(field) => (
                <label className="grid gap-1.5 text-sm">
                  <span className="text-muted-foreground">Secret Key</span>
                  <PasswordInput
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isTesting}
                    placeholder="••••••••"
                  />
                </label>
              )}
            </form.Field>
          </div>

          {hasValidationError && <p className="text-sm text-destructive">Please fix the form values.</p>}
          {testErrorMessage && <p className="text-sm text-destructive">{testErrorMessage}</p>}
          {testSuccessMessage && <p className="text-sm text-emerald-700">{testSuccessMessage}</p>}

          <DialogFooter>
            {connection && (
              <Button type="button" onClick={() => onOpenChange(false)} disabled={isTesting} variant="outline">
                Close
              </Button>
            )}
            <Button
              type="button"
              disabled={isTesting}
              onClick={() => {
                void runConnectionCheck();
              }}
              variant="outline"
            >
              {isTesting ? 'Testing...' : 'Test'}
            </Button>
            <Button type="submit" disabled={isTesting}>
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SignInDialog };
