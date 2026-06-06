import Capacitor
import UIKit
import WebKit
import os.log

/// Grants WKWebView iframe media-capture permission so Daily.co's prebuilt
/// iframe can access the camera + microphone.
///
/// Capacitor 8's WebViewDelegationHandler already grants unconditionally,
/// but its lifecycle vs. ours has been fragile — in Build 62 Joseph still
/// hit Daily's "Unblock your camera and microphone" gate with both OS
/// toggles on. We override the uiDelegate after Capacitor has bound its
/// own, and grant unconditionally for ALL frames.
///
/// Conditional host allowlists turned out to be a regression vs. the
/// Capacitor default: Daily's inner call-machine iframes can present an
/// origin host that's empty/null/unexpected (sandbox quirks), and the
/// allowlist then falls through to .deny. iOS hardware access is still
/// gated by NSCameraUsageDescription / NSMicrophoneUsageDescription in
/// Info.plist + the user's per-app toggles in Settings, so the unconditional
/// .grant here only relaxes the iframe-delegation layer.
class MainViewController: CAPBridgeViewController, WKUIDelegate {

    private let log = OSLog(subsystem: "com.drselftapes.app", category: "MediaPermission")

    override func viewDidLoad() {
        super.viewDidLoad()
        if let webView = self.webView {
            webView.uiDelegate = self
        }
    }

    // Re-assert ownership in case Capacitor or a plugin reassigns the
    // uiDelegate during its own viewDidAppear / first-load pass.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let webView = self.webView, webView.uiDelegate !== self {
            webView.uiDelegate = self
        }
    }

    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        os_log(
            "media capture request: host=%{public}@ scheme=%{public}@ mainFrame=%{public}d type=%d → grant",
            log: log, type: .info,
            origin.host, origin.protocol, frame.isMainFrame ? 1 : 0, type.rawValue
        )
        decisionHandler(.grant)
    }

    func webView(
        _ webView: WKWebView,
        requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(.grant)
    }
}
