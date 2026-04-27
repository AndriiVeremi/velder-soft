import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { notify } from './notify';

export const pickAndUploadPhoto = async (folder: string, customFileName?: string) => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false,
    });

    if (result.canceled) return null;

    const response = await fetch(result.assets[0].uri);
    const blob = await response.blob();

    const fileName = customFileName || `${Date.now()}.jpg`;
    const path = `${folder}/${fileName}`;
    const storageRef = ref(storage, path);
    const metadata = { contentType: 'image/jpeg' };

    await uploadBytes(storageRef, blob, metadata);
    const url = await getDownloadURL(storageRef);

    return { photoUrl: url, photoPath: path };
  } catch (error) {
    console.error('Upload error:', error);
    notify.error('Błąd podczas przesyłania zdjęcia');
    return null;
  }
};
