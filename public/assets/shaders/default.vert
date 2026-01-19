#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

out vec3 vNormal;
out float vV;

void main() {
  gl_Position = uProj * uView * uModel * vec4(aPosition, 1.0);

  vNormal = mat3(uModel) * aNormal;

  vV = aV;
}