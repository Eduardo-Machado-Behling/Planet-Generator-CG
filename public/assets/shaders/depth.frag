#version 300 es
precision highp float;

out vec4 oColor;

void main() {
    float d = gl_FragCoord.z;
    oColor = vec4(vec3(d), 1.0);
}
