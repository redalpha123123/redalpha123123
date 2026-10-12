precision highp float; varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir;
void main(){ vec3 s=texture2D(uTex,vUv).rgb*0.227027;
 s+=texture2D(uTex,vUv+uDir*1.3846154).rgb*0.3162162; s+=texture2D(uTex,vUv-uDir*1.3846154).rgb*0.3162162;
 s+=texture2D(uTex,vUv+uDir*3.2307692).rgb*0.0702703; s+=texture2D(uTex,vUv-uDir*3.2307692).rgb*0.0702703;
 gl_FragColor=vec4(s,1.0); }
