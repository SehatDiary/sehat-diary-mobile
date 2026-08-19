---
description: "Fixr — automated bug resolution and feature build. Usage: /fixr <command> [args]. Commands: resolve, fix, investigate, check, ask, build, pr-review, create-tickets, generate_monitoring_coverage_report, refresh-knowledge, init, upgrade, add-skill, setup-mcp, help — plus namespaced skills (e.g. madad:generate_tm_incident_report)."
---

<!-- fixr:auto-generated — this file is regenerated on every SessionStart by the fixr plugin hook. To customize it and stop auto-regeneration, delete this comment line. -->

Before ANY other logic, check for an upgrade notification from `/Users/admin/.claude/plugins/cache/heyjobs-plugins/fixr/3.32.0/.claude-plugin/plugin.json`. For gate-checked subcommands, do NOT issue this read (or the `.claude/fixr.config.md` read) as a standalone call — both are batched into the gate's single parallel message below; evaluate the upgrade check from the batched results first. For gate-exempt subcommands (no gate message to batch into), read the file directly. If `"upgrade_required": true`, check `.claude/fixr.config.md` for `Plugin Version:`. If the installed plugin version > project version, show a non-blocking note: "Fixr v{installed} includes project-level changes. Your config is at v{project}. Run '/fixr upgrade' to sync." Then continue normally.

## Flag parsing (before subcommand dispatch)

Scan `$ARGUMENTS` for speed-mode flags and strip them before parsing the subcommand:

- `--fast` → set `$FAST_MODE = true` (user-forced shallow investigation, Sonnet + low effort throughout)
- `--deep` → set `$DEEP_MODE = true` (user-forced full investigation, disables auto-quick triage)
- Neither → default mode. Phase 0 runs heuristic triage and may set `$DETECTED_QUICK = true` internally. Orchestrator stays Opus + max effort regardless.

`--fast` and `--deep` are mutually exclusive. If both are present, print: `Error: --fast and --deep cannot be combined. Remove one.` and stop.

These flags apply to the pipeline subcommands `resolve`, `fix`, `investigate`, `check`, `ask`, `build`. They have no effect on `help`, `init`, `add-skill`, `setup-mcp`, `upgrade` — strip them silently if present there.

After stripping flags, parse the first remaining word of `$ARGUMENTS` as the subcommand. Pass `$FAST_MODE`, `$DEEP_MODE`, `$DETECTED_QUICK` as context variables through all phases.

If it is `help`, `init`, `add-skill`, `setup-mcp`, `refresh-knowledge`, or `pr-review` — skip directly to the fixr:fixr skill below without running the MCP check. (`setup-mcp` is exempt because it's the command users run when MCPs aren't set up yet — see `commands/fixr.md` § Step 0. This exempt list MUST stay in sync with the "does NOT apply" list in `commands/fixr.md` § Step 0.) <!-- fixr:gate-exempt-list -->

If it matches **no known subcommand** (a namespaced `team:skill`, a typo, or free text) — also skip directly to the fixr:fixr skill: on that path the gate is **deferred, not skipped** — `commands/subcommands/skill-dispatch.md` § Step 3 runs it after skill discovery (a `gate: exempt` skill skips it; unmarked skills and the free-text `resolve` fall-through still gate before running).

For the remaining known subcommands (resolve, fix, investigate, check, ask, build, upgrade, create-tickets, generate_monitoring_coverage_report — or its pre-3.31.0 alias generate_coverage_report):

Fixr requires these 4 core integrations: **Unblocked (MCP or CLI), GitHub (MCP or `gh` CLI), Datadog, PagerDuty**. ALL 4 must be active. Data sources (Redshift, Metabase) are checked separately based on project config.

**Session memoisation (MA-5659):** if you already completed this gate **successfully** earlier in the current conversation (a prior `/fixr` run this session reported `Core integrations: N/N ready`) and nothing since has signalled an MCP-state change (no `/mcp` toggle, no session restart, no auth error mid-run), do NOT re-run the 7-call probe. Reuse the prior result: print `Core integrations: verified earlier this session ✓` and proceed straight to the data-source step. The probe is only re-run on the first pipeline invocation of a session, or after any signal that integration state may have changed. This is a pure caching skip — when in doubt (any ambiguity about whether state changed), re-run the full gate.

Your FIRST action must be to run these 7 tool calls in a single parallel message. Do this NOW before calling any MCP tools (this 7-call batch MUST stay in sync with `commands/fixr.md` § Step 0):

1. Bash: bash /Users/admin/.claude/plugins/cache/heyjobs-plugins/fixr/3.32.0/hooks/check-mcps.sh
2. ToolSearch(query: "mcp__unblocked", max_results: 1)
3. ToolSearch(query: "mcp__github", max_results: 1)
4. ToolSearch(query: "mcp__datadog", max_results: 1)
5. ToolSearch(query: "mcp__pagerduty", max_results: 1)
6. Read: /Users/admin/.claude/plugins/cache/heyjobs-plugins/fixr/3.32.0/.claude-plugin/plugin.json
7. Read: .claude/fixr.config.md

The two Reads are local files with no dependency on the MCP probes — they feed the upgrade check above and the data-source check below. Batching them here removes two sequential round trips from the gate chain. If `.claude/fixr.config.md` does not exist the Read errors harmlessly — the data-source check already handles the missing-config case; do not retry it.

