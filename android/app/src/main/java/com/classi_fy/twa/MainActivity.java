package com.classi_fy.twa;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(GooglePlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge: content draws behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
