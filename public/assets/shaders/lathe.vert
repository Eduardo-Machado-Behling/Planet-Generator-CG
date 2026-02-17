#version 300 es

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aV;

uniform int uTotalSlices;

out vec3 vOutPos;
out vec3 vOutNormal;
out vec2 vOutUV;

const float PI = 3.14159265359;

void main() {
  float fraction = float(gl_InstanceID) / float(uTotalSlices - 1);
  float angle = fraction * PI * 2.0;

  float c = cos(angle);
  float s = sin(angle);

  mat3 rot = mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);

  vOutPos = rot * aPosition;

  vOutNormal = normalize(rot * aNormal);

  vOutUV = vec2(fraction, aV);

  
  gl_Position = vec4(0.0);
}