# Contributing

Thanks for helping keep this directory accurate and complete.

## Submit a Hackathon (Easiest)

1. [Open a new issue](../../issues/new?template=submit-hackathon.yml)
2. Paste the hackathon URL
3. Our bot extracts the details and opens a PR automatically

That's it. No manual data entry needed.

## Add a Hackathon via PR

If you prefer to submit directly:

1. Fork this repo
2. Create a JSON file in `data/hackathons/` following the schema
3. Run `npm run generate` to regenerate the README and site
4. Open a PR

### JSON Schema

Each hackathon file must include at minimum:

```json
{
  "id": "my-hackathon-name",
  "name": "My Hackathon Name",
  "organizer": "Organizer Name",
  "url": "https://hackathon-page.com",
  "status": "registration_open",
  "format": "virtual",
  "categories": ["ai-agents"],
  "source": "manual",
  "lastUpdated": "2026-02-08",
  "confidence": 0.9
}
```

See `src/types.ts` for the full schema with all optional fields (prize pool, blockchain info, deadlines, etc.)

## Add a New Scraper Source

To add a new platform or blockchain ecosystem:

1. Create a new file in `src/scrapers/`
2. Export an async function that scrapes the source
3. Use `extractFromContent()` from `src/extract.ts` for LLM-powered extraction
4. Use `processExtraction()` from `src/dedup.ts` for deduplication
5. Add the scraper to `src/scrape-all.ts`
6. Add the source to the GitHub Actions workflow

## Development

```bash
npm install

# Run a single scraper
npm run scrape:devpost

# Submit a URL manually
npm run submit -- https://example.com/hackathon

# Update lifecycle statuses
npm run lifecycle

# Regenerate README + site
npm run generate

# Full update cycle
npm run update
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes (for scraping) | LLM extraction via Claude |
| `SERP_API_KEY` | Optional | Web search discovery |
