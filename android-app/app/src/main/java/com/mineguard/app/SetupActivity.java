package com.mineguard.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class SetupActivity extends AppCompatActivity {

    static final String PREFS_NAME = "MineGuardPrefs";
    static final String KEY_IP = "server_ip";
    static final String KEY_PORT = "server_port";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String savedIp = prefs.getString(KEY_IP, "");

        // If already configured and not coming from settings, go directly to main
        boolean fromSettings = getIntent().getBooleanExtra("from_settings", false);
        if (!TextUtils.isEmpty(savedIp) && !fromSettings) {
            launchMain();
            return;
        }

        setContentView(R.layout.activity_setup);

        EditText etIp = findViewById(R.id.et_ip);
        EditText etPort = findViewById(R.id.et_port);
        Button btnConnect = findViewById(R.id.btn_connect);

        // Pre-fill with saved values or defaults
        etIp.setText(prefs.getString(KEY_IP, "192.168.6.69"));
         etPort.setText(prefs.getString(KEY_PORT, "2026"));

        btnConnect.setOnClickListener(v -> {
            String ip = etIp.getText().toString().trim();
            String port = etPort.getText().toString().trim();

            if (TextUtils.isEmpty(ip)) {
                etIp.setError("Introduza o endereço IP do servidor");
                return;
            }
            if (TextUtils.isEmpty(port)) port = "2026";

            prefs.edit()
                .putString(KEY_IP, ip)
                .putString(KEY_PORT, port)
                .apply();

            launchMain();
        });
    }

    private void launchMain() {
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }
}
