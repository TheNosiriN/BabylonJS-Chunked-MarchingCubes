// import { game } from "../Game.js";
// import { skyLighting } from "./Sky.js";



var sunAndMoon = {};

sunAndMoon.create = function()
{
		//sun and moon
		var sun = BABYLON.MeshBuilder.CreateDisc("sun", {radius: 10, arc: 1, tessellation: 64, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, game.scene);
		sun.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
		sun.infiniteDistance = true;
		sun.applyFog = false;

		var sunMat = new BABYLON.StandardMaterial("sun", game.scene);
		sunMat.disableLighting = true;
		sun.material = sunMat;



		//lights
		var sunLight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(-1, 1, -1), game.scene);
		sunLight.position = sunLight.direction.multiplyByFloats(100,100,100);
		sunLight.specular = new BABYLON.Color3.Black();
		sunLight.intensity = 1.0;



		//shadows
    var sunDirLight = new BABYLON.DirectionalLight("dirLight", sunLight.direction.multiplyByFloats(-1,-1,-1), game.scene);
    sunDirLight.position = sunLight.position;
    sunDirLight.intensity = 0.5;

    var sunShadowGenerator = new BABYLON.ShadowGenerator(3072, sunDirLight);
    sunShadowGenerator.usePercentageCloserFiltering = true;
    //sunShadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_LOW;

		sun.position = sunLight.position;
		//sunDirLight.autoUpdateExtends = false;

		sunAndMoon.sun = sun;
		sunAndMoon.sunLight = sunLight;
		sunAndMoon.sunShadowLight = sunDirLight;
		sunAndMoon.sunShadows = sunShadowGenerator;
}


sunAndMoon.update = function()
{
		// //sun light
		// sunAndMoon.sunLight.setDirectionToTarget(sunAndMoon.moon.position);
		// sunAndMoon.sunShadowLight.setDirectionToTarget(sunAndMoon.moon.position);
		//
		//
		// //moon light
		// sunAndMoon.moonShadowLight.position = sunAndMoon.moon.position;
		// sunAndMoon.moonShadowLight.setDirectionToTarget(sunAndMoon.sun.position);



		//color
		var s = skyLighting.current.midSkyColor;
		var col = new BABYLON.Color3(Math.abs(s.r), Math.abs(s.g), Math.abs(s.b));

		sunAndMoon.sunLight.intensity = skyLighting.current.sunIntensity;
		sunAndMoon.sunShadowLight.specular = skyLighting.current.sunColor;
		sunAndMoon.sunLight.diffuse = skyLighting.current.sunDiffuse;
		sunAndMoon.sunLight.groundColor = col;
		sunAndMoon.sunLight.specular = skyLighting.current.sunSpecular;
		sunAndMoon.sun.material.emissiveColor = skyLighting.current.sunColor;
}
