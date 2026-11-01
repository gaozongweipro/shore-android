.class public Lcn/shore/ledger/MainActivity$NativeBridge;
.super Ljava/lang/Object;
.field private activity:Landroid/app/Activity;

.method public constructor <init>(Landroid/app/Activity;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->activity:Landroid/app/Activity;
    return-void
.end method
.method public loadState()Ljava/lang/String;
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->activity:Landroid/app/Activity;
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
.method public saveState(Ljava/lang/String;)Z
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    if-eqz p1, :fail
    invoke-virtual {p1}, Ljava/lang/String;->length()I
    move-result v0
    const v1, 0x1e8480
    if-gt v0, v1, :fail
    iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->activity:Landroid/app/Activity;
    const-string v1, "shore"
    const/4 v2, 0x0
    invoke-virtual {v0, v1, v2}, Landroid/app/Activity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    const-string v1, "ledger"
    invoke-interface {v0, v1, p1}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;
    move-result-object v0
    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->commit()Z
    move-result v0
    return v0
    :fail
    const/4 v0, 0x0
    return v0
.end method
.method public copyText(Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->activity:Landroid/app/Activity;
    const-string v1, "clipboard"
    invoke-virtual {v0, v1}, Landroid/app/Activity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Landroid/content/ClipboardManager;
    const-string v1, "上岸备份"
    invoke-static {v1, p1}, Landroid/content/ClipData;->newPlainText(Ljava/lang/CharSequence;Ljava/lang/CharSequence;)Landroid/content/ClipData;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/content/ClipboardManager;->setPrimaryClip(Landroid/content/ClipData;)V
    return-void
.end method
