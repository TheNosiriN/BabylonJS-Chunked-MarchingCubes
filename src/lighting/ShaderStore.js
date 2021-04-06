// import { game } from "../Game.js";


//exports
var shaders = {};


shaders.compile = function()
{
		//shader store
		BABYLON.Effect.ShadersStore["anamorphicEffectsFragmentShader"] = `
		  #ifdef GL_ES
		      precision highp float;
		  #endif

		  // Samplers
		  varying vec2 vUV;
		  uniform sampler2D textureSampler;

		  float NoiseSeed;
		  float randomFloat(){
		  NoiseSeed = sin(NoiseSeed) * 84522.13219145687;
		  return fract(NoiseSeed);
		  }

		  float SCurve (float value, float amount, float correction) {

		      float curve = 1.0;

		      if (value < 0.5){
							curve = pow(value, amount) * pow(2.0, amount) * 0.5;
		      }else{
		          curve = 1.0 - pow(1.0 - value, amount) * pow(2.0, amount) * 0.5;
		      }

		      return pow(curve, correction);
		  }




		  //ACES tonemapping from: https://www.shadertoy.com/view/wl2SDt
		  vec3 ACESFilm(vec3 x)
		  {
		      float a = 2.51;
		      float b = 0.03;
		      float c = 2.43;
		      float d = 0.59;
		      float e = 0.14;
		      return (x*(a*x+b))/(x*(c*x+d)+e);
		  }




		  //Chromatic Abberation from: https://www.shadertoy.com/view/XlKczz
		  vec3 chromaticAbberation(sampler2D tex, vec2 uv, float amount, float radius)
		  {
		      float aberrationAmount = amount/10.0;
		      vec2 distFromCenter = uv - 0.5;

		      // stronger aberration near the edges by raising to power 3
		      vec2 aberrated = aberrationAmount * pow(distFromCenter, vec2(radius));

		      vec3 color = vec3(0.0);

		      for (int i = 1; i <= 8; i++)
		      {
		          float weight = 1.0 / pow(2.0, float(i));
		          color.r += texture2D(tex, uv - float(i) * aberrated).r * weight;
		          color.b += texture2D(tex, uv + float(i) * aberrated).b * weight;
		      }

		      color.g = texture2D(tex, uv).g * 0.9961; // 0.9961 = weight(1)+weight(2)+...+weight(8);

		      return color;
		  }




		  //film grain from: https://www.shadertoy.com/view/wl2SDt
		  vec3 filmGrain()
		  {
		      return vec3(0.9 + randomFloat()*0.15);
		  }




		  //Sigmoid Contrast from: https://www.shadertoy.com/view/MlXGRf
		  vec3 contrast(vec3 color)
		  {
		      return vec3(SCurve(color.r, 3.0, 1.0),
		                  SCurve(color.g, 4.0, 0.7),
		                  SCurve(color.b, 2.6, 0.6)
		              );
		  }




		  //anamorphic-ish flares from: https://www.shadertoy.com/view/MlsfRl
		  vec3 flares(sampler2D tex, vec2 uv, float threshold, float intensity, float stretch, float brightness)
		  {
		      threshold = 1.0 - threshold;

		      vec3 hdr = texture2D(tex, uv).rgb;
		      hdr = vec3(floor(threshold+pow(hdr.r, 1.0)));

		      float d = intensity; //200.;
		      float c = intensity*stretch; //100.;


		      //horizontal
		      for (float i=c; i>-1.0; i--)
		      {
		          float texL = texture2D(tex, uv+vec2(i/d, 0.0)).r;
		          float texR = texture2D(tex, uv-vec2(i/d, 0.0)).r;
		          hdr += floor(threshold+pow(max(texL,texR), 4.0))*(1.0-i/c);
		      }

		      hdr *= vec3(0.1,0.1,1.0); //tint

		      return hdr*brightness;
		  }




		  //glow from: https://www.shadertoy.com/view/XslGDr (unused but useful)
		  vec3 samplef(vec2 tc, vec3 color)
		  {
		      return pow(color, vec3(2.2, 2.2, 2.2));
		  }

		  vec3 highlights(vec3 pixel, float thres)
		  {
		      float val = (pixel.x + pixel.y + pixel.z) / 3.0;
		      return pixel * smoothstep(thres - 0.1, thres + 0.1, val);
		  }

		  vec3 hsample(vec3 color, vec2 tc)
		  {
		      return highlights(samplef(tc, color), 0.6);
		  }

		  vec3 blur(vec3 col, vec2 tc, float offs)
		  {
		      vec4 xoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0);
		      vec4 yoffs = offs * vec4(-2.0, -1.0, 1.0, 2.0);

		      vec3 color = vec3(0.0, 0.0, 0.0);
		      color += hsample(col, tc + vec2(xoffs.x, yoffs.x)) * 0.00366;
		      color += hsample(col, tc + vec2(xoffs.y, yoffs.x)) * 0.01465;
		      color += hsample(col, tc + vec2(    0.0, yoffs.x)) * 0.02564;
		      color += hsample(col, tc + vec2(xoffs.z, yoffs.x)) * 0.01465;
		      color += hsample(col, tc + vec2(xoffs.w, yoffs.x)) * 0.00366;

		      color += hsample(col, tc + vec2(xoffs.x, yoffs.y)) * 0.01465;
		      color += hsample(col, tc + vec2(xoffs.y, yoffs.y)) * 0.05861;
		      color += hsample(col, tc + vec2(    0.0, yoffs.y)) * 0.09524;
		      color += hsample(col, tc + vec2(xoffs.z, yoffs.y)) * 0.05861;
		      color += hsample(col, tc + vec2(xoffs.w, yoffs.y)) * 0.01465;

		      color += hsample(col, tc + vec2(xoffs.x, 0.0)) * 0.02564;
		      color += hsample(col, tc + vec2(xoffs.y, 0.0)) * 0.09524;
		      color += hsample(col, tc + vec2(    0.0, 0.0)) * 0.15018;
		      color += hsample(col, tc + vec2(xoffs.z, 0.0)) * 0.09524;
		      color += hsample(col, tc + vec2(xoffs.w, 0.0)) * 0.02564;

		      color += hsample(col, tc + vec2(xoffs.x, yoffs.z)) * 0.01465;
		      color += hsample(col, tc + vec2(xoffs.y, yoffs.z)) * 0.05861;
		      color += hsample(col, tc + vec2(    0.0, yoffs.z)) * 0.09524;
		      color += hsample(col, tc + vec2(xoffs.z, yoffs.z)) * 0.05861;
		      color += hsample(col, tc + vec2(xoffs.w, yoffs.z)) * 0.01465;

		      color += hsample(col, tc + vec2(xoffs.x, yoffs.w)) * 0.00366;
		      color += hsample(col, tc + vec2(xoffs.y, yoffs.w)) * 0.01465;
		      color += hsample(col, tc + vec2(    0.0, yoffs.w)) * 0.02564;
		      color += hsample(col, tc + vec2(xoffs.z, yoffs.w)) * 0.01465;
		      color += hsample(col, tc + vec2(xoffs.w, yoffs.w)) * 0.00366;

		      return color;
		  }

		  vec3 glow(vec3 col, vec2 uv)
		  {
		      vec3 color = blur(col, uv, 2.0);
		      color += blur(col, uv, 3.0);
		      color += blur(col, uv, 5.0);
		      color += blur(col, uv, 7.0);
		      color /= 4.0;

		      color += samplef(uv, col);

		      return color;
		  }




		  //margins from: https://www.shadertoy.com/view/wl2SDt
		  vec3 margins(vec3 color, vec2 uv, float marginSize)
		  {
		      if(uv.y < marginSize || uv.y > 1.0-marginSize)
		      {
		          return vec3(0.0);
		      }else{
		          return color;
		      }
		  }


		  void main(void) {

					//margins
					float marginSize = 0.1;
					if(vUV.y < marginSize || vUV.y > 1.0-marginSize){
							gl_FragColor = vec4(vec3(0.0), 1.0);
		          return;
		      }


					vec3 color = vec3(0.0);
		      color = texture2D(textureSampler, vUV).rgb;


		      //chromatic abberation
		      color = chromaticAbberation(textureSampler, vUV, 0.8, 4.0);


		      //film grain
		      color *= filmGrain();


					//glow (not bloom)
					//color = glow(color, vUV);


					//contrast
		      color = contrast(color) * 0.9;


		      //flare
		      color += flares(textureSampler, vUV, 0.8, 200.0, 0.4, 0.01);


					//ACES Tonemapping
		      color = ACESFilm(color);


		      gl_FragColor = vec4(color, 1.0);
		  }`;

		BABYLON.Effect.ShadersStore["skyVertexShader"] = `
				precision highp float;

				// Attributes
				attribute vec3 position;
				attribute vec2 uv;

				// Uniforms
				uniform mat4 worldViewProjection;

				// Varying
				varying vec2 vUV;

				void main(void) {
						gl_Position = worldViewProjection * vec4(position, 1.0);

						vUV = uv;
				}`;

		BABYLON.Effect.ShadersStore["skyFragmentShader"] = `
				precision highp float;

				varying vec2 vUV;

				uniform sampler2D textureSampler;
				uniform float time;

				uniform vec4 color1;
				uniform float pos1;
				uniform vec4 color2;
				uniform float pos2;
				uniform vec4 color3;
				uniform float pos3;


				// positioned color node
				struct RampNode
				{
						float Position; // 0 to 1
						vec4 Color;
				};

				// http://blog.demofox.org/2012/09/24/bias-and-gain-are-your-friend/
				struct Interpolator
				{
						float Bias; // 0 to 1
						float Gain; // 0 to 1
				};


				#define NUM_NODES 3
				#define EQUATOR 0.492
				RampNode ColorRamp[NUM_NODES];
				Interpolator Interpolators[NUM_NODES - 1];

				float GetBias(float time, float bias)
				{
						return (time / ((((1.0 / bias) - 2.0) * (1.0 - time)) + 1.0));
				}

				float GetGain(float time, float gain)
				{
						if(time < 0.5)
								return GetBias(time * 2.0, gain) / 2.0;
						else
								return GetBias(time * 2.0 - 1.0, 1.0 - gain) / 2.0 + 0.5;
				}

				vec4 finalImage( float x )
				{
						// Node 0 : black
						ColorRamp[0].Position = pos1 + EQUATOR;
						ColorRamp[0].Color = color1;

						// 0 to 1
						Interpolators[0].Bias = 0.5;
						Interpolators[0].Gain = 0.5;

						// Node 1 : purple-ish blue
						ColorRamp[1].Position = pos2 + EQUATOR;
						ColorRamp[1].Color = color2;

						// 1 to 2
						Interpolators[1].Bias = 0.25;
						Interpolators[1].Gain = 0.5;

						// Node 2 : white
						ColorRamp[2].Position = pos3 + EQUATOR;
						ColorRamp[2].Color = color3;


						// anything before the first ramp node takes its color
						vec4 c = ColorRamp[0].Color;

						// loop through ramp nodes
						for (int i = 1; i < NUM_NODES; i++)
						{
								RampNode last = ColorRamp[i - 1];
								RampNode current = ColorRamp[i];

								float stepInStage = (x - last.Position) / (current.Position - last.Position);

								if (stepInStage < 0.0 || stepInStage >= 1.0){
										// not in the range for this node, keep going
										continue;
								}

								// interpolate
								Interpolator interpolator = Interpolators[i - 1];
								stepInStage = GetBias(stepInStage, interpolator.Bias) *
														GetGain(stepInStage, interpolator.Gain);

								c = mix(last.Color, current.Color, stepInStage);
						}

						// anything after the last ramp node takes its color
						if (x < ColorRamp[NUM_NODES - 1].Position){
								c = ColorRamp[NUM_NODES - 1].Color;
						}

						return c;
				}


				void main(void) {

						gl_FragColor = finalImage(1.0 - vUV.y);
				}`;

		BABYLON.Effect.ShadersStore["spaceVertexShader"] = `
				precision highp float;

				// Attributes
				attribute vec3 position;
				attribute vec2 uv;

				// Uniforms
				uniform mat4 worldViewProjection;

				// Varying
				varying vec2 vUV;
				varying vec3 vPosition;


				void main(void) {
						gl_Position = worldViewProjection * vec4(position, 1.0);

						vUV = uv;
						vPosition = position;
				}`;

		BABYLON.Effect.ShadersStore["spaceFragmentShader"] = `
				precision highp float;

				varying vec2 vUV;
				varying vec3 vPosition;

				uniform float time;


				#define RES 0.009


				// perlin noise from: https://www.shadertoy.com/view/4sc3z2
				#define MOD3 vec3(.1031,.11369,.13787)

				vec3 hash33(vec3 p3)
				{
						p3 = fract(p3 * MOD3);
						p3 += dot(p3, p3.yxz+19.19);
						return -1.0 + 2.0 * fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
				}
				float perlin_noise(vec3 p)
				{
						vec3 pi = floor(p);
						vec3 pf = p - pi;

						vec3 w = pf * pf * (3.0 - 2.0 * pf);

						return 	clamp(mix(
												mix(
														mix(dot(pf - vec3(0, 0, 0), hash33(pi + vec3(0, 0, 0))),
																dot(pf - vec3(1, 0, 0), hash33(pi + vec3(1, 0, 0))),
																w.x),
														mix(dot(pf - vec3(0, 0, 1), hash33(pi + vec3(0, 0, 1))),
																dot(pf - vec3(1, 0, 1), hash33(pi + vec3(1, 0, 1))),
																w.x),
														w.z),
												mix(
														mix(dot(pf - vec3(0, 1, 0), hash33(pi + vec3(0, 1, 0))),
																dot(pf - vec3(1, 1, 0), hash33(pi + vec3(1, 1, 0))),
																w.x),
														mix(dot(pf - vec3(0, 1, 1), hash33(pi + vec3(0, 1, 1))),
																dot(pf - vec3(1, 1, 1), hash33(pi + vec3(1, 1, 1))),
																w.x),
														w.z),
												w.y) * 0.5 + 0.5, 0.0, 1.0);
				}


				float hash21(vec2 p)
				{
						p = fract( p*vec2(123.34, 456.21) );
						p += dot(p, p+45.32);
						return fract(p.x*p.y);
				}


				float star(vec2 p, float t)
				{
						float d = length(p);
						float m = (max(0.0, abs(sin(t*2.0))) * 0.1) / d;

						m *= smoothstep(1.5, 0.0001, d*4.0);

						return m;
				}


				vec3 starField(vec2 uv, float t)
				{
						vec3 col = vec3(0);

						vec2 gv = fract(uv/1.5) - 0.5;
						vec2 id = floor(uv/1.5);

						for (int x=-1; x<=1; x++){
								for (int y=-1; y<=1; y++)
								{
										vec2 offset = vec2(x, y);

										float n = hash21(id + offset);
										float star = star(gv - offset - (vec2(n, fract(n*2020.0)) - 0.5), t*fract(n*135.246));
										float size = min(0.1, fract(n*1234.567));

										col += star * size;
								}
						}

						vec3 color = 0.5 + 0.2*cos(vec3(uv/20.0, 0.0)+vec3(0,10,4)); //color
						return col;
				}


				vec3 finalImage( vec2 fragCoord, float t )
				{
						vec2 uv = fragCoord.xy/vec2(RES/2.0, RES);

						vec3 coords = vec3(vec2(uv.x, uv.y + t), t*40.0);
						vec3 coords2 = normalize(vPosition)*50.0 + t*40.0;

						vec3 stars = starField( vec2(coords.x, coords.y)*5.0, time*20.0 );

						vec3 clouds = vec3( perlin_noise(coords2/7.0) );

						vec3 cloudsCol = 0.5 + 0.5*cos((coords2/5.0)+vec3(0,3,9)); //color
						clouds *= cloudsCol;//clouds += cloudsCol;
						// stars *= 2.0;
						// stars *= clouds+0.5;

						vec3 col = clouds + stars;

						return col;
				}

				// Converts a srgb color to a rgb color (approximated, but fast)
				vec3 srgb_to_rgb_approx(vec3 srgb) {
						return pow(srgb, vec3(2.2));
				}


				void main(void) {

						vec3 col = finalImage(vUV, time);

						col = pow(col, vec3(2.0));

						gl_FragColor = vec4(col, 1.0);
				}`;

		BABYLON.Effect.ShadersStore['grassVertexShader'] = `
				precision highp float;

				//Attributes
				attribute vec3 position;

				attribute vec2 posRef;
				attribute vec2 uv;

				attribute float bladeLengthRef;
				attribute vec4 deformRef;

				// Uniforms
				uniform mat4 viewProjection;

				uniform float time;

				// Varying
				varying vec4 vPosition;
				varying vec2 vUV;
				varying float vBladePer;

				#include<instancesDeclaration>

				vec2 rotate (float x, float y, float r) {
						float c = cos(r);
						float s = sin(r);
						return vec2(x * c - y * s, x * s + y * c);
				}


				void main() {
						#include<instancesVertex>


						vec4 growth = vec4(1.0);
						float invBladePer = 1.0-bladeLengthRef;

						vec4 p = vec4( position, 1. );

						p.xy *= growth.x*deformRef.x;

						vec2 dUV = uv*2.0-1.;

						float tipCurve = 1.0 - pow(invBladePer, 6.0);

						p.x *= tipCurve;
						dUV.x *= 0.5 - (tipCurve*-1.);

						float lean = deformRef.z*growth.x;
						lean = (lean *pow(invBladePer, 3.));
						p.z = lean;
						p.y *= sqrt(1.0 - (lean*lean));
						p.xz = rotate(p.x, p.z, deformRef.y*360.);
						p.xz += posRef;

						float wind = (sin(p.x + time) + cos(p.z + time))/2.0;

						vec2 windDir = normalize(vec2(0.5, 0.5));
						float windSpeed = tan(cos(time))*0.2;
						windDir*=windSpeed;

						p.xz += (wind * (invBladePer * invBladePer ))*windDir;


						dUV/=2.0+1.0;

						vPosition = p;
						vUV = dUV;
						vBladePer = bladeLengthRef;

						gl_Position = viewProjection * finalWorld * p;

				}
		`;

		BABYLON.Effect.ShadersStore['grassFragmentShader'] = `
				precision highp float;

				uniform mat4 worldView;

				varying vec4 vPosition;
				varying vec2 vUV;
				varying float vBladePer;

				uniform sampler2D dTexture;

				void main(void) {
						vec3 base = vec3(0.0, 1.0-vBladePer, 0.0);
						base = mix(base, texture2D(dTexture, vUV).rgb, 0.65);
						gl_FragColor = vec4( base, 1.0);
				}
		`;
		//




		//materials
		shaders.skyShader = new BABYLON.ShaderMaterial("skyShader", game.scene, {
				vertex: "sky",
				fragment: "sky"
		},
		{
				needAlphaBlending: true,
				attributes: ["position", "normal", "uv"],
				uniforms: ["world", "worldView", "worldViewProjection", "view", "projection",
										"color1", "pos1", "color2", "pos2", "color3", "pos3"]
		});
		shaders.skyShader.backFaceCulling = false;
		shaders.skyShader.disableLighting = true;


		shaders.spaceShader = new BABYLON.ShaderMaterial("spaceShader", game.scene, {
				vertex: "space",
				fragment: "space"
		},
		{
				attributes: ["position", "normal", "uv"],
				uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "time"]
		});
		shaders.spaceShader.backFaceCulling = false;
		shaders.spaceShader.disableLighting = true;


		shaders.grassShader = new BABYLON.ShaderMaterial("grass", game.scene, {
        vertex: "grass",
        fragment: "grass",
    },
    {
        attributes: ["position", "uv", "posRef", "bladeLengthRef", "uvRef", "deformRef"],
        samplers:['growthMap', 'dTexture'],
        uniforms: [
            "world", "worldView", "worldViewProjection", "view", "projection", "viewProjection",
            "time", "zoneSize", "bladeHeight"
        ]
    });


		//done message
		console.log("All shaders compiled successfully");
}
