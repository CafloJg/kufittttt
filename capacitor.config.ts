import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kiifit.app',
  appName: 'KiiFit',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      '*.google.com',
      '*.googleapis.com',
      '*.firebaseapp.com',
      '*.firebase.googleapis.com',
      '*.firebasestorage.googleapis.com'
    ]
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com']
    }
  }
};

export default config;
