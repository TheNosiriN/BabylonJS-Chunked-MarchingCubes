// import { game } from "../Game.js";


var pipeline;

var sceneEffects = function(density)
{
		game.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
		game.scene.fogDensity = density;

		game.scene.imageProcessingConfiguration.exposure = 0.9;
    game.scene.imageProcessingConfiguration.contrast = 1.5;

    game.scene.imageProcessingConfiguration.vignetteEnabled = true;
    game.scene.imageProcessingConfiguration.vignetteWeight = 10;

		// game.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    // game.scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

		var gl = new BABYLON.GlowLayer("glow", game.scene);
}


var postEffects = function(samples)
{
		game.pipeline = new BABYLON.DefaultRenderingPipeline(
				"defaultPipeline", // The name of the pipeline
				true, // Do you want the pipeline to use HDR texture?
				game.scene, // The game.scene instance
				[game.camera] // The list of cameras to be attached to
		);

		// pipeline.depthOfFieldEnabled = true;
		// pipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Low;
		// pipeline.depthOfField.focusDistance  = 3000; // distance of the current focus point from the game.camera in millimeters considering 1 game.scene unit is 1 meter
		// pipeline.depthOfField.focalLength  = 50; // focal length of the game.camera in millimeters
		// pipeline.depthOfField.fStop  = 1.4; // aka F number of the game.camera defined in stops as it would be on a physical device

		game.pipeline.bloomEnabled = true;
    game.pipeline.bloomThreshold = 0.9;
    game.pipeline.bloomWeight = 0.1;
    game.pipeline.bloomKernel = 32;
    game.pipeline.bloomScale = 0.5;


		game.pipeline.samples = samples;

		//post processes
		game.ssao = new BABYLON.SSAORenderingPipeline('ssaopipeline', game.scene, { ssaoRatio: 0.75, combineRatio: 1.0 }, [game.camera]);
		game.postProcess = new BABYLON.PostProcess("anamorphic effects", "anamorphicEffects", [], null, 1, game.camera);
		game.postProcess.onApply = function (effect) {
				//effect.setFloat2("screenSize", postProcess.width, postProcess.height);
				//effect.setFloat("threshold", 0.30);
		};
}



//export
var effects = {
		pipeline: pipeline,
		sceneEffects: sceneEffects,
		postEffects: postEffects
};
