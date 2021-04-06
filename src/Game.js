

(window.oldWorkers || []).forEach(w => w.terminate());

var game = {
		engine: new BABYLON.Engine(canvas, true),
		deltaTime: 0,
		map: {},
		objects: {},
		mouseDX: 0,
		mouseDY: 0
}



const RENDER_WIDTH = 1920;
const RENDER_HEIGHT = 1080;




var create = function(){

		game.dsm = new BABYLON.DeviceSourceManager(game.engine);



		// game.camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3.Zero(), game.scene);
    // game.camera.inputs.clear();

		// game.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0,0,0), game.scene);
		// game.camera.setTarget(BABYLON.Vector3.Zero());
    // game.camera.attachControl(canvas, true);

		game.camera = new BABYLON.CinematicCamera("camera", game.scene);
		game.camera.setPoints(cave2Points, 100, new BABYLON.Vector3.Up());

		//game.camera.ellipsoid = new BABYLON.Vector3(1, 1, 1);
		// game.camera.collisionRadius = new BABYLON.Vector3(0.5, 0.5, 0.5);
		// game.camera.checkCollisions = true;
		// game.scene.collisionsEnabled = true;

		game.camera.minZ = 0;
		game.camera.maxZ += 2000;


		//shaders
		shaders.compile();

		//textures
		// Textures.loadTextures();


		//effects
		effects.postEffects(4);
		effects.sceneEffects(0.003);

		//sky
		skyLighting.create();

		//sunAndMoon
		sunAndMoon.create();
		game.shadowGenerator = sunAndMoon.sunShadows;
		game.shadowMap = game.shadowGenerator.getShadowMap();




		chunkFunctions.start();


		// game.objects.player = new Player("p1", new BABYLON.Vector3(0,127,0), true);
		// game.objects.player.create();

		game.objects.player = game.camera;
		// game.objects.player.position = cave2Points[0];

		chunkFunctions.update();
}



var cameraInfo = document.getElementById("cameraInfo");

var startRecording = false;
var keyboard = null;

var step = function(){
		game.deltaTime = game.engine.getDeltaTime();

		cameraInfo.innerHTML = "pos: "+(game.camera.position)+"\ndir: "+(game.camera.getDirection(new BABYLON.Vector3.Up()));

		// chunkFunctions.update();
		updateBuildQueue();

		// game.objects.player.update();


		//sky
		skyLighting.update();

		//sunAndMoon
		sunAndMoon.update();

		keyboard = game.dsm.getDeviceSource(BABYLON.DeviceType.Keyboard);
		if (keyboard)
		{
			let forward = keyboard.getInput(87) ? 1.0 : 0.0;
			let backward = keyboard.getInput(83) ? 1.0 : 0.0;

			if (forward == 1 || backward == 1){
				game.camera.Increment(0.005 * (forward - backward));
			}

			if (startRecording == true){
				game.camera.Increment(0.0003);
			}


			incrementSky(utils.clamp(game.camera.pathDistance*1.5 - 0.5, 0.0, 0.75) + EPSILON);
		}
}




var recorder = new CCapture({
	// motionBlurFrames: 5,
	framerate: 60,
	verbose: true,
	quality: 1000,
	format: 'jpg'
});
var postStep = function()
{
	if (keyboard){
		if (keyboard.getInput(80)){
			startRecording = true;
			recorder.start();
		}

		if (keyboard.getInput(76)){
			if (startRecording == true){
				recorder.stop();
				recorder.save();
			}
			startRecording = false;
		}

		if (game.camera.pathDistance >= 1.0-EPSILON){
			if (startRecording == true){
				recorder.stop();
				recorder.save();
			}
			startRecording = false;
		}
	}

	// if (startRecording == 1){
	//
	// }
	recorder.capture( game.canvas );
}











