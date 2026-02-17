#version 300 es


layout(location = 0) in vec3  aPos;
layout(location = 1) in vec3  aNormal;
layout(location = 2) in vec2  aTexCoord;


















layout(location = 3) in vec4  aInstanceCol0;
layout(location = 4) in vec4  aInstanceCol1;
layout(location = 5) in vec4  aInstanceCol2;
layout(location = 6) in vec4  aInstanceCol3;
layout(location = 7) in float aInstanceID;


uniform mat4 uView;
uniform mat4 uProj;
uniform vec3 uSunWorldPosition;



out vec3       vNormal;
out vec3       vFragPos;      
out vec2       vTexCoord;
out vec3       vLightDir;
flat out float vInstanceID;   

















void main() {
    
    mat4 aInstanceMatrix = mat4(
        aInstanceCol0,   
        aInstanceCol1,   
        aInstanceCol2,   
        aInstanceCol3    
    );

    
    vec4 worldPos = aInstanceMatrix * vec4(aPos, 1.0);
    vFragPos      = worldPos.xyz;

    
    
    
    vNormal = normalize(mat3(aInstanceMatrix) * aNormal);

    
    vLightDir = normalize(uSunWorldPosition - vFragPos);

    
    vTexCoord   = aTexCoord;
    vInstanceID = aInstanceID;

    
    gl_Position = uProj * uView * worldPos;
}
