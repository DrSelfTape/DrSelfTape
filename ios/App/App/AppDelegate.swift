import UIKit
import Capacitor
import AVFoundation
import PushKit
import CallKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure the shared audio session up front so the scene-partner
        // flow can record mic input AND play TTS through the speaker
        // simultaneously. Without `playAndRecord` + `defaultToSpeaker`,
        // recording silently fails when audio is playing, and playback
        // routes to the earpiece during/after a recording.
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .allowBluetooth, .duckOthers]
            )
            try session.setActive(true)
        } catch {
            NSLog("AVAudioSession setup failed: \(error)")
        }
        // Start the VoIP/CallKit manager NOW (not in the plugin's load) so the
        // PushKit registry + CallKit provider exist even when iOS cold-launches
        // the app from a VoIP push before the web layer is up.
        VoipCallManager.shared.start()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    // Push notifications — bridge APNs callbacks into Capacitor so the
    // PushNotifications plugin's registration/error events fire on the JS side.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

/// Lightweight Capacitor plugin to restore the shared audio session to a
/// playback-friendly state. The speech recognizer (Capgo plugin) sets the
/// session to `.measurement` mode + `.duckOthers` while listening and never
/// restores it, so the AI reader's WebView TTS plays back silent afterwards.
/// `resetToPlayback()` puts the session back to the same config AppDelegate
/// uses at launch (known to play TTS fine in pre-timed mode). Auto-discovered
/// by Capacitor via `CAPBridgedPlugin` — no Xcode project changes required.
@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "resetToPlayback", returnType: CAPPluginReturnPromise)
    ]

    @objc func resetToPlayback(_ call: CAPPluginCall) {
        do {
            let session = AVAudioSession.sharedInstance()
            // `.playback` (not `.playAndRecord`) routes to the MAIN speaker at
            // full volume — recording is already done by the time the reader
            // speaks, and `.playAndRecord` uses a quieter low-gain path that
            // made the reader nearly inaudible even at max volume.
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
}

// MARK: - VoIP / CallKit (native incoming video-call ring) ─────────────────────

/// Owns the app's SINGLE CXProvider + PKPushRegistry. Created at launch from
/// AppDelegate so it can ring CallKit from a VoIP push even on a cold launch,
/// before the web layer (and the plugin) exists. Relays answer/end + the VoIP
/// token to JS via VoipCallPlugin when it's available; stashes a cold-launch
/// answer for the JS to drain on boot.
final class VoipCallManager: NSObject {
    static let shared = VoipCallManager()

    private var provider: CXProvider?
    private var registry: PKPushRegistry?
    private var callsById: [String: UUID] = [:]
    private var roomById: [String: String] = [:]
    private var started = false

    weak var plugin: CAPPlugin?
    private(set) var voipToken: String?
    /// Set when a call is answered before JS is listening (cold launch).
    var pendingAnswer: [String: String]?

    func start() {
        guard !started else { return }
        started = true
        let config = CXProviderConfiguration()
        config.supportsVideo = true
        config.maximumCallsPerCallGroup = 1
        config.maximumCallGroups = 1
        config.supportedHandleTypes = [.generic]
        let p = CXProvider(configuration: config)
        p.setDelegate(self, queue: nil)
        provider = p

        let r = PKPushRegistry(queue: .main)
        r.delegate = self
        r.desiredPushTypes = [.voIP]
        registry = r
    }

    /// Report an incoming call to CallKit — used by BOTH the JS showIncomingCall
    /// (app alive) and the VoIP push handler (app killed/locked).
    func reportIncomingCall(callId: String, callerName: String, roomUrl: String, hasVideo: Bool, completion: (() -> Void)? = nil) {
        let uuid = callsById[callId] ?? UUID()
        callsById[callId] = uuid
        if !roomUrl.isEmpty { roomById[callId] = roomUrl }
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: callerName)
        update.localizedCallerName = callerName
        update.hasVideo = hasVideo
        provider?.reportNewIncomingCall(with: uuid, update: update) { error in
            if let error = error { NSLog("CallKit report failed: \(error.localizedDescription)") }
            // Call the PushKit completion only AFTER CallKit has processed the
            // report — calling it earlier (or skipping it on failure) risks iOS
            // penalising/throttling future VoIP pushes for this app.
            completion?()
        }
    }

    func endCall(callId: String) {
        if let uuid = callsById[callId] {
            provider?.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
            callsById[callId] = nil
            roomById[callId] = nil
        }
    }

    private func callId(for uuid: UUID) -> String? {
        callsById.first(where: { $0.value == uuid })?.key
    }
}

