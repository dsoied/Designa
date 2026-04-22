import React from 'react';
import { CollageEditor } from './collage/CollageEditor';
import { Screen } from '../types';

interface CollageMakerProps {
  onNavigate: (screen: Screen, imageData?: string) => void;
  notify?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export function CollageMaker({ onNavigate, notify }: CollageMakerProps) {
  return <CollageEditor onNavigate={onNavigate} notify={notify} />;
}
