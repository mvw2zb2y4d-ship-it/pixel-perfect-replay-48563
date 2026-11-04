<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All planner data lives in one persisted Zustand store; cloud-sync switches per-account storage keys and syncs owner-scoped JSON snapshots with optimistic revisions — preserves existing local data without automatically importing it into new accounts.
- Date/streak/overdue rules live in src/lib/logic.ts as pure functions — screens stay thin and rules stay testable.
- Work schedules and gigs use browser-safe shared types; schedule overrides store shift snapshots per date — editing templates cannot change manual dates.
- Backup validation and merge planning live in browser-safe backup.ts; restore commits use the existing owner-token-bound revision RPC and a durable per-owner pre-restore copy, so imported files cannot select an account or partially mutate collections.