For each MCP, combine bash result (INSTALLED/NOT_INSTALLED/SESSION_EXPIRED/NEEDS_AUTH) with ToolSearch result (found/empty):
- INSTALLED + found = ready
- INSTALLED + empty = disabled
- NOT_INSTALLED + empty = not installed
- SESSION_EXPIRED + any = session expired
- NEEDS_AUTH + any = needs auth

**GitHub special case:** If the bash script outputs `INSTALLED github (gh CLI)`, GitHub is satisfied regardless of the ToolSearch result — mark as `ready ✓ (gh CLI)`. The `gh` CLI is an accepted substitute for GitHub MCP per the documented requirement (`Unblocked (MCP or CLI), GitHub (MCP or gh CLI), Datadog, PagerDuty`). Without this special case, users with a working `gh` setup but no GitHub MCP would be incorrectly blocked.

**Unblocked special case:** The bash script checks for the Unblocked CLI **first** (`unblocked` on `PATH` or `~/.unblocked/bin/unblocked`) and outputs `INSTALLED unblocked (CLI)` when present. In that case Unblocked is satisfied regardless of the ToolSearch result — mark as `ready ✓ (CLI)`. The CLI is the **preferred** transport: the fixr skill routes Phase-1+ Unblocked calls through it and only falls back to the MCP when the CLI is absent (see `commands/fixr.md` § Step 0.6). Without this special case, users who run the Unblocked CLI but keep the MCP de-registered would be incorrectly blocked.

**Redshift from bash output:** The bash script still outputs Redshift status. Do NOT evaluate it as a core check — it's used in the data-source check below.

If any of the 4 core MCPs is not ready, show the status table and the fix instructions below. Then STOP COMPLETELY. Do NOT offer to continue. Do NOT suggest proceeding with partial core MCPs. Do NOT ask the user anything. Just show the info and stop.

Fix instructions to show for each failing MCP:

For SESSION EXPIRED MCPs (currently only Redshift):
Automatically run: `bash: aws sso login --profile redshift_mcp`
Tell the user: "Opening browser for AWS SSO — please approve the login, then I'll re-check."
After it completes, re-run the MCP check from the top.

For DISABLED MCPs:
> Run `/mcp` → select `{server_name}` → enable it. Then restart the session.

For NOT INSTALLED MCPs, show the relevant install command:

**unblocked** (if not installed):
> ```
> curl -fsSL https://getunblocked.com/install-mcp.sh | bash
> ```
> Then: `/mcp` → select unblocked → authenticate via browser.
> Or use the Unblocked **CLI** instead (`~/.unblocked/bin/unblocked`) — if it's installed and authenticated, Fixr uses it and no MCP is needed.
> Guide: https://heyjobs.atlassian.net/wiki/spaces/dnp/pages/3844833348

**github** (if not installed):
> ```
> claude mcp add --transport http github https://api.githubcopilot.com/mcp -H "Authorization: Bearer $GITHUB_PAT"
> ```
> You need a GitHub PAT from https://github.com/settings/personal-access-tokens
> Guide: https://heyjobs.atlassian.net/wiki/spaces/dnp/pages/4537483279

**datadog** (if not installed):
> ```
> claude mcp add --transport http datadog-mcp https://mcp.datadoghq.com/api/unstable/mcp-server/mcp
> ```
> Then: `/mcp` → select datadog-mcp → authenticate via Datadog OAuth.
> Guide: https://heyjobs.atlassian.net/wiki/spaces/dnp/pages/4634312789

**pagerduty** (if not installed):
> ```
> claude mcp add pagerduty-mcp -e PAGERDUTY_USER_API_KEY=$PAGERDUTY_API_TOKEN -- uvx pagerduty-mcp --enable-write-tools
> ```
> Get your PD API token: My Profile → User Settings → API Access → Create API User Token
> Guide: https://heyjobs.atlassian.net/wiki/spaces/dnp/pages/4632412187

After showing the table and instructions, end with:
> After fixing, restart Claude Code and try `/fixr` again.

STOP. Do not continue. Do not offer alternatives. Do not proceed with partial core MCPs.

---

After the 4 core MCPs pass, check data sources and source integrations based on project config, using the `.claude/fixr.config.md` content already read in the gate's batched message (do NOT re-read it):

- If Redshift is configured (has cluster in `## Databases`): check the Redshift status from the bash output + ToolSearch for `mcp__plugin_redshift`
- If Metabase is configured (`## Metabase` with `Enabled: true`): run `bash /Users/admin/.claude/plugins/cache/heyjobs-plugins/fixr/3.32.0/hooks/check-metabase.sh`
- At least one data source should be available. Warn (don't block) if a configured data source is unavailable.

**Source integrations** (new in v1.7.0 — never blocking, always informational):

- If Sentry is configured (`## Sentry` with `Enabled: true`): check the Sentry MCP status from the bash `check-mcps.sh` output. If `NOT_INSTALLED sentry`, surface a one-line note alongside the preflight summary:
  > ℹ **Sentry MCP not installed — resolver will fall back to Unblocked (truncates at ~100 KB).** Install: `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp` → `/mcp` → Sentry OAuth. Guide: https://heyjobs.atlassian.net/wiki/spaces/dnp/pages/4537843752/Sentry+MCP+Server+Installation+Guide
  
  Do NOT block. If `## Sentry § MCP required: true`, upgrade the note to a warning but still do not block — Unblocked fallback is always available.

---

If all core checks pass (and data sources are checked), THEN follow all instructions from the fixr:fixr skill with the following input: $ARGUMENTS
