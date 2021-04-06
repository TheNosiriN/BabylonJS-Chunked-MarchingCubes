// import { SimplexNoise } from "./PerlinNoise.js";
// import { Tables } from "./Tables.js";
// import { Vector3 } from "./Vector3.js";


var MarchingFunctions = {};
var MarchingVariables = {
		seed: '16353fgdeb',
		octaves: 8,
		amplitude: 1000,
		frequency: 0.005,
		roughness: 1.5,
		persistence: 0.5,
		warpAmplitude: 10,
		warpFrequency: 0.01,
		//terraceHeight: 0;

		smoothTerrain: true,
		smoothShaded: false,
};

MarchingVariables.noise = new SimplexNoise(MarchingVariables.seed);



class MeshData
{
    constructor()
    {
        this.triangles = [];
        this.vertices = [];
        this.indices = [];
        this.normals = [];
				this.uvs = [];
        this.vertexChecker = [];
    }
}



/*the density function for generating volumetric data for a cell using 3D perlin noise
you could research on this starting from here: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu
note that the density function doesnt have to be noise its the iso surface extraction function
a little bit more math can be used to make interesting things*/
MarchingFunctions.getDensity = function(x, y, z, yVal, floor)
{
    var density = 0;

    var f = MarchingVariables.frequency;
    var a = MarchingVariables.amplitude; //terracing: density += (-yVal + val + yVal % terraceHeight) - floor;

    for (var i=0; i<MarchingVariables.octaves; i++)
    {
        //warping world coords
        // var warp = MarchingVariables.noise.noise3D(x*MarchingVariables.warpFrequency, y*MarchingVariables.warpFrequency, z*MarchingVariables.warpFrequency);
        // x += warp * MarchingVariables.warpAmplitude;
        // y += warp * MarchingVariables.warpAmplitude;
        // z += warp * MarchingVariables.warpAmplitude;

        //setting density
        var val = MarchingVariables.noise.noise3D(x*f, z*f, 0) * a;
        density += (-yVal + val) - floor;
        f *= MarchingVariables.roughness;
        a *= MarchingVariables.persistence;
    }

    return density / (MarchingVariables.persistence*MarchingVariables.octaves);
}



MarchingFunctions.computeDensityField = function(tx, ty, tz, floor, cellNumber, cellSize)
{
    var field = [];

    for (var z = cellNumber.z+1; z--;){
        for (var y = cellNumber.y+1; y--;){
            for (var x = cellNumber.x+1; x--;)
            {
                field[z * (cellNumber.y+1) * (cellNumber.x+1) + y * (cellNumber.x+1) + x] = MarchingFunctions.getDensity(
                    tx+(x*cellSize),
                    ty+(y*cellSize),
                    tz+(z*cellSize),
                    y*cellSize, floor
                );
            }
        }
    }

    return field;
}



MarchingFunctions.computeMeshData = function(cellSize, cellNumber, densityField)
{
    var data = new MeshData();

    for (var z = cellNumber.z; z--;){
        for (var y = cellNumber.y; y--;){
            for (var x = cellNumber.x; x--;)
            {
                MarchingFunctions.marchCube(
                    x, y, z, cellSize, cellNumber, densityField, data
                );
            }
        }
    }

    return data;
}



