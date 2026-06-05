import Capacitor
import UIKit
import WebKit

/// Custom Capacitor bridge view controller that grants WKWebView iframe
/// media-capture permission so Daily.co's prebuilt iframe can access the
/// camera + microphone for peer-to-peer rehearsal calls.
///
/// Without this delegate, WKWebView silently denies any
/// getUserMedia()/getDisplayMedia() request that originates from a
/// cross-origin iframe (Daily.co is loaded from drselftape.daily.co
/// inside an iframe inside our app's WebView). The iframe then renders
/// "no camera available" and the join attempt fails before the user
/// ever sees the call UI — matches Joseph's "crashing before the
/// session even starts" report.
///
/// We restrict the auto-grant to known-trusted hosts so the WebView
/// can't be hijacked into approving an attacker's getUserMedia call.
/// The iOS NSCameraUsageDescription / NSMicrophoneUsageDescription
/// strings in Info.plist still gate the OUTER permission prompt — this
/// only delegates the IFRAME-level decision when the user has already
/// approved at the OS level.
class MainViewController: CAPBridgeViewController, WKUIDelegate {

    private let trustedMediaHosts: Set<String> = [
        "drselftape.daily.co",
        "daily.co",
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        // The bridge's webView is created in super.viewDidLoad. We hook
        // the UI delegate immediately after so iframe permission requests
        // route through our handler.
        if let webView = self.webView {
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
        let host = origin.host
        // The main app frame requesting media is fine — that's our own
        // code. For sub-frames (iframes), only auto-grant trusted hosts.
        if frame.isMainFrame {
            decisionHandler(.grant)
            return
        }
        if trustedMediaHosts.contains(host)
            || trustedMediaHosts.contains(where: { host.hasSuffix(".\($0)") }) {
            decisionHandler(.grant)
            return
        }
        decisionHandler(.deny)
    }
}
