import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import {
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
  View,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
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
  updateDoc,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import {
  Plus,
  ChevronRight,
  Folder,
  FileText,
  ArrowLeft,
  Camera,
  Trash2,
  X,
  CheckCircle,
  Clock,
  Download,
} from 'lucide-react-native';
import { notify } from '../utils/notify';
import { downloadImage } from '../utils/download';
import { pickAndUploadPhoto } from '../utils/upload';
import { confirmDelete } from '../utils/confirm';
import { ModalOverlay, ModalContent, UploadOverlay, Fab } from '../components/CommonUI';
import { StackScreenProps } from '@react-navigation/stack';
import { Project, Hospital, Department, ServiceRecord } from '../types';

const { width } = Dimensions.get('window');

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Header = styled.View`
  padding: ${(props) => props.theme.spacing.md}px;
  background-color: ${(props) => props.theme.colors.accent};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
  flex-direction: row;
  align-items: center;
`;

const BreadcrumbText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.primary};
  margin-left: 10px;
  flex: 1;
`;

const ItemCard = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.md}px;
  margin: 6px ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.lg}px;
  flex-direction: row;
  align-items: center;
  border: 1px solid ${(props) => props.theme.colors.border};

  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;
  elevation: 2;
`;

const ItemInfo = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const ItemTitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const ItemSubtitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
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
  font-size: ${(props) => props.theme.fontSize.f14}px;
  font-weight: bold;
  margin-bottom: 10px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const PhotoItemContainer = styled.View`
  width: 120px;
  height: 120px;
  margin-right: 10px;
  border-radius: 8px;
  overflow: hidden;
  background-color: ${(props) => props.theme.colors.background};
`;

const ProjectImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const DeleteBtn = styled.TouchableOpacity`
  position: absolute;
  bottom: 4px;
  right: 4px;
  background-color: rgba(220, 53, 69, 0.8);
  padding: 6px;
  border-radius: 12px;
`;

const DownloadBtn = styled.TouchableOpacity`
  position: absolute;
  bottom: 4px;
  left: 4px;
  background-color: rgba(0, 135, 68, 0.8);
  padding: 6px;
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

const ActionBtnText = styled(RNText)`
  color: white;
  font-weight: bold;
  margin-left: 10px;
`;

const HintText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.xs}px;
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

const LoaderContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const EmptyRecordsText = styled(RNText)`
  text-align: center;
  margin-top: 50px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const CenterWrapper = styled.View`
  align-items: center;
  width: 100%;
`;

const StyledInput = styled.TextInput`
  background-color: ${(props) => props.theme.colors.background};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  border-radius: 8px;
  padding: 12px 16px;
  font-size: ${(props) => props.theme.fontSize.f16}px;
  margin-bottom: 20px;
  color: ${(props) => props.theme.colors.text};
`;

const ModalButtons = styled.View`
  flex-direction: row;
  justify-content: flex-end;
`;

const ModalBtn = styled.TouchableOpacity<{ primary?: boolean }>`
  padding: 10px 20px;
  border-radius: 8px;
  margin-left: 10px;
  background-color: ${(props) => (props.primary ? props.theme.colors.primary : 'transparent')};
`;

const ModalBtnText = styled(RNText)<{ primary?: boolean }>`
  font-weight: bold;
  color: ${(props) => (props.primary ? 'white' : props.theme.colors.textSecondary)};
`;

const ModalTitle = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f20}px;
  font-weight: bold;
  margin-bottom: 20px;
  color: ${(props) => props.theme.colors.text};
