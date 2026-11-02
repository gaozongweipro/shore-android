.class public final Lcn/shore/ledger/LedgerStore;
.super Ljava/lang/Object;
.field private activity:Landroid/app/Activity;

.method public constructor <init>(Landroid/app/Activity;)V
 .locals 0
 invoke-direct {p0}, Ljava/lang/Object;-><init>()V
 iput-object p1, p0, Lcn/shore/ledger/LedgerStore;->activity:Landroid/app/Activity;
 return-void
.end method

.method private open()Landroid/database/sqlite/SQLiteDatabase;
 .locals 4
 iget-object v0, p0, Lcn/shore/ledger/LedgerStore;->activity:Landroid/app/Activity;
 const-string v1, "shore-ledger.db"
 const/4 v2, 0x0
 const/4 v3, 0x0
 invoke-virtual {v0, v1, v2, v3}, Landroid/app/Activity;->openOrCreateDatabase(Ljava/lang/String;ILandroid/database/sqlite/SQLiteDatabase$CursorFactory;)Landroid/database/sqlite/SQLiteDatabase;
 move-result-object v0
 const-string v1, "CREATE TABLE IF NOT EXISTS ledger_snapshot(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,saved_at INTEGER NOT NULL)"
 invoke-virtual {v0, v1}, Landroid/database/sqlite/SQLiteDatabase;->execSQL(Ljava/lang/String;)V
 const-string v1, "CREATE TABLE IF NOT EXISTS ledger_chunk(snapshot_id INTEGER NOT NULL,part INTEGER NOT NULL,body BLOB NOT NULL,PRIMARY KEY(snapshot_id,part))"
 invoke-virtual {v0, v1}, Landroid/database/sqlite/SQLiteDatabase;->execSQL(Ljava/lang/String;)V
 return-object v0
.end method

.method public legacy()Ljava/lang/String;
 .locals 3
 iget-object v0, p0, Lcn/shore/ledger/LedgerStore;->activity:Landroid/app/Activity;
 const-string v1, "shore"
 const/4 v2, 0x0
 invoke-virtual {v0, v1, v2}, Landroid/app/Activity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;
 move-result-object v0
 const-string v1, "ledger"
 const-string v2, ""
 invoke-interface {v0, v1, v2}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
 move-result-object v0
 return-object v0
.end method

.method public declared-synchronized load(I)Ljava/lang/String;
 .locals 1
 monitor-enter p0
 :lock_start
 invoke-direct {p0, p1}, Lcn/shore/ledger/LedgerStore;->loadInternal(I)Ljava/lang/String;
 move-result-object v0
 :lock_end
 .catchall {:lock_start .. :lock_end} :unlock_error
 monitor-exit p0
 return-object v0
 :unlock_error
 move-exception v0
 monitor-exit p0
 throw v0
.end method

