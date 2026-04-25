import React, { useEffect, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Text as RNText,
  View,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import styled from 'styled-components/native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import {
  Plus,
  ChevronRight,
  Folder,
  FileText,
  ArrowLeft,
  CheckCircle,
  Clock,
  Camera,
  Trash2,
} from 'lucide-react-native';
import { notify } from '../utils/notify';

const { width } = Dimensions.get('window');

interface Project {
  id: string;
  title: string;
  hospital: string;
  department: string;
  description: string;
  status?: 'IN_PROGRESS' | 'COMPLETED';
  pdfUrl?: string;
  pdfPath?: string;
  createdAt?: any;
}

interface ServiceRecord {
  id: string;
  hospital: string;
  department: string;
  photoUrl: string;
  photoPath: string;
  createdAt: any;
}

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Header = styled.View`
  padding: ${(props) => props.theme.spacing.md}px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
  flex-direction: row;
  align-items: center;
`;

const BreadcrumbText = styled(RNText)`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.primary};
  margin-left: 10px;
`;

const ItemCard = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.md}px;
  margin: 4px ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  flex-direction: row;
  align-items: center;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const ItemInfo = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const ItemTitle = styled(RNText)`
  font-size: 16px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const ItemSubtitle = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const PhotoGallery = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.md}px;
  margin-bottom: 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const PhotoTitle = styled(RNText)`
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const PhotoItem = styled.View`
  width: 120px;
  height: 120px;
  margin-right: 10px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #eee;
`;

const DeleteBtn = styled.TouchableOpacity`
  position: absolute;
  bottom: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 4px;
  border-radius: 12px;
`;

const DeptActions = styled.View`
  flex-direction: row;
  padding: 12px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const ActionBtn = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 10px 25px;
  border-radius: 25px;
  background-color: ${(props) => props.theme.colors.primary};
  elevation: 2;
`;

const HintText = styled(RNText)`
  font-size: 11px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 8px;
  text-align: center;
  font-style: italic;
`;

const StatusIndicator = styled.View<{ status?: string }>`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${(props) =>
    props.status === 'COMPLETED' ? props.theme.colors.success : '#FFA000'};
  margin-right: 6px;
`;

const StatusRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 2px;
`;

const AddButton = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.primary};
  width: 60px;
  height: 60px;
  border-radius: 30px;
  position: absolute;
  right: 20px;
  bottom: 20px;
  justify-content: center;
  align-items: center;
  elevation: 5;
`;

