#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 3) in mat4 aInstanceMatrix; 

uniform mat4 uLightSpaceMatrix;
uniform mat4 uModel; 
uniform bool uIsInstanced; 

void main() {
    vec4 worldPos;
    if (uIsInstanced) {
        worldPos = aInstanceMatrix * vec4(aPos, 1.0);
    } else {
        worldPos = uModel * vec4(aPos, 1.0);
    }
    gl_Position = uLightSpaceMatrix * worldPos;
}
