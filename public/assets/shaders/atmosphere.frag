#version 300 es
precision highp float;

layout(location = 0) out vec4 FragColor;

in vec3 vNormal;
in vec3 vFragPos;
in vec3 vViewPos;

uniform vec3 uSunWorldPosition; 
uniform vec3 uColor;       
uniform float uIntensity;  
uniform float uFalloff;    

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPos - vFragPos);
  float dotProduct = dot(viewDir, normal);
  float rimRaw = clamp(1.0 + dotProduct, 0.0, 1.0);

  float rimShaped = pow(rimRaw, uFalloff);

  float rim = smoothstep(0.0, 1.0, rimShaped);

  float atmosphere = pow(rim, uFalloff);

  
  vec3 sunDir = normalize(uSunWorldPosition - vFragPos);
  float sunDot = dot(sunDir, normal);
  float sunMask = smoothstep(-0.1, 0.2, sunDot);

  vec3 finalColor = uColor * atmosphere * uIntensity * sunMask;

  float sunFacing = clamp(dot(normal, sunDir), 0.0, 1.0);
  atmosphere *= mix(0.6, 1.0, sunFacing);

  
  FragColor = vec4(finalColor, atmosphere * sunMask);
}
