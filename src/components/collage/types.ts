import { Screen } from '../../types';

export interface CanvasElement {
  id: string;
  type: 'image' | 'text' | 'frame' | 'rect' | 'circle' | 'line' | 'triangle';
  src?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number[]; // For Line
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  groupId?: string;
  // Frame specific
  cropX?: number;
  cropY?: number;
  imageWidth?: number;
  imageHeight?: number;
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  layoutType?: string;
  url?: string;
  // Filters
  brightness?: number; // -1 to 1
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  blur?: number; // 0 to 20
}

export interface HistoryState {
  elements: CanvasElement[];
}

export interface CanvasConfig {
  backgroundColor: string;
  width: number;
  height: number;
  backgroundGradient?: {
    start: string;
    end: string;
    type: 'linear' | 'radial';
    rotation?: number;
  };
}

export interface CollageEditorProps {
  onNavigate: (screen: Screen, imageData?: string) => void;
  notify?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}
