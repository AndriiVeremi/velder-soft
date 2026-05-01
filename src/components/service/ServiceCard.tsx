import React from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Clock, CheckCircle2, Camera, Trash2 } from 'lucide-react-native';
import { StatusBadge } from '../shared/Badges';
import { ServiceRecord as Service } from '../../types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const Card = styled.View<{ status: string }>`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  border-left-width: 5px;
  border-left-color: ${(props) =>
    props.status === 'DONE' ? props.theme.colors.success : props.theme.colors.warning};
`;

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const HospitalName = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  flex: 1;
`;

const DeptName = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 2px;
`;

const Description = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.text};
  margin-top: 10px;
  line-height: 20px;
`;

const MetaRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 12px;
`;

const MetaItem = styled.View`
  flex-direction: row;
  align-items: center;
  margin-right: 15px;
`;

const MetaText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-left: 5px;
`;

const ActionButtons = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin-top: 15px;
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.background};
  padding-top: 10px;
`;

const ActionBtn = styled.TouchableOpacity`
  padding: 8px;
  margin-left: 10px;
`;

const PhotoPreview = styled.Image`
  width: 100%;
  height: 150px;
  border-radius: 8px;
  margin-top: 10px;
`;

interface ServiceCardProps {
  service: any; // Using any for brevity in this specific mapping context
  role: string;
  theme: any;
  permissions: any;
  onToggle: (s: any) => void;
  onAddPhoto: (s: any) => void;
  onDelete: (id: string) => void;
}

export const ServiceCardComponent: React.FC<ServiceCardProps> = ({
  service,
  role,
  theme,
  permissions,
  onToggle,
  onAddPhoto,
  onDelete,
}) => {
  return (
    <Card
      theme={theme}
      status={service.status}
      style={
        service.isNew
          ? {
              borderColor: theme.colors.primary,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderBottomWidth: 2,
            }
          : undefined
      }
    >
      {service.isNew && (
        <View
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 2,
            alignSelf: 'flex-start',
            marginBottom: 8,
          }}
        >
          <RNText style={{ color: 'white', fontSize: theme.fontSize.f10, fontWeight: 'bold' }}>
            NOWE
          </RNText>
        </View>
      )}
      <CardHeader>
        <View style={{ flex: 1 }}>
          <HospitalName theme={theme}>{service.hospital}</HospitalName>
          <DeptName theme={theme}>{service.department}</DeptName>
        </View>
        <StatusBadge status={service.status} />
      </CardHeader>

      <Description theme={theme}>{service.description}</Description>

      <MetaRow>
        <MetaItem>
          <Clock size={12} color={theme.colors.textSecondary} />
          <MetaText theme={theme}>
            {service.createdAt
              ? format(service.createdAt.toDate(), 'd MMM, HH:mm', { locale: pl })
              : '...'}
          </MetaText>
        </MetaItem>
        <MetaItem>
          <RNText
            style={{
              fontSize: theme.fontSize.f12,
              color: theme.colors.primary,
              fontWeight: 'bold',
            }}
          >
            {service.authorName}
          </RNText>
        </MetaItem>
      </MetaRow>

      {service.photoUrl && <PhotoPreview source={{ uri: service.photoUrl }} />}

      <ActionButtons theme={theme}>
        {permissions.canToggleServiceStatus(role) && (
          <ActionBtn onPress={() => onToggle(service)}>
            <CheckCircle2
              size={20}
              color={service.status === 'DONE' ? theme.colors.success : theme.colors.textSecondary}
            />
          </ActionBtn>
        )}
        <ActionBtn onPress={() => onAddPhoto(service)}>
          <Camera
            size={20}
            color={service.photoUrl ? theme.colors.success : theme.colors.textSecondary}
          />
        </ActionBtn>
        {permissions.canDeleteServiceRecord(role) && (
          <ActionBtn onPress={() => onDelete(service.id)}>
            <Trash2 size={20} color={theme.colors.error} opacity={0.6} />
          </ActionBtn>
        )}
      </ActionButtons>
    </Card>
  );
};
