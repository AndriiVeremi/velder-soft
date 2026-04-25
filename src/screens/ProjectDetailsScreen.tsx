import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Text as RNText,
  ScrollView,
} from 'react-native';
import styled from 'styled-components/native';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { db, storage } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { notify } from '../utils/notify';
import { FileText, ExternalLink, CheckCircle, Clock, Trash2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width > 768;

const StatusBadge = styled.TouchableOpacity<{ status?: string; canEdit?: boolean }>`
  background-color: ${(props) =>
    props.status === 'COMPLETED' ? props.theme.colors.success : '#FFA000'};
  padding: 6px 12px;
  border-radius: 20px;
  align-self: flex-start;
  margin-top: 10px;
  flex-direction: row;
  align-items: center;
  opacity: ${(props) => (props.canEdit ? 1 : 0.9)};
`;

const StatusText = styled(RNText)`
  color: white;
  font-size: 14px;
  font-weight: bold;
  margin-left: 6px;
`;

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const ContentContainer = styled(ScrollView).attrs({
  contentContainerStyle: {
    paddingBottom: 40,
  },
})`
  flex: 1;
`;

const Section = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.lg}px;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
  ${isDesktop &&
  `
    border-radius: ${theme.borderRadius.lg}px;
    margin: ${theme.spacing.md}px;
    max-width: 1000px;
    align-self: center;
    width: 100%;
  `}
`;

const ProjectTitle = styled(RNText)`
  font-size: 24px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const Description = styled(RNText)`
  font-size: 16px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: ${(props) => props.theme.spacing.sm}px;
  line-height: 22px;
`;

const PdfButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-top: 20px;
  background-color: #f0f7ff;
  padding: 16px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  border: 1px solid ${(props) => props.theme.colors.accent};
`;

const PdfButtonText = styled(RNText)`
  margin-left: 12px;
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
  flex: 1;
  font-size: 16px;
`;

const ProjectDetailsScreen = ({ route, navigation }: any) => {
  const { project: initialProject } = route.params;
  const { role } = useAuth();
  const [project, setProject] = useState(initialProject);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Dokumentacja' });

    const projectRef = doc(db, 'projects', initialProject.id);
    const unsubProject = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return () => unsubProject();
  }, [initialProject.id, navigation]);

  const toggleProjectStatus = async () => {
    if (role !== 'DIRECTOR') return;
    const newStatus = project.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await updateDoc(doc(db, 'projects', project.id), { status: newStatus });
      notify.success(newStatus === 'COMPLETED' ? 'Zakończony' : 'W toku');
    } catch (error) {
      notify.error('Błąd statusu');
    }
  };

  const handleDeleteProject = async () => {
    if (role !== 'DIRECTOR') return;
    const performDelete = async () => {
      try {
        if (project.pdfPath) {
          const pdfRef = ref(storage, project.pdfPath);
          await deleteObject(pdfRef).catch(() => {});
        }
        await deleteDoc(doc(db, 'projects', project.id));
        notify.success('Usunięto');
        navigation.goBack();
      } catch (error) {
        notify.error('Błąd usuwania');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Usunąć dokument?')) performDelete();
    } else {
      Alert.alert('Usuń', 'Czy na pewno?', [
        { text: 'Nie' },
        { text: 'Tak', onPress: performDelete },
      ]);
    }
  };

  const handleOpenPdf = async () => {
    if (!project.pdfUrl) return;
    if (Platform.OS === 'web') {
      window.open(project.pdfUrl, '_blank');
    } else {
      setDownloading(true);
      try {
        const fileUri = (FileSystem as any).cacheDirectory + (project.fileName || 'dokument.pdf');
        const { uri } = await FileSystem.downloadAsync(project.pdfUrl, fileUri);
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
        else Linking.openURL(uri);
      } catch (error) {
        notify.error('Błąd otwierania');
      } finally {
        setDownloading(false);
      }
    }
  };

  return (
    <Container theme={theme}>
      <ContentContainer theme={theme}>
        <Section theme={theme}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <ProjectTitle theme={theme}>{project.title}</ProjectTitle>
            </View>
            {role === 'DIRECTOR' && (
              <TouchableOpacity onPress={handleDeleteProject} style={{ padding: 5 }}>
                <Trash2 size={24} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>

          <StatusBadge
            theme={theme}
            status={project.status}
            onPress={toggleProjectStatus}
            disabled={role !== 'DIRECTOR'}
          >
            {project.status === 'COMPLETED' ? (
              <CheckCircle size={16} color="white" />
            ) : (
              <Clock size={16} color="white" />
            )}
            <StatusText theme={theme}>
              {project.status === 'COMPLETED' ? 'Zakończony' : 'W toku'}
            </StatusText>
          </StatusBadge>

          <Description theme={theme}>{project.description}</Description>

          <PdfButton theme={theme} onPress={handleOpenPdf} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <FileText size={28} color={theme.colors.primary} />
            )}
            <PdfButtonText theme={theme}>
              {downloading ? 'Pobieranie...' : 'Otwórz dokument PDF'}
            </PdfButtonText>
            <ExternalLink size={20} color={theme.colors.primary} />
          </PdfButton>
        </Section>
      </ContentContainer>
    </Container>
  );
};

export default ProjectDetailsScreen;