extension VoipCallManager: PKPushRegistryDelegate {
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        guard type == .voIP else { return }
        let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
        voipToken = token
        plugin?.notifyListeners("voipToken", data: ["token": token])
    }

    func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        if type == .voIP { voipToken = nil }
    }

    // We MUST report a call to CallKit on every VoIP push (iOS 13+ terminates
    // the app otherwise), so always report BEFORE calling completion.
    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        guard type == .voIP else { completion(); return }
        let d = payload.dictionaryPayload
        let callId = (d["callId"] as? String) ?? UUID().uuidString
        let name = (d["callerName"] as? String) ?? "Scene Partner"
        let room = (d["roomUrl"] as? String) ?? ""
        reportIncomingCall(callId: callId, callerName: name, roomUrl: room, hasVideo: true) {
            completion()
        }
    }
}

extension VoipCallManager: CXProviderDelegate {
    func providerDidReset(_ provider: CXProvider) {
        callsById.removeAll()
        roomById.removeAll()
    }

    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        if let id = callId(for: action.callUUID) {
            let data = ["callId": id, "roomUrl": roomById[id] ?? ""]
            if plugin?.hasListeners("callAnswered") == true {
                plugin?.notifyListeners("callAnswered", data: data)
            } else {
                pendingAnswer = data // cold launch — JS drains via getPendingAnswer()
            }
        }
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        if let id = callId(for: action.callUUID) {
            plugin?.notifyListeners("callEnded", data: ["callId": id])
            callsById[id] = nil
            roomById[id] = nil
        }
        action.fulfill()
    }

    func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {}
    func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {}
}

/// Capacitor bridge for the VoIP/CallKit manager. Auto-discovered via @objc +
/// CAPBridgedPlugin — no Xcode project changes needed.
@objc(VoipCallPlugin)
public class VoipCallPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VoipCallPlugin"
    public let jsName = "VoipCall"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showIncomingCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingAnswer", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        VoipCallManager.shared.plugin = self
        VoipCallManager.shared.start()
    }

    @objc func register(_ call: CAPPluginCall) {
        VoipCallManager.shared.start()
        call.resolve(["token": VoipCallManager.shared.voipToken ?? ""])
    }

    @objc func showIncomingCall(_ call: CAPPluginCall) {
        let callId = call.getString("callId") ?? UUID().uuidString
        VoipCallManager.shared.reportIncomingCall(
            callId: callId,
            callerName: call.getString("callerName") ?? "Scene Partner",
            roomUrl: call.getString("roomUrl") ?? "",
            hasVideo: call.getBool("hasVideo") ?? true
        )
        call.resolve(["callId": callId])
    }

    @objc func endCall(_ call: CAPPluginCall) {
        if let callId = call.getString("callId") { VoipCallManager.shared.endCall(callId: callId) }
        call.resolve()
    }

    @objc func getPendingAnswer(_ call: CAPPluginCall) {
        if let pending = VoipCallManager.shared.pendingAnswer {
            VoipCallManager.shared.pendingAnswer = nil
            call.resolve(["callId": pending["callId"] ?? "", "roomUrl": pending["roomUrl"] ?? ""])
        } else {
            call.resolve([:])
        }
    }
}
