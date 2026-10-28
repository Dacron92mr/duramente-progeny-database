"""Pure state transitions for the rate-limited JBIS monthly queue."""
from __future__ import annotations

import copy
import json
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Callable

STATE_VERSION = 2
DEFAULT_BATCH_ACCEPTANCE = 0.9


def cycle_for_day(day: date) -> str:
    return day.strftime("%Y-%m")


def load_state_safely(path: Path) -> tuple[Any, list[str]]:
    if not path.exists():
        return {}, []
    try:
        return json.loads(path.read_text(encoding="utf-8")), []
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return {}, [f"state file unreadable; conservative queue rebuild: {exc}"]


def _unique_strings(values: Any) -> list[str]:
    result = []
    seen = set()
    if values is None or isinstance(values, (str, bytes)):
        return result
    try:
        iterator = iter(values)
    except TypeError:
        return result
    for value in iterator:
        key = str(value)
        if key and key not in seen:
            seen.add(key)
            result.append(key)
    return result


def _new_cycle(cycle: str, eligible_ids: list[str], now: str) -> dict[str, Any]:
    return {
        "cycle": cycle,
        "started_at": now,
        "completed_ids": [],
        "pending_ids": list(eligible_ids),
        "failed": {},
        "last_success": None,
    }


def _is_complete(queue: dict[str, Any], eligible_ids: set[str]) -> bool:
    return (
        not queue.get("pending_ids")
        and not queue.get("failed")
        and set(queue.get("completed_ids", [])) == eligible_ids
    )


def prepare_jbis_state(
    raw_state: Any,
    horse_rows: list[dict[str, Any]],
    current_cycle: str,
    *,
    now: str | None = None,
) -> tuple[dict[str, Any], list[str]]:
    """Normalize, migrate, and reconcile persisted JBIS queue state.

    A legacy cursor does not record which attempts succeeded. Migration therefore
    queues every eligible horse once rather than guessing success from cursor
    position; a failed batch can never be mistaken for completed work.
    """
    now = now or datetime.now(timezone.utc).isoformat()
    eligible_ids = _unique_strings([row.get("id") for row in horse_rows])
    eligible_set = set(eligible_ids)
    issues: list[str] = []

    if isinstance(raw_state, dict) and raw_state.get("schema_version") == STATE_VERSION:
        stored = raw_state.get("jbis")
        queue = copy.deepcopy(stored) if isinstance(stored, dict) else None
    else:
        queue = None

    if queue is None:
        legacy_cycle = raw_state.get("jbis_cycle") if isinstance(raw_state, dict) else None
        legacy_cursor = raw_state.get("jbis_cursor") if isinstance(raw_state, dict) else None
        queue = _new_cycle(str(legacy_cycle or current_cycle), eligible_ids, now)
        if legacy_cycle is not None or legacy_cursor is not None:
            queue["migrated_from_legacy"] = {
                "cycle": legacy_cycle,
                "cursor": legacy_cursor,
                "requeued_all": True,
            }
            issues.append(
                "legacy cursor state migrated conservatively; all eligible profiles requeued"
            )
        elif raw_state not in (None, {}):
            issues.append("malformed or unsupported state replaced with a fresh pending cycle")

    cycle = str(queue.get("cycle") or current_cycle)
    completed_ids = [
        horse_id
        for horse_id in _unique_strings(queue.get("completed_ids"))
        if horse_id in eligible_set
    ]
    completed_set = set(completed_ids)

    failed: dict[str, dict[str, Any]] = {}
    stored_failed = queue.get("failed")
    if isinstance(stored_failed, dict):
        for horse_id, detail in stored_failed.items():
            key = str(horse_id)
            if key not in eligible_set or key in completed_set:
                continue
            failed[key] = copy.deepcopy(detail) if isinstance(detail, dict) else {}
    elif stored_failed not in (None, {}):
        issues.append("invalid failed-profile state ignored")

    pending_ids = [
        horse_id
        for horse_id in _unique_strings(queue.get("pending_ids"))
        if horse_id in eligible_set and horse_id not in completed_set and horse_id not in failed
    ]
    accounted = completed_set | set(pending_ids) | set(failed)
    pending_ids.extend(horse_id for horse_id in eligible_ids if horse_id not in accounted)

    queue = {
        **queue,
        "cycle": cycle,
        "completed_ids": completed_ids,
        "pending_ids": pending_ids,
        "failed": failed,
    }

    if cycle != current_cycle:
        if _is_complete(queue, eligible_set):
            previous_cycle = cycle
            previous_success = queue.get("last_success")
            previous_batch = queue.get("last_batch")
            queue = _new_cycle(current_cycle, eligible_ids, now)
            queue["previous_cycle"] = previous_cycle
            queue["last_success"] = previous_success
            queue["last_batch"] = previous_batch
        else:
            issues.append(f"continuing incomplete cycle {cycle} from a previous month")

    return {"schema_version": STATE_VERSION, "jbis": queue}, issues


