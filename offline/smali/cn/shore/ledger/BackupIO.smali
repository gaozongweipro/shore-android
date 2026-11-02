.class public final Lcn/shore/ledger/BackupIO;
.super Ljava/lang/Object;

.method public static read(Landroid/app/Activity;Landroid/net/Uri;)Ljava/lang/String;
    .locals 6
    invoke-virtual {p0}, Landroid/app/Activity;->getContentResolver()Landroid/content/ContentResolver;
    move-result-object v0
    invoke-virtual {v0, p1}, Landroid/content/ContentResolver;->openInputStream(Landroid/net/Uri;)Ljava/io/InputStream;
    move-result-object v0
    :try_start
    new-instance v1, Ljava/io/ByteArrayOutputStream;
    invoke-direct {v1}, Ljava/io/ByteArrayOutputStream;-><init>()V
    const/16 v2, 0x2000
    new-array v2, v2, [B
    :loop
    invoke-virtual {v0, v2}, Ljava/io/InputStream;->read([B)I
    move-result v3
    const/4 v4, -0x1
    if-eq v3, v4, :finish
    invoke-virtual {v1}, Ljava/io/ByteArrayOutputStream;->size()I
    move-result v4
    add-int/2addr v4, v3
    const v5, 0x2000000
    if-gt v4, v5, :bad
    const/4 v4, 0x0
    invoke-virtual {v1, v2, v4, v3}, Ljava/io/ByteArrayOutputStream;->write([BII)V
    goto :loop
    :bad
    new-instance v1, Ljava/io/IOException;
    invoke-direct {v1}, Ljava/io/IOException;-><init>()V
    throw v1
    :finish
    const-string v2, "UTF-8"
    invoke-virtual {v1, v2}, Ljava/io/ByteArrayOutputStream;->toString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1
    :try_end
    .catchall {:try_start .. :try_end} :error
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V
    return-object v1
    :error
    move-exception v1
    if-eqz v0, :throw
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V
    :throw
    throw v1
.end method
.method public static write(Landroid/app/Activity;Landroid/net/Uri;Ljava/lang/String;)V
    .locals 2
    invoke-virtual {p0}, Landroid/app/Activity;->getContentResolver()Landroid/content/ContentResolver;
    move-result-object v0
    const-string v1, "wt"
    invoke-virtual {v0, p1, v1}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;Ljava/lang/String;)Ljava/io/OutputStream;
    move-result-object v0
    :try_start
    const-string v1, "UTF-8"
    invoke-virtual {p2, v1}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B
    move-result-object v1
    invoke-virtual {v0, v1}, Ljava/io/OutputStream;->write([B)V
    :try_end
    .catchall {:try_start .. :try_end} :error
    invoke-virtual {v0}, Ljava/io/OutputStream;->close()V
    return-void
    :error
    move-exception v1
    if-eqz v0, :throw
    invoke-virtual {v0}, Ljava/io/OutputStream;->close()V
    :throw
    throw v1
.end method
