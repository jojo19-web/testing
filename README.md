# Eggplant Disease Detector

Eggplant Disease Detector is an Android app that helps identify common eggplant diseases from photos. The app analyzes images on the phone, so basic scanning works without an internet connection.

## For app users

- Take a photo of an eggplant leaf or fruit and view the detected disease.
- Hold the camera button for live detection. The app shows the live detection while you hold the button and opens the result screen as soon as you release it.
- Choose a photo from your Gallery and scan it.
- Save disease results in **My Scans** and view them later.
- Share a disease result to **Global Scans** when you choose to share it.
- Send a private request when the app cannot identify a disease.
- Browse the disease guide, care tips, settings, notifications, and privacy information.
- Use English or Filipino (Tagalog), and choose light, dark, or system colors.

Basic scanning, the disease guide, and My Scans work offline. Global Scans, disease requests, and other online features need an internet connection.

## Download the demo APK

[Download the latest demo APK from GitHub Releases](https://github.com/localtradings/Eggplant_Finals_Thesis/releases/latest)

The demo APK is made for testing and thesis demonstrations. It is debug-signed and is not a Google Play Store release. Android may ask you to allow installation from the browser or file manager.

## For developers

### Requirements

- Android Studio with JDK 17 or newer
- Android SDK 36
- Android 8.0 (API 26) or newer

Open the project in Android Studio and allow Gradle to finish syncing.

### Build and test

Run these commands from the project folder:

```sh
./gradlew testDebugUnitTest
./gradlew lintDebug
./gradlew assembleDebug assembleDemo
./gradlew assembleDebugAndroidTest
./gradlew assembleRelease
```

The `demo` build is the release-style version used for testing. It is debug-signed so it can be installed directly on a test phone. It is not configured for Play Store publishing.

### Optional online setup

The app can use the deployed admin API and Supabase for Global Scans, disease requests, and catalog updates. These services are optional; the app remains usable offline when they are unavailable.

The public service URLs are already included. They can be changed with these Gradle properties:

```sh
./gradlew assembleDemo \
  -PEGGPLANT_API_BASE_URL="https://example.com" \
  -PEGGPLANT_SUPABASE_URL="https://example.supabase.co" \
  -PEGGPLANT_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"
```

Never put a private or service-role key in the Android app. Private keys must stay on the server.

## How the app works

- The disease model runs on the phone. Images do not need to be sent to a server for detection.
- Room stores the disease guide, My Scans, settings, notifications, and queued online actions on the device.
- WorkManager sends queued online actions when the connection is available.
- The optional admin website is deployed at [eggplant-disease-admin.vercel.app](https://eggplant-disease-admin.vercel.app).
- The admin website manages Global Scans, disease requests, disease information, and administrator access.

## Privacy and sharing

- Scanning and My Scans stay on the device unless you choose an online action.
- A scan is sent to Global Scans only after the user explicitly chooses **Share**.
- Global Scans do not show the user's identity.
- Missing-disease request photos are private to the requester and administrators.
- Public photos expire after 180 days. Reports can temporarily hide a scan while it is reviewed.
- The **Delete my shared cloud data** action removes the user's shared contributions.
- The app has no advertisements, payments, or user profiles.

## Testing limits

Local tests and builds confirm that the code compiles and the app's automated checks pass. They do not replace testing on the final phone with real eggplant photos. Camera alignment, speed, heat, battery use, and detection accuracy should be checked on the target Infinix HOT 60 Pro+.

## License and third-party notices

The packaged model metadata identifies the Ultralytics YOLO model/export as AGPL-3.0. Its license is kept at `third_party/licenses/AGPL-3.0.txt`. NCNN and its bundled components keep their notices in `app/src/main/cpp/third_party/ncnn/LICENSE.txt`. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for more information.
