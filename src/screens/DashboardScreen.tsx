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
  Alert,
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
} from 'lucide-react-native';
import { notify } from '../utils/notify';
import { pickAndUploadPhoto } from '../utils/upload';
import { ModalOverlay, ModalContent } from '../components/CommonUI';
import { StackScreenProps } from '@react-navigation/stack';
import { Project, Hospital, Department, ServiceRecord } from '../types';

const { width } = Dimensions.get('window');

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
  font-size: ${(props) => props.theme.fontSize.f16}px;
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

const LoaderContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const AbsoluteLoader = styled(ActivityIndicator)`
  position: absolute;
  top: 50%;
  align-self: center;
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

const FolderActionRow = styled.View`
  flex-direction: row;
  justify-content: space-around;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;

const FolderActionBtn = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  background-color: ${(props) => props.theme.colors.accent};
  border: 1px solid ${(props) => props.theme.colors.primary};
`;

const FolderActionText = styled(RNText)`
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
  margin-left: 8px;
  font-size: ${(props) => props.theme.fontSize.sm}px;
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

const DashboardScreen = ({ navigation }: Props) => {
  const { role } = useAuth();
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
    const legacyNames = Array.from(new Set(allProjects.map((p) => p.hospital))).filter(Boolean);
    const existingNames = new Set(allHospitals.map((h) => h.name));
    const combined = [...allHospitals];
    legacyNames.forEach((name) => {
      if (!existingNames.has(name)) combined.push({ id: `legacy_${name}`, name: name as string });
    });
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [allHospitals, allProjects]);

  const departmentsList = useMemo(() => {
    if (!selectedHospital) return [];
    const dbDepts = allDepartments.filter(
      (d) => d.hospitalId === selectedHospital.id || d.hospitalName === selectedHospital.name
    );
    const existingNames = new Set(dbDepts.map((d) => d.name));

    const legacyDepts = Array.from(
      new Set(
        allProjects.filter((p) => p.hospital === selectedHospital.name).map((p) => p.department)
      )
    ).filter(Boolean);

    const combined = [...dbDepts];
    legacyDepts.forEach((name) => {
      if (!existingNames.has(name)) {
        combined.push({
          id: `legacy_dept_${name}`,
          hospitalId: selectedHospital.id,
          name: name as string,
          status: 'IN_PROGRESS',
        });
      }
    });

    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedHospital, allDepartments, allProjects]);

  const projects = useMemo(() => {
    if (!selectedHospital || !selectedDepartment) return [];
    return allProjects.filter(
      (p) =>
        (p.hospitalId === selectedHospital.id && p.departmentId === selectedDepartment.id) ||
        (p.hospital === selectedHospital.name && p.department === selectedDepartment.name)
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
        let hospId = selectedHospital.id;

        if (hospId.startsWith('legacy_')) {
          const hospSnap = await addDoc(collection(db, 'hospitals'), {
            name: selectedHospital.name,
            createdAt: serverTimestamp(),
          });
          hospId = hospSnap.id;
          setSelectedHospital({ id: hospId, name: selectedHospital.name });
        }

        await addDoc(collection(db, 'departments'), {
          hospitalId: hospId,
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
    if (role !== 'DIRECTOR' || dept.id.startsWith('legacy_')) return;
    const newStatus = dept.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await updateDoc(doc(db, 'departments', dept.id), { status: newStatus });
      notify.success(newStatus === 'COMPLETED' ? 'Zakończono' : 'W toku');
    } catch (e) {
      notify.error('Błąd statusu');
    }
  };

  const handleDeleteHospital = (hosp: Hospital) => {
    if (role !== 'DIRECTOR' || hosp.id.startsWith('legacy_')) return;
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

    const msg = `Usunąć "${hosp.name}"?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) perform();
    } else {
      Alert.alert('Usuń', msg, [
        { text: 'Nie' },
        { text: 'Tak', onPress: perform, style: 'destructive' },
      ]);
    }
  };

  const handleDeleteDepartment = (dept: Department) => {
    if (role !== 'DIRECTOR' || dept.id.startsWith('legacy_')) return;
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

    const msg = `Usunąć oddział "${dept.name}"?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) perform();
    } else {
      Alert.alert('Usuń', msg, [
        { text: 'Nie' },
        { text: 'Tak', onPress: perform, style: 'destructive' },
      ]);
    }
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
          {role === 'DIRECTOR' && (
            <FolderActionRow theme={theme}>
              <FolderActionBtn
                theme={theme}
                onPress={() => {
                  setModalType('HOSPITAL');
                  setIsModalVisible(true);
                }}
              >
                <Plus size={18} color={theme.colors.primary} />
                <FolderActionText theme={theme}>Nowy Szpital (Folder)</FolderActionText>
              </FolderActionBtn>
            </FolderActionRow>
          )}
          <FlatList
            data={hospitalsList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ItemCard onPress={() => setSelectedHospital(item)} theme={theme}>
                <Folder
                  size={24}
                  color={
                    item.id.startsWith('legacy_')
                      ? theme.colors.textSecondary
                      : theme.colors.primary
                  }
                />
                <ItemInfo>
                  <ItemTitle theme={theme}>{item.name}</ItemTitle>
                  {item.id.startsWith('legacy_') && (
                    <ItemSubtitle theme={theme}>Stara dokumentacja</ItemSubtitle>
                  )}
                </ItemInfo>
                {role === 'DIRECTOR' && !item.id.startsWith('legacy_') && (
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
          {role === 'DIRECTOR' && (
            <FolderActionRow theme={theme}>
              <FolderActionBtn
                theme={theme}
                onPress={() => {
                  setModalType('DEPARTMENT');
                  setIsModalVisible(true);
                }}
              >
                <Plus size={18} color={theme.colors.primary} />
                <FolderActionText theme={theme}>Nowy Oddział (Podfolder)</FolderActionText>
              </FolderActionBtn>
            </FolderActionRow>
          )}
          <FlatList
            data={departmentsList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ItemCard onPress={() => setSelectedDepartment(item)} theme={theme}>
                <Folder
                  size={24}
                  color={
                    item.id.startsWith('legacy_dept_')
                      ? theme.colors.textSecondary
                      : theme.colors.warning || '#FFA000'
                  }
                />
                <ItemInfo>
                  <ItemTitle theme={theme}>{item.name}</ItemTitle>
                  <StatusRow>
                    <StatusIndicator status={item.status} theme={theme} />
                    <ItemSubtitle theme={theme}>
                      {item.status === 'COMPLETED' ? 'Zakończony' : 'W toku'}
                    </ItemSubtitle>
                  </StatusRow>
                  {item.id.startsWith('legacy_dept_') && (
                    <ItemSubtitle theme={theme}>Stary oddział</ItemSubtitle>
                  )}
                </ItemInfo>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {role === 'DIRECTOR' && !item.id.startsWith('legacy_dept_') && (
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
                  {role === 'DIRECTOR' &&
                    !item.id.startsWith('legacy_') &&
                    !item.id.startsWith('legacy_dept_') && (
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
                  {role === 'DIRECTOR' && (
                    <DeleteBtn onPress={() => deletePhoto(r)}>
                      <Trash2 size={12} color="white" />
                    </DeleteBtn>
                  )}
                </PhotoItemContainer>
              ))}
            </ScrollView>
          </PhotoGallery>
        )}
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
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

  return (
    <Container theme={theme}>
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

      {role === 'DIRECTOR' && selectedHospital && selectedDepartment && (
        <AddButton
          onPress={() =>
            navigation.navigate('AddProject', {
              hospitalId: selectedHospital.id.startsWith('legacy_') ? null : selectedHospital.id,
              departmentId: selectedDepartment.id.startsWith('legacy_')
                ? null
                : selectedDepartment.id,
              hospitalName: selectedHospital.name,
              departmentName: selectedDepartment.name,
            })
          }
          theme={theme}
        >
          <Plus size={30} color="white" />
        </AddButton>
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

      {uploading && <AbsoluteLoader size="large" color={theme.colors.primary} />}
    </Container>
  );
};

export default DashboardScreen;
