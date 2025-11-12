import { createNavigationContainerRef } from '@react-navigation/native';

import type { MainStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<MainStackParamList>();
