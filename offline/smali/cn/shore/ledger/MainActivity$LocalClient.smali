.class public Lcn/shore/ledger/MainActivity$LocalClient;
.super Landroid/webkit/WebViewClient;
.field private activity:Lcn/shore/ledger/MainActivity;

.method public constructor <init>(Lcn/shore/ledger/MainActivity;)V
    .locals 0
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    iput-object p1, p0, Lcn/shore/ledger/MainActivity$LocalClient;->activity:Lcn/shore/ledger/MainActivity;
    return-void
.end method
.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .locals 1
    iget-object v0, p0, Lcn/shore/ledger/MainActivity$LocalClient;->activity:Lcn/shore/ledger/MainActivity;
    invoke-virtual {v0, p2}, Lcn/shore/ledger/MainActivity;->handleUrl(Ljava/lang/String;)Z
    move-result v0
    return v0
.end method
