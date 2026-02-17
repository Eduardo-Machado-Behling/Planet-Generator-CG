import {BlendMode} from '../VisualNoises.js';

export interface NoiseLayer {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  blendMode: BlendMode;

  
  params: Record<string, number>;
  
  
}