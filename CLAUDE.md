# ScriptAlly — Project Notes

## Deployment
- Deploy with `git push` then `firebase deploy` (Firebase Hosting).

## Conventions & invariants
- **QueryStatus:** always use the exact `QueryStatus` enum strings (e.g. `"Partial Requested"`, `"Revise & Resubmit"`). Never camelCase or ad-hoc variants.
- **Undo:** undo must delete the original activity records this action created/modified — never append compensating entries.
- **Response counting:** each query counts as at most one response, regardless of pipeline stage.
