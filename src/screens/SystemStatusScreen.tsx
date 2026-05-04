import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import styled from 'styled-components/native';
import { useAppTheme } from '../context/ThemeContext';
import { getSystemStats, SystemStats } from '../utils/systemStats';
import {
  Database,
  HardDrive,
  Trash2,
  RefreshCcw,
  Info,
  AlertTriangle,
  Bell,
} from 'lucide-react-native';
import { runWeeklyCleanup } from '../utils/cleanup';
import { notify } from '../utils/notify';
import { ScreenHeader, ScreenTitle } from '../components/CommonUI';

const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

const Content = styled.ScrollView`
  padding: 20px;
`;

const Card = styled.View`
  background-color: ${(props) => props.theme.colors.surface};
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 20px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  elevation: 2;
`;

const CardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
`;

const IconBox = styled.View<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: ${(props) => props.color + '20'};
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const CardTitle = styled(RNText)`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
`;

const ProgressContainer = styled.View`
  height: 10px;
  background-color: ${(props) => props.theme.colors.border};
  border-radius: 5px;
  margin-vertical: 15px;
  overflow: hidden;
`;

const ProgressBar = styled.View<{ width: number; color: string }>`
  height: 100%;
  width: ${(props) => props.width}%;
  background-color: ${(props) => props.color};
`;

const StatRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const StatLabel = styled(RNText)`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 14px;
`;

const StatValue = styled(RNText)`
  color: ${(props) => props.theme.colors.text};
  font-weight: bold;
  font-size: 14px;
`;

const CleanupBtn = styled.TouchableOpacity`
  background-color: ${(props) => props.theme.colors.error + '15'};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 12px;
  margin-top: 10px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.error};
`;

const CleanupText = styled(RNText)`
  color: ${(props) => props.theme.colors.error};
  font-weight: bold;
  margin-left: 10px;
`;

const WarningCard = styled.View`
  background-color: #fff3e0;
  padding: 15px;
  border-radius: 12px;
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
  border-width: 1px;
  border-color: #ffe0b2;
