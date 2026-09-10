#!/usr/bin/env bash
#
# Reconciles the state of this repository's gates on `main` and says so, out loud, when one of them
# is red.
#
# ===================================================================================================
# WHY THIS EXISTS
# ===================================================================================================
#
# Nothing did. `main` went red on the E2E gate at 802eb66 on 2026-09-09 and stayed red for a day
# across several merges; it was found on 2026-09-10 by somebody doing something else, whose own
# branch was then blocked by it. GitHub emailed the actor, which is the mechanism that already
# existed and the one that did not work.
#
# The argument for an issue rather than a notification is release-audit.sh's, and it is not repeated
# here at length: an email is an event, read once or not at all; an open issue is a state, and its
# ABSENCE is checkable. Backlog item 67.
#
# ===================================================================================================
# WHY A RECONCILIATION, AND NOT `if: failure()` IN THE GATE ITSELF
# ===================================================================================================
#
# Same shape as release-audit and largely the same reasons, plus one that is specific to these
# workflows. Both e2e.yml and ci.yml set `cancel-in-progress: true`, so a run superseded by a newer
# push is cancelled — and a run cancelled while still pending never creates a job, which means no
# step inside it, notification step included, ever executes. Asking the API for the state of the
# branch catches every mode, including ones nobody has enumerated.
#
# It also gets the question right. "Did this run fail" is a question about a run; "is main red" is a
# question about a branch, and it is the second one that blocks everybody. A run that failed and was
# then superseded by a green one is not a red branch, and this reports the branch.
#
# ===================================================================================================
# WHICH RUN IS THE VERDICT, WHICH IS THE PART EASIEST TO GET WRONG
# ===================================================================================================
#
# Per watched workflow: the newest COMPLETED `push` run on the branch that carries a verdict.
#
#   * `push` only, deliberately. That is the automatic mechanism the branch is gated by. Including
#     `workflow_dispatch` would let a run somebody started on purpose to reproduce a failure — with
#     a pinned sibling image tag, say, which e2e.yml's header describes as a normal thing to do —
#     file an issue saying main is broken. An alarm a person can trip by hand is an alarm people
#     learn to ignore, which is where this started. The residual is stated in the issue body: a
#     GREEN dispatch does not clear a red push either, and the thing that clears it is a push.
#
#   * "carries a verdict" excludes `cancelled`, `skipped`, `neutral`, `stale` and `action_required`.
#     With `cancel-in-progress: true` on both gates, a cancelled run is the routine result of two
#     pushes close together and says nothing whatever about the code. Reading one as red would make
#     this fire on a busy afternoon; reading one as green would make it clear a real failure. It is
#     neither: the scan steps over it and keeps looking back.
#
#   * If the window holds no run with a verdict at all, that workflow is UNREADABLE — not green.
#     "No failure found" and "no failure" are different claims and the exit codes keep them apart.
#
# ===================================================================================================
# EXIT CODES, WHICH ARE FOUR AND NOT TWO
# ===================================================================================================
#
#   0  Every watched workflow's newest verdict on the branch is a success. Any open issue is closed.
#   1  At least one is red. The issue is filed or updated FIRST, so the record survives the red run.
#   2  The audit could not run or could not be trusted: a failed API read, a workflow file that does
#      not exist in this repository, or — on the reporting path — an issue listing that failed.
#      NEVER reported as red: "everything is broken" is an alarm large enough to read as broken
#      tooling and be ignored, which ends where no alarm ends.
#   3  The sweep finished, found nothing red among the workflows it could read, and could not read
#      some. On a 3 the issue is left exactly as it was — not opened, not closed. Closing on a
#      partial sweep is this item's own defect one level up, and it is why 3 is not folded into 0.
#
# ===================================================================================================
# THE COMMAND-SUBSTITUTION RULE
# ===================================================================================================
#
# Under `set -euo pipefail` a bare `x=$(cmd)` makes cmd's exit status the script's exit status, so a
# single transient read kills the run — which for a script whose entire purpose is to be the thing
# that speaks up is the one failure mode it must not have. Every substitution that can fail goes
# through must(), or is checked on the line after it. And a function whose output is CAPTURED runs
# in a subshell: it must write nothing to stdout that is not its result, which is why note() writes
# to stderr always. Both halves are release-audit.sh's rule, and both have already cost this estate
# a diagnosis.
#
set -euo pipefail

# --- Configuration ---------------------------------------------------------------------------------

BRANCH="${BRANCH:-main}"

