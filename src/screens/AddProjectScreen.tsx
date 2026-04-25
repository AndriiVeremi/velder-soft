import React, { useState, useEffect, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  ActivityIndicator,
  TouchableOpacity,
  Text as RNText,
  ScrollView,
  Platform,
  View,
} from 'react-native';
import styled from 'styled-components/native';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore';
import { db, storage, auth } from '../config/firebase';
import { theme } from '../config/theme';
import { notify } from '../utils/notify';
import { FileText, Upload, X } from 'lucide-react-native';

const Container = styled(ScrollView)`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const FormWrapper = styled.View`
  padding: ${(props) => props.theme.spacing.lg}px;
  max-width: 800px;
  width: 100%;
  align-self: center;
`;

const Label = styled(RNText)`
  font-size: 16px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text};
  margin-bottom: ${(props) => props.theme.spacing.xs}px;
  margin-top: ${(props) => props.theme.spacing.md}px;
`;

const Input = styled.TextInput`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 12px 16px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: 16px;
`;

const FilePickerButton = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 30px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  border: 2px dashed ${(props) => props.theme.colors.primary};
  align-items: center;
  justify-content: center;
  margin-top: ${(props) => props.theme.spacing.sm}px;
`;

const PickerText = styled(RNText)`
  margin-top: 10px;
  color: ${(props) => props.theme.colors.primary};
  font-weight: 500;
`;

const SelectedFileCard = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #e3f2fd;
  padding: 15px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  margin-top: ${(props) => props.theme.spacing.sm}px;
  border: 1px solid ${(props) => props.theme.colors.primary};
`;

const FileName = styled(RNText)`
  margin-left: 10px;
  flex: 1;
  font-weight: 500;
  color: ${(props) => props.theme.colors.primary};
`;

const SubmitButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  background-color: ${(props) =>
    props.disabled ? props.theme.colors.border : props.theme.colors.success};
  padding: 16px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  align-items: center;
  margin-top: 40px;
  margin-bottom: 60px;
`;

const SubmitButtonText = styled(RNText)`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DocumentPickerAsset } from 'expo-document-picker';

interface Project {
  title: string;
  hospital: string;
  department: string;
  description: string;
  pdfUrl: string;
  pdfPath: string;
  fileName: string;
  status: 'IN_PROGRESS' | 'DONE';
  createdBy: string;
  createdAt: Timestamp | null;
}

type RootStackParamList = {
  AddProject: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddProject'>;

const SuggestionsContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 5px;
`;

const SuggestionChip = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.background};
  padding: 5px 10px;
  border-radius: 15px;
  margin-right: 8px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const SuggestionText = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.text};
`;

const DescriptionInput = styled(Input)`
  height: 100px;
`;

const MaxFileSizeText = styled(RNText)`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 5px;
`;

const RemoveFileButton = styled.TouchableOpacity`
  padding: 5px;
`;

const LoadingContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const LoadingSpinner = styled(ActivityIndicator)`
  margin-right: 10px;
