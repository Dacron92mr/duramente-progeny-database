import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'rebase_sync.py'

class PublishTests(unittest.TestCase):
    def exercise(self, conflict=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def git(where, *args):
                return subprocess.run(['git', '-C', str(where), *args], check=True, capture_output=True, text=True)
            remote = root / 'remote.git'
            git(root, 'init', '--bare', str(remote))
            author = root / 'author'
            git(root, 'clone', str(remote), str(author))
            for repo in [author]:
                git(repo, 'config', 'user.name', 'Test')
                git(repo, 'config', 'user.email', 'test@example.com')
            git(author, 'checkout', '-b', 'main')
            old = '<script>window.STATIC_DATA_VERSION = "old";</script>\n<script src="app.js"></script>\n'
            (author / 'index.html').write_text(old)
            (author / 'data.json').write_text('old\n')
            git(author, 'add', '.'); git(author, 'commit', '-m', 'Base'); git(author, 'push', 'origin', 'main')
            sync = root / 'sync'
            git(root, 'clone', '-b', 'main', str(remote), str(sync))
            git(sync, 'config', 'user.name', 'Test'); git(sync, 'config', 'user.email', 'test@example.com')
            (sync / 'index.html').write_text(old.replace('"old"', '"new"'))
            (sync / 'data.json').write_text('refreshed\n')
            git(sync, 'add', '.'); git(sync, 'commit', '-m', 'Sync')
            (author / 'index.html').write_text(old.replace('app.js', 'chart-colors.js'))
            if conflict:
                (author / 'data.json').write_text('incompatible\n')
            git(author, 'add', '.'); git(author, 'commit', '-m', 'Website'); git(author, 'push', 'origin', 'main')
            result = subprocess.run(['python3', str(SCRIPT)], cwd=sync, capture_output=True, text=True)
            if conflict:
                self.assertNotEqual(result.returncode, 0)
            else:
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('chart-colors.js', (sync / 'index.html').read_text())
                self.assertIn('"new"', (sync / 'index.html').read_text())
                self.assertEqual((sync / 'data.json').read_text(), 'refreshed\n')
                git(sync, 'push', 'origin', 'HEAD:main')
    def test_adjacent_asset_change_is_preserved(self):
        self.exercise()
    def test_real_data_conflict_stops_publication(self):
        self.exercise(conflict=True)
