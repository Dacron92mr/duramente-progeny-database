import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jbis_queue import (
    jbis_batch_acceptable,
    jbis_status,
    load_state_safely,
    next_jbis_candidates,
    prepare_jbis_state,
    record_jbis_results,
    commit_state_after_publication,
)
import weekly_sync


def horses(count=3):
    return [
        {"id": index, "name": f"horse-{index}", "jbis_id": str(3000000000 + index)}
        for index in range(1, count + 1)
    ]


class JbisQueueStateTests(unittest.TestCase):
    def test_entirely_successful_batch_completes_cycle(self):
        rows = horses()
        state, issues = prepare_jbis_state({}, rows, "2026-10", now="2026-10-01T00:00:00+00:00")
        batch = next_jbis_candidates(state["jbis"], 3)
        state["jbis"] = record_jbis_results(
            state["jbis"], batch, {}, attempted=3, changed=2, now="2026-10-01T01:00:00+00:00"
        )
        status = jbis_status(state, rows)
        self.assertEqual(issues, [])
        self.assertEqual(status["completed"], 3)
        self.assertEqual(status["pending"], 0)
        self.assertEqual(status["failed"], 0)
        self.assertTrue(status["complete"])
        self.assertEqual(next_jbis_candidates(state["jbis"], 3), [])

    def test_one_failure_is_retained_and_retried_first(self):
        rows = horses()
        state, _ = prepare_jbis_state({}, rows, "2026-10")
        batch = next_jbis_candidates(state["jbis"], 3)
        queue = record_jbis_results(
            state["jbis"], ["1", "2"], {"3": "temporary network failure"}, attempted=3, changed=1
        )
        status = jbis_status({"schema_version": 2, "jbis": queue}, rows)
        self.assertEqual((status["completed"], status["failed"], status["pending"]), (2, 1, 0))
        self.assertFalse(status["complete"])
        self.assertEqual(next_jbis_candidates(queue, 3), ["3"])
        self.assertEqual(queue["failed"]["3"]["attempts"], 1)

    def test_multiple_failures_fail_acceptance_threshold_without_advancing_state(self):
        self.assertFalse(jbis_batch_acceptable(2, 3, strict_batch=False))
        self.assertTrue(jbis_batch_acceptable(3, 3, strict_batch=False))
        self.assertFalse(jbis_batch_acceptable(2, 3, strict_batch=True))
        self.assertFalse(jbis_batch_acceptable(0, 0, strict_batch=False))

    def test_repeated_failure_updates_one_retry_entry(self):
        rows = horses(2)
        state, _ = prepare_jbis_state({}, rows, "2026-10")
        queue = state["jbis"]
        for now in ("2026-10-01T00:00:00+00:00", "2026-10-01T01:00:00+00:00"):
            queue = record_jbis_results(
                queue, [], {"2": "HTTP 429; old data retained"}, attempted=1, changed=0, now=now
            )
        self.assertEqual(list(queue["failed"]), ["2"])
        self.assertEqual(queue["failed"]["2"]["attempts"], 2)
        self.assertEqual(next_jbis_candidates(queue, 5), ["2", "1"])

    def test_success_after_retry_removes_failed_state(self):
        rows = horses()
        state, _ = prepare_jbis_state({}, rows, "2026-10")
        queue = record_jbis_results(state["jbis"], ["1"], {"2": "temporary"}, attempted=2, changed=1)
        queue = record_jbis_results(queue, ["2"], {}, attempted=1, changed=1)
        status = jbis_status({"schema_version": 2, "jbis": queue}, rows)
        self.assertNotIn("2", queue["failed"])
        self.assertEqual(status["completed"], 2)
        self.assertEqual(next_jbis_candidates(queue, 2), ["3"])

    def test_unfinished_cycle_continues_across_month_boundary(self):
        rows = horses(3)
        completed = {
            "schema_version": 2,
            "jbis": {
                "cycle": "2026-10",
                "started_at": "2026-10-01T00:00:00+00:00",
                "completed_ids": ["1"],
                "pending_ids": ["2", "3"],
                "failed": {},
            },
        }
        state, issues = prepare_jbis_state(completed, rows, "2026-11")
        self.assertEqual(state["jbis"]["cycle"], "2026-10")
        self.assertEqual(state["jbis"]["pending_ids"], ["2", "3"])
        self.assertTrue(any("continuing incomplete cycle" in issue for issue in issues))

    def test_completed_cycle_starts_a_new_month_cycle(self):
        rows = horses(2)
        completed = {
            "schema_version": 2,
            "jbis": {
                "cycle": "2026-10",
                "started_at": "2026-10-01T00:00:00+00:00",
                "completed_ids": ["1", "2"],
                "pending_ids": [],
                "failed": {},
                "last_success": {"at": "2026-10-03T00:00:00+00:00"},
            },
        }
        state, _ = prepare_jbis_state(completed, rows, "2026-11")
        self.assertEqual(state["jbis"]["cycle"], "2026-11")
        self.assertEqual(state["jbis"]["pending_ids"], ["1", "2"])
        self.assertEqual(state["jbis"]["completed_ids"], [])
        self.assertEqual(state["jbis"]["previous_cycle"], "2026-10")
        self.assertEqual(state["jbis"]["last_success"]["at"], "2026-10-03T00:00:00+00:00")

    def test_legacy_cursor_requeues_all_profiles_conservatively(self):
        rows = horses(6)
        raw = {"jbis_cycle": "2026-10", "jbis_cursor": 4}
        state, issues = prepare_jbis_state(raw, rows, "2026-10", now="2026-10-28T00:00:00+00:00")
        self.assertEqual(state["jbis"]["pending_ids"], ["1", "2", "3", "4", "5", "6"])
        self.assertEqual(state["jbis"]["completed_ids"], [])
        self.assertTrue(state["jbis"]["migrated_from_legacy"]["requeued_all"])
        self.assertEqual(state["jbis"]["migrated_from_legacy"]["cursor"], 4)
        self.assertTrue(any("legacy cursor" in issue for issue in issues))

    def test_missing_and_malformed_state_are_safe_and_idempotent(self):
        rows = horses(2)
        malformed = ["not", "a", "queue"]
        first, issues = prepare_jbis_state(
            malformed, rows, "2026-10", now="2026-10-01T00:00:00+00:00"
        )
        second, second_issues = prepare_jbis_state(
            first, rows, "2026-10", now="2026-10-02T00:00:00+00:00"
        )
        self.assertEqual(first, second)
        self.assertEqual(second_issues, [])
        self.assertTrue(any("malformed" in issue for issue in issues))

    def test_interrupted_publication_does_not_write_queue_state(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "state.json"
            path.write_text('{"schema_version": 2, "jbis": {"cycle": "old"}}\n')
            before = path.read_text()
            new_state = {"schema_version": 2, "jbis": {"cycle": "new"}}

            def fail_publication():
                raise OSError("simulated publish interruption")

            with self.assertRaisesRegex(OSError, "simulated"):
                commit_state_after_publication(path, new_state, fail_publication)
            self.assertEqual(path.read_text(), before)

    def test_unreadable_state_is_reported_without_destructive_parse(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "state.json"
            path.write_text("{broken")
            state, issues = load_state_safely(path)
        self.assertEqual(state, {})
        self.assertTrue(any("unreadable" in issue for issue in issues))

    def test_status_exposes_attempted_failed_and_completion_data(self):
        rows = horses(3)
        state = {
            "schema_version": 2,
            "jbis": {
                "cycle": "2026-10",
                "completed_ids": ["1"],
                "pending_ids": ["2"],
                "failed": {
                    "3": {
                        "attempts": 2,
                        "last_error": "HTTP 429",
                        "last_attempted_at": "2026-10-28T00:00:00+00:00",
                    }
                },
                "last_success": {"at": "2026-10-27T00:00:00+00:00"},
            },
        }
        status = jbis_status(state, rows)
        self.assertEqual(
            (status["eligible"], status["completed"], status["pending"], status["failed"]),
            (3, 1, 1, 1),
        )
        self.assertEqual(status["failed_horses"][0]["horse_name"], "horse-3")
        self.assertFalse(status["complete"])

    def test_partial_batch_keeps_failed_profile_for_next_run_and_then_recovers(self):
        with tempfile.TemporaryDirectory() as temp:
            root = _fixture_root(Path(temp), 10)
            args = types.SimpleNamespace(
                root=root,
                source="jbis",
                limit=0,
                jbis_limit=10,
                horse_id=None,
                apply=True,
                report=Path(temp) / "report.json",
            )
            failing_id = "4"

            class FakeClient:
                def __init__(self):
                    self.blocked = set()

                def get(self, url):
                    return url

            def first_parse(_page, horse, _source):
                if str(horse["id"]) == failing_id:
                    raise weekly_sync.SourceUnavailable("temporary network failure")
                return {"earnings_jbis": 1}

            with patch.object(weekly_sync, "Client", FakeClient), patch.object(
                weekly_sync, "parse_profile", side_effect=first_parse
            ):
                weekly_sync.run(args)

            state = json.loads((root / ".github/sync/state.json").read_text())
            queue = state["jbis"]
            self.assertEqual(len(queue["completed_ids"]), 9)
            self.assertEqual(queue["failed"][failing_id]["attempts"], 1)
            report = json.loads(args.report.read_text())
            self.assertEqual(report["jbis_batch"]["failed"], 1)
            self.assertEqual(report["jbis"]["failed"], 1)

            with patch.object(weekly_sync, "Client", FakeClient), patch.object(
                weekly_sync, "parse_profile", return_value={"earnings_jbis": 1}
            ):
                weekly_sync.run(args)
            recovered = json.loads((root / ".github/sync/state.json").read_text())["jbis"]
            self.assertEqual(len(recovered["completed_ids"]), 10)
            self.assertEqual(recovered["failed"], {})
            self.assertTrue(jbis_status({"schema_version": 2, "jbis": recovered}, horses(10))["complete"])

    def test_batch_below_threshold_publishes_neither_data_nor_queue_progress(self):
        with tempfile.TemporaryDirectory() as temp:
            root = _fixture_root(Path(temp), 10)
            before_state = (root / ".github/sync/state.json").read_text()
            args = types.SimpleNamespace(
                root=root,
                source="jbis",
                limit=0,
                jbis_limit=10,
                horse_id=None,
                apply=True,
                report=Path(temp) / "report.json",
            )

            class FakeClient:
                def __init__(self):
                    self.blocked = set()

                def get(self, url):
                    return url

            def parse_with_two_failures(_page, horse, _source):
                if str(horse["id"]) in {"4", "5"}:
                    raise weekly_sync.SourceUnavailable("persistent source failure")
                return {"earnings_jbis": 1}

            with patch.object(weekly_sync, "Client", FakeClient), patch.object(
                weekly_sync, "parse_profile", side_effect=parse_with_two_failures
            ):
                with self.assertRaises(SystemExit):
                    weekly_sync.run(args)

            self.assertEqual((root / ".github/sync/state.json").read_text(), before_state)
            report = json.loads(args.report.read_text())
            self.assertFalse(report["batch_acceptable"])
            self.assertEqual(report["jbis_batch"]["failed"], 2)
            self.assertFalse(report["jbis_batch"]["threshold_accepted"])


def _fixture_root(root: Path, count: int) -> Path:
    (root / "data/horses").mkdir(parents=True)
    (root / ".github/sync").mkdir(parents=True)
    rows = horses(count)
    for row in rows:
        row["earnings_jbis"] = 1
        (root / "data/horses" / f"{row['id']}.json").write_text(
            json.dumps({"horse": row, "races": []}, ensure_ascii=False)
        )
    (root / "data/horses.json").write_text(json.dumps(rows, ensure_ascii=False))
    (root / ".github/sync/state.json").write_text(
        json.dumps(
            {
                "jbis_cycle": "2026-10",
                "jbis_cursor": 0,
            }
        )
    )
    (root / "index.html").write_text(
        '<script>window.STATIC_DATA_VERSION = "fixture";</script>'
    )
    return root


if __name__ == "__main__":
    unittest.main()