# The gates this repository runs on `main`, by workflow FILE NAME — the API addresses a workflow by
# file name or numeric id, never by the `name:` inside it, and gate-audit.yml's `workflow_run:`
# trigger takes the other spelling. Set in the workflow so that adding or dropping a gate is one word
# there rather than an edit here.
#
# Note `:-` and not `-`: an empty WORKFLOWS falls back to this default rather than disabling the
# sweep, which is deliberate — "watch nothing" should be an edit somebody makes on purpose, not what
# an unset-looking variable quietly does. The swept-nothing guard below is therefore only reachable
# for a whitespace-only value, and it is exit 2 rather than a clean bill of health.
WORKFLOWS="${WORKFLOWS:-e2e.yml ci.yml}"

# How many completed runs to look back through per workflow before giving up and calling it
# unreadable. Generous, because the scan steps over cancelled runs and a busy day produces a lot of
# them; bounded, because "no verdict in the last fifty runs" is itself something to report rather
# than to page through. It must stay at or under 100 — one page — because nothing here paginates,
# and a larger value would silently be truncated to 100 by the API rather than rejected.
LOOKBACK="${LOOKBACK:-50}"
[ "$LOOKBACK" -ge 1 ] && [ "$LOOKBACK" -le 100 ] || {
  printf 'gate-audit: LOOKBACK must be 1..100 (one API page), got %q\n' "$LOOKBACK" >&2
  exit 2
}

ISSUE_TITLE="${ISSUE_TITLE:-Gate audit: a gate is red on main}"

# Identified by its LABEL and not by its title, for release-audit.sh's reason: `gh issue list
# --search '"<title>" in:title'` goes through the search index, which lags by minutes for a
# freshly-opened issue, while the listing endpoint behind `--label` is immediately consistent. This
# workflow fires on `workflow_run: [completed]` for two workflows, so two audits a minute apart are
# routine rather than exotic — exactly the window the index has not caught up in. The label is
# reserved for this script; do not apply it by hand.
ISSUE_LABEL="${ISSUE_LABEL:-gate-audit}"

# Prints what it would do and writes nothing — no label, no issue, no comment, no close. It exists
# because the only way to exercise this before it is merged is to run it by hand against the real
# API, and a rehearsal that opens an issue is not a rehearsal. Nothing in gate-audit.yml sets it;
# the default is off and the workflow does not mention the variable at all.
DRY_RUN="${GATE_AUDIT_DRY_RUN:-}"

# Spelled out rather than `: "${GITHUB_REPOSITORY:?…}"`, which is the same defect as the mktemp line
# below and fires far more often. `${var:?}` aborts a non-interactive shell with status **1**, and
# exit 1 is the code this file's own table defines as "at least one gate is red; the issue is filed
# or updated first". A workflow missing an environment variable would therefore report, in the one
# channel that matters, that a gate had gone red. A misconfiguration is the definition of exit 2 —
# could not run, or could not be trusted. Measured before the change: exit 1.
#
# `exit 2` as a literal, not a named constant, because every other exit in this file is a literal
# and one symbolic call site among seven numeric ones reads as an accident rather than a rule. If
# the codes are ever named, name all of them in one pass.
if [ -z "${GITHUB_REPOSITORY:-}" ]; then
  printf 'gate-audit: FAILED — GITHUB_REPOSITORY must be set (owner/name)\n' >&2
  exit 2
fi
SERVER="${GITHUB_SERVER_URL:-https://github.com}"

# --- Plumbing --------------------------------------------------------------------------------------

# Run a command and abort with a message NAMING it if it fails. The point is that the abort says
# something: a bare assignment under `set -e` exits with a status and no output at all.
must() {
  local what="$1"
  shift
  local out status
  set +e
  out="$("$@" 2>&1)"
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then
    printf 'gate-audit: FAILED to %s (exit %d)\n%s\n' "$what" "$status" "$out" >&2
    exit 2
  fi
  printf '%s' "$out"
}

# stderr, ALWAYS. Half of this script's output is produced inside command substitutions, and a note
# on stdout there is captured into the caller's variable instead of being read by anybody.
note() { printf '%s\n' "$*" >&2; }

# A write, unless this is a rehearsal. Every mutating gh call goes through this so that the dry run
# cannot write by omission — a new call site is dry by construction rather than by somebody
# remembering to guard it.
write() {
  if [ -n "$DRY_RUN" ]; then
    note "gate-audit: [dry run] would: $*"
    return 0
  fi
  "$@"
}

