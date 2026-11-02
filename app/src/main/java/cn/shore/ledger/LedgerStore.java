package cn.shore.ledger;

import android.app.Activity;
import android.database.Cursor;
import android.database.DatabaseUtils;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.json.JSONObject;

/** Atomic, chunked snapshots. The original v3 SharedPreferences value is retained. */
public final class LedgerStore {
    private final Activity activity;
    static final String META = "CREATE TABLE IF NOT EXISTS ledger_snapshot(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,saved_at INTEGER NOT NULL)";
    static final String CHUNKS = "CREATE TABLE IF NOT EXISTS ledger_chunk(snapshot_id INTEGER NOT NULL,part INTEGER NOT NULL,body BLOB NOT NULL,PRIMARY KEY(snapshot_id,part))";
    static final String INSERT_META = "INSERT INTO ledger_snapshot(kind,saved_at) VALUES (?,?)";
    static final String INSERT_CHUNK = "INSERT INTO ledger_chunk(snapshot_id,part,body) VALUES (?,?,?)";
    static final String OLD_CHUNKS = "DELETE FROM ledger_chunk WHERE snapshot_id IN (SELECT id FROM ledger_snapshot WHERE kind='current' AND id NOT IN (SELECT id FROM ledger_snapshot WHERE kind='current' ORDER BY id DESC LIMIT 20))";
    static final String OLD_META = "DELETE FROM ledger_snapshot WHERE kind='current' AND id NOT IN (SELECT id FROM ledger_snapshot WHERE kind='current' ORDER BY id DESC LIMIT 20)";
    public LedgerStore(Activity activity) { this.activity = activity; }
    private SQLiteDatabase open() {
        SQLiteDatabase db = activity.openOrCreateDatabase("shore-ledger.db", 0, null);
        db.execSQL(META); db.execSQL(CHUNKS); return db;
    }
    public String legacy() { return activity.getSharedPreferences("shore", 0).getString("ledger", ""); }
    public synchronized String load(int offset) throws Exception {
        if (offset < 0 || offset > 1000) throw new IllegalArgumentException();
        try (SQLiteDatabase db = open(); Cursor rows = db.rawQuery("SELECT body FROM ledger_chunk WHERE snapshot_id=(SELECT id FROM ledger_snapshot WHERE kind='current' ORDER BY id DESC LIMIT 1 OFFSET " + offset + ") ORDER BY part", null);
             ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            while (rows.moveToNext()) bytes.write(rows.getBlob(0));
            if (bytes.size() == 0) {
                if (DatabaseUtils.longForQuery(db, "SELECT COUNT(*) FROM ledger_snapshot WHERE kind='current'", null) > offset) throw new IllegalStateException("Snapshot data missing");
                return legacy();
            }
            return bytes.toString("UTF-8");
        }
    }
    public synchronized int backupCount() {
        try (SQLiteDatabase db = open()) {
            int count = (int) DatabaseUtils.longForQuery(db, "SELECT COUNT(*) FROM ledger_snapshot WHERE kind='current'", null);
            return Math.max(0, count - 1) + (legacy().isEmpty() ? 0 : 1);
        }
    }
    private static void append(SQLiteDatabase db, String payload, String kind) {
        long id;
        try (SQLiteStatement statement = db.compileStatement(INSERT_META)) {
            statement.bindString(1, kind); statement.bindLong(2, System.currentTimeMillis()); id = statement.executeInsert();
        }
        byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
        try (SQLiteStatement statement = db.compileStatement(INSERT_CHUNK)) {
            for (int offset = 0, part = 0; offset < bytes.length; offset += 65536, part++) {
                statement.bindLong(1, id); statement.bindLong(2, part);
                statement.bindBlob(3, Arrays.copyOfRange(bytes, offset, Math.min(offset + 65536, bytes.length)));
                statement.executeInsert(); statement.clearBindings();
            }
        }
    }
    public synchronized boolean save(String payload) {
        SQLiteDatabase db = null;
        try {
            if (payload == null || payload.getBytes(StandardCharsets.UTF_8).length > 33554432 || new JSONObject(payload).getInt("schemaVersion") != 4) return false;
            db = open(); db.beginTransaction();
            String original = legacy();
            if (!original.isEmpty() && DatabaseUtils.longForQuery(db, "SELECT COUNT(*) FROM ledger_snapshot WHERE kind='legacy-v3'", null) == 0) append(db, original, "legacy-v3");
            append(db, payload, "current"); db.execSQL(OLD_CHUNKS); db.execSQL(OLD_META);
            db.setTransactionSuccessful(); return true;
        } catch (Exception e) { return false; }
        finally { if (db != null) { if (db.inTransaction()) db.endTransaction(); db.close(); } }
    }
}
