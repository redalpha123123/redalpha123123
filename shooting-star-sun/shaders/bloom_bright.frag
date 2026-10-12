precision highp float; varying vec2 vUv; uniform sampler2D uTex; uniform float uThresh;
void main(){ vec3 c=texture2D(uTex,vUv).rgb; float b=max(max(c.r,c.g),c.b); float k=max(b-uThresh,0.0)/max(b,1e-4); gl_FragColor=vec4(c*k,1.0); }