`;

const AddProjectScreen = ({ navigation }: Props) => {
  const [title, setTitle] = useState('');
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  const existingHospitals = useMemo(() => {
    return Array.from(new Set(allProjects.map((p) => p.hospital)))
      .filter(Boolean)
      .sort() as string[];
  }, [allProjects]);

  const existingDepartments = useMemo(() => {
    if (!hospital) return [];
    return Array.from(
      new Set(allProjects.filter((p) => p.hospital === hospital).map((p) => p.department))
    )
      .filter(Boolean)
      .sort() as string[];
  }, [hospital, allProjects]);

  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((doc) => projects.push(doc.data() as Project));
      setAllProjects(projects);
    });
    return () => unsubscribe();
  }, []);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        if (file.size && file.size > 10 * 1024 * 1024) {
          notify.error('Plik jest zbyt duży. Maksymalny rozmiar to 10MB.');
          return;
        }
        setPdfFile(file);
      }
    } catch (err) {
      console.error(err);
      notify.error('Nie udało się wybrać pliku.');
    }
  };

  const handleCreateProject = async () => {
    if (!title.trim() || !hospital.trim() || !department.trim() || !description || !pdfFile) {
      notify.error('Wypełnij wszystkie pola i wybierz plik PDF.');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(pdfFile.uri);
      const blob = await response.blob();
      const timestamp = Date.now();
      const sanitizedHospital = hospital.trim().replace(/\s+/g, '_');
      const sanitizedDept = department.trim().replace(/\s+/g, '_');
      const filename = `projects/${sanitizedHospital}/${sanitizedDept}/${timestamp}_${pdfFile.name.replace(/\s+/g, '_')}`;

      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const pdfUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'projects'), {
        title,
        hospital: hospital.trim(),
        department: department.trim(),
        description,
        pdfUrl,
        pdfPath: filename,
        fileName: pdfFile.name,
        status: 'IN_PROGRESS',
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });

      notify.success('Projekt został utworzony pomyślnie.');
      navigation.goBack();
    } catch (error) {
      console.error('Upload error:', error);
      notify.error('Wystąpił problem podczas zapisywania projektu.');
    } finally {
      setUploading(false);
    }
  };

  const renderSuggestions = (data: string[], onSelect: (val: string) => void) => {
    if (data.length === 0) return null;
    return (
      <SuggestionsContainer theme={theme}>
        {data.map((item, index) => (
          <SuggestionChip key={index} onPress={() => onSelect(item)} theme={theme}>
            <SuggestionText theme={theme}>{item}</SuggestionText>
          </SuggestionChip>
        ))}
      </SuggestionsContainer>
    );
  };

  return (
    <Container theme={theme}>
      <FormWrapper theme={theme}>
        <Label theme={theme}>Nazwa dokumentu / projektu</Label>
        <Input
          theme={theme}
          placeholder="Np. Schemat instalacji tlenu"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <Label theme={theme}>Szpital (Folder главні)</Label>
        <Input
          theme={theme}
          placeholder="Np. Szpital Uniwersytecki"
          value={hospital}
          onChangeText={setHospital}
          placeholderTextColor={theme.colors.textSecondary}
        />
        {renderSuggestions(
          existingHospitals.filter(
            (h) => h.toLowerCase().includes(hospital.toLowerCase()) && h !== hospital
          ),
          setHospital
        )}

        <Label theme={theme}>Oddział (Podfolder)</Label>
        <Input
          theme={theme}
          placeholder="Np. Kardiologia"
          value={department}
          onChangeText={setDepartment}
          placeholderTextColor={theme.colors.textSecondary}
        />
        {renderSuggestions(
          existingDepartments.filter(
            (d) => d.toLowerCase().includes(department.toLowerCase()) && d !== department
          ),
          setDepartment
        )}

        <Label theme={theme}>Opis / Notatki</Label>
        <DescriptionInput
          theme={theme}
          placeholder="Opis dokumentacji..."
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={theme.colors.textSecondary}
        />

        <Label theme={theme}>Dokumentacja techniczna (PDF)</Label>
        {!pdfFile ? (
          <FilePickerButton theme={theme} onPress={pickDocument}>
            <Upload size={40} color={theme.colors.primary} />
            <PickerText theme={theme}>Kliknij, aby wybrać dokumentację</PickerText>
            <MaxFileSizeText theme={theme}>Maksymalny rozmiar: 10MB</MaxFileSizeText>
          </FilePickerButton>
        ) : (
          <SelectedFileCard theme={theme}>
            <FileText size={24} color={theme.colors.primary} />
            <FileName theme={theme} numberOfLines={1}>
              {pdfFile.name}
            </FileName>
            <RemoveFileButton onPress={() => setPdfFile(null)}>
              <X size={20} color={theme.colors.error} />
            </RemoveFileButton>
          </SelectedFileCard>
        )}

        <SubmitButton theme={theme} onPress={handleCreateProject} disabled={uploading}>
          {uploading ? (
            <LoadingContainer>
              <LoadingSpinner color="white" />
              <SubmitButtonText theme={theme}>Przesyłanie...</SubmitButtonText>
            </LoadingContainer>
          ) : (
            <SubmitButtonText theme={theme}>Utwórz i opublikuj projekt</SubmitButtonText>
          )}
        </SubmitButton>
      </FormWrapper>
    </Container>
  );
};

export default AddProjectScreen;
