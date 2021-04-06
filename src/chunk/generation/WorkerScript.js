//importScripts('/libraries/babylon.max.js');


onmessage = function(e){
      MarchingVariables = e.data.marchVars;
			MarchingVariables.noise = new SimplexNoise(MarchingVariables.seed);


      var densityField = MarchingFunctions.computeDensityField(
          e.data.x, e.data.y, e.data.z,
          e.data.floor,
          e.data.cellNumber,
          e.data.cellSize
      );

			var meshData = MarchingFunctions.computeMeshData(e.data.cellSize, e.data.cellNumber, densityField);


      postMessage({
					meshData: {
						vertices: meshData.vertices,
						indices: meshData.indices,
						normals: meshData.normals
					},
					//densityField: densityField,
					name: e.data.name
			});
}








//MarchingCubes
var MarchingFunctions = {};
var MarchingVariables;


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
				var warp = Math.abs(MarchingVariables.noise.noise3D(z*MarchingVariables.warpFrequency, y*MarchingVariables.warpFrequency, x*MarchingVariables.warpFrequency));
        x += warp * MarchingVariables.warpAmplitude;
        y += warp * MarchingVariables.warpAmplitude;
        z += warp * MarchingVariables.warpAmplitude;

        //setting density
        var val = 2 * (0.5 - Math.abs(0.5 - MarchingVariables.noise.noise3D(x*f, y*f, z*f))) * a;
        density += (-yVal + val) - floor;
        f *= MarchingVariables.roughness;
        a *= MarchingVariables.persistence;
    }

    return density;// / (MarchingVariables.persistence*MarchingVariables.octaves);
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
                // meshData.triangles.push(meshData.vertices.length - 1);
								// meshData.uvs.push(vertPos.x / cn.x, vertPos.z / cn.z);
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
                    // meshData.triangles.push(meshData.vertices.length - 1);
										// meshData.uvs.push(vertPos.x / cn.x, vertPos.z / cn.z);
                }else{
                    var index = meshData.vertexChecker[key];
                    meshData.indices.push((index/3)-1);
                    // meshData.triangles.push(index - 1);
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











class Vector3
{
		constructor(x, y, z)
		{
				this.x = x;
				this.y = y;
				this.z = z;
		}

		setAll(x)
		{
				this.x = x;
				this.y = x;
				this.z = x;
				return this;
		}

		add(p2)
		{
				this.x += p2.x;
				this.y += p2.y;
				this.z += p2.z;
				return this;
		}

		add3(x, y, z)
		{
				this.x += x;
				this.y += y;
				this.z += z;
				return this;
		}

		subtract(p2)
		{
				this.x -= p2.x;
				this.y -= p2.y;
				this.z -= p2.z;
				return this;
		}

		subtract3(x, y, z)
		{
				this.x -= x;
				this.y -= y;
				this.z -= z;
				return this;
		}

		multiply(p2)
		{
				this.x *= p2.x;
				this.y *= p2.y;
				this.z *= p2.z;
				return this;
		}

		multiply3(x, y, z)
		{
				this.x *= x;
				this.y *= y;
				this.z *= z;
				return this;
		}

		divide(p2)
		{
				this.x /= p2.x;
				this.y /= p2.y;
				this.z /= p2.z;
				return this;
		}

		divide3(x, y, z)
		{
				this.x /= x;
				this.y /= y;
				this.z /= z;
				return this;
		}

		toString()
		{
				return this.x+", "+this.y+", "+this.z;
		}


		static Add(p1, p2)
		{
				return new Vector3(p1.x+p2.x, p1.y+p2.y, p1.z+p2.z);
		}
		static Add33(x1, y1, z1, x2, y2, z2)
		{
				return new Vector3(x1+x2, y1+y2, z1+z2);
		}

		static Subtract(p1, p2)
		{
				return new Vector3(p1.x-p2.x, p1.y-p2.y, p1.z-p2.z);
		}
		static Subtract33(x1, y1, z1, x2, y2, z2)
		{
				return new Vector3(x1-x2, y1-y2, z1-z2);
		}

		static Multiply(p1, p2)
		{
				return new Vector3(p1.x*p2.x, p1.y*p2.y, p1.z*p2.z)
		}
		static Multiply33(x1, y1, z1, x2, y2, z2)
		{
				return new Vector3(x1*x2, y1*y2, z1*z2);
		}

		static Divide(p1, p2)
		{
				return new Vector3(p1.x/p2.x, p1.y/p2.y, p1.z/p2.z)
		}
		static Divide33(x1, y1, z1, x2, y2, z2)
		{
				return new Vector3(x1/x2, y1/y2, z1/z2);
		}

		static Fract(p)
		{
				return new Vector3(p.x - Math.floor(p.x), p.y - Math.floor(p.y), p.z - Math.floor(p.z));
		}
		static Fract1(p)
		{
				return p - Math.floor(p);
		}

		static Dot(p1, p2)
		{
				return ((p1.x*p2.x) + (p1.y*p2.y) + (p1.z*p2.z));
		}

		static Mix(p1, p2, t)
		{
				var x = Vector3.Lerp(p1.x, p2.x, t);
				var y = Vector3.Lerp(p1.y, p2.y, t);
				var z = Vector3.Lerp(p1.z, p2.z, t);

				return new Vec3(x, y, z);
		}

		static Lerp(x, y, a)
		{
		    return x * (1 - a) + y * a;
		}

		static Magnitude(p)
		{
				return Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
		}

		static Normalize(p)
		{
				var mag = Vector3.Magnitude(p);
				return new Vector3(p.x/mag, p.y/mag, p.z/mag);
		}
}











//Tables
var Tables =
{
		//corners of a cube
		cornerTable: [
		    new Vector3(0, 0, 0),
		    new Vector3(1, 0, 0),
		    new Vector3(1, 1, 0),
		    new Vector3(0, 1, 0),
		    new Vector3(0, 0, 1),
		    new Vector3(1, 0, 1),
		    new Vector3(1, 1, 1),
		    new Vector3(0, 1, 1)
		],

		//edges of a cube
		edgeIndexes: [
		    [0, 1], [1, 2], [3, 2], [0, 3], [4, 5], [5, 6], [7, 6], [4, 7], [0, 4], [1, 5], [2, 6], [3, 7]
		],

		//a long table of all 256 possible configurations of triangles in a cube
		triangleTable: [
		    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
		    [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
		    [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
		    [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
		    [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
		    [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
		    [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
		    [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
		    [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
		    [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
		    [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
		    [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
		    [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
		    [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
		    [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
		    [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
		    [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
		    [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
		    [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
		    [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
		    [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
		    [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
		    [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
		    [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
		    [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
		    [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
		    [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
		    [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
		    [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
		    [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
		    [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
		    [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
		    [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
		    [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
		    [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
		    [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
		    [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
		    [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
		    [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
		    [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
		    [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
		    [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
		    [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
		    [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
		    [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
		    [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
		    [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
		    [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1],
		    [1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
		    [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
		    [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
		    [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
		    [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
		    [3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
		    [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1],
		    [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1],
		    [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
		    [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1],
		    [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
		    [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
		    [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1],
		    [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
		    [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
		    [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
		    [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
		    [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
		    [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
		    [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
		    [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
		    [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
		    [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
		    [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
		    [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
		    [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
		    [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
		    [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
		    [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
		    [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
		    [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
		    [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1],
		    [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
		    [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
		    [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
		    [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
		    [0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1],
		    [7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
		    [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
		    [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
		    [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
		    [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
		    [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
		    [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
		    [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
		    [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1],
		    [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
		    [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
		    [6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1],
		    [8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1],
		    [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1],
		    [6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1],
		    [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1],
		    [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
		    [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1],
		    [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1],
		    [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1],
		    [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1],
		    [10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1],
		    [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
		    [10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
		    [5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
		    [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1],
		    [9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
		    [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1],
		    [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1],
		    [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
		    [7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1],
		    [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1],
		    [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1],
		    [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
		    [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1],
		    [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
		    [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
		    [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1],
		    [6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1],
		    [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1],
		    [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1],
		    [6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1],
		    [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
		    [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
		    [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1],
		    [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1],
		    [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1],
		    [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
		    [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
		    [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1],
		    [0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1],
		    [5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1],
		    [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1],
		    [11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1],
		    [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1],
		    [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
		    [2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1],
		    [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1],
		    [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1],
		    [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
		    [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1],
		    [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1],
		    [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1],
		    [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1],
		    [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1],
		    [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
		    [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1],
		    [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
		    [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
		    [9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1],
		    [5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1],
		    [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
		    [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1],
		    [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1],
		    [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1],
		    [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1],
		    [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1],
		    [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
		    [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1],
		    [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
		    [11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1],
		    [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1],
		    [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1],
		    [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
		    [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
		    [1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1],
		    [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1],
		    [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1],
		    [0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1],
		    [3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1],
		    [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1],
		    [0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1],
		    [9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1],
		    [1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
		    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
		]
};











/*
* A fast javascript implementation of simplex noise by Jonas Wagner
Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
Better rank ordering method by Stefan Gustavson in 2012.
Copyright (c) 2018 Jonas Wagner
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
var F3 = 1.0 / 3.0;
var G3 = 1.0 / 6.0;
var F4 = (Math.sqrt(5.0) - 1.0) / 4.0;
var G4 = (5.0 - Math.sqrt(5.0)) / 20.0;

class SimplexNoise
{
    constructor(randomOrSeed)
    {
        var random;
        if (typeof randomOrSeed == 'function') {
        random = randomOrSeed;
        }
        else if (randomOrSeed) {
        random = alea(randomOrSeed);
        } else {
        random = Math.random;
        }

        this.p = buildPermutationTable(random);
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (var i = 0; i < 512; i++) {
        this.perm[i] = this.p[i & 255];
        this.permMod12[i] = this.perm[i] % 12;
        }

        this.grad3 =  new Float32Array([1, 1, 0,
        -1, 1, 0,
        1, -1, 0,

        -1, -1, 0,
        1, 0, 1,
        -1, 0, 1,

        1, 0, -1,
        -1, 0, -1,
        0, 1, 1,

        0, -1, 1,
        0, 1, -1,
        0, -1, -1]);


        this.grad4 =  new Float32Array([0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1,
        0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
        1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1,
        -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
        1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1,
        -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
        1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0,
        -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0])
    }

    noise2D(xin, yin)
    {
        var permMod12 = this.permMod12;
        var perm = this.perm;
        var grad3 = this.grad3;
        var n0 = 0; // Noise contributions from the three corners
        var n1 = 0;
        var n2 = 0;
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var X0 = i - t; // Unskew the cell origin back to (x,y) space
        var Y0 = j - t;
        var x0 = xin - X0; // The x,y distances from the cell origin
        var y0 = yin - Y0;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else {
            i1 = 0;
            j1 = 1;
        } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1.0 + 2.0 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        var ii = i & 255;
        var jj = j & 255;
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            var gi0 = permMod12[ii + perm[jj]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    }


    // 3D simplex noise
    noise3D(xin, yin, zin)
    {
        var permMod12 = this.permMod12;
        var perm = this.perm;
        var grad3 = this.grad3;
        var n0, n1, n2, n3; // Noise contributions from the four corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
        var Y0 = j - t;
        var Z0 = k - t;
        var x0 = xin - X0; // The x,y,z distances from the cell origin
        var y0 = yin - Y0;
        var z0 = zin - Z0;
        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
            if (y0 >= z0) {
            i1 = 1;
            j1 = 0;
            k1 = 0;
            i2 = 1;
            j2 = 1;
            k2 = 0;
            } // X Y Z order
            else if (x0 >= z0) {
            i1 = 1;
            j1 = 0;
            k1 = 0;
            i2 = 1;
            j2 = 0;
            k2 = 1;
            } // X Z Y order
            else {
            i1 = 0;
            j1 = 0;
            k1 = 1;
            i2 = 1;
            j2 = 0;
            k2 = 1;
            } // Z X Y order
        }
        else { // x0<y0
            if (y0 < z0) {
            i1 = 0;
            j1 = 0;
            k1 = 1;
            i2 = 0;
            j2 = 1;
            k2 = 1;
            } // Z Y X order
            else if (x0 < z0) {
            i1 = 0;
            j1 = 1;
            k1 = 0;
            i2 = 0;
            j2 = 1;
            k2 = 1;
            } // Y Z X order
            else {
            i1 = 0;
            j1 = 1;
            k1 = 0;
            i2 = 1;
            j2 = 1;
            k2 = 0;
            } // Y X Z order
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;
        var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
        var y2 = y0 - j2 + 2.0 * G3;
        var z2 = z0 - k2 + 2.0 * G3;
        var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
        var y3 = y0 - 1.0 + 3.0 * G3;
        var z3 = z0 - 1.0 + 3.0 * G3;
        // Work out the hashed gradient indices of the four simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        // Calculate the contribution from the four corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
            t3 *= t3;
            n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to stay just inside [-1,1]
        return 32.0 * (n0 + n1 + n2 + n3);
    }


    // 4D simplex noise, better simplex rank ordering method 2012-03-09
    noise4D(x, y, z, w)
    {
        var perm = this.perm;
        var grad4 = this.grad4;

        var n0, n1, n2, n3, n4; // Noise contributions from the five corners
        // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
        var s = (x + y + z + w) * F4; // Factor for 4D skewing
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var k = Math.floor(z + s);
        var l = Math.floor(w + s);
        var t = (i + j + k + l) * G4; // Factor for 4D unskewing
        var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
        var Y0 = j - t;
        var Z0 = k - t;
        var W0 = l - t;
        var x0 = x - X0; // The x,y,z,w distances from the cell origin
        var y0 = y - Y0;
        var z0 = z - Z0;
        var w0 = w - W0;
        // For the 4D case, the simplex is a 4D shape I won't even try to describe.
        // To find out which of the 24 possible simplices we're in, we need to
        // determine the magnitude ordering of x0, y0, z0 and w0.
        // Six pair-wise comparisons are performed between each possible pair
        // of the four coordinates, and the results are used to rank the numbers.
        var rankx = 0;
        var ranky = 0;
        var rankz = 0;
        var rankw = 0;
        if (x0 > y0) rankx++;
        else ranky++;
        if (x0 > z0) rankx++;
        else rankz++;
        if (x0 > w0) rankx++;
        else rankw++;
        if (y0 > z0) ranky++;
        else rankz++;
        if (y0 > w0) ranky++;
        else rankw++;
        if (z0 > w0) rankz++;
        else rankw++;
        var i1, j1, k1, l1; // The integer offsets for the second simplex corner
        var i2, j2, k2, l2; // The integer offsets for the third simplex corner
        var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
        // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
        // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
        // impossible. Only the 24 indices which have non-zero entries make any sense.
        // We use a thresholding to set the coordinates in turn from the largest magnitude.
        // Rank 3 denotes the largest coordinate.
        i1 = rankx >= 3 ? 1 : 0;
        j1 = ranky >= 3 ? 1 : 0;
        k1 = rankz >= 3 ? 1 : 0;
        l1 = rankw >= 3 ? 1 : 0;
        // Rank 2 denotes the second largest coordinate.
        i2 = rankx >= 2 ? 1 : 0;
        j2 = ranky >= 2 ? 1 : 0;
        k2 = rankz >= 2 ? 1 : 0;
        l2 = rankw >= 2 ? 1 : 0;
        // Rank 1 denotes the second smallest coordinate.
        i3 = rankx >= 1 ? 1 : 0;
        j3 = ranky >= 1 ? 1 : 0;
        k3 = rankz >= 1 ? 1 : 0;
        l3 = rankw >= 1 ? 1 : 0;
        // The fifth corner has all coordinate offsets = 1, so no need to compute that.
        var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
        var y1 = y0 - j1 + G4;
        var z1 = z0 - k1 + G4;
        var w1 = w0 - l1 + G4;
        var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
        var y2 = y0 - j2 + 2.0 * G4;
        var z2 = z0 - k2 + 2.0 * G4;
        var w2 = w0 - l2 + 2.0 * G4;
        var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
        var y3 = y0 - j3 + 3.0 * G4;
        var z3 = z0 - k3 + 3.0 * G4;
        var w3 = w0 - l3 + 3.0 * G4;
        var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
        var y4 = y0 - 1.0 + 4.0 * G4;
        var z4 = z0 - 1.0 + 4.0 * G4;
        var w4 = w0 - 1.0 + 4.0 * G4;
        // Work out the hashed gradient indices of the five simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        var ll = l & 255;
        // Calculate the contribution from the five corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
            t0 *= t0;
            n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
            t1 *= t1;
            n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
            t2 *= t2;
            n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
            t3 *= t3;
            n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
        }
        var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
        if (t4 < 0) n4 = 0.0;
        else {
            var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
            t4 *= t4;
            n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
        }
        // Sum up and scale the result to cover the range [-1,1]
        return 27.0 * (n0 + n1 + n2 + n3 + n4);
    }
}


function buildPermutationTable(random) {
    var i;
    var p = new Uint8Array(256);
    for (i = 0; i < 256; i++) {
    p[i] = i;
    }
    for (i = 0; i < 255; i++) {
    var r = i + ~~(random() * (256 - i));
    var aux = p[i];
    p[i] = p[r];
    p[r] = aux;
    }
    return p;
}



/*
The ALEA PRNG and masher code used by simplex-noise.js
is based on code by Johannes Baagøe, modified by Jonas Wagner.
See alea.md for the full license.
*/
function alea() {
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;

    var mash = masher();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');

    for (var i = 0; i < arguments.length; i++) {
    s0 -= mash(arguments[i]);
    if (s0 < 0) {
        s0 += 1;
    }
    s1 -= mash(arguments[i]);
    if (s1 < 0) {
        s1 += 1;
    }
    s2 -= mash(arguments[i]);
    if (s2 < 0) {
        s2 += 1;
    }
    }
    mash = null;
    return function() {
    var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
    s0 = s1;
    s1 = s2;
    return s2 = t - (c = t | 0);
    };
}

function masher() {
    var n = 0xefc8249d;
    return function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };
}
