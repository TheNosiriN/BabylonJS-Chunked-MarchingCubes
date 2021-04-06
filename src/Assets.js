var Textures = {
		grass_rock: {},
		rock_1: {},
		grass_blade: {}
};


Textures.loadTextures = function()
{
		Textures.grass_rock.diffuse = new BABYLON.Texture("assets/Textures/aerial_grass_rock_1k_png/aerial_grass_rock_diff_1k.png");
		Textures.grass_rock.normal = new BABYLON.Texture("assets/Textures/aerial_grass_rock_1k_png/aerial_grass_rock_nor_1k.png");
		Textures.grass_rock.displacement = new BABYLON.Texture("assets/Textures/aerial_grass_rock_1k_png/aerial_grass_rock_disp_1k.png");
		Textures.grass_rock.AO = new BABYLON.Texture("assets/Textures/aerial_grass_rock_1k_png/aerial_grass_rock_ao_1k.png");
		Textures.grass_rock.roughness = new BABYLON.Texture("assets/Textures/aerial_grass_rock_1k_png/aerial_grass_rock_rough_1k.png");
		Textures.grass_rock.roughAO = new BABYLON.Texture("assets/Textures/aerial_grass_rock_1k_png/aerial_grass_rock_rough_ao_1k.png");

		Textures.rock_1.diffuse = new BABYLON.Texture("assets/Textures/rock_ground_1k_png/rock_ground_diff_1k.png");
		Textures.rock_1.normal = new BABYLON.Texture("assets/Textures/rock_ground_1k_png/rock_ground_nor_1k.png");
		Textures.rock_1.displacement = new BABYLON.Texture("assets/Textures/rock_ground_1k_png/rock_ground_disp_1k.png");
		Textures.rock_1.AO = new BABYLON.Texture("assets/Textures/rock_ground_1k_png/rock_ground_ao_1k.png");
		Textures.rock_1.roughness = new BABYLON.Texture("assets/Textures/rock_ground_1k_png/rock_ground_rough_1k.png");
		Textures.rock_1.roughAO = new BABYLON.Texture("assets/Textures/rock_ground_1k_png/rock_ground_rough_ao_1k.png");


		Textures.grass_blade.diffuse = new BABYLON.Texture("assets/Textures/grass_blade.png", this.scene);

		console.log("All textures loaded successfully");
}
