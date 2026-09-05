/*
# Revoke anon EXECUTE on admin functions

## Purpose
The database security linter flagged that `approve_worker` and `set_user_role`
are callable by the `anon` role. Although each function performs an internal
admin-role check before mutating data, the EXECUTE privilege itself should not
be exposed to unauthenticated callers. This migration revokes EXECUTE from
`anon` and from the implicit public grant, leaving it available only to
`authenticated` and `service_role`.

## Security changes
- Revoke EXECUTE on `approve_worker` and `set_user_role` from `anon` and PUBLIC.
- Re-grant EXECUTE to `authenticated` (the function body still enforces admin).
*/

REVOKE EXECUTE ON FUNCTION approve_worker(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION approve_worker(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_user_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION set_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_worker(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_role(uuid, text) TO authenticated;
