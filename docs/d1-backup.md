# D1 Backup (GitHub Actions)

This repository includes a nightly backup of the Cloudflare D1 database.
The workflow exports the DB to a .sql file and stores it as a GitHub artifact
kept for 90 days.

## Required secrets

Add these repository secrets in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `D1_DATABASE_NAME`

The API token must have permission to read D1 databases.

## Manual run

You can run the backup from GitHub Actions using "Run workflow".

## Restore (manual)

From a machine with Wrangler configured:

```bash
wrangler d1 import <D1_DATABASE_NAME> ./path/to/backup.sql
```

For restores, the API token needs D1 write permission.
