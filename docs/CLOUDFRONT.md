# CloudFront setup for S3 assets

The app uses **S3** for uploads and **CloudFront** (optional) for serving file URLs. When configured, both public and private content can be served via CloudFront.

## Behavior

- **Uploads** still go to S3 (presigned `putObject` or server-side upload). No change.
- **Public URLs** (avatars, course thumbnails, gallery, etc.):
  - **Server:** `FileService.getPublicFileUrl(fileKey)` and the `url` from `uploadToS3()` use CloudFront when `CLOUDFRONT_DOMAIN` is set.
  - **Client:** `getFileFullUrl(fileKey)` uses `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` when set.
- **Private content** (course videos, assignments, etc. via `file.getFileUrl`):
  - When `CLOUDFRONT_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID`, and `CLOUDFRONT_PRIVATE_KEY` are all set, the server returns a **CloudFront signed URL** (1-hour expiry).
  - Otherwise it falls back to an **S3 presigned** `getObject` URL.

## AWS setup (summary)

### 1. CloudFront distribution

1. Create a **CloudFront distribution** with your S3 bucket as origin.
2. Restrict S3 bucket access (e.g. OAC – Origin Access Control) so the bucket is only reachable via CloudFront.
3. Set cache behavior and (optional) custom domain.

### 2. Private content: signed URLs

To use CloudFront for **private** content (e.g. course videos), you need a **trusted key group** and key pair:

1. In **CloudFront** → your distribution → **Behaviors** → edit the default (or relevant) behavior → **Restrict viewer access**:
   - Set to **Yes** and choose **Signed URLs** (and optionally signed cookies).
2. In **AWS Console** → **CloudFront** → **Key management** (or **Public keys** in older UI):
   - Create a **public key** and paste your RSA public key (PEM).
   - Create a **key group** and add that public key.
3. In the behavior’s **Restrict viewer access** setting, attach the **key group**.
4. Create a **key pair** for signing (one-time, AWS gives you the private key once):
   - [CloudFront key pairs (legacy)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html#private-content-creating-cloudfront-key-pair) – create in **Account** → **Security credentials** → **CloudFront key pairs**, or use **trusted key groups** with a key pair you generate yourself (recommended).
   - For **trusted key groups**: generate an RSA key pair (e.g. `openssl genrsa 2048 > private_key.pem` and export the public key in PEM), add the public key in CloudFront **Public keys**, add it to a **key group**, then use the **same** private key and the **key pair ID** (shown in the public key detail) in your app.

Use the **Key pair ID** (from the public key in CloudFront) and the **private key PEM** contents as `CLOUDFRONT_KEY_PAIR_ID` and `CLOUDFRONT_PRIVATE_KEY` below.

## Environment variables

### Server (`apps/server`)

| Variable                     | Required | Description |
|------------------------------|----------|-------------|
| `CLOUDFRONT_DOMAIN`          | No       | CloudFront domain, e.g. `d1234567890.cloudfront.net` or `cdn.yourdomain.com`. No trailing slash. Used for public URLs and for building private signed URLs. |
| `CLOUDFRONT_KEY_PAIR_ID`     | No*      | Key pair ID from CloudFront (public key ID). Required for **private** content via CloudFront. When set with `CLOUDFRONT_PRIVATE_KEY`, `getFileUrl()` returns CloudFront signed URLs. |
| `CLOUDFRONT_PRIVATE_KEY`     | No*      | PEM private key (entire contents of your `.pem` file). In `.env` you can use `\n` for newlines (e.g. `-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----`). *Required for private content via CloudFront.* |

### Client (`apps/client`)

| Variable                         | Required | Description |
|----------------------------------|----------|-------------|
| `NEXT_PUBLIC_CLOUDFRONT_DOMAIN`  | No       | Same as server: CloudFront domain. When set, `getFileFullUrl()` and Next.js `images` remotePatterns use CloudFront. |

If CloudFront vars are not set, the app uses direct S3 URLs (and S3 presigned URLs for private content).
