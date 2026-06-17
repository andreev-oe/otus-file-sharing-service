import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => {
  return {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.S3_BUCKET ?? 'fileshare',
  };
});
