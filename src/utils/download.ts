import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { notify } from './notify';

export const downloadImage = async (url: string, fileName: string) => {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      notify.success('Pobieranie rozpoczęte');
      return;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      notify.error('Brak uprawnień do galerii');
      return;
    }

    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!baseDir) {
      notify.error('Błąd systemy plików');
      return;
    }

    const fileUri = baseDir + fileName;
    const downloadRes = await FileSystem.downloadAsync(url, fileUri);

    if (downloadRes.status === 200) {
      await MediaLibrary.createAssetAsync(downloadRes.uri);
      notify.success('Zdjęcie zapisane w galerii');
    } else {
      throw new Error('Download failed');
    }
  } catch (error) {
    console.error('Download error:', error);
    notify.error('Błąd pobierania');
  }
};