`;

const SystemStatusScreen = () => {
  const { theme } = useAppTheme();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getSystemStats();
      setStats(data);
    } catch (e) {
      notify.error('Błąd ładowania statystyk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadStats();
    };
    init();
  }, []);

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      await runWeeklyCleanup();
      notify.success('Oczyszczanie zakończone');
      await loadStats();
    } catch (e) {
      notify.error('Błąd podczas oczyszczania');
    } finally {
      setCleaning(false);
    }
  };

  if (loading && !stats) {
    return (
      <Container theme={theme}>
        <ActivityIndicator style={{ marginTop: 50 }} color={theme.colors.primary} />
      </Container>
    );
  }

  const dbColor =
    (stats?.database.percentage || 0) > 80 ? theme.colors.error : theme.colors.primary;
  const storageColor =
    (stats?.storage.percentage || 0) > 80 ? theme.colors.error : theme.colors.warning;

  return (
    <Container theme={theme}>
      <ScreenHeader theme={theme}>
        <ScreenTitle theme={theme}>Stan Systemu</ScreenTitle>
        <TouchableOpacity onPress={loadStats}>
          <RefreshCcw size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </ScreenHeader>

      <Content
        theme={theme}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadStats}
            colors={[theme.colors.primary]}
          />
        }
      >
        {((stats?.database.percentage || 0) > 80 || (stats?.storage.percentage || 0) > 80) && (
          <WarningCard>
            <AlertTriangle size={24} color="#e65100" />
            <RNText style={{ marginLeft: 12, color: '#663c00', fontSize: 13, flex: 1 }}>
              Uwaga! Zasoby systemu są na wyczerpaniu. Zalecane ręczne oczyszczanie starych danych.
            </RNText>
          </WarningCard>
        )}

        <Card theme={theme}>
          <CardHeader>
            <IconBox color={theme.colors.primary}>
              <Database size={22} color={theme.colors.primary} />
            </IconBox>
            <CardTitle theme={theme}>Baza Danych (Firestore)</CardTitle>
          </CardHeader>

          <StatRow>
            <StatLabel theme={theme}>Zadania</StatLabel>
            <StatValue theme={theme}>{stats?.database.tasks}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel theme={theme}>Serwis</StatLabel>
            <StatValue theme={theme}>{stats?.database.services}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel theme={theme}>Projekty</StatLabel>
            <StatValue theme={theme}>{stats?.database.projects}</StatValue>
          </StatRow>

          <ProgressContainer theme={theme}>
            <ProgressBar width={stats?.database.percentage || 0} color={dbColor} />
          </ProgressContainer>

          <StatRow>
            <StatLabel theme={theme}>Wykorzystanie limitu (5 Gb)</StatLabel>
            <StatValue theme={theme}>{stats?.database.percentage}%</StatValue>
          </StatRow>
        </Card>

        <Card theme={theme}>
          <CardHeader>
            <IconBox color={theme.colors.warning}>
              <HardDrive size={22} color={theme.colors.warning} />
            </IconBox>
            <CardTitle theme={theme}>Pliki (Storage)</CardTitle>
          </CardHeader>

          <StatRow>
            <StatLabel theme={theme}>Zdjęcia</StatLabel>
            <StatValue theme={theme}>{stats?.storage.photos}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel theme={theme}>Dokumenty PDF</StatLabel>
            <StatValue theme={theme}>{stats?.storage.pdfs}</StatValue>
          </StatRow>

          <ProgressContainer theme={theme}>
            <ProgressBar width={stats?.storage.percentage || 0} color={storageColor} />
          </ProgressContainer>

          <StatRow>
            <StatLabel theme={theme}>Wykorzystanie miejsca</StatLabel>
            <StatValue theme={theme}>{stats?.storage.percentage}%</StatValue>
          </StatRow>
        </Card>

        <Card theme={theme}>
          <CardHeader>
            <IconBox color={theme.colors.primary}>
              <Bell size={22} color={theme.colors.primary} />
            </IconBox>
            <CardTitle theme={theme}>Powiadomienia (Push)</CardTitle>
          </CardHeader>

          <StatRow>
            <StatLabel theme={theme}>Wysłano w systemie</StatLabel>
            <StatValue theme={theme}>{stats?.push.count.toLocaleString()}</StatValue>
          </StatRow>

          <ProgressContainer theme={theme}>
            <ProgressBar width={stats?.push.percentage || 0} color={theme.colors.primary} />
          </ProgressContainer>

          <StatRow>
            <StatLabel theme={theme}>Limit bezpłatny (Firebase)</StatLabel>
            <StatValue theme={theme}>2,000,000</StatValue>
          </StatRow>
        </Card>

        <Card theme={theme}>
          <CardHeader>
            <IconBox color={theme.colors.error}>
              <Trash2 size={22} color={theme.colors.error} />
            </IconBox>
            <CardTitle theme={theme}>Konserwacja</CardTitle>
          </CardHeader>

          <RNText style={{ color: theme.colors.textSecondary, marginBottom: 15, fontSize: 13 }}>
            Uruchomienie oczyszczania usunie wszystkie zakończone zadania oraz stare ogłoszenia
            (starsze niż 3 dni). Pliki zostaną zachowane w archiwum.
          </RNText>

          <CleanupBtn theme={theme} onPress={handleCleanup} disabled={cleaning}>
            {cleaning ? (
              <ActivityIndicator color={theme.colors.error} />
            ) : (
              <>
                <Trash2 size={20} color={theme.colors.error} />
                <CleanupText theme={theme}>Uruchom Oczyszczanie</CleanupText>
              </>
            )}
          </CleanupBtn>
        </Card>

        <View
          style={{
            marginBottom: 40,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <Info size={14} color={theme.colors.textSecondary} />
          <StatLabel theme={theme} style={{ marginLeft: 5 }}>
            Ostatnia aktualizacja: {stats?.lastUpdate.toLocaleTimeString()}
          </StatLabel>
        </View>
      </Content>
    </Container>
  );
};

export default SystemStatusScreen;
