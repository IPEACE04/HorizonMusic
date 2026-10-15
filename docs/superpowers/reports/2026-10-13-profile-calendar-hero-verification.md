# Profile, calendar and landing follow-ups — 2026-10-13

- Profile layout is centered. Image selection, preview, cancel and separate image save use the existing Better Auth user.image field; no schema migration is required.
- POST /api/v1/profile/image checks session ownership, origin, MIME, size and file signatures. Upload paths derive from the authenticated user, never a submitted user id. A failed auth update removes the newly uploaded file; successful responses forward updated session cookies.
- The dedicated public profile-images bucket was created. A generated verification PNG was uploaded, fetched from its public URL and compared byte-for-byte, then removed successfully. Existing room/payment buckets were not modified during verification.
- The navbar uses UserAvatar with a generic fallback for missing or failed images.
- Prompt weights were reduced globally by one step; 200 is now downloaded for the hero. The two requested hero text blocks increased by 4px.
- How it works uses centered headings, three connected gold/black icon blocks, square information cards and a real booking CTA.
- Hero rotates every 3 seconds without navigation, thumbnail or pause controls, as requested. Reduced motion retains a static image.
- The supplied calendar hydration diff showed server weekday "จ." versus client "จันทร์". Weekday/month labels are now deterministic, and a server-provided referenceDate plus UTC+7 calculations keep the first render identical across timezone/ICU differences. The real calendar component was rendered in a regression test under both configurations.

Verification: ESLint and typecheck passed; 13 MJS tests and 88 TS tests passed with 4 existing database integration skips. The final Webpack production build passed and generated 44/44 static pages. Strict Premium audit reported zero findings; git diff --check passed.

Limits: no real browser session was available. Authenticated avatar persistence is covered by route dependency tests, while Storage upload/public-read was tested live. Actual browser upload interaction, calendar hydration and mobile visual/keyboard behavior still need browser verification. No staging, commit or publishing was performed.
