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
import { DEFAULT_REGION, testS3Connection } from '@/lib/s3-object-storage';

const connectionSchema = z.object({
  url: z.string().url('Enter a valid S3 URL.'),
  region: z.string().min(1, 'Region is required.'),
  accessKey: z.string().min(1, 'Access key is required.'),
  secretKey: z.string().min(1, 'Secret key is required.'),
});

type TestState = 'PROGRESS' | 'SUCCESS' | 'ERROR';
type ConnectionFormValues = { url: string; region: string; accessKey: string; secretKey: string };

function toConnectionFormValues(
  connection: ReturnType<typeof useS3ConnectionsStore.getState>['connection'],
): ConnectionFormValues {
  if (!connection) {
    return { url: '', region: DEFAULT_REGION, accessKey: '', secretKey: '' };
  }
  return {
    accessKey: connection.accessKey,
    region: connection.region?.trim() || DEFAULT_REGION,
    secretKey: connection.secretKey,
    url: connection.url,
  };
}

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

type SignInDialogProps = { open: boolean; onOpen: (next: boolean) => void };
function SignInDialog({ open, onOpen }: SignInDialogProps) {
  const connection = useS3ConnectionsStore((state) => state.connection);
  const saveConnection = useS3ConnectionsStore((state) => state.saveConnection);

  const [testState, setTestState] = useState<TestState>();
  const [testMessage, setTestMessage] = useState('');

  const form = useForm({
    defaultValues: toConnectionFormValues(connection),
    validators: { onSubmit: connectionSchema },
    onSubmit: ({ value }) => {
      saveConnection({ ...value, region: value.region.trim() || DEFAULT_REGION });
      setTestState(undefined);
      setTestMessage('');
      onOpen(false);
    },
  });

  const runConnectionCheck = useCallback(async () => {
    await form.validate('submit');
    if (!form.state.isValid) {
      setTestState('ERROR');
      setTestMessage(form.state.errorMap.onSubmit?.message[0].message ?? 'Form validation failed.');
      return;
    }

    setTestState('PROGRESS');
    setTestMessage('');
    try {
      await testS3Connection(form.state.values);
      setTestState('SUCCESS');
      setTestMessage('Connection test succeeded.');
    } catch (error) {
      setTestState('ERROR');
      setTestMessage(toRawErrorMessage(error));
    }
  }, [form]);

  useEffect(() => {
    if (open) {
      setTestState(undefined);
      setTestMessage('');
      form.reset(toConnectionFormValues(connection));
    }
  }, [open, form, connection]);

  return (
    <Dialog disablePointerDismissal={!connection} onOpenChange={onOpen} open={open}>
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
                  disabled={testState === 'PROGRESS'}
                  placeholder="https://bucket.s3.eu-central-1.amazonaws.com/prefix/"
                />
              </label>
            )}
          </form.Field>

          <form.Field name="region">
            {(field) => (
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">Region</span>
                <Input
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  disabled={testState === 'PROGRESS'}
                  placeholder={DEFAULT_REGION}
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
                    disabled={testState === 'PROGRESS'}
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
                    disabled={testState === 'PROGRESS'}
                    placeholder="••••••••"
                  />
                </label>
              )}
            </form.Field>
          </div>

          {testState === 'ERROR' && testMessage && <p className="text-sm text-destructive">{testMessage}</p>}
          {testState === 'SUCCESS' && testMessage && <p className="text-sm text-emerald-700">{testMessage}</p>}

          <DialogFooter>
            {connection && (
              <Button type="button" onClick={() => onOpen(false)} disabled={testState === 'PROGRESS'} variant="outline">
                Close
              </Button>
            )}
            <Button
              type="button"
              disabled={testState === 'PROGRESS'}
              onClick={() => {
                void runConnectionCheck();
              }}
              variant="outline"
            >
              {testState === 'PROGRESS' ? 'Testing...' : 'Test'}
            </Button>
            <Button type="submit" disabled={testState === 'PROGRESS'}>
              Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SignInDialog };
