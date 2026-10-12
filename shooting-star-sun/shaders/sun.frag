precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uTurb;    // surface turbulence
uniform float uSpin;    // churn / rotation speed
uniform float uSize;    // apparent radius
uniform float uTemp;    // color: warm 0 .. white-hot 1
uniform float uCorona;  // corona / flare strength
uniform float uRise;    // 0 below the frame .. 1 risen into place
uniform float uUseTex;  // 0 = procedural, 1 = sample uTex
uniform float uMap;     // 0 = NASA disk projection, 1 = equirect surface map
uniform float uBlend;   // photo modes: how much live noise to stir in (0..1)
uniform float uExpl;    // explosion progress 0..1, or <0 when idle
uniform sampler2D uTex;

#define TAU 6.28318530718
#define PI  3.14159265359

float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i=floor(x),f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.02; a*=0.5; } return s; }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  vec3 ro = vec3(0.0,0.0,-3.0);                        // <- swap for engine camera
  vec3 rd = normalize(vec3(uv, 1.5));
  vec3 sunC = vec3(0.0, mix(-1.9, 0.0, uRise), 0.0);   // rises on the cutscene clock
  float R = uSize;
  // --- explosion drive (supernova: charge in, then blast) ---
  float e = uExpl;                                     // <0 idle
  float boom = max(e, 0.0);
  float charge = smoothstep(0.1, 0.0, boom);           // 1 at the very start -> 0 (sun pulls in + brightens)
  float blast  = smoothstep(0.12,0.3,boom) * (1.0 - smoothstep(0.3,0.9,boom)); // the detonation window
  float expand = 1.0 - 0.25*charge;                    // just a small pull-in; the fireball replaces the sun
  if(e >= 0.0) R *= max(expand, 0.5);
  float flareBright = (e < 0.0) ? 1.0 : 1.0 + charge*2.0;

  // disc geometry + an ANTI-ALIASED coverage mask (feathers the silhouette so there is no hard rim)
  vec3  L    = normalize(sunC - ro);
  float dist = length(sunC - ro);
  float ang  = acos(clamp(dot(rd,L), -1.0, 1.0));
  float edge = asin(clamp(R/dist, 0.0, 1.0));
  float aa   = 2.5 / uRes.y;                          // ~1px feather in angular units
  float cover = smoothstep(-aa, aa, edge - ang);      // 1 inside the disc, 0 outside, smooth across the limb

  vec3 rt = normalize(cross(vec3(0.0,1.0,0.0), L));
  vec3 up = cross(L, rt);
  float az = atan(dot(rd,up), dot(rd,rt));

  // ---- surface (only compute near/inside the disc) ----
  vec3 surfaceCol = vec3(0.0);
  if(cover > 0.001){
    float b = dot(ro - sunC, rd);
    float h = max(b*b - (dot(ro-sunC, ro-sunC) - R*R), 0.0);
    vec3 pos = ro + rd*(-b - sqrt(h));               // nearest point (tangent when just missing)
    vec3 n   = normalize(pos - sunC);

    float a = uTime*uSpin*0.12;
    mat3 rot = mat3(cos(a),0.0,sin(a), 0.0,1.0,0.0, -sin(a),0.0,cos(a));
    vec3 sp  = rot*n;
    float warp  = fbm(sp*2.5 + vec3(0.0,0.0,uTime*0.30*uSpin));
    float cells = fbm(sp*6.0 + warp*2.2 - vec3(0.0,0.0,uTime*0.60*uSpin));
    float f = pow(clamp(warp*0.55 + cells*0.75*uTurb, 0.0, 1.0), 1.5);

    vec3 pcol = mix(vec3(0.20,0.015,0.0), vec3(0.85,0.11,0.0), smoothstep(0.00,0.22,f));
    pcol = mix(pcol, vec3(1.0,0.42,0.05), smoothstep(0.22,0.48,f));
    pcol = mix(pcol, vec3(1.0,0.78,0.22), smoothstep(0.48,0.74,f));
    pcol = mix(pcol, vec3(1.0,0.97,0.82), smoothstep(0.74,1.00,f));
    pcol = mix(pcol, vec3(1.0), uTemp*0.4);

    vec3 albedo;
    if(uUseTex > 0.5){
      vec2 tuv = (uMap < 0.5)
        ? n.xy*0.44 + 0.5
        : vec2(atan(sp.z, sp.x)/TAU + 0.5, acos(clamp(sp.y,-1.0,1.0))/PI);
      tuv += (vec2(warp, cells) - 0.5) * 0.06 * (0.3 + uSpin);   // churn the photo in place
      vec3 tex = texture2D(uTex, tuv).rgb * 1.5;
      albedo = tex * mix(1.0, 0.45 + 1.35*f, uBlend);   // churn via brightness only -> keeps the photo saturated (no pale clouds)
    } else {
      albedo = pcol;
    }

    vec3 LT = normalize(vec3(0.45,0.55,-0.3));
    float relief = cells - fbm(sp*6.0 + warp*2.2 - vec3(0.0,0.0,uTime*0.60*uSpin) + LT*0.045);
    albedo *= 1.0 + clamp(relief, -0.4, 0.4) * 1.3;            // granulation relief

    float mu = max(dot(n,-rd), 0.0);
    albedo *= mix(0.85, 1.2, pow(mu, 0.5));                    // gentle limb shading (detail continuous to the edge)
    surfaceCol = albedo * 1.8;                                 // HDR
  }

  // ---- corona + flames (outside the disc) ----
  // Angry fire: dense flame tongues licking all around the limb, varying height. Controlled by Edge flames.
  float beyond = max(ang - edge, 0.0);
  vec2 dir = vec2(cos(az), sin(az));
  float h1 = fbm(vec3(dir*3.0,  uTime*0.6));                    // slow large flame lobes
  float h2 = fbm(vec3(dir*9.0, -uTime*1.0));                    // faster flicker
  float height = (0.3 + 0.7*h1) * (0.05 + 0.12*h2) + 0.03;      // tongue reach ~0.03..0.2, varying around the edge
  float flame  = clamp(1.0 - beyond/height, 0.0, 1.0);          // 1 at the root -> 0 at the tip
  float brk    = smoothstep(0.30, 0.72, fbm(vec3(dir*14.0, beyond*22.0 - uTime*1.8))); // break into licking tongues
  flame *= brk;
  float hotv = flame;                                           // root hot, tip cool
  vec3 flameCol = mix(vec3(0.75,0.05,0.0), vec3(1.0,0.35,0.04), hotv);          // deep-red tips -> orange
  flameCol = mix(flameCol, vec3(1.0,0.62,0.12), smoothstep(0.55,1.0,hotv));     // hot roots glow orange-yellow

  // fade the surface to black over a fixed ~7px band at the rim (screen-space) -> no hard edge on any GPU
  float edgeFade = smoothstep(0.0, aa*7.0, edge - ang);
  vec3 col = surfaceCol * edgeFade * cover;                     // the sun disc on black
  col += flameCol * flame * 1.0 * (1.0 - cover) * uCorona;      // prominences, only outside the disc; sparse flares, not a ring
  col *= flareBright;                                           // super-bright at detonation
  if(e >= 0.0){
    col *= 1.0 - smoothstep(0.05, 0.25, boom);           // the original sun is consumed by the blast
    float rad = length(uv);
    vec2  dir = rad > 0.0001 ? uv/rad : vec2(1.0,0.0);

    // --- billowing fireball: a growing ball of rolling fire clouds ---
    float grow = smoothstep(0.02, 0.38, boom);
    float fbR  = grow * 1.35;                                       // fireball swells out then holds
    float cloud  = fbm(vec3(uv*5.5, uTime*0.7 + boom*1.2));         // rolling turbulence inside
    float billow = (fbm(vec3(dir*3.5, boom*2.2))-0.5)*0.5 + (fbm(vec3(dir*9.0, boom*3.0))-0.5)*0.2; // cauliflower boundary
    float d = rad - (fbR + billow + (cloud-0.5)*0.3);
    float inside = smoothstep(0.1, -0.08, d);                       // soft fireball mask

    // heat is mostly CLOUD-driven (flame cells + white hot spots), with a mild core boost
    float radial = 1.0 - smoothstep(0.0, fbR, rad);
    float heat = clamp(radial*0.6 + (cloud-0.35)*1.5, 0.0, 1.0);
    heat *= 1.0 - smoothstep(0.5, 1.0, boom);                       // cools + darkens to smoke over time
    vec3 fc = mix(vec3(0.03,0.012,0.012), vec3(0.6,0.07,0.0), smoothstep(0.0,0.22,heat)); // smoke -> deep red
    fc = mix(fc, vec3(1.0,0.32,0.03), smoothstep(0.22,0.5,heat));   // orange
    fc = mix(fc, vec3(1.0,0.72,0.18), smoothstep(0.5,0.78,heat));   // yellow
    fc = mix(fc, vec3(1.0,0.97,0.85), smoothstep(0.82,1.0,heat));   // white-hot spots only
    col += inside * fc * 2.4;

    // brief hot core at the instant of detonation
    col += vec3(1.0,0.93,0.78) * exp(-rad*4.0) * smoothstep(0.03,0.1,boom)*(1.0-smoothstep(0.1,0.28,boom)) * 3.0;
  }
  gl_FragColor = vec4(col, 1.0);   // raw HDR -> tonemap + glow happen in the bloom composite pass
}
