package com.adbconnectdemo.security

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File

/**
 * Detects active ADB sessions to a host (USB or wireless), not merely debugging toggles in Settings.
 * Wireless detection uses ADB ports only (5555-5558); generic TCP is intentionally excluded to
 * avoid false positives from normal app traffic.
 */
class DeviceSecurityModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private var lastConnected: Boolean? = null
  private var usbReceiver: BroadcastReceiver? = null
  private var settingsObserver: ContentObserver? = null

  override fun getName(): String = NAME

  override fun initialize() {
    super.initialize()
    registerUsbReceiver()
    registerSettingsObserver()
    emitIfChanged(evaluateAdbConnectedToHost())
  }

  override fun invalidate() {
    unregisterUsbReceiver()
    unregisterSettingsObserver()
    super.invalidate()
  }

  @ReactMethod
  fun isAdbConnectedToHost(promise: Promise) {
    try {
      promise.resolve(evaluateAdbConnectedToHost())
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  /** @deprecated Use [isAdbConnectedToHost]; kept for backward compatibility. */
  @ReactMethod
  fun isUsbDebuggingEnabled(promise: Promise) {
    isAdbConnectedToHost(promise)
  }

  @ReactMethod
  fun getAdbConnectionDiagnostics(promise: Promise) {
    try {
      promise.resolve(buildDiagnosticsMap())
    } catch (_: Exception) {
      promise.resolve(Arguments.createMap())
    }
  }

  @ReactMethod
  fun isEmulator(promise: Promise) {
    try {
      promise.resolve(evaluateIsEmulator())
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for NativeEventEmitter on Android.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter on Android.
  }

  private fun registerUsbReceiver() {
    if (usbReceiver != null) {
      return
    }

    usbReceiver =
        object : BroadcastReceiver() {
          override fun onReceive(context: Context?, intent: Intent?) {
            emitIfChanged(evaluateAdbConnectedToHost(usbStateIntent = intent))
          }
        }

    val filter = IntentFilter(ACTION_USB_STATE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      reactContext.registerReceiver(usbReceiver, filter)
    }
  }

  private fun unregisterUsbReceiver() {
    usbReceiver?.let { receiver ->
      try {
        reactContext.unregisterReceiver(receiver)
      } catch (_: IllegalArgumentException) {
        // Receiver was not registered.
      }
    }
    usbReceiver = null
  }

  private fun registerSettingsObserver() {
    if (settingsObserver != null) {
      return
    }

    settingsObserver =
        object : ContentObserver(Handler(Looper.getMainLooper())) {
          override fun onChange(selfChange: Boolean) {
            emitIfChanged(evaluateAdbConnectedToHost())
          }

          override fun onChange(selfChange: Boolean, uri: Uri?) {
            emitIfChanged(evaluateAdbConnectedToHost())
          }
        }

    val resolver = reactContext.contentResolver
    val observer = settingsObserver ?: return

    resolver.registerContentObserver(
        Settings.Global.getUriFor(Settings.Global.ADB_ENABLED),
        false,
        observer,
    )
    resolver.registerContentObserver(
        Settings.Global.getUriFor(ADB_WIFI_ENABLED),
        false,
        observer,
    )
    resolver.registerContentObserver(
        Settings.Global.getUriFor(Settings.Global.DEVELOPMENT_SETTINGS_ENABLED),
        false,
        observer,
    )
  }

  private fun unregisterSettingsObserver() {
    settingsObserver?.let { observer ->
      reactContext.contentResolver.unregisterContentObserver(observer)
    }
    settingsObserver = null
  }

  private fun emitIfChanged(connected: Boolean) {
    if (lastConnected == connected) {
      return
    }
    lastConnected = connected

    if (!reactContext.hasActiveReactInstance()) {
      return
    }

    val params =
        Arguments.createMap().apply {
          putBoolean("connected", connected)
        }

    reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_ADB_CONNECTION_CHANGED, params)
  }

  private fun evaluateAdbConnectedToHost(usbStateIntent: Intent? = null): Boolean {
    if (!isDeveloperOptionsEnabled()) {
      return false
    }

    if (!isAnyAdbDebuggingEnabled()) {
      return false
    }

    return isUsbAdbConnected(usbStateIntent) || isWirelessAdbConnected()
  }

  private fun buildDiagnosticsMap(): WritableMap {
    val usbState = getUsbStateIntent(null)
    val usbConnected =
        usbState?.getBooleanExtra(EXTRA_USB_CONNECTED, false) ?: false
    val usbConfigured =
        usbState?.getBooleanExtra(EXTRA_USB_CONFIGURED, false) ?: false
    val usbConfig = getSystemProperty(PROP_USB_CONFIG).orEmpty()
    val usbStateProp = getSystemProperty(PROP_USB_STATE).orEmpty()
    val usbPath = isUsbAdbConnected(usbState)
    val wirelessPath = isWirelessAdbConnected()

    return Arguments.createMap().apply {
      putBoolean("connected", usbPath || wirelessPath)
      putBoolean("usbPath", usbPath)
      putBoolean("wirelessPath", wirelessPath)
      putBoolean("adbEnabled", isUsbDebuggingSettingEnabled())
      putBoolean("wirelessAdbEnabled", isWirelessDebuggingSettingEnabled())
      putBoolean("devOptionsEnabled", isDeveloperOptionsEnabled())
      putBoolean("usbConnected", usbConnected)
      putBoolean("usbConfigured", usbConfigured)
      putString("usbConfig", usbConfig)
      putString("usbState", usbStateProp)
      putBoolean("adbdRunning", getSystemProperty(PROP_ADBD_SERVICE) == "running")
      putBoolean("emulator", evaluateIsEmulator())
    }
  }

  private fun evaluateIsEmulator(): Boolean {
    return Build.FINGERPRINT.startsWith("generic") ||
        Build.FINGERPRINT.startsWith("unknown") ||
        Build.MODEL.contains("google_sdk") ||
        Build.MODEL.contains("Emulator") ||
        Build.MODEL.contains("Android SDK built for x86") ||
        Build.MANUFACTURER.contains("Genymotion") ||
        (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic")) ||
        Build.PRODUCT == "google_sdk" ||
        Build.HARDWARE.contains("goldfish") ||
        Build.HARDWARE.contains("ranchu")
  }

  private fun isDeveloperOptionsEnabled(): Boolean {
    return Settings.Global.getInt(
        reactContext.contentResolver,
        Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
        0,
    ) == 1
  }

  private fun isAnyAdbDebuggingEnabled(): Boolean {
    return isUsbDebuggingSettingEnabled() || isWirelessDebuggingSettingEnabled()
  }

  private fun isUsbDebuggingSettingEnabled(): Boolean {
    val resolver = reactContext.contentResolver
    return Settings.Global.getInt(resolver, Settings.Global.ADB_ENABLED, 0) == 1 ||
        Settings.Secure.getInt(resolver, Settings.Secure.ADB_ENABLED, 0) == 1
  }

  private fun isWirelessDebuggingSettingEnabled(): Boolean {
    return Settings.Global.getInt(reactContext.contentResolver, ADB_WIFI_ENABLED, 0) == 1
  }

  private fun isUsbAdbConnected(usbStateIntent: Intent?): Boolean {
    if (!isUsbDebuggingSettingEnabled()) {
      return false
    }

    val usbState = getUsbStateIntent(usbStateIntent) ?: return false
    val connected = usbState.getBooleanExtra(EXTRA_USB_CONNECTED, false)
    val configured = usbState.getBooleanExtra(EXTRA_USB_CONFIGURED, false)

    if (!connected || !configured) {
      return false
    }

    return usbConfigContainsAdb()
  }

  private fun getUsbStateIntent(usbStateIntent: Intent?): Intent? {
    if (usbStateIntent != null && usbStateIntent.action == ACTION_USB_STATE) {
      return usbStateIntent
    }

    val filter = IntentFilter(ACTION_USB_STATE)
    return reactContext.registerReceiver(null, filter)
  }

  private fun usbConfigContainsAdb(): Boolean {
    val config = getSystemProperty(PROP_USB_CONFIG).orEmpty()
    val state = getSystemProperty(PROP_USB_STATE).orEmpty()
    return config.contains("adb") || state.contains("adb")
  }

  private fun isWirelessAdbConnected(): Boolean {
    if (!isWirelessDebuggingSettingEnabled()) {
      return false
    }

    if (getSystemProperty(PROP_ADBD_SERVICE) != "running") {
      return false
    }

    return hasEstablishedAdbPortConnection()
  }

  private fun hasEstablishedAdbPortConnection(): Boolean {
    return checkProcNetTcp(File("/proc/net/tcp"), ADB_PORT_HEX) ||
        checkProcNetTcp(File("/proc/net/tcp6"), ADB_PORT_HEX)
  }

  private fun checkProcNetTcp(file: File, ports: Set<String>): Boolean {
    if (!file.canRead()) {
      return false
    }

    return file.readLines().drop(1).any { line ->
      val parts = line.trim().split(Regex("\\s+"))
      if (parts.size < 4) {
        return@any false
      }

      val localAddress = parts[1]
      val state = parts[3]
      if (state != TCP_STATE_ESTABLISHED) {
        return@any false
      }

      val portHex = localAddress.substringAfter(":", "").uppercase()
      ports.contains(portHex)
    }
  }

  private fun getSystemProperty(key: String): String? {
    return try {
      val clazz = Class.forName("android.os.SystemProperties")
      val method = clazz.getMethod("get", String::class.java, String::class.java)
      method.invoke(null, key, "") as String
    } catch (_: Exception) {
      null
    }
  }

  companion object {
    const val NAME = "DeviceSecurityModule"
    const val EVENT_ADB_CONNECTION_CHANGED = "AdbConnectionChanged"

    // UsbManager.ACTION_USB_STATE / USB_* are @hide in the public SDK; use literal values.
    private const val ACTION_USB_STATE = "android.hardware.usb.action.USB_STATE"
    private const val EXTRA_USB_CONNECTED = "connected"
    private const val EXTRA_USB_CONFIGURED = "configured"

    private const val ADB_WIFI_ENABLED = "adb_wifi_enabled"
    private const val PROP_USB_CONFIG = "sys.usb.config"
    private const val PROP_USB_STATE = "sys.usb.state"
    private const val PROP_ADBD_SERVICE = "init.svc.adbd"
    private const val TCP_STATE_ESTABLISHED = "01"

    // 5555-5558 in little-endian hex (common ADB ports).
    private val ADB_PORT_HEX = setOf("15B3", "15B4", "15B5", "15B6")
  }
}
