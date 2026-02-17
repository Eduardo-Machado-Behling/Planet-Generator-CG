#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

uniform sampler2D uHeightMap;
uniform float uDisplacementStrength;
uniform vec3 uSunWorldPosition;
uniform mat4 uLightSpaceMatrix;

out vec3 vFragPos;
out vec3 vLocalPos;
out vec3 vLightDir;
out vec4 vLightSpacePos;

const float PI = 3.14159265359;

vec2 getSphericalUV(vec3 p) {

  vec3 n = normalize(p);
  float u = 0.5 + atan(n.z, n.x) / (2.0 * PI);
  float v = 0.5 + asin(n.y) / PI;
  return vec2(u, v);
}

void main() {
  vec2 uv = getSphericalUV(aPos);
  float h = textureLod(uHeightMap, uv, 0.0).r;

  vec3 displacedPos = aPos + normalize(aNormal) * h * uDisplacementStrength;

  vLocalPos = displacedPos;

  vec4 worldPos4 = uModel * vec4(displacedPos, 1.0);
  vFragPos = vec3(worldPos4);

  vLightDir = normalize(uSunWorldPosition - vec3(worldPos4));

  vLightSpacePos = uLightSpaceMatrix * worldPos4;

  gl_Position = uProj * uView * worldPos4;
}
