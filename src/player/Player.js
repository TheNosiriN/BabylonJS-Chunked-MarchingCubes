// import { game } from "../Game.js";
// import * as utils from "../Utils.js";



var firstPerson = false;

var animationBlend = 0.005;
var mouseSensitivity = 0.005;
var cameraSpeed = 0.0075;
var walkSpeed = 0.001;
var runSpeed = 0.005;
var sprintSpeed = 0.008;
var jumpSpeed = 0.1;
var jumpHeight = 0.5;
var gravity = new BABYLON.Vector3(0, -0.5, 0);

var mouseX = 0, mouseY = 0;
var mouseMin = -35, mouseMax = 45;



//camera setups
var firstPersonCamera = {
    middle: {
        position: new BABYLON.Vector3(0, 1.75, 0.25),
        fov: 1.25,
        mouseMin: -45,
        mouseMax: 45
    }
};

var thirdPersonCamera = {
    middle: {
        position: new BABYLON.Vector3(0, 1.35, -5),
        fov: 0.8,
        mouseMin: -5,
        mouseMax: 45
    },
    leftRun: {
        position: new BABYLON.Vector3(0.7, 1.35, -4),
        fov: 0.8,
        mouseMin: -90,
        mouseMax: 90
    },
    rightRun: {
        position: new BABYLON.Vector3(-0.7, 1.35, -4),
        fov: 0.8,
        mouseMin: -35,
        mouseMax: 45
    },
    far: {
        position: new BABYLON.Vector3(0, 1.5, -6),
        fov: 1.5,
        mouseMin: -5,
        mouseMax: 45
    }
};

function switchCamera(type){
    game.camera.position = type.position.divide(game.camera.parent.scaling);
    game.camera.fov = type.fov;
    mouseMin = type.mouseMin,
    mouseMax = type.mouseMax
}






class Player
{
		constructor(name, position, current)
		{
				this.name = name;
				this.position = position;

				//character nodes
				this.nodes = {
				    main: new BABYLON.Mesh("parent", game.scene),
				    target: new BABYLON.TransformNode(),
				    character: new BABYLON.Mesh("character", game.scene)
				};

				this.anim = {
					skeleton: null,
					idleRange: null,
					walkRange: null,
					runRange: null,
					sprintRange: null,

					idleAnim: null,
					walkAnim: null,
					runAnim: null,
					sprintAnim: null,
				};

				this.current = current;
				this.speed = 0;
		}

