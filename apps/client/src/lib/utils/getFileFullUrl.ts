/**
 * Builds the full URL for a file key. Uses CloudFront when NEXT_PUBLIC_CLOUDFRONT_DOMAIN is set,
 * otherwise falls back to direct S3 URL. Use for public assets (avatars, thumbnails, gallery, etc.).
 */
export function getFileFullUrl(fileKey?: string): string {
  if (!fileKey) {
    return '';
  }

  // Check if it's already a valid URL (contains http:// or https://)
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    return fileKey;
  }

  const key = fileKey.replace(/^\//, '');

  // Prefer CloudFront when configured
  const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
  if (cloudfrontDomain) {
    const base = cloudfrontDomain.startsWith('http')
      ? cloudfrontDomain
      : `https://${cloudfrontDomain}`;
    return `${base.replace(/\/$/, '')}/${key}`;
  }

  // Fallback: direct S3 URL
  const bucket = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_S3_REGION;
  if (!bucket || !region) return '';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
