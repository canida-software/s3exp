import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { BrowserShell, type BrowserEntry, type ConnectionFormValues } from '@/components/s3-browser-shell';
import { selectActiveConnection, type S3Connection, type S3ConnectionInput, useS3ConnectionsStore } from '@/lib/s3-connections-store';

type ParsedS3Url = {
  basePrefix: string;
  bucket: string;
  endpoint: string;
  region: string;
};

const ROOT_PATH = '/';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_FORM_VALUES: ConnectionFormValues = {
  accessKeyId: '',
  secretAccessKey: '',
  url: '',
};

function normalizePath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : ROOT_PATH;
}

function pathToPrefix(path: string, basePrefix: string): string {
  if (path === ROOT_PATH) {
    return basePrefix;
  }
  return `${basePrefix}${path.slice(1)}/`;
}

function parentPath(path: string): string {
  if (path === ROOT_PATH) {
    return ROOT_PATH;
  }
  const segments = path.slice(1).split('/');
  segments.pop();
  return segments.length > 0 ? `/${segments.join('/')}` : ROOT_PATH;
}

function childPath(path: string, directoryName: string): string {
  return path === ROOT_PATH ? normalizePath(directoryName) : normalizePath(`${path}/${directoryName}`);
}

function formatFileSize(sizeInBytes?: number): string {
  if (sizeInBytes === undefined) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = sizeInBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formattedValue = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formattedValue} ${units[unitIndex]}`;
}

function formatModifiedDate(value?: Date): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

type KnownS3Error = {
  $metadata?: { httpStatusCode?: number };
  Code?: string;
  code?: string;
  message?: string;
  name?: string;
};

function isKnownS3Error(error: unknown): error is KnownS3Error {
  return typeof error === 'object' && error !== null;
}

function toLowerCaseValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function toErrorMessage(error: unknown): string {
  if (isKnownS3Error(error)) {
    const errorCode = error.Code ?? error.code ?? error.name ?? '';
    const errorMessage = error.message ?? '';
    const errorCodeLower = toLowerCaseValue(errorCode);
    const errorMessageLower = toLowerCaseValue(errorMessage);
    const statusCode = error.$metadata?.httpStatusCode;

    if (
      errorMessageLower.includes('failed to fetch') ||
      errorMessageLower.includes('networkerror') ||
      errorMessageLower.includes('cors')
    ) {
      return 'Request blocked by CORS or network. Configure bucket CORS to allow this origin (for example http://localhost:5173) and methods GET/HEAD.';
    }

    if (errorCodeLower === 'invalidaccesskeyid') {
      return 'Invalid access key ID.';
    }

    if (errorCodeLower === 'signaturedoesnotmatch') {
      return 'Signature mismatch. Check secret key and URL.';
    }

    if (errorCodeLower === 'expiredtoken') {
      return 'Credentials expired. Use fresh credentials.';
    }

    if (errorCodeLower === 'nosuchbucket') {
      return 'Bucket not found. Check the URL bucket name.';
    }

    if (errorCodeLower === 'authorizationheadermalformed' || errorCodeLower === 'permanentredirect') {
      return 'Region mismatch. Check the region in your S3 URL.';
    }

    if (errorCodeLower === 'accessdenied' || statusCode === 403) {
      return 'Access denied. Check credentials and s3:ListBucket permission on the bucket.';
    }

    if (statusCode === 404) {
      return 'Bucket or path not found.';
    }

    if (errorMessage.length > 0) {
      return errorMessage;
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return 'Unable to list objects.';
}

function parseS3Url(rawUrl: string): ParsedS3Url {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL. Use an S3 URL like https://bucket.s3.eu-central-1.amazonaws.com/prefix/');
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('URL must start with http:// or https://');
  }

  const host = parsedUrl.hostname;
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

  const virtualHostedMatch = host.match(/^(.+)\.(s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com)$/i);
  const pathStyleMatch = host.match(/^(s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com)$/i);

  let bucket = '';
  let endpointHost = '';
  let prefixSegments: string[] = [];

  if (virtualHostedMatch) {
    bucket = decodeURIComponent(virtualHostedMatch[1]);
    endpointHost = virtualHostedMatch[2];
    prefixSegments = pathSegments;
  } else if (pathStyleMatch) {
    if (pathSegments.length === 0) {
      throw new Error('S3 URL must include the bucket name.');
    }
    bucket = decodeURIComponent(pathSegments[0]);
    endpointHost = pathStyleMatch[1];
    prefixSegments = pathSegments.slice(1);
  } else {
    throw new Error('Unsupported S3 URL format. Use virtual-hosted or path-style S3 URL.');
  }

  const regionMatch = endpointHost.match(/^s3[.-]([a-z0-9-]+)\.amazonaws\.com$/i);
  const region = regionMatch?.[1] ?? DEFAULT_REGION;
  const basePrefix = prefixSegments.length > 0 ? `${prefixSegments.join('/')}/` : '';

  return {
    basePrefix,
    bucket,
    endpoint: `${parsedUrl.protocol}//${endpointHost}`,
    region,
  };
}

function toFormValues(connection: S3Connection | null): ConnectionFormValues {
  if (!connection) {
    return DEFAULT_FORM_VALUES;
  }
  return {
    accessKeyId: connection.accessKeyId,
    secretAccessKey: connection.secretAccessKey,
    url: connection.url,
  };
}

