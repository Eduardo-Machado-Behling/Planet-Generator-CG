#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

uniform float uAtmosphereScale;

out vec3 vNormal;
out vec3 vFragPos;
out vec3 vViewPos;

void main() {

  vec3 newPos = aPos * uAtmosphereScale;

  vNormal = normalize(mat3(uModel) * aNormal);

  vFragPos = vec3(uModel * vec4(newPos, 1.0));

  vViewPos = vec3(inverse(uView)[3]);

  gl_Position = uProj * uView * uModel * vec4(newPos, 1.0);
}