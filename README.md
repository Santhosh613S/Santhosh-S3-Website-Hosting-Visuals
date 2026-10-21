# S3 Website Hosting Visuals

An animated, beginner-friendly walkthrough of how a static website (here, **Stratus**, a weather-streaming landing page) is hosted with **Amazon S3**, **Amazon CloudFront** and **Amazon Route 53**. No build step, no dependencies: plain HTML, CSS and JavaScript.

> This is a teaching project. It does **not** deploy anything to AWS. Domains, distribution IDs and addresses are examples.

## What is in the box

- `index.html`, `css/style.css`, `js/app.js`: the interactive architecture walkthrough (one inline SVG, 1100x620).
- `demo/`: the Stratus landing page that the diagram "hosts" (original branding, offline sample data).

## The nine steps

1. **Build the landing page locally.** HTML, CSS, JavaScript and demo images on your computer.
2. **Create an S3 bucket and upload.** A uniquely named bucket holds your files.
3. **Keep the bucket private.** Public S3 website endpoints are HTTP-only and let anyone read objects directly. A private bucket with Block Public Access ON is safer.
4. **Create a CloudFront distribution.** Use the S3 *REST* endpoint as origin with Origin Access Control (OAC).
5. **Root object and HTTPS.** Default root object `index.html`; viewer protocol policy "Redirect HTTP to HTTPS".
6. **Edge caching.** Cache hits are served from a nearby edge location. Misses are fetched from S3, then cached.
7. **Domain and hosted zone.** Register or reuse a domain and create a Route 53 public hosted zone.
8. **ACM certificate and alias.** Request a certificate in **us-east-1**, validate by DNS, add the alternate domain name to CloudFront, create an A/AAAA alias record in Route 53.
9. **The whole journey.** Visitor, DNS lookup, CloudFront edge, private S3 on a miss, browser renders the page. Repeat visits are hits.

## Packet legend

| Icon | Meaning |
|---|---|
| ✉️ | Browser request |
| 🌐 | DNS lookup |
| ⚡ | Edge cache hit |
| 📁 | S3 file |
| 🔒 | HTTPS security |
| 🎞️ | Landing page response |

DNS and HTTP are separate. Route 53 only answers "what address is this name?". It never proxies or carries website traffic; the browser then sends HTTPS requests to CloudFront.

## Run locally

```bash
cd "S3 Website Hosting Visuals"
python3 -m http.server 8000
```

Open <http://localhost:8000> (walkthrough) and <http://localhost:8000/demo/> (demo site). Opening the files directly also works.

## Publish on GitHub Pages

1. Create a repository and push this folder's contents to the `main` branch.
2. Settings > Pages > Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Visit `https://<user>.github.io/<repo>/`. The `.nojekyll` file stops Jekyll from processing the site.

## Host the demo on AWS (S3 + CloudFront + Route 53)

1. **Bucket:** S3 > Create bucket (unique name, your region). Keep **Block all public access ON** and ACLs disabled. Do not enable static website hosting.
2. **Upload** the contents of `demo/` (so `index.html` sits at the bucket root): console upload or `aws s3 sync demo/ s3://YOUR-BUCKET`.
3. **CloudFront:** Create distribution. Origin = the bucket's REST endpoint (`YOUR-BUCKET.s3.REGION.amazonaws.com`). Origin access = **Origin access control**, create a new OAC (sign requests). Viewer protocol policy = Redirect HTTP to HTTPS. Cache policy = CachingOptimized. Default root object = `index.html`.
4. **Bucket policy:** copy the policy CloudFront offers, which looks like:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "AllowCloudFrontServicePrincipal",
       "Effect": "Allow",
       "Principal": { "Service": "cloudfront.amazonaws.com" },
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::YOUR-BUCKET/*",
       "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID" } }
     }]
   }
   ```
5. Test `https://dXXXXXXXX.cloudfront.net`.
6. **Custom domain:** Route 53 > Hosted zones > create a public zone for your domain (update the registrar's name servers if the domain is registered elsewhere).
7. **Certificate:** AWS Certificate Manager in **us-east-1** > Request public certificate > DNS validation > "Create records in Route 53".
8. **Attach:** edit the distribution, add your domain as an *alternate domain name (CNAME)* and select the certificate.
9. **Alias record:** in the hosted zone create an A (and AAAA) record, Alias = yes, target = your CloudFront distribution.
10. Visit `https://your-domain`. After changing files, create a CloudFront invalidation (for example `/*`) or version file names.

Note: with an S3 REST origin, CloudFront only maps the **root** URL to `index.html`; sub-folder URLs need a CloudFront Function or explicit file names. This demo is a single page, so it is fine.

## Architecture

```
Browser --(1 DNS query)--> Route 53 (hosted zone, alias record)
Browser <-(2 CloudFront address)-- Route 53
Browser --(3 HTTPS GET)--> CloudFront edge (ACM certificate)
                              | cache hit: respond
                              | cache miss: OAC-signed GET
                              v
                        Private S3 bucket (Block Public Access ON)
```

## Costs

Pricing changes and varies by region, so check the AWS pricing pages before you build. In general: S3 charges for storage and requests; CloudFront has a monthly free tier and then charges for data out and requests; a Route 53 hosted zone has a small monthly fee plus per-query charges; domain registration is a yearly fee; ACM public certificates are free. A small demo site typically costs very little, but set a billing alarm anyway.

## Security

- Keep the bucket private and use OAC (the older Origin Access Identity is legacy).
- Redirect HTTP to HTTPS and use a valid certificate for your domain.
- Use an IAM user or role with least privilege instead of the root account.
- Consider AWS WAF, response headers policies (HSTS, CSP) and access logging for production sites.
- Never put API keys in front-end JavaScript. A real weather API key would be visible to every visitor, so proxy it through a backend or use a keyless API.

## Project structure

```
S3 Website Hosting Visuals/
  index.html        walkthrough page with the inline SVG diagram
  css/style.css     walkthrough styles (dark/light themes)
  js/app.js         steps, captions, packet animation, auto-play
  demo/             the Stratus landing page being "hosted"
    index.html  style.css  app.js
  .nojekyll  LICENSE  README.md
```

## Customization

- **Step text:** edit the `STEPS` array in `js/app.js`.
- **Packet timing:** edit `PK` (path, icon, duration) and `SCH` (per-step schedule, in seconds).
- **Diagram pieces:** each `<g class="el" data-step="N">` in `index.html` appears from step N onward. Paths live in `<defs>`.
- **Colors:** CSS variables at the top of `css/style.css`; diagram colors are the `.s3`, `.cf`, `.r53`, `.acm` classes.
- **Demo data:** the `C` array in `demo/app.js` holds the sample cities.
- **Accessibility:** focus outlines are visible, and `prefers-reduced-motion` replaces moving packets with still icons.

## License

MIT. See `LICENSE`.
