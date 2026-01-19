#version 300 es
precision mediump float;

in vec3 vNormal;
in float vV;

out vec4 FragColor;

void main() {
  vec3 norm = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.5, 1.0, -0.5));

  float diff = max(dot(norm, lightDir), 0.2);

  float pattern = step(0.5, fract(vV * 10.0));

  vec3 colorA = vec3(1.0, 0.5, 0.0); // Orange
  vec3 colorB = vec3(0.2, 0.2, 0.2); // Dark Grey

  vec3 finalColor = mix(colorA, colorB, pattern);

  FragColor = vec4(finalColor * diff, 1.0);
}