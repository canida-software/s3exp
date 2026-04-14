import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { DateTime } from 'luxon';

import { type S3Connection } from '@/lib/s3-connections-store';

type S3Target = { basePrefix: string; bucket: string };

export type FileEntry = { type: 'FILE' | 'DIR'; name: string; size?: number; modified?: number };

export const ROOT_PATH = '/';

export const DEFAULT_REGION = 'eu-central-1';

function createS3Client(connection: S3Connection) {
  const target: S3Target = { basePrefix: '', bucket: connection.url };
  const client = new S3Client({
    bucketEndpoint: true,
    credentials: { accessKeyId: connection.accessKey, secretAccessKey: connection.secretKey },
    endpoint: connection.url,
    region: connection.region ?? 'us-central-1',
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
