# NSE Market Intelligence

Live at https://nse-tracker.dukaribu.com (nse-tracker.crotich.com redirects
there). See README.md for the stack and the deploy pipeline.

## Infrastructure (applies to all of Collins's repos)

- **We do not use Supabase.** It was temporary. The database is self-hosted
  PostgreSQL and the API runs under pm2 on Collins's own AWS server (the
  shared Dukaribu box, nginx + certbot). Old comments mentioning Supabase
  Edge Functions describe where code was ported from, nothing more.
- GitHub Actions reach the server over SSH with the repo secrets `AWS_HOST`,
  `AWS_USER` and `AWS_SSH_KEY` (other repos call them `SERVER_HOST`,
  `SERVER_USER`, `SERVER_SSH_KEY`). App secrets live in
  `/var/www/nse-tracker/api/.env` on the server, never in git.
- `main` deploys itself through a signed webhook (`deploy/deploy.sh`). Feature
  work goes on a branch and reaches `main` through a pull request.
- The server is shared with many other apps and runs near 87% RAM: check
  ports before using them, never touch another site's nginx vhost, and keep
  builds lean.
- Email goes through Resend.

## Checks before pushing

```
npm run build      # type check + Vite build
npx eslint src
```