def next_jbis_candidates(queue: dict[str, Any], limit: int) -> list[str]:
    """Failed profiles are retried before untouched profiles, without duplicates."""
    if limit <= 0:
        return []
    failed_ids = _unique_strings(queue.get("failed", {}).keys())
    pending_ids = [
        horse_id
        for horse_id in _unique_strings(queue.get("pending_ids"))
        if horse_id not in set(failed_ids)
    ]
    return (failed_ids + pending_ids)[:limit]


def record_jbis_results(
    queue: dict[str, Any],
    successful_ids: list[str],
    failures: dict[str, str],
    *,
    attempted: int,
    changed: int,
    now: str | None = None,
) -> dict[str, Any]:
    """Move attempted profiles to completed or retry state without duplicates."""
    now = now or datetime.now(timezone.utc).isoformat()
    result = copy.deepcopy(queue)
    successful = set(_unique_strings(successful_ids))
    completed = _unique_strings(result.get("completed_ids"))
    completed_set = set(completed)
    pending = _unique_strings(result.get("pending_ids"))
    failed = result.get("failed") if isinstance(result.get("failed"), dict) else {}
    failed = copy.deepcopy(failed)

    for horse_id in successful:
        if horse_id not in completed_set:
            completed.append(horse_id)
            completed_set.add(horse_id)
        failed.pop(horse_id, None)

    pending = [horse_id for horse_id in pending if horse_id not in successful]
    for horse_id, reason in failures.items():
        key = str(horse_id)
        if key in completed_set:
            continue
        pending = [pending_id for pending_id in pending if pending_id != key]
        previous = failed.get(key, {}) if isinstance(failed.get(key), dict) else {}
        failed[key] = {
            "attempts": int(previous.get("attempts", 0)) + 1,
            "last_error": str(reason),
            "last_attempted_at": now,
        }

    result.update(
        completed_ids=completed,
        pending_ids=pending,
        failed=failed,
        last_batch={
            "at": now,
            "attempted": attempted,
            "succeeded": len(successful),
            "failed": len(failures),
            "changed_horses": changed,
        },
    )
    result["last_success"] = {
        "at": now,
        "succeeded": len(successful),
        "failed": len(failures),
    }
    return result


def jbis_batch_acceptable(
    success_count: int,
    total_count: int,
    *,
    strict_batch: bool,
    threshold: float = DEFAULT_BATCH_ACCEPTANCE,
) -> bool:
    if total_count <= 0:
        return False
    if strict_batch:
        return success_count == total_count
    return success_count / total_count >= threshold


def jbis_status(
    state: dict[str, Any],
    horse_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    queue = state["jbis"]
    eligible_ids = _unique_strings([row.get("id") for row in horse_rows])
    names = {str(row.get("id")): row.get("name") for row in horse_rows}
    failed = []
    for horse_id, detail in queue.get("failed", {}).items():
        failed.append(
            {
                "horse_id": horse_id,
                "horse_name": names.get(horse_id),
                "attempts": detail.get("attempts", 0),
                "last_error": detail.get("last_error"),
                "last_attempted_at": detail.get("last_attempted_at"),
            }
        )
    completed_count = len(set(queue.get("completed_ids", [])))
    pending_count = len(queue.get("pending_ids", []))
    return {
        "cycle": queue.get("cycle"),
        "eligible": len(eligible_ids),
        "completed": completed_count,
        "pending": pending_count,
        "failed": len(failed),
        "complete": completed_count == len(eligible_ids) and pending_count == 0 and not failed,
        "failed_horses": sorted(failed, key=lambda row: str(row["horse_id"])),
        "last_success": queue.get("last_success"),
        "last_batch": queue.get("last_batch"),
    }


def write_state_atomic(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    os.replace(temporary, path)


def commit_state_after_publication(
    state_path: Path,
    state: dict[str, Any],
    publish: Callable[[], None],
) -> None:
    """Persist queue progress only after the staged data publication succeeds."""
    publish()
    write_state_atomic(state_path, state)


def write_github_summary(report: dict[str, Any]) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    status = report.get("jbis") or {}
    lines = [
        "## JBIS sync status",
        "",
        "| Metric | Count |",
        "| --- | ---: |",
        f"| Eligible | {status.get('eligible', 0)} |",
        f"| Completed | {status.get('completed', 0)} |",
        f"| Pending | {status.get('pending', 0)} |",
        f"| Failed / retry | {status.get('failed', 0)} |",
        f"| Cycle | {status.get('cycle') or '—'} |",
        f"| Complete | {'yes' if status.get('complete') else 'no'} |",
        f"| Applied | {'yes' if report.get('applied') else 'no'} |",
    ]
    if report.get("state_issues"):
        lines.extend(["", "State notes:", *[f"- {issue}" for issue in report["state_issues"]]])
    if report.get("errors"):
        lines.extend(["", "Current errors:", *[
            f"- {error.get('source', 'source')} / horse {error.get('horse_id', 'batch')}: "
            f"{error.get('reason', 'unknown error')}"
            for error in report["errors"][:10]
        ]])
    with Path(summary_path).open("a", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
