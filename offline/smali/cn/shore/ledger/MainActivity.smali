.class public Lcn/shore/ledger/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

.field private web:Landroid/webkit/WebView;
.field private pendingBackup:Ljava/lang/String;

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method public onCreate(Landroid/os/Bundle;)V
    .locals 4
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
    invoke-virtual {p0}, Lcn/shore/ledger/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    const v1, -0x90805
    invoke-virtual {v0, v1}, Landroid/view/Window;->setStatusBarColor(I)V
    const/4 v1, -0x1
    invoke-virtual {v0, v1}, Landroid/view/Window;->setNavigationBarColor(I)V
    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;
    move-result-object v0
    const/16 v1, 0x2010
    invoke-virtual {v0, v1}, Landroid/view/View;->setSystemUiVisibility(I)V
    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lcn/shore/ledger/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setBlockNetworkLoads(Z)V
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V
    const/16 v2, 0x64
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setTextZoom(I)V
    new-instance v1, Lcn/shore/ledger/MainActivity$LocalClient;
    invoke-direct {v1, p0}, Lcn/shore/ledger/MainActivity$LocalClient;-><init>(Lcn/shore/ledger/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V
    new-instance v1, Landroid/webkit/WebChromeClient;
    invoke-direct {v1}, Landroid/webkit/WebChromeClient;-><init>()V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V
    new-instance v1, Lcn/shore/ledger/MainActivity$NativeBridge;
    invoke-direct {v1, p0}, Lcn/shore/ledger/MainActivity$NativeBridge;-><init>(Landroid/app/Activity;)V
    const-string v2, "ShoreNative"
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V
    invoke-virtual {p0, v0}, Lcn/shore/ledger/MainActivity;->setContentView(Landroid/view/View;)V
    const-string v1, "file:///android_asset/index.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    if-eqz p1, :done
    const-string v0, "pendingBackup"
    invoke-virtual {p1, v0}, Landroid/os/Bundle;->getString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    iput-object v0, p0, Lcn/shore/ledger/MainActivity;->pendingBackup:Ljava/lang/String;
    :done
    return-void
.end method

.method public handleUrl(Ljava/lang/String;)Z
    .locals 4
    const-string v0, "file:///android_asset/"
    invoke-virtual {p1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :handle
    const/4 v0, 0x0
    return v0
    :handle
    :try_start
    const-string v0, "shore://export"
    invoke-virtual {p1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :import
    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v0
    const-string v1, "data"
    invoke-virtual {v0, v1}, Landroid/net/Uri;->getQueryParameter(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :bad
    invoke-virtual {v0}, Ljava/lang/String;->length()I
    move-result v1
    const v2, 0x1e8480
    if-gt v1, v2, :bad
    iput-object v0, p0, Lcn/shore/ledger/MainActivity;->pendingBackup:Ljava/lang/String;
    new-instance v0, Landroid/content/Intent;
    const-string v1, "android.intent.action.CREATE_DOCUMENT"
    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v1, "android.intent.category.OPENABLE"
    invoke-virtual {v0, v1}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;
    const-string v1, "application/json"
    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;
    const-string v1, "android.intent.extra.TITLE"
    const-string v2, "shore-backup.json"
    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
    const/16 v1, 0x29
    invoke-virtual {p0, v0, v1}, Lcn/shore/ledger/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    goto :end_try
    :import
    const-string v0, "shore://import"
    invoke-virtual {p1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :end_try
    new-instance v0, Landroid/content/Intent;
    const-string v1, "android.intent.action.OPEN_DOCUMENT"
    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v1, "android.intent.category.OPENABLE"
    invoke-virtual {v0, v1}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;
    const-string v1, "*/*"
    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;
    const/16 v1, 0x2a
    invoke-virtual {p0, v0, v1}, Lcn/shore/ledger/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    goto :end_try
    :bad
    new-instance v0, Ljava/lang/IllegalArgumentException;
    invoke-direct {v0}, Ljava/lang/IllegalArgumentException;-><init>()V
    throw v0
    :end_try
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :error
    goto :done
    :error
    move-exception v0
    const-string v0, "无法打开文件选择器，请使用备份文本。"
    invoke-virtual {p0, v0}, Lcn/shore/ledger/MainActivity;->message(Ljava/lang/String;)V
    :done
    const/4 v0, 0x1
    return v0
.end method

.method public message(Ljava/lang/String;)V
    .locals 3
    new-instance v0, Ljava/lang/StringBuilder;
    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V
    const-string v1, "window.nativeMessage("
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-static {p1}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v1, ")"
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v0
    iget-object v1, p0, Lcn/shore/ledger/MainActivity;->web:Landroid/webkit/WebView;
    const/4 v2, 0x0
    invoke-virtual {v1, v0, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    return-void
.end method

.method public onActivityResult(IILandroid/content/Intent;)V
    .locals 4
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    const/4 v0, -0x1
    if-ne p2, v0, :done
    if-eqz p3, :done
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;
    move-result-object v0
    if-eqz v0, :done
    :try_start
    const/16 v1, 0x29
    if-ne p1, v1, :read
    iget-object v1, p0, Lcn/shore/ledger/MainActivity;->pendingBackup:Ljava/lang/String;
    if-eqz v1, :bad
    invoke-static {p0, v0, v1}, Lcn/shore/ledger/BackupIO;->write(Landroid/app/Activity;Landroid/net/Uri;Ljava/lang/String;)V
    const/4 v0, 0x0
    iput-object v0, p0, Lcn/shore/ledger/MainActivity;->pendingBackup:Ljava/lang/String;
    const-string v0, "备份文件已保存。"
    invoke-virtual {p0, v0}, Lcn/shore/ledger/MainActivity;->message(Ljava/lang/String;)V
    goto :end_try
    :read
    const/16 v1, 0x2a
    if-ne p1, v1, :end_try
    invoke-static {p0, v0}, Lcn/shore/ledger/BackupIO;->read(Landroid/app/Activity;Landroid/net/Uri;)Ljava/lang/String;
    move-result-object v0
    invoke-static {v0}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    new-instance v1, Ljava/lang/StringBuilder;
    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V
    const-string v2, "window.receiveBackup("
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v0, ")"
    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v0
    iget-object v1, p0, Lcn/shore/ledger/MainActivity;->web:Landroid/webkit/WebView;
    const/4 v2, 0x0
    invoke-virtual {v1, v0, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    goto :end_try
    :bad
    new-instance v0, Ljava/lang/IllegalStateException;
    invoke-direct {v0}, Ljava/lang/IllegalStateException;-><init>()V
    throw v0
    :end_try
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :error
    goto :done
    :error
    move-exception v0
    const-string v0, "文件处理失败，请使用不超过 2 MB 的有效备份。"
    invoke-virtual {p0, v0}, Lcn/shore/ledger/MainActivity;->message(Ljava/lang/String;)V
    :done
    return-void
.end method

.method public onSaveInstanceState(Landroid/os/Bundle;)V
    .locals 3
    invoke-super {p0, p1}, Landroid/app/Activity;->onSaveInstanceState(Landroid/os/Bundle;)V
    iget-object v0, p0, Lcn/shore/ledger/MainActivity;->pendingBackup:Ljava/lang/String;
    if-eqz v0, :done
    invoke-virtual {v0}, Ljava/lang/String;->length()I
    move-result v1
    const v2, 0x186a0
    if-ge v1, v2, :done
    const-string v1, "pendingBackup"
    invoke-virtual {p1, v1, v0}, Landroid/os/Bundle;->putString(Ljava/lang/String;Ljava/lang/String;)V
    :done
    return-void
.end method

.method public onBackPressed()V
    .locals 1
    iget-object v0, p0, Lcn/shore/ledger/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v0
    if-eqz v0, :exit
    iget-object v0, p0, Lcn/shore/ledger/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void
    :exit
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method
