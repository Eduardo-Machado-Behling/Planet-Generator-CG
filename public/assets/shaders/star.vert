#version 300 es

out vec2 fragCoord;

void main() {
  const vec2 positions[6] =
      vec2[](vec2(-1.0, -1.0), 
             vec2(1.0, -1.0),  
             vec2(-1.0, 1.0),  
             vec2(1.0, 1.0),   
             vec2(1.0, -1.0),  
             vec2(-1.0, 1.0)   
      );

  fragCoord = positions[gl_VertexID];
  gl_Position = vec4(positions[gl_VertexID], 0.99, 1.0);
}