ensure_label() {
  # --force creates or updates, so this needs no read first — a read-then-create would race the
  # second of two audits minutes apart, which this workflow's triggers make routine.
  if [ -n "$DRY_RUN" ]; then
    note "gate-audit: [dry run] would ensure the '${ISSUE_LABEL}' label exists"
    return 0
  fi
  must "ensure the '${ISSUE_LABEL}' label exists on ${GITHUB_REPOSITORY}" \
    gh label create "$ISSUE_LABEL" --repo "$GITHUB_REPOSITORY" --force \
    --color 'B60205' --description 'Opened by .github/workflows/gate-audit.yml — do not apply by hand.' >/dev/null
}

# The reporting path. A failed read is exit 2 and NOT "there is none": treating one as the other
# opens a duplicate beside the issue already open.
open_audit_issues() {
  must "list open '${ISSUE_LABEL}' issues on ${GITHUB_REPOSITORY}" \
    gh issue list --repo "$GITHUB_REPOSITORY" --state open --label "$ISSUE_LABEL" \
    --json number --jq '.[].number'
}

# The close path, which may fail soft where the reporting path may not, and the asymmetry is
# deliberate. Failing to close leaves a stale alert up — visible, and self-correcting on the next
# run. Aborting instead would redden a repository that is actually clean. A missing label is not an
# error here: it means no audit issue has ever been filed, which is the common case.
open_audit_issues_soft() {
  local out
  if ! out="$(gh issue list --repo "$GITHUB_REPOSITORY" --state open --label "$ISSUE_LABEL" \
    --json number --jq '.[].number' 2>&1)"; then
    note "gate-audit: could not list open '${ISSUE_LABEL}' issues (${out}) — leaving any open issue alone"
    return 0
  fi
  printf '%s' "$out"
}

# --- What the branch's tip is ----------------------------------------------------------------------
#
# Read from the API rather than from git, so this needs no checkout depth at all. That is the one
# place it differs from release-audit.sh, which walks ancestry with `git merge-base --is-ancestor`
# and therefore cannot survive a shallow clone. Nothing here walks history.

TIP="$(must "read the tip of ${BRANCH}" \
  gh api "repos/${GITHUB_REPOSITORY}/commits/${BRANCH}" --jq '.sha')"
note "gate-audit: ${GITHUB_REPOSITORY} ${BRANCH} is at ${TIP:0:12}, watching: ${WORKFLOWS}"

# --- The sweep ---------------------------------------------------------------------------------------

# Tab-separated records, because a run title contains spaces and nothing else here contains a tab.
RED=()
GREEN=()
UNREADABLE=()

# Conclusions that are a verdict on the code. Everything else — cancelled, skipped, neutral, stale,
# action_required, null — is stepped over rather than guessed at. See the header.
VERDICT_JQ='["success","failure","timed_out","startup_failure"]'

