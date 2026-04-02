package com.mineguard.app;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.EditText;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    results = new Uri[]{result.getData().getData()};
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        );

        webView = findViewById(R.id.webview);
        setupWebView();
        loadServerUrl();

        ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA, Manifest.permission.READ_MEDIA_IMAGES}, 100);
    }

    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        WebView.setWebContentsDebuggingEnabled(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) showErrorPage();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                try {
                    fileChooserLauncher.launch(p.createIntent());
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    private void loadServerUrl() {
        SharedPreferences p = getSharedPreferences(SetupActivity.PREFS_NAME, MODE_PRIVATE);
        String ip = p.getString(SetupActivity.KEY_IP, "192.168.6.69");
        String port = p.getString(SetupActivity.KEY_PORT, "5000");
        webView.loadUrl("http://" + ip + ":" + port);
    }

    private void showErrorPage() {
        String html = "<html><body style='background:#050505;color:#fafafa;font-family:sans-serif;"
            + "display:flex;flex-direction:column;align-items:center;justify-content:center;"
            + "height:100vh;margin:0;padding:24px;box-sizing:border-box;text-align:center;'>"
            + "<div style='font-size:56px;margin-bottom:16px;'>⚠️</div>"
            + "<h2 style='color:#f97316;font-size:16px;text-transform:uppercase;letter-spacing:0.2em;margin:0 0 8px'>Servidor Inacessível</h2>"
            + "<p style='color:#71717a;font-size:13px;margin:0 0 32px'>Verifique se o MineGuard está ligado e se o IP está correcto.</p>"
            + "<button onclick='window.location.reload()' style='background:#f97316;color:black;border:none;"
            + "padding:14px 28px;border-radius:10px;font-weight:900;font-size:12px;"
            + "text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;width:100%;max-width:260px;display:block;'>🔄 Tentar Novamente</button>"
            + "<button onclick='Android.changeServer()' style='background:#18181b;color:#f97316;border:1px solid #f97316;"
            + "padding:14px 28px;border-radius:10px;font-weight:900;font-size:12px;"
            + "text-transform:uppercase;letter-spacing:0.1em;width:100%;max-width:260px;display:block;'>⚙️ Alterar IP do Servidor</button>"
            + "</body></html>";
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void changeServer() {
                runOnUiThread(() -> showChangeServerDialog());
            }
        }, "Android");
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private void showChangeServerDialog() {
        SharedPreferences prefs = getSharedPreferences(SetupActivity.PREFS_NAME, MODE_PRIVATE);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(52, 32, 52, 8);

        EditText etIp = new EditText(this);
        etIp.setHint("IP do Servidor (ex: 192.168.1.100)");
        etIp.setText(prefs.getString(SetupActivity.KEY_IP, ""));

        EditText etPort = new EditText(this);
        etPort.setHint("Porta (padrão: 5000)");
        etPort.setText(prefs.getString(SetupActivity.KEY_PORT, "5000"));

        layout.addView(etIp);
        layout.addView(etPort);

        new AlertDialog.Builder(this)
            .setTitle("Alterar Servidor")
            .setView(layout)
            .setPositiveButton("Conectar", (d, w) -> {
                String ip = etIp.getText().toString().trim();
                String port = etPort.getText().toString().trim();
                if (!ip.isEmpty()) {
                    prefs.edit()
                        .putString(SetupActivity.KEY_IP, ip)
                        .putString(SetupActivity.KEY_PORT, port.isEmpty() ? "5000" : port)
                        .apply();
                    loadServerUrl();
                }
            })
            .setNegativeButton("Cancelar", null)
            .show();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                .setTitle("MineGuard")
                .setItems(new CharSequence[]{"⚙️  Alterar IP do Servidor", "🚪  Sair da Aplicação"}, (d, which) -> {
                    if (which == 0) showChangeServerDialog();
                    else finish();
                })
                .show();
        }
    }
}
