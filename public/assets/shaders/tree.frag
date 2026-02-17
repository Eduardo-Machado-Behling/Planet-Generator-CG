#version 300 es

precision highp float;
precision highp sampler2DShadow;


layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec4 FragPosID;


in vec3 vFragPos; 
in vec3 vNormal;
in vec2 vTexCoord; 
in vec3 vLightDir; 
flat in float vInstanceID; 


uniform sampler2D uSampler; 
uniform sampler2DShadow uShadowMap; 
uniform mat4 uLightSpaceMatrix;


float computeShadow(vec3 worldPos, vec3 normal, vec3 lightDir) {
    vec4 lsPos = uLightSpaceMatrix * vec4(worldPos, 1.0);
    vec3 projCoords = lsPos.xyz / lsPos.w;
    projCoords = projCoords * 0.5 + 0.5;

    if (projCoords.x < 0.0 || projCoords.x > 1.0 ||
            projCoords.y < 0.0 || projCoords.y > 1.0 ||
            projCoords.z < 0.0 || projCoords.z > 1.0) {
        return 1.0;
    }

    float bias = 0.0001;
    return texture(uShadowMap, vec3(projCoords.xy, projCoords.z - bias));
}


void main() {
    vec4 texColor = texture(uSampler, vTexCoord);

    
    if (texColor.a < 0.1) discard;

    vec3 lightDir = normalize(vLightDir);
    vec3 norm = normalize(vNormal);
    float diff = max(dot(norm, lightDir), 0.0);

    float shadow = computeShadow(vFragPos, norm, lightDir);

    float ambient = 0.2;
    float lighting = ambient + (1.0 - ambient) * diff * shadow;

    FragColor = vec4(texColor.rgb * lighting, texColor.a);
    FragPosID = vec4(vFragPos, vInstanceID);
}
