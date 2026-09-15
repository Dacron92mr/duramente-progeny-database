"""Rebase a committed sync without conflicting with adjacent HTML asset changes.

Only the generated data-version assignment is reapplied; genuine data conflicts
remain errors and stop publication. Run after committing the validated snapshot.
"""
import re
import subprocess
from pathlib import Path

VERSION = re.compile(r'(window\.STATIC_DATA_VERSION\s*=\s*")[^"]*(")')


def git(*args):
    return subprocess.check_output(['git', *args], text=True)


def main():
    path = Path('index.html')
    current = path.read_text()
    previous = git('show', 'HEAD^:index.html')
    match = VERSION.search(current)
    if not match or len(VERSION.findall(current)) != 1:
        raise RuntimeError('Expected one data-version assignment')
    if VERSION.sub('DATA_VERSION', current) != VERSION.sub('DATA_VERSION', previous):
        raise RuntimeError('Sync changed HTML beyond its generated data version')
    assignment = match.group(0)
    path.write_text(previous)
    git('add', 'index.html')
    git('commit', '--amend', '--no-edit', '--allow-empty')
    git('fetch', 'origin', 'main')
    git('rebase', '--empty=keep', '--reapply-cherry-picks', 'origin/main')
    latest = path.read_text()
    if len(VERSION.findall(latest)) != 1:
        raise RuntimeError('Latest page has no unique data-version assignment')
    path.write_text(VERSION.sub(lambda _: assignment, latest))
    git('add', 'index.html')
    git('commit', '--amend', '--no-edit', '--allow-empty')


if __name__ == '__main__':
    main()
