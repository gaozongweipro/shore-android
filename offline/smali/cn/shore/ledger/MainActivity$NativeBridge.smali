.class public Lcn/shore/ledger/MainActivity$NativeBridge;
.super Ljava/lang/Object;
.field private activity:Landroid/app/Activity;
.field private store:Lcn/shore/ledger/LedgerStore;
.method public constructor <init>(Landroid/app/Activity;)V
 .locals 1
 invoke-direct {p0}, Ljava/lang/Object;-><init>()V
 iput-object p1, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->activity:Landroid/app/Activity;
 new-instance v0, Lcn/shore/ledger/LedgerStore;
 invoke-direct {v0, p1}, Lcn/shore/ledger/LedgerStore;-><init>(Landroid/app/Activity;)V
 iput-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->store:Lcn/shore/ledger/LedgerStore;
 return-void
.end method
.method public loadState()Ljava/lang/String;
 .locals 2
 .annotation runtime Landroid/webkit/JavascriptInterface;
 .end annotation
 iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->store:Lcn/shore/ledger/LedgerStore;
 const/4 v1, 0x0
 invoke-virtual {v0, v1}, Lcn/shore/ledger/LedgerStore;->load(I)Ljava/lang/String;
 move-result-object v0
 return-object v0
.end method
.method public loadBackup(I)Ljava/lang/String;
 .locals 1
 .annotation runtime Landroid/webkit/JavascriptInterface;
 .end annotation
 iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->store:Lcn/shore/ledger/LedgerStore;
 invoke-virtual {v0, p1}, Lcn/shore/ledger/LedgerStore;->load(I)Ljava/lang/String;
 move-result-object v0
 return-object v0
.end method
.method public loadLegacyState()Ljava/lang/String;
 .locals 1
 .annotation runtime Landroid/webkit/JavascriptInterface;
 .end annotation
 iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->store:Lcn/shore/ledger/LedgerStore;
 invoke-virtual {v0}, Lcn/shore/ledger/LedgerStore;->legacy()Ljava/lang/String;
 move-result-object v0
 return-object v0
.end method
.method public getBackupCount()I
 .locals 1
 .annotation runtime Landroid/webkit/JavascriptInterface;
 .end annotation
 iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->store:Lcn/shore/ledger/LedgerStore;
 invoke-virtual {v0}, Lcn/shore/ledger/LedgerStore;->backupCount()I
 move-result v0
 return v0
.end method
.method public saveState(Ljava/lang/String;)Z
 .locals 1
 .annotation runtime Landroid/webkit/JavascriptInterface;
 .end annotation
 iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->store:Lcn/shore/ledger/LedgerStore;
 invoke-virtual {v0, p1}, Lcn/shore/ledger/LedgerStore;->save(Ljava/lang/String;)Z
 move-result v0
 return v0
.end method
.method public stageBackup(Ljava/lang/String;)Z
 .locals 1
 .annotation runtime Landroid/webkit/JavascriptInterface;
 .end annotation
 iget-object v0, p0, Lcn/shore/ledger/MainActivity$NativeBridge;->activity:Landroid/app/Activity;
 check-cast v0, Lcn/shore/ledger/MainActivity;
 invoke-virtual {v0, p1}, Lcn/shore/ledger/MainActivity;->stageBackup(Ljava/lang/String;)Z
 move-result v0
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
