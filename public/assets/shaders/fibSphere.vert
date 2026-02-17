#version 300 es

uniform int uResolution;
uniform float uPhi;
uniform float uRadius;

out vec3 vOutPos;
out vec3 vOutNormal;

precision highp float;

const float PI = 3.14159265359;

void main() {
  float i = float(gl_VertexID);

  float y = 1.0 - i / (float(uResolution) - 1.0) * 2.0;
  float r = sqrt(1.0 - y * y);

  float theta = uPhi * PI * 2.0 * i;
  float x = cos(theta) * r;
  float z = sin(theta) * r;

  vOutNormal = vec3(x, y, z);
  vOutPos = vOutNormal * uRadius;

  
  gl_Position = vec4(0.0);
}