import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

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

export async function downloadS3File(connection: S3Connection, path: string): Promise<void> {
  const client = createS3Client(connection);
  const result = await client.send(new GetObjectCommand({ Bucket: connection.url, Key: path }));
  if (!result.Body) throw new Error(`No file body for path "${path}".`);

  const fileName = path.split('/').filter(Boolean).pop() ?? 'download';
  const bytes = await result.Body.transformToByteArray();
  const blob = new Blob([bytes], { type: result.ContentType ?? 'application/octet-stream' });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
