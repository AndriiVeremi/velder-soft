import React from 'react';
import { View, Text as RNText } from 'react-native';
import styled from 'styled-components/native';

interface StatusBadgeProps {
  status: 'PENDING' | 'DONE' | 'URGENT' | 'NORMAL';
  text?: string;
}

const BadgeContainer = styled.View<{ color: string; bgColor: string }>`
  background-color: ${(props) => props.bgColor};
  padding-horizontal: 6px;
  padding-vertical: 3px;
  border-radius: 4px;
  margin-left: 10px;
`;

const BadgeText = styled(RNText)<{ color: string }>`
  font-size: 10px;
  font-weight: bold;
  color: ${(props) => props.color};
`;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  let color = '#e65100';
  let bgColor = '#fff3e0';
  let label = text || 'OCZEKUJE';

  if (status === 'DONE') {
    color = '#2e7d32';
    bgColor = '#e8f5e9';
    label = text || 'ZAKOŃCZONE';
  } else if (status === 'URGENT') {
    color = '#c62828';
    bgColor = '#ffebee';
    label = text || 'PILNE';
  }

  return (
    <BadgeContainer color={color} bgColor={bgColor}>
      <BadgeText color={color}>{label}</BadgeText>
    </BadgeContainer>
  );
};

const PriorityTagContainer = styled.View<{ urgent?: boolean }>`
  background-color: ${(props) =>
    props.urgent ? props.theme.colors.error : props.theme.colors.primary};
  border-radius: 6px;
  padding-horizontal: 8px;
  padding-vertical: 2px;
  margin-right: 8px;
`;

const PriorityTagText = styled(RNText)`
  color: white;
  font-size: 10px;
  font-weight: bold;
`;

export const PriorityTag: React.FC<{ type: 'NOWE' | 'PILNE' }> = ({ type }) => {
  return (
    <PriorityTagContainer urgent={type === 'PILNE'}>
      <PriorityTagText>{type === 'PILNE' ? 'PILNE 🚨' : 'NOWE'}</PriorityTagText>
    </PriorityTagContainer>
  );
};
