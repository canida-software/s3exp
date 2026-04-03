import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { DateTime } from 'luxon';

import { type S3Connection } from '@/lib/s3-connections-store';

type ParsedS3Url = { basePrefix: string; bucket: string; endpoint: string; region: string };

export type FileEntry = { type: 'FILE' | 'DIR'; name: string; size?: number; modified?: number };

export const ROOT_PATH = '/';

const DEFAULT_REGION = 'us-east-1';

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

  return { basePrefix, bucket, endpoint: `${parsedUrl.protocol}//${endpointHost}`, region };
}

function createS3Client(connection: S3Connection) {
  const target = parseS3Url(connection.url);
  const client = new S3Client({
    credentials: { accessKeyId: connection.accessKey, secretAccessKey: connection.secretKey },
    endpoint: target.endpoint,
    forcePathStyle: true,
    region: target.region,
  });
  return { client, target };
}

function pathToPrefix(path: string, basePrefix: string): string {
  if (path === ROOT_PATH) {
    return basePrefix;
  }
  return `${basePrefix}${path.slice(1)}/`;
}

export function normalizePath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : ROOT_PATH;
}

export function parentPath(path: string): string {
  if (path === ROOT_PATH) {
    return ROOT_PATH;
  }
  const segments = path.slice(1).split('/');
  segments.pop();
  return segments.length > 0 ? `/${segments.join('/')}` : ROOT_PATH;
}

export function childPath(path: string, directoryName: string): string {
  return path === ROOT_PATH ? normalizePath(directoryName) : normalizePath(`${path}/${directoryName}`);
}

export function formatFileSize(sizeInBytes?: number): string {
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

export function formatModifiedDate(value?: number): string {
  if (!value) {
    return '—';
  }
  return DateTime.fromMillis(value).toFormat('yyyy-LL-dd HH:mm');
}

export async function testS3Connection(connection: S3Connection): Promise<void> {
  const { client, target } = createS3Client(connection);
  await client.send(
    new ListObjectsV2Command({ Bucket: target.bucket, MaxKeys: 1, Prefix: target.basePrefix || undefined }),
  );
}

export async function fetchDirectoryEntries(connection: S3Connection, path: string): Promise<FileEntry[]> {
  const { client, target } = createS3Client(connection);
  const prefix = pathToPrefix(path, target.basePrefix);
  const result = await client.send(
    new ListObjectsV2Command({ Bucket: target.bucket, Delimiter: '/', Prefix: prefix || undefined }),
  );

  const directoryEntries: FileEntry[] = (result.CommonPrefixes ?? [])
    .map((prefixEntry) => prefixEntry.Prefix)
    .filter((prefixValue): prefixValue is string => Boolean(prefixValue))
    .map((prefixValue) => prefixValue.slice(prefix.length).replace(/\/$/, ''))
    .filter((name) => name.length > 0)
    .map((name) => ({ name, type: 'DIR' as const }));

  const fileEntries: FileEntry[] = (result.Contents ?? [])
    .filter((objectValue): objectValue is { Key: string; LastModified?: Date; Size?: number } =>
      Boolean(objectValue.Key),
    )
    .filter((objectValue) => objectValue.Key !== prefix)
    .map((objectValue) => ({
      modified: objectValue.LastModified?.getTime(),
      name: prefix ? objectValue.Key.slice(prefix.length) : objectValue.Key,
      size: objectValue.Size,
      type: 'FILE' as const,
    }))
    .filter((objectValue) => objectValue.name.length > 0 && !objectValue.name.includes('/'));

  return [...directoryEntries, ...fileEntries].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'DIR' ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}
