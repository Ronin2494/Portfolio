# BadBunny Creator Studio — Firebase email-link sign-in

## Live links
- Creator Studio: https://badbunny.work/studio.html
- Public gallery: https://badbunny.work/#membership
- Backend: https://badbunny-membership-api.onrender.com
- Backend Render settings: https://dashboard.render.com/web/srv-dbbc8te7bikc7381a000
- Firebase project: https://console.firebase.google.com/project/portfolio-449e6/overview

## Sign-in configuration (Firebase Console)
1. In Firebase project **portfolio-449e6**, open Authentication → Sign-in method.
2. Enable **Email/Password** AND **Email link (passwordless sign-in)**, then save.
3. Under Authentication → Settings → Authorized domains add:
   - `badbunny.work`
   - `www.badbunny.work`
   - `deepak-portfolio-819w.onrender.com`
   Firebase typically provides `portfolio-449e6.firebaseapp.com` automatically.
4. Check that Firebase email action links work for the domain. The link opens /studio.html. When the user clicks it, Firebase verifies the email; the backend *also* verifies the signed Firebase ID token and `email_verified`.
5. Configure your Firebase project's email sender display name and email templates in Authentication → Templates as desired. No Resend account or service-account JSON is needed.

## API Render Environment
| Key | Required value |
|---|---|
| `FIREBASE_PROJECT_ID` | `portfolio-449e6` |
| `ADMIN_EMAIL` | `deepaksharma2494@gmail.com` (only this account is allowed to publish) |
| `MONGODB_URI` | MongoDB Atlas connection (secret; already provisioned) |
| `MONGODB_DB` | `badbunny_membership` |
| `SESSION_SECRET` | Strong random secret of 32+ characters, for private media tickets |
| `CORS_ORIGINS` | `https://badbunny.work,https://www.badbunny.work,https://deepak-portfolio-819w.onrender.com` |

The legacy `RESEND_API_KEY`, `MAIL_FROM`, `STRIPE_*` settings are no longer needed. Never paste MongoDB credentials or private keys into source code or this chat. The Firebase web `apiKey` is public project configuration, **not** a Firebase Admin SDK secret.

## Data and authorization model
- The browser requests an email sign-in link using Firebase Auth.
- When clicked, the browser completes the email-link flow using `signInWithEmailLink`.
- Each protected API request carries a short-lived **Firebase ID token**.
- The API validates RS256 signature against Google's Firebase Secure Token public keys and verifies issuer, audience, expiry, `email_verified`, and exact administrator email.
- The API does not trust a browser-supplied email or session flag.
- Media is privately stored in MongoDB GridFS; its original bytes are never directly exposed in the public gallery. The owner's private preview uses a short-lived signed access ticket.
- The public `GET /api/gallery` only returns metadata such as title, media type, description, price in CAD cents, and per-item PayPal payment link.

## Uploader
Creator Studio supports JPEG, PNG, WebP, GIF, MP4, WebM, or MOV (up to 100 MB), local preview, title, description, price (CA$1–CA$1,000), PayPal link, upload progress, published-media list, private preview, edit and delete.

## Important PayPal limitation
A PayPal `/ncp/payment/...` link is **one-time and has a checkout amount configured in PayPal**. Changing the label in the gallery cannot adjust what PayPal charges. For a different price, provide a matching per-item PayPal payment link. PayPal checkout does NOT automatically unlock the original media; payment verification and per-item customer entitlement fulfillment have not yet been built.

## Final test checklist
1. In Firebase Console, enable email-link method and authorize the domains above.
2. Open https://badbunny.work/studio.html; send the sign-in link to the creator email.
3. Click the email link (in the same browser or enter the same email if using a different browser).
4. The creator workspace should open. A different verified Firebase email should be rejected by the API.
5. Upload a test photo at CA$10.00 with a PayPal link configured for that price; check the locked gallery card at https://badbunny.work/#membership.
6. Upload a short test video and check type, price and gallery card.
7. Preview both original files inside Studio, edit their prices/PayPal links, then delete test entries; ensure their cards disappear.
8. Test rejected unauthenticated uploads, oversized media and unsupported file formats.

**Firebase Spark free-plan email-link sending is limited to five emails/day.** Firebase's official limits page documents current quota and Blaze upgrade requirements: https://firebase.google.com/docs/auth/limits.
