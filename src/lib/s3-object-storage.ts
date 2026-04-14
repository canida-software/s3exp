import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

import { type S3Connection } from '@/lib/s3-connections-store';

export type FileEntry = { type: 'FILE' | 'DIR'; path: string; size?: number; modified?: number };

export const DEFAULT_REGION = 'eu-central-1';

function createS3Client(connection: S3Connection) {
  return new S3Client({
    bucketEndpoint: true,
    credentials: { accessKeyId: connection.accessKey, secretAccessKey: connection.secretKey },
    endpoint: connection.url,
    region: connection.region ?? 'us-central-1',
  });
}

export async function testS3Connection(connection: S3Connection): Promise<void> {
  const client = createS3Client(connection);
  await client.send(new ListObjectsV2Command({ Bucket: connection.url, MaxKeys: 1 }));
}

export async function fetchS3Entries(connection: S3Connection, path: string): Promise<FileEntry[]> {
  const client = createS3Client(connection);
  const result = await client.send(new ListObjectsV2Command({ Bucket: connection.url, Delimiter: '/', Prefix: path }));

  const directoryEntries: FileEntry[] = (result.CommonPrefixes ?? [])
    .filter((entry) => entry.Prefix !== undefined)
    .map((entry) => entry.Prefix)
    .filter((prefix) => prefix !== undefined)
    .map((prefix) => ({ type: 'DIR' as const, path: prefix }));

  const fileEntries: FileEntry[] = (result.Contents ?? [])
    .filter((objectValue) => objectValue.Key !== path)
    .map((objectValue) => ({
      type: 'FILE' as const,
      path: objectValue.Key ?? '',
      modified: objectValue.LastModified?.getTime(),
      size: objectValue.Size,
    }));

  return [...directoryEntries, ...fileEntries];
}
