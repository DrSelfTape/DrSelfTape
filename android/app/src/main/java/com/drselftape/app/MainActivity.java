package com.drselftape.app;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // targetSdk 36 forces edge-to-edge (the windowOptOutEdgeToEdgeEnforcement
    // theme flag is ignored now). Enabling it explicitly lets Capacitor 8's
    // SystemBars inset handling pad the WebView correctly. Capacitor 9 will call
    // this automatically; until then it's required here.
    // Dark styles for both bars: the app chrome is always dark, and the default
    // auto style paints a near-white nav bar on Android 8-9 in light mode.
    // Must run AFTER super.onCreate: BridgeActivity switches from the launch
    // theme to AppTheme.NoActionBar there, and touching the window earlier
    // builds it from the launch theme (a stray title bar on Android 12-14).
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
    }
}