for workflow in $WORKFLOWS; do
  # `status=completed` rather than filtering client-side: an in-flight run has a null conclusion and
  # is not yet evidence of anything. It is also why a newer commit can be on the branch with no
  # verdict yet, which the report says where it applies.
  runs="$(must "list ${workflow} runs on ${BRANCH}" \
    gh api -X GET "repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow}/runs" \
    -f branch="$BRANCH" -f event=push -f status=completed -F per_page="$LOOKBACK")"

  # The newest run carrying a verdict, as one tab-separated line, or empty. `.workflow_runs` is
  # already newest-first; `first(...)` stops at the first match rather than materialising the rest.
  # `index($c)` is the membership test and it is correct where a naive one is not: jq's only falsy
  # values are `false` and `null`, so a match at position 0 — `success`, the common case — is
  # truthy, and a miss is `null`. @tsv escapes any tab or newline inside a commit subject into a
  # two-character sequence, which is what makes the `IFS=$'\t' read` below safe on arbitrary titles.
  verdict="$(printf '%s' "$runs" | must "read ${workflow} runs" \
    jq -r --argjson keep "$VERDICT_JQ" '
      first(.workflow_runs[] | select(.conclusion as $c | $keep | index($c)))
      | [.conclusion, .head_sha, .html_url, .updated_at, (.display_title // "")]
      | @tsv
    ')"

  if [ -z "$verdict" ]; then
    # Not green. A workflow with no verdict in the window is a workflow this cannot speak for: it
    # may never have run on this branch, it may have been renamed, or every recent run may have been
    # cancelled by a busy push sequence.
    note "gate-audit: ${workflow} — no completed push run with a verdict in the last ${LOOKBACK}"
    UNREADABLE+=("${workflow}")
    continue
  fi

  IFS=$'\t' read -r conclusion sha url updated title <<<"$verdict"
  if [ "$conclusion" = success ]; then
    note "gate-audit: ${workflow} — green at ${sha:0:12}"
    GREEN+=("${workflow}")
  else
    note "gate-audit: ${workflow} — ${conclusion} at ${sha:0:12} (${url})"
    RED+=("${workflow}"$'\t'"${conclusion}"$'\t'"${sha}"$'\t'"${url}"$'\t'"${updated}"$'\t'"${title}")
  fi
done

if [ "${#RED[@]}" -eq 0 ] && [ "${#GREEN[@]}" -eq 0 ] && [ "${#UNREADABLE[@]}" -eq 0 ]; then
  # An empty WORKFLOWS, or a loop that matched nothing. Reporting "main is green" from a sweep that
  # examined nothing is the failure this file exists to prevent, so it is exit 2 and not exit 0.
  printf 'gate-audit: FAILED — swept no workflows at all (WORKFLOWS=%q)\n' "$WORKFLOWS" >&2
  exit 2
fi

# --- The report ----------------------------------------------------------------------------------

summary_file="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

{
  printf '## Gate audit — `%s` on `%s`\n\n' "$BRANCH" "$GITHUB_REPOSITORY"
  printf '| Red | Green | Could not tell |\n| --- | --- | --- |\n'
  printf '| **%d** | %d | %d |\n\n' "${#RED[@]}" "${#GREEN[@]}" "${#UNREADABLE[@]}"
} >>"$summary_file"

unreadable_section() {
  [ "${#UNREADABLE[@]}" -gt 0 ] || return 0
  printf '\n### Could not tell (%d)\n\n' "${#UNREADABLE[@]}"
  printf 'No completed `push` run with a verdict on `%s` in the last %d, for:\n\n' "$BRANCH" "$LOOKBACK"
  local w
  for w in "${UNREADABLE[@]}"; do printf -- '- `%s`\n' "$w"; done
  printf '\nThat is **not** a pass. It usually means the workflow has never run on this branch, or\n'
  printf 'that every recent run was cancelled by a newer push — `cancel-in-progress: true` makes that\n'
  printf 'routine. It can also mean the file was renamed and this audit is now watching a name that\n'
  printf 'does not exist, which is the case worth checking first.\n\n'
}

if [ "${#RED[@]}" -eq 0 ] && [ "${#UNREADABLE[@]}" -gt 0 ]; then
  note "gate-audit: nothing red among the ${#GREEN[@]} gate(s) that could be read, ${#UNREADABLE[@]} could not be read"
  {
    printf 'Nothing red among the %d gate(s) that could be read.\n' "${#GREEN[@]}"
    unreadable_section
    printf '\n_Any open `%s` issue is left as it was: a partial sweep is not evidence that a gate has gone green._\n' \
      "$ISSUE_LABEL"
  } >>"$summary_file"
  exit 3
fi

if [ "${#RED[@]}" -eq 0 ]; then
  note "gate-audit: OK — every watched gate is green on ${BRANCH}"
  printf 'Every watched gate is green on `%s`. Nothing to do.\n' "$BRANCH" >>"$summary_file"

  # Close a previously-filed issue rather than leaving it open once it is untrue. An alert that
  # stays up after the condition clears is an alert people learn to skip.
  existing="$(open_audit_issues_soft)"
  for num in $existing; do
    case "$num" in '' | *[!0-9]*) continue ;; esac
    note "gate-audit: closing #${num} — every watched gate is green"
    write gh issue comment "$num" --repo "$GITHUB_REPOSITORY" \
      --body "Reconciled at $(date -u +%Y-%m-%dT%H:%M:%SZ): every watched gate's newest \`push\` run on \`${BRANCH}\` succeeded. Closing." >/dev/null
    write gh issue close "$num" --repo "$GITHUB_REPOSITORY" >/dev/null
  done
  exit 0
fi

# --- Red: file or update the issue -----------------------------------------------------------------

# Through must(), like every other substitution here, and it is the one that had been left out.
# Unguarded, a failed mktemp — a full or unwritable TMPDIR — made this exit **1** having filed
# nothing and printed no `FAILED to` line at all, because `set -e` aborts on the assignment with
# whatever status the substitution had. Exit 1 is the code the header defines as "red, and the issue
# was filed FIRST", so the one state that table promises is impossible was reachable. It is a
# `could not run` and must be exit 2. Reproduced with `TMPDIR=/nonexistent` on the red path.
#
# must() is called inside a command substitution and its `exit 2` therefore leaves only the
# subshell — which is exactly why this works: `x=$(…)` carries the substitution's status, `set -e`
# aborts on it, and the script exits 2. Its message goes to stderr and so is not captured.
body_file="$(must "create a temporary file for the issue body" mktemp)"
{
  printf '**%d gate(s) are red on `%s`.**\n\n' "${#RED[@]}" "$BRANCH"
  printf 'Every pull request onto `%s` runs these, so a red branch reads to the next author as their\n' "$BRANCH"
  printf 'own change breaking something. That is what this exists to stop: the E2E gate was red on\n'
  printf '`main` for a day in September 2026 and the only way anyone found out was by being blocked\n'
  printf 'by it. (backlog item 67.)\n\n'
  printf '| Workflow | Verdict | Commit | Run | Ended | Subject |\n| --- | --- | --- | --- | --- | --- |\n'
  tip_mismatch=''
  for r in "${RED[@]}"; do
    IFS=$'\t' read -r workflow conclusion sha url updated title <<<"$r"
    printf '| `%s` | **%s** | [`%s`](%s/%s/commit/%s) | [run](%s) | %s | %s |\n' \
      "$workflow" "$conclusion" "${sha:0:12}" "$SERVER" "$GITHUB_REPOSITORY" "$sha" "$url" "$updated" "$title"
    if [ "$sha" != "$TIP" ]; then
      tip_mismatch="yes"
    fi
  done
  printf '\n'

  if [ -n "$tip_mismatch" ]; then
    printf '> ⚠ At least one verdict above is for a commit that is **not** the tip of `%s` (`%s`).\n' \
      "$BRANCH" "${TIP:0:12}"
    printf '> A newer push exists and its run may still be in flight, or may have been cancelled by a\n'
    printf '> newer one still. The verdict stands until a later `push` run produces a new one.\n\n'
  fi

  unreadable_section

  printf '### Before assuming it is this repository\n\n'
  printf 'The E2E gate stands up `deploy/e2e/compose.yml`, which pulls the **published** hc-admin-api\n'
  printf 'and hc-admin-gateway images by tag — defaulting to `latest`. A push to either sibling can\n'
  printf 'turn this red with nothing here having moved, which e2e.yml says at length in its header.\n'
  printf 'Read the failing run before reading the diff.\n\n'
  printf '### What clears this\n\n'
  printf 'A **push** to `%s` whose run succeeds. Only `push` runs are considered, deliberately: a\n' "$BRANCH"
  printf 'dispatch is something a person starts, often on purpose against a pinned sibling tag to\n'
  printf 'reproduce a failure, and an alarm a person can trip or silence by hand is an alarm people\n'
  printf 'learn to ignore. The consequence is stated rather than hidden — a green **dispatch** will\n'
  printf 'not close this issue, and it is not meant to.\n\n'
  printf 'If a gate is red for a reason nobody intends to fix today, say so in a comment and close it\n'
  printf 'by hand; the next red run reopens a fresh one rather than reviving this.\n\n'
  printf -- '---\n_Filed by `.github/workflows/gate-audit.yml`. Identified by the `%s` label, updated in place on every run, and closed automatically when every watched gate is green._\n' \
    "$ISSUE_LABEL"
} >"$body_file"

cat "$body_file" >>"$summary_file"

if [ -n "$DRY_RUN" ]; then
  ensure_label
  note "gate-audit: [dry run] would file or update an issue titled '${ISSUE_TITLE}' with the body above"
else
  # The listing runs BEFORE the label is created, and the order is deliberate rather than incidental.
  # open_audit_issues() is exit 2 on a failed read — never "there is none" — so with the label
  # created first an abort here left a write behind on a path that reported it could not run. It is
  # idempotent and harmless, and a guard against gates that lie is the wrong file to keep a
  # harmless-but-wrong ordering in. `gh issue create` needs the label, so it is created between the
  # read and the write rather than dropped.
  existing="$(open_audit_issues | head -n1)"
  ensure_label
  if [ -n "$existing" ]; then
    note "gate-audit: updating existing issue #${existing} (${#RED[@]} red)"
    gh issue edit "$existing" --repo "$GITHUB_REPOSITORY" --body-file "$body_file" >/dev/null
  else
    note "gate-audit: opening an issue (${#RED[@]} red)"
    gh issue create --repo "$GITHUB_REPOSITORY" --title "$ISSUE_TITLE" --label "$ISSUE_LABEL" \
      --body-file "$body_file" >/dev/null
  fi
fi

# Non-zero so the Actions tab agrees with the issue. The issue is the durable half — it survives the
# run, it can be closed, and its absence is checkable — but a red run is what makes the two agree.
# Deliberately AFTER the issue is filed, so the record outlives the run somebody reacts to.
note "gate-audit: ${#RED[@]} gate(s) red on ${BRANCH}"
exit 1
