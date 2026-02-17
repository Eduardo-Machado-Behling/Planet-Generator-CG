#version 300 es
precision mediump float;

layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec4 FragPosID;

uniform vec3 uColor; 

void main() {
    FragColor = vec4(uColor, 1.0); 

    FragPosID = vec4(0.0, 0.0, 0.0, -1.0);
}

