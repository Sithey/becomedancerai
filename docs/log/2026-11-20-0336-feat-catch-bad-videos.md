# Catch bad videos before processing and upload

- **Who:** Antigravity
- **PR / issue:** Catch bad videos before the long processing and the upload
- **What:** Added client-side duration validation (max 30 s), pose detection rate check (min 50%), title maxLength (80), and styled error container with a "Choose another video" reset button.
- **Why:** Rejects invalid videos before long browser pose extraction and upload, preventing wasted processing time and showing clear error feedback with a quick form reset.
- **Notes:** Duration limit set to 30 seconds as requested.
