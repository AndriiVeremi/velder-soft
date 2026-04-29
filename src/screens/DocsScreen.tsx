import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Image,
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  where,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { notify } from '../utils/notify';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import {
  FolderOpen,
  Folder,
  Plus,
  Trash2,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Upload,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { StackScreenProps } from '@react-navigation/stack';

interface DocsCategory {
  id: string;
  name: string;
  createdAt: any;
}

interface DocsFolder {
  id: string;
  name: string;
  categoryId: string;
  createdAt: any;
}

interface DocsFile {
  id: string;
  name: string;
  folderId: string;
  fileUrl: string;
  filePath: string;
  fileType: 'pdf' | 'image';
  createdAt: any;
}

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Header = styled.View`
  padding: 16px 20px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
  flex-direction: row;
  align-items: center;
`;

const HeaderTitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f20}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  flex: 1;
`;

const Breadcrumb = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const ItemCard = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 6px 15px;
  padding: 15px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  flex-direction: row;
  align-items: center;
`;

const ItemName = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f15}px;
  font-weight: 500;
  color: ${(props) => props.theme.colors.text};
  flex: 1;
  margin-left: 12px;
`;

const Fab = styled.TouchableOpacity`
  position: absolute;
  bottom: 25px;
  right: 25px;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background-color: ${(props) => props.theme.colors.primary};
  justify-content: center;
  align-items: center;
  elevation: 5;
`;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const ModalBox = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 25px;
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
`;

const ModalTitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.lg}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  margin-bottom: 20px;
`;

const StyledInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  color: ${(props) => props.theme.colors.text};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  font-size: ${(props) => props.theme.fontSize.f15}px;
`;

const ActionBtn = styled.TouchableOpacity<{ color?: string }>`
  background-color: ${(props) => props.color || props.theme.colors.primary};
  padding: 14px;
  border-radius: 10px;
  align-items: center;
  margin-bottom: 10px;
`;

const ActionBtnText = styled(RNText)`
  color: white;
  font-weight: bold;
  font-size: ${(props) => props.theme.fontSize.f15}px;
`;

const EmptyText = styled(RNText)`
  text-align: center;
  margin-top: 60px;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.fontSize.f15}px;
`;

const FilePreview = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 10px;
  margin-top: 10px;
