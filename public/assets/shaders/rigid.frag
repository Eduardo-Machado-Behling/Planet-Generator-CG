#version 300 es

precision highp float;
precision highp sampler2DShadow;

layout(location = 0) out vec4 FragColor;
layout(location = 1) out vec4 FragPosID;

in vec3 vFragPos;
in vec3 vLocalPos;
in vec3 vLightDir;

uniform mat4 uModel;
uniform sampler2D uHeightMap;
uniform sampler2D uBiomeGradient;
uniform vec3 uViewPos;
uniform int uObjectID;
uniform float uPickingMinimum;
uniform sampler2DShadow uShadowMap;

uniform mat4 uLightSpaceMatrix;

const float PI = 3.14159265359;

vec2 getSphericalUV(vec3 p) {
  vec3 n = normalize(p);
  float u = 0.5 + atan(n.z, n.x) / (2.0 * PI);
  float v = 0.5 + asin(n.y) / PI;
  return vec2(u, v);
}

vec3 calculateLocalNormal(vec3 localPos, vec2 uv, float hScale) {
  ivec2 size = textureSize(uHeightMap, 0);
  float step_x = 2.0 / float(size.x);
  float step_y = 2.0 / float(size.y);

  float h = texture(uHeightMap, uv).r;
  float h_u = texture(uHeightMap, uv + vec2(step_x, 0.0)).r;
  float h_v = texture(uHeightMap, uv + vec2(0.0, step_y)).r;

  float dU = (h_u - h) * hScale;
  float dV = (h_v - h) * hScale;

  vec3 normal = normalize(localPos);
  vec3 tangent = normalize(cross(normal, vec3(0.0, 1.0, 0.0)));
  vec3 bitangent = normalize(cross(normal, tangent));

  return normalize(normal - (tangent * dU * 15.0) - (bitangent * dV * 15.0));
}

float computeShadow(vec3 worldPos, vec3 normal, vec3 lightDir) {
  vec4 lightSpacePos = uLightSpaceMatrix * vec4(worldPos, 1.0);

  vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;

  projCoords = projCoords * 0.5 + 0.5;

  if (projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 ||
      projCoords.y > 1.0 || projCoords.z < 0.0 || projCoords.z > 1.0) {
    return 1.0;
  }

  float bias = 0.0001;

  return texture(uShadowMap, vec3(projCoords.xy, projCoords.z - bias));
}

void main() {
  vec2 uv = getSphericalUV(vLocalPos);

  vec2 dx = dFdx(uv);
  vec2 dy = dFdy(uv);
  if (dx.x > 0.5)
    dx.x -= 1.0;
  if (dx.x < -0.5)
    dx.x += 1.0;

  float h = textureGrad(uHeightMap, uv, dx, dy).r;
  vec3 albedo = texture(uBiomeGradient, vec2(h, 0.5)).rgb;

  vec3 localNormal = calculateLocalNormal(vLocalPos, uv, 1.0);
  vec3 worldNormal = normalize(mat3(uModel) * localNormal);

  vec3 lightDir = normalize(vLightDir);
  vec3 viewDir = normalize(uViewPos - vFragPos);
  vec3 reflectDir = reflect(-lightDir, worldNormal);

  float diff = max(dot(worldNormal, lightDir), 0.0);

  float specMask = (h <= 0.001) ? 1.0 : 0.0;
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);
  vec3 specular = vec3(1.0) * spec * specMask * 0.8;

  float shadow = computeShadow(vFragPos, worldNormal, lightDir);

  vec3 ambient = vec3(0.12, 0.12, 0.15);

  vec3 finalColor = albedo * (ambient + shadow * diff) + (shadow * specular);

  float id = h > uPickingMinimum ? float(uObjectID) : -1.0;
  FragColor = vec4(finalColor, 1.0);
  FragPosID = vec4(vFragPos, id);
}
