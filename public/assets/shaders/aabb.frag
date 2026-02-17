#version 300 es
precision highp float;

layout(location = 1) out vec4 FragPosID;

flat in float vInstanceID;

void main() { FragPosID = vec4(0.0, 0.0, 0.0, vInstanceID); }