function toConnectionInput(values: ConnectionFormValues): S3ConnectionInput {
  return {
    accessKeyId: values.accessKeyId,
    secretAccessKey: values.secretAccessKey,
    url: values.url,
  };
}

function createS3Client(connection: S3ConnectionInput) {
  const target = parseS3Url(connection.url);
  const client = new S3Client({
    credentials: {
      accessKeyId: connection.accessKeyId,
      secretAccessKey: connection.secretAccessKey,
    },
    endpoint: target.endpoint,
    forcePathStyle: true,
    region: target.region,
  });
  return { client, target };
}

async function fetchEntries(connection: S3Connection, path: string): Promise<BrowserEntry[]> {
  const { client, target } = createS3Client(connection);
  const prefix = pathToPrefix(path, target.basePrefix);
  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: target.bucket,
      Delimiter: '/',
      Prefix: prefix || undefined,
    }),
  );

  const directoryEntries: BrowserEntry[] = (result.CommonPrefixes ?? [])
    .map((prefixEntry) => prefixEntry.Prefix)
    .filter((prefixValue): prefixValue is string => Boolean(prefixValue))
    .map((prefixValue) => prefixValue.slice(prefix.length).replace(/\/$/, ''))
    .filter((name) => name.length > 0)
    .map((name) => ({ key: `${prefix}${name}/`, kind: 'directory', name }));

  const fileEntries: BrowserEntry[] = (result.Contents ?? [])
    .filter((objectValue): objectValue is { Key: string; LastModified?: Date; Size?: number } => Boolean(objectValue.Key))
    .filter((objectValue) => objectValue.Key !== prefix)
    .map((objectValue) => ({
      key: objectValue.Key,
      kind: 'file' as const,
      lastModified: objectValue.LastModified,
      name: prefix ? objectValue.Key.slice(prefix.length) : objectValue.Key,
      size: objectValue.Size,
    }))
    .filter((objectValue) => objectValue.name.length > 0 && !objectValue.name.includes('/'));

  return [...directoryEntries, ...fileEntries].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

async function testConnection(connection: S3ConnectionInput): Promise<void> {
  const { client, target } = createS3Client(connection);
  await client.send(
    new ListObjectsV2Command({
      Bucket: target.bucket,
      MaxKeys: 1,
      Prefix: target.basePrefix || undefined,
    }),
  );
}

function App() {
  const connection = useS3ConnectionsStore(selectActiveConnection);
  const saveConnection = useS3ConnectionsStore((state) => state.saveConnection);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState<boolean>(
    () => selectActiveConnection(useS3ConnectionsStore.getState()) === null,
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BrowserEntry[]>([]);
  const [formValues, setFormValues] = useState<ConnectionFormValues>(() =>
    toFormValues(selectActiveConnection(useS3ConnectionsStore.getState())),
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [path, setPath] = useState(ROOT_PATH);

  const updateFormValue = useCallback((field: keyof ConnectionFormValues, value: string) => {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const openConnectionDialog = useCallback(() => {
    setConnectionError(null);
    setFormValues(toFormValues(connection));
    setConnectionDialogOpen(true);
  }, [connection]);

  const loadEntries = useCallback(async () => {
    if (!connection) {
      return;
    }
    setIsLoading(true);
    setListError(null);
    try {
      setEntries(await fetchEntries(connection, path));
    } catch (error) {
      setEntries([]);
      setListError(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [connection, path]);

  useEffect(() => {
    if (!connection) {
      setEntries([]);
      setIsLoading(false);
      setListError(null);
      return;
    }
    void loadEntries();
  }, [connection, loadEntries]);

  const handleConnectionSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const connectionInput = toConnectionInput(formValues);
      if (!connectionInput.url || !connectionInput.accessKeyId || !connectionInput.secretAccessKey) {
        setConnectionError('Please fill URL, access key, and secret key.');
        return;
      }

      setIsConnecting(true);
      setConnectionError(null);
      try {
        await testConnection(connectionInput);
        const savedConnection = saveConnection(connectionInput);
        setFormValues(toFormValues(savedConnection));
        setPath(ROOT_PATH);
        setConnectionDialogOpen(false);
      } catch (error) {
        setConnectionError(toErrorMessage(error));
      } finally {
        setIsConnecting(false);
      }
    },
    [formValues, saveConnection],
  );

  return (
    <BrowserShell
      connection={connection}
      connectionDialogOpen={connectionDialogOpen}
      connectionError={connectionError}
      entries={entries}
      formValues={formValues}
      formatFileSize={formatFileSize}
      formatModifiedDate={formatModifiedDate}
      goToParentDirectory={() => setPath((previous) => parentPath(previous))}
      isConnecting={isConnecting}
      isLoading={isLoading}
      listError={listError}
      onCloseDialog={() => setConnectionDialogOpen(false)}
      onOpenConnectionDialog={openConnectionDialog}
      onOpenDirectory={(directoryName) => setPath((previous) => childPath(previous, directoryName))}
      onRefresh={() => void loadEntries()}
      onSubmitConnection={handleConnectionSubmit}
      path={path}
      rootPath={ROOT_PATH}
      updateFormValue={updateFormValue}
    />
  );
}

export default App;
