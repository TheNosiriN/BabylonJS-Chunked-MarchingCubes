// import { game } from "/src/Game.js";
// import { Textures } from "/src/Assets.js";
// import { shaders } from "/src/lighting/ShaderStore.js";
// import * as utils from "/src/Utils.js";


class Grass
{
    constructor(p)
    {
        this.time = 0;
        this.width = p.bladeWidth || 0.1;
        this.height = p.bladeHeight || 1.5;
        this.bladeXsegs = p.bladeXsegs || 1;
        this.bladeYsegs = p.bladeYsegs || 4;
        this.bladeSpace = p.bladeSpace || new BABYLON.Vector2.One();
        this.grassSpace = p.grassSpace || 1;
        this.zoneSize = p.zoneSize || new BABYLON.Vector2(10, 10);
        this.density = p.density || 0.5;
				this.parentMesh = p.mesh || null;

        this.grassMesh = null;
        this.grassMat = shaders.grassShader.clone();

        this.grassMat.setTexture('dTexture', Textures.grass_blade.diffuse);
        this.grassMat.setFloat('bladeHeight', this.bladeHeight);



        this.createGrassMesh( this.createBladeMesh() );
    }


    createBladeMesh()
    {
        var width_half = this.width / 2;
        var height_half = this.height / 2;
        var gridX = Math.floor( this.bladeXsegs ) || 1;
        var gridY = Math.floor( this.bladeYsegs ) || 1;
        var segment_width = this.width / gridX;
        var segment_height = this.height / gridY;
        var ix, iy;

        // buffers
        var vDat = new BABYLON.VertexData();
        var indices = vDat.indices = [];
        var positions = vDat.positions = [];
        var normals = vDat.normals = [];
        var uvs = vDat.uvs = [];


        // generate vertices, normals and uvs and indices
        for ( iy = 0; iy < gridY+1; iy ++ ){
            var y = iy * segment_height - height_half;
            for ( ix = 0; ix < gridX+1; ix ++ )
            {
                var x = ix * segment_width - width_half;
                positions.push( x, - y + height_half, 0);
                normals.push( 0, 0, 1 );
                uvs.push( ix / gridX );
                uvs.push( 1 - ( iy / gridY ) );

                if (ix < gridX && iy < gridY){
                    var a = ix + (gridX+1) * iy;
                    var b = ix + (gridX+1) * ( iy + 1 );
                    var c = ( ix + 1 ) + (gridX+1) * ( iy + 1 );
                    var d = ( ix + 1 ) + (gridX+1) * iy;

                    // faces
                    if (iy > 0){
                        indices.push( a, b, d, b, c, d);
                        indices.push( d, c, b, d, b, a);
                    }else{
                        indices.push( b, c, d);
                        indices.push( d, c, b);
                    }
                }
            }
        }


        var mesh = new BABYLON.Mesh('', game.scene);
        vDat.applyToMesh(mesh);


        return mesh;
    }


    createGrassMesh(mesh)
    {
        mesh.setEnabled(false);
        var meshes = [];
        var xp,yp;
        var temp;

        var deformRef = [];
        var posRef = [];
        var bladeLengthRef = [];

        var gridX = Math.floor( this.bladeXsegs );
        var gridY = Math.floor( this.bladeYsegs );

        var mx = this.bladeSpace.x;
        var my = this.bladeSpace.y;


        for(var y = 0; y < my; y += (1-this.density)){
            for(var x = 0; x < mx; x += (1-this.density))
            {
                xp = x - ( mx/2 );
                yp = y - ( my/2 );
                temp = mesh.clone('temp');

                //SET ATTRIBUTE DATA~
                var _scale = utils.randomRange(0.5, 1.5);
                var _rotate = utils.randomRange(0, 1);
                var _curve = utils.randomRange(0.2, 0.8);

                for(var segY = 0; segY <= gridY; segY++){
                    var bladePer = 0;
                    if(segY > 0){ bladePer = segY/gridY };
                    for(var segX = 0; segX <= gridX; segX++)
                    {
                        posRef.push(xp,yp);
                        deformRef.push(_scale, _rotate, _curve, 0);
                        bladeLengthRef.push(bladePer);
                    }
                }

                meshes.push(temp);
            }
        }


        mesh.dispose();
        this.grassMesh = BABYLON.Mesh.MergeMeshes(meshes, true, true, false, false, false);

        var posRefBuffer = new BABYLON.Buffer(game.engine, posRef, false, 2);
        this.grassMesh.setVerticesBuffer(posRefBuffer.createVertexBuffer("posRef", 0, 2));

        var bladeLengthRefBuffer = new BABYLON.Buffer(game.engine, bladeLengthRef, false, 1);
        this.grassMesh.setVerticesBuffer(bladeLengthRefBuffer.createVertexBuffer("bladeLengthRef", 0, 1));

        var deformRefBuffer = new BABYLON.Buffer(game.engine, deformRef, false, 4);
        this.grassMesh.setVerticesBuffer(deformRefBuffer.createVertexBuffer("deformRef", 0, 4));


        this.grassMesh.material = this.grassMat;
    }


    populate()
    {
        var matrices = [];


        var spawnGrass = function(p, i){
            //thin instancing
            var scale = utils.randomRange(0.5, 1);
            var rotate = utils.randomRange(0, 1);

            var transform = BABYLON.Matrix.Compose(
                new BABYLON.Vector3().setAll(scale),
                new BABYLON.Quaternion.FromEulerAngles(0, Math.PI*rotate, 0),
                p.clone()
            );


            transform.copyToArray(matrices, i * 16);
        }

        for (var x = 0, i = 0; x < this.zoneSize.x; x += this.grassSpace){
            for (var y = 0; y < this.zoneSize.y; y += this.grassSpace, i++)
            {
                var ray = new BABYLON.Ray(
                    new BABYLON.Vector3(x, 256, y),
                    new BABYLON.Vector3(0, -1, 0),
                    256
                );

                var pickInfo = ray.intersectsMesh(this.parentMesh, true);
                if (pickInfo.hit == true){
                    spawnGrass(pickInfo.pickedPoint, i);
                }
            }
        }

        this.grassMesh.thinInstanceSetBuffer("matrix", matrices);
    }


    updateGrass()
    {
        this.time += game.scene._engine._deltaTime*0.001;
        this.grassMat.setFloat('time', this.time);
    }
}
