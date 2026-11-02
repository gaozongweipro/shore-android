"""Exercise the production SQL with SQLite; this does not replace Android device testing."""
import json, re, sqlite3, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JAVA = (ROOT / 'app/src/main/java/cn/shore/ledger/LedgerStore.java').read_text('utf-8')
SMALI = (ROOT / 'offline/smali/cn/shore/ledger/LedgerStore.smali').read_text('utf-8')
SQL = dict(re.findall(r'static final String (\w+) = "([^"]+)";', JAVA))

class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute(SQL['META']); self.db.execute(SQL['CHUNKS'])
    def tearDown(self):
        self.db.close()
    def append(self, text, kind='current'):
        sid = self.db.execute(SQL['INSERT_META'], (kind, 123456)).lastrowid
        raw = text.encode('utf-8')
        for part, offset in enumerate(range(0, len(raw), 65536)):
            self.db.execute(SQL['INSERT_CHUNK'], (sid, part, raw[offset:offset+65536]))
        return sid
    def load(self, offset=0):
        query = "SELECT body FROM ledger_chunk WHERE snapshot_id=(SELECT id FROM ledger_snapshot WHERE kind='current' ORDER BY id DESC LIMIT 1 OFFSET " + str(offset) + ") ORDER BY part"
        return b''.join(r[0] for r in self.db.execute(query)).decode('utf-8')
    def test_java_and_smali_share_all_production_sql(self):
        self.assertEqual(len(SQL), 6)
        for sql in SQL.values(): self.assertIn(sql, SMALI)
    def test_unicode_across_chunk_boundaries_and_cursor_window_limit(self):
        text = json.dumps({'schemaVersion':4, 'data':'x'*65535+'上岸🌊'*300000}, ensure_ascii=False)
        with self.db: self.append(text)
        self.assertEqual(self.load(), text)
        self.assertLessEqual(self.db.execute('SELECT MAX(length(body)) FROM ledger_chunk').fetchone()[0], 65536)
    def test_atomic_rollback_during_partial_write(self):
        with self.db: self.append('original')
        try:
            with self.db:
                self.append('new')
                raise RuntimeError('disk interrupted')
        except RuntimeError: pass
        self.assertEqual(self.load(), 'original')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM ledger_snapshot').fetchone()[0], 1)
    def test_retention_keeps_20_snapshots_and_permanent_legacy(self):
        with self.db:
            self.append('old-v3', 'legacy-v3')
            for i in range(30):
                self.append(str(i));self.db.execute(SQL['OLD_CHUNKS']);self.db.execute(SQL['OLD_META'])
        self.assertEqual(self.load(), '29');self.assertEqual(self.load(19), '10')
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM ledger_snapshot WHERE kind='legacy-v3'").fetchone()[0], 1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM ledger_snapshot').fetchone()[0], 21)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM ledger_chunk WHERE snapshot_id NOT IN (SELECT id FROM ledger_snapshot)').fetchone()[0], 0)
    def test_restore_creates_new_snapshot_retaining_current(self):
        with self.db: self.append('first');self.append('second')
        previous = self.load(1)
        with self.db: self.append(previous)
        self.assertEqual(self.load(), 'first');self.assertEqual(self.load(1), 'second')
    def test_legacy_copy_is_only_inserted_once(self):
        with self.db:
            for _ in range(3):
                if not self.db.execute("SELECT COUNT(*) FROM ledger_snapshot WHERE kind='legacy-v3'").fetchone()[0]: self.append('old', 'legacy-v3')
                self.append('current')
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM ledger_snapshot WHERE kind='legacy-v3'").fetchone()[0], 1)

if __name__ == '__main__': unittest.main()
