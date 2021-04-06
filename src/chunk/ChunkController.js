// import { game } from "../Game.js";
// import * as utils from "../Utils.js";
// import { Chunk } from "./Chunk.js";
// import { Vector3 } from "./generation/Vector3.js";
// import { WorkerPool, WorkerTask } from "./WorkerPool.js";
// import { MarchingVariables } from "./generation/MarchingCubes.js";


var chunkFunctions = {};
var chunkObjects = {
		chunks: [],
		chunkMemory: [],
		playerPosition: null,

		buildQueue: []
};
var chunkVariables = {
		chunkSize: new BABYLON.Vector3(16,256,16), //number of cells in a chunk
		chunkSizeMultiplier: 2, //size multiplier of the total chunk
		showChunks: false,
		renderDistance: new BABYLON.Vector3(10, 0, 7),

		maxThreads: 10
};


var xx = 0, yy=0, zz=0;


chunkFunctions.start = function()
{
		// MarchingVariables.seed = '16353fgdeb';
		// MarchingVariables.octaves = 8;
		// MarchingVariables.frequency = 0.00025;
		// MarchingVariables.amplitude = 1000;
		// MarchingVariables.roughness = 2;
		// MarchingVariables.persistence = 0.55;
		// MarchingVariables.warpAmplitude = 10;
		// MarchingVariables.warpFrequency = 0.01;
		// //terraceHeight: 0;
		//
		// MarchingVariables.smoothTerrain = true;
		// MarchingVariables.smoothShaded = false;

		chunkObjects.chunkPool = new WorkerPool('src/chunk/generation/WorkerScript.js', chunkVariables.maxThreads);
		chunkObjects.chunkPool.init();
}



chunkFunctions.update = function()
{
		//queue
		updateBuildQueue();


		//player position
		chunkObjects.playerPosition = game.objects.player.position;

		var playerChunk = new BABYLON.Vector3(
				Math.floor(chunkObjects.playerPosition.x/(chunkVariables.chunkSize.x*chunkVariables.chunkSizeMultiplier) + 0.5),
				Math.floor(chunkObjects.playerPosition.y/(chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier) + 0.5),
				Math.floor(chunkObjects.playerPosition.z/(chunkVariables.chunkSize.z*chunkVariables.chunkSizeMultiplier) + 0.5)
		);


		updateChunkMemory(playerChunk);
}



chunkFunctions.creatNewChunk = function(x, y, z)
{
		var newChunk = new Chunk(
				x * (chunkVariables.chunkSize.x*chunkVariables.chunkSizeMultiplier),
				y * (chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier),// - (chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier)/2,
				z * (chunkVariables.chunkSize.z*chunkVariables.chunkSizeMultiplier), //position
				x+" "+y+" "+z //name
		);

		chunkObjects.chunks[x+" "+y+" "+z] = newChunk;

		return newChunk;
}



chunkFunctions.buildChunk = function(newChunk)
{
		chunkObjects.chunkPool.addTask({

			message: {
				name: newChunk.name,
				x: newChunk.x, y: newChunk.y, z: newChunk.z,
				floor: newChunk.floor,
				cellNumber: new Vector3(newChunk.cellNumber._x, newChunk.cellNumber._y, newChunk.cellNumber._z),
				cellSize: newChunk.cellSize*chunkVariables.chunkSizeMultiplier,
				marchVars: MarchingVariables,
			},

			callback: function(e){
					var chunk = chunkObjects.chunks[e.data.name];
					chunk.meshData = e.data.meshData;
					chunk.densityField = e.data.densityField;

					chunkObjects.buildQueue.push(chunk);
					// chunk.buildMesh();
					// //chunk.spawnGrass();
					// chunk.positionMesh();
					//
					// if (chunk.active == false && chunk.mesh != null){ chunk.mesh.setEnabled(false); }
			}

		});

		newChunk.built = true;
}