MarchingFunctions.marchCube = function(x, y, z, size, cn, densityField, meshData)
{
    var cube = [];
    var config = 0;


		//get from densityField
		var getFromField = function(x, y, z){
				return densityField[z * (cn.y+1) * (cn.x+1) + y * (cn.x+1) + x];
		}


    //flat normals
    var computeFlatNormals = function(v1, v2, v3)
    {
        var u = v2.subtract(v1);
        var v = v3.subtract(v1);

        for (var i=0; i<3; i++){
            var n = new Vector3(
                (u.y*v.z) - (u.z*v.y),
                (u.z*v.x) - (u.x*v.z),
                (u.x*v.y) - (u.y*v.x)
            );

            meshData.normals.push(n.x);
            meshData.normals.push(n.y);
            meshData.normals.push(n.z);
        }
    }

    //smooth normals
    // works with smooth meshes not rough
    // Please use BABYLON's normals computation if you want smooth normals on rough meshes
    var computeSmoothNormals = function(x, y, z)
    {
        var v = getFromField(x, y, z);
        var dx = v - getFromField(x+1, y, z);
        var dy = v - getFromField(x, y+1, z);
        var dz = v - getFromField(x, y, z+1);

        var n = Vector3.Normalize(new Vector3(dx, dy, dz));
        meshData.normals.push(n.x);
        meshData.normals.push(n.y);
        meshData.normals.push(n.z);
    }



    //gets configuration for the 8 corners of a cube
    for (var i=0; i<8; i++)
    {
        var corner = new Vector3(x, y, z).add(Tables.cornerTable[i]);
        cube[i] = getFromField(corner.x, corner.y, corner.z);

        //the actual magic behind the entire algorithm
        // a left shift for corner configuration
        // the density function defines how mush of a mesh is inside a cell
        // if the value is greater than zero then there is mesh data contained in that cell
        // so it transforms corners to binary data to get the mesh configuration
        // which is basically just filling up remaining zeros
        if (cube[i] >= 0){
            config |= 1 << i;
        }
    }


    //if the config is outside the 0 or 255 which are both -1 it should return
    if (config == 0 || config == 255){
        return;
    }


    var edgeIndex = 0;
    for (var i=0; i<5; i++){
        for (var p=0; p<3; p++)
        {
            var ind = Tables.triangleTable[config][edgeIndex];

            //if it hits the end of a triangle data array in the table then its done with the triangle
            if (ind == -1){  return; }

            //this gets the current corner its configuring
            var vert1 = new Vector3(x, y, z).add(Tables.cornerTable[Tables.edgeIndexes[ind][0]]).multiply(new Vector3().setAll(size));
            var vert2 = new Vector3(x, y, z).add(Tables.cornerTable[Tables.edgeIndexes[ind][1]]).multiply(new Vector3().setAll(size));
            var vertPos;


            if (MarchingVariables.smoothTerrain == true){
                //smoother terrain
                var vert1S = cube[Tables.edgeIndexes[ind][0]];
                var vert2S = cube[Tables.edgeIndexes[ind][1]];

                var diff = vert2S - vert1S;
                diff = Math.max(0, -vert1S / diff);

                vertPos = vert1.add(vert2.subtract(vert1).multiply(new Vector3().setAll(diff)));
            }else{
                //rough (blocky) terrain
                vertPos = vert1.add(vert2).divide3(2,2,2);
            }



            if (MarchingVariables.smoothShaded == false){
                //flat shaded
                meshData.vertices.push(vertPos.x);
                meshData.vertices.push(vertPos.y);
                meshData.vertices.push(vertPos.z);
                meshData.indices.push((meshData.vertices.length/3)-1);
                meshData.triangles.push(meshData.vertices.length - 1);
								meshData.uvs.push(vertPos.x / cn.x, vertPos.z / cn.z);
            }else{
                //smooth shaded
                var key = vertPos.x+""+vertPos.y+""+vertPos.z;
                if (meshData.vertexChecker[key] == undefined)
                {
                    meshData.vertexChecker[key] = meshData.vertices.length+3;

                    meshData.vertices.push(vertPos.x);
                    meshData.vertices.push(vertPos.y);
                    meshData.vertices.push(vertPos.z);
                    computeSmoothNormals(x, y, z);

                    meshData.indices.push((meshData.vertices.length/3)-1);
                    meshData.triangles.push(meshData.vertices.length - 1);
										meshData.uvs.push(vertPos.x / cn.x, vertPos.z / cn.z);
                }else{
                    var index = meshData.vertexChecker[key];
                    meshData.indices.push((index/3)-1);
                    meshData.triangles.push(index - 1);
                }
            }

            edgeIndex++;
        }


        //flat normals
        if (MarchingVariables.smoothShaded == false){
            var l = meshData.vertices.length;

            var v1 = new Vector3(
                meshData.vertices[l-3],
                meshData.vertices[l-2],
                meshData.vertices[l-1]
            );
            var v2 = new Vector3(
                meshData.vertices[l-6],
                meshData.vertices[l-5],
                meshData.vertices[l-4]
            );
            var v3 = new Vector3(
                meshData.vertices[l-9],
                meshData.vertices[l-8],
                meshData.vertices[l-7]
            );

            computeFlatNormals(v1, v2, v3);
        }
    }
}
