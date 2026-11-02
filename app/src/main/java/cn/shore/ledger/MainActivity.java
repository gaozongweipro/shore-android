package cn.shore.ledger;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.content.ClipboardManager;
import android.content.ClipData;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Offline-only app. No network or storage permissions are requested. */
public class MainActivity extends Activity {
    private WebView web;
    private volatile String pendingBackup;
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xfff5f3ee);
        getWindow().setNavigationBarColor(0xfffffefc);
        getWindow().getDecorView().setSystemUiVisibility(8208);
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setBlockNetworkLoads(true);
        settings.setAllowFileAccess(false); // Packaged android_asset URLs remain accessible.
        settings.setAllowContentAccess(false);
        settings.setTextZoom(100);
        web.setWebViewClient(new LocalClient(this));
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new NativeBridge(this), "ShoreNative");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
        if (savedInstanceState != null) pendingBackup = savedInstanceState.getString("pendingBackup");
    }
    public boolean handleUrl(String url) {
        if (url.startsWith("file:///android_asset/")) return false;
        try {
            if (url.startsWith("shore://export")) {
                String inlineData = Uri.parse(url).getQueryParameter("data");
                if (inlineData != null) pendingBackup = inlineData;
                if (pendingBackup == null || pendingBackup.length() > 33554432) throw new IllegalArgumentException();
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "shore-backup.json");
                startActivityForResult(intent, 41);
            } else if (url.startsWith("shore://import")) {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                startActivityForResult(intent, 42);
            }
        } catch (Exception e) { message("无法打开文件选择器，请使用备份文本。"); }
        return true;
    }
    public void message(String text) {
        web.evaluateJavascript("window.nativeMessage(" + JSONObject.quote(text) + ")", null);
    }
    public boolean stageBackup(String data) {
        if (data == null || data.getBytes(StandardCharsets.UTF_8).length > 33554432) return false;
        pendingBackup = data;
        return true;
    }
    @Override public void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        try {
            if (request == 41) {
                if (pendingBackup == null) throw new IllegalStateException();
                try (OutputStream out = getContentResolver().openOutputStream(data.getData(), "wt")) {
                    out.write(pendingBackup.getBytes(StandardCharsets.UTF_8));
                }
                pendingBackup = null;
                message("备份文件已保存。");
            } else if (request == 42) {
                String text;
                try (InputStream in = getContentResolver().openInputStream(data.getData());
                     ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192];
                    int count;
                    while ((count = in.read(buffer)) != -1) {
                        if (bytes.size() + count > 33554432) throw new IllegalArgumentException();
                        bytes.write(buffer, 0, count);
                    }
                    text = bytes.toString("UTF-8");
                }
                web.evaluateJavascript("window.receiveBackup(" + JSONObject.quote(text) + ")", null);
            }
        } catch (Exception e) { message("文件处理失败，请使用不超过 32 MB 的有效备份。"); }
    }
    @Override public void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        if (pendingBackup != null && pendingBackup.length() < 100000) state.putString("pendingBackup", pendingBackup);
    }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    public static class LocalClient extends WebViewClient {
        private final MainActivity activity;
        public LocalClient(MainActivity activity) { this.activity = activity; }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return activity.handleUrl(url); }
    }
    public static class NativeBridge {
        private final Activity activity;
        private final LedgerStore store;
        public NativeBridge(Activity activity) { this.activity = activity; this.store = new LedgerStore(activity); }
        @JavascriptInterface public String loadState() throws Exception { return store.load(0); }
        @JavascriptInterface public String loadBackup(int offset) throws Exception { return store.load(offset); }
        @JavascriptInterface public String loadLegacyState() { return store.legacy(); }
        @JavascriptInterface public int getBackupCount() { return store.backupCount(); }
        @JavascriptInterface public boolean saveState(String data) { return store.save(data); }
        @JavascriptInterface public boolean stageBackup(String data) { return ((MainActivity) activity).stageBackup(data); }
        @JavascriptInterface public void copyText(String text) {
            ClipboardManager manager = (ClipboardManager) activity.getSystemService("clipboard");
            manager.setPrimaryClip(ClipData.newPlainText("上岸备份", text));
        }
    }
}