		create()
		{
				// this.mesh = new BABYLON.MeshBuilder.CreateBox(this.name, {size: 1}, game.scene);
				// this.mesh.material = new BABYLON.StandardMaterial("light", game.scene);
				// this.mesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.5, 0.8);
				// //game.camera.parent = this.mesh;
				// //game.camera.position = new BABYLON.Vector3.Zero();
				//
				// var light = new BABYLON.PointLight("l", this.mesh.position, game.scene);
		    // light.diffuse = this.mesh.material.emissiveColor;
		    // light.specular = this.mesh.material.emissiveColor;
				// light.parent = this.mesh;
				// light.intensity = 1;
				// light.range = 10;
				//
				//
				// game.shadowMap.renderList.push(this.mesh);
				// this.mesh.receiveShadows = true;


				BABYLON.SceneLoader.ImportMesh("", "assets/dummy bot/", "ybot.babylon", game.scene, function (newMeshes, particleSystems, skeletons) {
		        this.anim.skeleton = skeletons[0];
		        var body = newMeshes[1];
		        var joints = newMeshes[0];

		        body.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
		        body.rotation.y = BABYLON.Tools.ToRadians(180);
		        joints.parent = body;
		        body.parent = this.nodes.character;

						// body.material = new BABYLON.StandardMaterial("body", game.scene);
		        // joints.material = new BABYLON.StandardMaterial("joints", game.scene);
		        // body.material.diffuseColor = new BABYLON.Color3(0.81, 0.24, 0.24);
		        // joints.material.emissiveColor = new BABYLON.Color3(0.19, 0.29, 0.44);
						body.material = new BABYLON.PBRMaterial("chunkMat", game.scene);
						body.material.realTimeFiltering = true;
						body.material.albedoColor = new BABYLON.Color3(0.81, 0.24, 0.24);
						body.material.ambientColor = new BABYLON.Color3(0.19, 0.29, 0.44);
						body.material.metallic = 1;
						body.material.roughness = 0.3;


						game.shadowGenerator.addShadowCaster(this.nodes.character);
						this.nodes.character.receiveShadows = true;


						this.anim.idleRange = this.anim.skeleton.getAnimationRange("None_Idle");
						this.anim.walkRange = this.anim.skeleton.getAnimationRange("None_Walk");
						this.anim.runRange = this.anim.skeleton.getAnimationRange("None_Run");
						this.anim.sprintRange = this.anim.skeleton.getAnimationRange("None_Sprint");
						//this.anim.jumpRange = this.nodes.skeleton.getAnimationRange("None_Jump");

						this.anim.idleAnim = game.scene.beginWeightedAnimation(this.anim.skeleton, this.anim.idleRange.from+1, this.anim.idleRange.to, 1.0, true);
						this.anim.walkAnim = game.scene.beginWeightedAnimation(this.anim.skeleton, this.anim.walkRange.from+1, this.anim.walkRange.to, 0, true);
						this.anim.runAnim = game.scene.beginWeightedAnimation(this.anim.skeleton, this.anim.runRange.from+1, this.anim.runRange.to, 0, true);
						this.anim.sprintAnim = game.scene.beginWeightedAnimation(this.anim.skeleton, this.anim.sprintRange.from+1, this.anim.sprintRange.to, 0, true);


						this.nodes.main.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5);
		        this.nodes.main.ellipsoidOffset = new BABYLON.Vector3(0, this.nodes.main.ellipsoid.y, 0);
		        this.nodes.main.checkCollisions = true;
		        //debug: drawEllipsoid(main);


		        //smallLight.parent = main;
		        this.nodes.character.parent = this.nodes.main;
		        this.nodes.target.parent = this.nodes.main;

		        if (firstPerson == true){
		            game.camera.parent = this.nodes.character;
		            switchCamera(firstPersonCamera.middle);
		        }else{
		            game.camera.parent = this.nodes.target;
		            switchCamera(thirdPersonCamera.leftRun);
		        }


						this.nodes.main.position = this.position.clone();


		        game.engine.hideLoadingUI();
		    }.bind(this), function(evt){});


		}

		update()
		{
				this.updateCamera();

				if (this.current == true && this.nodes.character != null && this.anim.idleAnim != null){
						var keyboard = game.dsm.getDeviceSource(BABYLON.DeviceType.Keyboard);
						var mouse = game.dsm.getDeviceSource(BABYLON.DeviceType.Mouse);
						if (keyboard)
						{
								if (firstPerson == true){
										// this.firstPersonMovement(
										// 		keyboard.getInput(87), //W
										// 		keyboard.getInput(83), //S
										// 		keyboard.getInput(65), //A
										// 		keyboard.getInput(68), //D
										// 		keyboard.getInput(16), //Shift
										// );
								}else{
										this.thirdPersonMovement(
												keyboard.getInput(87), //W
												keyboard.getInput(83), //S
												keyboard.getInput(65), //A
												keyboard.getInput(68), //D
												keyboard.getInput(32), //Space
												keyboard.getInput(16), //Shift
										);
								}
						}
						this.position = this.nodes.main.position;
				}
		}


		updateCamera()
    {
				mouseX += game.mouseDX * mouseSensitivity * game.deltaTime;
				mouseY += game.mouseDY * mouseSensitivity * game.deltaTime;
				mouseY = utils.clamp(mouseY, mouseMin, mouseMax);

				this.nodes.target.rotation = utils.lerp3(
            this.nodes.target.rotation,
            new BABYLON.Vector3(
                BABYLON.Tools.ToRadians(mouseY),
                BABYLON.Tools.ToRadians(mouseX), 0
            ), cameraSpeed*game.deltaTime
        );
    }


		thirdPersonMovement(up, down, left, right, jump, run)
    {
        var directionZ = up-down;
        var directionX = right-left;

        var vectorMove = new BABYLON.Vector3.Zero();
        var direction = Math.atan2(directionX, directionZ);

        var currentState = this.anim.idleAnim;


        //move
        if (directionX != 0 || directionZ != 0)
        {
            if (run != 1)
            {
                currentState = this.anim.runAnim;
                this.speed = utils.lerp(this.speed, runSpeed, this.anim.runAnim.weight);
            }else{
                currentState = this.anim.sprintAnim;
                this.speed = utils.lerp(this.speed, sprintSpeed, this.anim.sprintAnim.weight);
            }

            var rotation = (this.nodes.target.rotation.y+direction) % 360;
            this.nodes.character.rotation.y = utils.lerp(
                this.nodes.character.rotation.y, rotation, 0.25
            );

            vectorMove = new BABYLON.Vector3(
                (Math.sin(rotation)), 0,
                (Math.cos(rotation))
            );
        }else{
            this.speed = utils.lerp(this.speed, 0, 0.001);
        }




				var m = vectorMove.multiply(new BABYLON.Vector3().setAll( this.speed*game.deltaTime ));
        this.nodes.main.moveWithCollisions( m.add(new BABYLON.Vector3(0, gravity.y, 0)) );


        this.switchAnimation(currentState);
    }




		switchAnimation(anim)
    {
        var anims = [this.anim.idleAnim, this.anim.runAnim, this.anim.walkAnim, this.anim.sprintAnim];

        if (this.anim.idleAnim != null){
            for (var i=0; i<anims.length; i++)
            {
                if (anims[i] == anim){
                    anims[i].weight += animationBlend * game.deltaTime;
                }else{
                    anims[i].weight -= animationBlend * game.deltaTime;
                }

                anims[i].weight = utils.clamp(anims[i].weight, 0.0, 1.0);
            }
        }
    }
}
