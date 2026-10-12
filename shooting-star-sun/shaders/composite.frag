precision highp float; varying vec2 vUv; uniform sampler2D uScene; uniform sampler2D uBloom; uniform float uAmt; uniform float uFlash; uniform vec2 uShake;
void main(){ vec2 uv = clamp(vUv + uShake, 0.0, 1.0);
 vec3 c = texture2D(uScene,uv).rgb + texture2D(uBloom,uv).rgb*uAmt;
 c += vec3(1.0,0.96,0.88) * uFlash;                 // white detonation flash
 c = c/(c+vec3(1.0)); c = pow(c,vec3(0.4545));
 float vig = smoothstep(1.15, 0.35, length(vUv-0.5)); c *= mix(1.0, vig, 0.25); // subtle vignette
 gl_FragColor=vec4(c,1.0); }
