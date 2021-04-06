var utils = {};

utils.degrees_to_radians = function(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}

utils.radians_to_degrees = function(radians)
{
  var pi = Math.PI;
  return radians * (180/pi);
}

utils.lerp = function(start, end, speed)
{
  return (start + ((end - start) * speed));
}

utils.lerp3 = function(p1, p2, t)
{
    var x = lerp(p1.x, p2.x, t);
    var y = lerp(p1.y, p2.y, t);
    var z = lerp(p1.z, p2.z, t);

    return new BABYLON.Vector3(x, y, z);
}

utils.angleDifference = function(start, end)
{
    return ((((start - end) % 360) + 540) % 360) - 180;
}

utils.lerpAngle = function(start, end, speed)
{
    //var dd = angleDifference(start, end);
    //return start - Math.min(Math.abs(dd), speed) * Math.sign(dd);
    return (start - (Math.sin(angleDifference(start, end)* speed) ))
}

utils.lengthdir_x = function(length, direction)
{
  return (Math.cos(degrees_to_radians(direction)) * length); //x
}

utils.lengthdir_y = function(length, direction)
{
  return (Math.sin(degrees_to_radians(direction)) * length); //y
}

utils.clamp = function(value, min, max)
{
  return (Math.max(Math.min(value, max), min));
}

utils.distanceToPoint = function(x1, y1, x2, y2)
{
  return (Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2)));
}

utils.distanceToPoint3D = function(x1, y1, z1, x2, y2, z2)
{
  return (Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2) + Math.pow(z1-z2, 2)));
}

utils.pointDirection = function(x1, y1, x2, y2)
{
  return (radians_to_degrees(Math.atan2(y2-y1, x2-x1)) % 360);
}

utils.randomRange = function(min, max)
{
  return (min + (Math.random() * Math.abs(min-max)));
}

utils.alphaNumerics = function()
{
  return ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890");
}

utils.cloneArray = function(arr)
{
    var newArray = [];
    for (var i = 0; i < arr.length; i++){
        newArray[i] = arr[i].slice();
    }
    return newArray;
}

utils.switchBase = function(n, base)
{
    if (n < 0) {
      n = 0xFFFFFFFF + n + 1;
    }
    return parseInt(n, 10).toString(base);
}

utils.mapValue = function(x, inputMin, inputMax, min, max)
{
      return (x - inputMin) * (max - min) / (inputMax - inputMin) + min;
}

utils.facePoint = function(rotatingObject, pointToRotateTo)
{
	// a directional vector from one object to the other one
	var direction = pointToRotateTo.subtract(rotatingObject.position);

	var v1 = new BABYLON.Vector3(0,0,1);
	var v2 = direction;

	// caluculate the angel for the new direction
	var angle = Math.acos(BABYLON.Vector3.Dot(v1, v2.normalize()));

	//console.log(angle);

	// decide it the angle has to be positive or negative
	if (direction.x < 0) angle = angle * -1;

	// calculate both angles in degrees
	var angleDegrees = Math.round(angle * 180/Math.PI);
	var playerRotationDegress = Math.round(rotatingObject.rotation.y * 180/Math.PI);

	// calculate the delta
	var deltaDegrees = playerRotationDegress - angleDegrees;

	// check what direction to turn to take the shotest turn
	if(deltaDegrees > 180){
		deltaDegrees = deltaDegrees - 360;
	} else if(deltaDegrees < -180){
		deltaDegrees = deltaDegrees + 360;
	}

	// rotate until the difference between the object angle and the target angle is no more than 3 degrees
	if (Math.abs(deltaDegrees) > 3) {

		var rotationSpeed = Math.round(Math.abs(deltaDegrees) / 8);

		if (deltaDegrees > 0) {
			rotatingObject.rotation.y -= rotationSpeed * Math.PI / 180;
			if (rotatingObject.rotation.y < -Math.PI) {
				rotatingObject.rotation.y = Math.PI;
			}
		}
		if (deltaDegrees < 0) {
			rotatingObject.rotation.y += rotationSpeed * Math.PI / 180;
			if (rotatingObject.rotation.y > Math.PI) {
				rotatingObject.rotation.y = -Math.PI;
			}
		}

		// return true since the rotation is in progress
		return true;

	} else {

		// return false since no rotation needed to be done
		return false;

	}
}

utils.moveToTarget = function(objectToMove, pointToMoveTo)
{
	var moveVector = pointToMoveTo.subtract(objectToMove.position);
	console.log(moveVector.length())

	if(moveVector.length() > 0.2) {
		moveVector = moveVector.normalize();
		moveVector = moveVector.scale(0.2);
		objectToMove.moveWithCollisions(moveVector);
	} else {
		targetPoint = null;
	}
}



/*
var tangent = CreateVector3D(quadraticBezierVectors.getPoints()[pos], quadraticBezierVectors.getPoints()[pos+1]);
var normal = normalVector(quadraticBezierVectors.getPoints()[pos], tangent );
var biNormal = CalcNormal(tangent, normal);
*/

// Calculate plane normal (pass in two vectors )
utils.calcNormal = function(v1, v2)
{
	var P = new BABYLON.Vector3(0,0,0);
	var Q = P.add(v1);
	var T = P.add(v2);

	var v1v2 = Q.subtract(P);
	var v2v3 = T.subtract(Q);
	var normal = BABYLON.Vector3.Cross(v1v2, v2v3);
	return normal;
}

// Simple Create Vector Function
utils.createVector3D = function( point1, point2 ) {
	return new BABYLON.Vector3(point2.x-point1.x, point2.y-point1.y, point2.z-point1.z);
}


// private function normalVector(v0, vt, va) :
// returns an arbitrary point in the plane defined by the point v0 and the vector vt orthogonal to this plane
// if va is passed, it returns the va projection on the plane orthogonal to vt at the point v0
//
// Stripped from Babylon Path3D - see: https://github.com/BabylonJS/Babylon.js/blob/master/src/Math/babylon.math.ts#L3691
//
utils.normalVector = function(v0, vt, va) {
    var normal0; //: Vector3;
    var tgl = vt.length();

    if (tgl === 0.0) {
        tgl = 1.0;
    }

    if (va === undefined || va === null) {
        var point;
        if (!BABYLON.MathTools.WithinEpsilon(Math.abs(vt.y) / tgl, 1.0, BABYLON.Epsilon)) {     // search for a point in the plane
            point = new BABYLON.Vector3(0.0, -1.0, 0.0);
        }
        else if (!BABYLON.MathTools.WithinEpsilon(Math.abs(vt.x) / tgl, 1.0, BABYLON.Epsilon)) {
            point = new BABYLON.Vector3(1.0, 0.0, 0.0);
        }
        else if (!BABYLON.MathTools.WithinEpsilon(Math.abs(vt.z) / tgl, 1.0, BABYLON.Epsilon)) {
            point = new BABYLON.Vector3(0.0, 0.0, 1.0);
        }
        normal0 = BABYLON.Vector3.Cross(vt, point);
    }
    else {
        normal0 = BABYLON.Vector3.Cross(vt, va);
        BABYLON.Vector3.CrossToRef(normal0, vt, normal0);
    }
    normal0.normalize();
    return normal0;
};
