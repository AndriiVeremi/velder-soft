import React from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Clock, CheckCircle2, Camera, Trash2, Download } from 'lucide-react-native';
import { StatusBadge, PriorityTag } from '../shared/Badges';
import { Task } from '../../types';
import { downloadImage } from '../../utils/download';

const Card = styled.View<{ done: boolean; priority?: string }>`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
  border-left-width: 5px;
  border-left-color: ${(props) => {
    if (props.done) return props.theme.colors.success;
    if (props.priority === 'URGENT') return props.theme.colors.error;
    return props.theme.colors.warning;
  }};
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
`;

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const Title = styled(RNText)<{ done?: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  font-weight: bold;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
  flex: 1;
`;

const Description = styled(RNText)<{ done?: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f14}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-top: 8px;
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

const ActionRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-top: 15px;
  border-top-width: 1px;
  border-top-color: ${(props) => props.theme.colors.background};
  padding-top: 10px;
`;

const IconButton = styled.TouchableOpacity`
  padding: 8px;
  margin-left: 10px;
`;

const ImagePreview = styled.Image`
  width: 100%;
  height: 150px;
  border-radius: 8px;
  margin-top: 10px;
`;

interface TaskCardProps {
  task: Task;
  role: string;
  theme: any;
  workers: any[];
  onToggle: (task: Task) => void;
  onAddPhoto: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskCardComponent: React.FC<TaskCardProps> = ({
  task,
  role,
  theme,
  workers,
  onToggle,
  onAddPhoto,
  onDelete,
}) => {
  const assignedWorker = workers.find((w) => w.id === task.assignedTo)?.name || '...';

  return (
    <Card
      theme={theme}
      done={task.done}
      priority={task.priority}
      style={
        task.isNew && !task.done
          ? {
              borderColor: theme.colors.primary,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderBottomWidth: 2,
            }
          : undefined
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {task.isNew && !task.done && <PriorityTag type="NOWE" />}
        {task.priority === 'URGENT' && !task.done && <PriorityTag type="PILNE" />}
      </View>

      <CardHeader>
        <Title theme={theme} done={task.done}>
          {task.title}
        </Title>
        <StatusBadge
          status={task.done ? 'DONE' : task.priority === 'URGENT' ? 'URGENT' : 'PENDING'}
        />
      </CardHeader>

      {task.description ? (
        <Description theme={theme} done={task.done}>
          {task.description}
        </Description>
      ) : null}

      <MetaRow>
        <MetaItem>
          <Clock size={14} color={theme.colors.primary} />
          <MetaText theme={theme}>{task.time || 'Brak czasu'}</MetaText>
        </MetaItem>
        {role === 'DIRECTOR' && task.assignedTo && (
          <MetaItem>
            <RNText
              style={{
                fontSize: theme.fontSize.f12,
                color: theme.colors.primary,
                fontWeight: 'bold',
              }}
            >
              {task.assignedTo === 'all' ? 'Wszyscy' : assignedWorker}
            </RNText>
          </MetaItem>
        )}
      </MetaRow>

      {task.photoUrl && (
        <View style={{ position: 'relative', marginTop: 15 }}>
          <ImagePreview source={{ uri: task.photoUrl }} />
          <TouchableOpacity
            onPress={() => downloadImage(task.photoUrl!, `task_${task.id}.jpg`)}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              backgroundColor: 'rgba(0, 135, 68, 0.8)',
              padding: 8,
              borderRadius: 10,
            }}
          >
            <Download size={18} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <ActionRow theme={theme}>
        <IconButton onPress={() => onToggle(task)}>
          <CheckCircle2
            size={22}
            color={task.done ? theme.colors.success : theme.colors.textSecondary}
          />
        </IconButton>
        <IconButton onPress={() => onAddPhoto(task)}>
          <Camera
            size={22}
            color={task.photoUrl ? theme.colors.success : theme.colors.textSecondary}
          />
        </IconButton>
        <IconButton onPress={() => onDelete(task.id)}>
          <Trash2 size={22} color={theme.colors.error} opacity={0.6} />
        </IconButton>
      </ActionRow>
    </Card>
  );
};
