import React, { useState, useEffect } from 'react';
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

const AddProjectScreen = ({ navigation }: any) => {
  const [title, setTitle] = useState('');
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [existingHospitals, setExistingHospitals] = useState<string[]>([]);
  const [existingDepartments, setExistingDepartments] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projects: any[] = [];
      snapshot.forEach((doc) => projects.push(doc.data()));
      setAllProjects(projects);

      const hospitals = Array.from(new Set(projects.map((p) => p.hospital))).filter(
        Boolean
      ) as string[];
      setExistingHospitals(hospitals.sort());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (hospital) {
      const depts = Array.from(
        new Set(allProjects.filter((p) => p.hospital === hospital).map((p) => p.department))
      ).filter(Boolean) as string[];
      setExistingDepartments(depts.sort());
    } else {
      setExistingDepartments([]);
    }
  }, [hospital, allProjects]);

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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
        {data.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onSelect(item)}
            style={{
              backgroundColor: '#eee',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 15,
              marginRight: 8,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <RNText style={{ fontSize: 12, color: theme.colors.text }}>{item}</RNText>
          </TouchableOpacity>
        ))}
      </View>
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
          placeholderTextColor="#999"
        />

        <Label theme={theme}>Szpital (Folder główny)</Label>
        <Input
          theme={theme}
          placeholder="Np. Szpital Uniwersytecki"
          value={hospital}
          onChangeText={setHospital}
          placeholderTextColor="#999"
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
          placeholderTextColor="#999"
        />
        {renderSuggestions(
          existingDepartments.filter(
            (d) => d.toLowerCase().includes(department.toLowerCase()) && d !== department
          ),
          setDepartment
        )}

        <Label theme={theme}>Opis / Notatki</Label>
        <Input
          theme={theme}
          placeholder="Opis dokumentacji..."
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
          style={{ textAlignVertical: 'top', height: 100 }}
          placeholderTextColor="#999"
        />

        <Label theme={theme}>Dokumentacja techniczna (PDF)</Label>
        {!pdfFile ? (
          <FilePickerButton theme={theme} onPress={pickDocument}>
            <Upload size={40} color={theme.colors.primary} />
            <PickerText theme={theme}>Kliknij, aby wybrać dokumentację</PickerText>
            <RNText style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 5 }}>
              Maksymalny rozmiar: 10MB
            </RNText>
          </FilePickerButton>
        ) : (
          <SelectedFileCard theme={theme}>
            <FileText size={24} color={theme.colors.primary} />
            <FileName theme={theme} numberOfLines={1}>
              {pdfFile.name}
            </FileName>
            <TouchableOpacity onPress={() => setPdfFile(null)} style={{ padding: 5 }}>
              <X size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </SelectedFileCard>
        )}

        <SubmitButton theme={theme} onPress={handleCreateProject} disabled={uploading}>
          {uploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="white" style={{ marginRight: 10 }} />
              <SubmitButtonText theme={theme}>Przesyłanie...</SubmitButtonText>
            </View>
          ) : (
            <SubmitButtonText theme={theme}>Utwórz i opublikuj projekt</SubmitButtonText>
          )}
        </SubmitButton>
      </FormWrapper>
    </Container>
  );
};

export default AddProjectScreen;
