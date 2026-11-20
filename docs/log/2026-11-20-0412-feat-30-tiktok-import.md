# Add trends from TikTok links

- **Who:** oryackov-cell
- **PR / issue:** #30
- **What:** Added a server-side TikTok import for full video URLs and `vm.tiktok.com` and `vt.tiktok.com` short links. Imported MP4s use the same browser processing and Save flow as uploads.
- **Why:** Demo users can start with a link they already have and still choose a local MP4 if a download fails.
- **Notes:** The Docker runner includes a pinned `yt-dlp` release. Test with a public video under 90 seconds that shows a single dancer.
