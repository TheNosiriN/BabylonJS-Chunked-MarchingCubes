// import { shaders } from "./ShaderStore.js";
// import { game } from "../Game.js";


var time = 0;

var skies = {
    day: {
        topSkyColor: BABYLON.Color4.FromInts(28, 162, 227, 255),
        midSkyColor: BABYLON.Color4.FromInts(148, 172, 255, 255),
        bottomSkyColor: new BABYLON.Color4(0.9, 0.9, 0.9, 1),

				topSkyPos: 0.1,
        midSkyPos: 0.01,
        bottomSkyPos: -0.1,

        sunIntensity: 0.4,
        sunColor: new BABYLON.Color3.White(),
        sunDiffuse: BABYLON.Color3.FromInts(107, 166, 249).scale(4),
        sunSpecular: BABYLON.Color3.FromInts(20, 80, 163).scale(0.5),
        fog: BABYLON.Color3.FromInts(28, 162, 227).scale(1.2)
    },

    sunsetPink: {
				fog: BABYLON.Color3.FromInts(255, 20, 201).scale(2),

				topSkyColor: new BABYLON.Color4(0.25, 0.0, 1.0, 0.4),
        midSkyColor: BABYLON.Color4.FromInts(255, 175, 128, 255),
        bottomSkyColor: BABYLON.Color4.FromInts(221, 85, 136, 255).scale(2.5),//BABYLON.Color4.FromInts(255, 244, 179, 255),//255, 244, 179, 255

        topSkyPos: 0.1,
        midSkyPos: 0.01,
        bottomSkyPos: -0.1,

        sunIntensity: 0.5,
        sunColor: BABYLON.Color3.FromInts(255, 223, 123),
        sunDiffuse: new BABYLON.Color3(0.25, 0.0, 1.0),
        sunSpecular: BABYLON.Color3.FromInts(161, 103, 255).scale(0.2),
    },

    sunsetRed: {
        topSkyColor: BABYLON.Color4.FromInts(225, 133, 21, 150),
        midSkyColor: BABYLON.Color4.FromInts(212, 17, 0, 255),
        bottomSkyColor: BABYLON.Color4.FromInts(240, 206, 124, 255),

				topSkyPos: 0.1,
        midSkyPos: 0.01,
        bottomSkyPos: -0.1,

        sunIntensity: 0.3,
        sunColor: BABYLON.Color3.FromInts(224, 170, 61),
        sunDiffuse: BABYLON.Color3.FromInts(212, 17, 0),
        sunSpecular: BABYLON.Color3.FromInts(224, 170, 61).scale(0.2),
        fog: BABYLON.Color3.FromInts(183, 2, 0).scale(2)
    },

    night: {
        topSkyColor: new BABYLON.Color4(0, 0, 0, 0.1),
        midSkyColor: new BABYLON.Color4(0.25, 0.0, 1.0, 0.9),
        bottomSkyColor: new BABYLON.Color4(0.25, 0.0, 1.0, 1).scale(3),//1, 0.85, 1, 1

				topSkyPos: 0.2,
        midSkyPos: 0.05,
        bottomSkyPos: -0.1,

        sunIntensity: 0.2,
        sunColor: new BABYLON.Color3.White(),
        sunDiffuse: new BABYLON.Color3.Black(),
        sunSpecular: new BABYLON.Color3(0.25, 0.0, 1.0),
        fog: new BABYLON.Color3(0.25, 0.0, 1.0)
    }
};



var skyLighting = {
		current: null,
		sky: null,
		space: null
};


