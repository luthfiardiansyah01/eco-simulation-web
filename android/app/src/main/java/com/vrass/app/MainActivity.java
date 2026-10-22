package com.vrass.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Default portrait for all pages
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Listen to URL changes via JavaScript bridge
        getBridge().getWebView().addJavascriptInterface(new OrientationBridge(), "AndroidOrientation");
    }

    class OrientationBridge {
        @android.webkit.JavascriptInterface
        public void lock(String orientation) {
            runOnUiThread(() -> {
                if ("landscape".equals(orientation)) {
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
                } else {
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                }
            });
        }
    }
}
