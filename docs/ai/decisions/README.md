# AI Decision Records

Store durable role-session decisions here when they affect future work.

Use `docs/ai/TASK_TEMPLATE.md` for the packet format. Keep records short,
specific, and free of secrets or personal data.

Good candidates:

- domain boundary decisions
- migration or schema organization decisions
- auth boundary changes
- Calendar provider-write policy changes
- finance import idempotency or audit behavior changes
- validation gate changes
- release sequencing decisions

PM-created candidate slices belong in `docs/ai/NEXT_SLICES.md`. Promote a slice
to a decision record only when it creates durable architecture, ownership,
validation, migration, auth, provider-write, or finance-import policy.

Naming convention:

```text
YYYY-MM-DD-short-decision-name.md
```

Do not store transient implementation chatter here. If the decision only matters
inside one PR and has no future effect, keep it in the PR/task packet instead.
