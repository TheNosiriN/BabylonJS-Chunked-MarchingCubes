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

				return new Vector3(x, y, z);
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
