import { registerAs } from '@nestjs/config';
import { DEFAULT_S3_BUCKET, DEFAULT_S3_REGION } from './config.consts';

export default registerAs('s3', () => {
  return {
    endpoint: process.env.S3_ENDPOINT,
    publicEndpoint:
      process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? DEFAULT_S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.S3_BUCKET ?? DEFAULT_S3_BUCKET,
  };
});