window.addEventListener("DOMContentLoaded", function(){
    game.canvas = document.getElementById("canvas");

		game.engine.setSize(RENDER_WIDTH > 0 ? RENDER_WIDTH : window.innerWidth, RENDER_HEIGHT > 0 ? RENDER_HEIGHT : window.innerHeight);
    game.scene = new BABYLON.Scene(game.engine);
    game.scene.clearColor = new BABYLON.Color3.Black();

    create();
		setupPointerLock();
    // game.scene.detachControl();

    game.scene.registerBeforeRender(function(){
        step();

				game.mouseDX = 0;
				game.mouseDY = 0;
    });

		game.scene.registerAfterRender(function(){
			postStep();
		});

    game.engine.runRenderLoop(function(){
        game.scene.render();
    });
});

// the canvas/window resize event handler
window.addEventListener('resize', function(){
    game.engine.setSize(RENDER_WIDTH > 0 ? RENDER_WIDTH : window.innerWidth, RENDER_HEIGHT > 0 ? RENDER_HEIGHT : window.innerHeight);
});





//mouse lock
// Configure all the pointer lock stuff
function setupPointerLock()
{
    // register the callback when a pointerlock event occurs
    document.addEventListener('pointerlockchange', changeCallback, false);
    document.addEventListener('mozpointerlockchange', changeCallback, false);
    document.addEventListener('webkitpointerlockchange', changeCallback, false);

    // when element is clicked, we're going to request a
    // pointerlock
    canvas.onclick = function(){
        canvas.requestPointerLock =
            canvas.requestPointerLock ||
            canvas.mozRequestPointerLock ||
            canvas.webkitRequestPointerLock
        ;

        // Ask the browser to lock the pointer)
        canvas.requestPointerLock();
    };

}

var mouseMove = function(e)
{
    var movementX = e.movementX ||
            e.mozMovementX ||
            e.webkitMovementX ||
            0;

    var movementY = e.movementY ||
            e.mozMovementY ||
            e.webkitMovementY ||
            0;

		game.mouseDX = movementX;
		game.mouseDY = movementY;
}

// called when the pointer lock has changed. Here we check whether the
// pointerlock was initiated on the element we want.
function changeCallback(e)
{
    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas
    ){
        // we've got a pointerlock for our element, add a mouselistener
        document.addEventListener("mousemove", mouseMove, false);
    } else {
        // pointer lock is no longer active, remove the callback
        document.removeEventListener("mousemove", mouseMove, false);
    }
};







// https://www.babylonjs-playground.com/#TDTBWX#22
// https://playground.babylonjs.com/#7S9AWT#27
// https://playground.babylonjs.com/#Z5UKJ6#10
// https://playground.babylonjs.com/#Z5UKJ6#11
// https://playground.babylonjs.com/#C5HWV6#16
// https://playground.babylonjs.com/#C5HWV6#17
// https://cyos.babylonjs.com/#4D62T4#1

// https://cyos.babylonjs.com/#CUI34I#20
// https://playground.babylonjs.com/#8E8YGR#6

// https://cyos.babylonjs.com/#HN37DG#3
// https://playground.babylonjs.com/#DC4PIF#2

// https://cyos.babylonjs.com/#SFRDCR#7
// https://playground.babylonjs.com/#19SVUA#15
// https://cyos.babylonjs.com/#6U8AEK#1
// https://playground.babylonjs.com/#H7EPAU#33
// https://cyos.babylonjs.com/#LXZX51#2

// https://playground.babylonjs.com/#MCUTFY#26
// https://playground.babylonjs.com/#PGRPGJ#22
// https://www.babylonjs-playground.com/#YDYYT5#6
// https://www.babylonjs-playground.com/#T55JF4#11


// new test
// https://playground.babylonjs.com/#ACS28V#11
// https://playground.babylonjs.com/#76KW28#5

//shader
// https://cyos.babylonjs.com/#LP6PKE#4
// https://www.babylonjs-playground.com/#J8TKE6#17

// tps
// https://www.babylonjs-playground.com/#G703DZ#87

// marching cubes planet
// https://www.babylonjs-playground.com/#2VTXVF
// https://www.babylonjs-playground.com/#BR36YG#3
