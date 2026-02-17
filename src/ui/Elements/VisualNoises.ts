import { VisualFBMSimplex } from "./Noise/NoiseFBMSimplex.js";
import { VisualRigidSimplex } from "./Noise/NoiseRigidSimplex.js";

export const BLEND_MODE = {
  Add: "Add",
  BaseAdd: "BaseAdd",
  Max: "Max",
  Mult: "Mult",
} as const;

export type BlendMode = (typeof BLEND_MODE)[keyof typeof BLEND_MODE];

export const BLEND_MODES = Object.values(BLEND_MODE);

export const AVAILABLE_LAYERS = [VisualRigidSimplex, VisualFBMSimplex] as const;
