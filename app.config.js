export default {
  expo: {
    name: process.env.EXPO_PUBLIC_APP_NAME || 'VelderApp',
    slug: process.env.EXPO_PUBLIC_APP_SLUG || 'velder-soft',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/VelderIcon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#008744',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.velder.soft',
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.velder.soft',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        foregroundImage: './assets/icon-foreground.png',
        backgroundColor: '#008744',
      },
      navigationBar: {
        backgroundColor: '#ffffff',
        barStyle: 'dark-content',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '60063075-7a9b-47f6-ba92-4021b7514fed'}`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    plugins: [
      'expo-web-browser',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#008744',
          defaultChannel: 'default',
          sounds: [
            './assets/sound/alert.wav',
            './assets/sound/reminder.wav',
            './assets/sound/done.wav',
          ],
        },
      ],
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'Dozwól na dostęp do mikrofonu, aby móc dyktować przypomnienia.',
          speechRecognitionPermission: 'Dozwól на rozpoznawanie mowy, aby zamieniać głos na tekst.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '60063075-7a9b-47f6-ba92-4021b7514fed',
      },
    },
  },
};
