#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 3) in mat4 aInstanceMatrix;

uniform mat4 uLightSpaceMatrix;
uniform mat4 uModel;

uniform bool uIsInstanced;
uniform bool uHasNoise;

uniform sampler2D uHeightMap;
uniform float uDisplacementStrength;

const float PI = 3.14159265359;

vec2 getSphericalUV(vec3 p) {
  vec3 n = normalize(p);
  float u = 0.5 + atan(n.z, n.x) / (2.0 * PI);
  float v = 0.5 + asin(n.y) / PI;
  return vec2(u, v);
}

void main() {
  vec4 worldPos;
  if (uIsInstanced) {
    worldPos = aInstanceMatrix * vec4(aPos, 1.0);
  } else {
    if (uHasNoise) {
      vec2 uv = getSphericalUV(aPos);
      float h = textureLod(uHeightMap, uv, 0.0).r;

      vec3 displacedPos = aPos + normalize(aNormal) * h * uDisplacementStrength;

      worldPos = uModel * vec4(displacedPos, 1.0);
    } else {
      worldPos = uModel * vec4(aPos, 1.0);
    }
  }
  gl_Position = uLightSpaceMatrix * worldPos;
}