function updateChunkMemory(playerChunk)
{
		//renderDistance
		for (var xx = 0; xx <= chunkVariables.renderDistance.x*2; xx++){
				for (var zz = 0; zz <= chunkVariables.renderDistance.z*2; zz++){
						for (var yy = 0; yy <= chunkVariables.renderDistance.y*2; yy++){
								for (var i=-1; i<=1; i+=2)
								{
										var px = playerChunk.x + (xx % 2 == 1 ? Math.floor(xx/2)+1 : -Math.floor(xx/2)),
												py = playerChunk.y + (yy % 2 == 1 ? Math.floor(yy/2)+1 : -Math.floor(yy/2)),
												pz = playerChunk.z + (zz % 2 == 1 ? Math.floor(zz/2)+1 : -Math.floor(zz/2))
										;
										var key = px+" "+py+" "+pz;

										if (chunkObjects.chunks[key] == undefined)
										{
												var newChunk = chunkFunctions.creatNewChunk(px, py, pz);
												chunkObjects.chunkMemory.push(newChunk);
										}else{
												if (chunkObjects.chunks[key].active == false){
														chunkObjects.chunks[key].setActive(true);
														chunkObjects.chunkMemory.push(chunkObjects.chunks[key]);
												}
										}
								}
						}
				}
		}


		//chunkMemory
		for (var i=0; i<chunkObjects.chunkMemory.length; i++)
		{
				let curChunk = chunkObjects.chunkMemory[i];
				var x1 = curChunk.x / (chunkVariables.chunkSize.x*chunkVariables.chunkSizeMultiplier);
				var y1 = curChunk.y / (chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier);
				var z1 = curChunk.z / (chunkVariables.chunkSize.z*chunkVariables.chunkSizeMultiplier);
				var x2 = playerChunk.x - chunkVariables.renderDistance.x;
				var y2 = playerChunk.y - chunkVariables.renderDistance.y;
				var z2 = playerChunk.z - chunkVariables.renderDistance.z;
				var w = chunkVariables.renderDistance.multiply(new BABYLON.Vector3().setAll(2,2,2));


				if(
						x2 + w.x < x1 || x1 + 0 < x2 ||
						y2 + w.y < y1 || y1 + 0 < y2 ||
						z2 + w.z < z1 || z1 + 0 < z2
				){
						curChunk.setActive(false);
						curChunk.clearMeshData();
						chunkObjects.chunkMemory.splice(i, 1);
				}else{
						if (curChunk.built == false){
							chunkFunctions.buildChunk(curChunk);
						}
						curChunk.update();
						//updateChunkShadows(chunkObjects.chunkMemory[i], playerChunk);
				}
		}
}



function updateBuildQueue()
{
		if (chunkObjects.buildQueue.length > 0){
				var chunk = chunkObjects.buildQueue.shift();

				chunk.buildMesh();
				//chunk.spawnGrass();
				chunk.positionMesh();

				if (chunk.active == false && chunk.mesh != null){ chunk.mesh.setEnabled(false); }


				//one time run
				// if (chunkObjects.chunks.length < 1){
				// 		var ray = new BABYLON.Ray(
				// 				game.objects.player.position,
				// 				new BABYLON.Vector3(0, -1, 0),
				// 				256
				// 		);
				//
				// 		var pickInfo = ray.intersectsMesh(chunk.mesh, true);
				// 		if (pickInfo.hit == true){
				// 				if (game.objects.player.nodes.main != null){
				// 						game.objects.player.nodes.main.position = pickInfo.pickedPoint.clone();
				// 						game.objects.player.position = pickInfo.pickedPoint.clone();
				// 				}else{
				// 						game.objects.player.position = pickInfo.pickedPoint.clone();
				// 				}
				// 		}
				// }
		}
}



function updateChunkShadows(chunk, player)
{
		var x1 = chunk.x / (chunkVariables.chunkSize.x*chunkVariables.chunkSizeMultiplier);
		var y1 = chunk.y / (chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier);
		var z1 = chunk.z / (chunkVariables.chunkSize.z*chunkVariables.chunkSizeMultiplier);

		var dist = Math.floor(utils.distanceToPoint3D(x1, y1, z1, player.x, player.y, player.z));

		if (dist == 0){
				if (chunk.shadowLevel != dist){
						chunk.shadowLevel = dist;
						game.shadowMap.renderList.push(chunk.mesh);
						chunk.shadowIndex = game.shadowMap.renderList.length-1;
						console.log(chunk.shadowIndex+" here");
				}
		}else{
				if (chunk.shadowIndex != -1){
						chunk.shadowLevel = -1;
						game.shadowMap.renderList.splice(chunk.shadowIndex, 1);
						//console.log(chunk.shadowIndex+" there "+game.shadowMap.renderList.length);
						chunk.shadowIndex = -1;

				}


		}
		//console.log(dist);
}








// exluded

// UPDATE:
// if (xx < chunkVariables.roomWidth && yy < chunkVariables.roomHeight && zz < chunkVariables.roomDepth)
// {
// 		chunkObjects.chunks[xx+" "+yy+" "+zz] = new Chunk(
// 				(xx*chunkVariables.chunkSize.x) - (chunkVariables.roomWidth/2)*chunkVariables.chunkSize.x,
// 				(yy*chunkVariables.chunkSize.y) - (chunkVariables.roomHeight)*chunkVariables.chunkSize.y,
// 				(zz*chunkVariables.chunkSize.z) - (chunkVariables.roomDepth/2)*chunkVariables.chunkSize.z,
// 				xx+" "+yy+" "+zz
// 		);
// 		chunkObjects.chunks[xx+" "+yy+" "+zz].create();
//
// 		zz++
// 		if (zz == chunkVariables.roomDepth)
// 		{
// 				zz = 0;
// 				yy++;
// 				if (yy == chunkVariables.roomHeight)
// 				{
// 						yy=0;
// 						xx++;
// 				}
// 		}
// }
