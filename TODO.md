# Remaining Bug Fixes & Improvements

## Current Status (from analysis)

- Server runs on :3000, DB connected
- Tests: 8/20 pass (JS DOM flaky, core OK)
- RAG pipeline: Extracts PDF, splits, embeds, queries EN/AM
- Imports: User.create commented out

## Manual RAG smoke test (E2E)

- **Sample file:** place `user-agreement-7-1.pdf` in `dev-data/samples/` (see `dev-data/samples/README.md`). Upload it on `/chat`, run ingest, then ask questions grounded in the agreement.
- **Config:** `config.env` — database, `JWT_SECRET`, embeddings API if used, `PORT`.

## Step-by-Step Plan

- [x] Step 1: Fix dev-data/import-dev-data-fixed.js (uncomment User.create) - Success ✅\n- [x] Step 2: Clean model/documentsModel.js (remove fix comments) ✅\n- [x] Step 3: Enhance services/splitterService.js (paragraph split + lang tag for Amharic) ✅\n- [ ] Step 4: Clean console.logs (minor)\n- [x] Step 5: Test imports `npm run dev-data -- --import` - Success ✅\n- [ ] Step 6: Run RAG test `node _test_rag.js`\n- [x] Step 7: Run full tests `npm test` - 29/29 PASS ✅\n- [ ] Step 8: Start dev server `npm run start:dev`\n- [ ] Step 9: Verify localhost:3000 + upload/RAG flow

## Completion Criteria

- All steps checked
- No TODO comments left
- Tests pass or acceptable
- Server + core flows work
