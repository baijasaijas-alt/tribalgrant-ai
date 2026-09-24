# TribalGrant AI — AURA XX

This build keeps the existing applicant/evaluator UI and fixes the demo-breaking workflow end-to-end.

## What is included

- Applicant WhatsApp number is explicitly captured and stored with the dossier.
- Applicant email is captured and used for real transactional decision notifications.
- Approve / Reject / Request Resubmission use confirmation/result popups.
- One admin decision triggers the notification workflow automatically — there is no second Send button.
- Email notifications use the Resend REST API on the server. The UI never claims an email was sent when the provider did not accept it.
- WhatsApp remains an optional integration. If its Cloud API credentials are absent, the UI clearly shows that WhatsApp is not configured instead of faking a send.
- OCR preprocesses uploaded images, retries with a second page-segmentation mode, and stores extracted text as evidence.
- Image focus/quality is measured independently from OCR confidence, so weak OCR does not automatically make a sharp photo look blurry.
- Decision events and successful provider notification events are added to the audit timeline.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Real email notifications

The app sends email from the server through Resend's REST API. Resend documents the `POST https://api.resend.com/emails` flow and supports Next.js/Vercel server functions. See the official documentation: https://resend.com/features/email-api and https://resend.com/vercel.

Add these server-only environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=TribalGrant AI <onboarding@resend.dev>
```

For a real custom sender address, verify your domain with Resend first. Never expose `RESEND_API_KEY` as `NEXT_PUBLIC_*`.

## Automatic decision workflow

```text
Admin clicks Approve / Reject / Request Resubmission
                  ↓
        confirmation / reason popup
                  ↓
        application status updated
                  ↓
     automatic notification attempt
             ↙             ↘
       Email (real)    WhatsApp (optional)
                  ↓
        provider result shown
                  ↓
             audit timeline
```

## WhatsApp

The project contains a server-side WhatsApp Cloud API adapter, but it is intentionally optional. A normal personal WhatsApp Web session is not used for automation. Real WhatsApp delivery requires the appropriate WhatsApp Business Platform/API setup and applicable Meta rules.

If these variables are not present, the system reports **Not configured** rather than pretending a message was delivered:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

## OCR / image quality

OCR runs in the applicant browser with Tesseract.js. Before OCR, the uploaded image is resized and contrast-normalized. A focus measure based on image edges is kept separate from Tesseract confidence. This prevents the common mistake of treating low OCR confidence as proof that the photo is blurry.

## Important production note

The current project still uses process memory for application storage. That is suitable for a local/demo build but is not durable on serverless hosting. A production deployment should use managed database/object storage (for example Supabase) and private document storage.

Final scholarship decisions remain with authorized officers; AI provides evidence, OCR, checks and decision support.

## Hackathon demo fixes
- `/admin` opens in demo mode by default (`DEMO_MODE=true`) without requiring a password. Set `DEMO_MODE=false` for protected officer login.
- Government ID accepts exactly 12 digits.
- Upload Photos uses an explicit browser file picker and creates a compressed preview so document submission is reliable.
- Image preview data is compressed before submission to avoid oversized request bodies.
