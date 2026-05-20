# ADB connection detection — manual verification

Rebuild native app before testing: `npm run android:release`

After each scenario, **force-stop the app and reopen** to verify a fresh audit.

| Step | Action | Expected |
|------|--------|----------|
| 1 | USB debugging ON, not connected to PC | Login screen |
| 2 | Plug USB, authorize ADB | Security block screen |
| 3 | Unplug USB (debugging still ON) | Kill app → reopen → Login screen |
| 4 | Disable USB debugging | Kill app → reopen → Login screen |
| 5 | Turn off Developer options | Kill app → reopen → Login screen |
| 6 | Wireless debugging ON, PC not connected | Login screen |
| 7 | Wireless debugging ON, PC connected | Security block screen |
| 8 | Run on Android emulator or iOS Simulator | Security block screen (`emulator-detected`) |

In `__DEV__`, check Metro logs for `[DeviceSecurity] ADB connection check` and `[DeviceSecurity] Emulator check`.
