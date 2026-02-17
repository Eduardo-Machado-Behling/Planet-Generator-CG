#version 300 es

layout(location = 0) in vec3 aPos;


layout(location = 3) in mat4 aInstanceMatrix; 
layout(location = 7) in float aInstanceID;    

uniform mat4 uView;
uniform mat4 uProj;


uniform vec3 uAABBSize;   
uniform vec3 uAABBCenter; 

flat out float vInstanceID;

void main() {
    
    vec3 localPos = aPos * uAABBSize;
    
    
    localPos += uAABBCenter;

    
    
    vec4 worldPos = aInstanceMatrix * vec4(localPos, 1.0);

    vInstanceID = aInstanceID;
    gl_Position = uProj * uView * worldPos;
}
