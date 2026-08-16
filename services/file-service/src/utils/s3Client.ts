import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../../../../libs/shared/config';

const cfg = getConfig();
const s3cfg = cfg.s3;

const client = new S3Client({
  endpoint: s3cfg.endpoint,
  region: s3cfg.region || 'us-east-1',
  credentials: {
    accessKeyId: s3cfg.accessKey,
    secretAccessKey: s3cfg.secretKey,
  },
  forcePathStyle: !!s3cfg.forcePathStyle,
});

export async function getSignedUploadUrl(key: string, contentType: string, expiresSeconds = 900) {
  const cmd = new PutObjectCommand({ Bucket: s3cfg.bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(client, cmd, { expiresIn: expiresSeconds });
  return url;
}

export async function deleteObject(key: string) {
  const cmd = new DeleteObjectCommand({ Bucket: s3cfg.bucket, Key: key });
  await client.send(cmd);
}
