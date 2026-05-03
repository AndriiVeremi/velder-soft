import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../config/navigationTypes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