skyLighting.create = function()
{
		var skyRadius = 5500;

		//shader meshes
		var sky = BABYLON.MeshBuilder.CreateSphere("sky", {diameter: skyRadius*2, segments: 16}, game.scene);
		sky.material = shaders.skyShader;
		sky.infiniteDistance = true;


		var space = BABYLON.MeshBuilder.CreateSphere("space", {diameter: (skyRadius*3), segments: 16}, game.scene);
		space.material = shaders.spaceShader;
		space.infiniteDistance = true;

		space.rotate(BABYLON.Axis.X, BABYLON.Tools.ToRadians(-90), BABYLON.Space.WORLD);
		space.rotate(BABYLON.Axis.Y, BABYLON.Tools.ToRadians(90), BABYLON.Space.WORLD);
		// space.scaling = new BABYLON.Vector3(2.0, 2.0, 2.0);
		// space.position.y = skyRadius;
		// space.bakeCurrentTransformIntoVertices();


		skyLighting.sky = sky;
		skyLighting.space = space;

		skyLighting.current = skies.day;
}


skyLighting.update = function()
{
		time += 0.001;
		var t = 1 - Math.abs(Math.cos(time));

		// incrementSky(t);

		//space
		skyLighting.space.material.setFloat("time", time);
}


function incrementSky(t)
{
	var skiesArr = [];
	skiesArr[0] = skies.day;
	skiesArr[1] = skies.sunsetPink;
	skiesArr[2] = skies.sunsetRed;
	skiesArr[3] = skies.night;
	var numOfSkies = skiesArr.length;

	var n = Math.min(numOfSkies-1, Math.ceil( t * (numOfSkies-1) ));
	var currentT = ( t * (numOfSkies-1) ) - (n-1);

	skyLighting.current = interpolateSky(skiesArr[n-1], skiesArr[n], currentT);
	setSkyUniforms(skyLighting.current, skyLighting.sky.material);


	//game.scene
	game.scene.fogColor = skyLighting.current.fog;
	game.scene.imageProcessingConfiguration.vignetteColor = new BABYLON.Color3(
		skyLighting.current.midSkyColor.r/2.0,
		skyLighting.current.midSkyColor.g/2.0,
		skyLighting.current.midSkyColor.b/2.0
	);
}

function interpolateSky(first, second, t)
{
    var c = {
        topSkyColor: mix4(first.topSkyColor, second.topSkyColor, t),
        midSkyColor: mix4(first.midSkyColor, second.midSkyColor, t),
        bottomSkyColor: mix4(first.bottomSkyColor, second.bottomSkyColor, t),

        topSkyPos: lerp(first.topSkyPos, second.topSkyPos, t),
        midSkyPos: lerp(first.midSkyPos, second.midSkyPos, t),
        bottomSkyPos: lerp(first.bottomSkyPos, second.bottomSkyPos, t),

        sunIntensity: lerp(first.sunIntensity, second.sunIntensity, t),
        sunColor: mix3(first.sunColor, second.sunColor, t),
        sunDiffuse: mix3(first.sunDiffuse, second.sunDiffuse, t),
        sunSpecular: mix3(first.sunSpecular, second.sunSpecular, t),
        fog: mix3(first.fog, second.fog, t)
    };

    return c;
}


function setSkyUniforms(data, shaderMaterial)
{
    shaderMaterial.setColor4("color1", data.topSkyColor);
    shaderMaterial.setColor4("color2", data.midSkyColor);
    shaderMaterial.setColor4("color3", data.bottomSkyColor);

    shaderMaterial.setFloat("pos1", data.topSkyPos);
    shaderMaterial.setFloat("pos2", data.midSkyPos);
    shaderMaterial.setFloat("pos3", data.bottomSkyPos);
}





//personal utils
function mix4(x, y, a)
{
    var r = lerp(x.r, y.r, a);
    var g = lerp(x.g, y.g, a);
    var b = lerp(x.b, y.b, a);
    var a = lerp(x.a, y.a, a);

    return new BABYLON.Color4(r, g, b, a);
}

function mix3(x, y, a)
{
    var r = lerp(x.r, y.r, a);
    var g = lerp(x.g, y.g, a);
    var b = lerp(x.b, y.b, a);

    return new BABYLON.Color3(r, g, b);
}

function lerp(x, y, a)
{
    return x * (1 - a) + y * a;
}