.method private loadInternal(I)Ljava/lang/String;
 .locals 8
 if-ltz p1, :bad
 const/16 v0, 0x3e8
 if-gt p1, v0, :bad
 const/4 v0, 0x0
 const/4 v1, 0x0
 :try_start
 invoke-direct {p0}, Lcn/shore/ledger/LedgerStore;->open()Landroid/database/sqlite/SQLiteDatabase;
 move-result-object v0
 new-instance v2, Ljava/io/ByteArrayOutputStream;
 invoke-direct {v2}, Ljava/io/ByteArrayOutputStream;-><init>()V
 new-instance v3, Ljava/lang/StringBuilder;
 invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V
 const-string v4, "SELECT body FROM ledger_chunk WHERE snapshot_id=(SELECT id FROM ledger_snapshot WHERE kind='current' ORDER BY id DESC LIMIT 1 OFFSET "
 invoke-virtual {v3, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
 invoke-virtual {v3, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
 const-string v4, ") ORDER BY part"
 invoke-virtual {v3, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
 invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
 move-result-object v3
 const/4 v4, 0x0
 invoke-virtual {v0, v3, v4}, Landroid/database/sqlite/SQLiteDatabase;->rawQuery(Ljava/lang/String;[Ljava/lang/String;)Landroid/database/Cursor;
 move-result-object v1
 :loop
 invoke-interface {v1}, Landroid/database/Cursor;->moveToNext()Z
 move-result v3
 if-eqz v3, :loaded
 const/4 v3, 0x0
 invoke-interface {v1, v3}, Landroid/database/Cursor;->getBlob(I)[B
 move-result-object v3
 invoke-virtual {v2, v3}, Ljava/io/ByteArrayOutputStream;->write([B)V
 goto :loop
 :loaded
 invoke-virtual {v2}, Ljava/io/ByteArrayOutputStream;->size()I
 move-result v3
 if-nez v3, :decode
 const-string v3, "SELECT COUNT(*) FROM ledger_snapshot WHERE kind='current'"
 const/4 v4, 0x0
 invoke-static {v0, v3, v4}, Landroid/database/DatabaseUtils;->longForQuery(Landroid/database/sqlite/SQLiteDatabase;Ljava/lang/String;[Ljava/lang/String;)J
 move-result-wide v3
 long-to-int v3, v3
 if-le v3, p1, :legacy_fallback
 new-instance v3, Ljava/lang/IllegalStateException;
 const-string v4, "Snapshot data missing"
 invoke-direct {v3, v4}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V
 throw v3
 :legacy_fallback
 invoke-virtual {p0}, Lcn/shore/ledger/LedgerStore;->legacy()Ljava/lang/String;
 move-result-object v2
 goto :done
 :decode
 const-string v3, "UTF-8"
 invoke-virtual {v2, v3}, Ljava/io/ByteArrayOutputStream;->toString(Ljava/lang/String;)Ljava/lang/String;
 move-result-object v2
 :done
 :try_end
 .catchall {:try_start .. :try_end} :error
 invoke-interface {v1}, Landroid/database/Cursor;->close()V
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->close()V
 return-object v2
 :error
 move-exception v2
 if-eqz v1, :close_db
 invoke-interface {v1}, Landroid/database/Cursor;->close()V
 :close_db
 if-eqz v0, :throw
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->close()V
 :throw
 throw v2
 :bad
 new-instance v0, Ljava/lang/IllegalArgumentException;
 invoke-direct {v0}, Ljava/lang/IllegalArgumentException;-><init>()V
 throw v0
.end method

.method public declared-synchronized backupCount()I
 .locals 1
 monitor-enter p0
 :lock_start
 invoke-direct {p0}, Lcn/shore/ledger/LedgerStore;->backupCountInternal()I
 move-result v0
 :lock_end
 .catchall {:lock_start .. :lock_end} :unlock_error
 monitor-exit p0
 return v0
 :unlock_error
 move-exception v0
 monitor-exit p0
 throw v0
.end method

.method private backupCountInternal()I
 .locals 5
 invoke-direct {p0}, Lcn/shore/ledger/LedgerStore;->open()Landroid/database/sqlite/SQLiteDatabase;
 move-result-object v0
 :try_start
 const-string v1, "SELECT COUNT(*) FROM ledger_snapshot WHERE kind='current'"
 const/4 v2, 0x0
 invoke-static {v0, v1, v2}, Landroid/database/DatabaseUtils;->longForQuery(Landroid/database/sqlite/SQLiteDatabase;Ljava/lang/String;[Ljava/lang/String;)J
 move-result-wide v1
 long-to-int v1, v1
 add-int/lit8 v1, v1, -0x1
 const/4 v2, 0x0
 invoke-static {v1, v2}, Ljava/lang/Math;->max(II)I
 move-result v1
 invoke-virtual {p0}, Lcn/shore/ledger/LedgerStore;->legacy()Ljava/lang/String;
 move-result-object v2
 invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z
 move-result v2
 if-nez v2, :done
 add-int/lit8 v1, v1, 0x1
 :done
 :try_end
 .catchall {:try_start .. :try_end} :error
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->close()V
 return v1
 :error
 move-exception v1
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->close()V
 throw v1
.end method

.method private static append(Landroid/database/sqlite/SQLiteDatabase;Ljava/lang/String;Ljava/lang/String;)V
 .locals 10
 const-string v0, "INSERT INTO ledger_snapshot(kind,saved_at) VALUES (?,?)"
 invoke-virtual {p0, v0}, Landroid/database/sqlite/SQLiteDatabase;->compileStatement(Ljava/lang/String;)Landroid/database/sqlite/SQLiteStatement;
 move-result-object v0
 const/4 v1, 0x1
 invoke-virtual {v0, v1, p2}, Landroid/database/sqlite/SQLiteStatement;->bindString(ILjava/lang/String;)V
 const/4 v1, 0x2
 invoke-static {}, Ljava/lang/System;->currentTimeMillis()J
 move-result-wide v4
 invoke-virtual {v0, v1, v4, v5}, Landroid/database/sqlite/SQLiteStatement;->bindLong(IJ)V
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteStatement;->executeInsert()J
 move-result-wide v2
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteStatement;->close()V
 const-string v0, "UTF-8"
 invoke-virtual {p1, v0}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B
 move-result-object v8
 const-string v0, "INSERT INTO ledger_chunk(snapshot_id,part,body) VALUES (?,?,?)"
 invoke-virtual {p0, v0}, Landroid/database/sqlite/SQLiteDatabase;->compileStatement(Ljava/lang/String;)Landroid/database/sqlite/SQLiteStatement;
 move-result-object v0
 const/4 v6, 0x0
 const/4 v7, 0x0
 :try_start
 :loop
 array-length v1, v8
 if-ge v6, v1, :done
 const v4, 0x10000
 add-int/2addr v4, v6
 invoke-static {v4, v1}, Ljava/lang/Math;->min(II)I
 move-result v4
 invoke-static {v8, v6, v4}, Ljava/util/Arrays;->copyOfRange([BII)[B
 move-result-object v9
 const/4 v1, 0x1
 invoke-virtual {v0, v1, v2, v3}, Landroid/database/sqlite/SQLiteStatement;->bindLong(IJ)V
 const/4 v1, 0x2
 int-to-long v4, v7
 invoke-virtual {v0, v1, v4, v5}, Landroid/database/sqlite/SQLiteStatement;->bindLong(IJ)V
 const/4 v1, 0x3
 invoke-virtual {v0, v1, v9}, Landroid/database/sqlite/SQLiteStatement;->bindBlob(I[B)V
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteStatement;->executeInsert()J
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteStatement;->clearBindings()V
 const v1, 0x10000
 add-int/2addr v6, v1
 add-int/lit8 v7, v7, 0x1
 goto :loop
 :done
 :try_end
 .catchall {:try_start .. :try_end} :error
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteStatement;->close()V
 return-void
 :error
 move-exception v1
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteStatement;->close()V
 throw v1
.end method

.method public declared-synchronized save(Ljava/lang/String;)Z
 .locals 1
 monitor-enter p0
 :lock_start
 invoke-direct {p0, p1}, Lcn/shore/ledger/LedgerStore;->saveInternal(Ljava/lang/String;)Z
 move-result v0
 :lock_end
 .catchall {:lock_start .. :lock_end} :unlock_error
 monitor-exit p0
 return v0
 :unlock_error
 move-exception v0
 monitor-exit p0
 throw v0
.end method

.method private saveInternal(Ljava/lang/String;)Z
 .locals 10
 const/4 v0, 0x0
 const/4 v1, 0x0
 :try_start
 if-eqz p1, :finish
 const-string v2, "UTF-8"
 invoke-virtual {p1, v2}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B
 move-result-object v2
 array-length v2, v2
 const v3, 0x2000000
 if-gt v2, v3, :finish
 new-instance v2, Lorg/json/JSONObject;
 invoke-direct {v2, p1}, Lorg/json/JSONObject;-><init>(Ljava/lang/String;)V
 const-string v3, "schemaVersion"
 invoke-virtual {v2, v3}, Lorg/json/JSONObject;->getInt(Ljava/lang/String;)I
 move-result v2
 const/4 v3, 0x4
 if-ne v2, v3, :finish
 invoke-direct {p0}, Lcn/shore/ledger/LedgerStore;->open()Landroid/database/sqlite/SQLiteDatabase;
 move-result-object v0
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->beginTransaction()V
 invoke-virtual {p0}, Lcn/shore/ledger/LedgerStore;->legacy()Ljava/lang/String;
 move-result-object v2
 invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z
 move-result v3
 if-nez v3, :save_current
 const-string v3, "SELECT COUNT(*) FROM ledger_snapshot WHERE kind='legacy-v3'"
 const/4 v4, 0x0
 invoke-static {v0, v3, v4}, Landroid/database/DatabaseUtils;->longForQuery(Landroid/database/sqlite/SQLiteDatabase;Ljava/lang/String;[Ljava/lang/String;)J
 move-result-wide v4
 const-wide/16 v6, 0x0
 cmp-long v8, v4, v6
 if-nez v8, :save_current
 const-string v3, "legacy-v3"
 invoke-static {v0, v2, v3}, Lcn/shore/ledger/LedgerStore;->append(Landroid/database/sqlite/SQLiteDatabase;Ljava/lang/String;Ljava/lang/String;)V
 :save_current
 const-string v2, "current"
 invoke-static {v0, p1, v2}, Lcn/shore/ledger/LedgerStore;->append(Landroid/database/sqlite/SQLiteDatabase;Ljava/lang/String;Ljava/lang/String;)V
 const-string v2, "DELETE FROM ledger_chunk WHERE snapshot_id IN (SELECT id FROM ledger_snapshot WHERE kind='current' AND id NOT IN (SELECT id FROM ledger_snapshot WHERE kind='current' ORDER BY id DESC LIMIT 20))"
 invoke-virtual {v0, v2}, Landroid/database/sqlite/SQLiteDatabase;->execSQL(Ljava/lang/String;)V
 const-string v2, "DELETE FROM ledger_snapshot WHERE kind='current' AND id NOT IN (SELECT id FROM ledger_snapshot WHERE kind='current' ORDER BY id DESC LIMIT 20)"
 invoke-virtual {v0, v2}, Landroid/database/sqlite/SQLiteDatabase;->execSQL(Ljava/lang/String;)V
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->setTransactionSuccessful()V
 const/4 v1, 0x1
 :try_end
 .catch Ljava/lang/Exception; {:try_start .. :try_end} :error
 goto :finish
 :error
 move-exception v2
 :finish
 if-eqz v0, :done
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->inTransaction()Z
 move-result v2
 if-eqz v2, :close
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->endTransaction()V
 :close
 invoke-virtual {v0}, Landroid/database/sqlite/SQLiteDatabase;->close()V
 :done
 return v1
.end method