const DashboardScreen = ({ navigation }: any) => {
  const { role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Project[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Project));
      setProjects(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedHospital && selectedDepartment) {
      const q = query(
        collection(db, 'service_records'),
        where('hospital', '==', selectedHospital),
        where('department', '==', selectedDepartment),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: ServiceRecord[] = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as ServiceRecord));
        setRecords(data);
      });
      return () => unsubscribe();
    }
  }, [selectedHospital, selectedDepartment]);

  const uploadPhoto = async () => {
    if (records.length >= 15) {
      notify.error('Maksymalnie 15 zdjęć w tym archiwum');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: false });
    if (result.canceled) return;

    setUploading(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const filename = `dept_photos/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'service_records'), {
        hospital: selectedHospital,
        department: selectedDepartment,
        photoUrl: url,
        photoPath: filename,
        createdAt: serverTimestamp(),
      });
      notify.success('Dodano do archiwum');
    } catch (e) {
      notify.error('Błąd uploadu');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (record: ServiceRecord) => {
    if (role !== 'DIRECTOR') return;
    try {
      await deleteObject(ref(storage, record.photoPath));
      await deleteDoc(doc(db, 'service_records', record.id));
    } catch (e) {}
  };

  const goBack = () => {
    if (selectedDepartment) setSelectedDepartment(null);
    else if (selectedHospital) setSelectedHospital(null);
  };

  const hospitals = Array.from(new Set(projects.map((p) => p.hospital))).sort();
  const departments = selectedHospital
    ? Array.from(
        new Set(projects.filter((p) => p.hospital === selectedHospital).map((p) => p.department))
      ).sort()
    : [];
  const deptProjects = projects.filter(
    (p) => p.hospital === selectedHospital && p.department === selectedDepartment
  );

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  const renderContent = () => {
    if (!selectedHospital) {
      return (
        <FlatList
          data={hospitals}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <ItemCard onPress={() => setSelectedHospital(item)} theme={theme}>
              <Folder size={24} color={theme.colors.primary} />
              <ItemInfo>
                <ItemTitle theme={theme}>{item}</ItemTitle>
              </ItemInfo>
              <ChevronRight size={20} color={theme.colors.border} />
            </ItemCard>
          )}
        />
      );
    }

    if (!selectedDepartment) {
      return (
        <FlatList
          data={departments}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <ItemCard onPress={() => setSelectedDepartment(item)} theme={theme}>
              <Folder size={24} color="#FFA000" />
              <ItemInfo>
                <ItemTitle theme={theme}>{item}</ItemTitle>
              </ItemInfo>
              <ChevronRight size={20} color={theme.colors.border} />
            </ItemCard>
          )}
        />
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <DeptActions theme={theme}>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <ActionBtn
              onPress={uploadPhoto}
              theme={theme}
              title="Można dodać maksymalnie 15 zdjęć do archiwum"
            >
              <Camera size={20} color="white" />
              <RNText style={{ color: 'white', fontWeight: 'bold', marginLeft: 10 }}>
                Dodaj do archiwum
              </RNText>
            </ActionBtn>
            <HintText theme={theme}>Można dodać do 15 zdjęć dokumentujących efekt prac</HintText>
          </View>
        </DeptActions>

        {records.length > 0 && (
          <PhotoGallery theme={theme}>
            <PhotoTitle theme={theme}>Archiwum prac ({records.length}/15)</PhotoTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {records.map((r) => (
                <PhotoItem key={r.id}>
                  <Image source={{ uri: r.photoUrl }} style={{ width: '100%', height: '100%' }} />
                  {role === 'DIRECTOR' && (
                    <DeleteBtn onPress={() => deletePhoto(r)}>
                      <Trash2 size={12} color="white" />
                    </DeleteBtn>
                  )}
                </PhotoItem>
              ))}
            </ScrollView>
          </PhotoGallery>
        )}

        <FlatList
          data={deptProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemCard
              onPress={() => navigation.navigate('ProjectDetails', { project: item })}
              theme={theme}
            >
              <FileText
                size={24}
                color={item.status === 'COMPLETED' ? theme.colors.success : theme.colors.primary}
              />
              <ItemInfo>
                <ItemTitle theme={theme}>{item.title}</ItemTitle>
                <StatusRow>
                  <StatusIndicator status={item.status} theme={theme} />
                  <ItemSubtitle theme={theme}>
                    {item.status === 'COMPLETED' ? 'Zakończony' : 'W toku'}
                  </ItemSubtitle>
                </StatusRow>
              </ItemInfo>
              <ChevronRight size={20} color={theme.colors.border} />
            </ItemCard>
          )}
        />
      </View>
    );
  };

  return (
    <Container theme={theme}>
      {(selectedHospital || selectedDepartment) && (
        <Header theme={theme}>
          <TouchableOpacity onPress={goBack}>
            <ArrowLeft size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <BreadcrumbText theme={theme}>
            {selectedHospital} {selectedDepartment ? `> ${selectedDepartment}` : ''}
          </BreadcrumbText>
        </Header>
      )}
      {renderContent()}
      {role === 'DIRECTOR' && (
        <AddButton onPress={() => navigation.navigate('AddProject')} theme={theme}>
          <Plus size={30} color="white" />
        </AddButton>
      )}
      {uploading && (
        <ActivityIndicator
          size="large"
          style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}
        />
      )}
    </Container>
  );
};

export default DashboardScreen;
