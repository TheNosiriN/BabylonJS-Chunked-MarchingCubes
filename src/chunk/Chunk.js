// import { game } from "../Game.js";
// import { Textures } from "../Assets.js";
// import { chunkVariables } from "./ChunkController.js";
// import { Grass } from "./generation/Vegetation.js";
//import { MarchingFunctions, MarchingVariables } from "./generation/MarchingCubes.js";


class Chunk
{
    constructor(x, y, z, name){
        this.name = name;
        this.x = x;
        this.y = y;
        this.z = z;

        this.resolution = 1;
				this.cellNumber = chunkVariables.chunkSize.multiply(new BABYLON.Vector3().setAll(this.resolution));
        this.cellSize = 1/this.resolution;
        this.floor = this.y - (chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier)/2;

				this.active = true;
				this.built = false;
				this.shadowLevel = -1;
				this.shadowIndex = -1;

        this.densityField = [];
        this.meshData = null;
        this.mesh = new BABYLON.Mesh(this.name, game.scene);
				this.debug = null;


				this.grass = null;
    }


    //initializes block data
    create()
    {

    }


		update()
		{
				if (this.mesh != null)
				{
						if (this.grass != null){ this.grass.updateGrass(); }
				}
		}


    buildMesh()
    {
        if (this.meshData.vertices.length > 0)
        {
						if (this.mesh != null){ this.mesh.dispose(); }
						this.mesh = new BABYLON.Mesh(this.name, game.scene);


						var vertexData = new BABYLON.VertexData();
            vertexData.positions = this.meshData.vertices;
            vertexData.indices = this.meshData.indices;
            vertexData.normals = this.meshData.normals;
						// vertexData.uvs = this.meshData.uvs;
            vertexData.applyToMesh(this.mesh, true);

						// this.mesh.material = new BABYLON.PBRMaterial("chunkMat", game.scene);
						// this.mesh.material.realTimeFiltering = true;
						// this.mesh.material.albedoTexture = Textures.grass_rock.diffuse;
						// this.mesh.material.bumpTexture = Textures.grass_rock.normal;
						// this.mesh.material.metallicTexture = Textures.grass_rock.roughness;
						// this.mesh.material.ambientTexture = Textures.grass_rock.AO;
						//
						// this.mesh.material.metallic = 0.5;
						// this.mesh.material.roughness = 1;
        }
    }


		//this just sets the mesh position to its right place
		positionMesh()
		{
				if (this.mesh != null){
						this.mesh.position = new BABYLON.Vector3(
								this.x - (chunkVariables.chunkSize.x*chunkVariables.chunkSizeMultiplier)/2,
								this.y - (chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier)/2,
								this.z - (chunkVariables.chunkSize.z*chunkVariables.chunkSizeMultiplier)/2
						);

						if (this.grass != null){
								this.grass.grassMesh.position = this.mesh.position.clone();
						}


						game.shadowGenerator.addShadowCaster(this.mesh);
						this.mesh.receiveShadows = true;

						this.mesh.checkCollisions = true;


						if (chunkVariables.showChunks == true){
								this.debug = BABYLON.MeshBuilder.CreateBox("box", {
										width: chunkVariables.chunkSize.x*chunkVariables.chunkSizeMultiplier,
										height: chunkVariables.chunkSize.y*chunkVariables.chunkSizeMultiplier,
										depth: chunkVariables.chunkSize.z*chunkVariables.chunkSizeMultiplier
								}, game.scene);

								this.debug.enableEdgesRendering();
								this.debug.material = new BABYLON.StandardMaterial("empty", game.scene);
								this.debug.material.alpha = 0;
								this.debug.edgesWidth = 25;
								this.debug.edgesColor = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0);
								this.debug.position = this.mesh.position.add(new BABYLON.Vector3(
										(chunkVariables.chunkSize.x/2) * chunkVariables.chunkSizeMultiplier,
										(chunkVariables.chunkSize.y/2) * chunkVariables.chunkSizeMultiplier,
										(chunkVariables.chunkSize.z/2) * chunkVariables.chunkSizeMultiplier,
								));
						}
				}
		}


		// spawnGrass()
		// {
		// 		if (this.mesh != null){
		// 				this.grass =  new Grass({
		// 		        bladeWidth: 0.1,
		// 		        bladeHeight: 1,
		// 		        bladeYsegs: 1,
		// 		        density: 0.75,
		// 		        grassSpace: this.cellSize,
		// 		        zoneSize: new BABYLON.Vector2(this.cellNumber.x, this.cellNumber.z),
		// 						mesh: this.mesh
		// 		    });
		// 				this.grass.populate();
		// 		}
		// }


		setActive(bool)
		{
				if (this.mesh != null){ this.mesh.setEnabled(bool); }
				if (this.debug != null){ this.debug.setEnabled(bool); }
				if (this.grass != null){ this.grass.grassMesh.setEnabled(bool); }
				this.active = bool;
		}


    //destroys the chunk
    clearMeshData()
    {
        delete this.meshData;
        this.meshData = new MeshData();
        if (this.mesh != null){ this.mesh.dispose(); }
        this.mesh = null;
				this.built = false;
    }
}
