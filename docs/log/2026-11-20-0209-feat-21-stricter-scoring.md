# Stricter scoring

- **Who:** Raphael (with Claude Code)
- **PR / issue:** #21
- **What:** Practice now scores the last second of movement with one time offset, stricter angles (full marks within 20°, zero at 70°), limbs weighted by how much the dancer moves them, and a movement check. Standing still no longer passes.
- **Why:** On the "bisou" trend, standing still, the mirrored dance and the wrong part of the dance all passed every move.
- **Notes:** All thresholds are in `lib/pose/config.ts`; tune them with real people. `bestMatch` is gone: use `scoreSegment` (`lib/pose/segment.ts`), which returns `lagMs` instead of `matchT`.
