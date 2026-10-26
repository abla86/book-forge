# Security Policy — Trusity sub-application

Trusity is an AI-assisted presentation sub-application. Generated slides, claims, references, images and exports require human review; successful generation is not proof of accuracy or licensing clearance.

- Keep `GEMINI_API_KEY` server-side and out of Git history.
- Do not submit confidential or personal information to AI providers without reviewing provider terms, retention and lawful basis.
- Treat imported content and model output as untrusted; sanitize before rendering HTML and review exports before sharing.
- Report suspected vulnerabilities privately through GitHub private vulnerability reporting if enabled, otherwise contact the maintainer privately. Redact secrets and personal data.

Passing tests does not establish production security, factual correctness or privacy compliance.
