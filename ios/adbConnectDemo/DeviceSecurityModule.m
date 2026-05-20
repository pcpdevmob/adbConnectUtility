#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DeviceSecurityModule, NSObject)

RCT_EXTERN_METHOD(isEmulator:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
