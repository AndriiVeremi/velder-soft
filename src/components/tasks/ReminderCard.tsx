import React from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { CheckCircle2, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react-native';
import { Reminder } from '../../types';

const Card = styled.View<{ done: boolean }>`
  background-color: ${(props) => props.theme.colors.surface};
  margin: 8px 15px;
  padding: 15px;
  border-radius: 12px;
  border-left-width: 5px;
  border-left-color: ${(props) =>
    props.done ? props.theme.colors.success : props.theme.colors.primary};
  flex-direction: row;
  align-items: center;
  elevation: 2;
  opacity: ${(props) => (props.done ? 0.7 : 1)};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

const Content = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const Title = styled(RNText)<{ done: boolean }>`
  font-size: ${(props) => props.theme.fontSize.f16}px;
  font-weight: bold;
  color: ${(props) => (props.done ? props.theme.colors.textSecondary : props.theme.colors.text)};
  text-decoration: ${(props) => (props.done ? 'line-through' : 'none')};
`;

const MetaRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 6px;
`;

const MetaText = styled(RNText)`
  font-size: ${(props) => props.theme.fontSize.f12}px;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-left: 4px;
  margin-right: 12px;
`;

interface ReminderCardProps {
  item: any;
  theme: any;
  onToggle: (item: any) => void;
  onDelete: (id: string) => void;
}

export const ReminderCardComponent: React.FC<ReminderCardProps> = ({
  item,
  theme,
  onToggle,
  onDelete,
}) => {
  return (
    <Card theme={theme} done={item.done}>
      <TouchableOpacity onPress={() => onToggle(item)}>
        <CheckCircle2 size={24} color={item.done ? theme.colors.success : theme.colors.border} />
      </TouchableOpacity>
      <Content>
        <Title theme={theme} done={item.done}>
          {item.title}
        </Title>
        <MetaRow>
          <CalendarIcon size={12} color={theme.colors.textSecondary} />
          <MetaText theme={theme}>{item.date}</MetaText>
          <Clock size={12} color={theme.colors.primary} />
          <MetaText theme={theme} style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {item.time}
          </MetaText>
        </MetaRow>
      </Content>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={{ padding: 8 }}>
        <Trash2 size={20} color={theme.colors.error} opacity={0.6} />
      </TouchableOpacity>
    </Card>
  );
};