`;

type Level = 'categories' | 'folders' | 'files';

type Props = StackScreenProps<any, 'Docs'>;

const DocsScreen = ({ navigation }: Props) => {
  const { role } = useAuth();
  const { theme } = useAppTheme();

  const [level, setLevel] = useState<Level>('categories');
  const [selectedCategory, setSelectedCategory] = useState<DocsCategory | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DocsFolder | null>(null);

  const [categories, setCategories] = useState<DocsCategory[]>([]);
  const [folders, setFolders] = useState<DocsFolder[]>([]);
  const [files, setFiles] = useState<DocsFile[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState<DocsFile | null>(null);

  // Завантаження категорій
  useEffect(() => {
    const q = query(collection(db, 'docs_categories'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocsCategory));
      setLoading(false);
    });
  }, []);

  // Завантаження папок при виборі категорії
  useEffect(() => {
    if (!selectedCategory) return;
    const q = query(
      collection(db, 'docs_folders'),
      where('categoryId', '==', selectedCategory.id),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      setFolders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocsFolder));
      setLoading(false);
    });
  }, [selectedCategory]);

  // Завантаження файлів при виборі папки
  useEffect(() => {
    if (!selectedFolder) return;
    const q = query(
      collection(db, 'docs_files'),
      where('folderId', '==', selectedFolder.id),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocsFile));
      setLoading(false);
    });
  }, [selectedFolder]);

  const goBack = () => {
    if (level === 'files') {
      setLevel('folders');
      setSelectedFolder(null);
    } else if (level === 'folders') {
      setLevel('categories');
      setSelectedCategory(null);
    }
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) return notify.error('Wpisz nazwę kategorii');
    setSaving(true);
    try {
      await addDoc(collection(db, 'docs_categories'), {
        name: newName.trim(),
        createdAt: serverTimestamp(),
      });
      setNewName('');
      setModalVisible(false);
      notify.success('Kategoria dodana');
    } catch (e) {
      notify.error('Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFolder = async () => {
    if (!newName.trim()) return notify.error('Wpisz nazwę folderu');
    setSaving(true);
    try {
      await addDoc(collection(db, 'docs_folders'), {
        name: newName.trim(),
        categoryId: selectedCategory!.id,
        createdAt: serverTimestamp(),
      });
      setNewName('');
      setModalVisible(false);
      notify.success('Folder dodany');
    } catch (e) {
      notify.error('Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setSaving(true);
      setModalVisible(false);

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filePath = `docs/${selectedFolder!.id}/${Date.now()}_${asset.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, blob);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'docs_files'), {
        name: asset.name,
        folderId: selectedFolder!.id,
        fileUrl,
        filePath,
        fileType: 'pdf',
        createdAt: serverTimestamp(),
      });
      notify.success('PDF dodany');
    } catch (e) {
      notify.error('Błąd przesyłania');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setSaving(true);
      setModalVisible(false);

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileName = `${Date.now()}.jpg`;
      const filePath = `docs/${selectedFolder!.id}/${fileName}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, blob);
      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'docs_files'), {
        name: asset.fileName || fileName,
        folderId: selectedFolder!.id,
        fileUrl,
        filePath,
        fileType: 'image',
        createdAt: serverTimestamp(),
      });
      notify.success('Zdjęcie dodane');
    } catch (e) {
      notify.error('Błąd przesyłania');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = (id: string) => {
    const perform = async () => {
      const foldersSnap = await getDocs(
        query(collection(db, 'docs_folders'), where('categoryId', '==', id))
      );
      for (const f of foldersSnap.docs) {
        await deleteFolder(f.id, true);
      }
      await deleteDoc(doc(db, 'docs_categories', id));
      notify.success('Usunięto');
    };
    confirmDelete(perform);
  };

  const deleteFolder = async (id: string, silent = false) => {
    const filesSnap = await getDocs(
      query(collection(db, 'docs_files'), where('folderId', '==', id))
    );
    for (const f of filesSnap.docs) {
      const data = f.data();
      try {
        await deleteObject(ref(storage, data.filePath));
      } catch (e) {}
      await deleteDoc(doc(db, 'docs_files', f.id));
    }
    await deleteDoc(doc(db, 'docs_folders', id));
    if (!silent) notify.success('Usunięto');
  };

  const deleteFolderConfirm = (id: string) => confirmDelete(() => deleteFolder(id));

  const deleteFile = (file: DocsFile) => {
    const perform = async () => {
      try {
        await deleteObject(ref(storage, file.filePath));
      } catch (e) {}
      await deleteDoc(doc(db, 'docs_files', file.id));
      notify.success('Usunięto');
    };
    confirmDelete(perform);
  };

  const confirmDelete = (action: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Czy na pewno chcesz usunąć?')) action();
    } else {
      Alert.alert('Usuń', 'Czy na pewno chcesz usunąć?', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Usuń', style: 'destructive', onPress: action },
      ]);
    }
  };

  const openFile = async (file: DocsFile) => {
    if (file.fileType === 'pdf') {
      await WebBrowser.openBrowserAsync(file.fileUrl);
    } else {
      setPreviewFile(file);
    }
  };

  const getHeaderTitle = () => {
    if (level === 'files') return selectedFolder!.name;
    if (level === 'folders') return selectedCategory!.name;
    return 'Dokumentacja';
  };

  const getBreadcrumb = () => {
    if (level === 'files') return `Dokumentacja › ${selectedCategory!.name}`;
    if (level === 'folders') return 'Dokumentacja';
    return null;
  };

  const renderCategories = () => (
    <FlatList
      data={categories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingVertical: 10 }}
      renderItem={({ item }) => (
        <ItemCard
          theme={theme}
          onPress={() => {
            setSelectedCategory(item);
            setLevel('folders');
            setLoading(true);
          }}
        >
          <Folder size={24} color={theme.colors.primary} />
          <ItemName theme={theme}>{item.name}</ItemName>
          {role === 'DIRECTOR' && (
            <TouchableOpacity onPress={() => deleteCategory(item.id)} style={{ padding: 8 }}>
              <Trash2 size={18} color={theme.colors.error} />
            </TouchableOpacity>
          )}
          <ChevronRight size={18} color={theme.colors.border} style={{ marginLeft: 4 }} />
        </ItemCard>
      )}
      ListEmptyComponent={<EmptyText theme={theme}>Brak kategorii dokumentacji.</EmptyText>}
    />
  );

  const renderFolders = () => (
    <FlatList
      data={folders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingVertical: 10 }}
      renderItem={({ item }) => (
        <ItemCard
          theme={theme}
          onPress={() => {
            setSelectedFolder(item);
            setLevel('files');
            setLoading(true);
          }}
        >
          <FolderOpen size={24} color="#FF9800" />
          <ItemName theme={theme}>{item.name}</ItemName>
          {role === 'DIRECTOR' && (
            <TouchableOpacity onPress={() => deleteFolderConfirm(item.id)} style={{ padding: 8 }}>
              <Trash2 size={18} color={theme.colors.error} />
            </TouchableOpacity>
          )}
          <ChevronRight size={18} color={theme.colors.border} style={{ marginLeft: 4 }} />
        </ItemCard>
      )}
      ListEmptyComponent={<EmptyText theme={theme}>Brak folderów w tej kategorii.</EmptyText>}
    />
  );

  const renderFiles = () => (
    <FlatList
      data={files}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingVertical: 10 }}
      renderItem={({ item }) => (
        <ItemCard theme={theme} onPress={() => openFile(item)}>
          {item.fileType === 'pdf' ? (
            <FileText size={24} color="#F44336" />
          ) : (
            <ImageIcon size={24} color="#4CAF50" />
          )}
          <ItemName theme={theme} numberOfLines={2}>
            {item.name}
          </ItemName>
          {role === 'DIRECTOR' && (
            <TouchableOpacity onPress={() => deleteFile(item)} style={{ padding: 8 }}>
              <Trash2 size={18} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </ItemCard>
      )}
      ListEmptyComponent={<EmptyText theme={theme}>Brak plików w tym folderze.</EmptyText>}
    />
  );

  return (
    <Container theme={theme}>
      <Header theme={theme}>
        {level !== 'categories' && (
          <TouchableOpacity onPress={goBack} style={{ marginRight: 12 }}>
            <ArrowLeft size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <HeaderTitle theme={theme}>{getHeaderTitle()}</HeaderTitle>
          {getBreadcrumb() && <Breadcrumb theme={theme}>{getBreadcrumb()}</Breadcrumb>}
        </View>
      </Header>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} />
      ) : (
        <>
          {level === 'categories' && renderCategories()}
          {level === 'folders' && renderFolders()}
          {level === 'files' && renderFiles()}
        </>
      )}

      {role === 'DIRECTOR' && (
        <Fab theme={theme} onPress={() => setModalVisible(true)}>
          {saving ? <ActivityIndicator color="white" /> : <Plus size={30} color="white" />}
        </Fab>
      )}

      {/* Модаль для категорій і папок */}
      <Modal visible={modalVisible && level !== 'files'} transparent animationType="slide">
        <ModalOverlay>
          <ModalBox theme={theme}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
            >
              <ModalTitle theme={theme}>
                {level === 'categories' ? 'Nowa kategoria' : 'Nowy folder'}
              </ModalTitle>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <StyledInput
              theme={theme}
              placeholder={level === 'categories' ? 'Np. Panele medyczne' : 'Np. INMED'}
              placeholderTextColor={theme.colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <ActionBtn
              theme={theme}
              onPress={level === 'categories' ? handleAddCategory : handleAddFolder}
            >
              <ActionBtnText>Dodaj</ActionBtnText>
            </ActionBtn>
          </ModalBox>
        </ModalOverlay>
      </Modal>

      {/* Модаль для завантаження файлів */}
      <Modal visible={modalVisible && level === 'files'} transparent animationType="slide">
        <ModalOverlay>
          <ModalBox theme={theme}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}
            >
              <ModalTitle theme={theme}>Dodaj plik</ModalTitle>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ActionBtn theme={theme} onPress={handleUploadPdf}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <FileText size={20} color="white" />
                <ActionBtnText>Wybierz PDF</ActionBtnText>
              </View>
            </ActionBtn>
            <ActionBtn theme={theme} color="#4CAF50" onPress={handleUploadImage}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ImageIcon size={20} color="white" />
                <ActionBtnText>Wybierz zdjęcie</ActionBtnText>
              </View>
            </ActionBtn>
          </ModalBox>
        </ModalOverlay>
      </Modal>

      {/* Перегляд фото */}
      <Modal visible={!!previewFile} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
            onPress={() => setPreviewFile(null)}
          >
            <X size={30} color="white" />
          </TouchableOpacity>
          {previewFile && (
            <Image
              source={{ uri: previewFile.fileUrl }}
              style={{ width: '95%', height: '70%', borderRadius: 10 }}
              resizeMode="contain"
            />
          )}
          {previewFile && (
            <RNText style={{ color: 'white', marginTop: 15, fontSize: theme.fontSize.f14 }}>
              {previewFile.name}
            </RNText>
          )}
        </View>
      </Modal>
    </Container>
  );
};

export default DocsScreen;
