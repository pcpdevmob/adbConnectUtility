import Foundation
import React

@objc(DeviceSecurityModule)
class DeviceSecurityModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func isEmulator(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    #if targetEnvironment(simulator)
    resolve(true)
    #else
    resolve(ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] != nil)
    #endif
  }
}