`;

type Props = StackScreenProps<any, 'Dashboard'>;

import { initializeNewClientDatabase, checkIsDbInitialized } from '../utils/initDb';

const DashboardScreen = ({ navigation }: Props) => {
  const { role } = useAuth();
  const [isDbReady, setIsDbReady] = useState(true);

  useEffect(() => {
    const checkDb = async () => {
      if (role === 'DIRECTOR') {
        const ready = await checkIsDbInitialized();
        setIsDbReady(ready);
      }
    };
    checkDb();
  }, [role]);

  const handleInitDb = async () => {
    const success = await initializeNewClientDatabase();
    if (success) setIsDbReady(true);
  };
  const { theme } = useAppTheme();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'HOSPITAL' | 'DEPARTMENT'>('HOSPITAL');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'hospitals'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setAllHospitals(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Hospital));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'departments'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setAllDepartments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Department));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setAllProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Project));
    });
  }, []);

  const hospitalsList = useMemo(() => {
    return [...allHospitals].sort((a, b) => a.name.localeCompare(b.name));
  }, [allHospitals]);

  const departmentsList = useMemo(() => {
    if (!selectedHospital) return [];
    return allDepartments
      .filter((d) => d.hospitalId === selectedHospital.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedHospital, allDepartments]);

  const projects = useMemo(() => {
    if (!selectedHospital || !selectedDepartment) return [];
    return allProjects.filter(
      (p) => p.hospitalId === selectedHospital.id && p.departmentId === selectedDepartment.id
    );
  }, [selectedHospital, selectedDepartment, allProjects]);

  useEffect(() => {
    if (selectedHospital && selectedDepartment) {
      const q = query(
        collection(db, 'service_records'),
        where('hospital', '==', selectedHospital.name),
        where('department', '==', selectedDepartment.name)
      );
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ServiceRecord);
        setRecords(
          data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
        );
      });
    }
  }, [selectedHospital, selectedDepartment]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || isCreating) return;
    const name = newFolderName.trim();
    setIsCreating(true);

    try {
      if (modalType === 'HOSPITAL') {
        await addDoc(collection(db, 'hospitals'), { name, createdAt: serverTimestamp() });
        notify.success('Szpital dodany');
      } else if (selectedHospital) {
        await addDoc(collection(db, 'departments'), {
          hospitalId: selectedHospital.id,
          hospitalName: selectedHospital.name,
          name,
          status: 'IN_PROGRESS',
          createdAt: serverTimestamp(),
        });
        notify.success('Oddział dodany');
      }
      setIsModalVisible(false);
      setNewFolderName('');
    } catch (e) {
      notify.error('Błąd zapisu');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleDeptStatus = async (dept: Department) => {
    if (role !== 'DIRECTOR') return;
    const newStatus = dept.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await updateDoc(doc(db, 'departments', dept.id), { status: newStatus });
      notify.success(newStatus === 'COMPLETED' ? 'Zakończono' : 'W toku');
    } catch (e) {
      notify.error('Błąd statusu');
    }
  };

  const handleDeleteHospital = (hosp: Hospital) => {
    if (role !== 'DIRECTOR') return;
    const perform = async () => {
      try {
        const projectsSnap = await getDocs(
          query(collection(db, 'projects'), where('hospitalId', '==', hosp.id))
        );
        for (const pDoc of projectsSnap.docs) {
          const data = pDoc.data();
          if (data.pdfPath) await deleteObject(ref(storage, data.pdfPath)).catch(() => {});
          await deleteDoc(doc(db, 'projects', pDoc.id));
        }
        const deptsSnap = await getDocs(
          query(collection(db, 'departments'), where('hospitalId', '==', hosp.id))
        );
        for (const dDoc of deptsSnap.docs) await deleteDoc(doc(db, 'departments', dDoc.id));
        await deleteDoc(doc(db, 'hospitals', hosp.id));
        notify.success('Usunięto');
        if (selectedHospital?.id === hosp.id) setSelectedHospital(null);
      } catch (e) {
        notify.error('Błąd');
      }
    };

    confirmDelete(`Usunąć "${hosp.name}"?`, perform);
  };

  const handleDeleteDepartment = (dept: Department) => {
    if (role !== 'DIRECTOR') return;
    const perform = async () => {
      try {
        const projectsSnap = await getDocs(
          query(collection(db, 'projects'), where('departmentId', '==', dept.id))
        );
        for (const pDoc of projectsSnap.docs) {
          const data = pDoc.data();
          if (data.pdfPath) await deleteObject(ref(storage, data.pdfPath)).catch(() => {});
          await deleteDoc(doc(db, 'projects', pDoc.id));
        }
        await deleteDoc(doc(db, 'departments', dept.id));
        notify.success('Usunięto');
        if (selectedDepartment?.id === dept.id) setSelectedDepartment(null);
      } catch (e) {
        notify.error('Błąd');
      }
    };

    confirmDelete(`Usunąć oddział "${dept.name}"?`, perform);
  };

  const uploadPhoto = async () => {
    if (!selectedHospital || !selectedDepartment) return;
    if (records.length >= 15) return notify.error('Limit 15 zdjęć');

    setUploading(true);
    const result = await pickAndUploadPhoto('dept_photos');
    if (result) {
      try {
        await addDoc(collection(db, 'service_records'), {
          hospital: selectedHospital.name,
          department: selectedDepartment.name,
          photoUrl: result.photoUrl,
          photoPath: result.photoPath,
          createdAt: serverTimestamp(),
        });
        notify.success('Dodano');
      } catch (e) {
        notify.error('Błąd zapisu');
      }
    }
    setUploading(false);
  };

  const deletePhoto = async (record: ServiceRecord) => {
    if (role !== 'DIRECTOR') return;
    try {
      await deleteObject(ref(storage, record.photoPath));
      await deleteDoc(doc(db, 'service_records', record.id));
    } catch (e) {
      notify.error('Błąd');
    }
  };

  const goBack = () => {
    if (selectedDepartment) setSelectedDepartment(null);
    else if (selectedHospital) setSelectedHospital(null);
  };

  if (loading)
    return (
      <LoaderContainer>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LoaderContainer>
    );

  const renderContent = () => {
    if (!selectedHospital) {
      return (
        <View style={{ flex: 1 }}>
          <FlatList
            data={hospitalsList}
            keyExtractor={(item) => item.id || ''}
            renderItem={({ item }) => (
              <ItemCard onPress={() => setSelectedHospital(item)} theme={theme}>
                <Folder size={24} color={theme.colors.primary} />
                <ItemInfo>
                  <ItemTitle theme={theme}>{item.name}</ItemTitle>
                </ItemInfo>
                {role === 'DIRECTOR' && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteHospital(item);
                    }}
                    style={{ padding: 10 }}
                  >
                    <Trash2 size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
                <ChevronRight size={20} color={theme.colors.border} />
              </ItemCard>
            )}
            ListEmptyComponent={<EmptyRecordsText theme={theme}>Brak szpitali.</EmptyRecordsText>}
          />
        </View>
      );
    }

    if (!selectedDepartment) {
      return (
        <View style={{ flex: 1 }}>
          <FlatList
            data={departmentsList}
            keyExtractor={(item) => item.id || ''}
            renderItem={({ item }) => (
              <ItemCard onPress={() => setSelectedDepartment(item)} theme={theme}>
                <Folder size={24} color={theme.colors.warning || '#FFA000'} />
                <ItemInfo>
                  <ItemTitle theme={theme}>{item.name}</ItemTitle>
                  <StatusRow>
                    <StatusIndicator status={item.status} theme={theme} />
                    <ItemSubtitle theme={theme}>
                      {item.status === 'COMPLETED' ? 'Zakończony' : 'W toku'}
                    </ItemSubtitle>
                  </StatusRow>
                </ItemInfo>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {role === 'DIRECTOR' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleDeptStatus(item);
                      }}
                      style={{ padding: 10, marginRight: 5 }}
                    >
                      {item.status === 'COMPLETED' ? (
                        <CheckCircle size={22} color={theme.colors.success} />
                      ) : (
                        <Clock size={22} color="#FFA000" />
                      )}
                    </TouchableOpacity>
                  )}
                  {role === 'DIRECTOR' && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteDepartment(item);
                      }}
                      style={{ padding: 10 }}
                    >
                      <Trash2 size={22} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                  <ChevronRight size={20} color={theme.colors.border} />
                </View>
              </ItemCard>
            )}
            ListEmptyComponent={
              <EmptyRecordsText theme={theme}>Brak oddziałów. Dodaj folder.</EmptyRecordsText>
            }
          />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <DeptActions theme={theme}>
          <CenterWrapper>
            <ActionBtn onPress={uploadPhoto} theme={theme}>
              <Camera size={20} color="white" />
              <ActionBtnText theme={theme}>Dodaj do archiwum</ActionBtnText>
            </ActionBtn>
            <HintText theme={theme}>Można dodać do 15 zdjęć</HintText>
          </CenterWrapper>
        </DeptActions>
        {records.length > 0 && (
          <PhotoGallery theme={theme}>
            <PhotoTitle theme={theme}>Archiwum prac ({records.length}/15)</PhotoTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {records.map((r) => (
                <PhotoItemContainer key={r.id} theme={theme}>
                  <ProjectImage source={{ uri: r.photoUrl }} />
                  <DownloadBtn onPress={() => downloadImage(r.photoUrl, `photo_${r.id}.jpg`)}>
                    <Download size={14} color="white" />
                  </DownloadBtn>
                  {role === 'DIRECTOR' && (
                    <DeleteBtn onPress={() => deletePhoto(r)}>
                      <Trash2 size={14} color="white" />
                    </DeleteBtn>
                  )}
                </PhotoItemContainer>
              ))}
            </ScrollView>
          </PhotoGallery>
        )}
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id || ''}
          renderItem={({ item }) => (
            <ItemCard
              onPress={() => navigation.navigate('ProjectDetails', { project: item })}
              theme={theme}
            >
              <FileText size={24} color={theme.colors.primary} />
              <ItemInfo>
                <ItemTitle theme={theme}>{item.title}</ItemTitle>
                <ItemSubtitle theme={theme}>{item.description}</ItemSubtitle>
              </ItemInfo>
              <ChevronRight size={20} color={theme.colors.border} />
            </ItemCard>
          )}
          ListEmptyComponent={<EmptyRecordsText theme={theme}>Brak dokumentów.</EmptyRecordsText>}
        />
      </View>
    );
  };

  const handleFabPress = () => {
    if (!selectedHospital) {
      setModalType('HOSPITAL');
      setIsModalVisible(true);
    } else if (!selectedDepartment) {
      setModalType('DEPARTMENT');
      setIsModalVisible(true);
    } else {
      navigation.navigate('AddProject', {
        hospitalId: selectedHospital.id,
        departmentId: selectedDepartment.id,
        hospitalName: selectedHospital.name,
        departmentName: selectedDepartment.name,
      });
    }
  };

  return (
    <Container theme={theme}>
      {!isDbReady && role === 'DIRECTOR' && (
        <TouchableOpacity
          onPress={handleInitDb}
          style={{
            backgroundColor: theme.colors.warning,
            padding: 15,
            margin: 10,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <RNText style={{ fontWeight: 'bold', color: 'white' }}>
            ⚙️ База даних не ініціалізована. Натисніть для налаштування.
          </RNText>
        </TouchableOpacity>
      )}
      {(selectedHospital || selectedDepartment) && (
        <Header theme={theme}>
          <TouchableOpacity onPress={goBack}>
            <ArrowLeft size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <BreadcrumbText theme={theme}>
            {selectedHospital?.name} {selectedDepartment ? ` > ${selectedDepartment.name}` : ''}
          </BreadcrumbText>
        </Header>
      )}
      {renderContent()}

      {role === 'DIRECTOR' && (
        <Fab theme={theme} onPress={handleFabPress}>
          <Plus size={30} color="white" />
        </Fab>
      )}

      <Modal visible={isModalVisible} transparent animationType="fade">
        <ModalOverlay>
          <ModalContent theme={theme}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}
            >
              <ModalTitle theme={theme}>
                {modalType === 'HOSPITAL' ? 'Nowy Szpital' : 'Nowy Oddział'}
              </ModalTitle>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <StyledInput
              theme={theme}
              autoFocus
              placeholder="Wpisz nazwę..."
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <ModalButtons>
              <ModalBtn onPress={() => setIsModalVisible(false)}>
                <ModalBtnText theme={theme}>Anuluj</ModalBtnText>
              </ModalBtn>
              <ModalBtn primary theme={theme} onPress={handleCreateFolder} disabled={isCreating}>
                {isCreating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <ModalBtnText primary theme={theme}>
                    Dodaj
                  </ModalBtnText>
                )}
              </ModalBtn>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      {uploading && (
        <UploadOverlay>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </UploadOverlay>
      )}
    </Container>
  );
};

export default DashboardScreen;
