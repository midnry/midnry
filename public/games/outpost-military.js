var e = 1e3, t = 1001, n = 1002, r = 1003, i = 1004, a = 1005, o = 1006, s = 1007, c = 1008, l = 1009, u = 1014, d = 1015, f = 1016, p = 1020, m = 1023, h = 1026, g = 1027, _ = 1028, v = 2300, y = 2301, b = 2302, x = 2400, S = 2401, C = 2402, w = 2500, T = "srgb", E = "srgb-linear", D = "linear", O = "srgb", k = 7680, A = 35044, j = 2e3, M = class {
	addEventListener(e, t) {
		this._listeners === void 0 && (this._listeners = {});
		let n = this._listeners;
		n[e] === void 0 && (n[e] = []), n[e].indexOf(t) === -1 && n[e].push(t);
	}
	hasEventListener(e, t) {
		let n = this._listeners;
		return n !== void 0 && n[e] !== void 0 && n[e].indexOf(t) !== -1;
	}
	removeEventListener(e, t) {
		let n = this._listeners;
		if (n === void 0) return;
		let r = n[e];
		if (r !== void 0) {
			let e = r.indexOf(t);
			e !== -1 && r.splice(e, 1);
		}
	}
	dispatchEvent(e) {
		let t = this._listeners;
		if (t === void 0) return;
		let n = t[e.type];
		if (n !== void 0) {
			e.target = this;
			let t = n.slice(0);
			for (let n = 0, r = t.length; n < r; n++) t[n].call(this, e);
			e.target = null;
		}
	}
}, N = /* @__PURE__ */ "00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff".split("."), P = 1234567, F = Math.PI / 180, ee = 180 / Math.PI;
function I() {
	let e = Math.random() * 4294967295 | 0, t = Math.random() * 4294967295 | 0, n = Math.random() * 4294967295 | 0, r = Math.random() * 4294967295 | 0;
	return (N[e & 255] + N[e >> 8 & 255] + N[e >> 16 & 255] + N[e >> 24 & 255] + "-" + N[t & 255] + N[t >> 8 & 255] + "-" + N[t >> 16 & 15 | 64] + N[t >> 24 & 255] + "-" + N[n & 63 | 128] + N[n >> 8 & 255] + "-" + N[n >> 16 & 255] + N[n >> 24 & 255] + N[r & 255] + N[r >> 8 & 255] + N[r >> 16 & 255] + N[r >> 24 & 255]).toLowerCase();
}
function L(e, t, n) {
	return Math.max(t, Math.min(n, e));
}
function te(e, t) {
	return (e % t + t) % t;
}
function ne(e, t, n, r, i) {
	return r + (e - t) * (i - r) / (n - t);
}
function re(e, t, n) {
	return e === t ? 0 : (n - e) / (t - e);
}
function R(e, t, n) {
	return (1 - n) * e + n * t;
}
function ie(e, t, n, r) {
	return R(e, t, 1 - Math.exp(-n * r));
}
function z(e, t = 1) {
	return t - Math.abs(te(e, t * 2) - t);
}
function ae(e, t, n) {
	return e <= t ? 0 : e >= n ? 1 : (e = (e - t) / (n - t), e * e * (3 - 2 * e));
}
function oe(e, t, n) {
	return e <= t ? 0 : e >= n ? 1 : (e = (e - t) / (n - t), e * e * e * (e * (e * 6 - 15) + 10));
}
function se(e, t) {
	return e + Math.floor(Math.random() * (t - e + 1));
}
function ce(e, t) {
	return e + Math.random() * (t - e);
}
function le(e) {
	return e * (.5 - Math.random());
}
function ue(e) {
	e !== void 0 && (P = e);
	let t = P += 1831565813;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function de(e) {
	return e * F;
}
function fe(e) {
	return e * ee;
}
function pe(e) {
	return !(e & e - 1) && e !== 0;
}
function B(e) {
	return 2 ** Math.ceil(Math.log(e) / Math.LN2);
}
function me(e) {
	return 2 ** Math.floor(Math.log(e) / Math.LN2);
}
function he(e, t, n, r, i) {
	let a = Math.cos, o = Math.sin, s = a(n / 2), c = o(n / 2), l = a((t + r) / 2), u = o((t + r) / 2), d = a((t - r) / 2), f = o((t - r) / 2), p = a((r - t) / 2), m = o((r - t) / 2);
	switch (i) {
		case "XYX":
			e.set(s * u, c * d, c * f, s * l);
			break;
		case "YZY":
			e.set(c * f, s * u, c * d, s * l);
			break;
		case "ZXZ":
			e.set(c * d, c * f, s * u, s * l);
			break;
		case "XZX":
			e.set(s * u, c * m, c * p, s * l);
			break;
		case "YXY":
			e.set(c * p, s * u, c * m, s * l);
			break;
		case "ZYZ":
			e.set(c * m, c * p, s * u, s * l);
			break;
		default: console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: " + i);
	}
}
function ge(e, t) {
	switch (t.constructor) {
		case Float32Array: return e;
		case Uint32Array: return e / 4294967295;
		case Uint16Array: return e / 65535;
		case Uint8Array: return e / 255;
		case Int32Array: return Math.max(e / 2147483647, -1);
		case Int16Array: return Math.max(e / 32767, -1);
		case Int8Array: return Math.max(e / 127, -1);
		default: throw Error("Invalid component type.");
	}
}
function V(e, t) {
	switch (t.constructor) {
		case Float32Array: return e;
		case Uint32Array: return Math.round(e * 4294967295);
		case Uint16Array: return Math.round(e * 65535);
		case Uint8Array: return Math.round(e * 255);
		case Int32Array: return Math.round(e * 2147483647);
		case Int16Array: return Math.round(e * 32767);
		case Int8Array: return Math.round(e * 127);
		default: throw Error("Invalid component type.");
	}
}
var _e = {
	DEG2RAD: F,
	RAD2DEG: ee,
	generateUUID: I,
	clamp: L,
	euclideanModulo: te,
	mapLinear: ne,
	inverseLerp: re,
	lerp: R,
	damp: ie,
	pingpong: z,
	smoothstep: ae,
	smootherstep: oe,
	randInt: se,
	randFloat: ce,
	randFloatSpread: le,
	seededRandom: ue,
	degToRad: de,
	radToDeg: fe,
	isPowerOfTwo: pe,
	ceilPowerOfTwo: B,
	floorPowerOfTwo: me,
	setQuaternionFromProperEuler: he,
	normalize: V,
	denormalize: ge
}, H = class e {
	constructor(t = 0, n = 0) {
		e.prototype.isVector2 = !0, this.x = t, this.y = n;
	}
	get width() {
		return this.x;
	}
	set width(e) {
		this.x = e;
	}
	get height() {
		return this.y;
	}
	set height(e) {
		this.y = e;
	}
	set(e, t) {
		return this.x = e, this.y = t, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			default: throw Error("index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			default: throw Error("index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = e.elements;
		return this.x = r[0] * t + r[3] * n + r[6], this.y = r[1] * t + r[4] * n + r[7], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this;
	}
	clamp(e, t) {
		return this.x = L(this.x, e.x, t.x), this.y = L(this.y, e.y, t.y), this;
	}
	clampScalar(e, t) {
		return this.x = L(this.x, e, t), this.y = L(this.y, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(L(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y;
	}
	cross(e) {
		return this.x * e.y - this.y * e.x;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	angle() {
		return Math.atan2(-this.y, -this.x) + Math.PI;
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(L(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y;
		return t * t + n * n;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this;
	}
	rotateAround(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = this.x - e.x, a = this.y - e.y;
		return this.x = i * n - a * r + e.x, this.y = i * r + a * n + e.y, this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y;
	}
}, U = class {
	constructor(e = 0, t = 0, n = 0, r = 1) {
		this.isQuaternion = !0, this._x = e, this._y = t, this._z = n, this._w = r;
	}
	static slerpFlat(e, t, n, r, i, a, o) {
		let s = n[r + 0], c = n[r + 1], l = n[r + 2], u = n[r + 3], d = i[a + 0], f = i[a + 1], p = i[a + 2], m = i[a + 3];
		if (o === 0) {
			e[t + 0] = s, e[t + 1] = c, e[t + 2] = l, e[t + 3] = u;
			return;
		}
		if (o === 1) {
			e[t + 0] = d, e[t + 1] = f, e[t + 2] = p, e[t + 3] = m;
			return;
		}
		if (u !== m || s !== d || c !== f || l !== p) {
			let e = 1 - o, t = s * d + c * f + l * p + u * m, n = t >= 0 ? 1 : -1, r = 1 - t * t;
			if (r > 2 ** -52) {
				let i = Math.sqrt(r), a = Math.atan2(i, t * n);
				e = Math.sin(e * a) / i, o = Math.sin(o * a) / i;
			}
			let i = o * n;
			if (s = s * e + d * i, c = c * e + f * i, l = l * e + p * i, u = u * e + m * i, e === 1 - o) {
				let e = 1 / Math.sqrt(s * s + c * c + l * l + u * u);
				s *= e, c *= e, l *= e, u *= e;
			}
		}
		e[t] = s, e[t + 1] = c, e[t + 2] = l, e[t + 3] = u;
	}
	static multiplyQuaternionsFlat(e, t, n, r, i, a) {
		let o = n[r], s = n[r + 1], c = n[r + 2], l = n[r + 3], u = i[a], d = i[a + 1], f = i[a + 2], p = i[a + 3];
		return e[t] = o * p + l * u + s * f - c * d, e[t + 1] = s * p + l * d + c * u - o * f, e[t + 2] = c * p + l * f + o * d - s * u, e[t + 3] = l * p - o * u - s * d - c * f, e;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get w() {
		return this._w;
	}
	set w(e) {
		this._w = e, this._onChangeCallback();
	}
	set(e, t, n, r) {
		return this._x = e, this._y = t, this._z = n, this._w = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._w);
	}
	copy(e) {
		return this._x = e.x, this._y = e.y, this._z = e.z, this._w = e.w, this._onChangeCallback(), this;
	}
	setFromEuler(e, t = !0) {
		let n = e._x, r = e._y, i = e._z, a = e._order, o = Math.cos, s = Math.sin, c = o(n / 2), l = o(r / 2), u = o(i / 2), d = s(n / 2), f = s(r / 2), p = s(i / 2);
		switch (a) {
			case "XYZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "YXZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "ZXY":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "ZYX":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "YZX":
				this._x = d * l * u + c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "XZY":
				this._x = d * l * u - c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u + d * f * p;
				break;
			default: console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: " + a);
		}
		return t === !0 && this._onChangeCallback(), this;
	}
	setFromAxisAngle(e, t) {
		let n = t / 2, r = Math.sin(n);
		return this._x = e.x * r, this._y = e.y * r, this._z = e.z * r, this._w = Math.cos(n), this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e) {
		let t = e.elements, n = t[0], r = t[4], i = t[8], a = t[1], o = t[5], s = t[9], c = t[2], l = t[6], u = t[10], d = n + o + u;
		if (d > 0) {
			let e = .5 / Math.sqrt(d + 1);
			this._w = .25 / e, this._x = (l - s) * e, this._y = (i - c) * e, this._z = (a - r) * e;
		} else if (n > o && n > u) {
			let e = 2 * Math.sqrt(1 + n - o - u);
			this._w = (l - s) / e, this._x = .25 * e, this._y = (r + a) / e, this._z = (i + c) / e;
		} else if (o > u) {
			let e = 2 * Math.sqrt(1 + o - n - u);
			this._w = (i - c) / e, this._x = (r + a) / e, this._y = .25 * e, this._z = (s + l) / e;
		} else {
			let e = 2 * Math.sqrt(1 + u - n - o);
			this._w = (a - r) / e, this._x = (i + c) / e, this._y = (s + l) / e, this._z = .25 * e;
		}
		return this._onChangeCallback(), this;
	}
	setFromUnitVectors(e, t) {
		let n = e.dot(t) + 1;
		return n < 1e-8 ? (n = 0, Math.abs(e.x) > Math.abs(e.z) ? (this._x = -e.y, this._y = e.x, this._z = 0, this._w = n) : (this._x = 0, this._y = -e.z, this._z = e.y, this._w = n)) : (this._x = e.y * t.z - e.z * t.y, this._y = e.z * t.x - e.x * t.z, this._z = e.x * t.y - e.y * t.x, this._w = n), this.normalize();
	}
	angleTo(e) {
		return 2 * Math.acos(Math.abs(L(this.dot(e), -1, 1)));
	}
	rotateTowards(e, t) {
		let n = this.angleTo(e);
		if (n === 0) return this;
		let r = Math.min(1, t / n);
		return this.slerp(e, r), this;
	}
	identity() {
		return this.set(0, 0, 0, 1);
	}
	invert() {
		return this.conjugate();
	}
	conjugate() {
		return this._x *= -1, this._y *= -1, this._z *= -1, this._onChangeCallback(), this;
	}
	dot(e) {
		return this._x * e._x + this._y * e._y + this._z * e._z + this._w * e._w;
	}
	lengthSq() {
		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
	}
	length() {
		return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
	}
	normalize() {
		let e = this.length();
		return e === 0 ? (this._x = 0, this._y = 0, this._z = 0, this._w = 1) : (e = 1 / e, this._x *= e, this._y *= e, this._z *= e, this._w *= e), this._onChangeCallback(), this;
	}
	multiply(e) {
		return this.multiplyQuaternions(this, e);
	}
	premultiply(e) {
		return this.multiplyQuaternions(e, this);
	}
	multiplyQuaternions(e, t) {
		let n = e._x, r = e._y, i = e._z, a = e._w, o = t._x, s = t._y, c = t._z, l = t._w;
		return this._x = n * l + a * o + r * c - i * s, this._y = r * l + a * s + i * o - n * c, this._z = i * l + a * c + n * s - r * o, this._w = a * l - n * o - r * s - i * c, this._onChangeCallback(), this;
	}
	slerp(e, t) {
		if (t === 0) return this;
		if (t === 1) return this.copy(e);
		let n = this._x, r = this._y, i = this._z, a = this._w, o = a * e._w + n * e._x + r * e._y + i * e._z;
		if (o < 0 ? (this._w = -e._w, this._x = -e._x, this._y = -e._y, this._z = -e._z, o = -o) : this.copy(e), o >= 1) return this._w = a, this._x = n, this._y = r, this._z = i, this;
		let s = 1 - o * o;
		if (s <= 2 ** -52) {
			let e = 1 - t;
			return this._w = e * a + t * this._w, this._x = e * n + t * this._x, this._y = e * r + t * this._y, this._z = e * i + t * this._z, this.normalize(), this;
		}
		let c = Math.sqrt(s), l = Math.atan2(c, o), u = Math.sin((1 - t) * l) / c, d = Math.sin(t * l) / c;
		return this._w = a * u + this._w * d, this._x = n * u + this._x * d, this._y = r * u + this._y * d, this._z = i * u + this._z * d, this._onChangeCallback(), this;
	}
	slerpQuaternions(e, t, n) {
		return this.copy(e).slerp(t, n);
	}
	random() {
		let e = 2 * Math.PI * Math.random(), t = 2 * Math.PI * Math.random(), n = Math.random(), r = Math.sqrt(1 - n), i = Math.sqrt(n);
		return this.set(r * Math.sin(e), r * Math.cos(e), i * Math.sin(t), i * Math.cos(t));
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._w === this._w;
	}
	fromArray(e, t = 0) {
		return this._x = e[t], this._y = e[t + 1], this._z = e[t + 2], this._w = e[t + 3], this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._w, e;
	}
	fromBufferAttribute(e, t) {
		return this._x = e.getX(t), this._y = e.getY(t), this._z = e.getZ(t), this._w = e.getW(t), this._onChangeCallback(), this;
	}
	toJSON() {
		return this.toArray();
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._w;
	}
}, W = class e {
	constructor(t = 0, n = 0, r = 0) {
		e.prototype.isVector3 = !0, this.x = t, this.y = n, this.z = r;
	}
	set(e, t, n) {
		return n === void 0 && (n = this.z), this.x = e, this.y = t, this.z = n, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			default: throw Error("index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw Error("index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this;
	}
	multiplyVectors(e, t) {
		return this.x = e.x * t.x, this.y = e.y * t.y, this.z = e.z * t.z, this;
	}
	applyEuler(e) {
		return this.applyQuaternion(ye.setFromEuler(e));
	}
	applyAxisAngle(e, t) {
		return this.applyQuaternion(ye.setFromAxisAngle(e, t));
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[3] * n + i[6] * r, this.y = i[1] * t + i[4] * n + i[7] * r, this.z = i[2] * t + i[5] * n + i[8] * r, this;
	}
	applyNormalMatrix(e) {
		return this.applyMatrix3(e).normalize();
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements, a = 1 / (i[3] * t + i[7] * n + i[11] * r + i[15]);
		return this.x = (i[0] * t + i[4] * n + i[8] * r + i[12]) * a, this.y = (i[1] * t + i[5] * n + i[9] * r + i[13]) * a, this.z = (i[2] * t + i[6] * n + i[10] * r + i[14]) * a, this;
	}
	applyQuaternion(e) {
		let t = this.x, n = this.y, r = this.z, i = e.x, a = e.y, o = e.z, s = e.w, c = 2 * (a * r - o * n), l = 2 * (o * t - i * r), u = 2 * (i * n - a * t);
		return this.x = t + s * c + a * u - o * l, this.y = n + s * l + o * c - i * u, this.z = r + s * u + i * l - a * c, this;
	}
	project(e) {
		return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix);
	}
	unproject(e) {
		return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld);
	}
	transformDirection(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[4] * n + i[8] * r, this.y = i[1] * t + i[5] * n + i[9] * r, this.z = i[2] * t + i[6] * n + i[10] * r, this.normalize();
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this;
	}
	clamp(e, t) {
		return this.x = L(this.x, e.x, t.x), this.y = L(this.y, e.y, t.y), this.z = L(this.z, e.z, t.z), this;
	}
	clampScalar(e, t) {
		return this.x = L(this.x, e, t), this.y = L(this.y, e, t), this.z = L(this.z, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(L(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this;
	}
	cross(e) {
		return this.crossVectors(this, e);
	}
	crossVectors(e, t) {
		let n = e.x, r = e.y, i = e.z, a = t.x, o = t.y, s = t.z;
		return this.x = r * s - i * o, this.y = i * a - n * s, this.z = n * o - r * a, this;
	}
	projectOnVector(e) {
		let t = e.lengthSq();
		if (t === 0) return this.set(0, 0, 0);
		let n = e.dot(this) / t;
		return this.copy(e).multiplyScalar(n);
	}
	projectOnPlane(e) {
		return ve.copy(this).projectOnVector(e), this.sub(ve);
	}
	reflect(e) {
		return this.sub(ve.copy(e).multiplyScalar(2 * this.dot(e)));
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(L(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y, r = this.z - e.z;
		return t * t + n * n + r * r;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y) + Math.abs(this.z - e.z);
	}
	setFromSpherical(e) {
		return this.setFromSphericalCoords(e.radius, e.phi, e.theta);
	}
	setFromSphericalCoords(e, t, n) {
		let r = Math.sin(t) * e;
		return this.x = r * Math.sin(n), this.y = Math.cos(t) * e, this.z = r * Math.cos(n), this;
	}
	setFromCylindrical(e) {
		return this.setFromCylindricalCoords(e.radius, e.theta, e.y);
	}
	setFromCylindricalCoords(e, t, n) {
		return this.x = e * Math.sin(t), this.y = n, this.z = e * Math.cos(t), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this;
	}
	setFromMatrixScale(e) {
		let t = this.setFromMatrixColumn(e, 0).length(), n = this.setFromMatrixColumn(e, 1).length(), r = this.setFromMatrixColumn(e, 2).length();
		return this.x = t, this.y = n, this.z = r, this;
	}
	setFromMatrixColumn(e, t) {
		return this.fromArray(e.elements, t * 4);
	}
	setFromMatrix3Column(e, t) {
		return this.fromArray(e.elements, t * 3);
	}
	setFromEuler(e) {
		return this.x = e._x, this.y = e._y, this.z = e._z, this;
	}
	setFromColor(e) {
		return this.x = e.r, this.y = e.g, this.z = e.b, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this;
	}
	randomDirection() {
		let e = Math.random() * Math.PI * 2, t = Math.random() * 2 - 1, n = Math.sqrt(1 - t * t);
		return this.x = n * Math.cos(e), this.y = t, this.z = n * Math.sin(e), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y, yield this.z;
	}
}, ve = /*@__PURE__*/ new W(), ye = /*@__PURE__*/ new U(), G = class e {
	constructor(t, n, r, i, a, o, s, c, l) {
		e.prototype.isMatrix3 = !0, this.elements = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], t !== void 0 && this.set(t, n, r, i, a, o, s, c, l);
	}
	set(e, t, n, r, i, a, o, s, c) {
		let l = this.elements;
		return l[0] = e, l[1] = r, l[2] = o, l[3] = t, l[4] = i, l[5] = s, l[6] = n, l[7] = a, l[8] = c, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1), this;
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], this;
	}
	extractBasis(e, t, n) {
		return e.setFromMatrix3Column(this, 0), t.setFromMatrix3Column(this, 1), n.setFromMatrix3Column(this, 2), this;
	}
	setFromMatrix4(e) {
		let t = e.elements;
		return this.set(t[0], t[4], t[8], t[1], t[5], t[9], t[2], t[6], t[10]), this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[3], s = n[6], c = n[1], l = n[4], u = n[7], d = n[2], f = n[5], p = n[8], m = r[0], h = r[3], g = r[6], _ = r[1], v = r[4], y = r[7], b = r[2], x = r[5], S = r[8];
		return i[0] = a * m + o * _ + s * b, i[3] = a * h + o * v + s * x, i[6] = a * g + o * y + s * S, i[1] = c * m + l * _ + u * b, i[4] = c * h + l * v + u * x, i[7] = c * g + l * y + u * S, i[2] = d * m + f * _ + p * b, i[5] = d * h + f * v + p * x, i[8] = d * g + f * y + p * S, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[3] *= e, t[6] *= e, t[1] *= e, t[4] *= e, t[7] *= e, t[2] *= e, t[5] *= e, t[8] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8];
		return t * a * l - t * o * c - n * i * l + n * o * s + r * i * c - r * a * s;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = l * a - o * c, d = o * s - l * i, f = c * i - a * s, p = t * u + n * d + r * f;
		if (p === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
		let m = 1 / p;
		return e[0] = u * m, e[1] = (r * c - l * n) * m, e[2] = (o * n - r * a) * m, e[3] = d * m, e[4] = (l * t - r * s) * m, e[5] = (r * i - o * t) * m, e[6] = f * m, e[7] = (n * s - c * t) * m, e[8] = (a * t - n * i) * m, this;
	}
	transpose() {
		let e, t = this.elements;
		return e = t[1], t[1] = t[3], t[3] = e, e = t[2], t[2] = t[6], t[6] = e, e = t[5], t[5] = t[7], t[7] = e, this;
	}
	getNormalMatrix(e) {
		return this.setFromMatrix4(e).invert().transpose();
	}
	transposeIntoArray(e) {
		let t = this.elements;
		return e[0] = t[0], e[1] = t[3], e[2] = t[6], e[3] = t[1], e[4] = t[4], e[5] = t[7], e[6] = t[2], e[7] = t[5], e[8] = t[8], this;
	}
	setUvTransform(e, t, n, r, i, a, o) {
		let s = Math.cos(i), c = Math.sin(i);
		return this.set(n * s, n * c, -n * (s * a + c * o) + a + e, -r * c, r * s, -r * (-c * a + s * o) + o + t, 0, 0, 1), this;
	}
	scale(e, t) {
		return this.premultiply(be.makeScale(e, t)), this;
	}
	rotate(e) {
		return this.premultiply(be.makeRotation(-e)), this;
	}
	translate(e, t) {
		return this.premultiply(be.makeTranslation(e, t)), this;
	}
	makeTranslation(e, t) {
		return e.isVector2 ? this.set(1, 0, e.x, 0, 1, e.y, 0, 0, 1) : this.set(1, 0, e, 0, 1, t, 0, 0, 1), this;
	}
	makeRotation(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, n, t, 0, 0, 0, 1), this;
	}
	makeScale(e, t) {
		return this.set(e, 0, 0, 0, t, 0, 0, 0, 1), this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 9; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 9; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e;
	}
	clone() {
		return new this.constructor().fromArray(this.elements);
	}
}, be = /*@__PURE__*/ new G();
function xe(e) {
	for (let t = e.length - 1; t >= 0; --t) if (e[t] >= 65535) return !0;
	return !1;
}
function Se(e) {
	return document.createElementNS("http://www.w3.org/1999/xhtml", e);
}
function Ce() {
	let e = Se("canvas");
	return e.style.display = "block", e;
}
var we = {};
function Te(e) {
	e in we || (we[e] = !0, console.warn(e));
}
function Ee(e, t, n) {
	return new Promise(function(r, i) {
		function a() {
			switch (e.clientWaitSync(t, e.SYNC_FLUSH_COMMANDS_BIT, 0)) {
				case e.WAIT_FAILED:
					i();
					break;
				case e.TIMEOUT_EXPIRED:
					setTimeout(a, n);
					break;
				default: r();
			}
		}
		setTimeout(a, n);
	});
}
var De = /*@__PURE__*/ new G().set(.4123908, .3575843, .1804808, .212639, .7151687, .0721923, .0193308, .1191948, .9505322), Oe = /*@__PURE__*/ new G().set(3.2409699, -1.5373832, -.4986108, -.9692436, 1.8759675, .0415551, .0556301, -.203977, 1.0569715);
function ke() {
	let e = {
		enabled: !0,
		workingColorSpace: E,
		spaces: {},
		convert: function(e, t, n) {
			return this.enabled === !1 || t === n || !t || !n ? e : (this.spaces[t].transfer === "srgb" && (e.r = Ae(e.r), e.g = Ae(e.g), e.b = Ae(e.b)), this.spaces[t].primaries !== this.spaces[n].primaries && (e.applyMatrix3(this.spaces[t].toXYZ), e.applyMatrix3(this.spaces[n].fromXYZ)), this.spaces[n].transfer === "srgb" && (e.r = je(e.r), e.g = je(e.g), e.b = je(e.b)), e);
		},
		workingToColorSpace: function(e, t) {
			return this.convert(e, this.workingColorSpace, t);
		},
		colorSpaceToWorking: function(e, t) {
			return this.convert(e, t, this.workingColorSpace);
		},
		getPrimaries: function(e) {
			return this.spaces[e].primaries;
		},
		getTransfer: function(e) {
			return e === "" ? D : this.spaces[e].transfer;
		},
		getToneMappingMode: function(e) {
			return this.spaces[e].outputColorSpaceConfig.toneMappingMode || "standard";
		},
		getLuminanceCoefficients: function(e, t = this.workingColorSpace) {
			return e.fromArray(this.spaces[t].luminanceCoefficients);
		},
		define: function(e) {
			Object.assign(this.spaces, e);
		},
		_getMatrix: function(e, t, n) {
			return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ);
		},
		_getDrawingBufferColorSpace: function(e) {
			return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace;
		},
		_getUnpackColorSpace: function(e = this.workingColorSpace) {
			return this.spaces[e].workingColorSpaceConfig.unpackColorSpace;
		},
		fromWorkingColorSpace: function(t, n) {
			return Te("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."), e.workingToColorSpace(t, n);
		},
		toWorkingColorSpace: function(t, n) {
			return Te("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."), e.colorSpaceToWorking(t, n);
		}
	}, t = [
		.64,
		.33,
		.3,
		.6,
		.15,
		.06
	], n = [
		.2126,
		.7152,
		.0722
	], r = [.3127, .329];
	return e.define({
		[E]: {
			primaries: t,
			whitePoint: r,
			transfer: D,
			toXYZ: De,
			fromXYZ: Oe,
			luminanceCoefficients: n,
			workingColorSpaceConfig: { unpackColorSpace: T },
			outputColorSpaceConfig: { drawingBufferColorSpace: T }
		},
		[T]: {
			primaries: t,
			whitePoint: r,
			transfer: O,
			toXYZ: De,
			fromXYZ: Oe,
			luminanceCoefficients: n,
			outputColorSpaceConfig: { drawingBufferColorSpace: T }
		}
	}), e;
}
var K = /*@__PURE__*/ ke();
function Ae(e) {
	return e < .04045 ? e * .0773993808 : (e * .9478672986 + .0521327014) ** 2.4;
}
function je(e) {
	return e < .0031308 ? e * 12.92 : 1.055 * e ** .41666 - .055;
}
var Me, Ne = class {
	static getDataURL(e, t = "image/png") {
		if (/^data:/i.test(e.src) || typeof HTMLCanvasElement > "u") return e.src;
		let n;
		if (e instanceof HTMLCanvasElement) n = e;
		else {
			Me === void 0 && (Me = Se("canvas")), Me.width = e.width, Me.height = e.height;
			let t = Me.getContext("2d");
			e instanceof ImageData ? t.putImageData(e, 0, 0) : t.drawImage(e, 0, 0, e.width, e.height), n = Me;
		}
		return n.toDataURL(t);
	}
	static sRGBToLinear(e) {
		if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap) {
			let t = Se("canvas");
			t.width = e.width, t.height = e.height;
			let n = t.getContext("2d");
			n.drawImage(e, 0, 0, e.width, e.height);
			let r = n.getImageData(0, 0, e.width, e.height), i = r.data;
			for (let e = 0; e < i.length; e++) i[e] = Ae(i[e] / 255) * 255;
			return n.putImageData(r, 0, 0), t;
		}
		if (e.data) {
			let t = e.data.slice(0);
			for (let e = 0; e < t.length; e++) t instanceof Uint8Array || t instanceof Uint8ClampedArray ? t[e] = Math.floor(Ae(t[e] / 255) * 255) : t[e] = Ae(t[e]);
			return {
				data: t,
				width: e.width,
				height: e.height
			};
		}
		return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), e;
	}
}, Pe = 0, Fe = class {
	constructor(e = null) {
		this.isSource = !0, Object.defineProperty(this, "id", { value: Pe++ }), this.uuid = I(), this.data = e, this.dataReady = !0, this.version = 0;
	}
	getSize(e) {
		let t = this.data;
		return typeof HTMLVideoElement < "u" && t instanceof HTMLVideoElement ? e.set(t.videoWidth, t.videoHeight, 0) : t instanceof VideoFrame ? e.set(t.displayHeight, t.displayWidth, 0) : t === null ? e.set(0, 0, 0) : e.set(t.width, t.height, t.depth || 0), e;
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.images[this.uuid] !== void 0) return e.images[this.uuid];
		let n = {
			uuid: this.uuid,
			url: ""
		}, r = this.data;
		if (r !== null) {
			let e;
			if (Array.isArray(r)) {
				e = [];
				for (let t = 0, n = r.length; t < n; t++) r[t].isDataTexture ? e.push(Ie(r[t].image)) : e.push(Ie(r[t]));
			} else e = Ie(r);
			n.url = e;
		}
		return t || (e.images[this.uuid] = n), n;
	}
};
function Ie(e) {
	return typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap ? Ne.getDataURL(e) : e.data ? {
		data: Array.from(e.data),
		width: e.width,
		height: e.height,
		type: e.data.constructor.name
	} : (console.warn("THREE.Texture: Unable to serialize Texture."), {});
}
var Le = 0, Re = /*@__PURE__*/ new W(), q = class r extends M {
	constructor(e = r.DEFAULT_IMAGE, n = r.DEFAULT_MAPPING, i = t, a = t, s = o, u = c, d = m, f = l, p = r.DEFAULT_ANISOTROPY, h = "") {
		super(), this.isTexture = !0, Object.defineProperty(this, "id", { value: Le++ }), this.uuid = I(), this.name = "", this.source = new Fe(e), this.mipmaps = [], this.mapping = n, this.channel = 0, this.wrapS = i, this.wrapT = a, this.magFilter = s, this.minFilter = u, this.anisotropy = p, this.format = d, this.internalFormat = null, this.type = f, this.offset = new H(0, 0), this.repeat = new H(1, 1), this.center = new H(0, 0), this.rotation = 0, this.matrixAutoUpdate = !0, this.matrix = new G(), this.generateMipmaps = !0, this.premultiplyAlpha = !1, this.flipY = !0, this.unpackAlignment = 4, this.colorSpace = h, this.userData = {}, this.updateRanges = [], this.version = 0, this.onUpdate = null, this.renderTarget = null, this.isRenderTargetTexture = !1, this.isArrayTexture = !!(e && e.depth && e.depth > 1), this.pmremVersion = 0;
	}
	get width() {
		return this.source.getSize(Re).x;
	}
	get height() {
		return this.source.getSize(Re).y;
	}
	get depth() {
		return this.source.getSize(Re).z;
	}
	get image() {
		return this.source.data;
	}
	set image(e = null) {
		this.source.data = e;
	}
	updateMatrix() {
		this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.name = e.name, this.source = e.source, this.mipmaps = e.mipmaps.slice(0), this.mapping = e.mapping, this.channel = e.channel, this.wrapS = e.wrapS, this.wrapT = e.wrapT, this.magFilter = e.magFilter, this.minFilter = e.minFilter, this.anisotropy = e.anisotropy, this.format = e.format, this.internalFormat = e.internalFormat, this.type = e.type, this.offset.copy(e.offset), this.repeat.copy(e.repeat), this.center.copy(e.center), this.rotation = e.rotation, this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrix.copy(e.matrix), this.generateMipmaps = e.generateMipmaps, this.premultiplyAlpha = e.premultiplyAlpha, this.flipY = e.flipY, this.unpackAlignment = e.unpackAlignment, this.colorSpace = e.colorSpace, this.renderTarget = e.renderTarget, this.isRenderTargetTexture = e.isRenderTargetTexture, this.isArrayTexture = e.isArrayTexture, this.userData = JSON.parse(JSON.stringify(e.userData)), this.needsUpdate = !0, this;
	}
	setValues(e) {
		for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			if (r === void 0) {
				console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);
				continue;
			}
			r && n && r.isVector2 && n.isVector2 || r && n && r.isVector3 && n.isVector3 || r && n && r.isMatrix3 && n.isMatrix3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.textures[this.uuid] !== void 0) return e.textures[this.uuid];
		let n = {
			metadata: {
				version: 4.7,
				type: "Texture",
				generator: "Texture.toJSON"
			},
			uuid: this.uuid,
			name: this.name,
			image: this.source.toJSON(e).uuid,
			mapping: this.mapping,
			channel: this.channel,
			repeat: [this.repeat.x, this.repeat.y],
			offset: [this.offset.x, this.offset.y],
			center: [this.center.x, this.center.y],
			rotation: this.rotation,
			wrap: [this.wrapS, this.wrapT],
			format: this.format,
			internalFormat: this.internalFormat,
			type: this.type,
			colorSpace: this.colorSpace,
			minFilter: this.minFilter,
			magFilter: this.magFilter,
			anisotropy: this.anisotropy,
			flipY: this.flipY,
			generateMipmaps: this.generateMipmaps,
			premultiplyAlpha: this.premultiplyAlpha,
			unpackAlignment: this.unpackAlignment
		};
		return Object.keys(this.userData).length > 0 && (n.userData = this.userData), t || (e.textures[this.uuid] = n), n;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	transformUv(r) {
		if (this.mapping !== 300) return r;
		if (r.applyMatrix3(this.matrix), r.x < 0 || r.x > 1) switch (this.wrapS) {
			case e:
				r.x -= Math.floor(r.x);
				break;
			case t:
				r.x = r.x < 0 ? 0 : 1;
				break;
			case n: Math.abs(Math.floor(r.x) % 2) === 1 ? r.x = Math.ceil(r.x) - r.x : r.x -= Math.floor(r.x);
		}
		if (r.y < 0 || r.y > 1) switch (this.wrapT) {
			case e:
				r.y -= Math.floor(r.y);
				break;
			case t:
				r.y = r.y < 0 ? 0 : 1;
				break;
			case n: Math.abs(Math.floor(r.y) % 2) === 1 ? r.y = Math.ceil(r.y) - r.y : r.y -= Math.floor(r.y);
		}
		return this.flipY && (r.y = 1 - r.y), r;
	}
	set needsUpdate(e) {
		e === !0 && (this.version++, this.source.needsUpdate = !0);
	}
	set needsPMREMUpdate(e) {
		e === !0 && this.pmremVersion++;
	}
};
q.DEFAULT_IMAGE = null, q.DEFAULT_MAPPING = 300, q.DEFAULT_ANISOTROPY = 1;
var ze = class e {
	constructor(t = 0, n = 0, r = 0, i = 1) {
		e.prototype.isVector4 = !0, this.x = t, this.y = n, this.z = r, this.w = i;
	}
	get width() {
		return this.z;
	}
	set width(e) {
		this.z = e;
	}
	get height() {
		return this.w;
	}
	set height(e) {
		this.w = e;
	}
	set(e, t, n, r) {
		return this.x = e, this.y = t, this.z = n, this.w = r, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this.w = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setW(e) {
		return this.w = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			case 3:
				this.w = t;
				break;
			default: throw Error("index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			case 3: return this.w;
			default: throw Error("index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z, this.w);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this.w = e.w === void 0 ? 1 : e.w, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this.w += e.w, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this.w += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this.w = e.w + t.w, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this.w += e.w * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this.w -= e.w, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this.w -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this.w = e.w - t.w, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this.w *= e.w, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this.w *= e, this;
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = this.w, a = e.elements;
		return this.x = a[0] * t + a[4] * n + a[8] * r + a[12] * i, this.y = a[1] * t + a[5] * n + a[9] * r + a[13] * i, this.z = a[2] * t + a[6] * n + a[10] * r + a[14] * i, this.w = a[3] * t + a[7] * n + a[11] * r + a[15] * i, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this.w /= e.w, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	setAxisAngleFromQuaternion(e) {
		this.w = 2 * Math.acos(e.w);
		let t = Math.sqrt(1 - e.w * e.w);
		return t < 1e-4 ? (this.x = 1, this.y = 0, this.z = 0) : (this.x = e.x / t, this.y = e.y / t, this.z = e.z / t), this;
	}
	setAxisAngleFromRotationMatrix(e) {
		let t, n, r, i, a = .01, o = .1, s = e.elements, c = s[0], l = s[4], u = s[8], d = s[1], f = s[5], p = s[9], m = s[2], h = s[6], g = s[10];
		if (Math.abs(l - d) < a && Math.abs(u - m) < a && Math.abs(p - h) < a) {
			if (Math.abs(l + d) < o && Math.abs(u + m) < o && Math.abs(p + h) < o && Math.abs(c + f + g - 3) < o) return this.set(1, 0, 0, 0), this;
			t = Math.PI;
			let e = (c + 1) / 2, s = (f + 1) / 2, _ = (g + 1) / 2, v = (l + d) / 4, y = (u + m) / 4, b = (p + h) / 4;
			return e > s && e > _ ? e < a ? (n = 0, r = .707106781, i = .707106781) : (n = Math.sqrt(e), r = v / n, i = y / n) : s > _ ? s < a ? (n = .707106781, r = 0, i = .707106781) : (r = Math.sqrt(s), n = v / r, i = b / r) : _ < a ? (n = .707106781, r = .707106781, i = 0) : (i = Math.sqrt(_), n = y / i, r = b / i), this.set(n, r, i, t), this;
		}
		let _ = Math.sqrt((h - p) * (h - p) + (u - m) * (u - m) + (d - l) * (d - l));
		return Math.abs(_) < .001 && (_ = 1), this.x = (h - p) / _, this.y = (u - m) / _, this.z = (d - l) / _, this.w = Math.acos((c + f + g - 1) / 2), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this.w = t[15], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this.w = Math.min(this.w, e.w), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this.w = Math.max(this.w, e.w), this;
	}
	clamp(e, t) {
		return this.x = L(this.x, e.x, t.x), this.y = L(this.y, e.y, t.y), this.z = L(this.z, e.z, t.z), this.w = L(this.w, e.w, t.w), this;
	}
	clampScalar(e, t) {
		return this.x = L(this.x, e, t), this.y = L(this.y, e, t), this.z = L(this.z, e, t), this.w = L(this.w, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(L(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this.w = Math.floor(this.w), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this.w = Math.ceil(this.w), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this.w = Math.round(this.w), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this.w = Math.trunc(this.w), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this.w = -this.w, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z + this.w * e.w;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this.w += (e.w - this.w) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this.w = e.w + (t.w - e.w) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z && e.w === this.w;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this.w = e[t + 3], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e[t + 3] = this.w, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this.w = e.getW(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this.w = Math.random(), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y, yield this.z, yield this.w;
	}
}, Be = class extends M {
	constructor(e = 1, t = 1, n = {}) {
		super(), n = Object.assign({
			generateMipmaps: !1,
			internalFormat: null,
			minFilter: o,
			depthBuffer: !0,
			stencilBuffer: !1,
			resolveDepthBuffer: !0,
			resolveStencilBuffer: !0,
			depthTexture: null,
			samples: 0,
			count: 1,
			depth: 1,
			multiview: !1
		}, n), this.isRenderTarget = !0, this.width = e, this.height = t, this.depth = n.depth, this.scissor = new ze(0, 0, e, t), this.scissorTest = !1, this.viewport = new ze(0, 0, e, t);
		let r = new q({
			width: e,
			height: t,
			depth: n.depth
		});
		this.textures = [];
		let i = n.count;
		for (let e = 0; e < i; e++) this.textures[e] = r.clone(), this.textures[e].isRenderTargetTexture = !0, this.textures[e].renderTarget = this;
		this._setTextureOptions(n), this.depthBuffer = n.depthBuffer, this.stencilBuffer = n.stencilBuffer, this.resolveDepthBuffer = n.resolveDepthBuffer, this.resolveStencilBuffer = n.resolveStencilBuffer, this._depthTexture = null, this.depthTexture = n.depthTexture, this.samples = n.samples, this.multiview = n.multiview;
	}
	_setTextureOptions(e = {}) {
		let t = {
			minFilter: o,
			generateMipmaps: !1,
			flipY: !1,
			internalFormat: null
		};
		e.mapping !== void 0 && (t.mapping = e.mapping), e.wrapS !== void 0 && (t.wrapS = e.wrapS), e.wrapT !== void 0 && (t.wrapT = e.wrapT), e.wrapR !== void 0 && (t.wrapR = e.wrapR), e.magFilter !== void 0 && (t.magFilter = e.magFilter), e.minFilter !== void 0 && (t.minFilter = e.minFilter), e.format !== void 0 && (t.format = e.format), e.type !== void 0 && (t.type = e.type), e.anisotropy !== void 0 && (t.anisotropy = e.anisotropy), e.colorSpace !== void 0 && (t.colorSpace = e.colorSpace), e.flipY !== void 0 && (t.flipY = e.flipY), e.generateMipmaps !== void 0 && (t.generateMipmaps = e.generateMipmaps), e.internalFormat !== void 0 && (t.internalFormat = e.internalFormat);
		for (let e = 0; e < this.textures.length; e++) this.textures[e].setValues(t);
	}
	get texture() {
		return this.textures[0];
	}
	set texture(e) {
		this.textures[0] = e;
	}
	set depthTexture(e) {
		this._depthTexture !== null && (this._depthTexture.renderTarget = null), e !== null && (e.renderTarget = this), this._depthTexture = e;
	}
	get depthTexture() {
		return this._depthTexture;
	}
	setSize(e, t, n = 1) {
		if (this.width !== e || this.height !== t || this.depth !== n) {
			this.width = e, this.height = t, this.depth = n;
			for (let r = 0, i = this.textures.length; r < i; r++) this.textures[r].image.width = e, this.textures[r].image.height = t, this.textures[r].image.depth = n, this.textures[r].isArrayTexture = this.textures[r].image.depth > 1;
			this.dispose();
		}
		this.viewport.set(0, 0, e, t), this.scissor.set(0, 0, e, t);
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.width = e.width, this.height = e.height, this.depth = e.depth, this.scissor.copy(e.scissor), this.scissorTest = e.scissorTest, this.viewport.copy(e.viewport), this.textures.length = 0;
		for (let t = 0, n = e.textures.length; t < n; t++) {
			this.textures[t] = e.textures[t].clone(), this.textures[t].isRenderTargetTexture = !0, this.textures[t].renderTarget = this;
			let n = Object.assign({}, e.textures[t].image);
			this.textures[t].source = new Fe(n);
		}
		return this.depthBuffer = e.depthBuffer, this.stencilBuffer = e.stencilBuffer, this.resolveDepthBuffer = e.resolveDepthBuffer, this.resolveStencilBuffer = e.resolveStencilBuffer, e.depthTexture !== null && (this.depthTexture = e.depthTexture.clone()), this.samples = e.samples, this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, Ve = class extends Be {
	constructor(e = 1, t = 1, n = {}) {
		super(e, t, n), this.isWebGLRenderTarget = !0;
	}
}, He = class extends q {
	constructor(e = null, n = 1, i = 1, a = 1) {
		super(null), this.isDataArrayTexture = !0, this.image = {
			data: e,
			width: n,
			height: i,
			depth: a
		}, this.magFilter = r, this.minFilter = r, this.wrapR = t, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1, this.layerUpdates = /* @__PURE__ */ new Set();
	}
	addLayerUpdate(e) {
		this.layerUpdates.add(e);
	}
	clearLayerUpdates() {
		this.layerUpdates.clear();
	}
}, Ue = class extends q {
	constructor(e = null, n = 1, i = 1, a = 1) {
		super(null), this.isData3DTexture = !0, this.image = {
			data: e,
			width: n,
			height: i,
			depth: a
		}, this.magFilter = r, this.minFilter = r, this.wrapR = t, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
	}
}, We = class {
	constructor(e = new W(Infinity, Infinity, Infinity), t = new W(-Infinity, -Infinity, -Infinity)) {
		this.isBox3 = !0, this.min = e, this.max = t;
	}
	set(e, t) {
		return this.min.copy(e), this.max.copy(t), this;
	}
	setFromArray(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t += 3) this.expandByPoint(Ke.fromArray(e, t));
		return this;
	}
	setFromBufferAttribute(e) {
		this.makeEmpty();
		for (let t = 0, n = e.count; t < n; t++) this.expandByPoint(Ke.fromBufferAttribute(e, t));
		return this;
	}
	setFromPoints(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t++) this.expandByPoint(e[t]);
		return this;
	}
	setFromCenterAndSize(e, t) {
		let n = Ke.copy(t).multiplyScalar(.5);
		return this.min.copy(e).sub(n), this.max.copy(e).add(n), this;
	}
	setFromObject(e, t = !1) {
		return this.makeEmpty(), this.expandByObject(e, t);
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.min.copy(e.min), this.max.copy(e.max), this;
	}
	makeEmpty() {
		return this.min.x = this.min.y = this.min.z = Infinity, this.max.x = this.max.y = this.max.z = -Infinity, this;
	}
	isEmpty() {
		return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
	}
	getCenter(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.addVectors(this.min, this.max).multiplyScalar(.5);
	}
	getSize(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.subVectors(this.max, this.min);
	}
	expandByPoint(e) {
		return this.min.min(e), this.max.max(e), this;
	}
	expandByVector(e) {
		return this.min.sub(e), this.max.add(e), this;
	}
	expandByScalar(e) {
		return this.min.addScalar(-e), this.max.addScalar(e), this;
	}
	expandByObject(e, t = !1) {
		e.updateWorldMatrix(!1, !1);
		let n = e.geometry;
		if (n !== void 0) {
			let r = n.getAttribute("position");
			if (t === !0 && r !== void 0 && e.isInstancedMesh !== !0) for (let t = 0, n = r.count; t < n; t++) e.isMesh === !0 ? e.getVertexPosition(t, Ke) : Ke.fromBufferAttribute(r, t), Ke.applyMatrix4(e.matrixWorld), this.expandByPoint(Ke);
			else e.boundingBox === void 0 ? (n.boundingBox === null && n.computeBoundingBox(), qe.copy(n.boundingBox)) : (e.boundingBox === null && e.computeBoundingBox(), qe.copy(e.boundingBox)), qe.applyMatrix4(e.matrixWorld), this.union(qe);
		}
		let r = e.children;
		for (let e = 0, n = r.length; e < n; e++) this.expandByObject(r[e], t);
		return this;
	}
	containsPoint(e) {
		return e.x >= this.min.x && e.x <= this.max.x && e.y >= this.min.y && e.y <= this.max.y && e.z >= this.min.z && e.z <= this.max.z;
	}
	containsBox(e) {
		return this.min.x <= e.min.x && e.max.x <= this.max.x && this.min.y <= e.min.y && e.max.y <= this.max.y && this.min.z <= e.min.z && e.max.z <= this.max.z;
	}
	getParameter(e, t) {
		return t.set((e.x - this.min.x) / (this.max.x - this.min.x), (e.y - this.min.y) / (this.max.y - this.min.y), (e.z - this.min.z) / (this.max.z - this.min.z));
	}
	intersectsBox(e) {
		return e.max.x >= this.min.x && e.min.x <= this.max.x && e.max.y >= this.min.y && e.min.y <= this.max.y && e.max.z >= this.min.z && e.min.z <= this.max.z;
	}
	intersectsSphere(e) {
		return this.clampPoint(e.center, Ke), Ke.distanceToSquared(e.center) <= e.radius * e.radius;
	}
	intersectsPlane(e) {
		let t, n;
		return e.normal.x > 0 ? (t = e.normal.x * this.min.x, n = e.normal.x * this.max.x) : (t = e.normal.x * this.max.x, n = e.normal.x * this.min.x), e.normal.y > 0 ? (t += e.normal.y * this.min.y, n += e.normal.y * this.max.y) : (t += e.normal.y * this.max.y, n += e.normal.y * this.min.y), e.normal.z > 0 ? (t += e.normal.z * this.min.z, n += e.normal.z * this.max.z) : (t += e.normal.z * this.max.z, n += e.normal.z * this.min.z), t <= -e.constant && n >= -e.constant;
	}
	intersectsTriangle(e) {
		if (this.isEmpty()) return !1;
		this.getCenter(et), tt.subVectors(this.max, et), Je.subVectors(e.a, et), Ye.subVectors(e.b, et), Xe.subVectors(e.c, et), Ze.subVectors(Ye, Je), Qe.subVectors(Xe, Ye), $e.subVectors(Je, Xe);
		let t = [
			0,
			-Ze.z,
			Ze.y,
			0,
			-Qe.z,
			Qe.y,
			0,
			-$e.z,
			$e.y,
			Ze.z,
			0,
			-Ze.x,
			Qe.z,
			0,
			-Qe.x,
			$e.z,
			0,
			-$e.x,
			-Ze.y,
			Ze.x,
			0,
			-Qe.y,
			Qe.x,
			0,
			-$e.y,
			$e.x,
			0
		];
		return !it(t, Je, Ye, Xe, tt) || (t = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], !it(t, Je, Ye, Xe, tt)) ? !1 : (nt.crossVectors(Ze, Qe), t = [
			nt.x,
			nt.y,
			nt.z
		], it(t, Je, Ye, Xe, tt));
	}
	clampPoint(e, t) {
		return t.copy(e).clamp(this.min, this.max);
	}
	distanceToPoint(e) {
		return this.clampPoint(e, Ke).distanceTo(e);
	}
	getBoundingSphere(e) {
		return this.isEmpty() ? e.makeEmpty() : (this.getCenter(e.center), e.radius = this.getSize(Ke).length() * .5), e;
	}
	intersect(e) {
		return this.min.max(e.min), this.max.min(e.max), this.isEmpty() && this.makeEmpty(), this;
	}
	union(e) {
		return this.min.min(e.min), this.max.max(e.max), this;
	}
	applyMatrix4(e) {
		return this.isEmpty() ? this : (Ge[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(e), Ge[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(e), Ge[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(e), Ge[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(e), Ge[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(e), Ge[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(e), Ge[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(e), Ge[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(e), this.setFromPoints(Ge), this);
	}
	translate(e) {
		return this.min.add(e), this.max.add(e), this;
	}
	equals(e) {
		return e.min.equals(this.min) && e.max.equals(this.max);
	}
	toJSON() {
		return {
			min: this.min.toArray(),
			max: this.max.toArray()
		};
	}
	fromJSON(e) {
		return this.min.fromArray(e.min), this.max.fromArray(e.max), this;
	}
}, Ge = [
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W()
], Ke = /*@__PURE__*/ new W(), qe = /*@__PURE__*/ new We(), Je = /*@__PURE__*/ new W(), Ye = /*@__PURE__*/ new W(), Xe = /*@__PURE__*/ new W(), Ze = /*@__PURE__*/ new W(), Qe = /*@__PURE__*/ new W(), $e = /*@__PURE__*/ new W(), et = /*@__PURE__*/ new W(), tt = /*@__PURE__*/ new W(), nt = /*@__PURE__*/ new W(), rt = /*@__PURE__*/ new W();
function it(e, t, n, r, i) {
	for (let a = 0, o = e.length - 3; a <= o; a += 3) {
		rt.fromArray(e, a);
		let o = i.x * Math.abs(rt.x) + i.y * Math.abs(rt.y) + i.z * Math.abs(rt.z), s = t.dot(rt), c = n.dot(rt), l = r.dot(rt);
		if (Math.max(-Math.max(s, c, l), Math.min(s, c, l)) > o) return !1;
	}
	return !0;
}
var at = /*@__PURE__*/ new We(), ot = /*@__PURE__*/ new W(), st = /*@__PURE__*/ new W(), ct = class {
	constructor(e = new W(), t = -1) {
		this.isSphere = !0, this.center = e, this.radius = t;
	}
	set(e, t) {
		return this.center.copy(e), this.radius = t, this;
	}
	setFromPoints(e, t) {
		let n = this.center;
		t === void 0 ? at.setFromPoints(e).getCenter(n) : n.copy(t);
		let r = 0;
		for (let t = 0, i = e.length; t < i; t++) r = Math.max(r, n.distanceToSquared(e[t]));
		return this.radius = Math.sqrt(r), this;
	}
	copy(e) {
		return this.center.copy(e.center), this.radius = e.radius, this;
	}
	isEmpty() {
		return this.radius < 0;
	}
	makeEmpty() {
		return this.center.set(0, 0, 0), this.radius = -1, this;
	}
	containsPoint(e) {
		return e.distanceToSquared(this.center) <= this.radius * this.radius;
	}
	distanceToPoint(e) {
		return e.distanceTo(this.center) - this.radius;
	}
	intersectsSphere(e) {
		let t = this.radius + e.radius;
		return e.center.distanceToSquared(this.center) <= t * t;
	}
	intersectsBox(e) {
		return e.intersectsSphere(this);
	}
	intersectsPlane(e) {
		return Math.abs(e.distanceToPoint(this.center)) <= this.radius;
	}
	clampPoint(e, t) {
		let n = this.center.distanceToSquared(e);
		return t.copy(e), n > this.radius * this.radius && (t.sub(this.center).normalize(), t.multiplyScalar(this.radius).add(this.center)), t;
	}
	getBoundingBox(e) {
		return this.isEmpty() ? (e.makeEmpty(), e) : (e.set(this.center, this.center), e.expandByScalar(this.radius), e);
	}
	applyMatrix4(e) {
		return this.center.applyMatrix4(e), this.radius *= e.getMaxScaleOnAxis(), this;
	}
	translate(e) {
		return this.center.add(e), this;
	}
	expandByPoint(e) {
		if (this.isEmpty()) return this.center.copy(e), this.radius = 0, this;
		ot.subVectors(e, this.center);
		let t = ot.lengthSq();
		if (t > this.radius * this.radius) {
			let e = Math.sqrt(t), n = (e - this.radius) * .5;
			this.center.addScaledVector(ot, n / e), this.radius += n;
		}
		return this;
	}
	union(e) {
		return e.isEmpty() ? this : this.isEmpty() ? (this.copy(e), this) : (this.center.equals(e.center) === !0 ? this.radius = Math.max(this.radius, e.radius) : (st.subVectors(e.center, this.center).setLength(e.radius), this.expandByPoint(ot.copy(e.center).add(st)), this.expandByPoint(ot.copy(e.center).sub(st))), this);
	}
	equals(e) {
		return e.center.equals(this.center) && e.radius === this.radius;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		return {
			radius: this.radius,
			center: this.center.toArray()
		};
	}
	fromJSON(e) {
		return this.radius = e.radius, this.center.fromArray(e.center), this;
	}
}, lt = /*@__PURE__*/ new W(), ut = /*@__PURE__*/ new W(), dt = /*@__PURE__*/ new W(), ft = /*@__PURE__*/ new W(), pt = /*@__PURE__*/ new W(), mt = /*@__PURE__*/ new W(), ht = /*@__PURE__*/ new W(), gt = class {
	constructor(e = new W(), t = new W(0, 0, -1)) {
		this.origin = e, this.direction = t;
	}
	set(e, t) {
		return this.origin.copy(e), this.direction.copy(t), this;
	}
	copy(e) {
		return this.origin.copy(e.origin), this.direction.copy(e.direction), this;
	}
	at(e, t) {
		return t.copy(this.origin).addScaledVector(this.direction, e);
	}
	lookAt(e) {
		return this.direction.copy(e).sub(this.origin).normalize(), this;
	}
	recast(e) {
		return this.origin.copy(this.at(e, lt)), this;
	}
	closestPointToPoint(e, t) {
		t.subVectors(e, this.origin);
		let n = t.dot(this.direction);
		return n < 0 ? t.copy(this.origin) : t.copy(this.origin).addScaledVector(this.direction, n);
	}
	distanceToPoint(e) {
		return Math.sqrt(this.distanceSqToPoint(e));
	}
	distanceSqToPoint(e) {
		let t = lt.subVectors(e, this.origin).dot(this.direction);
		return t < 0 ? this.origin.distanceToSquared(e) : (lt.copy(this.origin).addScaledVector(this.direction, t), lt.distanceToSquared(e));
	}
	distanceSqToSegment(e, t, n, r) {
		ut.copy(e).add(t).multiplyScalar(.5), dt.copy(t).sub(e).normalize(), ft.copy(this.origin).sub(ut);
		let i = e.distanceTo(t) * .5, a = -this.direction.dot(dt), o = ft.dot(this.direction), s = -ft.dot(dt), c = ft.lengthSq(), l = Math.abs(1 - a * a), u, d, f, p;
		if (l > 0) {
			if (u = a * s - o, d = a * o - s, p = i * l, u >= 0) {
				if (d >= -p) {
					if (d <= p) {
						let e = 1 / l;
						u *= e, d *= e, f = u * (u + a * d + 2 * o) + d * (a * u + d + 2 * s) + c;
					} else d = i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
				} else d = -i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
			} else d <= -p ? (u = Math.max(0, -(-a * i + o)), d = u > 0 ? -i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c) : d <= p ? (u = 0, d = Math.min(Math.max(-i, -s), i), f = d * (d + 2 * s) + c) : (u = Math.max(0, -(a * i + o)), d = u > 0 ? i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c);
		} else d = a > 0 ? -i : i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
		return n && n.copy(this.origin).addScaledVector(this.direction, u), r && r.copy(ut).addScaledVector(dt, d), f;
	}
	intersectSphere(e, t) {
		lt.subVectors(e.center, this.origin);
		let n = lt.dot(this.direction), r = lt.dot(lt) - n * n, i = e.radius * e.radius;
		if (r > i) return null;
		let a = Math.sqrt(i - r), o = n - a, s = n + a;
		return s < 0 ? null : o < 0 ? this.at(s, t) : this.at(o, t);
	}
	intersectsSphere(e) {
		return e.radius < 0 ? !1 : this.distanceSqToPoint(e.center) <= e.radius * e.radius;
	}
	distanceToPlane(e) {
		let t = e.normal.dot(this.direction);
		if (t === 0) return e.distanceToPoint(this.origin) === 0 ? 0 : null;
		let n = -(this.origin.dot(e.normal) + e.constant) / t;
		return n >= 0 ? n : null;
	}
	intersectPlane(e, t) {
		let n = this.distanceToPlane(e);
		return n === null ? null : this.at(n, t);
	}
	intersectsPlane(e) {
		let t = e.distanceToPoint(this.origin);
		return t === 0 || e.normal.dot(this.direction) * t < 0;
	}
	intersectBox(e, t) {
		let n, r, i, a, o, s, c = 1 / this.direction.x, l = 1 / this.direction.y, u = 1 / this.direction.z, d = this.origin;
		return c >= 0 ? (n = (e.min.x - d.x) * c, r = (e.max.x - d.x) * c) : (n = (e.max.x - d.x) * c, r = (e.min.x - d.x) * c), l >= 0 ? (i = (e.min.y - d.y) * l, a = (e.max.y - d.y) * l) : (i = (e.max.y - d.y) * l, a = (e.min.y - d.y) * l), n > a || i > r || ((i > n || isNaN(n)) && (n = i), (a < r || isNaN(r)) && (r = a), u >= 0 ? (o = (e.min.z - d.z) * u, s = (e.max.z - d.z) * u) : (o = (e.max.z - d.z) * u, s = (e.min.z - d.z) * u), n > s || o > r) || ((o > n || n !== n) && (n = o), (s < r || r !== r) && (r = s), r < 0) ? null : this.at(n >= 0 ? n : r, t);
	}
	intersectsBox(e) {
		return this.intersectBox(e, lt) !== null;
	}
	intersectTriangle(e, t, n, r, i) {
		pt.subVectors(t, e), mt.subVectors(n, e), ht.crossVectors(pt, mt);
		let a = this.direction.dot(ht), o;
		if (a > 0) {
			if (r) return null;
			o = 1;
		} else if (a < 0) o = -1, a = -a;
		else return null;
		ft.subVectors(this.origin, e);
		let s = o * this.direction.dot(mt.crossVectors(ft, mt));
		if (s < 0) return null;
		let c = o * this.direction.dot(pt.cross(ft));
		if (c < 0 || s + c > a) return null;
		let l = -o * ft.dot(ht);
		return l < 0 ? null : this.at(l / a, i);
	}
	applyMatrix4(e) {
		return this.origin.applyMatrix4(e), this.direction.transformDirection(e), this;
	}
	equals(e) {
		return e.origin.equals(this.origin) && e.direction.equals(this.direction);
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, J = class e {
	constructor(t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g) {
		e.prototype.isMatrix4 = !0, this.elements = [
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1
		], t !== void 0 && this.set(t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g);
	}
	set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		let g = this.elements;
		return g[0] = e, g[4] = t, g[8] = n, g[12] = r, g[1] = i, g[5] = a, g[9] = o, g[13] = s, g[2] = c, g[6] = l, g[10] = u, g[14] = d, g[3] = f, g[7] = p, g[11] = m, g[15] = h, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	clone() {
		return new e().fromArray(this.elements);
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], t[9] = n[9], t[10] = n[10], t[11] = n[11], t[12] = n[12], t[13] = n[13], t[14] = n[14], t[15] = n[15], this;
	}
	copyPosition(e) {
		let t = this.elements, n = e.elements;
		return t[12] = n[12], t[13] = n[13], t[14] = n[14], this;
	}
	setFromMatrix3(e) {
		let t = e.elements;
		return this.set(t[0], t[3], t[6], 0, t[1], t[4], t[7], 0, t[2], t[5], t[8], 0, 0, 0, 0, 1), this;
	}
	extractBasis(e, t, n) {
		return e.setFromMatrixColumn(this, 0), t.setFromMatrixColumn(this, 1), n.setFromMatrixColumn(this, 2), this;
	}
	makeBasis(e, t, n) {
		return this.set(e.x, t.x, n.x, 0, e.y, t.y, n.y, 0, e.z, t.z, n.z, 0, 0, 0, 0, 1), this;
	}
	extractRotation(e) {
		let t = this.elements, n = e.elements, r = 1 / _t.setFromMatrixColumn(e, 0).length(), i = 1 / _t.setFromMatrixColumn(e, 1).length(), a = 1 / _t.setFromMatrixColumn(e, 2).length();
		return t[0] = n[0] * r, t[1] = n[1] * r, t[2] = n[2] * r, t[3] = 0, t[4] = n[4] * i, t[5] = n[5] * i, t[6] = n[6] * i, t[7] = 0, t[8] = n[8] * a, t[9] = n[9] * a, t[10] = n[10] * a, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromEuler(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z, a = Math.cos(n), o = Math.sin(n), s = Math.cos(r), c = Math.sin(r), l = Math.cos(i), u = Math.sin(i);
		if (e.order === "XYZ") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = -s * u, t[8] = c, t[1] = n + r * c, t[5] = e - i * c, t[9] = -o * s, t[2] = i - e * c, t[6] = r + n * c, t[10] = a * s;
		} else if (e.order === "YXZ") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e + i * o, t[4] = r * o - n, t[8] = a * c, t[1] = a * u, t[5] = a * l, t[9] = -o, t[2] = n * o - r, t[6] = i + e * o, t[10] = a * s;
		} else if (e.order === "ZXY") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e - i * o, t[4] = -a * u, t[8] = r + n * o, t[1] = n + r * o, t[5] = a * l, t[9] = i - e * o, t[2] = -a * c, t[6] = o, t[10] = a * s;
		} else if (e.order === "ZYX") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = r * c - n, t[8] = e * c + i, t[1] = s * u, t[5] = i * c + e, t[9] = n * c - r, t[2] = -c, t[6] = o * s, t[10] = a * s;
		} else if (e.order === "YZX") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = i - e * u, t[8] = r * u + n, t[1] = u, t[5] = a * l, t[9] = -o * l, t[2] = -c * l, t[6] = n * u + r, t[10] = e - i * u;
		} else if (e.order === "XZY") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = -u, t[8] = c * l, t[1] = e * u + i, t[5] = a * l, t[9] = n * u - r, t[2] = r * u - n, t[6] = o * l, t[10] = i * u + e;
		}
		return t[3] = 0, t[7] = 0, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromQuaternion(e) {
		return this.compose(yt, e, bt);
	}
	lookAt(e, t, n) {
		let r = this.elements;
		return Ct.subVectors(e, t), Ct.lengthSq() === 0 && (Ct.z = 1), Ct.normalize(), xt.crossVectors(n, Ct), xt.lengthSq() === 0 && (Math.abs(n.z) === 1 ? Ct.x += 1e-4 : Ct.z += 1e-4, Ct.normalize(), xt.crossVectors(n, Ct)), xt.normalize(), St.crossVectors(Ct, xt), r[0] = xt.x, r[4] = St.x, r[8] = Ct.x, r[1] = xt.y, r[5] = St.y, r[9] = Ct.y, r[2] = xt.z, r[6] = St.z, r[10] = Ct.z, this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[4], s = n[8], c = n[12], l = n[1], u = n[5], d = n[9], f = n[13], p = n[2], m = n[6], h = n[10], g = n[14], _ = n[3], v = n[7], y = n[11], b = n[15], x = r[0], S = r[4], C = r[8], w = r[12], T = r[1], E = r[5], D = r[9], O = r[13], k = r[2], A = r[6], j = r[10], M = r[14], N = r[3], P = r[7], F = r[11], ee = r[15];
		return i[0] = a * x + o * T + s * k + c * N, i[4] = a * S + o * E + s * A + c * P, i[8] = a * C + o * D + s * j + c * F, i[12] = a * w + o * O + s * M + c * ee, i[1] = l * x + u * T + d * k + f * N, i[5] = l * S + u * E + d * A + f * P, i[9] = l * C + u * D + d * j + f * F, i[13] = l * w + u * O + d * M + f * ee, i[2] = p * x + m * T + h * k + g * N, i[6] = p * S + m * E + h * A + g * P, i[10] = p * C + m * D + h * j + g * F, i[14] = p * w + m * O + h * M + g * ee, i[3] = _ * x + v * T + y * k + b * N, i[7] = _ * S + v * E + y * A + b * P, i[11] = _ * C + v * D + y * j + b * F, i[15] = _ * w + v * O + y * M + b * ee, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[4] *= e, t[8] *= e, t[12] *= e, t[1] *= e, t[5] *= e, t[9] *= e, t[13] *= e, t[2] *= e, t[6] *= e, t[10] *= e, t[14] *= e, t[3] *= e, t[7] *= e, t[11] *= e, t[15] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[4], r = e[8], i = e[12], a = e[1], o = e[5], s = e[9], c = e[13], l = e[2], u = e[6], d = e[10], f = e[14], p = e[3], m = e[7], h = e[11], g = e[15];
		return p * (+i * s * u - r * c * u - i * o * d + n * c * d + r * o * f - n * s * f) + m * (+t * s * f - t * c * d + i * a * d - r * a * f + r * c * l - i * s * l) + h * (+t * c * u - t * o * f - i * a * u + n * a * f + i * o * l - n * c * l) + g * (-r * o * l - t * s * u + t * o * d + r * a * u - n * a * d + n * s * l);
	}
	transpose() {
		let e = this.elements, t;
		return t = e[1], e[1] = e[4], e[4] = t, t = e[2], e[2] = e[8], e[8] = t, t = e[6], e[6] = e[9], e[9] = t, t = e[3], e[3] = e[12], e[12] = t, t = e[7], e[7] = e[13], e[13] = t, t = e[11], e[11] = e[14], e[14] = t, this;
	}
	setPosition(e, t, n) {
		let r = this.elements;
		return e.isVector3 ? (r[12] = e.x, r[13] = e.y, r[14] = e.z) : (r[12] = e, r[13] = t, r[14] = n), this;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = e[9], d = e[10], f = e[11], p = e[12], m = e[13], h = e[14], g = e[15], _ = u * h * c - m * d * c + m * s * f - o * h * f - u * s * g + o * d * g, v = p * d * c - l * h * c - p * s * f + a * h * f + l * s * g - a * d * g, y = l * m * c - p * u * c + p * o * f - a * m * f - l * o * g + a * u * g, b = p * u * s - l * m * s - p * o * d + a * m * d + l * o * h - a * u * h, x = t * _ + n * v + r * y + i * b;
		if (x === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
		let S = 1 / x;
		return e[0] = _ * S, e[1] = (m * d * i - u * h * i - m * r * f + n * h * f + u * r * g - n * d * g) * S, e[2] = (o * h * i - m * s * i + m * r * c - n * h * c - o * r * g + n * s * g) * S, e[3] = (u * s * i - o * d * i - u * r * c + n * d * c + o * r * f - n * s * f) * S, e[4] = v * S, e[5] = (l * h * i - p * d * i + p * r * f - t * h * f - l * r * g + t * d * g) * S, e[6] = (p * s * i - a * h * i - p * r * c + t * h * c + a * r * g - t * s * g) * S, e[7] = (a * d * i - l * s * i + l * r * c - t * d * c - a * r * f + t * s * f) * S, e[8] = y * S, e[9] = (p * u * i - l * m * i - p * n * f + t * m * f + l * n * g - t * u * g) * S, e[10] = (a * m * i - p * o * i + p * n * c - t * m * c - a * n * g + t * o * g) * S, e[11] = (l * o * i - a * u * i - l * n * c + t * u * c + a * n * f - t * o * f) * S, e[12] = b * S, e[13] = (l * m * r - p * u * r + p * n * d - t * m * d - l * n * h + t * u * h) * S, e[14] = (p * o * r - a * m * r - p * n * s + t * m * s + a * n * h - t * o * h) * S, e[15] = (a * u * r - l * o * r + l * n * s - t * u * s - a * n * d + t * o * d) * S, this;
	}
	scale(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z;
		return t[0] *= n, t[4] *= r, t[8] *= i, t[1] *= n, t[5] *= r, t[9] *= i, t[2] *= n, t[6] *= r, t[10] *= i, t[3] *= n, t[7] *= r, t[11] *= i, this;
	}
	getMaxScaleOnAxis() {
		let e = this.elements, t = e[0] * e[0] + e[1] * e[1] + e[2] * e[2], n = e[4] * e[4] + e[5] * e[5] + e[6] * e[6], r = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
		return Math.sqrt(Math.max(t, n, r));
	}
	makeTranslation(e, t, n) {
		return e.isVector3 ? this.set(1, 0, 0, e.x, 0, 1, 0, e.y, 0, 0, 1, e.z, 0, 0, 0, 1) : this.set(1, 0, 0, e, 0, 1, 0, t, 0, 0, 1, n, 0, 0, 0, 1), this;
	}
	makeRotationX(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(1, 0, 0, 0, 0, t, -n, 0, 0, n, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationY(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, 0, n, 0, 0, 1, 0, 0, -n, 0, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationZ(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, 0, n, t, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	makeRotationAxis(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = 1 - n, a = e.x, o = e.y, s = e.z, c = i * a, l = i * o;
		return this.set(c * a + n, c * o - r * s, c * s + r * o, 0, c * o + r * s, l * o + n, l * s - r * a, 0, c * s - r * o, l * s + r * a, i * s * s + n, 0, 0, 0, 0, 1), this;
	}
	makeScale(e, t, n) {
		return this.set(e, 0, 0, 0, 0, t, 0, 0, 0, 0, n, 0, 0, 0, 0, 1), this;
	}
	makeShear(e, t, n, r, i, a) {
		return this.set(1, n, i, 0, e, 1, a, 0, t, r, 1, 0, 0, 0, 0, 1), this;
	}
	compose(e, t, n) {
		let r = this.elements, i = t._x, a = t._y, o = t._z, s = t._w, c = i + i, l = a + a, u = o + o, d = i * c, f = i * l, p = i * u, m = a * l, h = a * u, g = o * u, _ = s * c, v = s * l, y = s * u, b = n.x, x = n.y, S = n.z;
		return r[0] = (1 - (m + g)) * b, r[1] = (f + y) * b, r[2] = (p - v) * b, r[3] = 0, r[4] = (f - y) * x, r[5] = (1 - (d + g)) * x, r[6] = (h + _) * x, r[7] = 0, r[8] = (p + v) * S, r[9] = (h - _) * S, r[10] = (1 - (d + m)) * S, r[11] = 0, r[12] = e.x, r[13] = e.y, r[14] = e.z, r[15] = 1, this;
	}
	decompose(e, t, n) {
		let r = this.elements, i = _t.set(r[0], r[1], r[2]).length(), a = _t.set(r[4], r[5], r[6]).length(), o = _t.set(r[8], r[9], r[10]).length();
		this.determinant() < 0 && (i = -i), e.x = r[12], e.y = r[13], e.z = r[14], vt.copy(this);
		let s = 1 / i, c = 1 / a, l = 1 / o;
		return vt.elements[0] *= s, vt.elements[1] *= s, vt.elements[2] *= s, vt.elements[4] *= c, vt.elements[5] *= c, vt.elements[6] *= c, vt.elements[8] *= l, vt.elements[9] *= l, vt.elements[10] *= l, t.setFromRotationMatrix(vt), n.x = i, n.y = a, n.z = o, this;
	}
	makePerspective(e, t, n, r, i, a, o = j, s = !1) {
		let c = this.elements, l = 2 * i / (t - e), u = 2 * i / (n - r), d = (t + e) / (t - e), f = (n + r) / (n - r), p, m;
		if (s) p = i / (a - i), m = a * i / (a - i);
		else if (o === 2e3) p = -(a + i) / (a - i), m = -2 * a * i / (a - i);
		else if (o === 2001) p = -a / (a - i), m = -a * i / (a - i);
		else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = d, c[12] = 0, c[1] = 0, c[5] = u, c[9] = f, c[13] = 0, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = -1, c[15] = 0, this;
	}
	makeOrthographic(e, t, n, r, i, a, o = j, s = !1) {
		let c = this.elements, l = 2 / (t - e), u = 2 / (n - r), d = -(t + e) / (t - e), f = -(n + r) / (n - r), p, m;
		if (s) p = 1 / (a - i), m = a / (a - i);
		else if (o === 2e3) p = -2 / (a - i), m = -(a + i) / (a - i);
		else if (o === 2001) p = -1 / (a - i), m = -i / (a - i);
		else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = 0, c[12] = d, c[1] = 0, c[5] = u, c[9] = 0, c[13] = f, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = 0, c[15] = 1, this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 16; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 16; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e[t + 9] = n[9], e[t + 10] = n[10], e[t + 11] = n[11], e[t + 12] = n[12], e[t + 13] = n[13], e[t + 14] = n[14], e[t + 15] = n[15], e;
	}
}, _t = /*@__PURE__*/ new W(), vt = /*@__PURE__*/ new J(), yt = /*@__PURE__*/ new W(0, 0, 0), bt = /*@__PURE__*/ new W(1, 1, 1), xt = /*@__PURE__*/ new W(), St = /*@__PURE__*/ new W(), Ct = /*@__PURE__*/ new W(), wt = /*@__PURE__*/ new J(), Tt = /*@__PURE__*/ new U(), Et = class e {
	constructor(t = 0, n = 0, r = 0, i = e.DEFAULT_ORDER) {
		this.isEuler = !0, this._x = t, this._y = n, this._z = r, this._order = i;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get order() {
		return this._order;
	}
	set order(e) {
		this._order = e, this._onChangeCallback();
	}
	set(e, t, n, r = this._order) {
		return this._x = e, this._y = t, this._z = n, this._order = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._order);
	}
	copy(e) {
		return this._x = e._x, this._y = e._y, this._z = e._z, this._order = e._order, this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e, t = this._order, n = !0) {
		let r = e.elements, i = r[0], a = r[4], o = r[8], s = r[1], c = r[5], l = r[9], u = r[2], d = r[6], f = r[10];
		switch (t) {
			case "XYZ":
				this._y = Math.asin(L(o, -1, 1)), Math.abs(o) < .9999999 ? (this._x = Math.atan2(-l, f), this._z = Math.atan2(-a, i)) : (this._x = Math.atan2(d, c), this._z = 0);
				break;
			case "YXZ":
				this._x = Math.asin(-L(l, -1, 1)), Math.abs(l) < .9999999 ? (this._y = Math.atan2(o, f), this._z = Math.atan2(s, c)) : (this._y = Math.atan2(-u, i), this._z = 0);
				break;
			case "ZXY":
				this._x = Math.asin(L(d, -1, 1)), Math.abs(d) < .9999999 ? (this._y = Math.atan2(-u, f), this._z = Math.atan2(-a, c)) : (this._y = 0, this._z = Math.atan2(s, i));
				break;
			case "ZYX":
				this._y = Math.asin(-L(u, -1, 1)), Math.abs(u) < .9999999 ? (this._x = Math.atan2(d, f), this._z = Math.atan2(s, i)) : (this._x = 0, this._z = Math.atan2(-a, c));
				break;
			case "YZX":
				this._z = Math.asin(L(s, -1, 1)), Math.abs(s) < .9999999 ? (this._x = Math.atan2(-l, c), this._y = Math.atan2(-u, i)) : (this._x = 0, this._y = Math.atan2(o, f));
				break;
			case "XZY":
				this._z = Math.asin(-L(a, -1, 1)), Math.abs(a) < .9999999 ? (this._x = Math.atan2(d, c), this._y = Math.atan2(o, i)) : (this._x = Math.atan2(-l, f), this._y = 0);
				break;
			default: console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: " + t);
		}
		return this._order = t, n === !0 && this._onChangeCallback(), this;
	}
	setFromQuaternion(e, t, n) {
		return wt.makeRotationFromQuaternion(e), this.setFromRotationMatrix(wt, t, n);
	}
	setFromVector3(e, t = this._order) {
		return this.set(e.x, e.y, e.z, t);
	}
	reorder(e) {
		return Tt.setFromEuler(this), this.setFromQuaternion(Tt, e);
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._order === this._order;
	}
	fromArray(e) {
		return this._x = e[0], this._y = e[1], this._z = e[2], e[3] !== void 0 && (this._order = e[3]), this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._order, e;
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._order;
	}
};
Et.DEFAULT_ORDER = "XYZ";
var Dt = class {
	constructor() {
		this.mask = 1;
	}
	set(e) {
		this.mask = (1 << e | 0) >>> 0;
	}
	enable(e) {
		this.mask |= 1 << e | 0;
	}
	enableAll() {
		this.mask = -1;
	}
	toggle(e) {
		this.mask ^= 1 << e | 0;
	}
	disable(e) {
		this.mask &= ~(1 << e | 0);
	}
	disableAll() {
		this.mask = 0;
	}
	test(e) {
		return (this.mask & e.mask) !== 0;
	}
	isEnabled(e) {
		return !!(this.mask & (1 << e | 0));
	}
}, Ot = 0, kt = /*@__PURE__*/ new W(), At = /*@__PURE__*/ new U(), jt = /*@__PURE__*/ new J(), Mt = /*@__PURE__*/ new W(), Nt = /*@__PURE__*/ new W(), Pt = /*@__PURE__*/ new W(), Ft = /*@__PURE__*/ new U(), It = /*@__PURE__*/ new W(1, 0, 0), Lt = /*@__PURE__*/ new W(0, 1, 0), Rt = /*@__PURE__*/ new W(0, 0, 1), zt = { type: "added" }, Bt = { type: "removed" }, Vt = {
	type: "childadded",
	child: null
}, Ht = {
	type: "childremoved",
	child: null
}, Ut = class e extends M {
	constructor() {
		super(), this.isObject3D = !0, Object.defineProperty(this, "id", { value: Ot++ }), this.uuid = I(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = e.DEFAULT_UP.clone();
		let t = new W(), n = new Et(), r = new U(), i = new W(1, 1, 1);
		function a() {
			r.setFromEuler(n, !1);
		}
		function o() {
			n.setFromQuaternion(r, void 0, !1);
		}
		n._onChange(a), r._onChange(o), Object.defineProperties(this, {
			position: {
				configurable: !0,
				enumerable: !0,
				value: t
			},
			rotation: {
				configurable: !0,
				enumerable: !0,
				value: n
			},
			quaternion: {
				configurable: !0,
				enumerable: !0,
				value: r
			},
			scale: {
				configurable: !0,
				enumerable: !0,
				value: i
			},
			modelViewMatrix: { value: new J() },
			normalMatrix: { value: new G() }
		}), this.matrix = new J(), this.matrixWorld = new J(), this.matrixAutoUpdate = e.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = !1, this.layers = new Dt(), this.visible = !0, this.castShadow = !1, this.receiveShadow = !1, this.frustumCulled = !0, this.renderOrder = 0, this.animations = [], this.customDepthMaterial = void 0, this.customDistanceMaterial = void 0, this.userData = {};
	}
	onBeforeShadow() {}
	onAfterShadow() {}
	onBeforeRender() {}
	onAfterRender() {}
	applyMatrix4(e) {
		this.matrixAutoUpdate && this.updateMatrix(), this.matrix.premultiply(e), this.matrix.decompose(this.position, this.quaternion, this.scale);
	}
	applyQuaternion(e) {
		return this.quaternion.premultiply(e), this;
	}
	setRotationFromAxisAngle(e, t) {
		this.quaternion.setFromAxisAngle(e, t);
	}
	setRotationFromEuler(e) {
		this.quaternion.setFromEuler(e, !0);
	}
	setRotationFromMatrix(e) {
		this.quaternion.setFromRotationMatrix(e);
	}
	setRotationFromQuaternion(e) {
		this.quaternion.copy(e);
	}
	rotateOnAxis(e, t) {
		return At.setFromAxisAngle(e, t), this.quaternion.multiply(At), this;
	}
	rotateOnWorldAxis(e, t) {
		return At.setFromAxisAngle(e, t), this.quaternion.premultiply(At), this;
	}
	rotateX(e) {
		return this.rotateOnAxis(It, e);
	}
	rotateY(e) {
		return this.rotateOnAxis(Lt, e);
	}
	rotateZ(e) {
		return this.rotateOnAxis(Rt, e);
	}
	translateOnAxis(e, t) {
		return kt.copy(e).applyQuaternion(this.quaternion), this.position.add(kt.multiplyScalar(t)), this;
	}
	translateX(e) {
		return this.translateOnAxis(It, e);
	}
	translateY(e) {
		return this.translateOnAxis(Lt, e);
	}
	translateZ(e) {
		return this.translateOnAxis(Rt, e);
	}
	localToWorld(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(this.matrixWorld);
	}
	worldToLocal(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(jt.copy(this.matrixWorld).invert());
	}
	lookAt(e, t, n) {
		e.isVector3 ? Mt.copy(e) : Mt.set(e, t, n);
		let r = this.parent;
		this.updateWorldMatrix(!0, !1), Nt.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? jt.lookAt(Nt, Mt, this.up) : jt.lookAt(Mt, Nt, this.up), this.quaternion.setFromRotationMatrix(jt), r && (jt.extractRotation(r.matrixWorld), At.setFromRotationMatrix(jt), this.quaternion.premultiply(At.invert()));
	}
	add(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.add(arguments[e]);
			return this;
		}
		return e === this ? (console.error("THREE.Object3D.add: object can't be added as a child of itself.", e), this) : (e && e.isObject3D ? (e.removeFromParent(), e.parent = this, this.children.push(e), e.dispatchEvent(zt), Vt.child = e, this.dispatchEvent(Vt), Vt.child = null) : console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", e), this);
	}
	remove(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.remove(arguments[e]);
			return this;
		}
		let t = this.children.indexOf(e);
		return t !== -1 && (e.parent = null, this.children.splice(t, 1), e.dispatchEvent(Bt), Ht.child = e, this.dispatchEvent(Ht), Ht.child = null), this;
	}
	removeFromParent() {
		let e = this.parent;
		return e !== null && e.remove(this), this;
	}
	clear() {
		return this.remove(...this.children);
	}
	attach(e) {
		return this.updateWorldMatrix(!0, !1), jt.copy(this.matrixWorld).invert(), e.parent !== null && (e.parent.updateWorldMatrix(!0, !1), jt.multiply(e.parent.matrixWorld)), e.applyMatrix4(jt), e.removeFromParent(), e.parent = this, this.children.push(e), e.updateWorldMatrix(!1, !0), e.dispatchEvent(zt), Vt.child = e, this.dispatchEvent(Vt), Vt.child = null, this;
	}
	getObjectById(e) {
		return this.getObjectByProperty("id", e);
	}
	getObjectByName(e) {
		return this.getObjectByProperty("name", e);
	}
	getObjectByProperty(e, t) {
		if (this[e] === t) return this;
		for (let n = 0, r = this.children.length; n < r; n++) {
			let r = this.children[n].getObjectByProperty(e, t);
			if (r !== void 0) return r;
		}
	}
	getObjectsByProperty(e, t, n = []) {
		this[e] === t && n.push(this);
		let r = this.children;
		for (let i = 0, a = r.length; i < a; i++) r[i].getObjectsByProperty(e, t, n);
		return n;
	}
	getWorldPosition(e) {
		return this.updateWorldMatrix(!0, !1), e.setFromMatrixPosition(this.matrixWorld);
	}
	getWorldQuaternion(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Nt, e, Pt), e;
	}
	getWorldScale(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Nt, Ft, e), e;
	}
	getWorldDirection(e) {
		this.updateWorldMatrix(!0, !1);
		let t = this.matrixWorld.elements;
		return e.set(t[8], t[9], t[10]).normalize();
	}
	raycast() {}
	traverse(e) {
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverse(e);
	}
	traverseVisible(e) {
		if (this.visible === !1) return;
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverseVisible(e);
	}
	traverseAncestors(e) {
		let t = this.parent;
		t !== null && (e(t), t.traverseAncestors(e));
	}
	updateMatrix() {
		this.matrix.compose(this.position, this.quaternion, this.scale), this.matrixWorldNeedsUpdate = !0;
	}
	updateMatrixWorld(e) {
		this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || e) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, e = !0);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].updateMatrixWorld(e);
	}
	updateWorldMatrix(e, t) {
		let n = this.parent;
		if (e === !0 && n !== null && n.updateWorldMatrix(!0, !1), this.matrixAutoUpdate && this.updateMatrix(), this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), t === !0) {
			let e = this.children;
			for (let t = 0, n = e.length; t < n; t++) e[t].updateWorldMatrix(!1, !0);
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string", n = {};
		t && (e = {
			geometries: {},
			materials: {},
			textures: {},
			images: {},
			shapes: {},
			skeletons: {},
			animations: {},
			nodes: {}
		}, n.metadata = {
			version: 4.7,
			type: "Object",
			generator: "Object3D.toJSON"
		});
		let r = {};
		r.uuid = this.uuid, r.type = this.type, this.name !== "" && (r.name = this.name), this.castShadow === !0 && (r.castShadow = !0), this.receiveShadow === !0 && (r.receiveShadow = !0), this.visible === !1 && (r.visible = !1), this.frustumCulled === !1 && (r.frustumCulled = !1), this.renderOrder !== 0 && (r.renderOrder = this.renderOrder), Object.keys(this.userData).length > 0 && (r.userData = this.userData), r.layers = this.layers.mask, r.matrix = this.matrix.toArray(), r.up = this.up.toArray(), this.matrixAutoUpdate === !1 && (r.matrixAutoUpdate = !1), this.isInstancedMesh && (r.type = "InstancedMesh", r.count = this.count, r.instanceMatrix = this.instanceMatrix.toJSON(), this.instanceColor !== null && (r.instanceColor = this.instanceColor.toJSON())), this.isBatchedMesh && (r.type = "BatchedMesh", r.perObjectFrustumCulled = this.perObjectFrustumCulled, r.sortObjects = this.sortObjects, r.drawRanges = this._drawRanges, r.reservedRanges = this._reservedRanges, r.geometryInfo = this._geometryInfo.map((e) => ({
			...e,
			boundingBox: e.boundingBox ? e.boundingBox.toJSON() : void 0,
			boundingSphere: e.boundingSphere ? e.boundingSphere.toJSON() : void 0
		})), r.instanceInfo = this._instanceInfo.map((e) => ({ ...e })), r.availableInstanceIds = this._availableInstanceIds.slice(), r.availableGeometryIds = this._availableGeometryIds.slice(), r.nextIndexStart = this._nextIndexStart, r.nextVertexStart = this._nextVertexStart, r.geometryCount = this._geometryCount, r.maxInstanceCount = this._maxInstanceCount, r.maxVertexCount = this._maxVertexCount, r.maxIndexCount = this._maxIndexCount, r.geometryInitialized = this._geometryInitialized, r.matricesTexture = this._matricesTexture.toJSON(e), r.indirectTexture = this._indirectTexture.toJSON(e), this._colorsTexture !== null && (r.colorsTexture = this._colorsTexture.toJSON(e)), this.boundingSphere !== null && (r.boundingSphere = this.boundingSphere.toJSON()), this.boundingBox !== null && (r.boundingBox = this.boundingBox.toJSON()));
		function i(t, n) {
			return t[n.uuid] === void 0 && (t[n.uuid] = n.toJSON(e)), n.uuid;
		}
		if (this.isScene) this.background && (this.background.isColor ? r.background = this.background.toJSON() : this.background.isTexture && (r.background = this.background.toJSON(e).uuid)), this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== !0 && (r.environment = this.environment.toJSON(e).uuid);
		else if (this.isMesh || this.isLine || this.isPoints) {
			r.geometry = i(e.geometries, this.geometry);
			let t = this.geometry.parameters;
			if (t !== void 0 && t.shapes !== void 0) {
				let n = t.shapes;
				if (Array.isArray(n)) for (let t = 0, r = n.length; t < r; t++) {
					let r = n[t];
					i(e.shapes, r);
				}
				else i(e.shapes, n);
			}
		}
		if (this.isSkinnedMesh && (r.bindMode = this.bindMode, r.bindMatrix = this.bindMatrix.toArray(), this.skeleton !== void 0 && (i(e.skeletons, this.skeleton), r.skeleton = this.skeleton.uuid)), this.material !== void 0) {
			if (Array.isArray(this.material)) {
				let t = [];
				for (let n = 0, r = this.material.length; n < r; n++) t.push(i(e.materials, this.material[n]));
				r.material = t;
			} else r.material = i(e.materials, this.material);
		}
		if (this.children.length > 0) {
			r.children = [];
			for (let t = 0; t < this.children.length; t++) r.children.push(this.children[t].toJSON(e).object);
		}
		if (this.animations.length > 0) {
			r.animations = [];
			for (let t = 0; t < this.animations.length; t++) {
				let n = this.animations[t];
				r.animations.push(i(e.animations, n));
			}
		}
		if (t) {
			let t = a(e.geometries), r = a(e.materials), i = a(e.textures), o = a(e.images), s = a(e.shapes), c = a(e.skeletons), l = a(e.animations), u = a(e.nodes);
			t.length > 0 && (n.geometries = t), r.length > 0 && (n.materials = r), i.length > 0 && (n.textures = i), o.length > 0 && (n.images = o), s.length > 0 && (n.shapes = s), c.length > 0 && (n.skeletons = c), l.length > 0 && (n.animations = l), u.length > 0 && (n.nodes = u);
		}
		return n.object = r, n;
		function a(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
	}
	clone(e) {
		return new this.constructor().copy(this, e);
	}
	copy(e, t = !0) {
		if (this.name = e.name, this.up.copy(e.up), this.position.copy(e.position), this.rotation.order = e.rotation.order, this.quaternion.copy(e.quaternion), this.scale.copy(e.scale), this.matrix.copy(e.matrix), this.matrixWorld.copy(e.matrixWorld), this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrixWorldAutoUpdate = e.matrixWorldAutoUpdate, this.matrixWorldNeedsUpdate = e.matrixWorldNeedsUpdate, this.layers.mask = e.layers.mask, this.visible = e.visible, this.castShadow = e.castShadow, this.receiveShadow = e.receiveShadow, this.frustumCulled = e.frustumCulled, this.renderOrder = e.renderOrder, this.animations = e.animations.slice(), this.userData = JSON.parse(JSON.stringify(e.userData)), t === !0) for (let t = 0; t < e.children.length; t++) {
			let n = e.children[t];
			this.add(n.clone());
		}
		return this;
	}
};
Ut.DEFAULT_UP = /*@__PURE__*/ new W(0, 1, 0), Ut.DEFAULT_MATRIX_AUTO_UPDATE = !0, Ut.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0;
var Wt = /*@__PURE__*/ new W(), Gt = /*@__PURE__*/ new W(), Kt = /*@__PURE__*/ new W(), qt = /*@__PURE__*/ new W(), Jt = /*@__PURE__*/ new W(), Yt = /*@__PURE__*/ new W(), Xt = /*@__PURE__*/ new W(), Zt = /*@__PURE__*/ new W(), Qt = /*@__PURE__*/ new W(), $t = /*@__PURE__*/ new W(), en = /*@__PURE__*/ new ze(), tn = /*@__PURE__*/ new ze(), nn = /*@__PURE__*/ new ze(), rn = class e {
	constructor(e = new W(), t = new W(), n = new W()) {
		this.a = e, this.b = t, this.c = n;
	}
	static getNormal(e, t, n, r) {
		r.subVectors(n, t), Wt.subVectors(e, t), r.cross(Wt);
		let i = r.lengthSq();
		return i > 0 ? r.multiplyScalar(1 / Math.sqrt(i)) : r.set(0, 0, 0);
	}
	static getBarycoord(e, t, n, r, i) {
		Wt.subVectors(r, t), Gt.subVectors(n, t), Kt.subVectors(e, t);
		let a = Wt.dot(Wt), o = Wt.dot(Gt), s = Wt.dot(Kt), c = Gt.dot(Gt), l = Gt.dot(Kt), u = a * c - o * o;
		if (u === 0) return i.set(0, 0, 0), null;
		let d = 1 / u, f = (c * s - o * l) * d, p = (a * l - o * s) * d;
		return i.set(1 - f - p, p, f);
	}
	static containsPoint(e, t, n, r) {
		return this.getBarycoord(e, t, n, r, qt) !== null && qt.x >= 0 && qt.y >= 0 && qt.x + qt.y <= 1;
	}
	static getInterpolation(e, t, n, r, i, a, o, s) {
		return this.getBarycoord(e, t, n, r, qt) === null ? (s.x = 0, s.y = 0, "z" in s && (s.z = 0), "w" in s && (s.w = 0), null) : (s.setScalar(0), s.addScaledVector(i, qt.x), s.addScaledVector(a, qt.y), s.addScaledVector(o, qt.z), s);
	}
	static getInterpolatedAttribute(e, t, n, r, i, a) {
		return en.setScalar(0), tn.setScalar(0), nn.setScalar(0), en.fromBufferAttribute(e, t), tn.fromBufferAttribute(e, n), nn.fromBufferAttribute(e, r), a.setScalar(0), a.addScaledVector(en, i.x), a.addScaledVector(tn, i.y), a.addScaledVector(nn, i.z), a;
	}
	static isFrontFacing(e, t, n, r) {
		return Wt.subVectors(n, t), Gt.subVectors(e, t), Wt.cross(Gt).dot(r) < 0;
	}
	set(e, t, n) {
		return this.a.copy(e), this.b.copy(t), this.c.copy(n), this;
	}
	setFromPointsAndIndices(e, t, n, r) {
		return this.a.copy(e[t]), this.b.copy(e[n]), this.c.copy(e[r]), this;
	}
	setFromAttributeAndIndices(e, t, n, r) {
		return this.a.fromBufferAttribute(e, t), this.b.fromBufferAttribute(e, n), this.c.fromBufferAttribute(e, r), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.a.copy(e.a), this.b.copy(e.b), this.c.copy(e.c), this;
	}
	getArea() {
		return Wt.subVectors(this.c, this.b), Gt.subVectors(this.a, this.b), Wt.cross(Gt).length() * .5;
	}
	getMidpoint(e) {
		return e.addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
	}
	getNormal(t) {
		return e.getNormal(this.a, this.b, this.c, t);
	}
	getPlane(e) {
		return e.setFromCoplanarPoints(this.a, this.b, this.c);
	}
	getBarycoord(t, n) {
		return e.getBarycoord(t, this.a, this.b, this.c, n);
	}
	getInterpolation(t, n, r, i, a) {
		return e.getInterpolation(t, this.a, this.b, this.c, n, r, i, a);
	}
	containsPoint(t) {
		return e.containsPoint(t, this.a, this.b, this.c);
	}
	isFrontFacing(t) {
		return e.isFrontFacing(this.a, this.b, this.c, t);
	}
	intersectsBox(e) {
		return e.intersectsTriangle(this);
	}
	closestPointToPoint(e, t) {
		let n = this.a, r = this.b, i = this.c, a, o;
		Jt.subVectors(r, n), Yt.subVectors(i, n), Zt.subVectors(e, n);
		let s = Jt.dot(Zt), c = Yt.dot(Zt);
		if (s <= 0 && c <= 0) return t.copy(n);
		Qt.subVectors(e, r);
		let l = Jt.dot(Qt), u = Yt.dot(Qt);
		if (l >= 0 && u <= l) return t.copy(r);
		let d = s * u - l * c;
		if (d <= 0 && s >= 0 && l <= 0) return a = s / (s - l), t.copy(n).addScaledVector(Jt, a);
		$t.subVectors(e, i);
		let f = Jt.dot($t), p = Yt.dot($t);
		if (p >= 0 && f <= p) return t.copy(i);
		let m = f * c - s * p;
		if (m <= 0 && c >= 0 && p <= 0) return o = c / (c - p), t.copy(n).addScaledVector(Yt, o);
		let h = l * p - f * u;
		if (h <= 0 && u - l >= 0 && f - p >= 0) return Xt.subVectors(i, r), o = (u - l) / (u - l + (f - p)), t.copy(r).addScaledVector(Xt, o);
		let g = 1 / (h + m + d);
		return a = m * g, o = d * g, t.copy(n).addScaledVector(Jt, a).addScaledVector(Yt, o);
	}
	equals(e) {
		return e.a.equals(this.a) && e.b.equals(this.b) && e.c.equals(this.c);
	}
}, an = {
	aliceblue: 15792383,
	antiquewhite: 16444375,
	aqua: 65535,
	aquamarine: 8388564,
	azure: 15794175,
	beige: 16119260,
	bisque: 16770244,
	black: 0,
	blanchedalmond: 16772045,
	blue: 255,
	blueviolet: 9055202,
	brown: 10824234,
	burlywood: 14596231,
	cadetblue: 6266528,
	chartreuse: 8388352,
	chocolate: 13789470,
	coral: 16744272,
	cornflowerblue: 6591981,
	cornsilk: 16775388,
	crimson: 14423100,
	cyan: 65535,
	darkblue: 139,
	darkcyan: 35723,
	darkgoldenrod: 12092939,
	darkgray: 11119017,
	darkgreen: 25600,
	darkgrey: 11119017,
	darkkhaki: 12433259,
	darkmagenta: 9109643,
	darkolivegreen: 5597999,
	darkorange: 16747520,
	darkorchid: 10040012,
	darkred: 9109504,
	darksalmon: 15308410,
	darkseagreen: 9419919,
	darkslateblue: 4734347,
	darkslategray: 3100495,
	darkslategrey: 3100495,
	darkturquoise: 52945,
	darkviolet: 9699539,
	deeppink: 16716947,
	deepskyblue: 49151,
	dimgray: 6908265,
	dimgrey: 6908265,
	dodgerblue: 2003199,
	firebrick: 11674146,
	floralwhite: 16775920,
	forestgreen: 2263842,
	fuchsia: 16711935,
	gainsboro: 14474460,
	ghostwhite: 16316671,
	gold: 16766720,
	goldenrod: 14329120,
	gray: 8421504,
	green: 32768,
	greenyellow: 11403055,
	grey: 8421504,
	honeydew: 15794160,
	hotpink: 16738740,
	indianred: 13458524,
	indigo: 4915330,
	ivory: 16777200,
	khaki: 15787660,
	lavender: 15132410,
	lavenderblush: 16773365,
	lawngreen: 8190976,
	lemonchiffon: 16775885,
	lightblue: 11393254,
	lightcoral: 15761536,
	lightcyan: 14745599,
	lightgoldenrodyellow: 16448210,
	lightgray: 13882323,
	lightgreen: 9498256,
	lightgrey: 13882323,
	lightpink: 16758465,
	lightsalmon: 16752762,
	lightseagreen: 2142890,
	lightskyblue: 8900346,
	lightslategray: 7833753,
	lightslategrey: 7833753,
	lightsteelblue: 11584734,
	lightyellow: 16777184,
	lime: 65280,
	limegreen: 3329330,
	linen: 16445670,
	magenta: 16711935,
	maroon: 8388608,
	mediumaquamarine: 6737322,
	mediumblue: 205,
	mediumorchid: 12211667,
	mediumpurple: 9662683,
	mediumseagreen: 3978097,
	mediumslateblue: 8087790,
	mediumspringgreen: 64154,
	mediumturquoise: 4772300,
	mediumvioletred: 13047173,
	midnightblue: 1644912,
	mintcream: 16121850,
	mistyrose: 16770273,
	moccasin: 16770229,
	navajowhite: 16768685,
	navy: 128,
	oldlace: 16643558,
	olive: 8421376,
	olivedrab: 7048739,
	orange: 16753920,
	orangered: 16729344,
	orchid: 14315734,
	palegoldenrod: 15657130,
	palegreen: 10025880,
	paleturquoise: 11529966,
	palevioletred: 14381203,
	papayawhip: 16773077,
	peachpuff: 16767673,
	peru: 13468991,
	pink: 16761035,
	plum: 14524637,
	powderblue: 11591910,
	purple: 8388736,
	rebeccapurple: 6697881,
	red: 16711680,
	rosybrown: 12357519,
	royalblue: 4286945,
	saddlebrown: 9127187,
	salmon: 16416882,
	sandybrown: 16032864,
	seagreen: 3050327,
	seashell: 16774638,
	sienna: 10506797,
	silver: 12632256,
	skyblue: 8900331,
	slateblue: 6970061,
	slategray: 7372944,
	slategrey: 7372944,
	snow: 16775930,
	springgreen: 65407,
	steelblue: 4620980,
	tan: 13808780,
	teal: 32896,
	thistle: 14204888,
	tomato: 16737095,
	turquoise: 4251856,
	violet: 15631086,
	wheat: 16113331,
	white: 16777215,
	whitesmoke: 16119285,
	yellow: 16776960,
	yellowgreen: 10145074
}, on = {
	h: 0,
	s: 0,
	l: 0
}, sn = {
	h: 0,
	s: 0,
	l: 0
};
function cn(e, t, n) {
	return n < 0 && (n += 1), n > 1 && --n, n < 1 / 6 ? e + (t - e) * 6 * n : n < 1 / 2 ? t : n < 2 / 3 ? e + (t - e) * 6 * (2 / 3 - n) : e;
}
var Y = class {
	constructor(e, t, n) {
		return this.isColor = !0, this.r = 1, this.g = 1, this.b = 1, this.set(e, t, n);
	}
	set(e, t, n) {
		if (t === void 0 && n === void 0) {
			let t = e;
			t && t.isColor ? this.copy(t) : typeof t == "number" ? this.setHex(t) : typeof t == "string" && this.setStyle(t);
		} else this.setRGB(e, t, n);
		return this;
	}
	setScalar(e) {
		return this.r = e, this.g = e, this.b = e, this;
	}
	setHex(e, t = T) {
		return e = Math.floor(e), this.r = (e >> 16 & 255) / 255, this.g = (e >> 8 & 255) / 255, this.b = (e & 255) / 255, K.colorSpaceToWorking(this, t), this;
	}
	setRGB(e, t, n, r = K.workingColorSpace) {
		return this.r = e, this.g = t, this.b = n, K.colorSpaceToWorking(this, r), this;
	}
	setHSL(e, t, n, r = K.workingColorSpace) {
		if (e = te(e, 1), t = L(t, 0, 1), n = L(n, 0, 1), t === 0) this.r = this.g = this.b = n;
		else {
			let r = n <= .5 ? n * (1 + t) : n + t - n * t, i = 2 * n - r;
			this.r = cn(i, r, e + 1 / 3), this.g = cn(i, r, e), this.b = cn(i, r, e - 1 / 3);
		}
		return K.colorSpaceToWorking(this, r), this;
	}
	setStyle(e, t = T) {
		function n(t) {
			t !== void 0 && parseFloat(t) < 1 && console.warn("THREE.Color: Alpha component of " + e + " will be ignored.");
		}
		let r;
		if (r = /^(\w+)\(([^\)]*)\)/.exec(e)) {
			let i, a = r[1], o = r[2];
			switch (a) {
				case "rgb":
				case "rgba":
					if (i = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(255, parseInt(i[1], 10)) / 255, Math.min(255, parseInt(i[2], 10)) / 255, Math.min(255, parseInt(i[3], 10)) / 255, t);
					if (i = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(100, parseInt(i[1], 10)) / 100, Math.min(100, parseInt(i[2], 10)) / 100, Math.min(100, parseInt(i[3], 10)) / 100, t);
					break;
				case "hsl":
				case "hsla":
					if (i = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setHSL(parseFloat(i[1]) / 360, parseFloat(i[2]) / 100, parseFloat(i[3]) / 100, t);
					break;
				default: console.warn("THREE.Color: Unknown color model " + e);
			}
		} else if (r = /^\#([A-Fa-f\d]+)$/.exec(e)) {
			let n = r[1], i = n.length;
			if (i === 3) return this.setRGB(parseInt(n.charAt(0), 16) / 15, parseInt(n.charAt(1), 16) / 15, parseInt(n.charAt(2), 16) / 15, t);
			if (i === 6) return this.setHex(parseInt(n, 16), t);
			console.warn("THREE.Color: Invalid hex color " + e);
		} else if (e && e.length > 0) return this.setColorName(e, t);
		return this;
	}
	setColorName(e, t = T) {
		let n = an[e.toLowerCase()];
		return n === void 0 ? console.warn("THREE.Color: Unknown color " + e) : this.setHex(n, t), this;
	}
	clone() {
		return new this.constructor(this.r, this.g, this.b);
	}
	copy(e) {
		return this.r = e.r, this.g = e.g, this.b = e.b, this;
	}
	copySRGBToLinear(e) {
		return this.r = Ae(e.r), this.g = Ae(e.g), this.b = Ae(e.b), this;
	}
	copyLinearToSRGB(e) {
		return this.r = je(e.r), this.g = je(e.g), this.b = je(e.b), this;
	}
	convertSRGBToLinear() {
		return this.copySRGBToLinear(this), this;
	}
	convertLinearToSRGB() {
		return this.copyLinearToSRGB(this), this;
	}
	getHex(e = T) {
		return K.workingToColorSpace(ln.copy(this), e), Math.round(L(ln.r * 255, 0, 255)) * 65536 + Math.round(L(ln.g * 255, 0, 255)) * 256 + Math.round(L(ln.b * 255, 0, 255));
	}
	getHexString(e = T) {
		return ("000000" + this.getHex(e).toString(16)).slice(-6);
	}
	getHSL(e, t = K.workingColorSpace) {
		K.workingToColorSpace(ln.copy(this), t);
		let n = ln.r, r = ln.g, i = ln.b, a = Math.max(n, r, i), o = Math.min(n, r, i), s, c, l = (o + a) / 2;
		if (o === a) s = 0, c = 0;
		else {
			let e = a - o;
			switch (c = l <= .5 ? e / (a + o) : e / (2 - a - o), a) {
				case n:
					s = (r - i) / e + (r < i ? 6 : 0);
					break;
				case r:
					s = (i - n) / e + 2;
					break;
				case i: s = (n - r) / e + 4;
			}
			s /= 6;
		}
		return e.h = s, e.s = c, e.l = l, e;
	}
	getRGB(e, t = K.workingColorSpace) {
		return K.workingToColorSpace(ln.copy(this), t), e.r = ln.r, e.g = ln.g, e.b = ln.b, e;
	}
	getStyle(e = T) {
		K.workingToColorSpace(ln.copy(this), e);
		let t = ln.r, n = ln.g, r = ln.b;
		return e === "srgb" ? `rgb(${Math.round(t * 255)},${Math.round(n * 255)},${Math.round(r * 255)})` : `color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`;
	}
	offsetHSL(e, t, n) {
		return this.getHSL(on), this.setHSL(on.h + e, on.s + t, on.l + n);
	}
	add(e) {
		return this.r += e.r, this.g += e.g, this.b += e.b, this;
	}
	addColors(e, t) {
		return this.r = e.r + t.r, this.g = e.g + t.g, this.b = e.b + t.b, this;
	}
	addScalar(e) {
		return this.r += e, this.g += e, this.b += e, this;
	}
	sub(e) {
		return this.r = Math.max(0, this.r - e.r), this.g = Math.max(0, this.g - e.g), this.b = Math.max(0, this.b - e.b), this;
	}
	multiply(e) {
		return this.r *= e.r, this.g *= e.g, this.b *= e.b, this;
	}
	multiplyScalar(e) {
		return this.r *= e, this.g *= e, this.b *= e, this;
	}
	lerp(e, t) {
		return this.r += (e.r - this.r) * t, this.g += (e.g - this.g) * t, this.b += (e.b - this.b) * t, this;
	}
	lerpColors(e, t, n) {
		return this.r = e.r + (t.r - e.r) * n, this.g = e.g + (t.g - e.g) * n, this.b = e.b + (t.b - e.b) * n, this;
	}
	lerpHSL(e, t) {
		this.getHSL(on), e.getHSL(sn);
		let n = R(on.h, sn.h, t), r = R(on.s, sn.s, t), i = R(on.l, sn.l, t);
		return this.setHSL(n, r, i), this;
	}
	setFromVector3(e) {
		return this.r = e.x, this.g = e.y, this.b = e.z, this;
	}
	applyMatrix3(e) {
		let t = this.r, n = this.g, r = this.b, i = e.elements;
		return this.r = i[0] * t + i[3] * n + i[6] * r, this.g = i[1] * t + i[4] * n + i[7] * r, this.b = i[2] * t + i[5] * n + i[8] * r, this;
	}
	equals(e) {
		return e.r === this.r && e.g === this.g && e.b === this.b;
	}
	fromArray(e, t = 0) {
		return this.r = e[t], this.g = e[t + 1], this.b = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.r, e[t + 1] = this.g, e[t + 2] = this.b, e;
	}
	fromBufferAttribute(e, t) {
		return this.r = e.getX(t), this.g = e.getY(t), this.b = e.getZ(t), this;
	}
	toJSON() {
		return this.getHex();
	}
	*[Symbol.iterator]() {
		yield this.r, yield this.g, yield this.b;
	}
}, ln = /*@__PURE__*/ new Y();
Y.NAMES = an;
var un = 0, dn = class extends M {
	constructor() {
		super(), this.isMaterial = !0, Object.defineProperty(this, "id", { value: un++ }), this.uuid = I(), this.name = "", this.type = "Material", this.blending = 1, this.side = 0, this.vertexColors = !1, this.opacity = 1, this.transparent = !1, this.alphaHash = !1, this.blendSrc = 204, this.blendDst = 205, this.blendEquation = 100, this.blendSrcAlpha = null, this.blendDstAlpha = null, this.blendEquationAlpha = null, this.blendColor = new Y(0, 0, 0), this.blendAlpha = 0, this.depthFunc = 3, this.depthTest = !0, this.depthWrite = !0, this.stencilWriteMask = 255, this.stencilFunc = 519, this.stencilRef = 0, this.stencilFuncMask = 255, this.stencilFail = k, this.stencilZFail = k, this.stencilZPass = k, this.stencilWrite = !1, this.clippingPlanes = null, this.clipIntersection = !1, this.clipShadows = !1, this.shadowSide = null, this.colorWrite = !0, this.precision = null, this.polygonOffset = !1, this.polygonOffsetFactor = 0, this.polygonOffsetUnits = 0, this.dithering = !1, this.alphaToCoverage = !1, this.premultipliedAlpha = !1, this.forceSinglePass = !1, this.allowOverride = !0, this.visible = !0, this.toneMapped = !0, this.userData = {}, this.version = 0, this._alphaTest = 0;
	}
	get alphaTest() {
		return this._alphaTest;
	}
	set alphaTest(e) {
		this._alphaTest > 0 != e > 0 && this.version++, this._alphaTest = e;
	}
	onBeforeRender() {}
	onBeforeCompile() {}
	customProgramCacheKey() {
		return this.onBeforeCompile.toString();
	}
	setValues(e) {
		if (e !== void 0) for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			if (r === void 0) {
				console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);
				continue;
			}
			r && r.isColor ? r.set(n) : r && r.isVector3 && n && n.isVector3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		t && (e = {
			textures: {},
			images: {}
		});
		let n = { metadata: {
			version: 4.7,
			type: "Material",
			generator: "Material.toJSON"
		} };
		n.uuid = this.uuid, n.type = this.type, this.name !== "" && (n.name = this.name), this.color && this.color.isColor && (n.color = this.color.getHex()), this.roughness !== void 0 && (n.roughness = this.roughness), this.metalness !== void 0 && (n.metalness = this.metalness), this.sheen !== void 0 && (n.sheen = this.sheen), this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()), this.sheenRoughness !== void 0 && (n.sheenRoughness = this.sheenRoughness), this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()), this.emissiveIntensity !== void 0 && this.emissiveIntensity !== 1 && (n.emissiveIntensity = this.emissiveIntensity), this.specular && this.specular.isColor && (n.specular = this.specular.getHex()), this.specularIntensity !== void 0 && (n.specularIntensity = this.specularIntensity), this.specularColor && this.specularColor.isColor && (n.specularColor = this.specularColor.getHex()), this.shininess !== void 0 && (n.shininess = this.shininess), this.clearcoat !== void 0 && (n.clearcoat = this.clearcoat), this.clearcoatRoughness !== void 0 && (n.clearcoatRoughness = this.clearcoatRoughness), this.clearcoatMap && this.clearcoatMap.isTexture && (n.clearcoatMap = this.clearcoatMap.toJSON(e).uuid), this.clearcoatRoughnessMap && this.clearcoatRoughnessMap.isTexture && (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(e).uuid), this.clearcoatNormalMap && this.clearcoatNormalMap.isTexture && (n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(e).uuid, n.clearcoatNormalScale = this.clearcoatNormalScale.toArray()), this.sheenColorMap && this.sheenColorMap.isTexture && (n.sheenColorMap = this.sheenColorMap.toJSON(e).uuid), this.sheenRoughnessMap && this.sheenRoughnessMap.isTexture && (n.sheenRoughnessMap = this.sheenRoughnessMap.toJSON(e).uuid), this.dispersion !== void 0 && (n.dispersion = this.dispersion), this.iridescence !== void 0 && (n.iridescence = this.iridescence), this.iridescenceIOR !== void 0 && (n.iridescenceIOR = this.iridescenceIOR), this.iridescenceThicknessRange !== void 0 && (n.iridescenceThicknessRange = this.iridescenceThicknessRange), this.iridescenceMap && this.iridescenceMap.isTexture && (n.iridescenceMap = this.iridescenceMap.toJSON(e).uuid), this.iridescenceThicknessMap && this.iridescenceThicknessMap.isTexture && (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(e).uuid), this.anisotropy !== void 0 && (n.anisotropy = this.anisotropy), this.anisotropyRotation !== void 0 && (n.anisotropyRotation = this.anisotropyRotation), this.anisotropyMap && this.anisotropyMap.isTexture && (n.anisotropyMap = this.anisotropyMap.toJSON(e).uuid), this.map && this.map.isTexture && (n.map = this.map.toJSON(e).uuid), this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(e).uuid), this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(e).uuid), this.lightMap && this.lightMap.isTexture && (n.lightMap = this.lightMap.toJSON(e).uuid, n.lightMapIntensity = this.lightMapIntensity), this.aoMap && this.aoMap.isTexture && (n.aoMap = this.aoMap.toJSON(e).uuid, n.aoMapIntensity = this.aoMapIntensity), this.bumpMap && this.bumpMap.isTexture && (n.bumpMap = this.bumpMap.toJSON(e).uuid, n.bumpScale = this.bumpScale), this.normalMap && this.normalMap.isTexture && (n.normalMap = this.normalMap.toJSON(e).uuid, n.normalMapType = this.normalMapType, n.normalScale = this.normalScale.toArray()), this.displacementMap && this.displacementMap.isTexture && (n.displacementMap = this.displacementMap.toJSON(e).uuid, n.displacementScale = this.displacementScale, n.displacementBias = this.displacementBias), this.roughnessMap && this.roughnessMap.isTexture && (n.roughnessMap = this.roughnessMap.toJSON(e).uuid), this.metalnessMap && this.metalnessMap.isTexture && (n.metalnessMap = this.metalnessMap.toJSON(e).uuid), this.emissiveMap && this.emissiveMap.isTexture && (n.emissiveMap = this.emissiveMap.toJSON(e).uuid), this.specularMap && this.specularMap.isTexture && (n.specularMap = this.specularMap.toJSON(e).uuid), this.specularIntensityMap && this.specularIntensityMap.isTexture && (n.specularIntensityMap = this.specularIntensityMap.toJSON(e).uuid), this.specularColorMap && this.specularColorMap.isTexture && (n.specularColorMap = this.specularColorMap.toJSON(e).uuid), this.envMap && this.envMap.isTexture && (n.envMap = this.envMap.toJSON(e).uuid, this.combine !== void 0 && (n.combine = this.combine)), this.envMapRotation !== void 0 && (n.envMapRotation = this.envMapRotation.toArray()), this.envMapIntensity !== void 0 && (n.envMapIntensity = this.envMapIntensity), this.reflectivity !== void 0 && (n.reflectivity = this.reflectivity), this.refractionRatio !== void 0 && (n.refractionRatio = this.refractionRatio), this.gradientMap && this.gradientMap.isTexture && (n.gradientMap = this.gradientMap.toJSON(e).uuid), this.transmission !== void 0 && (n.transmission = this.transmission), this.transmissionMap && this.transmissionMap.isTexture && (n.transmissionMap = this.transmissionMap.toJSON(e).uuid), this.thickness !== void 0 && (n.thickness = this.thickness), this.thicknessMap && this.thicknessMap.isTexture && (n.thicknessMap = this.thicknessMap.toJSON(e).uuid), this.attenuationDistance !== void 0 && this.attenuationDistance !== Infinity && (n.attenuationDistance = this.attenuationDistance), this.attenuationColor !== void 0 && (n.attenuationColor = this.attenuationColor.getHex()), this.size !== void 0 && (n.size = this.size), this.shadowSide !== null && (n.shadowSide = this.shadowSide), this.sizeAttenuation !== void 0 && (n.sizeAttenuation = this.sizeAttenuation), this.blending !== 1 && (n.blending = this.blending), this.side !== 0 && (n.side = this.side), this.vertexColors === !0 && (n.vertexColors = !0), this.opacity < 1 && (n.opacity = this.opacity), this.transparent === !0 && (n.transparent = !0), this.blendSrc !== 204 && (n.blendSrc = this.blendSrc), this.blendDst !== 205 && (n.blendDst = this.blendDst), this.blendEquation !== 100 && (n.blendEquation = this.blendEquation), this.blendSrcAlpha !== null && (n.blendSrcAlpha = this.blendSrcAlpha), this.blendDstAlpha !== null && (n.blendDstAlpha = this.blendDstAlpha), this.blendEquationAlpha !== null && (n.blendEquationAlpha = this.blendEquationAlpha), this.blendColor && this.blendColor.isColor && (n.blendColor = this.blendColor.getHex()), this.blendAlpha !== 0 && (n.blendAlpha = this.blendAlpha), this.depthFunc !== 3 && (n.depthFunc = this.depthFunc), this.depthTest === !1 && (n.depthTest = this.depthTest), this.depthWrite === !1 && (n.depthWrite = this.depthWrite), this.colorWrite === !1 && (n.colorWrite = this.colorWrite), this.stencilWriteMask !== 255 && (n.stencilWriteMask = this.stencilWriteMask), this.stencilFunc !== 519 && (n.stencilFunc = this.stencilFunc), this.stencilRef !== 0 && (n.stencilRef = this.stencilRef), this.stencilFuncMask !== 255 && (n.stencilFuncMask = this.stencilFuncMask), this.stencilFail !== 7680 && (n.stencilFail = this.stencilFail), this.stencilZFail !== 7680 && (n.stencilZFail = this.stencilZFail), this.stencilZPass !== 7680 && (n.stencilZPass = this.stencilZPass), this.stencilWrite === !0 && (n.stencilWrite = this.stencilWrite), this.rotation !== void 0 && this.rotation !== 0 && (n.rotation = this.rotation), this.polygonOffset === !0 && (n.polygonOffset = !0), this.polygonOffsetFactor !== 0 && (n.polygonOffsetFactor = this.polygonOffsetFactor), this.polygonOffsetUnits !== 0 && (n.polygonOffsetUnits = this.polygonOffsetUnits), this.linewidth !== void 0 && this.linewidth !== 1 && (n.linewidth = this.linewidth), this.dashSize !== void 0 && (n.dashSize = this.dashSize), this.gapSize !== void 0 && (n.gapSize = this.gapSize), this.scale !== void 0 && (n.scale = this.scale), this.dithering === !0 && (n.dithering = !0), this.alphaTest > 0 && (n.alphaTest = this.alphaTest), this.alphaHash === !0 && (n.alphaHash = !0), this.alphaToCoverage === !0 && (n.alphaToCoverage = !0), this.premultipliedAlpha === !0 && (n.premultipliedAlpha = !0), this.forceSinglePass === !0 && (n.forceSinglePass = !0), this.wireframe === !0 && (n.wireframe = !0), this.wireframeLinewidth > 1 && (n.wireframeLinewidth = this.wireframeLinewidth), this.wireframeLinecap !== "round" && (n.wireframeLinecap = this.wireframeLinecap), this.wireframeLinejoin !== "round" && (n.wireframeLinejoin = this.wireframeLinejoin), this.flatShading === !0 && (n.flatShading = !0), this.visible === !1 && (n.visible = !1), this.toneMapped === !1 && (n.toneMapped = !1), this.fog === !1 && (n.fog = !1), Object.keys(this.userData).length > 0 && (n.userData = this.userData);
		function r(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
		if (t) {
			let t = r(e.textures), i = r(e.images);
			t.length > 0 && (n.textures = t), i.length > 0 && (n.images = i);
		}
		return n;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.name = e.name, this.blending = e.blending, this.side = e.side, this.vertexColors = e.vertexColors, this.opacity = e.opacity, this.transparent = e.transparent, this.blendSrc = e.blendSrc, this.blendDst = e.blendDst, this.blendEquation = e.blendEquation, this.blendSrcAlpha = e.blendSrcAlpha, this.blendDstAlpha = e.blendDstAlpha, this.blendEquationAlpha = e.blendEquationAlpha, this.blendColor.copy(e.blendColor), this.blendAlpha = e.blendAlpha, this.depthFunc = e.depthFunc, this.depthTest = e.depthTest, this.depthWrite = e.depthWrite, this.stencilWriteMask = e.stencilWriteMask, this.stencilFunc = e.stencilFunc, this.stencilRef = e.stencilRef, this.stencilFuncMask = e.stencilFuncMask, this.stencilFail = e.stencilFail, this.stencilZFail = e.stencilZFail, this.stencilZPass = e.stencilZPass, this.stencilWrite = e.stencilWrite;
		let t = e.clippingPlanes, n = null;
		if (t !== null) {
			let e = t.length;
			n = Array(e);
			for (let r = 0; r !== e; ++r) n[r] = t[r].clone();
		}
		return this.clippingPlanes = n, this.clipIntersection = e.clipIntersection, this.clipShadows = e.clipShadows, this.shadowSide = e.shadowSide, this.colorWrite = e.colorWrite, this.precision = e.precision, this.polygonOffset = e.polygonOffset, this.polygonOffsetFactor = e.polygonOffsetFactor, this.polygonOffsetUnits = e.polygonOffsetUnits, this.dithering = e.dithering, this.alphaTest = e.alphaTest, this.alphaHash = e.alphaHash, this.alphaToCoverage = e.alphaToCoverage, this.premultipliedAlpha = e.premultipliedAlpha, this.forceSinglePass = e.forceSinglePass, this.visible = e.visible, this.toneMapped = e.toneMapped, this.userData = JSON.parse(JSON.stringify(e.userData)), this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
}, fn = class extends dn {
	constructor(e) {
		super(), this.isMeshBasicMaterial = !0, this.type = "MeshBasicMaterial", this.color = new Y(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new Et(), this.combine = 0, this.reflectivity = 1, this.refractionRatio = .98, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.specularMap = e.specularMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.combine = e.combine, this.reflectivity = e.reflectivity, this.refractionRatio = e.refractionRatio, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.fog = e.fog, this;
	}
}, pn = /*@__PURE__*/ mn();
function mn() {
	let e = /* @__PURE__ */ new ArrayBuffer(4), t = new Float32Array(e), n = new Uint32Array(e), r = /* @__PURE__ */ new Uint32Array(512), i = /* @__PURE__ */ new Uint32Array(512);
	for (let e = 0; e < 256; ++e) {
		let t = e - 127;
		t < -27 ? (r[e] = 0, r[e | 256] = 32768, i[e] = 24, i[e | 256] = 24) : t < -14 ? (r[e] = 1024 >> -t - 14, r[e | 256] = 1024 >> -t - 14 | 32768, i[e] = -t - 1, i[e | 256] = -t - 1) : t <= 15 ? (r[e] = t + 15 << 10, r[e | 256] = t + 15 << 10 | 32768, i[e] = 13, i[e | 256] = 13) : t < 128 ? (r[e] = 31744, r[e | 256] = 64512, i[e] = 24, i[e | 256] = 24) : (r[e] = 31744, r[e | 256] = 64512, i[e] = 13, i[e | 256] = 13);
	}
	let a = /* @__PURE__ */ new Uint32Array(2048), o = /* @__PURE__ */ new Uint32Array(64), s = /* @__PURE__ */ new Uint32Array(64);
	for (let e = 1; e < 1024; ++e) {
		let t = e << 13, n = 0;
		for (; !(t & 8388608);) t <<= 1, n -= 8388608;
		t &= -8388609, n += 947912704, a[e] = t | n;
	}
	for (let e = 1024; e < 2048; ++e) a[e] = 939524096 + (e - 1024 << 13);
	for (let e = 1; e < 31; ++e) o[e] = e << 23;
	o[31] = 1199570944, o[32] = 2147483648;
	for (let e = 33; e < 63; ++e) o[e] = 2147483648 + (e - 32 << 23);
	o[63] = 3347054592;
	for (let e = 1; e < 64; ++e) e !== 32 && (s[e] = 1024);
	return {
		floatView: t,
		uint32View: n,
		baseTable: r,
		shiftTable: i,
		mantissaTable: a,
		exponentTable: o,
		offsetTable: s
	};
}
function hn(e) {
	Math.abs(e) > 65504 && console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."), e = L(e, -65504, 65504), pn.floatView[0] = e;
	let t = pn.uint32View[0], n = t >> 23 & 511;
	return pn.baseTable[n] + ((t & 8388607) >> pn.shiftTable[n]);
}
function gn(e) {
	let t = e >> 10;
	return pn.uint32View[0] = pn.mantissaTable[pn.offsetTable[t] + (e & 1023)] + pn.exponentTable[t], pn.floatView[0];
}
var _n = class {
	static toHalfFloat(e) {
		return hn(e);
	}
	static fromHalfFloat(e) {
		return gn(e);
	}
}, vn = /*@__PURE__*/ new W(), yn = /*@__PURE__*/ new H(), bn = 0, xn = class {
	constructor(e, t, n = !1) {
		if (Array.isArray(e)) throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");
		this.isBufferAttribute = !0, Object.defineProperty(this, "id", { value: bn++ }), this.name = "", this.array = e, this.itemSize = t, this.count = e === void 0 ? 0 : e.length / t, this.normalized = n, this.usage = A, this.updateRanges = [], this.gpuType = d, this.version = 0;
	}
	onUploadCallback() {}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	setUsage(e) {
		return this.usage = e, this;
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	copy(e) {
		return this.name = e.name, this.array = new e.array.constructor(e.array), this.itemSize = e.itemSize, this.count = e.count, this.normalized = e.normalized, this.usage = e.usage, this.gpuType = e.gpuType, this;
	}
	copyAt(e, t, n) {
		e *= this.itemSize, n *= t.itemSize;
		for (let r = 0, i = this.itemSize; r < i; r++) this.array[e + r] = t.array[n + r];
		return this;
	}
	copyArray(e) {
		return this.array.set(e), this;
	}
	applyMatrix3(e) {
		if (this.itemSize === 2) for (let t = 0, n = this.count; t < n; t++) yn.fromBufferAttribute(this, t), yn.applyMatrix3(e), this.setXY(t, yn.x, yn.y);
		else if (this.itemSize === 3) for (let t = 0, n = this.count; t < n; t++) vn.fromBufferAttribute(this, t), vn.applyMatrix3(e), this.setXYZ(t, vn.x, vn.y, vn.z);
		return this;
	}
	applyMatrix4(e) {
		for (let t = 0, n = this.count; t < n; t++) vn.fromBufferAttribute(this, t), vn.applyMatrix4(e), this.setXYZ(t, vn.x, vn.y, vn.z);
		return this;
	}
	applyNormalMatrix(e) {
		for (let t = 0, n = this.count; t < n; t++) vn.fromBufferAttribute(this, t), vn.applyNormalMatrix(e), this.setXYZ(t, vn.x, vn.y, vn.z);
		return this;
	}
	transformDirection(e) {
		for (let t = 0, n = this.count; t < n; t++) vn.fromBufferAttribute(this, t), vn.transformDirection(e), this.setXYZ(t, vn.x, vn.y, vn.z);
		return this;
	}
	set(e, t = 0) {
		return this.array.set(e, t), this;
	}
	getComponent(e, t) {
		let n = this.array[e * this.itemSize + t];
		return this.normalized && (n = ge(n, this.array)), n;
	}
	setComponent(e, t, n) {
		return this.normalized && (n = V(n, this.array)), this.array[e * this.itemSize + t] = n, this;
	}
	getX(e) {
		let t = this.array[e * this.itemSize];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	setX(e, t) {
		return this.normalized && (t = V(t, this.array)), this.array[e * this.itemSize] = t, this;
	}
	getY(e) {
		let t = this.array[e * this.itemSize + 1];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	setY(e, t) {
		return this.normalized && (t = V(t, this.array)), this.array[e * this.itemSize + 1] = t, this;
	}
	getZ(e) {
		let t = this.array[e * this.itemSize + 2];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	setZ(e, t) {
		return this.normalized && (t = V(t, this.array)), this.array[e * this.itemSize + 2] = t, this;
	}
	getW(e) {
		let t = this.array[e * this.itemSize + 3];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	setW(e, t) {
		return this.normalized && (t = V(t, this.array)), this.array[e * this.itemSize + 3] = t, this;
	}
	setXY(e, t, n) {
		return e *= this.itemSize, this.normalized && (t = V(t, this.array), n = V(n, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this;
	}
	setXYZ(e, t, n, r) {
		return e *= this.itemSize, this.normalized && (t = V(t, this.array), n = V(n, this.array), r = V(r, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this;
	}
	setXYZW(e, t, n, r, i) {
		return e *= this.itemSize, this.normalized && (t = V(t, this.array), n = V(n, this.array), r = V(r, this.array), i = V(i, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this.array[e + 3] = i, this;
	}
	onUpload(e) {
		return this.onUploadCallback = e, this;
	}
	clone() {
		return new this.constructor(this.array, this.itemSize).copy(this);
	}
	toJSON() {
		let e = {
			itemSize: this.itemSize,
			type: this.array.constructor.name,
			array: Array.from(this.array),
			normalized: this.normalized
		};
		return this.name !== "" && (e.name = this.name), this.usage !== 35044 && (e.usage = this.usage), e;
	}
}, Sn = class extends xn {
	constructor(e, t, n) {
		super(new Uint16Array(e), t, n);
	}
}, Cn = class extends xn {
	constructor(e, t, n) {
		super(new Uint32Array(e), t, n);
	}
}, wn = class extends xn {
	constructor(e, t, n) {
		super(new Float32Array(e), t, n);
	}
}, Tn = 0, En = /*@__PURE__*/ new J(), Dn = /*@__PURE__*/ new Ut(), On = /*@__PURE__*/ new W(), kn = /*@__PURE__*/ new We(), An = /*@__PURE__*/ new We(), jn = /*@__PURE__*/ new W(), Mn = class e extends M {
	constructor() {
		super(), this.isBufferGeometry = !0, Object.defineProperty(this, "id", { value: Tn++ }), this.uuid = I(), this.name = "", this.type = "BufferGeometry", this.index = null, this.indirect = null, this.attributes = {}, this.morphAttributes = {}, this.morphTargetsRelative = !1, this.groups = [], this.boundingBox = null, this.boundingSphere = null, this.drawRange = {
			start: 0,
			count: Infinity
		}, this.userData = {};
	}
	getIndex() {
		return this.index;
	}
	setIndex(e) {
		return this.index = Array.isArray(e) ? new (xe(e) ? Cn : Sn)(e, 1) : e, this;
	}
	setIndirect(e) {
		return this.indirect = e, this;
	}
	getIndirect() {
		return this.indirect;
	}
	getAttribute(e) {
		return this.attributes[e];
	}
	setAttribute(e, t) {
		return this.attributes[e] = t, this;
	}
	deleteAttribute(e) {
		return delete this.attributes[e], this;
	}
	hasAttribute(e) {
		return this.attributes[e] !== void 0;
	}
	addGroup(e, t, n = 0) {
		this.groups.push({
			start: e,
			count: t,
			materialIndex: n
		});
	}
	clearGroups() {
		this.groups = [];
	}
	setDrawRange(e, t) {
		this.drawRange.start = e, this.drawRange.count = t;
	}
	applyMatrix4(e) {
		let t = this.attributes.position;
		t !== void 0 && (t.applyMatrix4(e), t.needsUpdate = !0);
		let n = this.attributes.normal;
		if (n !== void 0) {
			let t = new G().getNormalMatrix(e);
			n.applyNormalMatrix(t), n.needsUpdate = !0;
		}
		let r = this.attributes.tangent;
		return r !== void 0 && (r.transformDirection(e), r.needsUpdate = !0), this.boundingBox !== null && this.computeBoundingBox(), this.boundingSphere !== null && this.computeBoundingSphere(), this;
	}
	applyQuaternion(e) {
		return En.makeRotationFromQuaternion(e), this.applyMatrix4(En), this;
	}
	rotateX(e) {
		return En.makeRotationX(e), this.applyMatrix4(En), this;
	}
	rotateY(e) {
		return En.makeRotationY(e), this.applyMatrix4(En), this;
	}
	rotateZ(e) {
		return En.makeRotationZ(e), this.applyMatrix4(En), this;
	}
	translate(e, t, n) {
		return En.makeTranslation(e, t, n), this.applyMatrix4(En), this;
	}
	scale(e, t, n) {
		return En.makeScale(e, t, n), this.applyMatrix4(En), this;
	}
	lookAt(e) {
		return Dn.lookAt(e), Dn.updateMatrix(), this.applyMatrix4(Dn.matrix), this;
	}
	center() {
		return this.computeBoundingBox(), this.boundingBox.getCenter(On).negate(), this.translate(On.x, On.y, On.z), this;
	}
	setFromPoints(e) {
		let t = this.getAttribute("position");
		if (t === void 0) {
			let t = [];
			for (let n = 0, r = e.length; n < r; n++) {
				let r = e[n];
				t.push(r.x, r.y, r.z || 0);
			}
			this.setAttribute("position", new wn(t, 3));
		} else {
			let n = Math.min(e.length, t.count);
			for (let r = 0; r < n; r++) {
				let n = e[r];
				t.setXYZ(r, n.x, n.y, n.z || 0);
			}
			e.length > t.count && console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."), t.needsUpdate = !0;
		}
		return this;
	}
	computeBoundingBox() {
		this.boundingBox === null && (this.boundingBox = new We());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) {
			console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.", this), this.boundingBox.set(new W(-Infinity, -Infinity, -Infinity), new W(Infinity, Infinity, Infinity));
			return;
		}
		if (e !== void 0) {
			if (this.boundingBox.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
				let n = t[e];
				kn.setFromBufferAttribute(n), this.morphTargetsRelative ? (jn.addVectors(this.boundingBox.min, kn.min), this.boundingBox.expandByPoint(jn), jn.addVectors(this.boundingBox.max, kn.max), this.boundingBox.expandByPoint(jn)) : (this.boundingBox.expandByPoint(kn.min), this.boundingBox.expandByPoint(kn.max));
			}
		} else this.boundingBox.makeEmpty();
		(isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) && console.error("THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The \"position\" attribute is likely to have NaN values.", this);
	}
	computeBoundingSphere() {
		this.boundingSphere === null && (this.boundingSphere = new ct());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) {
			console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.", this), this.boundingSphere.set(new W(), Infinity);
			return;
		}
		if (e) {
			let n = this.boundingSphere.center;
			if (kn.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
				let n = t[e];
				An.setFromBufferAttribute(n), this.morphTargetsRelative ? (jn.addVectors(kn.min, An.min), kn.expandByPoint(jn), jn.addVectors(kn.max, An.max), kn.expandByPoint(jn)) : (kn.expandByPoint(An.min), kn.expandByPoint(An.max));
			}
			kn.getCenter(n);
			let r = 0;
			for (let t = 0, i = e.count; t < i; t++) jn.fromBufferAttribute(e, t), r = Math.max(r, n.distanceToSquared(jn));
			if (t) for (let i = 0, a = t.length; i < a; i++) {
				let a = t[i], o = this.morphTargetsRelative;
				for (let t = 0, i = a.count; t < i; t++) jn.fromBufferAttribute(a, t), o && (On.fromBufferAttribute(e, t), jn.add(On)), r = Math.max(r, n.distanceToSquared(jn));
			}
			this.boundingSphere.radius = Math.sqrt(r), isNaN(this.boundingSphere.radius) && console.error("THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The \"position\" attribute is likely to have NaN values.", this);
		}
	}
	computeTangents() {
		let e = this.index, t = this.attributes;
		if (e === null || t.position === void 0 || t.normal === void 0 || t.uv === void 0) {
			console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");
			return;
		}
		let n = t.position, r = t.normal, i = t.uv;
		this.hasAttribute("tangent") === !1 && this.setAttribute("tangent", new xn(new Float32Array(4 * n.count), 4));
		let a = this.getAttribute("tangent"), o = [], s = [];
		for (let e = 0; e < n.count; e++) o[e] = new W(), s[e] = new W();
		let c = new W(), l = new W(), u = new W(), d = new H(), f = new H(), p = new H(), m = new W(), h = new W();
		function g(e, t, r) {
			c.fromBufferAttribute(n, e), l.fromBufferAttribute(n, t), u.fromBufferAttribute(n, r), d.fromBufferAttribute(i, e), f.fromBufferAttribute(i, t), p.fromBufferAttribute(i, r), l.sub(c), u.sub(c), f.sub(d), p.sub(d);
			let a = 1 / (f.x * p.y - p.x * f.y);
			isFinite(a) && (m.copy(l).multiplyScalar(p.y).addScaledVector(u, -f.y).multiplyScalar(a), h.copy(u).multiplyScalar(f.x).addScaledVector(l, -p.x).multiplyScalar(a), o[e].add(m), o[t].add(m), o[r].add(m), s[e].add(h), s[t].add(h), s[r].add(h));
		}
		let _ = this.groups;
		_.length === 0 && (_ = [{
			start: 0,
			count: e.count
		}]);
		for (let t = 0, n = _.length; t < n; ++t) {
			let n = _[t], r = n.start, i = n.count;
			for (let t = r, n = r + i; t < n; t += 3) g(e.getX(t + 0), e.getX(t + 1), e.getX(t + 2));
		}
		let v = new W(), y = new W(), b = new W(), x = new W();
		function S(e) {
			b.fromBufferAttribute(r, e), x.copy(b);
			let t = o[e];
			v.copy(t), v.sub(b.multiplyScalar(b.dot(t))).normalize(), y.crossVectors(x, t);
			let n = y.dot(s[e]) < 0 ? -1 : 1;
			a.setXYZW(e, v.x, v.y, v.z, n);
		}
		for (let t = 0, n = _.length; t < n; ++t) {
			let n = _[t], r = n.start, i = n.count;
			for (let t = r, n = r + i; t < n; t += 3) S(e.getX(t + 0)), S(e.getX(t + 1)), S(e.getX(t + 2));
		}
	}
	computeVertexNormals() {
		let e = this.index, t = this.getAttribute("position");
		if (t !== void 0) {
			let n = this.getAttribute("normal");
			if (n === void 0) n = new xn(new Float32Array(t.count * 3), 3), this.setAttribute("normal", n);
			else for (let e = 0, t = n.count; e < t; e++) n.setXYZ(e, 0, 0, 0);
			let r = new W(), i = new W(), a = new W(), o = new W(), s = new W(), c = new W(), l = new W(), u = new W();
			if (e) for (let d = 0, f = e.count; d < f; d += 3) {
				let f = e.getX(d + 0), p = e.getX(d + 1), m = e.getX(d + 2);
				r.fromBufferAttribute(t, f), i.fromBufferAttribute(t, p), a.fromBufferAttribute(t, m), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), o.fromBufferAttribute(n, f), s.fromBufferAttribute(n, p), c.fromBufferAttribute(n, m), o.add(l), s.add(l), c.add(l), n.setXYZ(f, o.x, o.y, o.z), n.setXYZ(p, s.x, s.y, s.z), n.setXYZ(m, c.x, c.y, c.z);
			}
			else for (let e = 0, o = t.count; e < o; e += 3) r.fromBufferAttribute(t, e + 0), i.fromBufferAttribute(t, e + 1), a.fromBufferAttribute(t, e + 2), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), n.setXYZ(e + 0, l.x, l.y, l.z), n.setXYZ(e + 1, l.x, l.y, l.z), n.setXYZ(e + 2, l.x, l.y, l.z);
			this.normalizeNormals(), n.needsUpdate = !0;
		}
	}
	normalizeNormals() {
		let e = this.attributes.normal;
		for (let t = 0, n = e.count; t < n; t++) jn.fromBufferAttribute(e, t), jn.normalize(), e.setXYZ(t, jn.x, jn.y, jn.z);
	}
	toNonIndexed() {
		function t(e, t) {
			let n = e.array, r = e.itemSize, i = e.normalized, a = new n.constructor(t.length * r), o = 0, s = 0;
			for (let i = 0, c = t.length; i < c; i++) {
				o = e.isInterleavedBufferAttribute ? t[i] * e.data.stride + e.offset : t[i] * r;
				for (let e = 0; e < r; e++) a[s++] = n[o++];
			}
			return new xn(a, r, i);
		}
		if (this.index === null) return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."), this;
		let n = new e(), r = this.index.array, i = this.attributes;
		for (let e in i) {
			let a = i[e], o = t(a, r);
			n.setAttribute(e, o);
		}
		let a = this.morphAttributes;
		for (let e in a) {
			let i = [], o = a[e];
			for (let e = 0, n = o.length; e < n; e++) {
				let n = o[e], a = t(n, r);
				i.push(a);
			}
			n.morphAttributes[e] = i;
		}
		n.morphTargetsRelative = this.morphTargetsRelative;
		let o = this.groups;
		for (let e = 0, t = o.length; e < t; e++) {
			let t = o[e];
			n.addGroup(t.start, t.count, t.materialIndex);
		}
		return n;
	}
	toJSON() {
		let e = { metadata: {
			version: 4.7,
			type: "BufferGeometry",
			generator: "BufferGeometry.toJSON"
		} };
		if (e.uuid = this.uuid, e.type = this.type, this.name !== "" && (e.name = this.name), Object.keys(this.userData).length > 0 && (e.userData = this.userData), this.parameters !== void 0) {
			let t = this.parameters;
			for (let n in t) t[n] !== void 0 && (e[n] = t[n]);
			return e;
		}
		e.data = { attributes: {} };
		let t = this.index;
		t !== null && (e.data.index = {
			type: t.array.constructor.name,
			array: Array.prototype.slice.call(t.array)
		});
		let n = this.attributes;
		for (let t in n) {
			let r = n[t];
			e.data.attributes[t] = r.toJSON(e.data);
		}
		let r = {}, i = !1;
		for (let t in this.morphAttributes) {
			let n = this.morphAttributes[t], a = [];
			for (let t = 0, r = n.length; t < r; t++) {
				let r = n[t];
				a.push(r.toJSON(e.data));
			}
			a.length > 0 && (r[t] = a, i = !0);
		}
		i && (e.data.morphAttributes = r, e.data.morphTargetsRelative = this.morphTargetsRelative);
		let a = this.groups;
		a.length > 0 && (e.data.groups = JSON.parse(JSON.stringify(a)));
		let o = this.boundingSphere;
		return o !== null && (e.data.boundingSphere = o.toJSON()), e;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.index = null, this.attributes = {}, this.morphAttributes = {}, this.groups = [], this.boundingBox = null, this.boundingSphere = null;
		let t = {};
		this.name = e.name;
		let n = e.index;
		n !== null && this.setIndex(n.clone());
		let r = e.attributes;
		for (let e in r) {
			let n = r[e];
			this.setAttribute(e, n.clone(t));
		}
		let i = e.morphAttributes;
		for (let e in i) {
			let n = [], r = i[e];
			for (let e = 0, i = r.length; e < i; e++) n.push(r[e].clone(t));
			this.morphAttributes[e] = n;
		}
		this.morphTargetsRelative = e.morphTargetsRelative;
		let a = e.groups;
		for (let e = 0, t = a.length; e < t; e++) {
			let t = a[e];
			this.addGroup(t.start, t.count, t.materialIndex);
		}
		let o = e.boundingBox;
		o !== null && (this.boundingBox = o.clone());
		let s = e.boundingSphere;
		return s !== null && (this.boundingSphere = s.clone()), this.drawRange.start = e.drawRange.start, this.drawRange.count = e.drawRange.count, this.userData = e.userData, this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, Nn = /*@__PURE__*/ new J(), Pn = /*@__PURE__*/ new gt(), Fn = /*@__PURE__*/ new ct(), In = /*@__PURE__*/ new W(), Ln = /*@__PURE__*/ new W(), Rn = /*@__PURE__*/ new W(), zn = /*@__PURE__*/ new W(), Bn = /*@__PURE__*/ new W(), Vn = /*@__PURE__*/ new W(), Hn = /*@__PURE__*/ new W(), Un = /*@__PURE__*/ new W(), Wn = class extends Ut {
	constructor(e = new Mn(), t = new fn()) {
		super(), this.isMesh = !0, this.type = "Mesh", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.count = 1, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), e.morphTargetInfluences !== void 0 && (this.morphTargetInfluences = e.morphTargetInfluences.slice()), e.morphTargetDictionary !== void 0 && (this.morphTargetDictionary = Object.assign({}, e.morphTargetDictionary)), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
	getVertexPosition(e, t) {
		let n = this.geometry, r = n.attributes.position, i = n.morphAttributes.position, a = n.morphTargetsRelative;
		t.fromBufferAttribute(r, e);
		let o = this.morphTargetInfluences;
		if (i && o) {
			Vn.set(0, 0, 0);
			for (let n = 0, r = i.length; n < r; n++) {
				let r = o[n], s = i[n];
				r !== 0 && (Bn.fromBufferAttribute(s, e), a ? Vn.addScaledVector(Bn, r) : Vn.addScaledVector(Bn.sub(t), r));
			}
			t.add(Vn);
		}
		return t;
	}
	raycast(e, t) {
		let n = this.geometry, r = this.material, i = this.matrixWorld;
		r !== void 0 && (n.boundingSphere === null && n.computeBoundingSphere(), Fn.copy(n.boundingSphere), Fn.applyMatrix4(i), Pn.copy(e.ray).recast(e.near), !(Fn.containsPoint(Pn.origin) === !1 && (Pn.intersectSphere(Fn, In) === null || Pn.origin.distanceToSquared(In) > (e.far - e.near) ** 2)) && (Nn.copy(i).invert(), Pn.copy(e.ray).applyMatrix4(Nn), (n.boundingBox === null || Pn.intersectsBox(n.boundingBox) !== !1) && this._computeIntersections(e, t, Pn)));
	}
	_computeIntersections(e, t, n) {
		let r, i = this.geometry, a = this.material, o = i.index, s = i.attributes.position, c = i.attributes.uv, l = i.attributes.uv1, u = i.attributes.normal, d = i.groups, f = i.drawRange;
		if (o !== null) {
			if (Array.isArray(a)) for (let i = 0, s = d.length; i < s; i++) {
				let s = d[i], p = a[s.materialIndex], m = Math.max(s.start, f.start), h = Math.min(o.count, Math.min(s.start + s.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = o.getX(i), d = o.getX(i + 1), f = o.getX(i + 2);
					r = Kn(this, p, e, n, c, l, u, a, d, f), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = s.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), s = Math.min(o.count, f.start + f.count);
				for (let d = i, f = s; d < f; d += 3) {
					let i = o.getX(d), s = o.getX(d + 1), f = o.getX(d + 2);
					r = Kn(this, a, e, n, c, l, u, i, s, f), r && (r.faceIndex = Math.floor(d / 3), t.push(r));
				}
			}
		} else if (s !== void 0) {
			if (Array.isArray(a)) for (let i = 0, o = d.length; i < o; i++) {
				let o = d[i], p = a[o.materialIndex], m = Math.max(o.start, f.start), h = Math.min(s.count, Math.min(o.start + o.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = i, s = i + 1, d = i + 2;
					r = Kn(this, p, e, n, c, l, u, a, s, d), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = o.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), o = Math.min(s.count, f.start + f.count);
				for (let s = i, d = o; s < d; s += 3) {
					let i = s, o = s + 1, d = s + 2;
					r = Kn(this, a, e, n, c, l, u, i, o, d), r && (r.faceIndex = Math.floor(s / 3), t.push(r));
				}
			}
		}
	}
};
function Gn(e, t, n, r, i, a, o, s) {
	let c;
	if (c = t.side === 1 ? r.intersectTriangle(o, a, i, !0, s) : r.intersectTriangle(i, a, o, t.side === 0, s), c === null) return null;
	Un.copy(s), Un.applyMatrix4(e.matrixWorld);
	let l = n.ray.origin.distanceTo(Un);
	return l < n.near || l > n.far ? null : {
		distance: l,
		point: Un.clone(),
		object: e
	};
}
function Kn(e, t, n, r, i, a, o, s, c, l) {
	e.getVertexPosition(s, Ln), e.getVertexPosition(c, Rn), e.getVertexPosition(l, zn);
	let u = Gn(e, t, n, r, Ln, Rn, zn, Hn);
	if (u) {
		let e = new W();
		rn.getBarycoord(Hn, Ln, Rn, zn, e), i && (u.uv = rn.getInterpolatedAttribute(i, s, c, l, e, new H())), a && (u.uv1 = rn.getInterpolatedAttribute(a, s, c, l, e, new H())), o && (u.normal = rn.getInterpolatedAttribute(o, s, c, l, e, new W()), u.normal.dot(r.direction) > 0 && u.normal.multiplyScalar(-1));
		let t = {
			a: s,
			b: c,
			c: l,
			normal: new W(),
			materialIndex: 0
		};
		rn.getNormal(Ln, Rn, zn, t.normal), u.face = t, u.barycoord = e;
	}
	return u;
}
var qn = class e extends Mn {
	constructor(e = 1, t = 1, n = 1, r = 1, i = 1, a = 1) {
		super(), this.type = "BoxGeometry", this.parameters = {
			width: e,
			height: t,
			depth: n,
			widthSegments: r,
			heightSegments: i,
			depthSegments: a
		};
		let o = this;
		r = Math.floor(r), i = Math.floor(i), a = Math.floor(a);
		let s = [], c = [], l = [], u = [], d = 0, f = 0;
		p("z", "y", "x", -1, -1, n, t, e, a, i, 0), p("z", "y", "x", 1, -1, n, t, -e, a, i, 1), p("x", "z", "y", 1, 1, e, n, t, r, a, 2), p("x", "z", "y", 1, -1, e, n, -t, r, a, 3), p("x", "y", "z", 1, -1, e, t, n, r, i, 4), p("x", "y", "z", -1, -1, e, t, -n, r, i, 5), this.setIndex(s), this.setAttribute("position", new wn(c, 3)), this.setAttribute("normal", new wn(l, 3)), this.setAttribute("uv", new wn(u, 2));
		function p(e, t, n, r, i, a, p, m, h, g, _) {
			let v = a / h, y = p / g, b = a / 2, x = p / 2, S = m / 2, C = h + 1, w = g + 1, T = 0, E = 0, D = new W();
			for (let a = 0; a < w; a++) {
				let o = a * y - x;
				for (let s = 0; s < C; s++) D[e] = (s * v - b) * r, D[t] = o * i, D[n] = S, c.push(D.x, D.y, D.z), D[e] = 0, D[t] = 0, D[n] = m > 0 ? 1 : -1, l.push(D.x, D.y, D.z), u.push(s / h), u.push(1 - a / g), T += 1;
			}
			for (let e = 0; e < g; e++) for (let t = 0; t < h; t++) {
				let n = d + t + C * e, r = d + t + C * (e + 1), i = d + (t + 1) + C * (e + 1), a = d + (t + 1) + C * e;
				s.push(n, r, a), s.push(r, i, a), E += 6;
			}
			o.addGroup(f, E, _), f += E, d += T;
		}
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.depth, t.widthSegments, t.heightSegments, t.depthSegments);
	}
};
function Jn(e) {
	let t = {};
	for (let n in e) {
		t[n] = {};
		for (let r in e[n]) {
			let i = e[n][r];
			i && (i.isColor || i.isMatrix3 || i.isMatrix4 || i.isVector2 || i.isVector3 || i.isVector4 || i.isTexture || i.isQuaternion) ? i.isRenderTargetTexture ? (console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."), t[n][r] = null) : t[n][r] = i.clone() : Array.isArray(i) ? t[n][r] = i.slice() : t[n][r] = i;
		}
	}
	return t;
}
function Yn(e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = Jn(e[n]);
		for (let e in r) t[e] = r[e];
	}
	return t;
}
function Xn(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) t.push(e[n].clone());
	return t;
}
function Zn(e) {
	let t = e.getRenderTarget();
	return t === null ? e.outputColorSpace : t.isXRRenderTarget === !0 ? t.texture.colorSpace : K.workingColorSpace;
}
var Qn = {
	clone: Jn,
	merge: Yn
}, $n = "void main() {\n	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}", er = "void main() {\n	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );\n}", tr = class extends dn {
	constructor(e) {
		super(), this.isShaderMaterial = !0, this.type = "ShaderMaterial", this.defines = {}, this.uniforms = {}, this.uniformsGroups = [], this.vertexShader = $n, this.fragmentShader = er, this.linewidth = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.fog = !1, this.lights = !1, this.clipping = !1, this.forceSinglePass = !0, this.extensions = {
			clipCullDistance: !1,
			multiDraw: !1
		}, this.defaultAttributeValues = {
			color: [
				1,
				1,
				1
			],
			uv: [0, 0],
			uv1: [0, 0]
		}, this.index0AttributeName = void 0, this.uniformsNeedUpdate = !1, this.glslVersion = null, e !== void 0 && this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.fragmentShader = e.fragmentShader, this.vertexShader = e.vertexShader, this.uniforms = Jn(e.uniforms), this.uniformsGroups = Xn(e.uniformsGroups), this.defines = Object.assign({}, e.defines), this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.fog = e.fog, this.lights = e.lights, this.clipping = e.clipping, this.extensions = Object.assign({}, e.extensions), this.glslVersion = e.glslVersion, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		t.glslVersion = this.glslVersion, t.uniforms = {};
		for (let n in this.uniforms) {
			let r = this.uniforms[n].value;
			r && r.isTexture ? t.uniforms[n] = {
				type: "t",
				value: r.toJSON(e).uuid
			} : r && r.isColor ? t.uniforms[n] = {
				type: "c",
				value: r.getHex()
			} : r && r.isVector2 ? t.uniforms[n] = {
				type: "v2",
				value: r.toArray()
			} : r && r.isVector3 ? t.uniforms[n] = {
				type: "v3",
				value: r.toArray()
			} : r && r.isVector4 ? t.uniforms[n] = {
				type: "v4",
				value: r.toArray()
			} : r && r.isMatrix3 ? t.uniforms[n] = {
				type: "m3",
				value: r.toArray()
			} : r && r.isMatrix4 ? t.uniforms[n] = {
				type: "m4",
				value: r.toArray()
			} : t.uniforms[n] = { value: r };
		}
		Object.keys(this.defines).length > 0 && (t.defines = this.defines), t.vertexShader = this.vertexShader, t.fragmentShader = this.fragmentShader, t.lights = this.lights, t.clipping = this.clipping;
		let n = {};
		for (let e in this.extensions) this.extensions[e] === !0 && (n[e] = !0);
		return Object.keys(n).length > 0 && (t.extensions = n), t;
	}
}, nr = class extends Ut {
	constructor() {
		super(), this.isCamera = !0, this.type = "Camera", this.matrixWorldInverse = new J(), this.projectionMatrix = new J(), this.projectionMatrixInverse = new J(), this.coordinateSystem = j, this._reversedDepth = !1;
	}
	get reversedDepth() {
		return this._reversedDepth;
	}
	copy(e, t) {
		return super.copy(e, t), this.matrixWorldInverse.copy(e.matrixWorldInverse), this.projectionMatrix.copy(e.projectionMatrix), this.projectionMatrixInverse.copy(e.projectionMatrixInverse), this.coordinateSystem = e.coordinateSystem, this;
	}
	getWorldDirection(e) {
		return super.getWorldDirection(e).negate();
	}
	updateMatrixWorld(e) {
		super.updateMatrixWorld(e), this.matrixWorldInverse.copy(this.matrixWorld).invert();
	}
	updateWorldMatrix(e, t) {
		super.updateWorldMatrix(e, t), this.matrixWorldInverse.copy(this.matrixWorld).invert();
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, rr = /*@__PURE__*/ new W(), ir = /*@__PURE__*/ new H(), ar = /*@__PURE__*/ new H(), or = class extends nr {
	constructor(e = 50, t = 1, n = .1, r = 2e3) {
		super(), this.isPerspectiveCamera = !0, this.type = "PerspectiveCamera", this.fov = e, this.zoom = 1, this.near = n, this.far = r, this.focus = 10, this.aspect = t, this.view = null, this.filmGauge = 35, this.filmOffset = 0, this.updateProjectionMatrix();
	}
	copy(e, t) {
		return super.copy(e, t), this.fov = e.fov, this.zoom = e.zoom, this.near = e.near, this.far = e.far, this.focus = e.focus, this.aspect = e.aspect, this.view = e.view === null ? null : Object.assign({}, e.view), this.filmGauge = e.filmGauge, this.filmOffset = e.filmOffset, this;
	}
	setFocalLength(e) {
		let t = .5 * this.getFilmHeight() / e;
		this.fov = ee * 2 * Math.atan(t), this.updateProjectionMatrix();
	}
	getFocalLength() {
		let e = Math.tan(F * .5 * this.fov);
		return .5 * this.getFilmHeight() / e;
	}
	getEffectiveFOV() {
		return ee * 2 * Math.atan(Math.tan(F * .5 * this.fov) / this.zoom);
	}
	getFilmWidth() {
		return this.filmGauge * Math.min(this.aspect, 1);
	}
	getFilmHeight() {
		return this.filmGauge / Math.max(this.aspect, 1);
	}
	getViewBounds(e, t, n) {
		rr.set(-1, -1, .5).applyMatrix4(this.projectionMatrixInverse), t.set(rr.x, rr.y).multiplyScalar(-e / rr.z), rr.set(1, 1, .5).applyMatrix4(this.projectionMatrixInverse), n.set(rr.x, rr.y).multiplyScalar(-e / rr.z);
	}
	getViewSize(e, t) {
		return this.getViewBounds(e, ir, ar), t.subVectors(ar, ir);
	}
	setViewOffset(e, t, n, r, i, a) {
		this.aspect = e / t, this.view === null && (this.view = {
			enabled: !0,
			fullWidth: 1,
			fullHeight: 1,
			offsetX: 0,
			offsetY: 0,
			width: 1,
			height: 1
		}), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = r, this.view.width = i, this.view.height = a, this.updateProjectionMatrix();
	}
	clearViewOffset() {
		this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = this.near, t = e * Math.tan(F * .5 * this.fov) / this.zoom, n = 2 * t, r = this.aspect * n, i = -.5 * r, a = this.view;
		if (this.view !== null && this.view.enabled) {
			let e = a.fullWidth, o = a.fullHeight;
			i += a.offsetX * r / e, t -= a.offsetY * n / o, r *= a.width / e, n *= a.height / o;
		}
		let o = this.filmOffset;
		o !== 0 && (i += e * o / this.getFilmWidth()), this.projectionMatrix.makePerspective(i, i + r, t, t - n, e, this.far, this.coordinateSystem, this.reversedDepth), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.fov = this.fov, t.object.zoom = this.zoom, t.object.near = this.near, t.object.far = this.far, t.object.focus = this.focus, t.object.aspect = this.aspect, this.view !== null && (t.object.view = Object.assign({}, this.view)), t.object.filmGauge = this.filmGauge, t.object.filmOffset = this.filmOffset, t;
	}
}, sr = -90, cr = 1, lr = class extends Ut {
	constructor(e, t, n) {
		super(), this.type = "CubeCamera", this.renderTarget = n, this.coordinateSystem = null, this.activeMipmapLevel = 0;
		let r = new or(sr, cr, e, t);
		r.layers = this.layers, this.add(r);
		let i = new or(sr, cr, e, t);
		i.layers = this.layers, this.add(i);
		let a = new or(sr, cr, e, t);
		a.layers = this.layers, this.add(a);
		let o = new or(sr, cr, e, t);
		o.layers = this.layers, this.add(o);
		let s = new or(sr, cr, e, t);
		s.layers = this.layers, this.add(s);
		let c = new or(sr, cr, e, t);
		c.layers = this.layers, this.add(c);
	}
	updateCoordinateSystem() {
		let e = this.coordinateSystem, t = this.children.concat(), [n, r, i, a, o, s] = t;
		for (let e of t) this.remove(e);
		if (e === 2e3) n.up.set(0, 1, 0), n.lookAt(1, 0, 0), r.up.set(0, 1, 0), r.lookAt(-1, 0, 0), i.up.set(0, 0, -1), i.lookAt(0, 1, 0), a.up.set(0, 0, 1), a.lookAt(0, -1, 0), o.up.set(0, 1, 0), o.lookAt(0, 0, 1), s.up.set(0, 1, 0), s.lookAt(0, 0, -1);
		else if (e === 2001) n.up.set(0, -1, 0), n.lookAt(-1, 0, 0), r.up.set(0, -1, 0), r.lookAt(1, 0, 0), i.up.set(0, 0, 1), i.lookAt(0, 1, 0), a.up.set(0, 0, -1), a.lookAt(0, -1, 0), o.up.set(0, -1, 0), o.lookAt(0, 0, 1), s.up.set(0, -1, 0), s.lookAt(0, 0, -1);
		else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: " + e);
		for (let e of t) this.add(e), e.updateMatrixWorld();
	}
	update(e, t) {
		this.parent === null && this.updateMatrixWorld();
		let { renderTarget: n, activeMipmapLevel: r } = this;
		this.coordinateSystem !== e.coordinateSystem && (this.coordinateSystem = e.coordinateSystem, this.updateCoordinateSystem());
		let [i, a, o, s, c, l] = this.children, u = e.getRenderTarget(), d = e.getActiveCubeFace(), f = e.getActiveMipmapLevel(), p = e.xr.enabled;
		e.xr.enabled = !1;
		let m = n.texture.generateMipmaps;
		n.texture.generateMipmaps = !1, e.setRenderTarget(n, 0, r), e.render(t, i), e.setRenderTarget(n, 1, r), e.render(t, a), e.setRenderTarget(n, 2, r), e.render(t, o), e.setRenderTarget(n, 3, r), e.render(t, s), e.setRenderTarget(n, 4, r), e.render(t, c), n.texture.generateMipmaps = m, e.setRenderTarget(n, 5, r), e.render(t, l), e.setRenderTarget(u, d, f), e.xr.enabled = p, n.texture.needsPMREMUpdate = !0;
	}
}, ur = class extends q {
	constructor(e = [], t = 301, n, r, i, a, o, s, c, l) {
		super(e, t, n, r, i, a, o, s, c, l), this.isCubeTexture = !0, this.flipY = !1;
	}
	get images() {
		return this.image;
	}
	set images(e) {
		this.image = e;
	}
}, dr = class extends Ve {
	constructor(e = 1, t = {}) {
		super(e, e, t), this.isWebGLCubeRenderTarget = !0;
		let n = {
			width: e,
			height: e,
			depth: 1
		}, r = [
			n,
			n,
			n,
			n,
			n,
			n
		];
		this.texture = new ur(r), this._setTextureOptions(t), this.texture.isRenderTargetTexture = !0;
	}
	fromEquirectangularTexture(e, t) {
		this.texture.type = t.type, this.texture.colorSpace = t.colorSpace, this.texture.generateMipmaps = t.generateMipmaps, this.texture.minFilter = t.minFilter, this.texture.magFilter = t.magFilter;
		let n = {
			uniforms: { tEquirect: { value: null } },
			vertexShader: "\n\n				varying vec3 vWorldDirection;\n\n				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n\n					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n\n				}\n\n				void main() {\n\n					vWorldDirection = transformDirection( position, modelMatrix );\n\n					#include <begin_vertex>\n					#include <project_vertex>\n\n				}\n			",
			fragmentShader: "\n\n				uniform sampler2D tEquirect;\n\n				varying vec3 vWorldDirection;\n\n				#include <common>\n\n				void main() {\n\n					vec3 direction = normalize( vWorldDirection );\n\n					vec2 sampleUV = equirectUv( direction );\n\n					gl_FragColor = texture2D( tEquirect, sampleUV );\n\n				}\n			"
		}, r = new qn(5, 5, 5), i = new tr({
			name: "CubemapFromEquirect",
			uniforms: Jn(n.uniforms),
			vertexShader: n.vertexShader,
			fragmentShader: n.fragmentShader,
			side: 1,
			blending: 0
		});
		i.uniforms.tEquirect.value = t;
		let a = new Wn(r, i), s = t.minFilter;
		return t.minFilter === 1008 && (t.minFilter = o), new lr(1, 10, this).update(e, a), t.minFilter = s, a.geometry.dispose(), a.material.dispose(), this;
	}
	clear(e, t = !0, n = !0, r = !0) {
		let i = e.getRenderTarget();
		for (let i = 0; i < 6; i++) e.setRenderTarget(this, i), e.clear(t, n, r);
		e.setRenderTarget(i);
	}
}, fr = class extends Ut {
	constructor() {
		super(), this.isGroup = !0, this.type = "Group";
	}
}, pr = { type: "move" }, mr = class {
	constructor() {
		this._targetRay = null, this._grip = null, this._hand = null;
	}
	getHandSpace() {
		return this._hand === null && (this._hand = new fr(), this._hand.matrixAutoUpdate = !1, this._hand.visible = !1, this._hand.joints = {}, this._hand.inputState = { pinching: !1 }), this._hand;
	}
	getTargetRaySpace() {
		return this._targetRay === null && (this._targetRay = new fr(), this._targetRay.matrixAutoUpdate = !1, this._targetRay.visible = !1, this._targetRay.hasLinearVelocity = !1, this._targetRay.linearVelocity = new W(), this._targetRay.hasAngularVelocity = !1, this._targetRay.angularVelocity = new W()), this._targetRay;
	}
	getGripSpace() {
		return this._grip === null && (this._grip = new fr(), this._grip.matrixAutoUpdate = !1, this._grip.visible = !1, this._grip.hasLinearVelocity = !1, this._grip.linearVelocity = new W(), this._grip.hasAngularVelocity = !1, this._grip.angularVelocity = new W()), this._grip;
	}
	dispatchEvent(e) {
		return this._targetRay !== null && this._targetRay.dispatchEvent(e), this._grip !== null && this._grip.dispatchEvent(e), this._hand !== null && this._hand.dispatchEvent(e), this;
	}
	connect(e) {
		if (e && e.hand) {
			let t = this._hand;
			if (t) for (let n of e.hand.values()) this._getHandJoint(t, n);
		}
		return this.dispatchEvent({
			type: "connected",
			data: e
		}), this;
	}
	disconnect(e) {
		return this.dispatchEvent({
			type: "disconnected",
			data: e
		}), this._targetRay !== null && (this._targetRay.visible = !1), this._grip !== null && (this._grip.visible = !1), this._hand !== null && (this._hand.visible = !1), this;
	}
	update(e, t, n) {
		let r = null, i = null, a = null, o = this._targetRay, s = this._grip, c = this._hand;
		if (e && t.session.visibilityState !== "visible-blurred") {
			if (c && e.hand) {
				a = !0;
				for (let r of e.hand.values()) {
					let e = t.getJointPose(r, n), i = this._getHandJoint(c, r);
					e !== null && (i.matrix.fromArray(e.transform.matrix), i.matrix.decompose(i.position, i.rotation, i.scale), i.matrixWorldNeedsUpdate = !0, i.jointRadius = e.radius), i.visible = e !== null;
				}
				let r = c.joints["index-finger-tip"], i = c.joints["thumb-tip"], o = r.position.distanceTo(i.position);
				c.inputState.pinching && o > .025 ? (c.inputState.pinching = !1, this.dispatchEvent({
					type: "pinchend",
					handedness: e.handedness,
					target: this
				})) : !c.inputState.pinching && o <= .015 && (c.inputState.pinching = !0, this.dispatchEvent({
					type: "pinchstart",
					handedness: e.handedness,
					target: this
				}));
			} else s !== null && e.gripSpace && (i = t.getPose(e.gripSpace, n), i !== null && (s.matrix.fromArray(i.transform.matrix), s.matrix.decompose(s.position, s.rotation, s.scale), s.matrixWorldNeedsUpdate = !0, i.linearVelocity ? (s.hasLinearVelocity = !0, s.linearVelocity.copy(i.linearVelocity)) : s.hasLinearVelocity = !1, i.angularVelocity ? (s.hasAngularVelocity = !0, s.angularVelocity.copy(i.angularVelocity)) : s.hasAngularVelocity = !1));
			o !== null && (r = t.getPose(e.targetRaySpace, n), r === null && i !== null && (r = i), r !== null && (o.matrix.fromArray(r.transform.matrix), o.matrix.decompose(o.position, o.rotation, o.scale), o.matrixWorldNeedsUpdate = !0, r.linearVelocity ? (o.hasLinearVelocity = !0, o.linearVelocity.copy(r.linearVelocity)) : o.hasLinearVelocity = !1, r.angularVelocity ? (o.hasAngularVelocity = !0, o.angularVelocity.copy(r.angularVelocity)) : o.hasAngularVelocity = !1, this.dispatchEvent(pr)));
		}
		return o !== null && (o.visible = r !== null), s !== null && (s.visible = i !== null), c !== null && (c.visible = a !== null), this;
	}
	_getHandJoint(e, t) {
		if (e.joints[t.jointName] === void 0) {
			let n = new fr();
			n.matrixAutoUpdate = !1, n.visible = !1, e.joints[t.jointName] = n, e.add(n);
		}
		return e.joints[t.jointName];
	}
}, hr = class e {
	constructor(e, t = 25e-5) {
		this.isFogExp2 = !0, this.name = "", this.color = new Y(e), this.density = t;
	}
	clone() {
		return new e(this.color, this.density);
	}
	toJSON() {
		return {
			type: "FogExp2",
			name: this.name,
			color: this.color.getHex(),
			density: this.density
		};
	}
}, gr = class extends Ut {
	constructor() {
		super(), this.isScene = !0, this.type = "Scene", this.background = null, this.environment = null, this.fog = null, this.backgroundBlurriness = 0, this.backgroundIntensity = 1, this.backgroundRotation = new Et(), this.environmentIntensity = 1, this.environmentRotation = new Et(), this.overrideMaterial = null, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	copy(e, t) {
		return super.copy(e, t), e.background !== null && (this.background = e.background.clone()), e.environment !== null && (this.environment = e.environment.clone()), e.fog !== null && (this.fog = e.fog.clone()), this.backgroundBlurriness = e.backgroundBlurriness, this.backgroundIntensity = e.backgroundIntensity, this.backgroundRotation.copy(e.backgroundRotation), this.environmentIntensity = e.environmentIntensity, this.environmentRotation.copy(e.environmentRotation), e.overrideMaterial !== null && (this.overrideMaterial = e.overrideMaterial.clone()), this.matrixAutoUpdate = e.matrixAutoUpdate, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return this.fog !== null && (t.object.fog = this.fog.toJSON()), this.backgroundBlurriness > 0 && (t.object.backgroundBlurriness = this.backgroundBlurriness), this.backgroundIntensity !== 1 && (t.object.backgroundIntensity = this.backgroundIntensity), t.object.backgroundRotation = this.backgroundRotation.toArray(), this.environmentIntensity !== 1 && (t.object.environmentIntensity = this.environmentIntensity), t.object.environmentRotation = this.environmentRotation.toArray(), t;
	}
}, _r = class {
	constructor(e, t) {
		this.isInterleavedBuffer = !0, this.array = e, this.stride = t, this.count = e === void 0 ? 0 : e.length / t, this.usage = A, this.updateRanges = [], this.version = 0, this.uuid = I();
	}
	onUploadCallback() {}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	setUsage(e) {
		return this.usage = e, this;
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	copy(e) {
		return this.array = new e.array.constructor(e.array), this.count = e.count, this.stride = e.stride, this.usage = e.usage, this;
	}
	copyAt(e, t, n) {
		e *= this.stride, n *= t.stride;
		for (let r = 0, i = this.stride; r < i; r++) this.array[e + r] = t.array[n + r];
		return this;
	}
	set(e, t = 0) {
		return this.array.set(e, t), this;
	}
	clone(e) {
		e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = I()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = this.array.slice(0).buffer);
		let t = new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]), n = new this.constructor(t, this.stride);
		return n.setUsage(this.usage), n;
	}
	onUpload(e) {
		return this.onUploadCallback = e, this;
	}
	toJSON(e) {
		return e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = I()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = Array.from(new Uint32Array(this.array.buffer))), {
			uuid: this.uuid,
			buffer: this.array.buffer._uuid,
			type: this.array.constructor.name,
			stride: this.stride
		};
	}
}, vr = /*@__PURE__*/ new W(), yr = class e {
	constructor(e, t, n, r = !1) {
		this.isInterleavedBufferAttribute = !0, this.name = "", this.data = e, this.itemSize = t, this.offset = n, this.normalized = r;
	}
	get count() {
		return this.data.count;
	}
	get array() {
		return this.data.array;
	}
	set needsUpdate(e) {
		this.data.needsUpdate = e;
	}
	applyMatrix4(e) {
		for (let t = 0, n = this.data.count; t < n; t++) vr.fromBufferAttribute(this, t), vr.applyMatrix4(e), this.setXYZ(t, vr.x, vr.y, vr.z);
		return this;
	}
	applyNormalMatrix(e) {
		for (let t = 0, n = this.count; t < n; t++) vr.fromBufferAttribute(this, t), vr.applyNormalMatrix(e), this.setXYZ(t, vr.x, vr.y, vr.z);
		return this;
	}
	transformDirection(e) {
		for (let t = 0, n = this.count; t < n; t++) vr.fromBufferAttribute(this, t), vr.transformDirection(e), this.setXYZ(t, vr.x, vr.y, vr.z);
		return this;
	}
	getComponent(e, t) {
		let n = this.array[e * this.data.stride + this.offset + t];
		return this.normalized && (n = ge(n, this.array)), n;
	}
	setComponent(e, t, n) {
		return this.normalized && (n = V(n, this.array)), this.data.array[e * this.data.stride + this.offset + t] = n, this;
	}
	setX(e, t) {
		return this.normalized && (t = V(t, this.array)), this.data.array[e * this.data.stride + this.offset] = t, this;
	}
	setY(e, t) {
		return this.normalized && (t = V(t, this.array)), this.data.array[e * this.data.stride + this.offset + 1] = t, this;
	}
	setZ(e, t) {
		return this.normalized && (t = V(t, this.array)), this.data.array[e * this.data.stride + this.offset + 2] = t, this;
	}
	setW(e, t) {
		return this.normalized && (t = V(t, this.array)), this.data.array[e * this.data.stride + this.offset + 3] = t, this;
	}
	getX(e) {
		let t = this.data.array[e * this.data.stride + this.offset];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	getY(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 1];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	getZ(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 2];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	getW(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 3];
		return this.normalized && (t = ge(t, this.array)), t;
	}
	setXY(e, t, n) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = V(t, this.array), n = V(n, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this;
	}
	setXYZ(e, t, n, r) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = V(t, this.array), n = V(n, this.array), r = V(r, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = r, this;
	}
	setXYZW(e, t, n, r, i) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = V(t, this.array), n = V(n, this.array), r = V(r, this.array), i = V(i, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = r, this.data.array[e + 3] = i, this;
	}
	clone(t) {
		if (t === void 0) {
			console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");
			let e = [];
			for (let t = 0; t < this.count; t++) {
				let n = t * this.data.stride + this.offset;
				for (let t = 0; t < this.itemSize; t++) e.push(this.data.array[n + t]);
			}
			return new xn(new this.array.constructor(e), this.itemSize, this.normalized);
		}
		return t.interleavedBuffers === void 0 && (t.interleavedBuffers = {}), t.interleavedBuffers[this.data.uuid] === void 0 && (t.interleavedBuffers[this.data.uuid] = this.data.clone(t)), new e(t.interleavedBuffers[this.data.uuid], this.itemSize, this.offset, this.normalized);
	}
	toJSON(e) {
		if (e === void 0) {
			console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");
			let e = [];
			for (let t = 0; t < this.count; t++) {
				let n = t * this.data.stride + this.offset;
				for (let t = 0; t < this.itemSize; t++) e.push(this.data.array[n + t]);
			}
			return {
				itemSize: this.itemSize,
				type: this.array.constructor.name,
				array: e,
				normalized: this.normalized
			};
		}
		return e.interleavedBuffers === void 0 && (e.interleavedBuffers = {}), e.interleavedBuffers[this.data.uuid] === void 0 && (e.interleavedBuffers[this.data.uuid] = this.data.toJSON(e)), {
			isInterleavedBufferAttribute: !0,
			itemSize: this.itemSize,
			data: this.data.uuid,
			offset: this.offset,
			normalized: this.normalized
		};
	}
}, br = /*@__PURE__*/ new W(), xr = /*@__PURE__*/ new ze(), Sr = /*@__PURE__*/ new ze(), Cr = /*@__PURE__*/ new W(), wr = /*@__PURE__*/ new J(), Tr = /*@__PURE__*/ new W(), Er = /*@__PURE__*/ new ct(), Dr = /*@__PURE__*/ new J(), Or = /*@__PURE__*/ new gt(), kr = class extends Wn {
	constructor(e, t) {
		super(e, t), this.isSkinnedMesh = !0, this.type = "SkinnedMesh", this.bindMode = "attached", this.bindMatrix = new J(), this.bindMatrixInverse = new J(), this.boundingBox = null, this.boundingSphere = null;
	}
	computeBoundingBox() {
		let e = this.geometry;
		this.boundingBox === null && (this.boundingBox = new We()), this.boundingBox.makeEmpty();
		let t = e.getAttribute("position");
		for (let e = 0; e < t.count; e++) this.getVertexPosition(e, Tr), this.boundingBox.expandByPoint(Tr);
	}
	computeBoundingSphere() {
		let e = this.geometry;
		this.boundingSphere === null && (this.boundingSphere = new ct()), this.boundingSphere.makeEmpty();
		let t = e.getAttribute("position");
		for (let e = 0; e < t.count; e++) this.getVertexPosition(e, Tr), this.boundingSphere.expandByPoint(Tr);
	}
	copy(e, t) {
		return super.copy(e, t), this.bindMode = e.bindMode, this.bindMatrix.copy(e.bindMatrix), this.bindMatrixInverse.copy(e.bindMatrixInverse), this.skeleton = e.skeleton, e.boundingBox !== null && (this.boundingBox = e.boundingBox.clone()), e.boundingSphere !== null && (this.boundingSphere = e.boundingSphere.clone()), this;
	}
	raycast(e, t) {
		let n = this.material, r = this.matrixWorld;
		n !== void 0 && (this.boundingSphere === null && this.computeBoundingSphere(), Er.copy(this.boundingSphere), Er.applyMatrix4(r), e.ray.intersectsSphere(Er) !== !1 && (Dr.copy(r).invert(), Or.copy(e.ray).applyMatrix4(Dr), (this.boundingBox === null || Or.intersectsBox(this.boundingBox) !== !1) && this._computeIntersections(e, t, Or)));
	}
	getVertexPosition(e, t) {
		return super.getVertexPosition(e, t), this.applyBoneTransform(e, t), t;
	}
	bind(e, t) {
		this.skeleton = e, t === void 0 && (this.updateMatrixWorld(!0), this.skeleton.calculateInverses(), t = this.matrixWorld), this.bindMatrix.copy(t), this.bindMatrixInverse.copy(t).invert();
	}
	pose() {
		this.skeleton.pose();
	}
	normalizeSkinWeights() {
		let e = new ze(), t = this.geometry.attributes.skinWeight;
		for (let n = 0, r = t.count; n < r; n++) {
			e.fromBufferAttribute(t, n);
			let r = 1 / e.manhattanLength();
			r === Infinity ? e.set(1, 0, 0, 0) : e.multiplyScalar(r), t.setXYZW(n, e.x, e.y, e.z, e.w);
		}
	}
	updateMatrixWorld(e) {
		super.updateMatrixWorld(e), this.bindMode === "attached" ? this.bindMatrixInverse.copy(this.matrixWorld).invert() : this.bindMode === "detached" ? this.bindMatrixInverse.copy(this.bindMatrix).invert() : console.warn("THREE.SkinnedMesh: Unrecognized bindMode: " + this.bindMode);
	}
	applyBoneTransform(e, t) {
		let n = this.skeleton, r = this.geometry;
		xr.fromBufferAttribute(r.attributes.skinIndex, e), Sr.fromBufferAttribute(r.attributes.skinWeight, e), br.copy(t).applyMatrix4(this.bindMatrix), t.set(0, 0, 0);
		for (let e = 0; e < 4; e++) {
			let r = Sr.getComponent(e);
			if (r !== 0) {
				let i = xr.getComponent(e);
				wr.multiplyMatrices(n.bones[i].matrixWorld, n.boneInverses[i]), t.addScaledVector(Cr.copy(br).applyMatrix4(wr), r);
			}
		}
		return t.applyMatrix4(this.bindMatrixInverse);
	}
}, Ar = class extends Ut {
	constructor() {
		super(), this.isBone = !0, this.type = "Bone";
	}
}, jr = class extends q {
	constructor(e = null, t = 1, n = 1, i, a, o, s, c, l = r, u = r, d, f) {
		super(null, o, s, c, l, u, i, a, d, f), this.isDataTexture = !0, this.image = {
			data: e,
			width: t,
			height: n
		}, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
	}
}, Mr = /*@__PURE__*/ new J(), Nr = /*@__PURE__*/ new J(), Pr = class e {
	constructor(e = [], t = []) {
		this.uuid = I(), this.bones = e.slice(0), this.boneInverses = t, this.boneMatrices = null, this.boneTexture = null, this.init();
	}
	init() {
		let e = this.bones, t = this.boneInverses;
		if (this.boneMatrices = new Float32Array(e.length * 16), t.length === 0) this.calculateInverses();
		else if (e.length !== t.length) {
			console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."), this.boneInverses = [];
			for (let e = 0, t = this.bones.length; e < t; e++) this.boneInverses.push(new J());
		}
	}
	calculateInverses() {
		this.boneInverses.length = 0;
		for (let e = 0, t = this.bones.length; e < t; e++) {
			let t = new J();
			this.bones[e] && t.copy(this.bones[e].matrixWorld).invert(), this.boneInverses.push(t);
		}
	}
	pose() {
		for (let e = 0, t = this.bones.length; e < t; e++) {
			let t = this.bones[e];
			t && t.matrixWorld.copy(this.boneInverses[e]).invert();
		}
		for (let e = 0, t = this.bones.length; e < t; e++) {
			let t = this.bones[e];
			t && (t.parent && t.parent.isBone ? (t.matrix.copy(t.parent.matrixWorld).invert(), t.matrix.multiply(t.matrixWorld)) : t.matrix.copy(t.matrixWorld), t.matrix.decompose(t.position, t.quaternion, t.scale));
		}
	}
	update() {
		let e = this.bones, t = this.boneInverses, n = this.boneMatrices, r = this.boneTexture;
		for (let r = 0, i = e.length; r < i; r++) {
			let i = e[r] ? e[r].matrixWorld : Nr;
			Mr.multiplyMatrices(i, t[r]), Mr.toArray(n, r * 16);
		}
		r !== null && (r.needsUpdate = !0);
	}
	clone() {
		return new e(this.bones, this.boneInverses);
	}
	computeBoneTexture() {
		let e = Math.sqrt(this.bones.length * 4);
		e = Math.ceil(e / 4) * 4, e = Math.max(e, 4);
		let t = new Float32Array(e * e * 4);
		t.set(this.boneMatrices);
		let n = new jr(t, e, e, m, d);
		return n.needsUpdate = !0, this.boneMatrices = t, this.boneTexture = n, this;
	}
	getBoneByName(e) {
		for (let t = 0, n = this.bones.length; t < n; t++) {
			let n = this.bones[t];
			if (n.name === e) return n;
		}
	}
	dispose() {
		this.boneTexture !== null && (this.boneTexture.dispose(), this.boneTexture = null);
	}
	fromJSON(e, t) {
		this.uuid = e.uuid;
		for (let n = 0, r = e.bones.length; n < r; n++) {
			let r = e.bones[n], i = t[r];
			i === void 0 && (console.warn("THREE.Skeleton: No bone found with UUID:", r), i = new Ar()), this.bones.push(i), this.boneInverses.push(new J().fromArray(e.boneInverses[n]));
		}
		return this.init(), this;
	}
	toJSON() {
		let e = {
			metadata: {
				version: 4.7,
				type: "Skeleton",
				generator: "Skeleton.toJSON"
			},
			bones: [],
			boneInverses: []
		};
		e.uuid = this.uuid;
		let t = this.bones, n = this.boneInverses;
		for (let r = 0, i = t.length; r < i; r++) {
			let i = t[r];
			e.bones.push(i.uuid);
			let a = n[r];
			e.boneInverses.push(a.toArray());
		}
		return e;
	}
}, Fr = class extends xn {
	constructor(e, t, n, r = 1) {
		super(e, t, n), this.isInstancedBufferAttribute = !0, this.meshPerAttribute = r;
	}
	copy(e) {
		return super.copy(e), this.meshPerAttribute = e.meshPerAttribute, this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.meshPerAttribute = this.meshPerAttribute, e.isInstancedBufferAttribute = !0, e;
	}
}, Ir = /*@__PURE__*/ new J(), Lr = /*@__PURE__*/ new J(), Rr = [], zr = /*@__PURE__*/ new We(), Br = /*@__PURE__*/ new J(), Vr = /*@__PURE__*/ new Wn(), Hr = /*@__PURE__*/ new ct(), Ur = class extends Wn {
	constructor(e, t, n) {
		super(e, t), this.isInstancedMesh = !0, this.instanceMatrix = new Fr(new Float32Array(n * 16), 16), this.instanceColor = null, this.morphTexture = null, this.count = n, this.boundingBox = null, this.boundingSphere = null;
		for (let e = 0; e < n; e++) this.setMatrixAt(e, Br);
	}
	computeBoundingBox() {
		let e = this.geometry, t = this.count;
		this.boundingBox === null && (this.boundingBox = new We()), e.boundingBox === null && e.computeBoundingBox(), this.boundingBox.makeEmpty();
		for (let n = 0; n < t; n++) this.getMatrixAt(n, Ir), zr.copy(e.boundingBox).applyMatrix4(Ir), this.boundingBox.union(zr);
	}
	computeBoundingSphere() {
		let e = this.geometry, t = this.count;
		this.boundingSphere === null && (this.boundingSphere = new ct()), e.boundingSphere === null && e.computeBoundingSphere(), this.boundingSphere.makeEmpty();
		for (let n = 0; n < t; n++) this.getMatrixAt(n, Ir), Hr.copy(e.boundingSphere).applyMatrix4(Ir), this.boundingSphere.union(Hr);
	}
	copy(e, t) {
		return super.copy(e, t), this.instanceMatrix.copy(e.instanceMatrix), e.morphTexture !== null && (this.morphTexture = e.morphTexture.clone()), e.instanceColor !== null && (this.instanceColor = e.instanceColor.clone()), this.count = e.count, e.boundingBox !== null && (this.boundingBox = e.boundingBox.clone()), e.boundingSphere !== null && (this.boundingSphere = e.boundingSphere.clone()), this;
	}
	getColorAt(e, t) {
		t.fromArray(this.instanceColor.array, e * 3);
	}
	getMatrixAt(e, t) {
		t.fromArray(this.instanceMatrix.array, e * 16);
	}
	getMorphAt(e, t) {
		let n = t.morphTargetInfluences, r = this.morphTexture.source.data.data, i = e * (n.length + 1) + 1;
		for (let e = 0; e < n.length; e++) n[e] = r[i + e];
	}
	raycast(e, t) {
		let n = this.matrixWorld, r = this.count;
		if (Vr.geometry = this.geometry, Vr.material = this.material, Vr.material !== void 0 && (this.boundingSphere === null && this.computeBoundingSphere(), Hr.copy(this.boundingSphere), Hr.applyMatrix4(n), e.ray.intersectsSphere(Hr) !== !1)) for (let i = 0; i < r; i++) {
			this.getMatrixAt(i, Ir), Lr.multiplyMatrices(n, Ir), Vr.matrixWorld = Lr, Vr.raycast(e, Rr);
			for (let e = 0, n = Rr.length; e < n; e++) {
				let n = Rr[e];
				n.instanceId = i, n.object = this, t.push(n);
			}
			Rr.length = 0;
		}
	}
	setColorAt(e, t) {
		this.instanceColor === null && (this.instanceColor = new Fr(new Float32Array(this.instanceMatrix.count * 3).fill(1), 3)), t.toArray(this.instanceColor.array, e * 3);
	}
	setMatrixAt(e, t) {
		t.toArray(this.instanceMatrix.array, e * 16);
	}
	setMorphAt(e, t) {
		let n = t.morphTargetInfluences, r = n.length + 1;
		this.morphTexture === null && (this.morphTexture = new jr(new Float32Array(r * this.count), r, this.count, _, d));
		let i = this.morphTexture.source.data.data, a = 0;
		for (let e = 0; e < n.length; e++) a += n[e];
		let o = this.geometry.morphTargetsRelative ? 1 : 1 - a, s = r * e;
		i[s] = o, i.set(n, s + 1);
	}
	updateMorphTargets() {}
	dispose() {
		this.dispatchEvent({ type: "dispose" }), this.morphTexture !== null && (this.morphTexture.dispose(), this.morphTexture = null);
	}
}, Wr = /*@__PURE__*/ new W(), Gr = /*@__PURE__*/ new W(), Kr = /*@__PURE__*/ new G(), qr = class {
	constructor(e = new W(1, 0, 0), t = 0) {
		this.isPlane = !0, this.normal = e, this.constant = t;
	}
	set(e, t) {
		return this.normal.copy(e), this.constant = t, this;
	}
	setComponents(e, t, n, r) {
		return this.normal.set(e, t, n), this.constant = r, this;
	}
	setFromNormalAndCoplanarPoint(e, t) {
		return this.normal.copy(e), this.constant = -t.dot(this.normal), this;
	}
	setFromCoplanarPoints(e, t, n) {
		let r = Wr.subVectors(n, t).cross(Gr.subVectors(e, t)).normalize();
		return this.setFromNormalAndCoplanarPoint(r, e), this;
	}
	copy(e) {
		return this.normal.copy(e.normal), this.constant = e.constant, this;
	}
	normalize() {
		let e = 1 / this.normal.length();
		return this.normal.multiplyScalar(e), this.constant *= e, this;
	}
	negate() {
		return this.constant *= -1, this.normal.negate(), this;
	}
	distanceToPoint(e) {
		return this.normal.dot(e) + this.constant;
	}
	distanceToSphere(e) {
		return this.distanceToPoint(e.center) - e.radius;
	}
	projectPoint(e, t) {
		return t.copy(e).addScaledVector(this.normal, -this.distanceToPoint(e));
	}
	intersectLine(e, t) {
		let n = e.delta(Wr), r = this.normal.dot(n);
		if (r === 0) return this.distanceToPoint(e.start) === 0 ? t.copy(e.start) : null;
		let i = -(e.start.dot(this.normal) + this.constant) / r;
		return i < 0 || i > 1 ? null : t.copy(e.start).addScaledVector(n, i);
	}
	intersectsLine(e) {
		let t = this.distanceToPoint(e.start), n = this.distanceToPoint(e.end);
		return t < 0 && n > 0 || n < 0 && t > 0;
	}
	intersectsBox(e) {
		return e.intersectsPlane(this);
	}
	intersectsSphere(e) {
		return e.intersectsPlane(this);
	}
	coplanarPoint(e) {
		return e.copy(this.normal).multiplyScalar(-this.constant);
	}
	applyMatrix4(e, t) {
		let n = t || Kr.getNormalMatrix(e), r = this.coplanarPoint(Wr).applyMatrix4(e), i = this.normal.applyMatrix3(n).normalize();
		return this.constant = -r.dot(i), this;
	}
	translate(e) {
		return this.constant -= e.dot(this.normal), this;
	}
	equals(e) {
		return e.normal.equals(this.normal) && e.constant === this.constant;
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, Jr = /*@__PURE__*/ new ct(), Yr = /*@__PURE__*/ new H(.5, .5), Xr = /*@__PURE__*/ new W(), Zr = class {
	constructor(e = new qr(), t = new qr(), n = new qr(), r = new qr(), i = new qr(), a = new qr()) {
		this.planes = [
			e,
			t,
			n,
			r,
			i,
			a
		];
	}
	set(e, t, n, r, i, a) {
		let o = this.planes;
		return o[0].copy(e), o[1].copy(t), o[2].copy(n), o[3].copy(r), o[4].copy(i), o[5].copy(a), this;
	}
	copy(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) t[n].copy(e.planes[n]);
		return this;
	}
	setFromProjectionMatrix(e, t = j, n = !1) {
		let r = this.planes, i = e.elements, a = i[0], o = i[1], s = i[2], c = i[3], l = i[4], u = i[5], d = i[6], f = i[7], p = i[8], m = i[9], h = i[10], g = i[11], _ = i[12], v = i[13], y = i[14], b = i[15];
		if (r[0].setComponents(c - a, f - l, g - p, b - _).normalize(), r[1].setComponents(c + a, f + l, g + p, b + _).normalize(), r[2].setComponents(c + o, f + u, g + m, b + v).normalize(), r[3].setComponents(c - o, f - u, g - m, b - v).normalize(), n) r[4].setComponents(s, d, h, y).normalize(), r[5].setComponents(c - s, f - d, g - h, b - y).normalize();
		else if (r[4].setComponents(c - s, f - d, g - h, b - y).normalize(), t === 2e3) r[5].setComponents(c + s, f + d, g + h, b + y).normalize();
		else if (t === 2001) r[5].setComponents(s, d, h, y).normalize();
		else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + t);
		return this;
	}
	intersectsObject(e) {
		if (e.boundingSphere !== void 0) e.boundingSphere === null && e.computeBoundingSphere(), Jr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);
		else {
			let t = e.geometry;
			t.boundingSphere === null && t.computeBoundingSphere(), Jr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld);
		}
		return this.intersectsSphere(Jr);
	}
	intersectsSprite(e) {
		return Jr.center.set(0, 0, 0), Jr.radius = .7071067811865476 + Yr.distanceTo(e.center), Jr.applyMatrix4(e.matrixWorld), this.intersectsSphere(Jr);
	}
	intersectsSphere(e) {
		let t = this.planes, n = e.center, r = -e.radius;
		for (let e = 0; e < 6; e++) if (t[e].distanceToPoint(n) < r) return !1;
		return !0;
	}
	intersectsBox(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) {
			let r = t[n];
			if (Xr.x = r.normal.x > 0 ? e.max.x : e.min.x, Xr.y = r.normal.y > 0 ? e.max.y : e.min.y, Xr.z = r.normal.z > 0 ? e.max.z : e.min.z, r.distanceToPoint(Xr) < 0) return !1;
		}
		return !0;
	}
	containsPoint(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) if (t[n].distanceToPoint(e) < 0) return !1;
		return !0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, Qr = class extends dn {
	constructor(e) {
		super(), this.isLineBasicMaterial = !0, this.type = "LineBasicMaterial", this.color = new Y(16777215), this.map = null, this.linewidth = 1, this.linecap = "round", this.linejoin = "round", this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.linewidth = e.linewidth, this.linecap = e.linecap, this.linejoin = e.linejoin, this.fog = e.fog, this;
	}
}, $r = /*@__PURE__*/ new W(), ei = /*@__PURE__*/ new W(), ti = /*@__PURE__*/ new J(), ni = /*@__PURE__*/ new gt(), ri = /*@__PURE__*/ new ct(), ii = /*@__PURE__*/ new W(), ai = /*@__PURE__*/ new W(), oi = class extends Ut {
	constructor(e = new Mn(), t = new Qr()) {
		super(), this.isLine = !0, this.type = "Line", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	computeLineDistances() {
		let e = this.geometry;
		if (e.index === null) {
			let t = e.attributes.position, n = [0];
			for (let e = 1, r = t.count; e < r; e++) $r.fromBufferAttribute(t, e - 1), ei.fromBufferAttribute(t, e), n[e] = n[e - 1], n[e] += $r.distanceTo(ei);
			e.setAttribute("lineDistance", new wn(n, 1));
		} else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
		return this;
	}
	raycast(e, t) {
		let n = this.geometry, r = this.matrixWorld, i = e.params.Line.threshold, a = n.drawRange;
		if (n.boundingSphere === null && n.computeBoundingSphere(), ri.copy(n.boundingSphere), ri.applyMatrix4(r), ri.radius += i, e.ray.intersectsSphere(ri) === !1) return;
		ti.copy(r).invert(), ni.copy(e.ray).applyMatrix4(ti);
		let o = i / ((this.scale.x + this.scale.y + this.scale.z) / 3), s = o * o, c = this.isLineSegments ? 2 : 1, l = n.index, u = n.attributes.position;
		if (l !== null) {
			let n = Math.max(0, a.start), r = Math.min(l.count, a.start + a.count);
			for (let i = n, a = r - 1; i < a; i += c) {
				let n = l.getX(i), r = l.getX(i + 1), a = si(this, e, ni, s, n, r, i);
				a && t.push(a);
			}
			if (this.isLineLoop) {
				let i = l.getX(r - 1), a = l.getX(n), o = si(this, e, ni, s, i, a, r - 1);
				o && t.push(o);
			}
		} else {
			let n = Math.max(0, a.start), r = Math.min(u.count, a.start + a.count);
			for (let i = n, a = r - 1; i < a; i += c) {
				let n = si(this, e, ni, s, i, i + 1, i);
				n && t.push(n);
			}
			if (this.isLineLoop) {
				let i = si(this, e, ni, s, r - 1, n, r - 1);
				i && t.push(i);
			}
		}
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
};
function si(e, t, n, r, i, a, o) {
	let s = e.geometry.attributes.position;
	if ($r.fromBufferAttribute(s, i), ei.fromBufferAttribute(s, a), n.distanceSqToSegment($r, ei, ii, ai) > r) return;
	ii.applyMatrix4(e.matrixWorld);
	let c = t.ray.origin.distanceTo(ii);
	if (!(c < t.near || c > t.far)) return {
		distance: c,
		point: ai.clone().applyMatrix4(e.matrixWorld),
		index: o,
		face: null,
		faceIndex: null,
		barycoord: null,
		object: e
	};
}
var ci = /*@__PURE__*/ new W(), li = /*@__PURE__*/ new W(), ui = class extends oi {
	constructor(e, t) {
		super(e, t), this.isLineSegments = !0, this.type = "LineSegments";
	}
	computeLineDistances() {
		let e = this.geometry;
		if (e.index === null) {
			let t = e.attributes.position, n = [];
			for (let e = 0, r = t.count; e < r; e += 2) ci.fromBufferAttribute(t, e), li.fromBufferAttribute(t, e + 1), n[e] = e === 0 ? 0 : n[e - 1], n[e + 1] = n[e] + ci.distanceTo(li);
			e.setAttribute("lineDistance", new wn(n, 1));
		} else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
		return this;
	}
}, di = class extends oi {
	constructor(e, t) {
		super(e, t), this.isLineLoop = !0, this.type = "LineLoop";
	}
}, fi = class extends dn {
	constructor(e) {
		super(), this.isPointsMaterial = !0, this.type = "PointsMaterial", this.color = new Y(16777215), this.map = null, this.alphaMap = null, this.size = 1, this.sizeAttenuation = !0, this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.alphaMap = e.alphaMap, this.size = e.size, this.sizeAttenuation = e.sizeAttenuation, this.fog = e.fog, this;
	}
}, pi = /*@__PURE__*/ new J(), mi = /*@__PURE__*/ new gt(), hi = /*@__PURE__*/ new ct(), gi = /*@__PURE__*/ new W(), _i = class extends Ut {
	constructor(e = new Mn(), t = new fi()) {
		super(), this.isPoints = !0, this.type = "Points", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	raycast(e, t) {
		let n = this.geometry, r = this.matrixWorld, i = e.params.Points.threshold, a = n.drawRange;
		if (n.boundingSphere === null && n.computeBoundingSphere(), hi.copy(n.boundingSphere), hi.applyMatrix4(r), hi.radius += i, e.ray.intersectsSphere(hi) === !1) return;
		pi.copy(r).invert(), mi.copy(e.ray).applyMatrix4(pi);
		let o = i / ((this.scale.x + this.scale.y + this.scale.z) / 3), s = o * o, c = n.index, l = n.attributes.position;
		if (c !== null) {
			let n = Math.max(0, a.start), i = Math.min(c.count, a.start + a.count);
			for (let a = n, o = i; a < o; a++) {
				let n = c.getX(a);
				gi.fromBufferAttribute(l, n), vi(gi, n, s, r, e, t, this);
			}
		} else {
			let n = Math.max(0, a.start), i = Math.min(l.count, a.start + a.count);
			for (let a = n, o = i; a < o; a++) gi.fromBufferAttribute(l, a), vi(gi, a, s, r, e, t, this);
		}
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
};
function vi(e, t, n, r, i, a, o) {
	let s = mi.distanceSqToPoint(e);
	if (s < n) {
		let n = new W();
		mi.closestPointToPoint(e, n), n.applyMatrix4(r);
		let c = i.ray.origin.distanceTo(n);
		if (c < i.near || c > i.far) return;
		a.push({
			distance: c,
			distanceToRay: Math.sqrt(s),
			point: n,
			index: t,
			face: null,
			faceIndex: null,
			barycoord: null,
			object: o
		});
	}
}
var yi = class extends q {
	constructor(e, t, n, r, i, a, o, s, c) {
		super(e, t, n, r, i, a, o, s, c), this.isCanvasTexture = !0, this.needsUpdate = !0;
	}
}, bi = class extends q {
	constructor(e, t, n = u, i, a, o, s = r, c = r, l, d = h, f = 1) {
		if (d !== 1026 && d !== 1027) throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
		super({
			width: e,
			height: t,
			depth: f
		}, i, a, o, s, c, d, n, l), this.isDepthTexture = !0, this.flipY = !1, this.generateMipmaps = !1, this.compareFunction = null;
	}
	copy(e) {
		return super.copy(e), this.source = new Fe(Object.assign({}, e.image)), this.compareFunction = e.compareFunction, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return this.compareFunction !== null && (t.compareFunction = this.compareFunction), t;
	}
}, xi = class extends q {
	constructor(e = null) {
		super(), this.sourceTexture = e, this.isExternalTexture = !0;
	}
	copy(e) {
		return super.copy(e), this.sourceTexture = e.sourceTexture, this;
	}
}, Si = class e extends Mn {
	constructor(e = 1, t = 1, n = 4, r = 8, i = 1) {
		super(), this.type = "CapsuleGeometry", this.parameters = {
			radius: e,
			height: t,
			capSegments: n,
			radialSegments: r,
			heightSegments: i
		}, t = Math.max(0, t), n = Math.max(1, Math.floor(n)), r = Math.max(3, Math.floor(r)), i = Math.max(1, Math.floor(i));
		let a = [], o = [], s = [], c = [], l = t / 2, u = Math.PI / 2 * e, d = t, f = 2 * u + d, p = n * 2 + i, m = r + 1, h = new W(), g = new W();
		for (let _ = 0; _ <= p; _++) {
			let v = 0, y = 0, b = 0, x = 0;
			if (_ <= n) {
				let t = _ / n, r = t * Math.PI / 2;
				y = -l - e * Math.cos(r), b = e * Math.sin(r), x = -e * Math.cos(r), v = t * u;
			} else if (_ <= n + i) {
				let r = (_ - n) / i;
				y = -l + r * t, b = e, x = 0, v = u + r * d;
			} else {
				let t = (_ - n - i) / n, r = t * Math.PI / 2;
				y = l + e * Math.sin(r), b = e * Math.cos(r), x = e * Math.sin(r), v = u + d + t * u;
			}
			let S = Math.max(0, Math.min(1, v / f)), C = 0;
			_ === 0 ? C = .5 / r : _ === p && (C = -.5 / r);
			for (let e = 0; e <= r; e++) {
				let t = e / r, n = t * Math.PI * 2, i = Math.sin(n), a = Math.cos(n);
				g.x = -b * a, g.y = y, g.z = b * i, o.push(g.x, g.y, g.z), h.set(-b * a, x, b * i), h.normalize(), s.push(h.x, h.y, h.z), c.push(t + C, S);
			}
			if (_ > 0) {
				let e = (_ - 1) * m;
				for (let t = 0; t < r; t++) {
					let n = e + t, r = e + t + 1, i = _ * m + t, o = _ * m + t + 1;
					a.push(n, r, i), a.push(r, o, i);
				}
			}
		}
		this.setIndex(a), this.setAttribute("position", new wn(o, 3)), this.setAttribute("normal", new wn(s, 3)), this.setAttribute("uv", new wn(c, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.radius, t.height, t.capSegments, t.radialSegments, t.heightSegments);
	}
}, Ci = class e extends Mn {
	constructor(e = 1, t = 1, n = 1, r = 32, i = 1, a = !1, o = 0, s = Math.PI * 2) {
		super(), this.type = "CylinderGeometry", this.parameters = {
			radiusTop: e,
			radiusBottom: t,
			height: n,
			radialSegments: r,
			heightSegments: i,
			openEnded: a,
			thetaStart: o,
			thetaLength: s
		};
		let c = this;
		r = Math.floor(r), i = Math.floor(i);
		let l = [], u = [], d = [], f = [], p = 0, m = [], h = n / 2, g = 0;
		_(), a === !1 && (e > 0 && v(!0), t > 0 && v(!1)), this.setIndex(l), this.setAttribute("position", new wn(u, 3)), this.setAttribute("normal", new wn(d, 3)), this.setAttribute("uv", new wn(f, 2));
		function _() {
			let a = new W(), _ = new W(), v = 0, y = (t - e) / n;
			for (let c = 0; c <= i; c++) {
				let l = [], g = c / i, v = g * (t - e) + e;
				for (let e = 0; e <= r; e++) {
					let t = e / r, i = t * s + o, c = Math.sin(i), m = Math.cos(i);
					_.x = v * c, _.y = -g * n + h, _.z = v * m, u.push(_.x, _.y, _.z), a.set(c, y, m).normalize(), d.push(a.x, a.y, a.z), f.push(t, 1 - g), l.push(p++);
				}
				m.push(l);
			}
			for (let n = 0; n < r; n++) for (let r = 0; r < i; r++) {
				let a = m[r][n], o = m[r + 1][n], s = m[r + 1][n + 1], c = m[r][n + 1];
				(e > 0 || r !== 0) && (l.push(a, o, c), v += 3), (t > 0 || r !== i - 1) && (l.push(o, s, c), v += 3);
			}
			c.addGroup(g, v, 0), g += v;
		}
		function v(n) {
			let i = p, a = new H(), m = new W(), _ = 0, v = n === !0 ? e : t, y = n === !0 ? 1 : -1;
			for (let e = 1; e <= r; e++) u.push(0, h * y, 0), d.push(0, y, 0), f.push(.5, .5), p++;
			let b = p;
			for (let e = 0; e <= r; e++) {
				let t = e / r * s + o, n = Math.cos(t), i = Math.sin(t);
				m.x = v * i, m.y = h * y, m.z = v * n, u.push(m.x, m.y, m.z), d.push(0, y, 0), a.x = n * .5 + .5, a.y = i * .5 * y + .5, f.push(a.x, a.y), p++;
			}
			for (let e = 0; e < r; e++) {
				let t = i + e, r = b + e;
				n === !0 ? l.push(r, r + 1, t) : l.push(r + 1, r, t), _ += 3;
			}
			c.addGroup(g, _, n === !0 ? 1 : 2), g += _;
		}
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.radiusTop, t.radiusBottom, t.height, t.radialSegments, t.heightSegments, t.openEnded, t.thetaStart, t.thetaLength);
	}
}, wi = class e extends Ci {
	constructor(e = 1, t = 1, n = 32, r = 1, i = !1, a = 0, o = Math.PI * 2) {
		super(0, e, t, n, r, i, a, o), this.type = "ConeGeometry", this.parameters = {
			radius: e,
			height: t,
			radialSegments: n,
			heightSegments: r,
			openEnded: i,
			thetaStart: a,
			thetaLength: o
		};
	}
	static fromJSON(t) {
		return new e(t.radius, t.height, t.radialSegments, t.heightSegments, t.openEnded, t.thetaStart, t.thetaLength);
	}
}, Ti = class {
	constructor() {
		this.type = "Curve", this.arcLengthDivisions = 200, this.needsUpdate = !1, this.cacheArcLengths = null;
	}
	getPoint() {
		console.warn("THREE.Curve: .getPoint() not implemented.");
	}
	getPointAt(e, t) {
		let n = this.getUtoTmapping(e);
		return this.getPoint(n, t);
	}
	getPoints(e = 5) {
		let t = [];
		for (let n = 0; n <= e; n++) t.push(this.getPoint(n / e));
		return t;
	}
	getSpacedPoints(e = 5) {
		let t = [];
		for (let n = 0; n <= e; n++) t.push(this.getPointAt(n / e));
		return t;
	}
	getLength() {
		let e = this.getLengths();
		return e[e.length - 1];
	}
	getLengths(e = this.arcLengthDivisions) {
		if (this.cacheArcLengths && this.cacheArcLengths.length === e + 1 && !this.needsUpdate) return this.cacheArcLengths;
		this.needsUpdate = !1;
		let t = [], n, r = this.getPoint(0), i = 0;
		t.push(0);
		for (let a = 1; a <= e; a++) n = this.getPoint(a / e), i += n.distanceTo(r), t.push(i), r = n;
		return this.cacheArcLengths = t, t;
	}
	updateArcLengths() {
		this.needsUpdate = !0, this.getLengths();
	}
	getUtoTmapping(e, t = null) {
		let n = this.getLengths(), r = 0, i = n.length, a;
		a = t || e * n[i - 1];
		let o = 0, s = i - 1, c;
		for (; o <= s;) if (r = Math.floor(o + (s - o) / 2), c = n[r] - a, c < 0) o = r + 1;
		else if (c > 0) s = r - 1;
		else {
			s = r;
			break;
		}
		if (r = s, n[r] === a) return r / (i - 1);
		let l = n[r], u = n[r + 1] - l, d = (a - l) / u;
		return (r + d) / (i - 1);
	}
	getTangent(e, t) {
		let n = 1e-4, r = e - n, i = e + n;
		r < 0 && (r = 0), i > 1 && (i = 1);
		let a = this.getPoint(r), o = this.getPoint(i), s = t || (a.isVector2 ? new H() : new W());
		return s.copy(o).sub(a).normalize(), s;
	}
	getTangentAt(e, t) {
		let n = this.getUtoTmapping(e);
		return this.getTangent(n, t);
	}
	computeFrenetFrames(e, t = !1) {
		let n = new W(), r = [], i = [], a = [], o = new W(), s = new J();
		for (let t = 0; t <= e; t++) {
			let n = t / e;
			r[t] = this.getTangentAt(n, new W());
		}
		i[0] = new W(), a[0] = new W();
		let c = Number.MAX_VALUE, l = Math.abs(r[0].x), u = Math.abs(r[0].y), d = Math.abs(r[0].z);
		l <= c && (c = l, n.set(1, 0, 0)), u <= c && (c = u, n.set(0, 1, 0)), d <= c && n.set(0, 0, 1), o.crossVectors(r[0], n).normalize(), i[0].crossVectors(r[0], o), a[0].crossVectors(r[0], i[0]);
		for (let t = 1; t <= e; t++) {
			if (i[t] = i[t - 1].clone(), a[t] = a[t - 1].clone(), o.crossVectors(r[t - 1], r[t]), o.length() > 2 ** -52) {
				o.normalize();
				let e = Math.acos(L(r[t - 1].dot(r[t]), -1, 1));
				i[t].applyMatrix4(s.makeRotationAxis(o, e));
			}
			a[t].crossVectors(r[t], i[t]);
		}
		if (t === !0) {
			let t = Math.acos(L(i[0].dot(i[e]), -1, 1));
			t /= e, r[0].dot(o.crossVectors(i[0], i[e])) > 0 && (t = -t);
			for (let n = 1; n <= e; n++) i[n].applyMatrix4(s.makeRotationAxis(r[n], t * n)), a[n].crossVectors(r[n], i[n]);
		}
		return {
			tangents: r,
			normals: i,
			binormals: a
		};
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.arcLengthDivisions = e.arcLengthDivisions, this;
	}
	toJSON() {
		let e = { metadata: {
			version: 4.7,
			type: "Curve",
			generator: "Curve.toJSON"
		} };
		return e.arcLengthDivisions = this.arcLengthDivisions, e.type = this.type, e;
	}
	fromJSON(e) {
		return this.arcLengthDivisions = e.arcLengthDivisions, this;
	}
}, Ei = class extends Ti {
	constructor(e = 0, t = 0, n = 1, r = 1, i = 0, a = Math.PI * 2, o = !1, s = 0) {
		super(), this.isEllipseCurve = !0, this.type = "EllipseCurve", this.aX = e, this.aY = t, this.xRadius = n, this.yRadius = r, this.aStartAngle = i, this.aEndAngle = a, this.aClockwise = o, this.aRotation = s;
	}
	getPoint(e, t = new H()) {
		let n = t, r = Math.PI * 2, i = this.aEndAngle - this.aStartAngle, a = Math.abs(i) < 2 ** -52;
		for (; i < 0;) i += r;
		for (; i > r;) i -= r;
		i < 2 ** -52 && (i = a ? 0 : r), this.aClockwise === !0 && !a && (i === r ? i = -r : i -= r);
		let o = this.aStartAngle + e * i, s = this.aX + this.xRadius * Math.cos(o), c = this.aY + this.yRadius * Math.sin(o);
		if (this.aRotation !== 0) {
			let e = Math.cos(this.aRotation), t = Math.sin(this.aRotation), n = s - this.aX, r = c - this.aY;
			s = n * e - r * t + this.aX, c = n * t + r * e + this.aY;
		}
		return n.set(s, c);
	}
	copy(e) {
		return super.copy(e), this.aX = e.aX, this.aY = e.aY, this.xRadius = e.xRadius, this.yRadius = e.yRadius, this.aStartAngle = e.aStartAngle, this.aEndAngle = e.aEndAngle, this.aClockwise = e.aClockwise, this.aRotation = e.aRotation, this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.aX = this.aX, e.aY = this.aY, e.xRadius = this.xRadius, e.yRadius = this.yRadius, e.aStartAngle = this.aStartAngle, e.aEndAngle = this.aEndAngle, e.aClockwise = this.aClockwise, e.aRotation = this.aRotation, e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.aX = e.aX, this.aY = e.aY, this.xRadius = e.xRadius, this.yRadius = e.yRadius, this.aStartAngle = e.aStartAngle, this.aEndAngle = e.aEndAngle, this.aClockwise = e.aClockwise, this.aRotation = e.aRotation, this;
	}
}, Di = class extends Ei {
	constructor(e, t, n, r, i, a) {
		super(e, t, n, n, r, i, a), this.isArcCurve = !0, this.type = "ArcCurve";
	}
};
function Oi() {
	let e = 0, t = 0, n = 0, r = 0;
	function i(i, a, o, s) {
		e = i, t = o, n = -3 * i + 3 * a - 2 * o - s, r = 2 * i - 2 * a + o + s;
	}
	return {
		initCatmullRom: function(e, t, n, r, a) {
			i(t, n, a * (n - e), a * (r - t));
		},
		initNonuniformCatmullRom: function(e, t, n, r, a, o, s) {
			let c = (t - e) / a - (n - e) / (a + o) + (n - t) / o, l = (n - t) / o - (r - t) / (o + s) + (r - n) / s;
			c *= o, l *= o, i(t, n, c, l);
		},
		calc: function(i) {
			let a = i * i, o = a * i;
			return e + t * i + n * a + r * o;
		}
	};
}
var ki = /*@__PURE__*/ new W(), Ai = /*@__PURE__*/ new Oi(), ji = /*@__PURE__*/ new Oi(), Mi = /*@__PURE__*/ new Oi(), Ni = class extends Ti {
	constructor(e = [], t = !1, n = "centripetal", r = .5) {
		super(), this.isCatmullRomCurve3 = !0, this.type = "CatmullRomCurve3", this.points = e, this.closed = t, this.curveType = n, this.tension = r;
	}
	getPoint(e, t = new W()) {
		let n = t, r = this.points, i = r.length, a = (i - +!this.closed) * e, o = Math.floor(a), s = a - o;
		this.closed ? o += o > 0 ? 0 : (Math.floor(Math.abs(o) / i) + 1) * i : s === 0 && o === i - 1 && (o = i - 2, s = 1);
		let c, l;
		this.closed || o > 0 ? c = r[(o - 1) % i] : (ki.subVectors(r[0], r[1]).add(r[0]), c = ki);
		let u = r[o % i], d = r[(o + 1) % i];
		if (this.closed || o + 2 < i ? l = r[(o + 2) % i] : (ki.subVectors(r[i - 1], r[i - 2]).add(r[i - 1]), l = ki), this.curveType === "centripetal" || this.curveType === "chordal") {
			let e = this.curveType === "chordal" ? .5 : .25, t = c.distanceToSquared(u) ** +e, n = u.distanceToSquared(d) ** +e, r = d.distanceToSquared(l) ** +e;
			n < 1e-4 && (n = 1), t < 1e-4 && (t = n), r < 1e-4 && (r = n), Ai.initNonuniformCatmullRom(c.x, u.x, d.x, l.x, t, n, r), ji.initNonuniformCatmullRom(c.y, u.y, d.y, l.y, t, n, r), Mi.initNonuniformCatmullRom(c.z, u.z, d.z, l.z, t, n, r);
		} else this.curveType === "catmullrom" && (Ai.initCatmullRom(c.x, u.x, d.x, l.x, this.tension), ji.initCatmullRom(c.y, u.y, d.y, l.y, this.tension), Mi.initCatmullRom(c.z, u.z, d.z, l.z, this.tension));
		return n.set(Ai.calc(s), ji.calc(s), Mi.calc(s)), n;
	}
	copy(e) {
		super.copy(e), this.points = [];
		for (let t = 0, n = e.points.length; t < n; t++) {
			let n = e.points[t];
			this.points.push(n.clone());
		}
		return this.closed = e.closed, this.curveType = e.curveType, this.tension = e.tension, this;
	}
	toJSON() {
		let e = super.toJSON();
		e.points = [];
		for (let t = 0, n = this.points.length; t < n; t++) {
			let n = this.points[t];
			e.points.push(n.toArray());
		}
		return e.closed = this.closed, e.curveType = this.curveType, e.tension = this.tension, e;
	}
	fromJSON(e) {
		super.fromJSON(e), this.points = [];
		for (let t = 0, n = e.points.length; t < n; t++) {
			let n = e.points[t];
			this.points.push(new W().fromArray(n));
		}
		return this.closed = e.closed, this.curveType = e.curveType, this.tension = e.tension, this;
	}
};
function Pi(e, t, n, r, i) {
	let a = (r - t) * .5, o = (i - n) * .5, s = e * e, c = e * s;
	return (2 * n - 2 * r + a + o) * c + (-3 * n + 3 * r - 2 * a - o) * s + a * e + n;
}
function Fi(e, t) {
	let n = 1 - e;
	return n * n * t;
}
function Ii(e, t) {
	return 2 * (1 - e) * e * t;
}
function Li(e, t) {
	return e * e * t;
}
function Ri(e, t, n, r) {
	return Fi(e, t) + Ii(e, n) + Li(e, r);
}
function zi(e, t) {
	let n = 1 - e;
	return n * n * n * t;
}
function Bi(e, t) {
	let n = 1 - e;
	return 3 * n * n * e * t;
}
function Vi(e, t) {
	return 3 * (1 - e) * e * e * t;
}
function Hi(e, t) {
	return e * e * e * t;
}
function Ui(e, t, n, r, i) {
	return zi(e, t) + Bi(e, n) + Vi(e, r) + Hi(e, i);
}
var Wi = class extends Ti {
	constructor(e = new H(), t = new H(), n = new H(), r = new H()) {
		super(), this.isCubicBezierCurve = !0, this.type = "CubicBezierCurve", this.v0 = e, this.v1 = t, this.v2 = n, this.v3 = r;
	}
	getPoint(e, t = new H()) {
		let n = t, r = this.v0, i = this.v1, a = this.v2, o = this.v3;
		return n.set(Ui(e, r.x, i.x, a.x, o.x), Ui(e, r.y, i.y, a.y, o.y)), n;
	}
	copy(e) {
		return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this.v3.copy(e.v3), this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e.v3 = this.v3.toArray(), e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this.v3.fromArray(e.v3), this;
	}
}, Gi = class extends Ti {
	constructor(e = new W(), t = new W(), n = new W(), r = new W()) {
		super(), this.isCubicBezierCurve3 = !0, this.type = "CubicBezierCurve3", this.v0 = e, this.v1 = t, this.v2 = n, this.v3 = r;
	}
	getPoint(e, t = new W()) {
		let n = t, r = this.v0, i = this.v1, a = this.v2, o = this.v3;
		return n.set(Ui(e, r.x, i.x, a.x, o.x), Ui(e, r.y, i.y, a.y, o.y), Ui(e, r.z, i.z, a.z, o.z)), n;
	}
	copy(e) {
		return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this.v3.copy(e.v3), this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e.v3 = this.v3.toArray(), e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this.v3.fromArray(e.v3), this;
	}
}, Ki = class extends Ti {
	constructor(e = new H(), t = new H()) {
		super(), this.isLineCurve = !0, this.type = "LineCurve", this.v1 = e, this.v2 = t;
	}
	getPoint(e, t = new H()) {
		let n = t;
		return e === 1 ? n.copy(this.v2) : (n.copy(this.v2).sub(this.v1), n.multiplyScalar(e).add(this.v1)), n;
	}
	getPointAt(e, t) {
		return this.getPoint(e, t);
	}
	getTangent(e, t = new H()) {
		return t.subVectors(this.v2, this.v1).normalize();
	}
	getTangentAt(e, t) {
		return this.getTangent(e, t);
	}
	copy(e) {
		return super.copy(e), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
	}
}, qi = class extends Ti {
	constructor(e = new W(), t = new W()) {
		super(), this.isLineCurve3 = !0, this.type = "LineCurve3", this.v1 = e, this.v2 = t;
	}
	getPoint(e, t = new W()) {
		let n = t;
		return e === 1 ? n.copy(this.v2) : (n.copy(this.v2).sub(this.v1), n.multiplyScalar(e).add(this.v1)), n;
	}
	getPointAt(e, t) {
		return this.getPoint(e, t);
	}
	getTangent(e, t = new W()) {
		return t.subVectors(this.v2, this.v1).normalize();
	}
	getTangentAt(e, t) {
		return this.getTangent(e, t);
	}
	copy(e) {
		return super.copy(e), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
	}
}, Ji = class extends Ti {
	constructor(e = new H(), t = new H(), n = new H()) {
		super(), this.isQuadraticBezierCurve = !0, this.type = "QuadraticBezierCurve", this.v0 = e, this.v1 = t, this.v2 = n;
	}
	getPoint(e, t = new H()) {
		let n = t, r = this.v0, i = this.v1, a = this.v2;
		return n.set(Ri(e, r.x, i.x, a.x), Ri(e, r.y, i.y, a.y)), n;
	}
	copy(e) {
		return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
	}
}, Yi = class extends Ti {
	constructor(e = new W(), t = new W(), n = new W()) {
		super(), this.isQuadraticBezierCurve3 = !0, this.type = "QuadraticBezierCurve3", this.v0 = e, this.v1 = t, this.v2 = n;
	}
	getPoint(e, t = new W()) {
		let n = t, r = this.v0, i = this.v1, a = this.v2;
		return n.set(Ri(e, r.x, i.x, a.x), Ri(e, r.y, i.y, a.y), Ri(e, r.z, i.z, a.z)), n;
	}
	copy(e) {
		return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
	}
}, Xi = class extends Ti {
	constructor(e = []) {
		super(), this.isSplineCurve = !0, this.type = "SplineCurve", this.points = e;
	}
	getPoint(e, t = new H()) {
		let n = t, r = this.points, i = (r.length - 1) * e, a = Math.floor(i), o = i - a, s = r[a === 0 ? a : a - 1], c = r[a], l = r[a > r.length - 2 ? r.length - 1 : a + 1], u = r[a > r.length - 3 ? r.length - 1 : a + 2];
		return n.set(Pi(o, s.x, c.x, l.x, u.x), Pi(o, s.y, c.y, l.y, u.y)), n;
	}
	copy(e) {
		super.copy(e), this.points = [];
		for (let t = 0, n = e.points.length; t < n; t++) {
			let n = e.points[t];
			this.points.push(n.clone());
		}
		return this;
	}
	toJSON() {
		let e = super.toJSON();
		e.points = [];
		for (let t = 0, n = this.points.length; t < n; t++) {
			let n = this.points[t];
			e.points.push(n.toArray());
		}
		return e;
	}
	fromJSON(e) {
		super.fromJSON(e), this.points = [];
		for (let t = 0, n = e.points.length; t < n; t++) {
			let n = e.points[t];
			this.points.push(new H().fromArray(n));
		}
		return this;
	}
}, Zi = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	ArcCurve: Di,
	CatmullRomCurve3: Ni,
	CubicBezierCurve: Wi,
	CubicBezierCurve3: Gi,
	EllipseCurve: Ei,
	LineCurve: Ki,
	LineCurve3: qi,
	QuadraticBezierCurve: Ji,
	QuadraticBezierCurve3: Yi,
	SplineCurve: Xi
}), Qi = class extends Ti {
	constructor() {
		super(), this.type = "CurvePath", this.curves = [], this.autoClose = !1;
	}
	add(e) {
		this.curves.push(e);
	}
	closePath() {
		let e = this.curves[0].getPoint(0), t = this.curves[this.curves.length - 1].getPoint(1);
		if (!e.equals(t)) {
			let n = e.isVector2 === !0 ? "LineCurve" : "LineCurve3";
			this.curves.push(new Zi[n](t, e));
		}
		return this;
	}
	getPoint(e, t) {
		let n = e * this.getLength(), r = this.getCurveLengths(), i = 0;
		for (; i < r.length;) {
			if (r[i] >= n) {
				let e = r[i] - n, a = this.curves[i], o = a.getLength(), s = o === 0 ? 0 : 1 - e / o;
				return a.getPointAt(s, t);
			}
			i++;
		}
		return null;
	}
	getLength() {
		let e = this.getCurveLengths();
		return e[e.length - 1];
	}
	updateArcLengths() {
		this.needsUpdate = !0, this.cacheLengths = null, this.getCurveLengths();
	}
	getCurveLengths() {
		if (this.cacheLengths && this.cacheLengths.length === this.curves.length) return this.cacheLengths;
		let e = [], t = 0;
		for (let n = 0, r = this.curves.length; n < r; n++) t += this.curves[n].getLength(), e.push(t);
		return this.cacheLengths = e, e;
	}
	getSpacedPoints(e = 40) {
		let t = [];
		for (let n = 0; n <= e; n++) t.push(this.getPoint(n / e));
		return this.autoClose && t.push(t[0]), t;
	}
	getPoints(e = 12) {
		let t = [], n;
		for (let r = 0, i = this.curves; r < i.length; r++) {
			let a = i[r], o = a.isEllipseCurve ? e * 2 : a.isLineCurve || a.isLineCurve3 ? 1 : a.isSplineCurve ? e * a.points.length : e, s = a.getPoints(o);
			for (let e = 0; e < s.length; e++) {
				let r = s[e];
				n && n.equals(r) || (t.push(r), n = r);
			}
		}
		return this.autoClose && t.length > 1 && !t[t.length - 1].equals(t[0]) && t.push(t[0]), t;
	}
	copy(e) {
		super.copy(e), this.curves = [];
		for (let t = 0, n = e.curves.length; t < n; t++) {
			let n = e.curves[t];
			this.curves.push(n.clone());
		}
		return this.autoClose = e.autoClose, this;
	}
	toJSON() {
		let e = super.toJSON();
		e.autoClose = this.autoClose, e.curves = [];
		for (let t = 0, n = this.curves.length; t < n; t++) {
			let n = this.curves[t];
			e.curves.push(n.toJSON());
		}
		return e;
	}
	fromJSON(e) {
		super.fromJSON(e), this.autoClose = e.autoClose, this.curves = [];
		for (let t = 0, n = e.curves.length; t < n; t++) {
			let n = e.curves[t];
			this.curves.push(new Zi[n.type]().fromJSON(n));
		}
		return this;
	}
}, $i = class extends Qi {
	constructor(e) {
		super(), this.type = "Path", this.currentPoint = new H(), e && this.setFromPoints(e);
	}
	setFromPoints(e) {
		this.moveTo(e[0].x, e[0].y);
		for (let t = 1, n = e.length; t < n; t++) this.lineTo(e[t].x, e[t].y);
		return this;
	}
	moveTo(e, t) {
		return this.currentPoint.set(e, t), this;
	}
	lineTo(e, t) {
		let n = new Ki(this.currentPoint.clone(), new H(e, t));
		return this.curves.push(n), this.currentPoint.set(e, t), this;
	}
	quadraticCurveTo(e, t, n, r) {
		let i = new Ji(this.currentPoint.clone(), new H(e, t), new H(n, r));
		return this.curves.push(i), this.currentPoint.set(n, r), this;
	}
	bezierCurveTo(e, t, n, r, i, a) {
		let o = new Wi(this.currentPoint.clone(), new H(e, t), new H(n, r), new H(i, a));
		return this.curves.push(o), this.currentPoint.set(i, a), this;
	}
	splineThru(e) {
		let t = new Xi([this.currentPoint.clone()].concat(e));
		return this.curves.push(t), this.currentPoint.copy(e[e.length - 1]), this;
	}
	arc(e, t, n, r, i, a) {
		let o = this.currentPoint.x, s = this.currentPoint.y;
		return this.absarc(e + o, t + s, n, r, i, a), this;
	}
	absarc(e, t, n, r, i, a) {
		return this.absellipse(e, t, n, n, r, i, a), this;
	}
	ellipse(e, t, n, r, i, a, o, s) {
		let c = this.currentPoint.x, l = this.currentPoint.y;
		return this.absellipse(e + c, t + l, n, r, i, a, o, s), this;
	}
	absellipse(e, t, n, r, i, a, o, s) {
		let c = new Ei(e, t, n, r, i, a, o, s);
		if (this.curves.length > 0) {
			let e = c.getPoint(0);
			e.equals(this.currentPoint) || this.lineTo(e.x, e.y);
		}
		this.curves.push(c);
		let l = c.getPoint(1);
		return this.currentPoint.copy(l), this;
	}
	copy(e) {
		return super.copy(e), this.currentPoint.copy(e.currentPoint), this;
	}
	toJSON() {
		let e = super.toJSON();
		return e.currentPoint = this.currentPoint.toArray(), e;
	}
	fromJSON(e) {
		return super.fromJSON(e), this.currentPoint.fromArray(e.currentPoint), this;
	}
}, ea = class extends $i {
	constructor(e) {
		super(e), this.uuid = I(), this.type = "Shape", this.holes = [];
	}
	getPointsHoles(e) {
		let t = [];
		for (let n = 0, r = this.holes.length; n < r; n++) t[n] = this.holes[n].getPoints(e);
		return t;
	}
	extractPoints(e) {
		return {
			shape: this.getPoints(e),
			holes: this.getPointsHoles(e)
		};
	}
	copy(e) {
		super.copy(e), this.holes = [];
		for (let t = 0, n = e.holes.length; t < n; t++) {
			let n = e.holes[t];
			this.holes.push(n.clone());
		}
		return this;
	}
	toJSON() {
		let e = super.toJSON();
		e.uuid = this.uuid, e.holes = [];
		for (let t = 0, n = this.holes.length; t < n; t++) {
			let n = this.holes[t];
			e.holes.push(n.toJSON());
		}
		return e;
	}
	fromJSON(e) {
		super.fromJSON(e), this.uuid = e.uuid, this.holes = [];
		for (let t = 0, n = e.holes.length; t < n; t++) {
			let n = e.holes[t];
			this.holes.push(new $i().fromJSON(n));
		}
		return this;
	}
};
function ta(e, t, n = 2) {
	let r = t && t.length, i = r ? t[0] * n : e.length, a = na(e, 0, i, n, !0), o = [];
	if (!a || a.next === a.prev) return o;
	let s, c, l;
	if (r && (a = la(e, t, a, n)), e.length > 80 * n) {
		s = Infinity, c = Infinity;
		let t = -Infinity, r = -Infinity;
		for (let a = n; a < i; a += n) {
			let n = e[a], i = e[a + 1];
			n < s && (s = n), i < c && (c = i), n > t && (t = n), i > r && (r = i);
		}
		l = Math.max(t - s, r - c), l = l === 0 ? 0 : 32767 / l;
	}
	return ia(a, o, n, s, c, l, 0), o;
}
function na(e, t, n, r, i) {
	let a;
	if (i === Na(e, t, n, r) > 0) for (let i = t; i < n; i += r) a = Aa(i / r | 0, e[i], e[i + 1], a);
	else for (let i = n - r; i >= t; i -= r) a = Aa(i / r | 0, e[i], e[i + 1], a);
	return a && Sa(a, a.next) && (ja(a), a = a.next), a;
}
function ra(e, t) {
	if (!e) return e;
	t ||= e;
	let n = e, r;
	do
		if (r = !1, !n.steiner && (Sa(n, n.next) || xa(n.prev, n, n.next) === 0)) {
			if (ja(n), n = t = n.prev, n === n.next) break;
			r = !0;
		} else n = n.next;
	while (r || n !== t);
	return t;
}
function ia(e, t, n, r, i, a, o) {
	if (!e) return;
	!o && a && ma(e, r, i, a);
	let s = e;
	for (; e.prev !== e.next;) {
		let c = e.prev, l = e.next;
		if (a ? oa(e, r, i, a) : aa(e)) {
			t.push(c.i, e.i, l.i), ja(e), e = l.next, s = l.next;
			continue;
		}
		if (e = l, e === s) {
			o ? o === 1 ? (e = sa(ra(e), t), ia(e, t, n, r, i, a, 2)) : o === 2 && ca(e, t, n, r, i, a) : ia(ra(e), t, n, r, i, a, 1);
			break;
		}
	}
}
function aa(e) {
	let t = e.prev, n = e, r = e.next;
	if (xa(t, n, r) >= 0) return !1;
	let i = t.x, a = n.x, o = r.x, s = t.y, c = n.y, l = r.y, u = Math.min(i, a, o), d = Math.min(s, c, l), f = Math.max(i, a, o), p = Math.max(s, c, l), m = r.next;
	for (; m !== t;) {
		if (m.x >= u && m.x <= f && m.y >= d && m.y <= p && ya(i, s, a, c, o, l, m.x, m.y) && xa(m.prev, m, m.next) >= 0) return !1;
		m = m.next;
	}
	return !0;
}
function oa(e, t, n, r) {
	let i = e.prev, a = e, o = e.next;
	if (xa(i, a, o) >= 0) return !1;
	let s = i.x, c = a.x, l = o.x, u = i.y, d = a.y, f = o.y, p = Math.min(s, c, l), m = Math.min(u, d, f), h = Math.max(s, c, l), g = Math.max(u, d, f), _ = ga(p, m, t, n, r), v = ga(h, g, t, n, r), y = e.prevZ, b = e.nextZ;
	for (; y && y.z >= _ && b && b.z <= v;) {
		if (y.x >= p && y.x <= h && y.y >= m && y.y <= g && y !== i && y !== o && ya(s, u, c, d, l, f, y.x, y.y) && xa(y.prev, y, y.next) >= 0 || (y = y.prevZ, b.x >= p && b.x <= h && b.y >= m && b.y <= g && b !== i && b !== o && ya(s, u, c, d, l, f, b.x, b.y) && xa(b.prev, b, b.next) >= 0)) return !1;
		b = b.nextZ;
	}
	for (; y && y.z >= _;) {
		if (y.x >= p && y.x <= h && y.y >= m && y.y <= g && y !== i && y !== o && ya(s, u, c, d, l, f, y.x, y.y) && xa(y.prev, y, y.next) >= 0) return !1;
		y = y.prevZ;
	}
	for (; b && b.z <= v;) {
		if (b.x >= p && b.x <= h && b.y >= m && b.y <= g && b !== i && b !== o && ya(s, u, c, d, l, f, b.x, b.y) && xa(b.prev, b, b.next) >= 0) return !1;
		b = b.nextZ;
	}
	return !0;
}
function sa(e, t) {
	let n = e;
	do {
		let r = n.prev, i = n.next.next;
		!Sa(r, i) && Ca(r, n, n.next, i) && Da(r, i) && Da(i, r) && (t.push(r.i, n.i, i.i), ja(n), ja(n.next), n = e = i), n = n.next;
	} while (n !== e);
	return ra(n);
}
function ca(e, t, n, r, i, a) {
	let o = e;
	do {
		let e = o.next.next;
		for (; e !== o.prev;) {
			if (o.i !== e.i && ba(o, e)) {
				let s = ka(o, e);
				o = ra(o, o.next), s = ra(s, s.next), ia(o, t, n, r, i, a, 0), ia(s, t, n, r, i, a, 0);
				return;
			}
			e = e.next;
		}
		o = o.next;
	} while (o !== e);
}
function la(e, t, n, r) {
	let i = [];
	for (let n = 0, a = t.length; n < a; n++) {
		let o = na(e, t[n] * r, n < a - 1 ? t[n + 1] * r : e.length, r, !1);
		o === o.next && (o.steiner = !0), i.push(_a(o));
	}
	i.sort(ua);
	for (let e = 0; e < i.length; e++) n = da(i[e], n);
	return n;
}
function ua(e, t) {
	let n = e.x - t.x;
	return n === 0 && (n = e.y - t.y, n === 0 && (n = (e.next.y - e.y) / (e.next.x - e.x) - (t.next.y - t.y) / (t.next.x - t.x))), n;
}
function da(e, t) {
	let n = fa(e, t);
	if (!n) return t;
	let r = ka(n, e);
	return ra(r, r.next), ra(n, n.next);
}
function fa(e, t) {
	let n = t, r = e.x, i = e.y, a = -Infinity, o;
	if (Sa(e, n)) return n;
	do {
		if (Sa(e, n.next)) return n.next;
		if (i <= n.y && i >= n.next.y && n.next.y !== n.y) {
			let e = n.x + (i - n.y) * (n.next.x - n.x) / (n.next.y - n.y);
			if (e <= r && e > a && (a = e, o = n.x < n.next.x ? n : n.next, e === r)) return o;
		}
		n = n.next;
	} while (n !== t);
	if (!o) return null;
	let s = o, c = o.x, l = o.y, u = Infinity;
	n = o;
	do {
		if (r >= n.x && n.x >= c && r !== n.x && va(i < l ? r : a, i, c, l, i < l ? a : r, i, n.x, n.y)) {
			let t = Math.abs(i - n.y) / (r - n.x);
			Da(n, e) && (t < u || t === u && (n.x > o.x || n.x === o.x && pa(o, n))) && (o = n, u = t);
		}
		n = n.next;
	} while (n !== s);
	return o;
}
function pa(e, t) {
	return xa(e.prev, e, t.prev) < 0 && xa(t.next, e, e.next) < 0;
}
function ma(e, t, n, r) {
	let i = e;
	do
		i.z === 0 && (i.z = ga(i.x, i.y, t, n, r)), i.prevZ = i.prev, i.nextZ = i.next, i = i.next;
	while (i !== e);
	i.prevZ.nextZ = null, i.prevZ = null, ha(i);
}
function ha(e) {
	let t, n = 1;
	do {
		let r = e, i;
		e = null;
		let a = null;
		for (t = 0; r;) {
			t++;
			let o = r, s = 0;
			for (let e = 0; e < n && (s++, o = o.nextZ, o); e++);
			let c = n;
			for (; s > 0 || c > 0 && o;) s !== 0 && (c === 0 || !o || r.z <= o.z) ? (i = r, r = r.nextZ, s--) : (i = o, o = o.nextZ, c--), a ? a.nextZ = i : e = i, i.prevZ = a, a = i;
			r = o;
		}
		a.nextZ = null, n *= 2;
	} while (t > 1);
	return e;
}
function ga(e, t, n, r, i) {
	return e = (e - n) * i | 0, t = (t - r) * i | 0, e = (e | e << 8) & 16711935, e = (e | e << 4) & 252645135, e = (e | e << 2) & 858993459, e = (e | e << 1) & 1431655765, t = (t | t << 8) & 16711935, t = (t | t << 4) & 252645135, t = (t | t << 2) & 858993459, t = (t | t << 1) & 1431655765, e | t << 1;
}
function _a(e) {
	let t = e, n = e;
	do
		(t.x < n.x || t.x === n.x && t.y < n.y) && (n = t), t = t.next;
	while (t !== e);
	return n;
}
function va(e, t, n, r, i, a, o, s) {
	return (i - o) * (t - s) >= (e - o) * (a - s) && (e - o) * (r - s) >= (n - o) * (t - s) && (n - o) * (a - s) >= (i - o) * (r - s);
}
function ya(e, t, n, r, i, a, o, s) {
	return (e !== o || t !== s) && va(e, t, n, r, i, a, o, s);
}
function ba(e, t) {
	return e.next.i !== t.i && e.prev.i !== t.i && !Ea(e, t) && (Da(e, t) && Da(t, e) && Oa(e, t) && (xa(e.prev, e, t.prev) || xa(e, t.prev, t)) || Sa(e, t) && xa(e.prev, e, e.next) > 0 && xa(t.prev, t, t.next) > 0);
}
function xa(e, t, n) {
	return (t.y - e.y) * (n.x - t.x) - (t.x - e.x) * (n.y - t.y);
}
function Sa(e, t) {
	return e.x === t.x && e.y === t.y;
}
function Ca(e, t, n, r) {
	let i = Ta(xa(e, t, n)), a = Ta(xa(e, t, r)), o = Ta(xa(n, r, e)), s = Ta(xa(n, r, t));
	return !!(i !== a && o !== s || i === 0 && wa(e, n, t) || a === 0 && wa(e, r, t) || o === 0 && wa(n, e, r) || s === 0 && wa(n, t, r));
}
function wa(e, t, n) {
	return t.x <= Math.max(e.x, n.x) && t.x >= Math.min(e.x, n.x) && t.y <= Math.max(e.y, n.y) && t.y >= Math.min(e.y, n.y);
}
function Ta(e) {
	return e > 0 ? 1 : e < 0 ? -1 : 0;
}
function Ea(e, t) {
	let n = e;
	do {
		if (n.i !== e.i && n.next.i !== e.i && n.i !== t.i && n.next.i !== t.i && Ca(n, n.next, e, t)) return !0;
		n = n.next;
	} while (n !== e);
	return !1;
}
function Da(e, t) {
	return xa(e.prev, e, e.next) < 0 ? xa(e, t, e.next) >= 0 && xa(e, e.prev, t) >= 0 : xa(e, t, e.prev) < 0 || xa(e, e.next, t) < 0;
}
function Oa(e, t) {
	let n = e, r = !1, i = (e.x + t.x) / 2, a = (e.y + t.y) / 2;
	do
		n.y > a != n.next.y > a && n.next.y !== n.y && i < (n.next.x - n.x) * (a - n.y) / (n.next.y - n.y) + n.x && (r = !r), n = n.next;
	while (n !== e);
	return r;
}
function ka(e, t) {
	let n = Ma(e.i, e.x, e.y), r = Ma(t.i, t.x, t.y), i = e.next, a = t.prev;
	return e.next = t, t.prev = e, n.next = i, i.prev = n, r.next = n, n.prev = r, a.next = r, r.prev = a, r;
}
function Aa(e, t, n, r) {
	let i = Ma(e, t, n);
	return r ? (i.next = r.next, i.prev = r, r.next.prev = i, r.next = i) : (i.prev = i, i.next = i), i;
}
function ja(e) {
	e.next.prev = e.prev, e.prev.next = e.next, e.prevZ && (e.prevZ.nextZ = e.nextZ), e.nextZ && (e.nextZ.prevZ = e.prevZ);
}
function Ma(e, t, n) {
	return {
		i: e,
		x: t,
		y: n,
		prev: null,
		next: null,
		z: 0,
		prevZ: null,
		nextZ: null,
		steiner: !1
	};
}
function Na(e, t, n, r) {
	let i = 0;
	for (let a = t, o = n - r; a < n; a += r) i += (e[o] - e[a]) * (e[a + 1] + e[o + 1]), o = a;
	return i;
}
var Pa = class {
	static triangulate(e, t, n = 2) {
		return ta(e, t, n);
	}
}, Fa = class e {
	static area(e) {
		let t = e.length, n = 0;
		for (let r = t - 1, i = 0; i < t; r = i++) n += e[r].x * e[i].y - e[i].x * e[r].y;
		return n * .5;
	}
	static isClockWise(t) {
		return e.area(t) < 0;
	}
	static triangulateShape(e, t) {
		let n = [], r = [], i = [];
		Ia(e), La(n, e);
		let a = e.length;
		t.forEach(Ia);
		for (let e = 0; e < t.length; e++) r.push(a), a += t[e].length, La(n, t[e]);
		let o = Pa.triangulate(n, r);
		for (let e = 0; e < o.length; e += 3) i.push(o.slice(e, e + 3));
		return i;
	}
};
function Ia(e) {
	let t = e.length;
	t > 2 && e[t - 1].equals(e[0]) && e.pop();
}
function La(e, t) {
	for (let n = 0; n < t.length; n++) e.push(t[n].x), e.push(t[n].y);
}
var Ra = class e extends Mn {
	constructor(e = new ea([
		new H(.5, .5),
		new H(-.5, .5),
		new H(-.5, -.5),
		new H(.5, -.5)
	]), t = {}) {
		super(), this.type = "ExtrudeGeometry", this.parameters = {
			shapes: e,
			options: t
		}, e = Array.isArray(e) ? e : [e];
		let n = this, r = [], i = [];
		for (let t = 0, n = e.length; t < n; t++) {
			let n = e[t];
			a(n);
		}
		this.setAttribute("position", new wn(r, 3)), this.setAttribute("uv", new wn(i, 2)), this.computeVertexNormals();
		function a(e) {
			let a = [], o = t.curveSegments === void 0 ? 12 : t.curveSegments, s = t.steps === void 0 ? 1 : t.steps, c = t.depth === void 0 ? 1 : t.depth, l = t.bevelEnabled === void 0 || t.bevelEnabled, u = t.bevelThickness === void 0 ? .2 : t.bevelThickness, d = t.bevelSize === void 0 ? u - .1 : t.bevelSize, f = t.bevelOffset === void 0 ? 0 : t.bevelOffset, p = t.bevelSegments === void 0 ? 3 : t.bevelSegments, m = t.extrudePath, h = t.UVGenerator === void 0 ? za : t.UVGenerator, g, _ = !1, v, y, b, x;
			m && (g = m.getSpacedPoints(s), _ = !0, l = !1, v = m.computeFrenetFrames(s, !1), y = new W(), b = new W(), x = new W()), l || (p = 0, u = 0, d = 0, f = 0);
			let S = e.extractPoints(o), C = S.shape, w = S.holes;
			if (!Fa.isClockWise(C)) {
				C = C.reverse();
				for (let e = 0, t = w.length; e < t; e++) {
					let t = w[e];
					Fa.isClockWise(t) && (w[e] = t.reverse());
				}
			}
			function T(e) {
				let t = e[0];
				for (let n = 1; n <= e.length; n++) {
					let r = n % e.length, i = e[r], a = i.x - t.x, o = i.y - t.y, s = a * a + o * o, c = Math.max(Math.abs(i.x), Math.abs(i.y), Math.abs(t.x), Math.abs(t.y));
					if (s <= 10000000000000001e-36 * c * c) {
						e.splice(r, 1), n--;
						continue;
					}
					t = i;
				}
			}
			T(C), w.forEach(T);
			let E = w.length, D = C;
			for (let e = 0; e < E; e++) {
				let t = w[e];
				C = C.concat(t);
			}
			function O(e, t, n) {
				return t || console.error("THREE.ExtrudeGeometry: vec does not exist"), e.clone().addScaledVector(t, n);
			}
			let k = C.length;
			function A(e, t, n) {
				let r, i, a, o = e.x - t.x, s = e.y - t.y, c = n.x - e.x, l = n.y - e.y, u = o * o + s * s, d = o * l - s * c;
				if (Math.abs(d) > 2 ** -52) {
					let d = Math.sqrt(u), f = Math.sqrt(c * c + l * l), p = t.x - s / d, m = t.y + o / d, h = n.x - l / f, g = n.y + c / f, _ = ((h - p) * l - (g - m) * c) / (o * l - s * c);
					r = p + o * _ - e.x, i = m + s * _ - e.y;
					let v = r * r + i * i;
					if (v <= 2) return new H(r, i);
					a = Math.sqrt(v / 2);
				} else {
					let e = !1;
					o > 2 ** -52 ? c > 2 ** -52 && (e = !0) : o < -(2 ** -52) ? c < -(2 ** -52) && (e = !0) : Math.sign(s) === Math.sign(l) && (e = !0), e ? (r = -s, i = o, a = Math.sqrt(u)) : (r = o, i = s, a = Math.sqrt(u / 2));
				}
				return new H(r / a, i / a);
			}
			let j = [];
			for (let e = 0, t = D.length, n = t - 1, r = e + 1; e < t; e++, n++, r++) n === t && (n = 0), r === t && (r = 0), j[e] = A(D[e], D[n], D[r]);
			let M = [], N, P = j.concat();
			for (let e = 0, t = E; e < t; e++) {
				let t = w[e];
				N = [];
				for (let e = 0, n = t.length, r = n - 1, i = e + 1; e < n; e++, r++, i++) r === n && (r = 0), i === n && (i = 0), N[e] = A(t[e], t[r], t[i]);
				M.push(N), P = P.concat(N);
			}
			let F;
			if (p === 0) F = Fa.triangulateShape(D, w);
			else {
				let e = [], t = [];
				for (let n = 0; n < p; n++) {
					let r = n / p, i = u * Math.cos(r * Math.PI / 2), a = d * Math.sin(r * Math.PI / 2) + f;
					for (let t = 0, n = D.length; t < n; t++) {
						let n = O(D[t], j[t], a);
						re(n.x, n.y, -i), r === 0 && e.push(n);
					}
					for (let e = 0, n = E; e < n; e++) {
						let n = w[e];
						N = M[e];
						let o = [];
						for (let e = 0, t = n.length; e < t; e++) {
							let t = O(n[e], N[e], a);
							re(t.x, t.y, -i), r === 0 && o.push(t);
						}
						r === 0 && t.push(o);
					}
				}
				F = Fa.triangulateShape(e, t);
			}
			let ee = F.length, I = d + f;
			for (let e = 0; e < k; e++) {
				let t = l ? O(C[e], P[e], I) : C[e];
				_ ? (b.copy(v.normals[0]).multiplyScalar(t.x), y.copy(v.binormals[0]).multiplyScalar(t.y), x.copy(g[0]).add(b).add(y), re(x.x, x.y, x.z)) : re(t.x, t.y, 0);
			}
			for (let e = 1; e <= s; e++) for (let t = 0; t < k; t++) {
				let n = l ? O(C[t], P[t], I) : C[t];
				_ ? (b.copy(v.normals[e]).multiplyScalar(n.x), y.copy(v.binormals[e]).multiplyScalar(n.y), x.copy(g[e]).add(b).add(y), re(x.x, x.y, x.z)) : re(n.x, n.y, c / s * e);
			}
			for (let e = p - 1; e >= 0; e--) {
				let t = e / p, n = u * Math.cos(t * Math.PI / 2), r = d * Math.sin(t * Math.PI / 2) + f;
				for (let e = 0, t = D.length; e < t; e++) {
					let t = O(D[e], j[e], r);
					re(t.x, t.y, c + n);
				}
				for (let e = 0, t = w.length; e < t; e++) {
					let t = w[e];
					N = M[e];
					for (let e = 0, i = t.length; e < i; e++) {
						let i = O(t[e], N[e], r);
						_ ? re(i.x, i.y + g[s - 1].y, g[s - 1].x + n) : re(i.x, i.y, c + n);
					}
				}
			}
			L(), te();
			function L() {
				let e = r.length / 3;
				if (l) {
					let e = 0, t = k * e;
					for (let e = 0; e < ee; e++) {
						let n = F[e];
						R(n[2] + t, n[1] + t, n[0] + t);
					}
					e = s + p * 2, t = k * e;
					for (let e = 0; e < ee; e++) {
						let n = F[e];
						R(n[0] + t, n[1] + t, n[2] + t);
					}
				} else {
					for (let e = 0; e < ee; e++) {
						let t = F[e];
						R(t[2], t[1], t[0]);
					}
					for (let e = 0; e < ee; e++) {
						let t = F[e];
						R(t[0] + k * s, t[1] + k * s, t[2] + k * s);
					}
				}
				n.addGroup(e, r.length / 3 - e, 0);
			}
			function te() {
				let e = r.length / 3, t = 0;
				ne(D, t), t += D.length;
				for (let e = 0, n = w.length; e < n; e++) {
					let n = w[e];
					ne(n, t), t += n.length;
				}
				n.addGroup(e, r.length / 3 - e, 1);
			}
			function ne(e, t) {
				let n = e.length;
				for (; --n >= 0;) {
					let r = n, i = n - 1;
					i < 0 && (i = e.length - 1);
					for (let e = 0, n = s + p * 2; e < n; e++) {
						let n = k * e, a = k * (e + 1);
						ie(t + r + n, t + i + n, t + i + a, t + r + a);
					}
				}
			}
			function re(e, t, n) {
				a.push(e), a.push(t), a.push(n);
			}
			function R(e, t, i) {
				z(e), z(t), z(i);
				let a = r.length / 3, o = h.generateTopUV(n, r, a - 3, a - 2, a - 1);
				ae(o[0]), ae(o[1]), ae(o[2]);
			}
			function ie(e, t, i, a) {
				z(e), z(t), z(a), z(t), z(i), z(a);
				let o = r.length / 3, s = h.generateSideWallUV(n, r, o - 6, o - 3, o - 2, o - 1);
				ae(s[0]), ae(s[1]), ae(s[3]), ae(s[1]), ae(s[2]), ae(s[3]);
			}
			function z(e) {
				r.push(a[e * 3 + 0]), r.push(a[e * 3 + 1]), r.push(a[e * 3 + 2]);
			}
			function ae(e) {
				i.push(e.x), i.push(e.y);
			}
		}
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	toJSON() {
		let e = super.toJSON(), t = this.parameters.shapes, n = this.parameters.options;
		return Ba(t, n, e);
	}
	static fromJSON(t, n) {
		let r = [];
		for (let e = 0, i = t.shapes.length; e < i; e++) {
			let i = n[t.shapes[e]];
			r.push(i);
		}
		let i = t.options.extrudePath;
		return i !== void 0 && (t.options.extrudePath = new Zi[i.type]().fromJSON(i)), new e(r, t.options);
	}
}, za = {
	generateTopUV: function(e, t, n, r, i) {
		let a = t[n * 3], o = t[n * 3 + 1], s = t[r * 3], c = t[r * 3 + 1], l = t[i * 3], u = t[i * 3 + 1];
		return [
			new H(a, o),
			new H(s, c),
			new H(l, u)
		];
	},
	generateSideWallUV: function(e, t, n, r, i, a) {
		let o = t[n * 3], s = t[n * 3 + 1], c = t[n * 3 + 2], l = t[r * 3], u = t[r * 3 + 1], d = t[r * 3 + 2], f = t[i * 3], p = t[i * 3 + 1], m = t[i * 3 + 2], h = t[a * 3], g = t[a * 3 + 1], _ = t[a * 3 + 2];
		return Math.abs(s - u) < Math.abs(o - l) ? [
			new H(o, 1 - c),
			new H(l, 1 - d),
			new H(f, 1 - m),
			new H(h, 1 - _)
		] : [
			new H(s, 1 - c),
			new H(u, 1 - d),
			new H(p, 1 - m),
			new H(g, 1 - _)
		];
	}
};
function Ba(e, t, n) {
	if (n.shapes = [], Array.isArray(e)) for (let t = 0, r = e.length; t < r; t++) {
		let r = e[t];
		n.shapes.push(r.uuid);
	}
	else n.shapes.push(e.uuid);
	return n.options = Object.assign({}, t), t.extrudePath !== void 0 && (n.options.extrudePath = t.extrudePath.toJSON()), n;
}
var Va = class e extends Mn {
	constructor(e = 1, t = 1, n = 1, r = 1) {
		super(), this.type = "PlaneGeometry", this.parameters = {
			width: e,
			height: t,
			widthSegments: n,
			heightSegments: r
		};
		let i = e / 2, a = t / 2, o = Math.floor(n), s = Math.floor(r), c = o + 1, l = s + 1, u = e / o, d = t / s, f = [], p = [], m = [], h = [];
		for (let e = 0; e < l; e++) {
			let t = e * d - a;
			for (let n = 0; n < c; n++) {
				let r = n * u - i;
				p.push(r, -t, 0), m.push(0, 0, 1), h.push(n / o), h.push(1 - e / s);
			}
		}
		for (let e = 0; e < s; e++) for (let t = 0; t < o; t++) {
			let n = t + c * e, r = t + c * (e + 1), i = t + 1 + c * (e + 1), a = t + 1 + c * e;
			f.push(n, r, a), f.push(r, i, a);
		}
		this.setIndex(f), this.setAttribute("position", new wn(p, 3)), this.setAttribute("normal", new wn(m, 3)), this.setAttribute("uv", new wn(h, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.widthSegments, t.heightSegments);
	}
}, Ha = class e extends Mn {
	constructor(e = .5, t = 1, n = 32, r = 1, i = 0, a = Math.PI * 2) {
		super(), this.type = "RingGeometry", this.parameters = {
			innerRadius: e,
			outerRadius: t,
			thetaSegments: n,
			phiSegments: r,
			thetaStart: i,
			thetaLength: a
		}, n = Math.max(3, n), r = Math.max(1, r);
		let o = [], s = [], c = [], l = [], u = e, d = (t - e) / r, f = new W(), p = new H();
		for (let e = 0; e <= r; e++) {
			for (let e = 0; e <= n; e++) {
				let r = i + e / n * a;
				f.x = u * Math.cos(r), f.y = u * Math.sin(r), s.push(f.x, f.y, f.z), c.push(0, 0, 1), p.x = (f.x / t + 1) / 2, p.y = (f.y / t + 1) / 2, l.push(p.x, p.y);
			}
			u += d;
		}
		for (let e = 0; e < r; e++) {
			let t = e * (n + 1);
			for (let e = 0; e < n; e++) {
				let r = e + t, i = r, a = r + n + 1, s = r + n + 2, c = r + 1;
				o.push(i, a, c), o.push(a, s, c);
			}
		}
		this.setIndex(o), this.setAttribute("position", new wn(s, 3)), this.setAttribute("normal", new wn(c, 3)), this.setAttribute("uv", new wn(l, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.innerRadius, t.outerRadius, t.thetaSegments, t.phiSegments, t.thetaStart, t.thetaLength);
	}
}, Ua = class e extends Mn {
	constructor(e = 1, t = 32, n = 16, r = 0, i = Math.PI * 2, a = 0, o = Math.PI) {
		super(), this.type = "SphereGeometry", this.parameters = {
			radius: e,
			widthSegments: t,
			heightSegments: n,
			phiStart: r,
			phiLength: i,
			thetaStart: a,
			thetaLength: o
		}, t = Math.max(3, Math.floor(t)), n = Math.max(2, Math.floor(n));
		let s = Math.min(a + o, Math.PI), c = 0, l = [], u = new W(), d = new W(), f = [], p = [], m = [], h = [];
		for (let f = 0; f <= n; f++) {
			let g = [], _ = f / n, v = 0;
			f === 0 && a === 0 ? v = .5 / t : f === n && s === Math.PI && (v = -.5 / t);
			for (let n = 0; n <= t; n++) {
				let s = n / t;
				u.x = -e * Math.cos(r + s * i) * Math.sin(a + _ * o), u.y = e * Math.cos(a + _ * o), u.z = e * Math.sin(r + s * i) * Math.sin(a + _ * o), p.push(u.x, u.y, u.z), d.copy(u).normalize(), m.push(d.x, d.y, d.z), h.push(s + v, 1 - _), g.push(c++);
			}
			l.push(g);
		}
		for (let e = 0; e < n; e++) for (let r = 0; r < t; r++) {
			let t = l[e][r + 1], i = l[e][r], o = l[e + 1][r], c = l[e + 1][r + 1];
			(e !== 0 || a > 0) && f.push(t, i, c), (e !== n - 1 || s < Math.PI) && f.push(i, o, c);
		}
		this.setIndex(f), this.setAttribute("position", new wn(p, 3)), this.setAttribute("normal", new wn(m, 3)), this.setAttribute("uv", new wn(h, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.radius, t.widthSegments, t.heightSegments, t.phiStart, t.phiLength, t.thetaStart, t.thetaLength);
	}
}, Wa = class e extends Mn {
	constructor(e = 1, t = .4, n = 12, r = 48, i = Math.PI * 2) {
		super(), this.type = "TorusGeometry", this.parameters = {
			radius: e,
			tube: t,
			radialSegments: n,
			tubularSegments: r,
			arc: i
		}, n = Math.floor(n), r = Math.floor(r);
		let a = [], o = [], s = [], c = [], l = new W(), u = new W(), d = new W();
		for (let a = 0; a <= n; a++) for (let f = 0; f <= r; f++) {
			let p = f / r * i, m = a / n * Math.PI * 2;
			u.x = (e + t * Math.cos(m)) * Math.cos(p), u.y = (e + t * Math.cos(m)) * Math.sin(p), u.z = t * Math.sin(m), o.push(u.x, u.y, u.z), l.x = e * Math.cos(p), l.y = e * Math.sin(p), d.subVectors(u, l).normalize(), s.push(d.x, d.y, d.z), c.push(f / r), c.push(a / n);
		}
		for (let e = 1; e <= n; e++) for (let t = 1; t <= r; t++) {
			let n = (r + 1) * e + t - 1, i = (r + 1) * (e - 1) + t - 1, o = (r + 1) * (e - 1) + t, s = (r + 1) * e + t;
			a.push(n, i, s), a.push(i, o, s);
		}
		this.setIndex(a), this.setAttribute("position", new wn(o, 3)), this.setAttribute("normal", new wn(s, 3)), this.setAttribute("uv", new wn(c, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.radius, t.tube, t.radialSegments, t.tubularSegments, t.arc);
	}
}, Ga = class extends tr {
	constructor(e) {
		super(e), this.isRawShaderMaterial = !0, this.type = "RawShaderMaterial";
	}
}, Ka = class extends dn {
	constructor(e) {
		super(), this.isMeshStandardMaterial = !0, this.type = "MeshStandardMaterial", this.defines = { STANDARD: "" }, this.color = new Y(16777215), this.roughness = 1, this.metalness = 0, this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.emissive = new Y(0), this.emissiveIntensity = 1, this.emissiveMap = null, this.bumpMap = null, this.bumpScale = 1, this.normalMap = null, this.normalMapType = 0, this.normalScale = new H(1, 1), this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.roughnessMap = null, this.metalnessMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new Et(), this.envMapIntensity = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.flatShading = !1, this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.defines = { STANDARD: "" }, this.color.copy(e.color), this.roughness = e.roughness, this.metalness = e.metalness, this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.emissive.copy(e.emissive), this.emissiveMap = e.emissiveMap, this.emissiveIntensity = e.emissiveIntensity, this.bumpMap = e.bumpMap, this.bumpScale = e.bumpScale, this.normalMap = e.normalMap, this.normalMapType = e.normalMapType, this.normalScale.copy(e.normalScale), this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.roughnessMap = e.roughnessMap, this.metalnessMap = e.metalnessMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.envMapIntensity = e.envMapIntensity, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.flatShading = e.flatShading, this.fog = e.fog, this;
	}
}, qa = class extends Ka {
	constructor(e) {
		super(), this.isMeshPhysicalMaterial = !0, this.defines = {
			STANDARD: "",
			PHYSICAL: ""
		}, this.type = "MeshPhysicalMaterial", this.anisotropyRotation = 0, this.anisotropyMap = null, this.clearcoatMap = null, this.clearcoatRoughness = 0, this.clearcoatRoughnessMap = null, this.clearcoatNormalScale = new H(1, 1), this.clearcoatNormalMap = null, this.ior = 1.5, Object.defineProperty(this, "reflectivity", {
			get: function() {
				return L(2.5 * (this.ior - 1) / (this.ior + 1), 0, 1);
			},
			set: function(e) {
				this.ior = (1 + .4 * e) / (1 - .4 * e);
			}
		}), this.iridescenceMap = null, this.iridescenceIOR = 1.3, this.iridescenceThicknessRange = [100, 400], this.iridescenceThicknessMap = null, this.sheenColor = new Y(0), this.sheenColorMap = null, this.sheenRoughness = 1, this.sheenRoughnessMap = null, this.transmissionMap = null, this.thickness = 0, this.thicknessMap = null, this.attenuationDistance = Infinity, this.attenuationColor = new Y(1, 1, 1), this.specularIntensity = 1, this.specularIntensityMap = null, this.specularColor = new Y(1, 1, 1), this.specularColorMap = null, this._anisotropy = 0, this._clearcoat = 0, this._dispersion = 0, this._iridescence = 0, this._sheen = 0, this._transmission = 0, this.setValues(e);
	}
	get anisotropy() {
		return this._anisotropy;
	}
	set anisotropy(e) {
		this._anisotropy > 0 != e > 0 && this.version++, this._anisotropy = e;
	}
	get clearcoat() {
		return this._clearcoat;
	}
	set clearcoat(e) {
		this._clearcoat > 0 != e > 0 && this.version++, this._clearcoat = e;
	}
	get iridescence() {
		return this._iridescence;
	}
	set iridescence(e) {
		this._iridescence > 0 != e > 0 && this.version++, this._iridescence = e;
	}
	get dispersion() {
		return this._dispersion;
	}
	set dispersion(e) {
		this._dispersion > 0 != e > 0 && this.version++, this._dispersion = e;
	}
	get sheen() {
		return this._sheen;
	}
	set sheen(e) {
		this._sheen > 0 != e > 0 && this.version++, this._sheen = e;
	}
	get transmission() {
		return this._transmission;
	}
	set transmission(e) {
		this._transmission > 0 != e > 0 && this.version++, this._transmission = e;
	}
	copy(e) {
		return super.copy(e), this.defines = {
			STANDARD: "",
			PHYSICAL: ""
		}, this.anisotropy = e.anisotropy, this.anisotropyRotation = e.anisotropyRotation, this.anisotropyMap = e.anisotropyMap, this.clearcoat = e.clearcoat, this.clearcoatMap = e.clearcoatMap, this.clearcoatRoughness = e.clearcoatRoughness, this.clearcoatRoughnessMap = e.clearcoatRoughnessMap, this.clearcoatNormalMap = e.clearcoatNormalMap, this.clearcoatNormalScale.copy(e.clearcoatNormalScale), this.dispersion = e.dispersion, this.ior = e.ior, this.iridescence = e.iridescence, this.iridescenceMap = e.iridescenceMap, this.iridescenceIOR = e.iridescenceIOR, this.iridescenceThicknessRange = [...e.iridescenceThicknessRange], this.iridescenceThicknessMap = e.iridescenceThicknessMap, this.sheen = e.sheen, this.sheenColor.copy(e.sheenColor), this.sheenColorMap = e.sheenColorMap, this.sheenRoughness = e.sheenRoughness, this.sheenRoughnessMap = e.sheenRoughnessMap, this.transmission = e.transmission, this.transmissionMap = e.transmissionMap, this.thickness = e.thickness, this.thicknessMap = e.thicknessMap, this.attenuationDistance = e.attenuationDistance, this.attenuationColor.copy(e.attenuationColor), this.specularIntensity = e.specularIntensity, this.specularIntensityMap = e.specularIntensityMap, this.specularColor.copy(e.specularColor), this.specularColorMap = e.specularColorMap, this;
	}
}, Ja = class extends dn {
	constructor(e) {
		super(), this.isMeshNormalMaterial = !0, this.type = "MeshNormalMaterial", this.bumpMap = null, this.bumpScale = 1, this.normalMap = null, this.normalMapType = 0, this.normalScale = new H(1, 1), this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.wireframe = !1, this.wireframeLinewidth = 1, this.flatShading = !1, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.bumpMap = e.bumpMap, this.bumpScale = e.bumpScale, this.normalMap = e.normalMap, this.normalMapType = e.normalMapType, this.normalScale.copy(e.normalScale), this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.flatShading = e.flatShading, this;
	}
}, Ya = class extends dn {
	constructor(e) {
		super(), this.isMeshDepthMaterial = !0, this.type = "MeshDepthMaterial", this.depthPacking = 3200, this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.wireframe = !1, this.wireframeLinewidth = 1, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.depthPacking = e.depthPacking, this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this;
	}
}, Xa = class extends dn {
	constructor(e) {
		super(), this.isMeshDistanceMaterial = !0, this.type = "MeshDistanceMaterial", this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this;
	}
};
function Za(e, t) {
	return !e || e.constructor === t ? e : typeof t.BYTES_PER_ELEMENT == "number" ? new t(e) : Array.prototype.slice.call(e);
}
function Qa(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
function $a(e) {
	function t(t, n) {
		return e[t] - e[n];
	}
	let n = e.length, r = Array(n);
	for (let e = 0; e !== n; ++e) r[e] = e;
	return r.sort(t), r;
}
function eo(e, t, n) {
	let r = e.length, i = new e.constructor(r);
	for (let a = 0, o = 0; o !== r; ++a) {
		let r = n[a] * t;
		for (let n = 0; n !== t; ++n) i[o++] = e[r + n];
	}
	return i;
}
function to(e, t, n, r) {
	let i = 1, a = e[0];
	for (; a !== void 0 && a[r] === void 0;) a = e[i++];
	if (a === void 0) return;
	let o = a[r];
	if (o !== void 0) {
		if (Array.isArray(o)) do
			o = a[r], o !== void 0 && (t.push(a.time), n.push(...o)), a = e[i++];
		while (a !== void 0);
		else if (o.toArray !== void 0) do
			o = a[r], o !== void 0 && (t.push(a.time), o.toArray(n, n.length)), a = e[i++];
		while (a !== void 0);
		else do
			o = a[r], o !== void 0 && (t.push(a.time), n.push(o)), a = e[i++];
		while (a !== void 0);
	}
}
var no = class {
	constructor(e, t, n, r) {
		this.parameterPositions = e, this._cachedIndex = 0, this.resultBuffer = r === void 0 ? new t.constructor(n) : r, this.sampleValues = t, this.valueSize = n, this.settings = null, this.DefaultSettings_ = {};
	}
	evaluate(e) {
		let t = this.parameterPositions, n = this._cachedIndex, r = t[n], i = t[n - 1];
		validate_interval: {
			seek: {
				let a;
				linear_scan: {
					forward_scan: if (!(e < r)) {
						for (let a = n + 2;;) {
							if (r === void 0) {
								if (e < i) break forward_scan;
								return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
							}
							if (n === a) break;
							if (i = r, r = t[++n], e < r) break seek;
						}
						a = t.length;
						break linear_scan;
					}
					if (!(e >= i)) {
						let o = t[1];
						e < o && (n = 2, i = o);
						for (let a = n - 2;;) {
							if (i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
							if (n === a) break;
							if (r = i, i = t[--n - 1], e >= i) break seek;
						}
						a = n, n = 0;
						break linear_scan;
					}
					break validate_interval;
				}
				for (; n < a;) {
					let r = n + a >>> 1;
					e < t[r] ? a = r : n = r + 1;
				}
				if (r = t[n], i = t[n - 1], i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
				if (r === void 0) return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
			}
			this._cachedIndex = n, this.intervalChanged_(n, i, r);
		}
		return this.interpolate_(n, i, e, r);
	}
	getSettings_() {
		return this.settings || this.DefaultSettings_;
	}
	copySampleValue_(e) {
		let t = this.resultBuffer, n = this.sampleValues, r = this.valueSize, i = e * r;
		for (let e = 0; e !== r; ++e) t[e] = n[i + e];
		return t;
	}
	interpolate_() {
		throw Error("call to abstract method");
	}
	intervalChanged_() {}
}, ro = class extends no {
	constructor(e, t, n, r) {
		super(e, t, n, r), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = {
			endingStart: x,
			endingEnd: x
		};
	}
	intervalChanged_(e, t, n) {
		let r = this.parameterPositions, i = e - 2, a = e + 1, o = r[i], s = r[a];
		if (o === void 0) switch (this.getSettings_().endingStart) {
			case S:
				i = e, o = 2 * t - n;
				break;
			case C:
				i = r.length - 2, o = t + r[i] - r[i + 1];
				break;
			default: i = e, o = n;
		}
		if (s === void 0) switch (this.getSettings_().endingEnd) {
			case S:
				a = e, s = 2 * n - t;
				break;
			case C:
				a = 1, s = n + r[1] - r[0];
				break;
			default: a = e - 1, s = t;
		}
		let c = (n - t) * .5, l = this.valueSize;
		this._weightPrev = c / (t - o), this._weightNext = c / (s - n), this._offsetPrev = i * l, this._offsetNext = a * l;
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = this._offsetPrev, u = this._offsetNext, d = this._weightPrev, f = this._weightNext, p = (n - t) / (r - t), m = p * p, h = m * p, g = -d * h + 2 * d * m - d * p, _ = (1 + d) * h + (-1.5 - 2 * d) * m + (-.5 + d) * p + 1, v = (-1 - f) * h + (1.5 + f) * m + .5 * p, y = f * h - f * m;
		for (let e = 0; e !== o; ++e) i[e] = g * a[l + e] + _ * a[c + e] + v * a[s + e] + y * a[u + e];
		return i;
	}
}, io = class extends no {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = (n - t) / (r - t), u = 1 - l;
		for (let e = 0; e !== o; ++e) i[e] = a[c + e] * u + a[s + e] * l;
		return i;
	}
}, ao = class extends no {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e) {
		return this.copySampleValue_(e - 1);
	}
}, oo = class {
	constructor(e, t, n, r) {
		if (e === void 0) throw Error("THREE.KeyframeTrack: track name is undefined");
		if (t === void 0 || t.length === 0) throw Error("THREE.KeyframeTrack: no keyframes in track named " + e);
		this.name = e, this.times = Za(t, this.TimeBufferType), this.values = Za(n, this.ValueBufferType), this.setInterpolation(r || this.DefaultInterpolation);
	}
	static toJSON(e) {
		let t = e.constructor, n;
		if (t.toJSON !== this.toJSON) n = t.toJSON(e);
		else {
			n = {
				name: e.name,
				times: Za(e.times, Array),
				values: Za(e.values, Array)
			};
			let t = e.getInterpolation();
			t !== e.DefaultInterpolation && (n.interpolation = t);
		}
		return n.type = e.ValueTypeName, n;
	}
	InterpolantFactoryMethodDiscrete(e) {
		return new ao(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodLinear(e) {
		return new io(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodSmooth(e) {
		return new ro(this.times, this.values, this.getValueSize(), e);
	}
	setInterpolation(e) {
		let t;
		switch (e) {
			case v:
				t = this.InterpolantFactoryMethodDiscrete;
				break;
			case y:
				t = this.InterpolantFactoryMethodLinear;
				break;
			case b: t = this.InterpolantFactoryMethodSmooth;
		}
		if (t === void 0) {
			let t = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
			if (this.createInterpolant === void 0) {
				if (e !== this.DefaultInterpolation) this.setInterpolation(this.DefaultInterpolation);
				else throw Error(t);
			}
			return console.warn("THREE.KeyframeTrack:", t), this;
		}
		return this.createInterpolant = t, this;
	}
	getInterpolation() {
		switch (this.createInterpolant) {
			case this.InterpolantFactoryMethodDiscrete: return v;
			case this.InterpolantFactoryMethodLinear: return y;
			case this.InterpolantFactoryMethodSmooth: return b;
		}
	}
	getValueSize() {
		return this.values.length / this.times.length;
	}
	shift(e) {
		if (e !== 0) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] += e;
		}
		return this;
	}
	scale(e) {
		if (e !== 1) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] *= e;
		}
		return this;
	}
	trim(e, t) {
		let n = this.times, r = n.length, i = 0, a = r - 1;
		for (; i !== r && n[i] < e;) ++i;
		for (; a !== -1 && n[a] > t;) --a;
		if (++a, i !== 0 || a !== r) {
			i >= a && (a = Math.max(a, 1), i = a - 1);
			let e = this.getValueSize();
			this.times = n.slice(i, a), this.values = this.values.slice(i * e, a * e);
		}
		return this;
	}
	validate() {
		let e = !0, t = this.getValueSize();
		t - Math.floor(t) !== 0 && (console.error("THREE.KeyframeTrack: Invalid value size in track.", this), e = !1);
		let n = this.times, r = this.values, i = n.length;
		i === 0 && (console.error("THREE.KeyframeTrack: Track is empty.", this), e = !1);
		let a = null;
		for (let t = 0; t !== i; t++) {
			let r = n[t];
			if (typeof r == "number" && isNaN(r)) {
				console.error("THREE.KeyframeTrack: Time is not a valid number.", this, t, r), e = !1;
				break;
			}
			if (a !== null && a > r) {
				console.error("THREE.KeyframeTrack: Out of order keys.", this, t, r, a), e = !1;
				break;
			}
			a = r;
		}
		if (r !== void 0 && Qa(r)) for (let t = 0, n = r.length; t !== n; ++t) {
			let n = r[t];
			if (isNaN(n)) {
				console.error("THREE.KeyframeTrack: Value is not a valid number.", this, t, n), e = !1;
				break;
			}
		}
		return e;
	}
	optimize() {
		let e = this.times.slice(), t = this.values.slice(), n = this.getValueSize(), r = this.getInterpolation() === b, i = e.length - 1, a = 1;
		for (let o = 1; o < i; ++o) {
			let i = !1, s = e[o];
			if (s !== e[o + 1] && (o !== 1 || s !== e[0])) {
				if (r) i = !0;
				else {
					let e = o * n, r = e - n, a = e + n;
					for (let o = 0; o !== n; ++o) {
						let n = t[e + o];
						if (n !== t[r + o] || n !== t[a + o]) {
							i = !0;
							break;
						}
					}
				}
			}
			if (i) {
				if (o !== a) {
					e[a] = e[o];
					let r = o * n, i = a * n;
					for (let e = 0; e !== n; ++e) t[i + e] = t[r + e];
				}
				++a;
			}
		}
		if (i > 0) {
			e[a] = e[i];
			for (let e = i * n, r = a * n, o = 0; o !== n; ++o) t[r + o] = t[e + o];
			++a;
		}
		return a === e.length ? (this.times = e, this.values = t) : (this.times = e.slice(0, a), this.values = t.slice(0, a * n)), this;
	}
	clone() {
		let e = this.times.slice(), t = this.values.slice(), n = this.constructor, r = new n(this.name, e, t);
		return r.createInterpolant = this.createInterpolant, r;
	}
};
oo.prototype.ValueTypeName = "", oo.prototype.TimeBufferType = Float32Array, oo.prototype.ValueBufferType = Float32Array, oo.prototype.DefaultInterpolation = y;
var so = class extends oo {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
so.prototype.ValueTypeName = "bool", so.prototype.ValueBufferType = Array, so.prototype.DefaultInterpolation = v, so.prototype.InterpolantFactoryMethodLinear = void 0, so.prototype.InterpolantFactoryMethodSmooth = void 0;
var co = class extends oo {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
co.prototype.ValueTypeName = "color";
var lo = class extends oo {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
lo.prototype.ValueTypeName = "number";
var uo = class extends no {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = (n - t) / (r - t), c = e * o;
		for (let e = c + o; c !== e; c += 4) U.slerpFlat(i, 0, a, c - o, a, c, s);
		return i;
	}
}, fo = class extends oo {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	InterpolantFactoryMethodLinear(e) {
		return new uo(this.times, this.values, this.getValueSize(), e);
	}
};
fo.prototype.ValueTypeName = "quaternion", fo.prototype.InterpolantFactoryMethodSmooth = void 0;
var po = class extends oo {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
po.prototype.ValueTypeName = "string", po.prototype.ValueBufferType = Array, po.prototype.DefaultInterpolation = v, po.prototype.InterpolantFactoryMethodLinear = void 0, po.prototype.InterpolantFactoryMethodSmooth = void 0;
var mo = class extends oo {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
mo.prototype.ValueTypeName = "vector";
var ho = class {
	constructor(e = "", t = -1, n = [], r = w) {
		this.name = e, this.tracks = n, this.duration = t, this.blendMode = r, this.uuid = I(), this.userData = {}, this.duration < 0 && this.resetDuration();
	}
	static parse(e) {
		let t = [], n = e.tracks, r = 1 / (e.fps || 1);
		for (let e = 0, i = n.length; e !== i; ++e) t.push(_o(n[e]).scale(r));
		let i = new this(e.name, e.duration, t, e.blendMode);
		return i.uuid = e.uuid, i.userData = JSON.parse(e.userData || "{}"), i;
	}
	static toJSON(e) {
		let t = [], n = e.tracks, r = {
			name: e.name,
			duration: e.duration,
			tracks: t,
			uuid: e.uuid,
			blendMode: e.blendMode,
			userData: JSON.stringify(e.userData)
		};
		for (let e = 0, r = n.length; e !== r; ++e) t.push(oo.toJSON(n[e]));
		return r;
	}
	static CreateFromMorphTargetSequence(e, t, n, r) {
		let i = t.length, a = [];
		for (let e = 0; e < i; e++) {
			let o = [], s = [];
			o.push((e + i - 1) % i, e, (e + 1) % i), s.push(0, 1, 0);
			let c = $a(o);
			o = eo(o, 1, c), s = eo(s, 1, c), !r && o[0] === 0 && (o.push(i), s.push(s[0])), a.push(new lo(".morphTargetInfluences[" + t[e].name + "]", o, s).scale(1 / n));
		}
		return new this(e, -1, a);
	}
	static findByName(e, t) {
		let n = e;
		if (!Array.isArray(e)) {
			let t = e;
			n = t.geometry && t.geometry.animations || t.animations;
		}
		for (let e = 0; e < n.length; e++) if (n[e].name === t) return n[e];
		return null;
	}
	static CreateClipsFromMorphTargetSequences(e, t, n) {
		let r = {}, i = /^([\w-]*?)([\d]+)$/;
		for (let t = 0, n = e.length; t < n; t++) {
			let n = e[t], a = n.name.match(i);
			if (a && a.length > 1) {
				let e = a[1], t = r[e];
				t || (r[e] = t = []), t.push(n);
			}
		}
		let a = [];
		for (let e in r) a.push(this.CreateFromMorphTargetSequence(e, r[e], t, n));
		return a;
	}
	static parseAnimation(e, t) {
		if (console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185"), !e) return console.error("THREE.AnimationClip: No animation in JSONLoader data."), null;
		let n = function(e, t, n, r, i) {
			if (n.length !== 0) {
				let a = [], o = [];
				to(n, a, o, r), a.length !== 0 && i.push(new e(t, a, o));
			}
		}, r = [], i = e.name || "default", a = e.fps || 30, o = e.blendMode, s = e.length || -1, c = e.hierarchy || [];
		for (let e = 0; e < c.length; e++) {
			let i = c[e].keys;
			if (i && i.length !== 0) {
				if (i[0].morphTargets) {
					let e = {}, t = 0;
					for (; t < i.length; t++) if (i[t].morphTargets) for (let n = 0; n < i[t].morphTargets.length; n++) e[i[t].morphTargets[n]] = -1;
					for (let n in e) {
						let e = [], a = [];
						for (let r = 0; r !== i[t].morphTargets.length; ++r) {
							let r = i[t];
							e.push(r.time), a.push(+(r.morphTarget === n));
						}
						r.push(new lo(".morphTargetInfluence[" + n + "]", e, a));
					}
					s = e.length * a;
				} else {
					let a = ".bones[" + t[e].name + "]";
					n(mo, a + ".position", i, "pos", r), n(fo, a + ".quaternion", i, "rot", r), n(mo, a + ".scale", i, "scl", r);
				}
			}
		}
		return r.length === 0 ? null : new this(i, s, r, o);
	}
	resetDuration() {
		let e = this.tracks, t = 0;
		for (let n = 0, r = e.length; n !== r; ++n) {
			let e = this.tracks[n];
			t = Math.max(t, e.times[e.times.length - 1]);
		}
		return this.duration = t, this;
	}
	trim() {
		for (let e = 0; e < this.tracks.length; e++) this.tracks[e].trim(0, this.duration);
		return this;
	}
	validate() {
		let e = !0;
		for (let t = 0; t < this.tracks.length; t++) e &&= this.tracks[t].validate();
		return e;
	}
	optimize() {
		for (let e = 0; e < this.tracks.length; e++) this.tracks[e].optimize();
		return this;
	}
	clone() {
		let e = [];
		for (let t = 0; t < this.tracks.length; t++) e.push(this.tracks[t].clone());
		let t = new this.constructor(this.name, this.duration, e, this.blendMode);
		return t.userData = JSON.parse(JSON.stringify(this.userData)), t;
	}
	toJSON() {
		return this.constructor.toJSON(this);
	}
};
function go(e) {
	switch (e.toLowerCase()) {
		case "scalar":
		case "double":
		case "float":
		case "number":
		case "integer": return lo;
		case "vector":
		case "vector2":
		case "vector3":
		case "vector4": return mo;
		case "color": return co;
		case "quaternion": return fo;
		case "bool":
		case "boolean": return so;
		case "string": return po;
	}
	throw Error("THREE.KeyframeTrack: Unsupported typeName: " + e);
}
function _o(e) {
	if (e.type === void 0) throw Error("THREE.KeyframeTrack: track type undefined, can not parse");
	let t = go(e.type);
	if (e.times === void 0) {
		let t = [], n = [];
		to(e.keys, t, n, "value"), e.times = t, e.values = n;
	}
	return t.parse === void 0 ? new t(e.name, e.times, e.values, e.interpolation) : t.parse(e);
}
var vo = {
	enabled: !1,
	files: {},
	add: function(e, t) {
		this.enabled !== !1 && (this.files[e] = t);
	},
	get: function(e) {
		if (this.enabled !== !1) return this.files[e];
	},
	remove: function(e) {
		delete this.files[e];
	},
	clear: function() {
		this.files = {};
	}
}, yo = /*@__PURE__*/ new class {
	constructor(e, t, n) {
		let r = this, i = !1, a = 0, o = 0, s, c = [];
		this.onStart = void 0, this.onLoad = e, this.onProgress = t, this.onError = n, this.abortController = new AbortController(), this.itemStart = function(e) {
			o++, i === !1 && r.onStart !== void 0 && r.onStart(e, a, o), i = !0;
		}, this.itemEnd = function(e) {
			a++, r.onProgress !== void 0 && r.onProgress(e, a, o), a === o && (i = !1, r.onLoad !== void 0 && r.onLoad());
		}, this.itemError = function(e) {
			r.onError !== void 0 && r.onError(e);
		}, this.resolveURL = function(e) {
			return s ? s(e) : e;
		}, this.setURLModifier = function(e) {
			return s = e, this;
		}, this.addHandler = function(e, t) {
			return c.push(e, t), this;
		}, this.removeHandler = function(e) {
			let t = c.indexOf(e);
			return t !== -1 && c.splice(t, 2), this;
		}, this.getHandler = function(e) {
			for (let t = 0, n = c.length; t < n; t += 2) {
				let n = c[t], r = c[t + 1];
				if (n.global && (n.lastIndex = 0), n.test(e)) return r;
			}
			return null;
		}, this.abort = function() {
			return this.abortController.abort(), this.abortController = new AbortController(), this;
		};
	}
}(), bo = class {
	constructor(e) {
		this.manager = e === void 0 ? yo : e, this.crossOrigin = "anonymous", this.withCredentials = !1, this.path = "", this.resourcePath = "", this.requestHeader = {};
	}
	load() {}
	loadAsync(e, t) {
		let n = this;
		return new Promise(function(r, i) {
			n.load(e, r, t, i);
		});
	}
	parse() {}
	setCrossOrigin(e) {
		return this.crossOrigin = e, this;
	}
	setWithCredentials(e) {
		return this.withCredentials = e, this;
	}
	setPath(e) {
		return this.path = e, this;
	}
	setResourcePath(e) {
		return this.resourcePath = e, this;
	}
	setRequestHeader(e) {
		return this.requestHeader = e, this;
	}
	abort() {
		return this;
	}
};
bo.DEFAULT_MATERIAL_NAME = "__DEFAULT";
var xo = {}, So = class extends Error {
	constructor(e, t) {
		super(e), this.response = t;
	}
}, Co = class extends bo {
	constructor(e) {
		super(e), this.mimeType = "", this.responseType = "", this._abortController = new AbortController();
	}
	load(e, t, n, r) {
		e === void 0 && (e = ""), this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
		let i = vo.get(`file:${e}`);
		if (i !== void 0) return this.manager.itemStart(e), setTimeout(() => {
			t && t(i), this.manager.itemEnd(e);
		}, 0), i;
		if (xo[e] !== void 0) {
			xo[e].push({
				onLoad: t,
				onProgress: n,
				onError: r
			});
			return;
		}
		xo[e] = [], xo[e].push({
			onLoad: t,
			onProgress: n,
			onError: r
		});
		let a = new Request(e, {
			headers: new Headers(this.requestHeader),
			credentials: this.withCredentials ? "include" : "same-origin",
			signal: typeof AbortSignal.any == "function" ? AbortSignal.any([this._abortController.signal, this.manager.abortController.signal]) : this._abortController.signal
		}), o = this.mimeType, s = this.responseType;
		fetch(a).then((t) => {
			if (t.status === 200 || t.status === 0) {
				if (t.status === 0 && console.warn("THREE.FileLoader: HTTP Status 0 received."), typeof ReadableStream > "u" || t.body === void 0 || t.body.getReader === void 0) return t;
				let n = xo[e], r = t.body.getReader(), i = t.headers.get("X-File-Size") || t.headers.get("Content-Length"), a = i ? parseInt(i) : 0, o = a !== 0, s = 0, c = new ReadableStream({ start(e) {
					t();
					function t() {
						r.read().then(({ done: r, value: i }) => {
							if (r) e.close();
							else {
								s += i.byteLength;
								let r = new ProgressEvent("progress", {
									lengthComputable: o,
									loaded: s,
									total: a
								});
								for (let e = 0, t = n.length; e < t; e++) {
									let t = n[e];
									t.onProgress && t.onProgress(r);
								}
								e.enqueue(i), t();
							}
						}, (t) => {
							e.error(t);
						});
					}
				} });
				return new Response(c);
			}
			throw new So(`fetch for "${t.url}" responded with ${t.status}: ${t.statusText}`, t);
		}).then((e) => {
			switch (s) {
				case "arraybuffer": return e.arrayBuffer();
				case "blob": return e.blob();
				case "document": return e.text().then((e) => new DOMParser().parseFromString(e, o));
				case "json": return e.json();
				default:
					if (o === "") return e.text();
					{
						let t = /charset="?([^;"\s]*)"?/i.exec(o), n = t && t[1] ? t[1].toLowerCase() : void 0, r = new TextDecoder(n);
						return e.arrayBuffer().then((e) => r.decode(e));
					}
			}
		}).then((t) => {
			vo.add(`file:${e}`, t);
			let n = xo[e];
			delete xo[e];
			for (let e = 0, r = n.length; e < r; e++) {
				let r = n[e];
				r.onLoad && r.onLoad(t);
			}
		}).catch((t) => {
			let n = xo[e];
			if (n === void 0) throw this.manager.itemError(e), t;
			delete xo[e];
			for (let e = 0, r = n.length; e < r; e++) {
				let r = n[e];
				r.onError && r.onError(t);
			}
			this.manager.itemError(e);
		}).finally(() => {
			this.manager.itemEnd(e);
		}), this.manager.itemStart(e);
	}
	setResponseType(e) {
		return this.responseType = e, this;
	}
	setMimeType(e) {
		return this.mimeType = e, this;
	}
	abort() {
		return this._abortController.abort(), this._abortController = new AbortController(), this;
	}
}, wo = /* @__PURE__ */ new WeakMap(), To = class extends bo {
	constructor(e) {
		super(e);
	}
	load(e, t, n, r) {
		this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
		let i = this, a = vo.get(`image:${e}`);
		if (a !== void 0) {
			if (a.complete === !0) i.manager.itemStart(e), setTimeout(function() {
				t && t(a), i.manager.itemEnd(e);
			}, 0);
			else {
				let e = wo.get(a);
				e === void 0 && (e = [], wo.set(a, e)), e.push({
					onLoad: t,
					onError: r
				});
			}
			return a;
		}
		let o = Se("img");
		function s() {
			l(), t && t(this);
			let n = wo.get(this) || [];
			for (let e = 0; e < n.length; e++) {
				let t = n[e];
				t.onLoad && t.onLoad(this);
			}
			wo.delete(this), i.manager.itemEnd(e);
		}
		function c(t) {
			l(), r && r(t), vo.remove(`image:${e}`);
			let n = wo.get(this) || [];
			for (let e = 0; e < n.length; e++) {
				let r = n[e];
				r.onError && r.onError(t);
			}
			wo.delete(this), i.manager.itemError(e), i.manager.itemEnd(e);
		}
		function l() {
			o.removeEventListener("load", s, !1), o.removeEventListener("error", c, !1);
		}
		return o.addEventListener("load", s, !1), o.addEventListener("error", c, !1), e.slice(0, 5) !== "data:" && this.crossOrigin !== void 0 && (o.crossOrigin = this.crossOrigin), vo.add(`image:${e}`, o), i.manager.itemStart(e), o.src = e, o;
	}
}, Eo = class extends bo {
	constructor(e) {
		super(e);
	}
	load(e, n, r, i) {
		let a = this, s = new jr(), l = new Co(this.manager);
		return l.setResponseType("arraybuffer"), l.setRequestHeader(this.requestHeader), l.setPath(this.path), l.setWithCredentials(a.withCredentials), l.load(e, function(e) {
			let r;
			try {
				r = a.parse(e);
			} catch (e) {
				if (i !== void 0) i(e);
				else {
					console.error(e);
					return;
				}
			}
			r.image === void 0 ? r.data !== void 0 && (s.image.width = r.width, s.image.height = r.height, s.image.data = r.data) : s.image = r.image, s.wrapS = r.wrapS === void 0 ? t : r.wrapS, s.wrapT = r.wrapT === void 0 ? t : r.wrapT, s.magFilter = r.magFilter === void 0 ? o : r.magFilter, s.minFilter = r.minFilter === void 0 ? o : r.minFilter, s.anisotropy = r.anisotropy === void 0 ? 1 : r.anisotropy, r.colorSpace !== void 0 && (s.colorSpace = r.colorSpace), r.flipY !== void 0 && (s.flipY = r.flipY), r.format !== void 0 && (s.format = r.format), r.type !== void 0 && (s.type = r.type), r.mipmaps !== void 0 && (s.mipmaps = r.mipmaps, s.minFilter = c), r.mipmapCount === 1 && (s.minFilter = o), r.generateMipmaps !== void 0 && (s.generateMipmaps = r.generateMipmaps), s.needsUpdate = !0, n && n(s, r);
		}, r, i), s;
	}
}, Do = class extends bo {
	constructor(e) {
		super(e);
	}
	load(e, t, n, r) {
		let i = new q(), a = new To(this.manager);
		return a.setCrossOrigin(this.crossOrigin), a.setPath(this.path), a.load(e, function(e) {
			i.image = e, i.needsUpdate = !0, t !== void 0 && t(i);
		}, n, r), i;
	}
}, Oo = class extends Ut {
	constructor(e, t = 1) {
		super(), this.isLight = !0, this.type = "Light", this.color = new Y(e), this.intensity = t;
	}
	dispose() {}
	copy(e, t) {
		return super.copy(e, t), this.color.copy(e.color), this.intensity = e.intensity, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.color = this.color.getHex(), t.object.intensity = this.intensity, this.groundColor !== void 0 && (t.object.groundColor = this.groundColor.getHex()), this.distance !== void 0 && (t.object.distance = this.distance), this.angle !== void 0 && (t.object.angle = this.angle), this.decay !== void 0 && (t.object.decay = this.decay), this.penumbra !== void 0 && (t.object.penumbra = this.penumbra), this.shadow !== void 0 && (t.object.shadow = this.shadow.toJSON()), this.target !== void 0 && (t.object.target = this.target.uuid), t;
	}
}, ko = class extends Oo {
	constructor(e, t, n) {
		super(e, n), this.isHemisphereLight = !0, this.type = "HemisphereLight", this.position.copy(Ut.DEFAULT_UP), this.updateMatrix(), this.groundColor = new Y(t);
	}
	copy(e, t) {
		return super.copy(e, t), this.groundColor.copy(e.groundColor), this;
	}
}, Ao = /*@__PURE__*/ new J(), jo = /*@__PURE__*/ new W(), Mo = /*@__PURE__*/ new W(), No = class {
	constructor(e) {
		this.camera = e, this.intensity = 1, this.bias = 0, this.normalBias = 0, this.radius = 1, this.blurSamples = 8, this.mapSize = new H(512, 512), this.mapType = l, this.map = null, this.mapPass = null, this.matrix = new J(), this.autoUpdate = !0, this.needsUpdate = !1, this._frustum = new Zr(), this._frameExtents = new H(1, 1), this._viewportCount = 1, this._viewports = [new ze(0, 0, 1, 1)];
	}
	getViewportCount() {
		return this._viewportCount;
	}
	getFrustum() {
		return this._frustum;
	}
	updateMatrices(e) {
		let t = this.camera, n = this.matrix;
		jo.setFromMatrixPosition(e.matrixWorld), t.position.copy(jo), Mo.setFromMatrixPosition(e.target.matrixWorld), t.lookAt(Mo), t.updateMatrixWorld(), Ao.multiplyMatrices(t.projectionMatrix, t.matrixWorldInverse), this._frustum.setFromProjectionMatrix(Ao, t.coordinateSystem, t.reversedDepth), t.reversedDepth ? n.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, 1, 0, 0, 0, 0, 1) : n.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1), n.multiply(Ao);
	}
	getViewport(e) {
		return this._viewports[e];
	}
	getFrameExtents() {
		return this._frameExtents;
	}
	dispose() {
		this.map && this.map.dispose(), this.mapPass && this.mapPass.dispose();
	}
	copy(e) {
		return this.camera = e.camera.clone(), this.intensity = e.intensity, this.bias = e.bias, this.radius = e.radius, this.autoUpdate = e.autoUpdate, this.needsUpdate = e.needsUpdate, this.normalBias = e.normalBias, this.blurSamples = e.blurSamples, this.mapSize.copy(e.mapSize), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		let e = {};
		return this.intensity !== 1 && (e.intensity = this.intensity), this.bias !== 0 && (e.bias = this.bias), this.normalBias !== 0 && (e.normalBias = this.normalBias), this.radius !== 1 && (e.radius = this.radius), (this.mapSize.x !== 512 || this.mapSize.y !== 512) && (e.mapSize = this.mapSize.toArray()), e.camera = this.camera.toJSON(!1).object, delete e.camera.matrix, e;
	}
}, Po = class extends No {
	constructor() {
		super(new or(50, 1, .5, 500)), this.isSpotLightShadow = !0, this.focus = 1, this.aspect = 1;
	}
	updateMatrices(e) {
		let t = this.camera, n = ee * 2 * e.angle * this.focus, r = this.mapSize.width / this.mapSize.height * this.aspect, i = e.distance || t.far;
		(n !== t.fov || r !== t.aspect || i !== t.far) && (t.fov = n, t.aspect = r, t.far = i, t.updateProjectionMatrix()), super.updateMatrices(e);
	}
	copy(e) {
		return super.copy(e), this.focus = e.focus, this;
	}
}, Fo = class extends Oo {
	constructor(e, t, n = 0, r = Math.PI / 3, i = 0, a = 2) {
		super(e, t), this.isSpotLight = !0, this.type = "SpotLight", this.position.copy(Ut.DEFAULT_UP), this.updateMatrix(), this.target = new Ut(), this.distance = n, this.angle = r, this.penumbra = i, this.decay = a, this.map = null, this.shadow = new Po();
	}
	get power() {
		return this.intensity * Math.PI;
	}
	set power(e) {
		this.intensity = e / Math.PI;
	}
	dispose() {
		this.shadow.dispose();
	}
	copy(e, t) {
		return super.copy(e, t), this.distance = e.distance, this.angle = e.angle, this.penumbra = e.penumbra, this.decay = e.decay, this.target = e.target.clone(), this.shadow = e.shadow.clone(), this;
	}
}, Io = /*@__PURE__*/ new J(), Lo = /*@__PURE__*/ new W(), Ro = /*@__PURE__*/ new W(), zo = class extends No {
	constructor() {
		super(new or(90, 1, .5, 500)), this.isPointLightShadow = !0, this._frameExtents = new H(4, 2), this._viewportCount = 6, this._viewports = [
			new ze(2, 1, 1, 1),
			new ze(0, 1, 1, 1),
			new ze(3, 1, 1, 1),
			new ze(1, 1, 1, 1),
			new ze(3, 0, 1, 1),
			new ze(1, 0, 1, 1)
		], this._cubeDirections = [
			new W(1, 0, 0),
			new W(-1, 0, 0),
			new W(0, 0, 1),
			new W(0, 0, -1),
			new W(0, 1, 0),
			new W(0, -1, 0)
		], this._cubeUps = [
			new W(0, 1, 0),
			new W(0, 1, 0),
			new W(0, 1, 0),
			new W(0, 1, 0),
			new W(0, 0, 1),
			new W(0, 0, -1)
		];
	}
	updateMatrices(e, t = 0) {
		let n = this.camera, r = this.matrix, i = e.distance || n.far;
		i !== n.far && (n.far = i, n.updateProjectionMatrix()), Lo.setFromMatrixPosition(e.matrixWorld), n.position.copy(Lo), Ro.copy(n.position), Ro.add(this._cubeDirections[t]), n.up.copy(this._cubeUps[t]), n.lookAt(Ro), n.updateMatrixWorld(), r.makeTranslation(-Lo.x, -Lo.y, -Lo.z), Io.multiplyMatrices(n.projectionMatrix, n.matrixWorldInverse), this._frustum.setFromProjectionMatrix(Io, n.coordinateSystem, n.reversedDepth);
	}
}, Bo = class extends Oo {
	constructor(e, t, n = 0, r = 2) {
		super(e, t), this.isPointLight = !0, this.type = "PointLight", this.distance = n, this.decay = r, this.shadow = new zo();
	}
	get power() {
		return this.intensity * 4 * Math.PI;
	}
	set power(e) {
		this.intensity = e / (4 * Math.PI);
	}
	dispose() {
		this.shadow.dispose();
	}
	copy(e, t) {
		return super.copy(e, t), this.distance = e.distance, this.decay = e.decay, this.shadow = e.shadow.clone(), this;
	}
}, Vo = class extends nr {
	constructor(e = -1, t = 1, n = 1, r = -1, i = .1, a = 2e3) {
		super(), this.isOrthographicCamera = !0, this.type = "OrthographicCamera", this.zoom = 1, this.view = null, this.left = e, this.right = t, this.top = n, this.bottom = r, this.near = i, this.far = a, this.updateProjectionMatrix();
	}
	copy(e, t) {
		return super.copy(e, t), this.left = e.left, this.right = e.right, this.top = e.top, this.bottom = e.bottom, this.near = e.near, this.far = e.far, this.zoom = e.zoom, this.view = e.view === null ? null : Object.assign({}, e.view), this;
	}
	setViewOffset(e, t, n, r, i, a) {
		this.view === null && (this.view = {
			enabled: !0,
			fullWidth: 1,
			fullHeight: 1,
			offsetX: 0,
			offsetY: 0,
			width: 1,
			height: 1
		}), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = r, this.view.width = i, this.view.height = a, this.updateProjectionMatrix();
	}
	clearViewOffset() {
		this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = (this.right - this.left) / (2 * this.zoom), t = (this.top - this.bottom) / (2 * this.zoom), n = (this.right + this.left) / 2, r = (this.top + this.bottom) / 2, i = n - e, a = n + e, o = r + t, s = r - t;
		if (this.view !== null && this.view.enabled) {
			let e = (this.right - this.left) / this.view.fullWidth / this.zoom, t = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
			i += e * this.view.offsetX, a = i + e * this.view.width, o -= t * this.view.offsetY, s = o - t * this.view.height;
		}
		this.projectionMatrix.makeOrthographic(i, a, o, s, this.near, this.far, this.coordinateSystem, this.reversedDepth), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.zoom = this.zoom, t.object.left = this.left, t.object.right = this.right, t.object.top = this.top, t.object.bottom = this.bottom, t.object.near = this.near, t.object.far = this.far, this.view !== null && (t.object.view = Object.assign({}, this.view)), t;
	}
}, Ho = class extends No {
	constructor() {
		super(new Vo(-5, 5, 5, -5, .5, 500)), this.isDirectionalLightShadow = !0;
	}
}, Uo = class extends Oo {
	constructor(e, t) {
		super(e, t), this.isDirectionalLight = !0, this.type = "DirectionalLight", this.position.copy(Ut.DEFAULT_UP), this.updateMatrix(), this.target = new Ut(), this.shadow = new Ho();
	}
	dispose() {
		this.shadow.dispose();
	}
	copy(e) {
		return super.copy(e), this.target = e.target.clone(), this.shadow = e.shadow.clone(), this;
	}
}, Wo = class {
	static extractUrlBase(e) {
		let t = e.lastIndexOf("/");
		return t === -1 ? "./" : e.slice(0, t + 1);
	}
	static resolveURL(e, t) {
		return typeof e != "string" || e === "" ? "" : (/^https?:\/\//i.test(t) && /^\//.test(e) && (t = t.replace(/(^https?:\/\/[^\/]+).*/i, "$1")), /^(https?:)?\/\//i.test(e) || /^data:.*,.*$/i.test(e) || /^blob:.*$/i.test(e) ? e : t + e);
	}
}, Go = /* @__PURE__ */ new WeakMap(), Ko = class extends bo {
	constructor(e) {
		super(e), this.isImageBitmapLoader = !0, typeof createImageBitmap > "u" && console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."), typeof fetch > "u" && console.warn("THREE.ImageBitmapLoader: fetch() not supported."), this.options = { premultiplyAlpha: "none" }, this._abortController = new AbortController();
	}
	setOptions(e) {
		return this.options = e, this;
	}
	load(e, t, n, r) {
		e === void 0 && (e = ""), this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
		let i = this, a = vo.get(`image-bitmap:${e}`);
		if (a !== void 0) {
			if (i.manager.itemStart(e), a.then) {
				a.then((n) => {
					if (Go.has(a) === !0) r && r(Go.get(a)), i.manager.itemError(e), i.manager.itemEnd(e);
					else return t && t(n), i.manager.itemEnd(e), n;
				});
				return;
			}
			return setTimeout(function() {
				t && t(a), i.manager.itemEnd(e);
			}, 0), a;
		}
		let o = {};
		o.credentials = this.crossOrigin === "anonymous" ? "same-origin" : "include", o.headers = this.requestHeader, o.signal = typeof AbortSignal.any == "function" ? AbortSignal.any([this._abortController.signal, this.manager.abortController.signal]) : this._abortController.signal;
		let s = fetch(e, o).then(function(e) {
			return e.blob();
		}).then(function(e) {
			return createImageBitmap(e, Object.assign(i.options, { colorSpaceConversion: "none" }));
		}).then(function(n) {
			return vo.add(`image-bitmap:${e}`, n), t && t(n), i.manager.itemEnd(e), n;
		}).catch(function(t) {
			r && r(t), Go.set(s, t), vo.remove(`image-bitmap:${e}`), i.manager.itemError(e), i.manager.itemEnd(e);
		});
		vo.add(`image-bitmap:${e}`, s), i.manager.itemStart(e);
	}
	abort() {
		return this._abortController.abort(), this._abortController = new AbortController(), this;
	}
}, qo = class extends or {
	constructor(e = []) {
		super(), this.isArrayCamera = !0, this.isMultiViewCamera = !1, this.cameras = e;
	}
}, Jo = class {
	constructor(e = !0) {
		this.autoStart = e, this.startTime = 0, this.oldTime = 0, this.elapsedTime = 0, this.running = !1;
	}
	start() {
		this.startTime = performance.now(), this.oldTime = this.startTime, this.elapsedTime = 0, this.running = !0;
	}
	stop() {
		this.getElapsedTime(), this.running = !1, this.autoStart = !1;
	}
	getElapsedTime() {
		return this.getDelta(), this.elapsedTime;
	}
	getDelta() {
		let e = 0;
		if (this.autoStart && !this.running) return this.start(), 0;
		if (this.running) {
			let t = performance.now();
			e = (t - this.oldTime) / 1e3, this.oldTime = t, this.elapsedTime += e;
		}
		return e;
	}
}, Yo = class {
	constructor(e, t, n) {
		this.binding = e, this.valueSize = n;
		let r, i, a;
		switch (t) {
			case "quaternion":
				r = this._slerp, i = this._slerpAdditive, a = this._setAdditiveIdentityQuaternion, this.buffer = new Float64Array(n * 6), this._workIndex = 5;
				break;
			case "string":
			case "bool":
				r = this._select, i = this._select, a = this._setAdditiveIdentityOther, this.buffer = Array(n * 5);
				break;
			default: r = this._lerp, i = this._lerpAdditive, a = this._setAdditiveIdentityNumeric, this.buffer = new Float64Array(n * 5);
		}
		this._mixBufferRegion = r, this._mixBufferRegionAdditive = i, this._setIdentity = a, this._origIndex = 3, this._addIndex = 4, this.cumulativeWeight = 0, this.cumulativeWeightAdditive = 0, this.useCount = 0, this.referenceCount = 0;
	}
	accumulate(e, t) {
		let n = this.buffer, r = this.valueSize, i = e * r + r, a = this.cumulativeWeight;
		if (a === 0) {
			for (let e = 0; e !== r; ++e) n[i + e] = n[e];
			a = t;
		} else {
			a += t;
			let e = t / a;
			this._mixBufferRegion(n, i, 0, e, r);
		}
		this.cumulativeWeight = a;
	}
	accumulateAdditive(e) {
		let t = this.buffer, n = this.valueSize, r = n * this._addIndex;
		this.cumulativeWeightAdditive === 0 && this._setIdentity(), this._mixBufferRegionAdditive(t, r, 0, e, n), this.cumulativeWeightAdditive += e;
	}
	apply(e) {
		let t = this.valueSize, n = this.buffer, r = e * t + t, i = this.cumulativeWeight, a = this.cumulativeWeightAdditive, o = this.binding;
		if (this.cumulativeWeight = 0, this.cumulativeWeightAdditive = 0, i < 1) {
			let e = t * this._origIndex;
			this._mixBufferRegion(n, r, e, 1 - i, t);
		}
		a > 0 && this._mixBufferRegionAdditive(n, r, this._addIndex * t, 1, t);
		for (let e = t, i = t + t; e !== i; ++e) if (n[e] !== n[e + t]) {
			o.setValue(n, r);
			break;
		}
	}
	saveOriginalState() {
		let e = this.binding, t = this.buffer, n = this.valueSize, r = n * this._origIndex;
		e.getValue(t, r);
		for (let e = n, i = r; e !== i; ++e) t[e] = t[r + e % n];
		this._setIdentity(), this.cumulativeWeight = 0, this.cumulativeWeightAdditive = 0;
	}
	restoreOriginalState() {
		let e = this.valueSize * 3;
		this.binding.setValue(this.buffer, e);
	}
	_setAdditiveIdentityNumeric() {
		let e = this._addIndex * this.valueSize, t = e + this.valueSize;
		for (let n = e; n < t; n++) this.buffer[n] = 0;
	}
	_setAdditiveIdentityQuaternion() {
		this._setAdditiveIdentityNumeric(), this.buffer[this._addIndex * this.valueSize + 3] = 1;
	}
	_setAdditiveIdentityOther() {
		let e = this._origIndex * this.valueSize, t = this._addIndex * this.valueSize;
		for (let n = 0; n < this.valueSize; n++) this.buffer[t + n] = this.buffer[e + n];
	}
	_select(e, t, n, r, i) {
		if (r >= .5) for (let r = 0; r !== i; ++r) e[t + r] = e[n + r];
	}
	_slerp(e, t, n, r) {
		U.slerpFlat(e, t, e, t, e, n, r);
	}
	_slerpAdditive(e, t, n, r, i) {
		let a = this._workIndex * i;
		U.multiplyQuaternionsFlat(e, a, e, t, e, n), U.slerpFlat(e, t, e, t, e, a, r);
	}
	_lerp(e, t, n, r, i) {
		let a = 1 - r;
		for (let o = 0; o !== i; ++o) {
			let i = t + o;
			e[i] = e[i] * a + e[n + o] * r;
		}
	}
	_lerpAdditive(e, t, n, r, i) {
		for (let a = 0; a !== i; ++a) {
			let i = t + a;
			e[i] = e[i] + e[n + a] * r;
		}
	}
}, Xo = "\\[\\]\\.:\\/", Zo = /* @__PURE__ */ RegExp("[\\[\\]\\.:\\/]", "g"), Qo = "[^\\[\\]\\.:\\/]", $o = "[^" + Xo.replace("\\.", "") + "]", es = /*@__PURE__*/ "((?:WC+[\\/:])*)".replace("WC", Qo), ts = /*@__PURE__*/ "(WCOD+)?".replace("WCOD", $o), ns = /*@__PURE__*/ "(?:\\.(WC+)(?:\\[(.+)\\])?)?".replace("WC", Qo), rs = /*@__PURE__*/ "\\.(WC+)(?:\\[(.+)\\])?".replace("WC", Qo), is = RegExp("^" + es + ts + ns + rs + "$"), as = [
	"material",
	"materials",
	"bones",
	"map"
], os = class {
	constructor(e, t, n) {
		let r = n || ss.parseTrackName(t);
		this._targetGroup = e, this._bindings = e.subscribe_(t, r);
	}
	getValue(e, t) {
		this.bind();
		let n = this._targetGroup.nCachedObjects_, r = this._bindings[n];
		r !== void 0 && r.getValue(e, t);
	}
	setValue(e, t) {
		let n = this._bindings;
		for (let r = this._targetGroup.nCachedObjects_, i = n.length; r !== i; ++r) n[r].setValue(e, t);
	}
	bind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].bind();
	}
	unbind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].unbind();
	}
}, ss = class e {
	constructor(t, n, r) {
		this.path = n, this.parsedPath = r || e.parseTrackName(n), this.node = e.findNode(t, this.parsedPath.nodeName), this.rootNode = t, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
	static create(t, n, r) {
		return t && t.isAnimationObjectGroup ? new e.Composite(t, n, r) : new e(t, n, r);
	}
	static sanitizeNodeName(e) {
		return e.replace(/\s/g, "_").replace(Zo, "");
	}
	static parseTrackName(e) {
		let t = is.exec(e);
		if (t === null) throw Error("PropertyBinding: Cannot parse trackName: " + e);
		let n = {
			nodeName: t[2],
			objectName: t[3],
			objectIndex: t[4],
			propertyName: t[5],
			propertyIndex: t[6]
		}, r = n.nodeName && n.nodeName.lastIndexOf(".");
		if (r !== void 0 && r !== -1) {
			let e = n.nodeName.substring(r + 1);
			as.indexOf(e) !== -1 && (n.nodeName = n.nodeName.substring(0, r), n.objectName = e);
		}
		if (n.propertyName === null || n.propertyName.length === 0) throw Error("PropertyBinding: can not parse propertyName from trackName: " + e);
		return n;
	}
	static findNode(e, t) {
		if (t === void 0 || t === "" || t === "." || t === -1 || t === e.name || t === e.uuid) return e;
		if (e.skeleton) {
			let n = e.skeleton.getBoneByName(t);
			if (n !== void 0) return n;
		}
		if (e.children) {
			let n = function(e) {
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (i.name === t || i.uuid === t) return i;
					let a = n(i.children);
					if (a) return a;
				}
				return null;
			}, r = n(e.children);
			if (r) return r;
		}
		return null;
	}
	_getValue_unavailable() {}
	_setValue_unavailable() {}
	_getValue_direct(e, t) {
		e[t] = this.targetObject[this.propertyName];
	}
	_getValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) e[t++] = n[r];
	}
	_getValue_arrayElement(e, t) {
		e[t] = this.resolvedProperty[this.propertyIndex];
	}
	_getValue_toArray(e, t) {
		this.resolvedProperty.toArray(e, t);
	}
	_setValue_direct(e, t) {
		this.targetObject[this.propertyName] = e[t];
	}
	_setValue_direct_setNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_direct_setMatrixWorldNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
	}
	_setValue_array_setNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.needsUpdate = !0;
	}
	_setValue_array_setMatrixWorldNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_arrayElement(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t];
	}
	_setValue_arrayElement_setNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_arrayElement_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_fromArray(e, t) {
		this.resolvedProperty.fromArray(e, t);
	}
	_setValue_fromArray_setNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.needsUpdate = !0;
	}
	_setValue_fromArray_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_getValue_unbound(e, t) {
		this.bind(), this.getValue(e, t);
	}
	_setValue_unbound(e, t) {
		this.bind(), this.setValue(e, t);
	}
	bind() {
		let t = this.node, n = this.parsedPath, r = n.objectName, i = n.propertyName, a = n.propertyIndex;
		if (t || (t = e.findNode(this.rootNode, n.nodeName), this.node = t), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !t) {
			console.warn("THREE.PropertyBinding: No target node found for track: " + this.path + ".");
			return;
		}
		if (r) {
			let e = n.objectIndex;
			switch (r) {
				case "materials":
					if (!t.material) {
						console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.materials) {
						console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
						return;
					}
					t = t.material.materials;
					break;
				case "bones":
					if (!t.skeleton) {
						console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
						return;
					}
					t = t.skeleton.bones;
					for (let n = 0; n < t.length; n++) if (t[n].name === e) {
						e = n;
						break;
					}
					break;
				case "map":
					if ("map" in t) {
						t = t.map;
						break;
					}
					if (!t.material) {
						console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.map) {
						console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
						return;
					}
					t = t.material.map;
					break;
				default:
					if (t[r] === void 0) {
						console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.", this);
						return;
					}
					t = t[r];
			}
			if (e !== void 0) {
				if (t[e] === void 0) {
					console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, t);
					return;
				}
				t = t[e];
			}
		}
		let o = t[i];
		if (o === void 0) {
			let e = n.nodeName;
			console.error("THREE.PropertyBinding: Trying to update property for track: " + e + "." + i + " but it wasn't found.", t);
			return;
		}
		let s = this.Versioning.None;
		this.targetObject = t, t.isMaterial === !0 ? s = this.Versioning.NeedsUpdate : t.isObject3D === !0 && (s = this.Versioning.MatrixWorldNeedsUpdate);
		let c = this.BindingType.Direct;
		if (a !== void 0) {
			if (i === "morphTargetInfluences") {
				if (!t.geometry) {
					console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
					return;
				}
				if (!t.geometry.morphAttributes) {
					console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
					return;
				}
				t.morphTargetDictionary[a] !== void 0 && (a = t.morphTargetDictionary[a]);
			}
			c = this.BindingType.ArrayElement, this.resolvedProperty = o, this.propertyIndex = a;
		} else o.fromArray !== void 0 && o.toArray !== void 0 ? (c = this.BindingType.HasFromToArray, this.resolvedProperty = o) : Array.isArray(o) ? (c = this.BindingType.EntireArray, this.resolvedProperty = o) : this.propertyName = i;
		this.getValue = this.GetterByBindingType[c], this.setValue = this.SetterByBindingTypeAndVersioning[c][s];
	}
	unbind() {
		this.node = null, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
};
ss.Composite = os, ss.prototype.BindingType = {
	Direct: 0,
	EntireArray: 1,
	ArrayElement: 2,
	HasFromToArray: 3
}, ss.prototype.Versioning = {
	None: 0,
	NeedsUpdate: 1,
	MatrixWorldNeedsUpdate: 2
}, ss.prototype.GetterByBindingType = [
	ss.prototype._getValue_direct,
	ss.prototype._getValue_array,
	ss.prototype._getValue_arrayElement,
	ss.prototype._getValue_toArray
], ss.prototype.SetterByBindingTypeAndVersioning = [
	[
		ss.prototype._setValue_direct,
		ss.prototype._setValue_direct_setNeedsUpdate,
		ss.prototype._setValue_direct_setMatrixWorldNeedsUpdate
	],
	[
		ss.prototype._setValue_array,
		ss.prototype._setValue_array_setNeedsUpdate,
		ss.prototype._setValue_array_setMatrixWorldNeedsUpdate
	],
	[
		ss.prototype._setValue_arrayElement,
		ss.prototype._setValue_arrayElement_setNeedsUpdate,
		ss.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
	],
	[
		ss.prototype._setValue_fromArray,
		ss.prototype._setValue_fromArray_setNeedsUpdate,
		ss.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
	]
];
var cs = class {
	constructor(e, t, n = null, r = t.blendMode) {
		this._mixer = e, this._clip = t, this._localRoot = n, this.blendMode = r;
		let i = t.tracks, a = i.length, o = Array(a), s = {
			endingStart: x,
			endingEnd: x
		};
		for (let e = 0; e !== a; ++e) {
			let t = i[e].createInterpolant(null);
			o[e] = t, t.settings = s;
		}
		this._interpolantSettings = s, this._interpolants = o, this._propertyBindings = Array(a), this._cacheIndex = null, this._byClipCacheIndex = null, this._timeScaleInterpolant = null, this._weightInterpolant = null, this.loop = 2201, this._loopCount = -1, this._startTime = null, this.time = 0, this.timeScale = 1, this._effectiveTimeScale = 1, this.weight = 1, this._effectiveWeight = 1, this.repetitions = Infinity, this.paused = !1, this.enabled = !0, this.clampWhenFinished = !1, this.zeroSlopeAtStart = !0, this.zeroSlopeAtEnd = !0;
	}
	play() {
		return this._mixer._activateAction(this), this;
	}
	stop() {
		return this._mixer._deactivateAction(this), this.reset();
	}
	reset() {
		return this.paused = !1, this.enabled = !0, this.time = 0, this._loopCount = -1, this._startTime = null, this.stopFading().stopWarping();
	}
	isRunning() {
		return this.enabled && !this.paused && this.timeScale !== 0 && this._startTime === null && this._mixer._isActiveAction(this);
	}
	isScheduled() {
		return this._mixer._isActiveAction(this);
	}
	startAt(e) {
		return this._startTime = e, this;
	}
	setLoop(e, t) {
		return this.loop = e, this.repetitions = t, this;
	}
	setEffectiveWeight(e) {
		return this.weight = e, this._effectiveWeight = this.enabled ? e : 0, this.stopFading();
	}
	getEffectiveWeight() {
		return this._effectiveWeight;
	}
	fadeIn(e) {
		return this._scheduleFading(e, 0, 1);
	}
	fadeOut(e) {
		return this._scheduleFading(e, 1, 0);
	}
	crossFadeFrom(e, t, n = !1) {
		if (e.fadeOut(t), this.fadeIn(t), n === !0) {
			let n = this._clip.duration, r = e._clip.duration, i = r / n, a = n / r;
			e.warp(1, i, t), this.warp(a, 1, t);
		}
		return this;
	}
	crossFadeTo(e, t, n = !1) {
		return e.crossFadeFrom(this, t, n);
	}
	stopFading() {
		let e = this._weightInterpolant;
		return e !== null && (this._weightInterpolant = null, this._mixer._takeBackControlInterpolant(e)), this;
	}
	setEffectiveTimeScale(e) {
		return this.timeScale = e, this._effectiveTimeScale = this.paused ? 0 : e, this.stopWarping();
	}
	getEffectiveTimeScale() {
		return this._effectiveTimeScale;
	}
	setDuration(e) {
		return this.timeScale = this._clip.duration / e, this.stopWarping();
	}
	syncWith(e) {
		return this.time = e.time, this.timeScale = e.timeScale, this.stopWarping();
	}
	halt(e) {
		return this.warp(this._effectiveTimeScale, 0, e);
	}
	warp(e, t, n) {
		let r = this._mixer, i = r.time, a = this.timeScale, o = this._timeScaleInterpolant;
		o === null && (o = r._lendControlInterpolant(), this._timeScaleInterpolant = o);
		let s = o.parameterPositions, c = o.sampleValues;
		return s[0] = i, s[1] = i + n, c[0] = e / a, c[1] = t / a, this;
	}
	stopWarping() {
		let e = this._timeScaleInterpolant;
		return e !== null && (this._timeScaleInterpolant = null, this._mixer._takeBackControlInterpolant(e)), this;
	}
	getMixer() {
		return this._mixer;
	}
	getClip() {
		return this._clip;
	}
	getRoot() {
		return this._localRoot || this._mixer._root;
	}
	_update(e, t, n, r) {
		if (!this.enabled) {
			this._updateWeight(e);
			return;
		}
		let i = this._startTime;
		if (i !== null) {
			let r = (e - i) * n;
			r < 0 || n === 0 ? t = 0 : (this._startTime = null, t = n * r);
		}
		t *= this._updateTimeScale(e);
		let a = this._updateTime(t), o = this._updateWeight(e);
		if (o > 0) {
			let e = this._interpolants, t = this._propertyBindings;
			switch (this.blendMode) {
				case 2501:
					for (let n = 0, r = e.length; n !== r; ++n) e[n].evaluate(a), t[n].accumulateAdditive(o);
					break;
				case w:
				default: for (let n = 0, i = e.length; n !== i; ++n) e[n].evaluate(a), t[n].accumulate(r, o);
			}
		}
	}
	_updateWeight(e) {
		let t = 0;
		if (this.enabled) {
			t = this.weight;
			let n = this._weightInterpolant;
			if (n !== null) {
				let r = n.evaluate(e)[0];
				t *= r, e > n.parameterPositions[1] && (this.stopFading(), r === 0 && (this.enabled = !1));
			}
		}
		return this._effectiveWeight = t, t;
	}
	_updateTimeScale(e) {
		let t = 0;
		if (!this.paused) {
			t = this.timeScale;
			let n = this._timeScaleInterpolant;
			if (n !== null) {
				let r = n.evaluate(e)[0];
				t *= r, e > n.parameterPositions[1] && (this.stopWarping(), t === 0 ? this.paused = !0 : this.timeScale = t);
			}
		}
		return this._effectiveTimeScale = t, t;
	}
	_updateTime(e) {
		let t = this._clip.duration, n = this.loop, r = this.time + e, i = this._loopCount, a = n === 2202;
		if (e === 0) return i === -1 ? r : a && (i & 1) == 1 ? t - r : r;
		if (n === 2200) {
			i === -1 && (this._loopCount = 0, this._setEndings(!0, !0, !1));
			handle_stop: {
				if (r >= t) r = t;
				else if (r < 0) r = 0;
				else {
					this.time = r;
					break handle_stop;
				}
				this.clampWhenFinished ? this.paused = !0 : this.enabled = !1, this.time = r, this._mixer.dispatchEvent({
					type: "finished",
					action: this,
					direction: e < 0 ? -1 : 1
				});
			}
		} else {
			if (i === -1 && (e >= 0 ? (i = 0, this._setEndings(!0, this.repetitions === 0, a)) : this._setEndings(this.repetitions === 0, !0, a)), r >= t || r < 0) {
				let n = Math.floor(r / t);
				r -= t * n, i += Math.abs(n);
				let o = this.repetitions - i;
				if (o <= 0) this.clampWhenFinished ? this.paused = !0 : this.enabled = !1, r = e > 0 ? t : 0, this.time = r, this._mixer.dispatchEvent({
					type: "finished",
					action: this,
					direction: e > 0 ? 1 : -1
				});
				else {
					if (o === 1) {
						let t = e < 0;
						this._setEndings(t, !t, a);
					} else this._setEndings(!1, !1, a);
					this._loopCount = i, this.time = r, this._mixer.dispatchEvent({
						type: "loop",
						action: this,
						loopDelta: n
					});
				}
			} else this.time = r;
			if (a && (i & 1) == 1) return t - r;
		}
		return r;
	}
	_setEndings(e, t, n) {
		let r = this._interpolantSettings;
		n ? (r.endingStart = S, r.endingEnd = S) : (r.endingStart = e ? this.zeroSlopeAtStart ? S : x : C, r.endingEnd = t ? this.zeroSlopeAtEnd ? S : x : C);
	}
	_scheduleFading(e, t, n) {
		let r = this._mixer, i = r.time, a = this._weightInterpolant;
		a === null && (a = r._lendControlInterpolant(), this._weightInterpolant = a);
		let o = a.parameterPositions, s = a.sampleValues;
		return o[0] = i, s[0] = t, o[1] = i + e, s[1] = n, this;
	}
}, ls = /* @__PURE__ */ new Float32Array(1), us = class extends M {
	constructor(e) {
		super(), this._root = e, this._initMemoryManager(), this._accuIndex = 0, this.time = 0, this.timeScale = 1;
	}
	_bindAction(e, t) {
		let n = e._localRoot || this._root, r = e._clip.tracks, i = r.length, a = e._propertyBindings, o = e._interpolants, s = n.uuid, c = this._bindingsByRootAndName, l = c[s];
		l === void 0 && (l = {}, c[s] = l);
		for (let e = 0; e !== i; ++e) {
			let i = r[e], c = i.name, u = l[c];
			if (u !== void 0) ++u.referenceCount, a[e] = u;
			else {
				if (u = a[e], u !== void 0) {
					u._cacheIndex === null && (++u.referenceCount, this._addInactiveBinding(u, s, c));
					continue;
				}
				let r = t && t._propertyBindings[e].binding.parsedPath;
				u = new Yo(ss.create(n, c, r), i.ValueTypeName, i.getValueSize()), ++u.referenceCount, this._addInactiveBinding(u, s, c), a[e] = u;
			}
			o[e].resultBuffer = u.buffer;
		}
	}
	_activateAction(e) {
		if (!this._isActiveAction(e)) {
			if (e._cacheIndex === null) {
				let t = (e._localRoot || this._root).uuid, n = e._clip.uuid, r = this._actionsByClip[n];
				this._bindAction(e, r && r.knownActions[0]), this._addInactiveAction(e, n, t);
			}
			let t = e._propertyBindings;
			for (let e = 0, n = t.length; e !== n; ++e) {
				let n = t[e];
				n.useCount++ === 0 && (this._lendBinding(n), n.saveOriginalState());
			}
			this._lendAction(e);
		}
	}
	_deactivateAction(e) {
		if (this._isActiveAction(e)) {
			let t = e._propertyBindings;
			for (let e = 0, n = t.length; e !== n; ++e) {
				let n = t[e];
				--n.useCount === 0 && (n.restoreOriginalState(), this._takeBackBinding(n));
			}
			this._takeBackAction(e);
		}
	}
	_initMemoryManager() {
		this._actions = [], this._nActiveActions = 0, this._actionsByClip = {}, this._bindings = [], this._nActiveBindings = 0, this._bindingsByRootAndName = {}, this._controlInterpolants = [], this._nActiveControlInterpolants = 0;
		let e = this;
		this.stats = {
			actions: {
				get total() {
					return e._actions.length;
				},
				get inUse() {
					return e._nActiveActions;
				}
			},
			bindings: {
				get total() {
					return e._bindings.length;
				},
				get inUse() {
					return e._nActiveBindings;
				}
			},
			controlInterpolants: {
				get total() {
					return e._controlInterpolants.length;
				},
				get inUse() {
					return e._nActiveControlInterpolants;
				}
			}
		};
	}
	_isActiveAction(e) {
		let t = e._cacheIndex;
		return t !== null && t < this._nActiveActions;
	}
	_addInactiveAction(e, t, n) {
		let r = this._actions, i = this._actionsByClip, a = i[t];
		if (a === void 0) a = {
			knownActions: [e],
			actionByRoot: {}
		}, e._byClipCacheIndex = 0, i[t] = a;
		else {
			let t = a.knownActions;
			e._byClipCacheIndex = t.length, t.push(e);
		}
		e._cacheIndex = r.length, r.push(e), a.actionByRoot[n] = e;
	}
	_removeInactiveAction(e) {
		let t = this._actions, n = t[t.length - 1], r = e._cacheIndex;
		n._cacheIndex = r, t[r] = n, t.pop(), e._cacheIndex = null;
		let i = e._clip.uuid, a = this._actionsByClip, o = a[i], s = o.knownActions, c = s[s.length - 1], l = e._byClipCacheIndex;
		c._byClipCacheIndex = l, s[l] = c, s.pop(), e._byClipCacheIndex = null;
		let u = o.actionByRoot, d = (e._localRoot || this._root).uuid;
		delete u[d], s.length === 0 && delete a[i], this._removeInactiveBindingsForAction(e);
	}
	_removeInactiveBindingsForAction(e) {
		let t = e._propertyBindings;
		for (let e = 0, n = t.length; e !== n; ++e) {
			let n = t[e];
			--n.referenceCount === 0 && this._removeInactiveBinding(n);
		}
	}
	_lendAction(e) {
		let t = this._actions, n = e._cacheIndex, r = this._nActiveActions++, i = t[r];
		e._cacheIndex = r, t[r] = e, i._cacheIndex = n, t[n] = i;
	}
	_takeBackAction(e) {
		let t = this._actions, n = e._cacheIndex, r = --this._nActiveActions, i = t[r];
		e._cacheIndex = r, t[r] = e, i._cacheIndex = n, t[n] = i;
	}
	_addInactiveBinding(e, t, n) {
		let r = this._bindingsByRootAndName, i = this._bindings, a = r[t];
		a === void 0 && (a = {}, r[t] = a), a[n] = e, e._cacheIndex = i.length, i.push(e);
	}
	_removeInactiveBinding(e) {
		let t = this._bindings, n = e.binding, r = n.rootNode.uuid, i = n.path, a = this._bindingsByRootAndName, o = a[r], s = t[t.length - 1], c = e._cacheIndex;
		s._cacheIndex = c, t[c] = s, t.pop(), delete o[i], Object.keys(o).length === 0 && delete a[r];
	}
	_lendBinding(e) {
		let t = this._bindings, n = e._cacheIndex, r = this._nActiveBindings++, i = t[r];
		e._cacheIndex = r, t[r] = e, i._cacheIndex = n, t[n] = i;
	}
	_takeBackBinding(e) {
		let t = this._bindings, n = e._cacheIndex, r = --this._nActiveBindings, i = t[r];
		e._cacheIndex = r, t[r] = e, i._cacheIndex = n, t[n] = i;
	}
	_lendControlInterpolant() {
		let e = this._controlInterpolants, t = this._nActiveControlInterpolants++, n = e[t];
		return n === void 0 && (n = new io(/* @__PURE__ */ new Float32Array(2), /* @__PURE__ */ new Float32Array(2), 1, ls), n.__cacheIndex = t, e[t] = n), n;
	}
	_takeBackControlInterpolant(e) {
		let t = this._controlInterpolants, n = e.__cacheIndex, r = --this._nActiveControlInterpolants, i = t[r];
		e.__cacheIndex = r, t[r] = e, i.__cacheIndex = n, t[n] = i;
	}
	clipAction(e, t, n) {
		let r = t || this._root, i = r.uuid, a = typeof e == "string" ? ho.findByName(r, e) : e, o = a === null ? e : a.uuid, s = this._actionsByClip[o], c = null;
		if (n === void 0 && (n = a === null ? w : a.blendMode), s !== void 0) {
			let e = s.actionByRoot[i];
			if (e !== void 0 && e.blendMode === n) return e;
			c = s.knownActions[0], a === null && (a = c._clip);
		}
		if (a === null) return null;
		let l = new cs(this, a, t, n);
		return this._bindAction(l, c), this._addInactiveAction(l, o, i), l;
	}
	existingAction(e, t) {
		let n = t || this._root, r = n.uuid, i = typeof e == "string" ? ho.findByName(n, e) : e, a = i ? i.uuid : e, o = this._actionsByClip[a];
		return o === void 0 ? null : o.actionByRoot[r] || null;
	}
	stopAllAction() {
		let e = this._actions, t = this._nActiveActions;
		for (let n = t - 1; n >= 0; --n) e[n].stop();
		return this;
	}
	update(e) {
		e *= this.timeScale;
		let t = this._actions, n = this._nActiveActions, r = this.time += e, i = Math.sign(e), a = this._accuIndex ^= 1;
		for (let o = 0; o !== n; ++o) t[o]._update(r, e, i, a);
		let o = this._bindings, s = this._nActiveBindings;
		for (let e = 0; e !== s; ++e) o[e].apply(a);
		return this;
	}
	setTime(e) {
		this.time = 0;
		for (let e = 0; e < this._actions.length; e++) this._actions[e].time = 0;
		return this.update(e);
	}
	getRoot() {
		return this._root;
	}
	uncacheClip(e) {
		let t = this._actions, n = e.uuid, r = this._actionsByClip, i = r[n];
		if (i !== void 0) {
			let e = i.knownActions;
			for (let n = 0, r = e.length; n !== r; ++n) {
				let r = e[n];
				this._deactivateAction(r);
				let i = r._cacheIndex, a = t[t.length - 1];
				r._cacheIndex = null, r._byClipCacheIndex = null, a._cacheIndex = i, t[i] = a, t.pop(), this._removeInactiveBindingsForAction(r);
			}
			delete r[n];
		}
	}
	uncacheRoot(e) {
		let t = e.uuid, n = this._actionsByClip;
		for (let e in n) {
			let r = n[e].actionByRoot[t];
			r !== void 0 && (this._deactivateAction(r), this._removeInactiveAction(r));
		}
		let r = this._bindingsByRootAndName[t];
		if (r !== void 0) for (let e in r) {
			let t = r[e];
			t.restoreOriginalState(), this._removeInactiveBinding(t);
		}
	}
	uncacheAction(e, t) {
		let n = this.existingAction(e, t);
		n !== null && (this._deactivateAction(n), this._removeInactiveAction(n));
	}
};
function ds(e, t, n, r) {
	let i = fs(r);
	switch (n) {
		case 1021: return e * t;
		case _: return e * t / i.components * i.byteLength;
		case 1029: return e * t / i.components * i.byteLength;
		case 1030: return e * t * 2 / i.components * i.byteLength;
		case 1031: return e * t * 2 / i.components * i.byteLength;
		case 1022: return e * t * 3 / i.components * i.byteLength;
		case m: return e * t * 4 / i.components * i.byteLength;
		case 1033: return e * t * 4 / i.components * i.byteLength;
		case 33776:
		case 33777: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 8;
		case 33778:
		case 33779: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case 35841:
		case 35843: return Math.max(e, 16) * Math.max(t, 8) / 4;
		case 35840:
		case 35842: return Math.max(e, 8) * Math.max(t, 8) / 2;
		case 36196:
		case 37492: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 8;
		case 37496: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case 37808: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case 37809: return Math.floor((e + 4) / 5) * Math.floor((t + 3) / 4) * 16;
		case 37810: return Math.floor((e + 4) / 5) * Math.floor((t + 4) / 5) * 16;
		case 37811: return Math.floor((e + 5) / 6) * Math.floor((t + 4) / 5) * 16;
		case 37812: return Math.floor((e + 5) / 6) * Math.floor((t + 5) / 6) * 16;
		case 37813: return Math.floor((e + 7) / 8) * Math.floor((t + 4) / 5) * 16;
		case 37814: return Math.floor((e + 7) / 8) * Math.floor((t + 5) / 6) * 16;
		case 37815: return Math.floor((e + 7) / 8) * Math.floor((t + 7) / 8) * 16;
		case 37816: return Math.floor((e + 9) / 10) * Math.floor((t + 4) / 5) * 16;
		case 37817: return Math.floor((e + 9) / 10) * Math.floor((t + 5) / 6) * 16;
		case 37818: return Math.floor((e + 9) / 10) * Math.floor((t + 7) / 8) * 16;
		case 37819: return Math.floor((e + 9) / 10) * Math.floor((t + 9) / 10) * 16;
		case 37820: return Math.floor((e + 11) / 12) * Math.floor((t + 9) / 10) * 16;
		case 37821: return Math.floor((e + 11) / 12) * Math.floor((t + 11) / 12) * 16;
		case 36492:
		case 36494:
		case 36495: return Math.ceil(e / 4) * Math.ceil(t / 4) * 16;
		case 36283:
		case 36284: return Math.ceil(e / 4) * Math.ceil(t / 4) * 8;
		case 36285:
		case 36286: return Math.ceil(e / 4) * Math.ceil(t / 4) * 16;
	}
	throw Error(`Unable to determine texture byte length for ${n} format.`);
}
function fs(e) {
	switch (e) {
		case l:
		case 1010: return {
			byteLength: 1,
			components: 1
		};
		case 1012:
		case 1011:
		case f: return {
			byteLength: 2,
			components: 1
		};
		case 1017:
		case 1018: return {
			byteLength: 2,
			components: 4
		};
		case u:
		case 1013:
		case d: return {
			byteLength: 4,
			components: 1
		};
		case 35902:
		case 35899: return {
			byteLength: 4,
			components: 3
		};
	}
	throw Error(`Unknown texture type ${e}.`);
}
typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: { revision: "180" } })), typeof window < "u" && (window.__THREE__ ? console.warn("WARNING: Multiple instances of Three.js being imported.") : window.__THREE__ = "180");
//#endregion
//#region node_modules/three/build/three.module.js
function ps() {
	let e = null, t = !1, n = null, r = null;
	function i(t, a) {
		n(t, a), r = e.requestAnimationFrame(i);
	}
	return {
		start: function() {
			t !== !0 && n !== null && (r = e.requestAnimationFrame(i), t = !0);
		},
		stop: function() {
			e.cancelAnimationFrame(r), t = !1;
		},
		setAnimationLoop: function(e) {
			n = e;
		},
		setContext: function(t) {
			e = t;
		}
	};
}
function ms(e) {
	let t = /* @__PURE__ */ new WeakMap();
	function n(t, n) {
		let r = t.array, i = t.usage, a = r.byteLength, o = e.createBuffer();
		e.bindBuffer(n, o), e.bufferData(n, r, i), t.onUploadCallback();
		let s;
		if (r instanceof Float32Array) s = e.FLOAT;
		else if (typeof Float16Array < "u" && r instanceof Float16Array) s = e.HALF_FLOAT;
		else if (r instanceof Uint16Array) s = t.isFloat16BufferAttribute ? e.HALF_FLOAT : e.UNSIGNED_SHORT;
		else if (r instanceof Int16Array) s = e.SHORT;
		else if (r instanceof Uint32Array) s = e.UNSIGNED_INT;
		else if (r instanceof Int32Array) s = e.INT;
		else if (r instanceof Int8Array) s = e.BYTE;
		else if (r instanceof Uint8Array) s = e.UNSIGNED_BYTE;
		else if (r instanceof Uint8ClampedArray) s = e.UNSIGNED_BYTE;
		else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: " + r);
		return {
			buffer: o,
			type: s,
			bytesPerElement: r.BYTES_PER_ELEMENT,
			version: t.version,
			size: a
		};
	}
	function r(t, n, r) {
		let i = n.array, a = n.updateRanges;
		if (e.bindBuffer(r, t), a.length === 0) e.bufferSubData(r, 0, i);
		else {
			a.sort((e, t) => e.start - t.start);
			let t = 0;
			for (let e = 1; e < a.length; e++) {
				let n = a[t], r = a[e];
				r.start <= n.start + n.count + 1 ? n.count = Math.max(n.count, r.start + r.count - n.start) : (++t, a[t] = r);
			}
			a.length = t + 1;
			for (let t = 0, n = a.length; t < n; t++) {
				let n = a[t];
				e.bufferSubData(r, n.start * i.BYTES_PER_ELEMENT, i, n.start, n.count);
			}
			n.clearUpdateRanges();
		}
		n.onUploadCallback();
	}
	function i(e) {
		return e.isInterleavedBufferAttribute && (e = e.data), t.get(e);
	}
	function a(n) {
		n.isInterleavedBufferAttribute && (n = n.data);
		let r = t.get(n);
		r && (e.deleteBuffer(r.buffer), t.delete(n));
	}
	function o(e, i) {
		if (e.isInterleavedBufferAttribute && (e = e.data), e.isGLBufferAttribute) {
			let n = t.get(e);
			(!n || n.version < e.version) && t.set(e, {
				buffer: e.buffer,
				type: e.type,
				bytesPerElement: e.elementSize,
				version: e.version
			});
			return;
		}
		let a = t.get(e);
		if (a === void 0) t.set(e, n(e, i));
		else if (a.version < e.version) {
			if (a.size !== e.array.byteLength) throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
			r(a.buffer, e, i), a.version = e.version;
		}
	}
	return {
		get: i,
		remove: a,
		update: o
	};
}
var X = {
	alphahash_fragment: "#ifdef USE_ALPHAHASH\n	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;\n#endif",
	alphahash_pars_fragment: "#ifdef USE_ALPHAHASH\n	const float ALPHA_HASH_SCALE = 0.05;\n	float hash2D( vec2 value ) {\n		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );\n	}\n	float hash3D( vec3 value ) {\n		return hash2D( vec2( hash2D( value.xy ), value.z ) );\n	}\n	float getAlphaHashThreshold( vec3 position ) {\n		float maxDeriv = max(\n			length( dFdx( position.xyz ) ),\n			length( dFdy( position.xyz ) )\n		);\n		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );\n		vec2 pixScales = vec2(\n			exp2( floor( log2( pixScale ) ) ),\n			exp2( ceil( log2( pixScale ) ) )\n		);\n		vec2 alpha = vec2(\n			hash3D( floor( pixScales.x * position.xyz ) ),\n			hash3D( floor( pixScales.y * position.xyz ) )\n		);\n		float lerpFactor = fract( log2( pixScale ) );\n		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;\n		float a = min( lerpFactor, 1.0 - lerpFactor );\n		vec3 cases = vec3(\n			x * x / ( 2.0 * a * ( 1.0 - a ) ),\n			( x - 0.5 * a ) / ( 1.0 - a ),\n			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )\n		);\n		float threshold = ( x < ( 1.0 - a ) )\n			? ( ( x < a ) ? cases.x : cases.y )\n			: cases.z;\n		return clamp( threshold , 1.0e-6, 1.0 );\n	}\n#endif",
	alphamap_fragment: "#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;\n#endif",
	alphamap_pars_fragment: "#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	alphatest_fragment: "#ifdef USE_ALPHATEST\n	#ifdef ALPHA_TO_COVERAGE\n	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );\n	if ( diffuseColor.a == 0.0 ) discard;\n	#else\n	if ( diffuseColor.a < alphaTest ) discard;\n	#endif\n#endif",
	alphatest_pars_fragment: "#ifdef USE_ALPHATEST\n	uniform float alphaTest;\n#endif",
	aomap_fragment: "#ifdef USE_AOMAP\n	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;\n	reflectedLight.indirectDiffuse *= ambientOcclusion;\n	#if defined( USE_CLEARCOAT ) \n		clearcoatSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_SHEEN ) \n		sheenSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( STANDARD )\n		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );\n		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );\n	#endif\n#endif",
	aomap_pars_fragment: "#ifdef USE_AOMAP\n	uniform sampler2D aoMap;\n	uniform float aoMapIntensity;\n#endif",
	batching_pars_vertex: "#ifdef USE_BATCHING\n	#if ! defined( GL_ANGLE_multi_draw )\n	#define gl_DrawID _gl_DrawID\n	uniform int _gl_DrawID;\n	#endif\n	uniform highp sampler2D batchingTexture;\n	uniform highp usampler2D batchingIdTexture;\n	mat4 getBatchingMatrix( const in float i ) {\n		int size = textureSize( batchingTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n	float getIndirectIndex( const in int i ) {\n		int size = textureSize( batchingIdTexture, 0 ).x;\n		int x = i % size;\n		int y = i / size;\n		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );\n	}\n#endif\n#ifdef USE_BATCHING_COLOR\n	uniform sampler2D batchingColorTexture;\n	vec3 getBatchingColor( const in float i ) {\n		int size = textureSize( batchingColorTexture, 0 ).x;\n		int j = int( i );\n		int x = j % size;\n		int y = j / size;\n		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;\n	}\n#endif",
	batching_vertex: "#ifdef USE_BATCHING\n	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );\n#endif",
	begin_vertex: "vec3 transformed = vec3( position );\n#ifdef USE_ALPHAHASH\n	vPosition = vec3( position );\n#endif",
	beginnormal_vertex: "vec3 objectNormal = vec3( normal );\n#ifdef USE_TANGENT\n	vec3 objectTangent = vec3( tangent.xyz );\n#endif",
	bsdfs: "float G_BlinnPhong_Implicit( ) {\n	return 0.25;\n}\nfloat D_BlinnPhong( const in float shininess, const in float dotNH ) {\n	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );\n}\nvec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( specularColor, 1.0, dotVH );\n	float G = G_BlinnPhong_Implicit( );\n	float D = D_BlinnPhong( shininess, dotNH );\n	return F * ( G * D );\n} // validated",
	iridescence_fragment: "#ifdef USE_IRIDESCENCE\n	const mat3 XYZ_TO_REC709 = mat3(\n		 3.2404542, -0.9692660,  0.0556434,\n		-1.5371385,  1.8760108, -0.2040259,\n		-0.4985314,  0.0415560,  1.0572252\n	);\n	vec3 Fresnel0ToIor( vec3 fresnel0 ) {\n		vec3 sqrtF0 = sqrt( fresnel0 );\n		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );\n	}\n	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );\n	}\n	float IorToFresnel0( float transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));\n	}\n	vec3 evalSensitivity( float OPD, vec3 shift ) {\n		float phase = 2.0 * PI * OPD * 1.0e-9;\n		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );\n		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );\n		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );\n		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );\n		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );\n		xyz /= 1.0685e-7;\n		vec3 rgb = XYZ_TO_REC709 * xyz;\n		return rgb;\n	}\n	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {\n		vec3 I;\n		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );\n		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );\n		float cosTheta2Sq = 1.0 - sinTheta2Sq;\n		if ( cosTheta2Sq < 0.0 ) {\n			return vec3( 1.0 );\n		}\n		float cosTheta2 = sqrt( cosTheta2Sq );\n		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );\n		float R12 = F_Schlick( R0, 1.0, cosTheta1 );\n		float T121 = 1.0 - R12;\n		float phi12 = 0.0;\n		if ( iridescenceIOR < outsideIOR ) phi12 = PI;\n		float phi21 = PI - phi12;\n		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );\n		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );\n		vec3 phi23 = vec3( 0.0 );\n		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;\n		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;\n		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;\n		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;\n		vec3 phi = vec3( phi21 ) + phi23;\n		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );\n		vec3 r123 = sqrt( R123 );\n		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );\n		vec3 C0 = R12 + Rs;\n		I = C0;\n		vec3 Cm = Rs - T121;\n		for ( int m = 1; m <= 2; ++ m ) {\n			Cm *= r123;\n			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );\n			I += Cm * Sm;\n		}\n		return max( I, vec3( 0.0 ) );\n	}\n#endif",
	bumpmap_pars_fragment: "#ifdef USE_BUMPMAP\n	uniform sampler2D bumpMap;\n	uniform float bumpScale;\n	vec2 dHdxy_fwd() {\n		vec2 dSTdx = dFdx( vBumpMapUv );\n		vec2 dSTdy = dFdy( vBumpMapUv );\n		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;\n		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;\n		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;\n		return vec2( dBx, dBy );\n	}\n	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {\n		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );\n		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );\n		vec3 vN = surf_norm;\n		vec3 R1 = cross( vSigmaY, vN );\n		vec3 R2 = cross( vN, vSigmaX );\n		float fDet = dot( vSigmaX, R1 ) * faceDirection;\n		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );\n		return normalize( abs( fDet ) * surf_norm - vGrad );\n	}\n#endif",
	clipping_planes_fragment: "#if NUM_CLIPPING_PLANES > 0\n	vec4 plane;\n	#ifdef ALPHA_TO_COVERAGE\n		float distanceToPlane, distanceGradient;\n		float clipOpacity = 1.0;\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n			distanceGradient = fwidth( distanceToPlane ) / 2.0;\n			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			if ( clipOpacity == 0.0 ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			float unionClipOpacity = 1.0;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n				distanceGradient = fwidth( distanceToPlane ) / 2.0;\n				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			}\n			#pragma unroll_loop_end\n			clipOpacity *= 1.0 - unionClipOpacity;\n		#endif\n		diffuseColor.a *= clipOpacity;\n		if ( diffuseColor.a == 0.0 ) discard;\n	#else\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			bool clipped = true;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;\n			}\n			#pragma unroll_loop_end\n			if ( clipped ) discard;\n		#endif\n	#endif\n#endif",
	clipping_planes_pars_fragment: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n#endif",
	clipping_planes_pars_vertex: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n#endif",
	clipping_planes_vertex: "#if NUM_CLIPPING_PLANES > 0\n	vClipPosition = - mvPosition.xyz;\n#endif",
	color_fragment: "#if defined( USE_COLOR_ALPHA )\n	diffuseColor *= vColor;\n#elif defined( USE_COLOR )\n	diffuseColor.rgb *= vColor;\n#endif",
	color_pars_fragment: "#if defined( USE_COLOR_ALPHA )\n	varying vec4 vColor;\n#elif defined( USE_COLOR )\n	varying vec3 vColor;\n#endif",
	color_pars_vertex: "#if defined( USE_COLOR_ALPHA )\n	varying vec4 vColor;\n#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	varying vec3 vColor;\n#endif",
	color_vertex: "#if defined( USE_COLOR_ALPHA )\n	vColor = vec4( 1.0 );\n#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	vColor = vec3( 1.0 );\n#endif\n#ifdef USE_COLOR\n	vColor *= color;\n#endif\n#ifdef USE_INSTANCING_COLOR\n	vColor.xyz *= instanceColor.xyz;\n#endif\n#ifdef USE_BATCHING_COLOR\n	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );\n	vColor.xyz *= batchingColor.xyz;\n#endif",
	common: "#define PI 3.141592653589793\n#define PI2 6.283185307179586\n#define PI_HALF 1.5707963267948966\n#define RECIPROCAL_PI 0.3183098861837907\n#define RECIPROCAL_PI2 0.15915494309189535\n#define EPSILON 1e-6\n#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\n#define whiteComplement( a ) ( 1.0 - saturate( a ) )\nfloat pow2( const in float x ) { return x*x; }\nvec3 pow2( const in vec3 x ) { return x*x; }\nfloat pow3( const in float x ) { return x*x*x; }\nfloat pow4( const in float x ) { float x2 = x*x; return x2*x2; }\nfloat max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }\nfloat average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }\nhighp float rand( const in vec2 uv ) {\n	const highp float a = 12.9898, b = 78.233, c = 43758.5453;\n	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );\n	return fract( sin( sn ) * c );\n}\n#ifdef HIGH_PRECISION\n	float precisionSafeLength( vec3 v ) { return length( v ); }\n#else\n	float precisionSafeLength( vec3 v ) {\n		float maxComponent = max3( abs( v ) );\n		return length( v / maxComponent ) * maxComponent;\n	}\n#endif\nstruct IncidentLight {\n	vec3 color;\n	vec3 direction;\n	bool visible;\n};\nstruct ReflectedLight {\n	vec3 directDiffuse;\n	vec3 directSpecular;\n	vec3 indirectDiffuse;\n	vec3 indirectSpecular;\n};\n#ifdef USE_ALPHAHASH\n	varying vec3 vPosition;\n#endif\nvec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n}\nvec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {\n	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );\n}\nmat3 transposeMat3( const in mat3 m ) {\n	mat3 tmp;\n	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );\n	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );\n	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );\n	return tmp;\n}\nbool isPerspectiveMatrix( mat4 m ) {\n	return m[ 2 ][ 3 ] == - 1.0;\n}\nvec2 equirectUv( in vec3 dir ) {\n	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;\n	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n	return vec2( u, v );\n}\nvec3 BRDF_Lambert( const in vec3 diffuseColor ) {\n	return RECIPROCAL_PI * diffuseColor;\n}\nvec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n}\nfloat F_Schlick( const in float f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n} // validated",
	cube_uv_reflection_fragment: "#ifdef ENVMAP_TYPE_CUBE_UV\n	#define cubeUV_minMipLevel 4.0\n	#define cubeUV_minTileSize 16.0\n	float getFace( vec3 direction ) {\n		vec3 absDirection = abs( direction );\n		float face = - 1.0;\n		if ( absDirection.x > absDirection.z ) {\n			if ( absDirection.x > absDirection.y )\n				face = direction.x > 0.0 ? 0.0 : 3.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		} else {\n			if ( absDirection.z > absDirection.y )\n				face = direction.z > 0.0 ? 2.0 : 5.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		}\n		return face;\n	}\n	vec2 getUV( vec3 direction, float face ) {\n		vec2 uv;\n		if ( face == 0.0 ) {\n			uv = vec2( direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 1.0 ) {\n			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );\n		} else if ( face == 2.0 ) {\n			uv = vec2( - direction.x, direction.y ) / abs( direction.z );\n		} else if ( face == 3.0 ) {\n			uv = vec2( - direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 4.0 ) {\n			uv = vec2( - direction.x, direction.z ) / abs( direction.y );\n		} else {\n			uv = vec2( direction.x, direction.y ) / abs( direction.z );\n		}\n		return 0.5 * ( uv + 1.0 );\n	}\n	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {\n		float face = getFace( direction );\n		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );\n		mipInt = max( mipInt, cubeUV_minMipLevel );\n		float faceSize = exp2( mipInt );\n		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;\n		if ( face > 2.0 ) {\n			uv.y += faceSize;\n			face -= 3.0;\n		}\n		uv.x += face * faceSize;\n		uv.x += filterInt * 3.0 * cubeUV_minTileSize;\n		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );\n		uv.x *= CUBEUV_TEXEL_WIDTH;\n		uv.y *= CUBEUV_TEXEL_HEIGHT;\n		#ifdef texture2DGradEXT\n			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;\n		#else\n			return texture2D( envMap, uv ).rgb;\n		#endif\n	}\n	#define cubeUV_r0 1.0\n	#define cubeUV_m0 - 2.0\n	#define cubeUV_r1 0.8\n	#define cubeUV_m1 - 1.0\n	#define cubeUV_r4 0.4\n	#define cubeUV_m4 2.0\n	#define cubeUV_r5 0.305\n	#define cubeUV_m5 3.0\n	#define cubeUV_r6 0.21\n	#define cubeUV_m6 4.0\n	float roughnessToMip( float roughness ) {\n		float mip = 0.0;\n		if ( roughness >= cubeUV_r1 ) {\n			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;\n		} else if ( roughness >= cubeUV_r4 ) {\n			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;\n		} else if ( roughness >= cubeUV_r5 ) {\n			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;\n		} else if ( roughness >= cubeUV_r6 ) {\n			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;\n		} else {\n			mip = - 2.0 * log2( 1.16 * roughness );		}\n		return mip;\n	}\n	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {\n		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );\n		float mipF = fract( mip );\n		float mipInt = floor( mip );\n		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );\n		if ( mipF == 0.0 ) {\n			return vec4( color0, 1.0 );\n		} else {\n			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );\n			return vec4( mix( color0, color1, mipF ), 1.0 );\n		}\n	}\n#endif",
	defaultnormal_vertex: "vec3 transformedNormal = objectNormal;\n#ifdef USE_TANGENT\n	vec3 transformedTangent = objectTangent;\n#endif\n#ifdef USE_BATCHING\n	mat3 bm = mat3( batchingMatrix );\n	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );\n	transformedNormal = bm * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = bm * transformedTangent;\n	#endif\n#endif\n#ifdef USE_INSTANCING\n	mat3 im = mat3( instanceMatrix );\n	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );\n	transformedNormal = im * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = im * transformedTangent;\n	#endif\n#endif\ntransformedNormal = normalMatrix * transformedNormal;\n#ifdef FLIP_SIDED\n	transformedNormal = - transformedNormal;\n#endif\n#ifdef USE_TANGENT\n	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;\n	#ifdef FLIP_SIDED\n		transformedTangent = - transformedTangent;\n	#endif\n#endif",
	displacementmap_pars_vertex: "#ifdef USE_DISPLACEMENTMAP\n	uniform sampler2D displacementMap;\n	uniform float displacementScale;\n	uniform float displacementBias;\n#endif",
	displacementmap_vertex: "#ifdef USE_DISPLACEMENTMAP\n	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );\n#endif",
	emissivemap_fragment: "#ifdef USE_EMISSIVEMAP\n	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE\n		emissiveColor = sRGBTransferEOTF( emissiveColor );\n	#endif\n	totalEmissiveRadiance *= emissiveColor.rgb;\n#endif",
	emissivemap_pars_fragment: "#ifdef USE_EMISSIVEMAP\n	uniform sampler2D emissiveMap;\n#endif",
	colorspace_fragment: "gl_FragColor = linearToOutputTexel( gl_FragColor );",
	colorspace_pars_fragment: "vec4 LinearTransferOETF( in vec4 value ) {\n	return value;\n}\nvec4 sRGBTransferEOTF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );\n}\nvec4 sRGBTransferOETF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );\n}",
	envmap_fragment: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vec3 cameraToFrag;\n		if ( isOrthographic ) {\n			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToFrag = normalize( vWorldPosition - cameraPosition );\n		}\n		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vec3 reflectVec = reflect( cameraToFrag, worldNormal );\n		#else\n			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );\n		#endif\n	#else\n		vec3 reflectVec = vReflect;\n	#endif\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );\n	#else\n		vec4 envColor = vec4( 0.0 );\n	#endif\n	#ifdef ENVMAP_BLENDING_MULTIPLY\n		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );\n	#elif defined( ENVMAP_BLENDING_MIX )\n		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );\n	#elif defined( ENVMAP_BLENDING_ADD )\n		outgoingLight += envColor.xyz * specularStrength * reflectivity;\n	#endif\n#endif",
	envmap_common_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float envMapIntensity;\n	uniform float flipEnvMap;\n	uniform mat3 envMapRotation;\n	#ifdef ENVMAP_TYPE_CUBE\n		uniform samplerCube envMap;\n	#else\n		uniform sampler2D envMap;\n	#endif\n	\n#endif",
	envmap_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float reflectivity;\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		varying vec3 vWorldPosition;\n		uniform float refractionRatio;\n	#else\n		varying vec3 vReflect;\n	#endif\n#endif",
	envmap_pars_vertex: "#ifdef USE_ENVMAP\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		\n		varying vec3 vWorldPosition;\n	#else\n		varying vec3 vReflect;\n		uniform float refractionRatio;\n	#endif\n#endif",
	envmap_physical_pars_fragment: "#ifdef USE_ENVMAP\n	vec3 getIBLIrradiance( const in vec3 normal ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );\n			return PI * envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 reflectVec = reflect( - viewDir, normal );\n			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );\n			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );\n			return envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	#ifdef USE_ANISOTROPY\n		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 bentNormal = cross( bitangent, viewDir );\n				bentNormal = normalize( cross( bentNormal, bitangent ) );\n				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n				return getIBLRadiance( viewDir, bentNormal, roughness );\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n	#endif\n#endif",
	envmap_vertex: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vWorldPosition = worldPosition.xyz;\n	#else\n		vec3 cameraToVertex;\n		if ( isOrthographic ) {\n			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );\n		}\n		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vReflect = reflect( cameraToVertex, worldNormal );\n		#else\n			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );\n		#endif\n	#endif\n#endif",
	fog_vertex: "#ifdef USE_FOG\n	vFogDepth = - mvPosition.z;\n#endif",
	fog_pars_vertex: "#ifdef USE_FOG\n	varying float vFogDepth;\n#endif",
	fog_fragment: "#ifdef USE_FOG\n	#ifdef FOG_EXP2\n		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );\n	#else\n		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );\n	#endif\n	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif",
	fog_pars_fragment: "#ifdef USE_FOG\n	uniform vec3 fogColor;\n	varying float vFogDepth;\n	#ifdef FOG_EXP2\n		uniform float fogDensity;\n	#else\n		uniform float fogNear;\n		uniform float fogFar;\n	#endif\n#endif",
	gradientmap_pars_fragment: "#ifdef USE_GRADIENTMAP\n	uniform sampler2D gradientMap;\n#endif\nvec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {\n	float dotNL = dot( normal, lightDirection );\n	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );\n	#ifdef USE_GRADIENTMAP\n		return vec3( texture2D( gradientMap, coord ).r );\n	#else\n		vec2 fw = fwidth( coord ) * 0.5;\n		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );\n	#endif\n}",
	lightmap_pars_fragment: "#ifdef USE_LIGHTMAP\n	uniform sampler2D lightMap;\n	uniform float lightMapIntensity;\n#endif",
	lights_lambert_fragment: "LambertMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularStrength = specularStrength;",
	lights_lambert_pars_fragment: "varying vec3 vViewPosition;\nstruct LambertMaterial {\n	vec3 diffuseColor;\n	float specularStrength;\n};\nvoid RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Lambert\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert",
	lights_pars_begin: "uniform bool receiveShadow;\nuniform vec3 ambientLightColor;\n#if defined( USE_LIGHT_PROBES )\n	uniform vec3 lightProbe[ 9 ];\n#endif\nvec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {\n	float x = normal.x, y = normal.y, z = normal.z;\n	vec3 result = shCoefficients[ 0 ] * 0.886227;\n	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;\n	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;\n	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;\n	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;\n	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;\n	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );\n	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;\n	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );\n	return result;\n}\nvec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {\n	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );\n	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );\n	return irradiance;\n}\nvec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {\n	vec3 irradiance = ambientLightColor;\n	return irradiance;\n}\nfloat getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );\n	if ( cutoffDistance > 0.0 ) {\n		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );\n	}\n	return distanceFalloff;\n}\nfloat getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {\n	return smoothstep( coneCosine, penumbraCosine, angleCosine );\n}\n#if NUM_DIR_LIGHTS > 0\n	struct DirectionalLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];\n	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {\n		light.color = directionalLight.color;\n		light.direction = directionalLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_POINT_LIGHTS > 0\n	struct PointLight {\n		vec3 position;\n		vec3 color;\n		float distance;\n		float decay;\n	};\n	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];\n	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = pointLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float lightDistance = length( lVector );\n		light.color = pointLight.color;\n		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );\n		light.visible = ( light.color != vec3( 0.0 ) );\n	}\n#endif\n#if NUM_SPOT_LIGHTS > 0\n	struct SpotLight {\n		vec3 position;\n		vec3 direction;\n		vec3 color;\n		float distance;\n		float decay;\n		float coneCos;\n		float penumbraCos;\n	};\n	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];\n	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = spotLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float angleCos = dot( light.direction, spotLight.direction );\n		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );\n		if ( spotAttenuation > 0.0 ) {\n			float lightDistance = length( lVector );\n			light.color = spotLight.color * spotAttenuation;\n			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );\n			light.visible = ( light.color != vec3( 0.0 ) );\n		} else {\n			light.color = vec3( 0.0 );\n			light.visible = false;\n		}\n	}\n#endif\n#if NUM_RECT_AREA_LIGHTS > 0\n	struct RectAreaLight {\n		vec3 color;\n		vec3 position;\n		vec3 halfWidth;\n		vec3 halfHeight;\n	};\n	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;\n	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];\n#endif\n#if NUM_HEMI_LIGHTS > 0\n	struct HemisphereLight {\n		vec3 direction;\n		vec3 skyColor;\n		vec3 groundColor;\n	};\n	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];\n	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {\n		float dotNL = dot( normal, hemiLight.direction );\n		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;\n		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );\n		return irradiance;\n	}\n#endif",
	lights_toon_fragment: "ToonMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;",
	lights_toon_pars_fragment: "varying vec3 vViewPosition;\nstruct ToonMaterial {\n	vec3 diffuseColor;\n};\nvoid RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Toon\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon",
	lights_phong_fragment: "BlinnPhongMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularColor = specular;\nmaterial.specularShininess = shininess;\nmaterial.specularStrength = specularStrength;",
	lights_phong_pars_fragment: "varying vec3 vViewPosition;\nstruct BlinnPhongMaterial {\n	vec3 diffuseColor;\n	vec3 specularColor;\n	float specularShininess;\n	float specularStrength;\n};\nvoid RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;\n}\nvoid RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_BlinnPhong\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong",
	lights_physical_fragment: "PhysicalMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );\nvec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );\nfloat geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );\nmaterial.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;\nmaterial.roughness = min( material.roughness, 1.0 );\n#ifdef IOR\n	material.ior = ior;\n	#ifdef USE_SPECULAR\n		float specularIntensityFactor = specularIntensity;\n		vec3 specularColorFactor = specularColor;\n		#ifdef USE_SPECULAR_COLORMAP\n			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;\n		#endif\n		#ifdef USE_SPECULAR_INTENSITYMAP\n			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;\n		#endif\n		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );\n	#else\n		float specularIntensityFactor = 1.0;\n		vec3 specularColorFactor = vec3( 1.0 );\n		material.specularF90 = 1.0;\n	#endif\n	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );\n#else\n	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );\n	material.specularF90 = 1.0;\n#endif\n#ifdef USE_CLEARCOAT\n	material.clearcoat = clearcoat;\n	material.clearcoatRoughness = clearcoatRoughness;\n	material.clearcoatF0 = vec3( 0.04 );\n	material.clearcoatF90 = 1.0;\n	#ifdef USE_CLEARCOATMAP\n		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;\n	#endif\n	#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;\n	#endif\n	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );\n	material.clearcoatRoughness += geometryRoughness;\n	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );\n#endif\n#ifdef USE_DISPERSION\n	material.dispersion = dispersion;\n#endif\n#ifdef USE_IRIDESCENCE\n	material.iridescence = iridescence;\n	material.iridescenceIOR = iridescenceIOR;\n	#ifdef USE_IRIDESCENCEMAP\n		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;\n	#endif\n	#ifdef USE_IRIDESCENCE_THICKNESSMAP\n		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;\n	#else\n		material.iridescenceThickness = iridescenceThicknessMaximum;\n	#endif\n#endif\n#ifdef USE_SHEEN\n	material.sheenColor = sheenColor;\n	#ifdef USE_SHEEN_COLORMAP\n		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;\n	#endif\n	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	#ifdef USE_ANISOTROPYMAP\n		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );\n		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;\n		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;\n	#else\n		vec2 anisotropyV = anisotropyVector;\n	#endif\n	material.anisotropy = length( anisotropyV );\n	if( material.anisotropy == 0.0 ) {\n		anisotropyV = vec2( 1.0, 0.0 );\n	} else {\n		anisotropyV /= material.anisotropy;\n		material.anisotropy = saturate( material.anisotropy );\n	}\n	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );\n	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;\n	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;\n#endif",
	lights_physical_pars_fragment: "struct PhysicalMaterial {\n	vec3 diffuseColor;\n	float roughness;\n	vec3 specularColor;\n	float specularF90;\n	float dispersion;\n	#ifdef USE_CLEARCOAT\n		float clearcoat;\n		float clearcoatRoughness;\n		vec3 clearcoatF0;\n		float clearcoatF90;\n	#endif\n	#ifdef USE_IRIDESCENCE\n		float iridescence;\n		float iridescenceIOR;\n		float iridescenceThickness;\n		vec3 iridescenceFresnel;\n		vec3 iridescenceF0;\n	#endif\n	#ifdef USE_SHEEN\n		vec3 sheenColor;\n		float sheenRoughness;\n	#endif\n	#ifdef IOR\n		float ior;\n	#endif\n	#ifdef USE_TRANSMISSION\n		float transmission;\n		float transmissionAlpha;\n		float thickness;\n		float attenuationDistance;\n		vec3 attenuationColor;\n	#endif\n	#ifdef USE_ANISOTROPY\n		float anisotropy;\n		float alphaT;\n		vec3 anisotropyT;\n		vec3 anisotropyB;\n	#endif\n};\nvec3 clearcoatSpecularDirect = vec3( 0.0 );\nvec3 clearcoatSpecularIndirect = vec3( 0.0 );\nvec3 sheenSpecularDirect = vec3( 0.0 );\nvec3 sheenSpecularIndirect = vec3(0.0 );\nvec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {\n    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );\n    float x2 = x * x;\n    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );\n    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );\n}\nfloat V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {\n	float a2 = pow2( alpha );\n	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n	return 0.5 / max( gv + gl, EPSILON );\n}\nfloat D_GGX( const in float alpha, const in float dotNH ) {\n	float a2 = pow2( alpha );\n	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;\n	return RECIPROCAL_PI * a2 / pow2( denom );\n}\n#ifdef USE_ANISOTROPY\n	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {\n		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );\n		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );\n		float v = 0.5 / ( gv + gl );\n		return saturate(v);\n	}\n	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {\n		float a2 = alphaT * alphaB;\n		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );\n		highp float v2 = dot( v, v );\n		float w2 = a2 / v2;\n		return RECIPROCAL_PI * a2 * pow2 ( w2 );\n	}\n#endif\n#ifdef USE_CLEARCOAT\n	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {\n		vec3 f0 = material.clearcoatF0;\n		float f90 = material.clearcoatF90;\n		float roughness = material.clearcoatRoughness;\n		float alpha = pow2( roughness );\n		vec3 halfDir = normalize( lightDir + viewDir );\n		float dotNL = saturate( dot( normal, lightDir ) );\n		float dotNV = saturate( dot( normal, viewDir ) );\n		float dotNH = saturate( dot( normal, halfDir ) );\n		float dotVH = saturate( dot( viewDir, halfDir ) );\n		vec3 F = F_Schlick( f0, f90, dotVH );\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n		return F * ( V * D );\n	}\n#endif\nvec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {\n	vec3 f0 = material.specularColor;\n	float f90 = material.specularF90;\n	float roughness = material.roughness;\n	float alpha = pow2( roughness );\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( f0, f90, dotVH );\n	#ifdef USE_IRIDESCENCE\n		F = mix( F, material.iridescenceFresnel, material.iridescence );\n	#endif\n	#ifdef USE_ANISOTROPY\n		float dotTL = dot( material.anisotropyT, lightDir );\n		float dotTV = dot( material.anisotropyT, viewDir );\n		float dotTH = dot( material.anisotropyT, halfDir );\n		float dotBL = dot( material.anisotropyB, lightDir );\n		float dotBV = dot( material.anisotropyB, viewDir );\n		float dotBH = dot( material.anisotropyB, halfDir );\n		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );\n		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );\n	#else\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n	#endif\n	return F * ( V * D );\n}\nvec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {\n	const float LUT_SIZE = 64.0;\n	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;\n	const float LUT_BIAS = 0.5 / LUT_SIZE;\n	float dotNV = saturate( dot( N, V ) );\n	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );\n	uv = uv * LUT_SCALE + LUT_BIAS;\n	return uv;\n}\nfloat LTC_ClippedSphereFormFactor( const in vec3 f ) {\n	float l = length( f );\n	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );\n}\nvec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {\n	float x = dot( v1, v2 );\n	float y = abs( x );\n	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;\n	float b = 3.4175940 + ( 4.1616724 + y ) * y;\n	float v = a / b;\n	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;\n	return cross( v1, v2 ) * theta_sintheta;\n}\nvec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {\n	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];\n	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];\n	vec3 lightNormal = cross( v1, v2 );\n	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );\n	vec3 T1, T2;\n	T1 = normalize( V - N * dot( V, N ) );\n	T2 = - cross( N, T1 );\n	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );\n	vec3 coords[ 4 ];\n	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );\n	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );\n	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );\n	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );\n	coords[ 0 ] = normalize( coords[ 0 ] );\n	coords[ 1 ] = normalize( coords[ 1 ] );\n	coords[ 2 ] = normalize( coords[ 2 ] );\n	coords[ 3 ] = normalize( coords[ 3 ] );\n	vec3 vectorFormFactor = vec3( 0.0 );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );\n	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );\n	return vec3( result );\n}\n#if defined( USE_SHEEN )\nfloat D_Charlie( float roughness, float dotNH ) {\n	float alpha = pow2( roughness );\n	float invAlpha = 1.0 / alpha;\n	float cos2h = dotNH * dotNH;\n	float sin2h = max( 1.0 - cos2h, 0.0078125 );\n	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );\n}\nfloat V_Neubelt( float dotNV, float dotNL ) {\n	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );\n}\nvec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float D = D_Charlie( sheenRoughness, dotNH );\n	float V = V_Neubelt( dotNV, dotNL );\n	return sheenColor * ( D * V );\n}\n#endif\nfloat IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float r2 = roughness * roughness;\n	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;\n	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;\n	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );\n	return saturate( DG * RECIPROCAL_PI );\n}\nvec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );\n	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );\n	vec4 r = roughness * c0 + c1;\n	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;\n	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;\n	return fab;\n}\nvec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {\n	vec2 fab = DFGApprox( normal, viewDir, roughness );\n	return specularColor * fab.x + specularF90 * fab.y;\n}\n#ifdef USE_IRIDESCENCE\nvoid computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#else\nvoid computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#endif\n	vec2 fab = DFGApprox( normal, viewDir, roughness );\n	#ifdef USE_IRIDESCENCE\n		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );\n	#else\n		vec3 Fr = specularColor;\n	#endif\n	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;\n	float Ess = fab.x + fab.y;\n	float Ems = 1.0 - Ess;\n	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );\n	singleScatter += FssEss;\n	multiScatter += Fms * Ems;\n}\n#if NUM_RECT_AREA_LIGHTS > 0\n	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n		vec3 normal = geometryNormal;\n		vec3 viewDir = geometryViewDir;\n		vec3 position = geometryPosition;\n		vec3 lightPos = rectAreaLight.position;\n		vec3 halfWidth = rectAreaLight.halfWidth;\n		vec3 halfHeight = rectAreaLight.halfHeight;\n		vec3 lightColor = rectAreaLight.color;\n		float roughness = material.roughness;\n		vec3 rectCoords[ 4 ];\n		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;\n		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;\n		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;\n		vec2 uv = LTC_Uv( normal, viewDir, roughness );\n		vec4 t1 = texture2D( ltc_1, uv );\n		vec4 t2 = texture2D( ltc_2, uv );\n		mat3 mInv = mat3(\n			vec3( t1.x, 0, t1.y ),\n			vec3(    0, 1,    0 ),\n			vec3( t1.z, 0, t1.w )\n		);\n		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );\n		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );\n		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );\n	}\n#endif\nvoid RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	#ifdef USE_CLEARCOAT\n		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );\n		vec3 ccIrradiance = dotNLcc * directLight.color;\n		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );\n	#endif\n	#ifdef USE_SHEEN\n		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );\n	#endif\n	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n	#ifdef USE_CLEARCOAT\n		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );\n	#endif\n	#ifdef USE_SHEEN\n		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n	#endif\n	vec3 singleScattering = vec3( 0.0 );\n	vec3 multiScattering = vec3( 0.0 );\n	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );\n	#else\n		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );\n	#endif\n	vec3 totalScattering = singleScattering + multiScattering;\n	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );\n	reflectedLight.indirectSpecular += radiance * singleScattering;\n	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;\n	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;\n}\n#define RE_Direct				RE_Direct_Physical\n#define RE_Direct_RectArea		RE_Direct_RectArea_Physical\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical\n#define RE_IndirectSpecular		RE_IndirectSpecular_Physical\nfloat computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {\n	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );\n}",
	lights_fragment_begin: "\nvec3 geometryPosition = - vViewPosition;\nvec3 geometryNormal = normal;\nvec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );\nvec3 geometryClearcoatNormal = vec3( 0.0 );\n#ifdef USE_CLEARCOAT\n	geometryClearcoatNormal = clearcoatNormal;\n#endif\n#ifdef USE_IRIDESCENCE\n	float dotNVi = saturate( dot( normal, geometryViewDir ) );\n	if ( material.iridescenceThickness == 0.0 ) {\n		material.iridescence = 0.0;\n	} else {\n		material.iridescence = saturate( material.iridescence );\n	}\n	if ( material.iridescence > 0.0 ) {\n		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );\n		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );\n	}\n#endif\nIncidentLight directLight;\n#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )\n	PointLight pointLight;\n	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0\n	PointLightShadow pointLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n		pointLight = pointLights[ i ];\n		getPointLightInfo( pointLight, geometryPosition, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )\n		pointLightShadow = pointLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )\n	SpotLight spotLight;\n	vec4 spotColor;\n	vec3 spotLightCoord;\n	bool inSpotLightMap;\n	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n		spotLight = spotLights[ i ];\n		getSpotLightInfo( spotLight, geometryPosition, directLight );\n		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX\n		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS\n		#else\n		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#endif\n		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )\n			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;\n			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );\n			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );\n			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;\n		#endif\n		#undef SPOT_LIGHT_MAP_INDEX\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		spotLightShadow = spotLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n	DirectionalLight directionalLight;\n	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n		directionalLight = directionalLights[ i ];\n		getDirectionalLightInfo( directionalLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )\n		directionalLightShadow = directionalLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )\n	RectAreaLight rectAreaLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {\n		rectAreaLight = rectAreaLights[ i ];\n		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if defined( RE_IndirectDiffuse )\n	vec3 iblIrradiance = vec3( 0.0 );\n	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n	#if defined( USE_LIGHT_PROBES )\n		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );\n	#endif\n	#if ( NUM_HEMI_LIGHTS > 0 )\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );\n		}\n		#pragma unroll_loop_end\n	#endif\n#endif\n#if defined( RE_IndirectSpecular )\n	vec3 radiance = vec3( 0.0 );\n	vec3 clearcoatRadiance = vec3( 0.0 );\n#endif",
	lights_fragment_maps: "#if defined( RE_IndirectDiffuse )\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;\n		irradiance += lightMapIrradiance;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )\n		iblIrradiance += getIBLIrradiance( geometryNormal );\n	#endif\n#endif\n#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n	#ifdef USE_ANISOTROPY\n		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n	#else\n		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );\n	#endif\n	#ifdef USE_CLEARCOAT\n		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );\n	#endif\n#endif",
	lights_fragment_end: "#if defined( RE_IndirectDiffuse )\n	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif\n#if defined( RE_IndirectSpecular )\n	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif",
	logdepthbuf_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;\n#endif",
	logdepthbuf_pars_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	uniform float logDepthBufFC;\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_pars_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	vFragDepth = 1.0 + gl_Position.w;\n	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );\n#endif",
	map_fragment: "#ifdef USE_MAP\n	vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );\n	#endif\n	diffuseColor *= sampledDiffuseColor;\n#endif",
	map_pars_fragment: "#ifdef USE_MAP\n	uniform sampler2D map;\n#endif",
	map_particle_fragment: "#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n	#if defined( USE_POINTS_UV )\n		vec2 uv = vUv;\n	#else\n		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;\n	#endif\n#endif\n#ifdef USE_MAP\n	diffuseColor *= texture2D( map, uv );\n#endif\n#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, uv ).g;\n#endif",
	map_particle_pars_fragment: "#if defined( USE_POINTS_UV )\n	varying vec2 vUv;\n#else\n	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n		uniform mat3 uvTransform;\n	#endif\n#endif\n#ifdef USE_MAP\n	uniform sampler2D map;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	metalnessmap_fragment: "float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );\n	metalnessFactor *= texelMetalness.b;\n#endif",
	metalnessmap_pars_fragment: "#ifdef USE_METALNESSMAP\n	uniform sampler2D metalnessMap;\n#endif",
	morphinstance_vertex: "#ifdef USE_INSTANCING_MORPH\n	float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;\n	}\n#endif",
	morphcolor_vertex: "#if defined( USE_MORPHCOLORS )\n	vColor *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		#if defined( USE_COLOR_ALPHA )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];\n		#elif defined( USE_COLOR )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];\n		#endif\n	}\n#endif",
	morphnormal_vertex: "#ifdef USE_MORPHNORMALS\n	objectNormal *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	morphtarget_pars_vertex: "#ifdef USE_MORPHTARGETS\n	#ifndef USE_INSTANCING_MORPH\n		uniform float morphTargetBaseInfluence;\n		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	#endif\n	uniform sampler2DArray morphTargetsTexture;\n	uniform ivec2 morphTargetsTextureSize;\n	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {\n		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;\n		int y = texelIndex / morphTargetsTextureSize.x;\n		int x = texelIndex - y * morphTargetsTextureSize.x;\n		ivec3 morphUV = ivec3( x, y, morphTargetIndex );\n		return texelFetch( morphTargetsTexture, morphUV, 0 );\n	}\n#endif",
	morphtarget_vertex: "#ifdef USE_MORPHTARGETS\n	transformed *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	normal_fragment_begin: "float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n#ifdef FLAT_SHADED\n	vec3 fdx = dFdx( vViewPosition );\n	vec3 fdy = dFdy( vViewPosition );\n	vec3 normal = normalize( cross( fdx, fdy ) );\n#else\n	vec3 normal = normalize( vNormal );\n	#ifdef DOUBLE_SIDED\n		normal *= faceDirection;\n	#endif\n#endif\n#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )\n	#ifdef USE_TANGENT\n		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn = getTangentFrame( - vViewPosition, normal,\n		#if defined( USE_NORMALMAP )\n			vNormalMapUv\n		#elif defined( USE_CLEARCOAT_NORMALMAP )\n			vClearcoatNormalMapUv\n		#else\n			vUv\n		#endif\n		);\n	#endif\n	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )\n		tbn[0] *= faceDirection;\n		tbn[1] *= faceDirection;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	#ifdef USE_TANGENT\n		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );\n	#endif\n	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )\n		tbn2[0] *= faceDirection;\n		tbn2[1] *= faceDirection;\n	#endif\n#endif\nvec3 nonPerturbedNormal = normal;",
	normal_fragment_maps: "#ifdef USE_NORMALMAP_OBJECTSPACE\n	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#ifdef FLIP_SIDED\n		normal = - normal;\n	#endif\n	#ifdef DOUBLE_SIDED\n		normal = normal * faceDirection;\n	#endif\n	normal = normalize( normalMatrix * normal );\n#elif defined( USE_NORMALMAP_TANGENTSPACE )\n	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	mapN.xy *= normalScale;\n	normal = normalize( tbn * mapN );\n#elif defined( USE_BUMPMAP )\n	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );\n#endif",
	normal_pars_fragment: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_pars_vertex: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_vertex: "#ifndef FLAT_SHADED\n	vNormal = normalize( transformedNormal );\n	#ifdef USE_TANGENT\n		vTangent = normalize( transformedTangent );\n		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );\n	#endif\n#endif",
	normalmap_pars_fragment: "#ifdef USE_NORMALMAP\n	uniform sampler2D normalMap;\n	uniform vec2 normalScale;\n#endif\n#ifdef USE_NORMALMAP_OBJECTSPACE\n	uniform mat3 normalMatrix;\n#endif\n#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )\n	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {\n		vec3 q0 = dFdx( eye_pos.xyz );\n		vec3 q1 = dFdy( eye_pos.xyz );\n		vec2 st0 = dFdx( uv.st );\n		vec2 st1 = dFdy( uv.st );\n		vec3 N = surf_norm;\n		vec3 q1perp = cross( q1, N );\n		vec3 q0perp = cross( N, q0 );\n		vec3 T = q1perp * st0.x + q0perp * st1.x;\n		vec3 B = q1perp * st0.y + q0perp * st1.y;\n		float det = max( dot( T, T ), dot( B, B ) );\n		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );\n		return mat3( T * scale, B * scale, N );\n	}\n#endif",
	clearcoat_normal_fragment_begin: "#ifdef USE_CLEARCOAT\n	vec3 clearcoatNormal = nonPerturbedNormal;\n#endif",
	clearcoat_normal_fragment_maps: "#ifdef USE_CLEARCOAT_NORMALMAP\n	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;\n	clearcoatMapN.xy *= clearcoatNormalScale;\n	clearcoatNormal = normalize( tbn2 * clearcoatMapN );\n#endif",
	clearcoat_pars_fragment: "#ifdef USE_CLEARCOATMAP\n	uniform sampler2D clearcoatMap;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform sampler2D clearcoatNormalMap;\n	uniform vec2 clearcoatNormalScale;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform sampler2D clearcoatRoughnessMap;\n#endif",
	iridescence_pars_fragment: "#ifdef USE_IRIDESCENCEMAP\n	uniform sampler2D iridescenceMap;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform sampler2D iridescenceThicknessMap;\n#endif",
	opaque_fragment: "#ifdef OPAQUE\ndiffuseColor.a = 1.0;\n#endif\n#ifdef USE_TRANSMISSION\ndiffuseColor.a *= material.transmissionAlpha;\n#endif\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );",
	packing: "vec3 packNormalToRGB( const in vec3 normal ) {\n	return normalize( normal ) * 0.5 + 0.5;\n}\nvec3 unpackRGBToNormal( const in vec3 rgb ) {\n	return 2.0 * rgb.xyz - 1.0;\n}\nconst float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;\nconst float Inv255 = 1. / 255.;\nconst vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );\nconst vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );\nconst vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );\nconst vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );\nvec4 packDepthToRGBA( const in float v ) {\n	if( v <= 0.0 )\n		return vec4( 0., 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec4( 1., 1., 1., 1. );\n	float vuf;\n	float af = modf( v * PackFactors.a, vuf );\n	float bf = modf( vuf * ShiftRight8, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );\n}\nvec3 packDepthToRGB( const in float v ) {\n	if( v <= 0.0 )\n		return vec3( 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec3( 1., 1., 1. );\n	float vuf;\n	float bf = modf( v * PackFactors.b, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec3( vuf * Inv255, gf * PackUpscale, bf );\n}\nvec2 packDepthToRG( const in float v ) {\n	if( v <= 0.0 )\n		return vec2( 0., 0. );\n	if( v >= 1.0 )\n		return vec2( 1., 1. );\n	float vuf;\n	float gf = modf( v * 256., vuf );\n	return vec2( vuf * Inv255, gf );\n}\nfloat unpackRGBAToDepth( const in vec4 v ) {\n	return dot( v, UnpackFactors4 );\n}\nfloat unpackRGBToDepth( const in vec3 v ) {\n	return dot( v, UnpackFactors3 );\n}\nfloat unpackRGToDepth( const in vec2 v ) {\n	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;\n}\nvec4 pack2HalfToRGBA( const in vec2 v ) {\n	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );\n	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );\n}\nvec2 unpackRGBATo2Half( const in vec4 v ) {\n	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );\n}\nfloat viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( viewZ + near ) / ( near - far );\n}\nfloat orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	return depth * ( near - far ) - near;\n}\nfloat viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );\n}\nfloat perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	return ( near * far ) / ( ( far - near ) * depth - far );\n}",
	premultiplied_alpha_fragment: "#ifdef PREMULTIPLIED_ALPHA\n	gl_FragColor.rgb *= gl_FragColor.a;\n#endif",
	project_vertex: "vec4 mvPosition = vec4( transformed, 1.0 );\n#ifdef USE_BATCHING\n	mvPosition = batchingMatrix * mvPosition;\n#endif\n#ifdef USE_INSTANCING\n	mvPosition = instanceMatrix * mvPosition;\n#endif\nmvPosition = modelViewMatrix * mvPosition;\ngl_Position = projectionMatrix * mvPosition;",
	dithering_fragment: "#ifdef DITHERING\n	gl_FragColor.rgb = dithering( gl_FragColor.rgb );\n#endif",
	dithering_pars_fragment: "#ifdef DITHERING\n	vec3 dithering( vec3 color ) {\n		float grid_position = rand( gl_FragCoord.xy );\n		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );\n		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );\n		return color + dither_shift_RGB;\n	}\n#endif",
	roughnessmap_fragment: "float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );\n	roughnessFactor *= texelRoughness.g;\n#endif",
	roughnessmap_pars_fragment: "#ifdef USE_ROUGHNESSMAP\n	uniform sampler2D roughnessMap;\n#endif",
	shadowmap_pars_fragment: "#if NUM_SPOT_LIGHT_COORDS > 0\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#if NUM_SPOT_LIGHT_MAPS > 0\n	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {\n		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );\n		#ifdef USE_REVERSED_DEPTH_BUFFER\n			return step( depth, compare );\n		#else\n			return step( compare, depth );\n		#endif\n	}\n	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {\n		return unpackRGBATo2Half( texture2D( shadow, uv ) );\n	}\n	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {\n		float occlusion = 1.0;\n		vec2 distribution = texture2DDistribution( shadow, uv );\n		#ifdef USE_REVERSED_DEPTH_BUFFER\n			float hard_shadow = step( distribution.x, compare );\n		#else\n			float hard_shadow = step( compare, distribution.x );\n		#endif\n		if ( hard_shadow != 1.0 ) {\n			float distance = compare - distribution.x;\n			float variance = max( 0.00000, distribution.y * distribution.y );\n			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );\n		}\n		return occlusion;\n	}\n	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n		float shadow = 1.0;\n		shadowCoord.xyz /= shadowCoord.w;\n		shadowCoord.z += shadowBias;\n		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n		if ( frustumTest ) {\n		#if defined( SHADOWMAP_TYPE_PCF )\n			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n			float dx0 = - texelSize.x * shadowRadius;\n			float dy0 = - texelSize.y * shadowRadius;\n			float dx1 = + texelSize.x * shadowRadius;\n			float dy1 = + texelSize.y * shadowRadius;\n			float dx2 = dx0 / 2.0;\n			float dy2 = dy0 / 2.0;\n			float dx3 = dx1 / 2.0;\n			float dy3 = dy1 / 2.0;\n			shadow = (\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )\n			) * ( 1.0 / 17.0 );\n		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )\n			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n			float dx = texelSize.x;\n			float dy = texelSize.y;\n			vec2 uv = shadowCoord.xy;\n			vec2 f = fract( uv * shadowMapSize + 0.5 );\n			uv -= f * texelSize;\n			shadow = (\n				texture2DCompare( shadowMap, uv, shadowCoord.z ) +\n				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +\n				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),\n					 f.x ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),\n					 f.x ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),\n					 f.y ) +\n				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),\n					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),\n					 f.y ) +\n				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),\n						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),\n						  f.x ),\n					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),\n						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),\n						  f.x ),\n					 f.y )\n			) * ( 1.0 / 9.0 );\n		#elif defined( SHADOWMAP_TYPE_VSM )\n			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );\n		#else\n			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );\n		#endif\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	vec2 cubeToUV( vec3 v, float texelSizeY ) {\n		vec3 absV = abs( v );\n		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );\n		absV *= scaleToCube;\n		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );\n		vec2 planar = v.xy;\n		float almostATexel = 1.5 * texelSizeY;\n		float almostOne = 1.0 - almostATexel;\n		if ( absV.z >= almostOne ) {\n			if ( v.z > 0.0 )\n				planar.x = 4.0 - v.x;\n		} else if ( absV.x >= almostOne ) {\n			float signX = sign( v.x );\n			planar.x = v.z * signX + 2.0 * signX;\n		} else if ( absV.y >= almostOne ) {\n			float signY = sign( v.y );\n			planar.x = v.x + 2.0 * signY + 2.0;\n			planar.y = v.z * signY - 2.0;\n		}\n		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );\n	}\n	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		\n		float lightToPositionLength = length( lightToPosition );\n		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {\n			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;\n			vec3 bd3D = normalize( lightToPosition );\n			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );\n			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )\n				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;\n				shadow = (\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +\n					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )\n				) * ( 1.0 / 9.0 );\n			#else\n				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );\n			#endif\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n#endif",
	shadowmap_pars_vertex: "#if NUM_SPOT_LIGHT_COORDS > 0\n	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n#endif",
	shadowmap_vertex: "#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )\n	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );\n	vec4 shadowWorldPosition;\n#endif\n#if defined( USE_SHADOWMAP )\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );\n			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );\n			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n#endif\n#if NUM_SPOT_LIGHT_COORDS > 0\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {\n		shadowWorldPosition = worldPosition;\n		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;\n		#endif\n		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;\n	}\n	#pragma unroll_loop_end\n#endif",
	shadowmask_pars_fragment: "float getShadowMask() {\n	float shadow = 1.0;\n	#ifdef USE_SHADOWMAP\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n		directionalLight = directionalLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {\n		spotLight = spotLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n	PointLightShadow pointLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n		pointLight = pointLightShadows[ i ];\n		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#endif\n	return shadow;\n}",
	skinbase_vertex: "#ifdef USE_SKINNING\n	mat4 boneMatX = getBoneMatrix( skinIndex.x );\n	mat4 boneMatY = getBoneMatrix( skinIndex.y );\n	mat4 boneMatZ = getBoneMatrix( skinIndex.z );\n	mat4 boneMatW = getBoneMatrix( skinIndex.w );\n#endif",
	skinning_pars_vertex: "#ifdef USE_SKINNING\n	uniform mat4 bindMatrix;\n	uniform mat4 bindMatrixInverse;\n	uniform highp sampler2D boneTexture;\n	mat4 getBoneMatrix( const in float i ) {\n		int size = textureSize( boneTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n#endif",
	skinning_vertex: "#ifdef USE_SKINNING\n	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );\n	vec4 skinned = vec4( 0.0 );\n	skinned += boneMatX * skinVertex * skinWeight.x;\n	skinned += boneMatY * skinVertex * skinWeight.y;\n	skinned += boneMatZ * skinVertex * skinWeight.z;\n	skinned += boneMatW * skinVertex * skinWeight.w;\n	transformed = ( bindMatrixInverse * skinned ).xyz;\n#endif",
	skinnormal_vertex: "#ifdef USE_SKINNING\n	mat4 skinMatrix = mat4( 0.0 );\n	skinMatrix += skinWeight.x * boneMatX;\n	skinMatrix += skinWeight.y * boneMatY;\n	skinMatrix += skinWeight.z * boneMatZ;\n	skinMatrix += skinWeight.w * boneMatW;\n	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;\n	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;\n	#ifdef USE_TANGENT\n		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;\n	#endif\n#endif",
	specularmap_fragment: "float specularStrength;\n#ifdef USE_SPECULARMAP\n	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );\n	specularStrength = texelSpecular.r;\n#else\n	specularStrength = 1.0;\n#endif",
	specularmap_pars_fragment: "#ifdef USE_SPECULARMAP\n	uniform sampler2D specularMap;\n#endif",
	tonemapping_fragment: "#if defined( TONE_MAPPING )\n	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );\n#endif",
	tonemapping_pars_fragment: "#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\nuniform float toneMappingExposure;\nvec3 LinearToneMapping( vec3 color ) {\n	return saturate( toneMappingExposure * color );\n}\nvec3 ReinhardToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	return saturate( color / ( vec3( 1.0 ) + color ) );\n}\nvec3 CineonToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	color = max( vec3( 0.0 ), color - 0.004 );\n	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );\n}\nvec3 RRTAndODTFit( vec3 v ) {\n	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;\n	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;\n	return a / b;\n}\nvec3 ACESFilmicToneMapping( vec3 color ) {\n	const mat3 ACESInputMat = mat3(\n		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),\n		vec3( 0.04823, 0.01566, 0.83777 )\n	);\n	const mat3 ACESOutputMat = mat3(\n		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),\n		vec3( -0.07367, -0.00605,  1.07602 )\n	);\n	color *= toneMappingExposure / 0.6;\n	color = ACESInputMat * color;\n	color = RRTAndODTFit( color );\n	color = ACESOutputMat * color;\n	return saturate( color );\n}\nconst mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(\n	vec3( 1.6605, - 0.1246, - 0.0182 ),\n	vec3( - 0.5876, 1.1329, - 0.1006 ),\n	vec3( - 0.0728, - 0.0083, 1.1187 )\n);\nconst mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(\n	vec3( 0.6274, 0.0691, 0.0164 ),\n	vec3( 0.3293, 0.9195, 0.0880 ),\n	vec3( 0.0433, 0.0113, 0.8956 )\n);\nvec3 agxDefaultContrastApprox( vec3 x ) {\n	vec3 x2 = x * x;\n	vec3 x4 = x2 * x2;\n	return + 15.5 * x4 * x2\n		- 40.14 * x4 * x\n		+ 31.96 * x4\n		- 6.868 * x2 * x\n		+ 0.4298 * x2\n		+ 0.1191 * x\n		- 0.00232;\n}\nvec3 AgXToneMapping( vec3 color ) {\n	const mat3 AgXInsetMatrix = mat3(\n		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),\n		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),\n		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )\n	);\n	const mat3 AgXOutsetMatrix = mat3(\n		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),\n		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),\n		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )\n	);\n	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;\n	color *= toneMappingExposure;\n	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;\n	color = AgXInsetMatrix * color;\n	color = max( color, 1e-10 );	color = log2( color );\n	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );\n	color = clamp( color, 0.0, 1.0 );\n	color = agxDefaultContrastApprox( color );\n	color = AgXOutsetMatrix * color;\n	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );\n	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;\n	color = clamp( color, 0.0, 1.0 );\n	return color;\n}\nvec3 NeutralToneMapping( vec3 color ) {\n	const float StartCompression = 0.8 - 0.04;\n	const float Desaturation = 0.15;\n	color *= toneMappingExposure;\n	float x = min( color.r, min( color.g, color.b ) );\n	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;\n	color -= offset;\n	float peak = max( color.r, max( color.g, color.b ) );\n	if ( peak < StartCompression ) return color;\n	float d = 1. - StartCompression;\n	float newPeak = 1. - d * d / ( peak + d - StartCompression );\n	color *= newPeak / peak;\n	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );\n	return mix( color, vec3( newPeak ), g );\n}\nvec3 CustomToneMapping( vec3 color ) { return color; }",
	transmission_fragment: "#ifdef USE_TRANSMISSION\n	material.transmission = transmission;\n	material.transmissionAlpha = 1.0;\n	material.thickness = thickness;\n	material.attenuationDistance = attenuationDistance;\n	material.attenuationColor = attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n	#endif\n	vec3 pos = vWorldPosition;\n	vec3 v = normalize( cameraPosition - pos );\n	vec3 n = inverseTransformDirection( normal, viewMatrix );\n	vec4 transmitted = getIBLVolumeRefraction(\n		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,\n		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,\n		material.attenuationColor, material.attenuationDistance );\n	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );\n	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );\n#endif",
	transmission_pars_fragment: "#ifdef USE_TRANSMISSION\n	uniform float transmission;\n	uniform float thickness;\n	uniform float attenuationDistance;\n	uniform vec3 attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		uniform sampler2D transmissionMap;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		uniform sampler2D thicknessMap;\n	#endif\n	uniform vec2 transmissionSamplerSize;\n	uniform sampler2D transmissionSamplerMap;\n	uniform mat4 modelMatrix;\n	uniform mat4 projectionMatrix;\n	varying vec3 vWorldPosition;\n	float w0( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );\n	}\n	float w1( float a ) {\n		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );\n	}\n	float w2( float a ){\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );\n	}\n	float w3( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * a * a );\n	}\n	float g0( float a ) {\n		return w0( a ) + w1( a );\n	}\n	float g1( float a ) {\n		return w2( a ) + w3( a );\n	}\n	float h0( float a ) {\n		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );\n	}\n	float h1( float a ) {\n		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );\n	}\n	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {\n		uv = uv * texelSize.zw + 0.5;\n		vec2 iuv = floor( uv );\n		vec2 fuv = fract( uv );\n		float g0x = g0( fuv.x );\n		float g1x = g1( fuv.x );\n		float h0x = h0( fuv.x );\n		float h1x = h1( fuv.x );\n		float h0y = h0( fuv.y );\n		float h1y = h1( fuv.y );\n		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +\n			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );\n	}\n	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {\n		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );\n		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );\n		vec2 fLodSizeInv = 1.0 / fLodSize;\n		vec2 cLodSizeInv = 1.0 / cLodSize;\n		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );\n		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );\n		return mix( fSample, cSample, fract( lod ) );\n	}\n	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {\n		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );\n		vec3 modelScale;\n		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );\n		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );\n		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );\n		return normalize( refractionVector ) * thickness * modelScale;\n	}\n	float applyIorToRoughness( const in float roughness, const in float ior ) {\n		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );\n	}\n	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {\n		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );\n		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );\n	}\n	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {\n		if ( isinf( attenuationDistance ) ) {\n			return vec3( 1.0 );\n		} else {\n			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;\n			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;\n		}\n	}\n	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,\n		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,\n		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,\n		const in vec3 attenuationColor, const in float attenuationDistance ) {\n		vec4 transmittedLight;\n		vec3 transmittance;\n		#ifdef USE_DISPERSION\n			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;\n			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );\n			for ( int i = 0; i < 3; i ++ ) {\n				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );\n				vec3 refractedRayExit = position + transmissionRay;\n				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n				vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n				refractionCoords += 1.0;\n				refractionCoords /= 2.0;\n				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );\n				transmittedLight[ i ] = transmissionSample[ i ];\n				transmittedLight.a += transmissionSample.a;\n				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];\n			}\n			transmittedLight.a /= 3.0;\n		#else\n			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );\n			vec3 refractedRayExit = position + transmissionRay;\n			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n			vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n			refractionCoords += 1.0;\n			refractionCoords /= 2.0;\n			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );\n			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );\n		#endif\n		vec3 attenuatedColor = transmittance * transmittedLight.rgb;\n		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );\n		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;\n		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );\n	}\n#endif",
	uv_pars_fragment: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_pars_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	uniform mat3 mapTransform;\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform mat3 alphaMapTransform;\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	uniform mat3 lightMapTransform;\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	uniform mat3 aoMapTransform;\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	uniform mat3 bumpMapTransform;\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	uniform mat3 normalMapTransform;\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	uniform mat3 displacementMapTransform;\n	varying vec2 vDisplacementMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	uniform mat3 emissiveMapTransform;\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	uniform mat3 metalnessMapTransform;\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	uniform mat3 roughnessMapTransform;\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	uniform mat3 anisotropyMapTransform;\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	uniform mat3 clearcoatMapTransform;\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform mat3 clearcoatNormalMapTransform;\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform mat3 clearcoatRoughnessMapTransform;\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	uniform mat3 sheenColorMapTransform;\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	uniform mat3 sheenRoughnessMapTransform;\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	uniform mat3 iridescenceMapTransform;\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform mat3 iridescenceThicknessMapTransform;\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	uniform mat3 specularMapTransform;\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	uniform mat3 specularColorMapTransform;\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	uniform mat3 specularIntensityMapTransform;\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	vUv = vec3( uv, 1 ).xy;\n#endif\n#ifdef USE_MAP\n	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ALPHAMAP\n	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_LIGHTMAP\n	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_AOMAP\n	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_BUMPMAP\n	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_NORMALMAP\n	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_EMISSIVEMAP\n	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_METALNESSMAP\n	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOATMAP\n	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULARMAP\n	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_THICKNESSMAP\n	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;\n#endif",
	worldpos_vertex: "#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\n	vec4 worldPosition = vec4( transformed, 1.0 );\n	#ifdef USE_BATCHING\n		worldPosition = batchingMatrix * worldPosition;\n	#endif\n	#ifdef USE_INSTANCING\n		worldPosition = instanceMatrix * worldPosition;\n	#endif\n	worldPosition = modelMatrix * worldPosition;\n#endif",
	background_vert: "varying vec2 vUv;\nuniform mat3 uvTransform;\nvoid main() {\n	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	gl_Position = vec4( position.xy, 1.0, 1.0 );\n}",
	background_frag: "uniform sampler2D t2D;\nuniform float backgroundIntensity;\nvarying vec2 vUv;\nvoid main() {\n	vec4 texColor = texture2D( t2D, vUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	backgroundCube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	backgroundCube_frag: "#ifdef ENVMAP_TYPE_CUBE\n	uniform samplerCube envMap;\n#elif defined( ENVMAP_TYPE_CUBE_UV )\n	uniform sampler2D envMap;\n#endif\nuniform float flipEnvMap;\nuniform float backgroundBlurriness;\nuniform float backgroundIntensity;\nuniform mat3 backgroundRotation;\nvarying vec3 vWorldDirection;\n#include <cube_uv_reflection_fragment>\nvoid main() {\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );\n	#elif defined( ENVMAP_TYPE_CUBE_UV )\n		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );\n	#else\n		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	cube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	cube_frag: "uniform samplerCube tCube;\nuniform float tFlip;\nuniform float opacity;\nvarying vec3 vWorldDirection;\nvoid main() {\n	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );\n	gl_FragColor = texColor;\n	gl_FragColor.a *= opacity;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	depth_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vHighPrecisionZW = gl_Position.zw;\n}",
	depth_frag: "#if DEPTH_PACKING == 3200\n	uniform float opacity;\n#endif\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#if DEPTH_PACKING == 3200\n		diffuseColor.a = opacity;\n	#endif\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <logdepthbuf_fragment>\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];\n	#else\n		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;\n	#endif\n	#if DEPTH_PACKING == 3200\n		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );\n	#elif DEPTH_PACKING == 3201\n		gl_FragColor = packDepthToRGBA( fragCoordZ );\n	#elif DEPTH_PACKING == 3202\n		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );\n	#elif DEPTH_PACKING == 3203\n		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );\n	#endif\n}",
	distanceRGBA_vert: "#define DISTANCE\nvarying vec3 vWorldPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <worldpos_vertex>\n	#include <clipping_planes_vertex>\n	vWorldPosition = worldPosition.xyz;\n}",
	distanceRGBA_frag: "#define DISTANCE\nuniform vec3 referencePosition;\nuniform float nearDistance;\nuniform float farDistance;\nvarying vec3 vWorldPosition;\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main () {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	float dist = length( vWorldPosition - referencePosition );\n	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );\n	dist = saturate( dist );\n	gl_FragColor = packDepthToRGBA( dist );\n}",
	equirect_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n}",
	equirect_frag: "uniform sampler2D tEquirect;\nvarying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vec3 direction = normalize( vWorldDirection );\n	vec2 sampleUV = equirectUv( direction );\n	gl_FragColor = texture2D( tEquirect, sampleUV );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	linedashed_vert: "uniform float scale;\nattribute float lineDistance;\nvarying float vLineDistance;\n#include <common>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	vLineDistance = scale * lineDistance;\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	linedashed_frag: "uniform vec3 diffuse;\nuniform float opacity;\nuniform float dashSize;\nuniform float totalSize;\nvarying float vLineDistance;\n#include <common>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	if ( mod( vLineDistance, totalSize ) > dashSize ) {\n		discard;\n	}\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	meshbasic_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinbase_vertex>\n		#include <skinnormal_vertex>\n		#include <defaultnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <fog_vertex>\n}",
	meshbasic_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n#endif\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;\n	#else\n		reflectedLight.indirectDiffuse += vec3( 1.0 );\n	#endif\n	#include <aomap_fragment>\n	reflectedLight.indirectDiffuse *= diffuseColor.rgb;\n	vec3 outgoingLight = reflectedLight.indirectDiffuse;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshlambert_vert: "#define LAMBERT\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshlambert_frag: "#define LAMBERT\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_lambert_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_lambert_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshmatcap_vert: "#define MATCAP\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n	vViewPosition = - mvPosition.xyz;\n}",
	meshmatcap_frag: "#define MATCAP\nuniform vec3 diffuse;\nuniform float opacity;\nuniform sampler2D matcap;\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	vec3 viewDir = normalize( vViewPosition );\n	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );\n	vec3 y = cross( viewDir, x );\n	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;\n	#ifdef USE_MATCAP\n		vec4 matcapColor = texture2D( matcap, uv );\n	#else\n		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );\n	#endif\n	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshnormal_vert: "#define NORMAL\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	vViewPosition = - mvPosition.xyz;\n#endif\n}",
	meshnormal_frag: "#define NORMAL\nuniform float opacity;\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <packing>\n#include <uv_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );\n	#ifdef OPAQUE\n		gl_FragColor.a = 1.0;\n	#endif\n}",
	meshphong_vert: "#define PHONG\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshphong_frag: "#define PHONG\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform vec3 specular;\nuniform float shininess;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_phong_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_phong_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshphysical_vert: "#define STANDARD\nvarying vec3 vViewPosition;\n#ifdef USE_TRANSMISSION\n	varying vec3 vWorldPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n#ifdef USE_TRANSMISSION\n	vWorldPosition = worldPosition.xyz;\n#endif\n}",
	meshphysical_frag: "#define STANDARD\n#ifdef PHYSICAL\n	#define IOR\n	#define USE_SPECULAR\n#endif\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float roughness;\nuniform float metalness;\nuniform float opacity;\n#ifdef IOR\n	uniform float ior;\n#endif\n#ifdef USE_SPECULAR\n	uniform float specularIntensity;\n	uniform vec3 specularColor;\n	#ifdef USE_SPECULAR_COLORMAP\n		uniform sampler2D specularColorMap;\n	#endif\n	#ifdef USE_SPECULAR_INTENSITYMAP\n		uniform sampler2D specularIntensityMap;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT\n	uniform float clearcoat;\n	uniform float clearcoatRoughness;\n#endif\n#ifdef USE_DISPERSION\n	uniform float dispersion;\n#endif\n#ifdef USE_IRIDESCENCE\n	uniform float iridescence;\n	uniform float iridescenceIOR;\n	uniform float iridescenceThicknessMinimum;\n	uniform float iridescenceThicknessMaximum;\n#endif\n#ifdef USE_SHEEN\n	uniform vec3 sheenColor;\n	uniform float sheenRoughness;\n	#ifdef USE_SHEEN_COLORMAP\n		uniform sampler2D sheenColorMap;\n	#endif\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		uniform sampler2D sheenRoughnessMap;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	uniform vec2 anisotropyVector;\n	#ifdef USE_ANISOTROPYMAP\n		uniform sampler2D anisotropyMap;\n	#endif\n#endif\nvarying vec3 vViewPosition;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <iridescence_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_physical_pars_fragment>\n#include <transmission_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <clearcoat_pars_fragment>\n#include <iridescence_pars_fragment>\n#include <roughnessmap_pars_fragment>\n#include <metalnessmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <roughnessmap_fragment>\n	#include <metalnessmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <clearcoat_normal_fragment_begin>\n	#include <clearcoat_normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_physical_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;\n	#include <transmission_fragment>\n	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;\n	#ifdef USE_SHEEN\n		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );\n		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;\n	#endif\n	#ifdef USE_CLEARCOAT\n		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );\n		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );\n		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;\n	#endif\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshtoon_vert: "#define TOON\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshtoon_frag: "#define TOON\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <gradientmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_toon_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_toon_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	points_vert: "uniform float size;\nuniform float scale;\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n#ifdef USE_POINTS_UV\n	varying vec2 vUv;\n	uniform mat3 uvTransform;\n#endif\nvoid main() {\n	#ifdef USE_POINTS_UV\n		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	#endif\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	gl_PointSize = size;\n	#ifdef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );\n	#endif\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <fog_vertex>\n}",
	points_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <color_pars_fragment>\n#include <map_particle_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_particle_fragment>\n	#include <color_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	shadow_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <shadowmap_pars_vertex>\nvoid main() {\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	shadow_frag: "uniform vec3 color;\nuniform float opacity;\n#include <common>\n#include <packing>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <logdepthbuf_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\nvoid main() {\n	#include <logdepthbuf_fragment>\n	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n}",
	sprite_vert: "uniform float rotation;\nuniform vec2 center;\n#include <common>\n#include <uv_pars_vertex>\n#include <fog_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	vec4 mvPosition = modelViewMatrix[ 3 ];\n	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );\n	#ifndef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) scale *= - mvPosition.z;\n	#endif\n	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;\n	vec2 rotatedPosition;\n	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;\n	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;\n	mvPosition.xy += rotatedPosition;\n	gl_Position = projectionMatrix * mvPosition;\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	sprite_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n}"
}, Z = {
	common: {
		diffuse: { value: /*@__PURE__*/ new Y(16777215) },
		opacity: { value: 1 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new G() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new G() },
		alphaTest: { value: 0 }
	},
	specularmap: {
		specularMap: { value: null },
		specularMapTransform: { value: /*@__PURE__*/ new G() }
	},
	envmap: {
		envMap: { value: null },
		envMapRotation: { value: /*@__PURE__*/ new G() },
		flipEnvMap: { value: -1 },
		reflectivity: { value: 1 },
		ior: { value: 1.5 },
		refractionRatio: { value: .98 }
	},
	aomap: {
		aoMap: { value: null },
		aoMapIntensity: { value: 1 },
		aoMapTransform: { value: /*@__PURE__*/ new G() }
	},
	lightmap: {
		lightMap: { value: null },
		lightMapIntensity: { value: 1 },
		lightMapTransform: { value: /*@__PURE__*/ new G() }
	},
	bumpmap: {
		bumpMap: { value: null },
		bumpMapTransform: { value: /*@__PURE__*/ new G() },
		bumpScale: { value: 1 }
	},
	normalmap: {
		normalMap: { value: null },
		normalMapTransform: { value: /*@__PURE__*/ new G() },
		normalScale: { value: /*@__PURE__*/ new H(1, 1) }
	},
	displacementmap: {
		displacementMap: { value: null },
		displacementMapTransform: { value: /*@__PURE__*/ new G() },
		displacementScale: { value: 1 },
		displacementBias: { value: 0 }
	},
	emissivemap: {
		emissiveMap: { value: null },
		emissiveMapTransform: { value: /*@__PURE__*/ new G() }
	},
	metalnessmap: {
		metalnessMap: { value: null },
		metalnessMapTransform: { value: /*@__PURE__*/ new G() }
	},
	roughnessmap: {
		roughnessMap: { value: null },
		roughnessMapTransform: { value: /*@__PURE__*/ new G() }
	},
	gradientmap: { gradientMap: { value: null } },
	fog: {
		fogDensity: { value: 25e-5 },
		fogNear: { value: 1 },
		fogFar: { value: 2e3 },
		fogColor: { value: /*@__PURE__*/ new Y(16777215) }
	},
	lights: {
		ambientLightColor: { value: [] },
		lightProbe: { value: [] },
		directionalLights: {
			value: [],
			properties: {
				direction: {},
				color: {}
			}
		},
		directionalLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		directionalShadowMap: { value: [] },
		directionalShadowMatrix: { value: [] },
		spotLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				direction: {},
				distance: {},
				coneCos: {},
				penumbraCos: {},
				decay: {}
			}
		},
		spotLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		spotLightMap: { value: [] },
		spotShadowMap: { value: [] },
		spotLightMatrix: { value: [] },
		pointLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				decay: {},
				distance: {}
			}
		},
		pointLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {},
				shadowCameraNear: {},
				shadowCameraFar: {}
			}
		},
		pointShadowMap: { value: [] },
		pointShadowMatrix: { value: [] },
		hemisphereLights: {
			value: [],
			properties: {
				direction: {},
				skyColor: {},
				groundColor: {}
			}
		},
		rectAreaLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				width: {},
				height: {}
			}
		},
		ltc_1: { value: null },
		ltc_2: { value: null }
	},
	points: {
		diffuse: { value: /*@__PURE__*/ new Y(16777215) },
		opacity: { value: 1 },
		size: { value: 1 },
		scale: { value: 1 },
		map: { value: null },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new G() },
		alphaTest: { value: 0 },
		uvTransform: { value: /*@__PURE__*/ new G() }
	},
	sprite: {
		diffuse: { value: /*@__PURE__*/ new Y(16777215) },
		opacity: { value: 1 },
		center: { value: /*@__PURE__*/ new H(.5, .5) },
		rotation: { value: 0 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new G() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new G() },
		alphaTest: { value: 0 }
	}
}, hs = {
	basic: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.specularmap,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.fog
		]),
		vertexShader: X.meshbasic_vert,
		fragmentShader: X.meshbasic_frag
	},
	lambert: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.specularmap,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.fog,
			Z.lights,
			{ emissive: { value: /*@__PURE__*/ new Y(0) } }
		]),
		vertexShader: X.meshlambert_vert,
		fragmentShader: X.meshlambert_frag
	},
	phong: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.specularmap,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.fog,
			Z.lights,
			{
				emissive: { value: /*@__PURE__*/ new Y(0) },
				specular: { value: /*@__PURE__*/ new Y(1118481) },
				shininess: { value: 30 }
			}
		]),
		vertexShader: X.meshphong_vert,
		fragmentShader: X.meshphong_frag
	},
	standard: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.roughnessmap,
			Z.metalnessmap,
			Z.fog,
			Z.lights,
			{
				emissive: { value: /*@__PURE__*/ new Y(0) },
				roughness: { value: 1 },
				metalness: { value: 0 },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: X.meshphysical_vert,
		fragmentShader: X.meshphysical_frag
	},
	toon: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.gradientmap,
			Z.fog,
			Z.lights,
			{ emissive: { value: /*@__PURE__*/ new Y(0) } }
		]),
		vertexShader: X.meshtoon_vert,
		fragmentShader: X.meshtoon_frag
	},
	matcap: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.fog,
			{ matcap: { value: null } }
		]),
		vertexShader: X.meshmatcap_vert,
		fragmentShader: X.meshmatcap_frag
	},
	points: {
		uniforms: /*@__PURE__*/ Yn([Z.points, Z.fog]),
		vertexShader: X.points_vert,
		fragmentShader: X.points_frag
	},
	dashed: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.fog,
			{
				scale: { value: 1 },
				dashSize: { value: 1 },
				totalSize: { value: 2 }
			}
		]),
		vertexShader: X.linedashed_vert,
		fragmentShader: X.linedashed_frag
	},
	depth: {
		uniforms: /*@__PURE__*/ Yn([Z.common, Z.displacementmap]),
		vertexShader: X.depth_vert,
		fragmentShader: X.depth_frag
	},
	normal: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			{ opacity: { value: 1 } }
		]),
		vertexShader: X.meshnormal_vert,
		fragmentShader: X.meshnormal_frag
	},
	sprite: {
		uniforms: /*@__PURE__*/ Yn([Z.sprite, Z.fog]),
		vertexShader: X.sprite_vert,
		fragmentShader: X.sprite_frag
	},
	background: {
		uniforms: {
			uvTransform: { value: /*@__PURE__*/ new G() },
			t2D: { value: null },
			backgroundIntensity: { value: 1 }
		},
		vertexShader: X.background_vert,
		fragmentShader: X.background_frag
	},
	backgroundCube: {
		uniforms: {
			envMap: { value: null },
			flipEnvMap: { value: -1 },
			backgroundBlurriness: { value: 0 },
			backgroundIntensity: { value: 1 },
			backgroundRotation: { value: /*@__PURE__*/ new G() }
		},
		vertexShader: X.backgroundCube_vert,
		fragmentShader: X.backgroundCube_frag
	},
	cube: {
		uniforms: {
			tCube: { value: null },
			tFlip: { value: -1 },
			opacity: { value: 1 }
		},
		vertexShader: X.cube_vert,
		fragmentShader: X.cube_frag
	},
	equirect: {
		uniforms: { tEquirect: { value: null } },
		vertexShader: X.equirect_vert,
		fragmentShader: X.equirect_frag
	},
	distanceRGBA: {
		uniforms: /*@__PURE__*/ Yn([
			Z.common,
			Z.displacementmap,
			{
				referencePosition: { value: /*@__PURE__*/ new W() },
				nearDistance: { value: 1 },
				farDistance: { value: 1e3 }
			}
		]),
		vertexShader: X.distanceRGBA_vert,
		fragmentShader: X.distanceRGBA_frag
	},
	shadow: {
		uniforms: /*@__PURE__*/ Yn([
			Z.lights,
			Z.fog,
			{
				color: { value: /*@__PURE__*/ new Y(0) },
				opacity: { value: 1 }
			}
		]),
		vertexShader: X.shadow_vert,
		fragmentShader: X.shadow_frag
	}
};
hs.physical = {
	uniforms: /*@__PURE__*/ Yn([hs.standard.uniforms, {
		clearcoat: { value: 0 },
		clearcoatMap: { value: null },
		clearcoatMapTransform: { value: /*@__PURE__*/ new G() },
		clearcoatNormalMap: { value: null },
		clearcoatNormalMapTransform: { value: /*@__PURE__*/ new G() },
		clearcoatNormalScale: { value: /*@__PURE__*/ new H(1, 1) },
		clearcoatRoughness: { value: 0 },
		clearcoatRoughnessMap: { value: null },
		clearcoatRoughnessMapTransform: { value: /*@__PURE__*/ new G() },
		dispersion: { value: 0 },
		iridescence: { value: 0 },
		iridescenceMap: { value: null },
		iridescenceMapTransform: { value: /*@__PURE__*/ new G() },
		iridescenceIOR: { value: 1.3 },
		iridescenceThicknessMinimum: { value: 100 },
		iridescenceThicknessMaximum: { value: 400 },
		iridescenceThicknessMap: { value: null },
		iridescenceThicknessMapTransform: { value: /*@__PURE__*/ new G() },
		sheen: { value: 0 },
		sheenColor: { value: /*@__PURE__*/ new Y(0) },
		sheenColorMap: { value: null },
		sheenColorMapTransform: { value: /*@__PURE__*/ new G() },
		sheenRoughness: { value: 1 },
		sheenRoughnessMap: { value: null },
		sheenRoughnessMapTransform: { value: /*@__PURE__*/ new G() },
		transmission: { value: 0 },
		transmissionMap: { value: null },
		transmissionMapTransform: { value: /*@__PURE__*/ new G() },
		transmissionSamplerSize: { value: /*@__PURE__*/ new H() },
		transmissionSamplerMap: { value: null },
		thickness: { value: 0 },
		thicknessMap: { value: null },
		thicknessMapTransform: { value: /*@__PURE__*/ new G() },
		attenuationDistance: { value: 0 },
		attenuationColor: { value: /*@__PURE__*/ new Y(0) },
		specularColor: { value: /*@__PURE__*/ new Y(1, 1, 1) },
		specularColorMap: { value: null },
		specularColorMapTransform: { value: /*@__PURE__*/ new G() },
		specularIntensity: { value: 1 },
		specularIntensityMap: { value: null },
		specularIntensityMapTransform: { value: /*@__PURE__*/ new G() },
		anisotropyVector: { value: /*@__PURE__*/ new H() },
		anisotropyMap: { value: null },
		anisotropyMapTransform: { value: /*@__PURE__*/ new G() }
	}]),
	vertexShader: X.meshphysical_vert,
	fragmentShader: X.meshphysical_frag
};
var gs = {
	r: 0,
	b: 0,
	g: 0
}, _s = /*@__PURE__*/ new Et(), vs = /*@__PURE__*/ new J();
function ys(e, t, n, r, i, a, o) {
	let s = new Y(0), c = a === !0 ? 0 : 1, l, u, d = null, f = 0, p = null;
	function m(e) {
		let r = e.isScene === !0 ? e.background : null;
		return r && r.isTexture && (r = (e.backgroundBlurriness > 0 ? n : t).get(r)), r;
	}
	function h(t) {
		let n = !1, i = m(t);
		i === null ? _(s, c) : i && i.isColor && (_(i, 1), n = !0);
		let a = e.xr.getEnvironmentBlendMode();
		a === "additive" ? r.buffers.color.setClear(0, 0, 0, 1, o) : a === "alpha-blend" && r.buffers.color.setClear(0, 0, 0, 0, o), (e.autoClear || n) && (r.buffers.depth.setTest(!0), r.buffers.depth.setMask(!0), r.buffers.color.setMask(!0), e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil));
	}
	function g(t, n) {
		let r = m(n);
		r && (r.isCubeTexture || r.mapping === 306) ? (u === void 0 && (u = new Wn(new qn(1, 1, 1), new tr({
			name: "BackgroundCubeMaterial",
			uniforms: Jn(hs.backgroundCube.uniforms),
			vertexShader: hs.backgroundCube.vertexShader,
			fragmentShader: hs.backgroundCube.fragmentShader,
			side: 1,
			depthTest: !1,
			depthWrite: !1,
			fog: !1,
			allowOverride: !1
		})), u.geometry.deleteAttribute("normal"), u.geometry.deleteAttribute("uv"), u.onBeforeRender = function(e, t, n) {
			this.matrixWorld.copyPosition(n.matrixWorld);
		}, Object.defineProperty(u.material, "envMap", { get: function() {
			return this.uniforms.envMap.value;
		} }), i.update(u)), _s.copy(n.backgroundRotation), _s.x *= -1, _s.y *= -1, _s.z *= -1, r.isCubeTexture && r.isRenderTargetTexture === !1 && (_s.y *= -1, _s.z *= -1), u.material.uniforms.envMap.value = r, u.material.uniforms.flipEnvMap.value = r.isCubeTexture && r.isRenderTargetTexture === !1 ? -1 : 1, u.material.uniforms.backgroundBlurriness.value = n.backgroundBlurriness, u.material.uniforms.backgroundIntensity.value = n.backgroundIntensity, u.material.uniforms.backgroundRotation.value.setFromMatrix4(vs.makeRotationFromEuler(_s)), u.material.toneMapped = K.getTransfer(r.colorSpace) !== O, (d !== r || f !== r.version || p !== e.toneMapping) && (u.material.needsUpdate = !0, d = r, f = r.version, p = e.toneMapping), u.layers.enableAll(), t.unshift(u, u.geometry, u.material, 0, 0, null)) : r && r.isTexture && (l === void 0 && (l = new Wn(new Va(2, 2), new tr({
			name: "BackgroundMaterial",
			uniforms: Jn(hs.background.uniforms),
			vertexShader: hs.background.vertexShader,
			fragmentShader: hs.background.fragmentShader,
			side: 0,
			depthTest: !1,
			depthWrite: !1,
			fog: !1,
			allowOverride: !1
		})), l.geometry.deleteAttribute("normal"), Object.defineProperty(l.material, "map", { get: function() {
			return this.uniforms.t2D.value;
		} }), i.update(l)), l.material.uniforms.t2D.value = r, l.material.uniforms.backgroundIntensity.value = n.backgroundIntensity, l.material.toneMapped = K.getTransfer(r.colorSpace) !== O, r.matrixAutoUpdate === !0 && r.updateMatrix(), l.material.uniforms.uvTransform.value.copy(r.matrix), (d !== r || f !== r.version || p !== e.toneMapping) && (l.material.needsUpdate = !0, d = r, f = r.version, p = e.toneMapping), l.layers.enableAll(), t.unshift(l, l.geometry, l.material, 0, 0, null));
	}
	function _(t, n) {
		t.getRGB(gs, Zn(e)), r.buffers.color.setClear(gs.r, gs.g, gs.b, n, o);
	}
	function v() {
		u !== void 0 && (u.geometry.dispose(), u.material.dispose(), u = void 0), l !== void 0 && (l.geometry.dispose(), l.material.dispose(), l = void 0);
	}
	return {
		getClearColor: function() {
			return s;
		},
		setClearColor: function(e, t = 1) {
			s.set(e), c = t, _(s, c);
		},
		getClearAlpha: function() {
			return c;
		},
		setClearAlpha: function(e) {
			c = e, _(s, c);
		},
		render: h,
		addToRenderList: g,
		dispose: v
	};
}
function bs(e, t) {
	let n = e.getParameter(e.MAX_VERTEX_ATTRIBS), r = {}, i = f(null), a = i, o = !1;
	function s(n, r, i, s, c) {
		let u = !1, f = d(s, i, r);
		a !== f && (a = f, l(a.object)), u = p(n, s, i, c), u && m(n, s, i, c), c !== null && t.update(c, e.ELEMENT_ARRAY_BUFFER), (u || o) && (o = !1, b(n, r, i, s), c !== null && e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, t.get(c).buffer));
	}
	function c() {
		return e.createVertexArray();
	}
	function l(t) {
		return e.bindVertexArray(t);
	}
	function u(t) {
		return e.deleteVertexArray(t);
	}
	function d(e, t, n) {
		let i = n.wireframe === !0, a = r[e.id];
		a === void 0 && (a = {}, r[e.id] = a);
		let o = a[t.id];
		o === void 0 && (o = {}, a[t.id] = o);
		let s = o[i];
		return s === void 0 && (s = f(c()), o[i] = s), s;
	}
	function f(e) {
		let t = [], r = [], i = [];
		for (let e = 0; e < n; e++) t[e] = 0, r[e] = 0, i[e] = 0;
		return {
			geometry: null,
			program: null,
			wireframe: !1,
			newAttributes: t,
			enabledAttributes: r,
			attributeDivisors: i,
			object: e,
			attributes: {},
			index: null
		};
	}
	function p(e, t, n, r) {
		let i = a.attributes, o = t.attributes, s = 0, c = n.getAttributes();
		for (let t in c) if (c[t].location >= 0) {
			let n = i[t], r = o[t];
			if (r === void 0 && (t === "instanceMatrix" && e.instanceMatrix && (r = e.instanceMatrix), t === "instanceColor" && e.instanceColor && (r = e.instanceColor)), n === void 0 || n.attribute !== r || r && n.data !== r.data) return !0;
			s++;
		}
		return a.attributesNum !== s || a.index !== r;
	}
	function m(e, t, n, r) {
		let i = {}, o = t.attributes, s = 0, c = n.getAttributes();
		for (let t in c) if (c[t].location >= 0) {
			let n = o[t];
			n === void 0 && (t === "instanceMatrix" && e.instanceMatrix && (n = e.instanceMatrix), t === "instanceColor" && e.instanceColor && (n = e.instanceColor));
			let r = {};
			r.attribute = n, n && n.data && (r.data = n.data), i[t] = r, s++;
		}
		a.attributes = i, a.attributesNum = s, a.index = r;
	}
	function h() {
		let e = a.newAttributes;
		for (let t = 0, n = e.length; t < n; t++) e[t] = 0;
	}
	function g(e) {
		_(e, 0);
	}
	function _(t, n) {
		let r = a.newAttributes, i = a.enabledAttributes, o = a.attributeDivisors;
		r[t] = 1, i[t] === 0 && (e.enableVertexAttribArray(t), i[t] = 1), o[t] !== n && (e.vertexAttribDivisor(t, n), o[t] = n);
	}
	function v() {
		let t = a.newAttributes, n = a.enabledAttributes;
		for (let r = 0, i = n.length; r < i; r++) n[r] !== t[r] && (e.disableVertexAttribArray(r), n[r] = 0);
	}
	function y(t, n, r, i, a, o, s) {
		s === !0 ? e.vertexAttribIPointer(t, n, r, a, o) : e.vertexAttribPointer(t, n, r, i, a, o);
	}
	function b(n, r, i, a) {
		h();
		let o = a.attributes, s = i.getAttributes(), c = r.defaultAttributeValues;
		for (let r in s) {
			let i = s[r];
			if (i.location >= 0) {
				let s = o[r];
				if (s === void 0 && (r === "instanceMatrix" && n.instanceMatrix && (s = n.instanceMatrix), r === "instanceColor" && n.instanceColor && (s = n.instanceColor)), s !== void 0) {
					let r = s.normalized, o = s.itemSize, c = t.get(s);
					if (c === void 0) continue;
					let l = c.buffer, u = c.type, d = c.bytesPerElement, f = u === e.INT || u === e.UNSIGNED_INT || s.gpuType === 1013;
					if (s.isInterleavedBufferAttribute) {
						let t = s.data, c = t.stride, p = s.offset;
						if (t.isInstancedInterleavedBuffer) {
							for (let e = 0; e < i.locationSize; e++) _(i.location + e, t.meshPerAttribute);
							n.isInstancedMesh !== !0 && a._maxInstanceCount === void 0 && (a._maxInstanceCount = t.meshPerAttribute * t.count);
						} else for (let e = 0; e < i.locationSize; e++) g(i.location + e);
						e.bindBuffer(e.ARRAY_BUFFER, l);
						for (let e = 0; e < i.locationSize; e++) y(i.location + e, o / i.locationSize, u, r, c * d, (p + o / i.locationSize * e) * d, f);
					} else {
						if (s.isInstancedBufferAttribute) {
							for (let e = 0; e < i.locationSize; e++) _(i.location + e, s.meshPerAttribute);
							n.isInstancedMesh !== !0 && a._maxInstanceCount === void 0 && (a._maxInstanceCount = s.meshPerAttribute * s.count);
						} else for (let e = 0; e < i.locationSize; e++) g(i.location + e);
						e.bindBuffer(e.ARRAY_BUFFER, l);
						for (let e = 0; e < i.locationSize; e++) y(i.location + e, o / i.locationSize, u, r, o * d, o / i.locationSize * e * d, f);
					}
				} else if (c !== void 0) {
					let t = c[r];
					if (t !== void 0) switch (t.length) {
						case 2:
							e.vertexAttrib2fv(i.location, t);
							break;
						case 3:
							e.vertexAttrib3fv(i.location, t);
							break;
						case 4:
							e.vertexAttrib4fv(i.location, t);
							break;
						default: e.vertexAttrib1fv(i.location, t);
					}
				}
			}
		}
		v();
	}
	function x() {
		w();
		for (let e in r) {
			let t = r[e];
			for (let e in t) {
				let n = t[e];
				for (let e in n) u(n[e].object), delete n[e];
				delete t[e];
			}
			delete r[e];
		}
	}
	function S(e) {
		if (r[e.id] === void 0) return;
		let t = r[e.id];
		for (let e in t) {
			let n = t[e];
			for (let e in n) u(n[e].object), delete n[e];
			delete t[e];
		}
		delete r[e.id];
	}
	function C(e) {
		for (let t in r) {
			let n = r[t];
			if (n[e.id] === void 0) continue;
			let i = n[e.id];
			for (let e in i) u(i[e].object), delete i[e];
			delete n[e.id];
		}
	}
	function w() {
		T(), o = !0, a !== i && (a = i, l(a.object));
	}
	function T() {
		i.geometry = null, i.program = null, i.wireframe = !1;
	}
	return {
		setup: s,
		reset: w,
		resetDefaultState: T,
		dispose: x,
		releaseStatesOfGeometry: S,
		releaseStatesOfProgram: C,
		initAttributes: h,
		enableAttribute: g,
		disableUnusedAttributes: v
	};
}
function xs(e, t, n) {
	let r;
	function i(e) {
		r = e;
	}
	function a(t, i) {
		e.drawArrays(r, t, i), n.update(i, r, 1);
	}
	function o(t, i, a) {
		a !== 0 && (e.drawArraysInstanced(r, t, i, a), n.update(i, r, a));
	}
	function s(e, i, a) {
		if (a === 0) return;
		t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r, e, 0, i, 0, a);
		let o = 0;
		for (let e = 0; e < a; e++) o += i[e];
		n.update(o, r, 1);
	}
	function c(e, i, a, s) {
		if (a === 0) return;
		let c = t.get("WEBGL_multi_draw");
		if (c === null) for (let t = 0; t < e.length; t++) o(e[t], i[t], s[t]);
		else {
			c.multiDrawArraysInstancedWEBGL(r, e, 0, i, 0, s, 0, a);
			let t = 0;
			for (let e = 0; e < a; e++) t += i[e] * s[e];
			n.update(t, r, 1);
		}
	}
	this.setMode = i, this.render = a, this.renderInstances = o, this.renderMultiDraw = s, this.renderMultiDrawInstances = c;
}
function Ss(e, t, n, r) {
	let i;
	function a() {
		if (i !== void 0) return i;
		if (t.has("EXT_texture_filter_anisotropic") === !0) {
			let n = t.get("EXT_texture_filter_anisotropic");
			i = e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
		} else i = 0;
		return i;
	}
	function o(t) {
		return t === 1023 || r.convert(t) === e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT);
	}
	function s(n) {
		let i = n === 1016 && (t.has("EXT_color_buffer_half_float") || t.has("EXT_color_buffer_float"));
		return !(n !== 1009 && r.convert(n) !== e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE) && n !== 1015 && !i);
	}
	function c(t) {
		if (t === "highp") {
			if (e.getShaderPrecisionFormat(e.VERTEX_SHADER, e.HIGH_FLOAT).precision > 0 && e.getShaderPrecisionFormat(e.FRAGMENT_SHADER, e.HIGH_FLOAT).precision > 0) return "highp";
			t = "mediump";
		}
		return t === "mediump" && e.getShaderPrecisionFormat(e.VERTEX_SHADER, e.MEDIUM_FLOAT).precision > 0 && e.getShaderPrecisionFormat(e.FRAGMENT_SHADER, e.MEDIUM_FLOAT).precision > 0 ? "mediump" : "lowp";
	}
	let l = n.precision === void 0 ? "highp" : n.precision, u = c(l);
	u !== l && (console.warn("THREE.WebGLRenderer:", l, "not supported, using", u, "instead."), l = u);
	let d = n.logarithmicDepthBuffer === !0, f = n.reversedDepthBuffer === !0 && t.has("EXT_clip_control"), p = e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS), m = e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS), h = e.getParameter(e.MAX_TEXTURE_SIZE), g = e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE), _ = e.getParameter(e.MAX_VERTEX_ATTRIBS), v = e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS), y = e.getParameter(e.MAX_VARYING_VECTORS), b = e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS), x = m > 0, S = e.getParameter(e.MAX_SAMPLES);
	return {
		isWebGL2: !0,
		getMaxAnisotropy: a,
		getMaxPrecision: c,
		textureFormatReadable: o,
		textureTypeReadable: s,
		precision: l,
		logarithmicDepthBuffer: d,
		reversedDepthBuffer: f,
		maxTextures: p,
		maxVertexTextures: m,
		maxTextureSize: h,
		maxCubemapSize: g,
		maxAttributes: _,
		maxVertexUniforms: v,
		maxVaryings: y,
		maxFragmentUniforms: b,
		vertexTextures: x,
		maxSamples: S
	};
}
function Cs(e) {
	let t = this, n = null, r = 0, i = !1, a = !1, o = new qr(), s = new G(), c = {
		value: null,
		needsUpdate: !1
	};
	this.uniform = c, this.numPlanes = 0, this.numIntersection = 0, this.init = function(e, t) {
		let n = e.length !== 0 || t || r !== 0 || i;
		return i = t, r = e.length, n;
	}, this.beginShadows = function() {
		a = !0, u(null);
	}, this.endShadows = function() {
		a = !1;
	}, this.setGlobalState = function(e, t) {
		n = u(e, t, 0);
	}, this.setState = function(t, o, s) {
		let d = t.clippingPlanes, f = t.clipIntersection, p = t.clipShadows, m = e.get(t);
		if (!i || d === null || d.length === 0 || a && !p) a ? u(null) : l();
		else {
			let e = a ? 0 : r, t = e * 4, i = m.clippingState || null;
			c.value = i, i = u(d, o, t, s);
			for (let e = 0; e !== t; ++e) i[e] = n[e];
			m.clippingState = i, this.numIntersection = f ? this.numPlanes : 0, this.numPlanes += e;
		}
	};
	function l() {
		c.value !== n && (c.value = n, c.needsUpdate = r > 0), t.numPlanes = r, t.numIntersection = 0;
	}
	function u(e, n, r, i) {
		let a = e === null ? 0 : e.length, l = null;
		if (a !== 0) {
			if (l = c.value, i !== !0 || l === null) {
				let t = r + a * 4, i = n.matrixWorldInverse;
				s.getNormalMatrix(i), (l === null || l.length < t) && (l = new Float32Array(t));
				for (let t = 0, n = r; t !== a; ++t, n += 4) o.copy(e[t]).applyMatrix4(i, s), o.normal.toArray(l, n), l[n + 3] = o.constant;
			}
			c.value = l, c.needsUpdate = !0;
		}
		return t.numPlanes = a, t.numIntersection = 0, l;
	}
}
function ws(e) {
	let t = /* @__PURE__ */ new WeakMap();
	function n(e, t) {
		return t === 303 ? e.mapping = 301 : t === 304 && (e.mapping = 302), e;
	}
	function r(r) {
		if (r && r.isTexture) {
			let a = r.mapping;
			if (a === 303 || a === 304) {
				if (t.has(r)) {
					let e = t.get(r).texture;
					return n(e, r.mapping);
				}
				{
					let a = r.image;
					if (a && a.height > 0) {
						let o = new dr(a.height);
						return o.fromEquirectangularTexture(e, r), t.set(r, o), r.addEventListener("dispose", i), n(o.texture, r.mapping);
					}
					return null;
				}
			}
		}
		return r;
	}
	function i(e) {
		let n = e.target;
		n.removeEventListener("dispose", i);
		let r = t.get(n);
		r !== void 0 && (t.delete(n), r.dispose());
	}
	function a() {
		t = /* @__PURE__ */ new WeakMap();
	}
	return {
		get: r,
		dispose: a
	};
}
var Ts = 4, Es = [
	.125,
	.215,
	.35,
	.446,
	.526,
	.582
], Ds = 20, Os = /*@__PURE__*/ new Vo(), ks = /*@__PURE__*/ new Y(), As = null, js = 0, Ms = 0, Ns = !1, Ps = (1 + Math.sqrt(5)) / 2, Fs = 1 / Ps, Is = [
	/*@__PURE__*/ new W(-Ps, Fs, 0),
	/*@__PURE__*/ new W(Ps, Fs, 0),
	/*@__PURE__*/ new W(-Fs, 0, Ps),
	/*@__PURE__*/ new W(Fs, 0, Ps),
	/*@__PURE__*/ new W(0, Ps, -Fs),
	/*@__PURE__*/ new W(0, Ps, Fs),
	/*@__PURE__*/ new W(-1, 1, -1),
	/*@__PURE__*/ new W(1, 1, -1),
	/*@__PURE__*/ new W(-1, 1, 1),
	/*@__PURE__*/ new W(1, 1, 1)
], Ls = /*@__PURE__*/ new W(), Rs = class {
	constructor(e) {
		this._renderer = e, this._pingPongRenderTarget = null, this._lodMax = 0, this._cubeSize = 0, this._lodPlanes = [], this._sizeLods = [], this._sigmas = [], this._blurMaterial = null, this._cubemapMaterial = null, this._equirectMaterial = null, this._compileMaterial(this._blurMaterial);
	}
	fromScene(e, t = 0, n = .1, r = 100, i = {}) {
		let { size: a = 256, position: o = Ls } = i;
		As = this._renderer.getRenderTarget(), js = this._renderer.getActiveCubeFace(), Ms = this._renderer.getActiveMipmapLevel(), Ns = this._renderer.xr.enabled, this._renderer.xr.enabled = !1, this._setSize(a);
		let s = this._allocateTargets();
		return s.depthBuffer = !0, this._sceneToCubeUV(e, n, r, s, o), t > 0 && this._blur(s, 0, 0, t), this._applyPMREM(s), this._cleanup(s), s;
	}
	fromEquirectangular(e, t = null) {
		return this._fromTexture(e, t);
	}
	fromCubemap(e, t = null) {
		return this._fromTexture(e, t);
	}
	compileCubemapShader() {
		this._cubemapMaterial === null && (this._cubemapMaterial = Ws(), this._compileMaterial(this._cubemapMaterial));
	}
	compileEquirectangularShader() {
		this._equirectMaterial === null && (this._equirectMaterial = Us(), this._compileMaterial(this._equirectMaterial));
	}
	dispose() {
		this._dispose(), this._cubemapMaterial !== null && this._cubemapMaterial.dispose(), this._equirectMaterial !== null && this._equirectMaterial.dispose();
	}
	_setSize(e) {
		this._lodMax = Math.floor(Math.log2(e)), this._cubeSize = 2 ** this._lodMax;
	}
	_dispose() {
		this._blurMaterial !== null && this._blurMaterial.dispose(), this._pingPongRenderTarget !== null && this._pingPongRenderTarget.dispose();
		for (let e = 0; e < this._lodPlanes.length; e++) this._lodPlanes[e].dispose();
	}
	_cleanup(e) {
		this._renderer.setRenderTarget(As, js, Ms), this._renderer.xr.enabled = Ns, e.scissorTest = !1, Vs(e, 0, 0, e.width, e.height);
	}
	_fromTexture(e, t) {
		e.mapping === 301 || e.mapping === 302 ? this._setSize(e.image.length === 0 ? 16 : e.image[0].width || e.image[0].image.width) : this._setSize(e.image.width / 4), As = this._renderer.getRenderTarget(), js = this._renderer.getActiveCubeFace(), Ms = this._renderer.getActiveMipmapLevel(), Ns = this._renderer.xr.enabled, this._renderer.xr.enabled = !1;
		let n = t || this._allocateTargets();
		return this._textureToCubeUV(e, n), this._applyPMREM(n), this._cleanup(n), n;
	}
	_allocateTargets() {
		let e = 3 * Math.max(this._cubeSize, 112), t = 4 * this._cubeSize, n = {
			magFilter: o,
			minFilter: o,
			generateMipmaps: !1,
			type: f,
			format: m,
			colorSpace: E,
			depthBuffer: !1
		}, r = Bs(e, t, n);
		if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== e || this._pingPongRenderTarget.height !== t) {
			this._pingPongRenderTarget !== null && this._dispose(), this._pingPongRenderTarget = Bs(e, t, n);
			let { _lodMax: r } = this;
			({sizeLods: this._sizeLods, lodPlanes: this._lodPlanes, sigmas: this._sigmas} = zs(r)), this._blurMaterial = Hs(r, e, t);
		}
		return r;
	}
	_compileMaterial(e) {
		let t = new Wn(this._lodPlanes[0], e);
		this._renderer.compile(t, Os);
	}
	_sceneToCubeUV(e, t, n, r, i) {
		let a = new or(90, 1, t, n), o = [
			1,
			-1,
			1,
			1,
			1,
			1
		], s = [
			1,
			1,
			1,
			-1,
			-1,
			-1
		], c = this._renderer, l = c.autoClear, u = c.toneMapping;
		c.getClearColor(ks), c.toneMapping = 0, c.autoClear = !1, c.state.buffers.depth.getReversed() && (c.setRenderTarget(r), c.clearDepth(), c.setRenderTarget(null));
		let d = new fn({
			name: "PMREM.Background",
			side: 1,
			depthWrite: !1,
			depthTest: !1
		}), f = new Wn(new qn(), d), p = !1, m = e.background;
		m ? m.isColor && (d.color.copy(m), e.background = null, p = !0) : (d.color.copy(ks), p = !0);
		for (let t = 0; t < 6; t++) {
			let n = t % 3;
			n === 0 ? (a.up.set(0, o[t], 0), a.position.set(i.x, i.y, i.z), a.lookAt(i.x + s[t], i.y, i.z)) : n === 1 ? (a.up.set(0, 0, o[t]), a.position.set(i.x, i.y, i.z), a.lookAt(i.x, i.y + s[t], i.z)) : (a.up.set(0, o[t], 0), a.position.set(i.x, i.y, i.z), a.lookAt(i.x, i.y, i.z + s[t]));
			let l = this._cubeSize;
			Vs(r, n * l, t > 2 ? l : 0, l, l), c.setRenderTarget(r), p && c.render(f, a), c.render(e, a);
		}
		f.geometry.dispose(), f.material.dispose(), c.toneMapping = u, c.autoClear = l, e.background = m;
	}
	_textureToCubeUV(e, t) {
		let n = this._renderer, r = e.mapping === 301 || e.mapping === 302;
		r ? (this._cubemapMaterial === null && (this._cubemapMaterial = Ws()), this._cubemapMaterial.uniforms.flipEnvMap.value = e.isRenderTargetTexture === !1 ? -1 : 1) : this._equirectMaterial === null && (this._equirectMaterial = Us());
		let i = r ? this._cubemapMaterial : this._equirectMaterial, a = new Wn(this._lodPlanes[0], i), o = i.uniforms;
		o.envMap.value = e;
		let s = this._cubeSize;
		Vs(t, 0, 0, 3 * s, 2 * s), n.setRenderTarget(t), n.render(a, Os);
	}
	_applyPMREM(e) {
		let t = this._renderer, n = t.autoClear;
		t.autoClear = !1;
		let r = this._lodPlanes.length;
		for (let t = 1; t < r; t++) {
			let n = Math.sqrt(this._sigmas[t] * this._sigmas[t] - this._sigmas[t - 1] * this._sigmas[t - 1]), i = Is[(r - t - 1) % Is.length];
			this._blur(e, t - 1, t, n, i);
		}
		t.autoClear = n;
	}
	_blur(e, t, n, r, i) {
		let a = this._pingPongRenderTarget;
		this._halfBlur(e, a, t, n, r, "latitudinal", i), this._halfBlur(a, e, n, n, r, "longitudinal", i);
	}
	_halfBlur(e, t, n, r, i, a, o) {
		let s = this._renderer, c = this._blurMaterial;
		a !== "latitudinal" && a !== "longitudinal" && console.error("blur direction must be either latitudinal or longitudinal!");
		let l = new Wn(this._lodPlanes[r], c), u = c.uniforms, d = this._sizeLods[n] - 1, f = isFinite(i) ? Math.PI / (2 * d) : 2 * Math.PI / 39, p = i / f, m = isFinite(i) ? 1 + Math.floor(3 * p) : Ds;
		m > Ds && console.warn(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ds}`);
		let h = [], g = 0;
		for (let e = 0; e < Ds; ++e) {
			let t = e / p, n = Math.exp(-t * t / 2);
			h.push(n), e === 0 ? g += n : e < m && (g += 2 * n);
		}
		for (let e = 0; e < h.length; e++) h[e] = h[e] / g;
		u.envMap.value = e.texture, u.samples.value = m, u.weights.value = h, u.latitudinal.value = a === "latitudinal", o && (u.poleAxis.value = o);
		let { _lodMax: _ } = this;
		u.dTheta.value = f, u.mipInt.value = _ - n;
		let v = this._sizeLods[r];
		Vs(t, 3 * v * (r > _ - Ts ? r - _ + Ts : 0), 4 * (this._cubeSize - v), 3 * v, 2 * v), s.setRenderTarget(t), s.render(l, Os);
	}
};
function zs(e) {
	let t = [], n = [], r = [], i = e, a = e - Ts + 1 + Es.length;
	for (let o = 0; o < a; o++) {
		let a = 2 ** i;
		n.push(a);
		let s = 1 / a;
		o > e - Ts ? s = Es[o - e + Ts - 1] : o === 0 && (s = 0), r.push(s);
		let c = 1 / (a - 2), l = -c, u = 1 + c, d = [
			l,
			l,
			u,
			l,
			u,
			u,
			l,
			l,
			u,
			u,
			l,
			u
		], f = /* @__PURE__ */ new Float32Array(108), p = /* @__PURE__ */ new Float32Array(72), m = /* @__PURE__ */ new Float32Array(36);
		for (let e = 0; e < 6; e++) {
			let t = e % 3 * 2 / 3 - 1, n = e > 2 ? 0 : -1, r = [
				t,
				n,
				0,
				t + 2 / 3,
				n,
				0,
				t + 2 / 3,
				n + 1,
				0,
				t,
				n,
				0,
				t + 2 / 3,
				n + 1,
				0,
				t,
				n + 1,
				0
			];
			f.set(r, 18 * e), p.set(d, 12 * e);
			let i = [
				e,
				e,
				e,
				e,
				e,
				e
			];
			m.set(i, 6 * e);
		}
		let h = new Mn();
		h.setAttribute("position", new xn(f, 3)), h.setAttribute("uv", new xn(p, 2)), h.setAttribute("faceIndex", new xn(m, 1)), t.push(h), i > Ts && i--;
	}
	return {
		lodPlanes: t,
		sizeLods: n,
		sigmas: r
	};
}
function Bs(e, t, n) {
	let r = new Ve(e, t, n);
	return r.texture.mapping = 306, r.texture.name = "PMREM.cubeUv", r.scissorTest = !0, r;
}
function Vs(e, t, n, r, i) {
	e.viewport.set(t, n, r, i), e.scissor.set(t, n, r, i);
}
function Hs(e, t, n) {
	let r = new Float32Array(Ds), i = new W(0, 1, 0);
	return new tr({
		name: "SphericalGaussianBlur",
		defines: {
			n: Ds,
			CUBEUV_TEXEL_WIDTH: 1 / t,
			CUBEUV_TEXEL_HEIGHT: 1 / n,
			CUBEUV_MAX_MIP: `${e}.0`
		},
		uniforms: {
			envMap: { value: null },
			samples: { value: 1 },
			weights: { value: r },
			latitudinal: { value: !1 },
			dTheta: { value: 0 },
			mipInt: { value: 0 },
			poleAxis: { value: i }
		},
		vertexShader: Gs(),
		fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n			uniform int samples;\n			uniform float weights[ n ];\n			uniform bool latitudinal;\n			uniform float dTheta;\n			uniform float mipInt;\n			uniform vec3 poleAxis;\n\n			#define ENVMAP_TYPE_CUBE_UV\n			#include <cube_uv_reflection_fragment>\n\n			vec3 getSample( float theta, vec3 axis ) {\n\n				float cosTheta = cos( theta );\n				// Rodrigues' axis-angle rotation\n				vec3 sampleDirection = vOutputDirection * cosTheta\n					+ cross( axis, vOutputDirection ) * sin( theta )\n					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );\n\n				return bilinearCubeUV( envMap, sampleDirection, mipInt );\n\n			}\n\n			void main() {\n\n				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );\n\n				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {\n\n					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );\n\n				}\n\n				axis = normalize( axis );\n\n				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );\n\n				for ( int i = 1; i < n; i++ ) {\n\n					if ( i >= samples ) {\n\n						break;\n\n					}\n\n					float theta = dTheta * float( i );\n					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );\n					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );\n\n				}\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function Us() {
	return new tr({
		name: "EquirectangularToCubeUV",
		uniforms: { envMap: { value: null } },
		vertexShader: Gs(),
		fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n\n			#include <common>\n\n			void main() {\n\n				vec3 outputDirection = normalize( vOutputDirection );\n				vec2 uv = equirectUv( outputDirection );\n\n				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function Ws() {
	return new tr({
		name: "CubemapToCubeUV",
		uniforms: {
			envMap: { value: null },
			flipEnvMap: { value: -1 }
		},
		vertexShader: Gs(),
		fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			uniform float flipEnvMap;\n\n			varying vec3 vOutputDirection;\n\n			uniform samplerCube envMap;\n\n			void main() {\n\n				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function Gs() {
	return "\n\n		precision mediump float;\n		precision mediump int;\n\n		attribute float faceIndex;\n\n		varying vec3 vOutputDirection;\n\n		// RH coordinate system; PMREM face-indexing convention\n		vec3 getDirection( vec2 uv, float face ) {\n\n			uv = 2.0 * uv - 1.0;\n\n			vec3 direction = vec3( uv, 1.0 );\n\n			if ( face == 0.0 ) {\n\n				direction = direction.zyx; // ( 1, v, u ) pos x\n\n			} else if ( face == 1.0 ) {\n\n				direction = direction.xzy;\n				direction.xz *= -1.0; // ( -u, 1, -v ) pos y\n\n			} else if ( face == 2.0 ) {\n\n				direction.x *= -1.0; // ( -u, v, 1 ) pos z\n\n			} else if ( face == 3.0 ) {\n\n				direction = direction.zyx;\n				direction.xz *= -1.0; // ( -1, v, -u ) neg x\n\n			} else if ( face == 4.0 ) {\n\n				direction = direction.xzy;\n				direction.xy *= -1.0; // ( -u, -1, v ) neg y\n\n			} else if ( face == 5.0 ) {\n\n				direction.z *= -1.0; // ( u, v, -1 ) neg z\n\n			}\n\n			return direction;\n\n		}\n\n		void main() {\n\n			vOutputDirection = getDirection( uv, faceIndex );\n			gl_Position = vec4( position, 1.0 );\n\n		}\n	";
}
function Ks(e) {
	let t = /* @__PURE__ */ new WeakMap(), n = null;
	function r(r) {
		if (r && r.isTexture) {
			let o = r.mapping, s = o === 303 || o === 304, c = o === 301 || o === 302;
			if (s || c) {
				let o = t.get(r), l = o === void 0 ? 0 : o.texture.pmremVersion;
				if (r.isRenderTargetTexture && r.pmremVersion !== l) return n === null && (n = new Rs(e)), o = s ? n.fromEquirectangular(r, o) : n.fromCubemap(r, o), o.texture.pmremVersion = r.pmremVersion, t.set(r, o), o.texture;
				if (o !== void 0) return o.texture;
				{
					let l = r.image;
					return s && l && l.height > 0 || c && l && i(l) ? (n === null && (n = new Rs(e)), o = s ? n.fromEquirectangular(r) : n.fromCubemap(r), o.texture.pmremVersion = r.pmremVersion, t.set(r, o), r.addEventListener("dispose", a), o.texture) : null;
				}
			}
		}
		return r;
	}
	function i(e) {
		let t = 0;
		for (let n = 0; n < 6; n++) e[n] !== void 0 && t++;
		return t === 6;
	}
	function a(e) {
		let n = e.target;
		n.removeEventListener("dispose", a);
		let r = t.get(n);
		r !== void 0 && (t.delete(n), r.dispose());
	}
	function o() {
		t = /* @__PURE__ */ new WeakMap(), n !== null && (n.dispose(), n = null);
	}
	return {
		get: r,
		dispose: o
	};
}
function qs(e) {
	let t = {};
	function n(n) {
		if (t[n] !== void 0) return t[n];
		let r;
		switch (n) {
			case "WEBGL_depth_texture":
				r = e.getExtension("WEBGL_depth_texture") || e.getExtension("MOZ_WEBGL_depth_texture") || e.getExtension("WEBKIT_WEBGL_depth_texture");
				break;
			case "EXT_texture_filter_anisotropic":
				r = e.getExtension("EXT_texture_filter_anisotropic") || e.getExtension("MOZ_EXT_texture_filter_anisotropic") || e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
				break;
			case "WEBGL_compressed_texture_s3tc":
				r = e.getExtension("WEBGL_compressed_texture_s3tc") || e.getExtension("MOZ_WEBGL_compressed_texture_s3tc") || e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");
				break;
			case "WEBGL_compressed_texture_pvrtc":
				r = e.getExtension("WEBGL_compressed_texture_pvrtc") || e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");
				break;
			default: r = e.getExtension(n);
		}
		return t[n] = r, r;
	}
	return {
		has: function(e) {
			return n(e) !== null;
		},
		init: function() {
			n("EXT_color_buffer_float"), n("WEBGL_clip_cull_distance"), n("OES_texture_float_linear"), n("EXT_color_buffer_half_float"), n("WEBGL_multisampled_render_to_texture"), n("WEBGL_render_shared_exponent");
		},
		get: function(e) {
			let t = n(e);
			return t === null && Te("THREE.WebGLRenderer: " + e + " extension not supported."), t;
		}
	};
}
function Js(e, t, n, r) {
	let i = {}, a = /* @__PURE__ */ new WeakMap();
	function o(e) {
		let s = e.target;
		s.index !== null && t.remove(s.index);
		for (let e in s.attributes) t.remove(s.attributes[e]);
		s.removeEventListener("dispose", o), delete i[s.id];
		let c = a.get(s);
		c && (t.remove(c), a.delete(s)), r.releaseStatesOfGeometry(s), s.isInstancedBufferGeometry === !0 && delete s._maxInstanceCount, n.memory.geometries--;
	}
	function s(e, t) {
		return i[t.id] === !0 ? t : (t.addEventListener("dispose", o), i[t.id] = !0, n.memory.geometries++, t);
	}
	function c(n) {
		let r = n.attributes;
		for (let n in r) t.update(r[n], e.ARRAY_BUFFER);
	}
	function l(e) {
		let n = [], r = e.index, i = e.attributes.position, o = 0;
		if (r !== null) {
			let e = r.array;
			o = r.version;
			for (let t = 0, r = e.length; t < r; t += 3) {
				let r = e[t + 0], i = e[t + 1], a = e[t + 2];
				n.push(r, i, i, a, a, r);
			}
		} else if (i !== void 0) {
			let e = i.array;
			o = i.version;
			for (let t = 0, r = e.length / 3 - 1; t < r; t += 3) {
				let e = t + 0, r = t + 1, i = t + 2;
				n.push(e, r, r, i, i, e);
			}
		} else return;
		let s = new (xe(n) ? Cn : Sn)(n, 1);
		s.version = o;
		let c = a.get(e);
		c && t.remove(c), a.set(e, s);
	}
	function u(e) {
		let t = a.get(e);
		if (t) {
			let n = e.index;
			n !== null && t.version < n.version && l(e);
		} else l(e);
		return a.get(e);
	}
	return {
		get: s,
		update: c,
		getWireframeAttribute: u
	};
}
function Ys(e, t, n) {
	let r;
	function i(e) {
		r = e;
	}
	let a, o;
	function s(e) {
		a = e.type, o = e.bytesPerElement;
	}
	function c(t, i) {
		e.drawElements(r, i, a, t * o), n.update(i, r, 1);
	}
	function l(t, i, s) {
		s !== 0 && (e.drawElementsInstanced(r, i, a, t * o, s), n.update(i, r, s));
	}
	function u(e, i, o) {
		if (o === 0) return;
		t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r, i, 0, a, e, 0, o);
		let s = 0;
		for (let e = 0; e < o; e++) s += i[e];
		n.update(s, r, 1);
	}
	function d(e, i, s, c) {
		if (s === 0) return;
		let u = t.get("WEBGL_multi_draw");
		if (u === null) for (let t = 0; t < e.length; t++) l(e[t] / o, i[t], c[t]);
		else {
			u.multiDrawElementsInstancedWEBGL(r, i, 0, a, e, 0, c, 0, s);
			let t = 0;
			for (let e = 0; e < s; e++) t += i[e] * c[e];
			n.update(t, r, 1);
		}
	}
	this.setMode = i, this.setIndex = s, this.render = c, this.renderInstances = l, this.renderMultiDraw = u, this.renderMultiDrawInstances = d;
}
function Xs(e) {
	let t = {
		geometries: 0,
		textures: 0
	}, n = {
		frame: 0,
		calls: 0,
		triangles: 0,
		points: 0,
		lines: 0
	};
	function r(t, r, i) {
		switch (n.calls++, r) {
			case e.TRIANGLES:
				n.triangles += t / 3 * i;
				break;
			case e.LINES:
				n.lines += t / 2 * i;
				break;
			case e.LINE_STRIP:
				n.lines += i * (t - 1);
				break;
			case e.LINE_LOOP:
				n.lines += i * t;
				break;
			case e.POINTS:
				n.points += i * t;
				break;
			default: console.error("THREE.WebGLInfo: Unknown draw mode:", r);
		}
	}
	function i() {
		n.calls = 0, n.triangles = 0, n.points = 0, n.lines = 0;
	}
	return {
		memory: t,
		render: n,
		programs: null,
		autoReset: !0,
		reset: i,
		update: r
	};
}
function Zs(e, t, n) {
	let r = /* @__PURE__ */ new WeakMap(), i = new ze();
	function a(a, o, s) {
		let c = a.morphTargetInfluences, l = o.morphAttributes.position || o.morphAttributes.normal || o.morphAttributes.color, u = l === void 0 ? 0 : l.length, f = r.get(o);
		if (f === void 0 || f.count !== u) {
			f !== void 0 && f.texture.dispose();
			let e = o.morphAttributes.position !== void 0, n = o.morphAttributes.normal !== void 0, a = o.morphAttributes.color !== void 0, s = o.morphAttributes.position || [], c = o.morphAttributes.normal || [], l = o.morphAttributes.color || [], p = 0;
			e === !0 && (p = 1), n === !0 && (p = 2), a === !0 && (p = 3);
			let m = o.attributes.position.count * p, h = 1;
			m > t.maxTextureSize && (h = Math.ceil(m / t.maxTextureSize), m = t.maxTextureSize);
			let g = new Float32Array(m * h * 4 * u), _ = new He(g, m, h, u);
			_.type = d, _.needsUpdate = !0;
			let v = p * 4;
			for (let t = 0; t < u; t++) {
				let r = s[t], o = c[t], u = l[t], d = m * h * 4 * t;
				for (let t = 0; t < r.count; t++) {
					let s = t * v;
					e === !0 && (i.fromBufferAttribute(r, t), g[d + s + 0] = i.x, g[d + s + 1] = i.y, g[d + s + 2] = i.z, g[d + s + 3] = 0), n === !0 && (i.fromBufferAttribute(o, t), g[d + s + 4] = i.x, g[d + s + 5] = i.y, g[d + s + 6] = i.z, g[d + s + 7] = 0), a === !0 && (i.fromBufferAttribute(u, t), g[d + s + 8] = i.x, g[d + s + 9] = i.y, g[d + s + 10] = i.z, g[d + s + 11] = u.itemSize === 4 ? i.w : 1);
				}
			}
			f = {
				count: u,
				texture: _,
				size: new H(m, h)
			}, r.set(o, f);
			function y() {
				_.dispose(), r.delete(o), o.removeEventListener("dispose", y);
			}
			o.addEventListener("dispose", y);
		}
		if (a.isInstancedMesh === !0 && a.morphTexture !== null) s.getUniforms().setValue(e, "morphTexture", a.morphTexture, n);
		else {
			let t = 0;
			for (let e = 0; e < c.length; e++) t += c[e];
			let n = o.morphTargetsRelative ? 1 : 1 - t;
			s.getUniforms().setValue(e, "morphTargetBaseInfluence", n), s.getUniforms().setValue(e, "morphTargetInfluences", c);
		}
		s.getUniforms().setValue(e, "morphTargetsTexture", f.texture, n), s.getUniforms().setValue(e, "morphTargetsTextureSize", f.size);
	}
	return { update: a };
}
function Qs(e, t, n, r) {
	let i = /* @__PURE__ */ new WeakMap();
	function a(a) {
		let o = r.render.frame, c = a.geometry, l = t.get(a, c);
		if (i.get(l) !== o && (t.update(l), i.set(l, o)), a.isInstancedMesh && (a.hasEventListener("dispose", s) === !1 && a.addEventListener("dispose", s), i.get(a) !== o && (n.update(a.instanceMatrix, e.ARRAY_BUFFER), a.instanceColor !== null && n.update(a.instanceColor, e.ARRAY_BUFFER), i.set(a, o))), a.isSkinnedMesh) {
			let e = a.skeleton;
			i.get(e) !== o && (e.update(), i.set(e, o));
		}
		return l;
	}
	function o() {
		i = /* @__PURE__ */ new WeakMap();
	}
	function s(e) {
		let t = e.target;
		t.removeEventListener("dispose", s), n.remove(t.instanceMatrix), t.instanceColor !== null && n.remove(t.instanceColor);
	}
	return {
		update: a,
		dispose: o
	};
}
var $s = /*@__PURE__*/ new q(), ec = /*@__PURE__*/ new bi(1, 1), tc = /*@__PURE__*/ new He(), nc = /*@__PURE__*/ new Ue(), rc = /*@__PURE__*/ new ur(), ic = [], ac = [], oc = /* @__PURE__ */ new Float32Array(16), sc = /* @__PURE__ */ new Float32Array(9), cc = /* @__PURE__ */ new Float32Array(4);
function lc(e, t, n) {
	let r = e[0];
	if (r <= 0 || r > 0) return e;
	let i = t * n, a = ic[i];
	if (a === void 0 && (a = new Float32Array(i), ic[i] = a), t !== 0) {
		r.toArray(a, 0);
		for (let r = 1, i = 0; r !== t; ++r) i += n, e[r].toArray(a, i);
	}
	return a;
}
function uc(e, t) {
	if (e.length !== t.length) return !1;
	for (let n = 0, r = e.length; n < r; n++) if (e[n] !== t[n]) return !1;
	return !0;
}
function dc(e, t) {
	for (let n = 0, r = t.length; n < r; n++) e[n] = t[n];
}
function fc(e, t) {
	let n = ac[t];
	n === void 0 && (n = new Int32Array(t), ac[t] = n);
	for (let r = 0; r !== t; ++r) n[r] = e.allocateTextureUnit();
	return n;
}
function pc(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1f(this.addr, t), n[0] = t);
}
function mc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2f(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (uc(n, t)) return;
		e.uniform2fv(this.addr, t), dc(n, t);
	}
}
function hc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3f(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else if (t.r !== void 0) (n[0] !== t.r || n[1] !== t.g || n[2] !== t.b) && (e.uniform3f(this.addr, t.r, t.g, t.b), n[0] = t.r, n[1] = t.g, n[2] = t.b);
	else {
		if (uc(n, t)) return;
		e.uniform3fv(this.addr, t), dc(n, t);
	}
}
function gc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4f(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (uc(n, t)) return;
		e.uniform4fv(this.addr, t), dc(n, t);
	}
}
function _c(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (uc(n, t)) return;
		e.uniformMatrix2fv(this.addr, !1, t), dc(n, t);
	} else {
		if (uc(n, r)) return;
		cc.set(r), e.uniformMatrix2fv(this.addr, !1, cc), dc(n, r);
	}
}
function vc(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (uc(n, t)) return;
		e.uniformMatrix3fv(this.addr, !1, t), dc(n, t);
	} else {
		if (uc(n, r)) return;
		sc.set(r), e.uniformMatrix3fv(this.addr, !1, sc), dc(n, r);
	}
}
function yc(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (uc(n, t)) return;
		e.uniformMatrix4fv(this.addr, !1, t), dc(n, t);
	} else {
		if (uc(n, r)) return;
		oc.set(r), e.uniformMatrix4fv(this.addr, !1, oc), dc(n, r);
	}
}
function bc(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1i(this.addr, t), n[0] = t);
}
function xc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2i(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (uc(n, t)) return;
		e.uniform2iv(this.addr, t), dc(n, t);
	}
}
function Sc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3i(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else {
		if (uc(n, t)) return;
		e.uniform3iv(this.addr, t), dc(n, t);
	}
}
function Cc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4i(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (uc(n, t)) return;
		e.uniform4iv(this.addr, t), dc(n, t);
	}
}
function wc(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1ui(this.addr, t), n[0] = t);
}
function Tc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2ui(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (uc(n, t)) return;
		e.uniform2uiv(this.addr, t), dc(n, t);
	}
}
function Ec(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3ui(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else {
		if (uc(n, t)) return;
		e.uniform3uiv(this.addr, t), dc(n, t);
	}
}
function Dc(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4ui(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (uc(n, t)) return;
		e.uniform4uiv(this.addr, t), dc(n, t);
	}
}
function Oc(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i);
	let a;
	this.type === e.SAMPLER_2D_SHADOW ? (ec.compareFunction = 515, a = ec) : a = $s, n.setTexture2D(t || a, i);
}
function kc(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTexture3D(t || nc, i);
}
function Ac(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTextureCube(t || rc, i);
}
function jc(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTexture2DArray(t || tc, i);
}
function Mc(e) {
	switch (e) {
		case 5126: return pc;
		case 35664: return mc;
		case 35665: return hc;
		case 35666: return gc;
		case 35674: return _c;
		case 35675: return vc;
		case 35676: return yc;
		case 5124:
		case 35670: return bc;
		case 35667:
		case 35671: return xc;
		case 35668:
		case 35672: return Sc;
		case 35669:
		case 35673: return Cc;
		case 5125: return wc;
		case 36294: return Tc;
		case 36295: return Ec;
		case 36296: return Dc;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return Oc;
		case 35679:
		case 36299:
		case 36307: return kc;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return Ac;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return jc;
	}
}
function Nc(e, t) {
	e.uniform1fv(this.addr, t);
}
function Pc(e, t) {
	let n = lc(t, this.size, 2);
	e.uniform2fv(this.addr, n);
}
function Fc(e, t) {
	let n = lc(t, this.size, 3);
	e.uniform3fv(this.addr, n);
}
function Ic(e, t) {
	let n = lc(t, this.size, 4);
	e.uniform4fv(this.addr, n);
}
function Lc(e, t) {
	let n = lc(t, this.size, 4);
	e.uniformMatrix2fv(this.addr, !1, n);
}
function Rc(e, t) {
	let n = lc(t, this.size, 9);
	e.uniformMatrix3fv(this.addr, !1, n);
}
function zc(e, t) {
	let n = lc(t, this.size, 16);
	e.uniformMatrix4fv(this.addr, !1, n);
}
function Bc(e, t) {
	e.uniform1iv(this.addr, t);
}
function Vc(e, t) {
	e.uniform2iv(this.addr, t);
}
function Hc(e, t) {
	e.uniform3iv(this.addr, t);
}
function Uc(e, t) {
	e.uniform4iv(this.addr, t);
}
function Wc(e, t) {
	e.uniform1uiv(this.addr, t);
}
function Gc(e, t) {
	e.uniform2uiv(this.addr, t);
}
function Kc(e, t) {
	e.uniform3uiv(this.addr, t);
}
function qc(e, t) {
	e.uniform4uiv(this.addr, t);
}
function Jc(e, t, n) {
	let r = this.cache, i = t.length, a = fc(n, i);
	uc(r, a) || (e.uniform1iv(this.addr, a), dc(r, a));
	for (let e = 0; e !== i; ++e) n.setTexture2D(t[e] || $s, a[e]);
}
function Yc(e, t, n) {
	let r = this.cache, i = t.length, a = fc(n, i);
	uc(r, a) || (e.uniform1iv(this.addr, a), dc(r, a));
	for (let e = 0; e !== i; ++e) n.setTexture3D(t[e] || nc, a[e]);
}
function Xc(e, t, n) {
	let r = this.cache, i = t.length, a = fc(n, i);
	uc(r, a) || (e.uniform1iv(this.addr, a), dc(r, a));
	for (let e = 0; e !== i; ++e) n.setTextureCube(t[e] || rc, a[e]);
}
function Zc(e, t, n) {
	let r = this.cache, i = t.length, a = fc(n, i);
	uc(r, a) || (e.uniform1iv(this.addr, a), dc(r, a));
	for (let e = 0; e !== i; ++e) n.setTexture2DArray(t[e] || tc, a[e]);
}
function Qc(e) {
	switch (e) {
		case 5126: return Nc;
		case 35664: return Pc;
		case 35665: return Fc;
		case 35666: return Ic;
		case 35674: return Lc;
		case 35675: return Rc;
		case 35676: return zc;
		case 5124:
		case 35670: return Bc;
		case 35667:
		case 35671: return Vc;
		case 35668:
		case 35672: return Hc;
		case 35669:
		case 35673: return Uc;
		case 5125: return Wc;
		case 36294: return Gc;
		case 36295: return Kc;
		case 36296: return qc;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return Jc;
		case 35679:
		case 36299:
		case 36307: return Yc;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return Xc;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return Zc;
	}
}
var $c = class {
	constructor(e, t, n) {
		this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.setValue = Mc(t.type);
	}
}, el = class {
	constructor(e, t, n) {
		this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.size = t.size, this.setValue = Qc(t.type);
	}
}, tl = class {
	constructor(e) {
		this.id = e, this.seq = [], this.map = {};
	}
	setValue(e, t, n) {
		let r = this.seq;
		for (let i = 0, a = r.length; i !== a; ++i) {
			let a = r[i];
			a.setValue(e, t[a.id], n);
		}
	}
}, nl = /(\w+)(\])?(\[|\.)?/g;
function rl(e, t) {
	e.seq.push(t), e.map[t.id] = t;
}
function il(e, t, n) {
	let r = e.name, i = r.length;
	for (nl.lastIndex = 0;;) {
		let a = nl.exec(r), o = nl.lastIndex, s = a[1], c = a[2] === "]", l = a[3];
		if (c && (s |= 0), l === void 0 || l === "[" && o + 2 === i) {
			rl(n, l === void 0 ? new $c(s, e, t) : new el(s, e, t));
			break;
		}
		{
			let e = n.map[s];
			e === void 0 && (e = new tl(s), rl(n, e)), n = e;
		}
	}
}
var al = class {
	constructor(e, t) {
		this.seq = [], this.map = {};
		let n = e.getProgramParameter(t, e.ACTIVE_UNIFORMS);
		for (let r = 0; r < n; ++r) {
			let n = e.getActiveUniform(t, r);
			il(n, e.getUniformLocation(t, n.name), this);
		}
	}
	setValue(e, t, n, r) {
		let i = this.map[t];
		i !== void 0 && i.setValue(e, n, r);
	}
	setOptional(e, t, n) {
		let r = t[n];
		r !== void 0 && this.setValue(e, n, r);
	}
	static upload(e, t, n, r) {
		for (let i = 0, a = t.length; i !== a; ++i) {
			let a = t[i], o = n[a.id];
			o.needsUpdate !== !1 && a.setValue(e, o.value, r);
		}
	}
	static seqWithValue(e, t) {
		let n = [];
		for (let r = 0, i = e.length; r !== i; ++r) {
			let i = e[r];
			i.id in t && n.push(i);
		}
		return n;
	}
};
function ol(e, t, n) {
	let r = e.createShader(t);
	return e.shaderSource(r, n), e.compileShader(r), r;
}
var sl = 37297, cl = 0;
function ll(e, t) {
	let n = e.split("\n"), r = [], i = Math.max(t - 6, 0), a = Math.min(t + 6, n.length);
	for (let e = i; e < a; e++) {
		let i = e + 1;
		r.push(`${i === t ? ">" : " "} ${i}: ${n[e]}`);
	}
	return r.join("\n");
}
var ul = /*@__PURE__*/ new G();
function dl(e) {
	K._getMatrix(ul, K.workingColorSpace, e);
	let t = `mat3( ${ul.elements.map((e) => e.toFixed(4))} )`;
	switch (K.getTransfer(e)) {
		case D: return [t, "LinearTransferOETF"];
		case O: return [t, "sRGBTransferOETF"];
		default: return console.warn("THREE.WebGLProgram: Unsupported color space: ", e), [t, "LinearTransferOETF"];
	}
}
function fl(e, t, n) {
	let r = e.getShaderParameter(t, e.COMPILE_STATUS), i = (e.getShaderInfoLog(t) || "").trim();
	if (r && i === "") return "";
	let a = /ERROR: 0:(\d+)/.exec(i);
	if (a) {
		let r = parseInt(a[1]);
		return n.toUpperCase() + "\n\n" + i + "\n\n" + ll(e.getShaderSource(t), r);
	}
	return i;
}
function pl(e, t) {
	let n = dl(t);
	return [
		`vec4 ${e}( vec4 value ) {`,
		`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,
		"}"
	].join("\n");
}
function ml(e, t) {
	let n;
	switch (t) {
		case 1:
			n = "Linear";
			break;
		case 2:
			n = "Reinhard";
			break;
		case 3:
			n = "Cineon";
			break;
		case 4:
			n = "ACESFilmic";
			break;
		case 6:
			n = "AgX";
			break;
		case 7:
			n = "Neutral";
			break;
		case 5:
			n = "Custom";
			break;
		default: console.warn("THREE.WebGLProgram: Unsupported toneMapping:", t), n = "Linear";
	}
	return "vec3 " + e + "( vec3 color ) { return " + n + "ToneMapping( color ); }";
}
var hl = /*@__PURE__*/ new W();
function gl() {
	return K.getLuminanceCoefficients(hl), [
		"float luminance( const in vec3 rgb ) {",
		`	const vec3 weights = vec3( ${hl.x.toFixed(4)}, ${hl.y.toFixed(4)}, ${hl.z.toFixed(4)} );`,
		"	return dot( weights, rgb );",
		"}"
	].join("\n");
}
function _l(e) {
	return [e.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "", e.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : ""].filter(bl).join("\n");
}
function vl(e) {
	let t = [];
	for (let n in e) {
		let r = e[n];
		r !== !1 && t.push("#define " + n + " " + r);
	}
	return t.join("\n");
}
function yl(e, t) {
	let n = {}, r = e.getProgramParameter(t, e.ACTIVE_ATTRIBUTES);
	for (let i = 0; i < r; i++) {
		let r = e.getActiveAttrib(t, i), a = r.name, o = 1;
		r.type === e.FLOAT_MAT2 && (o = 2), r.type === e.FLOAT_MAT3 && (o = 3), r.type === e.FLOAT_MAT4 && (o = 4), n[a] = {
			type: r.type,
			location: e.getAttribLocation(t, a),
			locationSize: o
		};
	}
	return n;
}
function bl(e) {
	return e !== "";
}
function xl(e, t) {
	let n = t.numSpotLightShadows + t.numSpotLightMaps - t.numSpotLightShadowsWithMaps;
	return e.replace(/NUM_DIR_LIGHTS/g, t.numDirLights).replace(/NUM_SPOT_LIGHTS/g, t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g, n).replace(/NUM_RECT_AREA_LIGHTS/g, t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, t.numPointLights).replace(/NUM_HEMI_LIGHTS/g, t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g, t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g, t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g, t.numPointLightShadows);
}
function Sl(e, t) {
	return e.replace(/NUM_CLIPPING_PLANES/g, t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, t.numClippingPlanes - t.numClipIntersection);
}
var Cl = /^[ \t]*#include +<([\w\d./]+)>/gm;
function wl(e) {
	return e.replace(Cl, El);
}
var Tl = /* @__PURE__ */ new Map();
function El(e, t) {
	let n = X[t];
	if (n === void 0) {
		let e = Tl.get(t);
		if (e !== void 0) n = X[e], console.warn("THREE.WebGLRenderer: Shader chunk \"%s\" has been deprecated. Use \"%s\" instead.", t, e);
		else throw Error("Can not resolve #include <" + t + ">");
	}
	return wl(n);
}
var Dl = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
function Ol(e) {
	return e.replace(Dl, kl);
}
function kl(e, t, n, r) {
	let i = "";
	for (let e = parseInt(t); e < parseInt(n); e++) i += r.replace(/\[\s*i\s*\]/g, "[ " + e + " ]").replace(/UNROLLED_LOOP_INDEX/g, e);
	return i;
}
function Al(e) {
	let t = `precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;
	return e.precision === "highp" ? t += "\n#define HIGH_PRECISION" : e.precision === "mediump" ? t += "\n#define MEDIUM_PRECISION" : e.precision === "lowp" && (t += "\n#define LOW_PRECISION"), t;
}
function jl(e) {
	let t = "SHADOWMAP_TYPE_BASIC";
	return e.shadowMapType === 1 ? t = "SHADOWMAP_TYPE_PCF" : e.shadowMapType === 2 ? t = "SHADOWMAP_TYPE_PCF_SOFT" : e.shadowMapType === 3 && (t = "SHADOWMAP_TYPE_VSM"), t;
}
function Ml(e) {
	let t = "ENVMAP_TYPE_CUBE";
	if (e.envMap) switch (e.envMapMode) {
		case 301:
		case 302:
			t = "ENVMAP_TYPE_CUBE";
			break;
		case 306: t = "ENVMAP_TYPE_CUBE_UV";
	}
	return t;
}
function Nl(e) {
	let t = "ENVMAP_MODE_REFLECTION";
	if (e.envMap) switch (e.envMapMode) {
		case 302: t = "ENVMAP_MODE_REFRACTION";
	}
	return t;
}
function Pl(e) {
	let t = "ENVMAP_BLENDING_NONE";
	if (e.envMap) switch (e.combine) {
		case 0:
			t = "ENVMAP_BLENDING_MULTIPLY";
			break;
		case 1:
			t = "ENVMAP_BLENDING_MIX";
			break;
		case 2: t = "ENVMAP_BLENDING_ADD";
	}
	return t;
}
function Fl(e) {
	let t = e.envMapCubeUVHeight;
	if (t === null) return null;
	let n = Math.log2(t) - 2, r = 1 / t;
	return {
		texelWidth: 1 / (3 * Math.max(2 ** n, 112)),
		texelHeight: r,
		maxMip: n
	};
}
function Il(e, t, n, r) {
	let i = e.getContext(), a = n.defines, o = n.vertexShader, s = n.fragmentShader, c = jl(n), l = Ml(n), u = Nl(n), d = Pl(n), f = Fl(n), p = _l(n), m = vl(a), h = i.createProgram(), g, _, v = n.glslVersion ? "#version " + n.glslVersion + "\n" : "";
	n.isRawShaderMaterial ? (g = [
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m
	].filter(bl).join("\n"), g.length > 0 && (g += "\n"), _ = [
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m
	].filter(bl).join("\n"), _.length > 0 && (_ += "\n")) : (g = [
		Al(n),
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m,
		n.extensionClipCullDistance ? "#define USE_CLIP_DISTANCE" : "",
		n.batching ? "#define USE_BATCHING" : "",
		n.batchingColor ? "#define USE_BATCHING_COLOR" : "",
		n.instancing ? "#define USE_INSTANCING" : "",
		n.instancingColor ? "#define USE_INSTANCING_COLOR" : "",
		n.instancingMorph ? "#define USE_INSTANCING_MORPH" : "",
		n.useFog && n.fog ? "#define USE_FOG" : "",
		n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "",
		n.map ? "#define USE_MAP" : "",
		n.envMap ? "#define USE_ENVMAP" : "",
		n.envMap ? "#define " + u : "",
		n.lightMap ? "#define USE_LIGHTMAP" : "",
		n.aoMap ? "#define USE_AOMAP" : "",
		n.bumpMap ? "#define USE_BUMPMAP" : "",
		n.normalMap ? "#define USE_NORMALMAP" : "",
		n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
		n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
		n.displacementMap ? "#define USE_DISPLACEMENTMAP" : "",
		n.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
		n.anisotropy ? "#define USE_ANISOTROPY" : "",
		n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
		n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
		n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
		n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
		n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
		n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
		n.specularMap ? "#define USE_SPECULARMAP" : "",
		n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
		n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
		n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
		n.metalnessMap ? "#define USE_METALNESSMAP" : "",
		n.alphaMap ? "#define USE_ALPHAMAP" : "",
		n.alphaHash ? "#define USE_ALPHAHASH" : "",
		n.transmission ? "#define USE_TRANSMISSION" : "",
		n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
		n.thicknessMap ? "#define USE_THICKNESSMAP" : "",
		n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
		n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
		n.mapUv ? "#define MAP_UV " + n.mapUv : "",
		n.alphaMapUv ? "#define ALPHAMAP_UV " + n.alphaMapUv : "",
		n.lightMapUv ? "#define LIGHTMAP_UV " + n.lightMapUv : "",
		n.aoMapUv ? "#define AOMAP_UV " + n.aoMapUv : "",
		n.emissiveMapUv ? "#define EMISSIVEMAP_UV " + n.emissiveMapUv : "",
		n.bumpMapUv ? "#define BUMPMAP_UV " + n.bumpMapUv : "",
		n.normalMapUv ? "#define NORMALMAP_UV " + n.normalMapUv : "",
		n.displacementMapUv ? "#define DISPLACEMENTMAP_UV " + n.displacementMapUv : "",
		n.metalnessMapUv ? "#define METALNESSMAP_UV " + n.metalnessMapUv : "",
		n.roughnessMapUv ? "#define ROUGHNESSMAP_UV " + n.roughnessMapUv : "",
		n.anisotropyMapUv ? "#define ANISOTROPYMAP_UV " + n.anisotropyMapUv : "",
		n.clearcoatMapUv ? "#define CLEARCOATMAP_UV " + n.clearcoatMapUv : "",
		n.clearcoatNormalMapUv ? "#define CLEARCOAT_NORMALMAP_UV " + n.clearcoatNormalMapUv : "",
		n.clearcoatRoughnessMapUv ? "#define CLEARCOAT_ROUGHNESSMAP_UV " + n.clearcoatRoughnessMapUv : "",
		n.iridescenceMapUv ? "#define IRIDESCENCEMAP_UV " + n.iridescenceMapUv : "",
		n.iridescenceThicknessMapUv ? "#define IRIDESCENCE_THICKNESSMAP_UV " + n.iridescenceThicknessMapUv : "",
		n.sheenColorMapUv ? "#define SHEEN_COLORMAP_UV " + n.sheenColorMapUv : "",
		n.sheenRoughnessMapUv ? "#define SHEEN_ROUGHNESSMAP_UV " + n.sheenRoughnessMapUv : "",
		n.specularMapUv ? "#define SPECULARMAP_UV " + n.specularMapUv : "",
		n.specularColorMapUv ? "#define SPECULAR_COLORMAP_UV " + n.specularColorMapUv : "",
		n.specularIntensityMapUv ? "#define SPECULAR_INTENSITYMAP_UV " + n.specularIntensityMapUv : "",
		n.transmissionMapUv ? "#define TRANSMISSIONMAP_UV " + n.transmissionMapUv : "",
		n.thicknessMapUv ? "#define THICKNESSMAP_UV " + n.thicknessMapUv : "",
		n.vertexTangents && n.flatShading === !1 ? "#define USE_TANGENT" : "",
		n.vertexColors ? "#define USE_COLOR" : "",
		n.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
		n.vertexUv1s ? "#define USE_UV1" : "",
		n.vertexUv2s ? "#define USE_UV2" : "",
		n.vertexUv3s ? "#define USE_UV3" : "",
		n.pointsUvs ? "#define USE_POINTS_UV" : "",
		n.flatShading ? "#define FLAT_SHADED" : "",
		n.skinning ? "#define USE_SKINNING" : "",
		n.morphTargets ? "#define USE_MORPHTARGETS" : "",
		n.morphNormals && n.flatShading === !1 ? "#define USE_MORPHNORMALS" : "",
		n.morphColors ? "#define USE_MORPHCOLORS" : "",
		n.morphTargetsCount > 0 ? "#define MORPHTARGETS_TEXTURE_STRIDE " + n.morphTextureStride : "",
		n.morphTargetsCount > 0 ? "#define MORPHTARGETS_COUNT " + n.morphTargetsCount : "",
		n.doubleSided ? "#define DOUBLE_SIDED" : "",
		n.flipSided ? "#define FLIP_SIDED" : "",
		n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
		n.shadowMapEnabled ? "#define " + c : "",
		n.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "",
		n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
		n.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
		n.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
		"uniform mat4 modelMatrix;",
		"uniform mat4 modelViewMatrix;",
		"uniform mat4 projectionMatrix;",
		"uniform mat4 viewMatrix;",
		"uniform mat3 normalMatrix;",
		"uniform vec3 cameraPosition;",
		"uniform bool isOrthographic;",
		"#ifdef USE_INSTANCING",
		"	attribute mat4 instanceMatrix;",
		"#endif",
		"#ifdef USE_INSTANCING_COLOR",
		"	attribute vec3 instanceColor;",
		"#endif",
		"#ifdef USE_INSTANCING_MORPH",
		"	uniform sampler2D morphTexture;",
		"#endif",
		"attribute vec3 position;",
		"attribute vec3 normal;",
		"attribute vec2 uv;",
		"#ifdef USE_UV1",
		"	attribute vec2 uv1;",
		"#endif",
		"#ifdef USE_UV2",
		"	attribute vec2 uv2;",
		"#endif",
		"#ifdef USE_UV3",
		"	attribute vec2 uv3;",
		"#endif",
		"#ifdef USE_TANGENT",
		"	attribute vec4 tangent;",
		"#endif",
		"#if defined( USE_COLOR_ALPHA )",
		"	attribute vec4 color;",
		"#elif defined( USE_COLOR )",
		"	attribute vec3 color;",
		"#endif",
		"#ifdef USE_SKINNING",
		"	attribute vec4 skinIndex;",
		"	attribute vec4 skinWeight;",
		"#endif",
		"\n"
	].filter(bl).join("\n"), _ = [
		Al(n),
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m,
		n.useFog && n.fog ? "#define USE_FOG" : "",
		n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "",
		n.alphaToCoverage ? "#define ALPHA_TO_COVERAGE" : "",
		n.map ? "#define USE_MAP" : "",
		n.matcap ? "#define USE_MATCAP" : "",
		n.envMap ? "#define USE_ENVMAP" : "",
		n.envMap ? "#define " + l : "",
		n.envMap ? "#define " + u : "",
		n.envMap ? "#define " + d : "",
		f ? "#define CUBEUV_TEXEL_WIDTH " + f.texelWidth : "",
		f ? "#define CUBEUV_TEXEL_HEIGHT " + f.texelHeight : "",
		f ? "#define CUBEUV_MAX_MIP " + f.maxMip + ".0" : "",
		n.lightMap ? "#define USE_LIGHTMAP" : "",
		n.aoMap ? "#define USE_AOMAP" : "",
		n.bumpMap ? "#define USE_BUMPMAP" : "",
		n.normalMap ? "#define USE_NORMALMAP" : "",
		n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
		n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
		n.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
		n.anisotropy ? "#define USE_ANISOTROPY" : "",
		n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
		n.clearcoat ? "#define USE_CLEARCOAT" : "",
		n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
		n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
		n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
		n.dispersion ? "#define USE_DISPERSION" : "",
		n.iridescence ? "#define USE_IRIDESCENCE" : "",
		n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
		n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
		n.specularMap ? "#define USE_SPECULARMAP" : "",
		n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
		n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
		n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
		n.metalnessMap ? "#define USE_METALNESSMAP" : "",
		n.alphaMap ? "#define USE_ALPHAMAP" : "",
		n.alphaTest ? "#define USE_ALPHATEST" : "",
		n.alphaHash ? "#define USE_ALPHAHASH" : "",
		n.sheen ? "#define USE_SHEEN" : "",
		n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
		n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
		n.transmission ? "#define USE_TRANSMISSION" : "",
		n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
		n.thicknessMap ? "#define USE_THICKNESSMAP" : "",
		n.vertexTangents && n.flatShading === !1 ? "#define USE_TANGENT" : "",
		n.vertexColors || n.instancingColor || n.batchingColor ? "#define USE_COLOR" : "",
		n.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
		n.vertexUv1s ? "#define USE_UV1" : "",
		n.vertexUv2s ? "#define USE_UV2" : "",
		n.vertexUv3s ? "#define USE_UV3" : "",
		n.pointsUvs ? "#define USE_POINTS_UV" : "",
		n.gradientMap ? "#define USE_GRADIENTMAP" : "",
		n.flatShading ? "#define FLAT_SHADED" : "",
		n.doubleSided ? "#define DOUBLE_SIDED" : "",
		n.flipSided ? "#define FLIP_SIDED" : "",
		n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
		n.shadowMapEnabled ? "#define " + c : "",
		n.premultipliedAlpha ? "#define PREMULTIPLIED_ALPHA" : "",
		n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
		n.decodeVideoTexture ? "#define DECODE_VIDEO_TEXTURE" : "",
		n.decodeVideoTextureEmissive ? "#define DECODE_VIDEO_TEXTURE_EMISSIVE" : "",
		n.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
		n.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
		"uniform mat4 viewMatrix;",
		"uniform vec3 cameraPosition;",
		"uniform bool isOrthographic;",
		n.toneMapping === 0 ? "" : "#define TONE_MAPPING",
		n.toneMapping === 0 ? "" : X.tonemapping_pars_fragment,
		n.toneMapping === 0 ? "" : ml("toneMapping", n.toneMapping),
		n.dithering ? "#define DITHERING" : "",
		n.opaque ? "#define OPAQUE" : "",
		X.colorspace_pars_fragment,
		pl("linearToOutputTexel", n.outputColorSpace),
		gl(),
		n.useDepthPacking ? "#define DEPTH_PACKING " + n.depthPacking : "",
		"\n"
	].filter(bl).join("\n")), o = wl(o), o = xl(o, n), o = Sl(o, n), s = wl(s), s = xl(s, n), s = Sl(s, n), o = Ol(o), s = Ol(s), n.isRawShaderMaterial !== !0 && (v = "#version 300 es\n", g = [
		p,
		"#define attribute in",
		"#define varying out",
		"#define texture2D texture"
	].join("\n") + "\n" + g, _ = [
		"#define varying in",
		n.glslVersion === "300 es" ? "" : "layout(location = 0) out highp vec4 pc_fragColor;",
		n.glslVersion === "300 es" ? "" : "#define gl_FragColor pc_fragColor",
		"#define gl_FragDepthEXT gl_FragDepth",
		"#define texture2D texture",
		"#define textureCube texture",
		"#define texture2DProj textureProj",
		"#define texture2DLodEXT textureLod",
		"#define texture2DProjLodEXT textureProjLod",
		"#define textureCubeLodEXT textureLod",
		"#define texture2DGradEXT textureGrad",
		"#define texture2DProjGradEXT textureProjGrad",
		"#define textureCubeGradEXT textureGrad"
	].join("\n") + "\n" + _);
	let y = v + g + o, b = v + _ + s, x = ol(i, i.VERTEX_SHADER, y), S = ol(i, i.FRAGMENT_SHADER, b);
	i.attachShader(h, x), i.attachShader(h, S), n.index0AttributeName === void 0 ? n.morphTargets === !0 && i.bindAttribLocation(h, 0, "position") : i.bindAttribLocation(h, 0, n.index0AttributeName), i.linkProgram(h);
	function C(t) {
		if (e.debug.checkShaderErrors) {
			let n = i.getProgramInfoLog(h) || "", r = i.getShaderInfoLog(x) || "", a = i.getShaderInfoLog(S) || "", o = n.trim(), s = r.trim(), c = a.trim(), l = !0, u = !0;
			if (i.getProgramParameter(h, i.LINK_STATUS) === !1) {
				if (l = !1, typeof e.debug.onShaderError == "function") e.debug.onShaderError(i, h, x, S);
				else {
					let e = fl(i, x, "vertex"), n = fl(i, S, "fragment");
					console.error("THREE.WebGLProgram: Shader Error " + i.getError() + " - VALIDATE_STATUS " + i.getProgramParameter(h, i.VALIDATE_STATUS) + "\n\nMaterial Name: " + t.name + "\nMaterial Type: " + t.type + "\n\nProgram Info Log: " + o + "\n" + e + "\n" + n);
				}
			} else o === "" ? (s === "" || c === "") && (u = !1) : console.warn("THREE.WebGLProgram: Program Info Log:", o);
			u && (t.diagnostics = {
				runnable: l,
				programLog: o,
				vertexShader: {
					log: s,
					prefix: g
				},
				fragmentShader: {
					log: c,
					prefix: _
				}
			});
		}
		i.deleteShader(x), i.deleteShader(S), w = new al(i, h), T = yl(i, h);
	}
	let w;
	this.getUniforms = function() {
		return w === void 0 && C(this), w;
	};
	let T;
	this.getAttributes = function() {
		return T === void 0 && C(this), T;
	};
	let E = n.rendererExtensionParallelShaderCompile === !1;
	return this.isReady = function() {
		return E === !1 && (E = i.getProgramParameter(h, sl)), E;
	}, this.destroy = function() {
		r.releaseStatesOfProgram(this), i.deleteProgram(h), this.program = void 0;
	}, this.type = n.shaderType, this.name = n.shaderName, this.id = cl++, this.cacheKey = t, this.usedTimes = 1, this.program = h, this.vertexShader = x, this.fragmentShader = S, this;
}
var Ll = 0, Rl = class {
	constructor() {
		this.shaderCache = /* @__PURE__ */ new Map(), this.materialCache = /* @__PURE__ */ new Map();
	}
	update(e) {
		let t = e.vertexShader, n = e.fragmentShader, r = this._getShaderStage(t), i = this._getShaderStage(n), a = this._getShaderCacheForMaterial(e);
		return a.has(r) === !1 && (a.add(r), r.usedTimes++), a.has(i) === !1 && (a.add(i), i.usedTimes++), this;
	}
	remove(e) {
		let t = this.materialCache.get(e);
		for (let e of t) e.usedTimes--, e.usedTimes === 0 && this.shaderCache.delete(e.code);
		return this.materialCache.delete(e), this;
	}
	getVertexShaderID(e) {
		return this._getShaderStage(e.vertexShader).id;
	}
	getFragmentShaderID(e) {
		return this._getShaderStage(e.fragmentShader).id;
	}
	dispose() {
		this.shaderCache.clear(), this.materialCache.clear();
	}
	_getShaderCacheForMaterial(e) {
		let t = this.materialCache, n = t.get(e);
		return n === void 0 && (n = /* @__PURE__ */ new Set(), t.set(e, n)), n;
	}
	_getShaderStage(e) {
		let t = this.shaderCache, n = t.get(e);
		return n === void 0 && (n = new zl(e), t.set(e, n)), n;
	}
}, zl = class {
	constructor(e) {
		this.id = Ll++, this.code = e, this.usedTimes = 0;
	}
};
function Bl(e, t, n, r, i, a, o) {
	let s = new Dt(), c = new Rl(), l = /* @__PURE__ */ new Set(), u = [], d = i.logarithmicDepthBuffer, f = i.vertexTextures, p = i.precision, m = {
		MeshDepthMaterial: "depth",
		MeshDistanceMaterial: "distanceRGBA",
		MeshNormalMaterial: "normal",
		MeshBasicMaterial: "basic",
		MeshLambertMaterial: "lambert",
		MeshPhongMaterial: "phong",
		MeshToonMaterial: "toon",
		MeshStandardMaterial: "physical",
		MeshPhysicalMaterial: "physical",
		MeshMatcapMaterial: "matcap",
		LineBasicMaterial: "basic",
		LineDashedMaterial: "dashed",
		PointsMaterial: "points",
		ShadowMaterial: "shadow",
		SpriteMaterial: "sprite"
	};
	function h(e) {
		return l.add(e), e === 0 ? "uv" : `uv${e}`;
	}
	function g(a, s, u, g, _) {
		let v = g.fog, y = _.geometry, b = a.isMeshStandardMaterial ? g.environment : null, x = (a.isMeshStandardMaterial ? n : t).get(a.envMap || b), S = x && x.mapping === 306 ? x.image.height : null, C = m[a.type];
		a.precision !== null && (p = i.getMaxPrecision(a.precision), p !== a.precision && console.warn("THREE.WebGLProgram.getParameters:", a.precision, "not supported, using", p, "instead."));
		let w = y.morphAttributes.position || y.morphAttributes.normal || y.morphAttributes.color, T = w === void 0 ? 0 : w.length, D = 0;
		y.morphAttributes.position !== void 0 && (D = 1), y.morphAttributes.normal !== void 0 && (D = 2), y.morphAttributes.color !== void 0 && (D = 3);
		let O, k, A, j;
		if (C) {
			let e = hs[C];
			O = e.vertexShader, k = e.fragmentShader;
		} else O = a.vertexShader, k = a.fragmentShader, c.update(a), A = c.getVertexShaderID(a), j = c.getFragmentShaderID(a);
		let M = e.getRenderTarget(), N = e.state.buffers.depth.getReversed(), P = _.isInstancedMesh === !0, F = _.isBatchedMesh === !0, ee = !!a.map, I = !!a.matcap, L = !!x, te = !!a.aoMap, ne = !!a.lightMap, re = !!a.bumpMap, R = !!a.normalMap, ie = !!a.displacementMap, z = !!a.emissiveMap, ae = !!a.metalnessMap, oe = !!a.roughnessMap, se = a.anisotropy > 0, ce = a.clearcoat > 0, le = a.dispersion > 0, ue = a.iridescence > 0, de = a.sheen > 0, fe = a.transmission > 0, pe = se && !!a.anisotropyMap, B = ce && !!a.clearcoatMap, me = ce && !!a.clearcoatNormalMap, he = ce && !!a.clearcoatRoughnessMap, ge = ue && !!a.iridescenceMap, V = ue && !!a.iridescenceThicknessMap, _e = de && !!a.sheenColorMap, H = de && !!a.sheenRoughnessMap, U = !!a.specularMap, W = !!a.specularColorMap, ve = !!a.specularIntensityMap, ye = fe && !!a.transmissionMap, G = fe && !!a.thicknessMap, be = !!a.gradientMap, xe = !!a.alphaMap, Se = a.alphaTest > 0, Ce = !!a.alphaHash, we = !!a.extensions, Te = 0;
		a.toneMapped && (M === null || M.isXRRenderTarget === !0) && (Te = e.toneMapping);
		let Ee = {
			shaderID: C,
			shaderType: a.type,
			shaderName: a.name,
			vertexShader: O,
			fragmentShader: k,
			defines: a.defines,
			customVertexShaderID: A,
			customFragmentShaderID: j,
			isRawShaderMaterial: a.isRawShaderMaterial === !0,
			glslVersion: a.glslVersion,
			precision: p,
			batching: F,
			batchingColor: F && _._colorsTexture !== null,
			instancing: P,
			instancingColor: P && _.instanceColor !== null,
			instancingMorph: P && _.morphTexture !== null,
			supportsVertexTextures: f,
			outputColorSpace: M === null ? e.outputColorSpace : M.isXRRenderTarget === !0 ? M.texture.colorSpace : E,
			alphaToCoverage: !!a.alphaToCoverage,
			map: ee,
			matcap: I,
			envMap: L,
			envMapMode: L && x.mapping,
			envMapCubeUVHeight: S,
			aoMap: te,
			lightMap: ne,
			bumpMap: re,
			normalMap: R,
			displacementMap: f && ie,
			emissiveMap: z,
			normalMapObjectSpace: R && a.normalMapType === 1,
			normalMapTangentSpace: R && a.normalMapType === 0,
			metalnessMap: ae,
			roughnessMap: oe,
			anisotropy: se,
			anisotropyMap: pe,
			clearcoat: ce,
			clearcoatMap: B,
			clearcoatNormalMap: me,
			clearcoatRoughnessMap: he,
			dispersion: le,
			iridescence: ue,
			iridescenceMap: ge,
			iridescenceThicknessMap: V,
			sheen: de,
			sheenColorMap: _e,
			sheenRoughnessMap: H,
			specularMap: U,
			specularColorMap: W,
			specularIntensityMap: ve,
			transmission: fe,
			transmissionMap: ye,
			thicknessMap: G,
			gradientMap: be,
			opaque: a.transparent === !1 && a.blending === 1 && a.alphaToCoverage === !1,
			alphaMap: xe,
			alphaTest: Se,
			alphaHash: Ce,
			combine: a.combine,
			mapUv: ee && h(a.map.channel),
			aoMapUv: te && h(a.aoMap.channel),
			lightMapUv: ne && h(a.lightMap.channel),
			bumpMapUv: re && h(a.bumpMap.channel),
			normalMapUv: R && h(a.normalMap.channel),
			displacementMapUv: ie && h(a.displacementMap.channel),
			emissiveMapUv: z && h(a.emissiveMap.channel),
			metalnessMapUv: ae && h(a.metalnessMap.channel),
			roughnessMapUv: oe && h(a.roughnessMap.channel),
			anisotropyMapUv: pe && h(a.anisotropyMap.channel),
			clearcoatMapUv: B && h(a.clearcoatMap.channel),
			clearcoatNormalMapUv: me && h(a.clearcoatNormalMap.channel),
			clearcoatRoughnessMapUv: he && h(a.clearcoatRoughnessMap.channel),
			iridescenceMapUv: ge && h(a.iridescenceMap.channel),
			iridescenceThicknessMapUv: V && h(a.iridescenceThicknessMap.channel),
			sheenColorMapUv: _e && h(a.sheenColorMap.channel),
			sheenRoughnessMapUv: H && h(a.sheenRoughnessMap.channel),
			specularMapUv: U && h(a.specularMap.channel),
			specularColorMapUv: W && h(a.specularColorMap.channel),
			specularIntensityMapUv: ve && h(a.specularIntensityMap.channel),
			transmissionMapUv: ye && h(a.transmissionMap.channel),
			thicknessMapUv: G && h(a.thicknessMap.channel),
			alphaMapUv: xe && h(a.alphaMap.channel),
			vertexTangents: !!y.attributes.tangent && (R || se),
			vertexColors: a.vertexColors,
			vertexAlphas: a.vertexColors === !0 && !!y.attributes.color && y.attributes.color.itemSize === 4,
			pointsUvs: _.isPoints === !0 && !!y.attributes.uv && (ee || xe),
			fog: !!v,
			useFog: a.fog === !0,
			fogExp2: !!v && v.isFogExp2,
			flatShading: a.flatShading === !0 && a.wireframe === !1,
			sizeAttenuation: a.sizeAttenuation === !0,
			logarithmicDepthBuffer: d,
			reversedDepthBuffer: N,
			skinning: _.isSkinnedMesh === !0,
			morphTargets: y.morphAttributes.position !== void 0,
			morphNormals: y.morphAttributes.normal !== void 0,
			morphColors: y.morphAttributes.color !== void 0,
			morphTargetsCount: T,
			morphTextureStride: D,
			numDirLights: s.directional.length,
			numPointLights: s.point.length,
			numSpotLights: s.spot.length,
			numSpotLightMaps: s.spotLightMap.length,
			numRectAreaLights: s.rectArea.length,
			numHemiLights: s.hemi.length,
			numDirLightShadows: s.directionalShadowMap.length,
			numPointLightShadows: s.pointShadowMap.length,
			numSpotLightShadows: s.spotShadowMap.length,
			numSpotLightShadowsWithMaps: s.numSpotLightShadowsWithMaps,
			numLightProbes: s.numLightProbes,
			numClippingPlanes: o.numPlanes,
			numClipIntersection: o.numIntersection,
			dithering: a.dithering,
			shadowMapEnabled: e.shadowMap.enabled && u.length > 0,
			shadowMapType: e.shadowMap.type,
			toneMapping: Te,
			decodeVideoTexture: ee && a.map.isVideoTexture === !0 && K.getTransfer(a.map.colorSpace) === "srgb",
			decodeVideoTextureEmissive: z && a.emissiveMap.isVideoTexture === !0 && K.getTransfer(a.emissiveMap.colorSpace) === "srgb",
			premultipliedAlpha: a.premultipliedAlpha,
			doubleSided: a.side === 2,
			flipSided: a.side === 1,
			useDepthPacking: a.depthPacking >= 0,
			depthPacking: a.depthPacking || 0,
			index0AttributeName: a.index0AttributeName,
			extensionClipCullDistance: we && a.extensions.clipCullDistance === !0 && r.has("WEBGL_clip_cull_distance"),
			extensionMultiDraw: (we && a.extensions.multiDraw === !0 || F) && r.has("WEBGL_multi_draw"),
			rendererExtensionParallelShaderCompile: r.has("KHR_parallel_shader_compile"),
			customProgramCacheKey: a.customProgramCacheKey()
		};
		return Ee.vertexUv1s = l.has(1), Ee.vertexUv2s = l.has(2), Ee.vertexUv3s = l.has(3), l.clear(), Ee;
	}
	function _(t) {
		let n = [];
		if (t.shaderID ? n.push(t.shaderID) : (n.push(t.customVertexShaderID), n.push(t.customFragmentShaderID)), t.defines !== void 0) for (let e in t.defines) n.push(e), n.push(t.defines[e]);
		return t.isRawShaderMaterial === !1 && (v(n, t), y(n, t), n.push(e.outputColorSpace)), n.push(t.customProgramCacheKey), n.join();
	}
	function v(e, t) {
		e.push(t.precision), e.push(t.outputColorSpace), e.push(t.envMapMode), e.push(t.envMapCubeUVHeight), e.push(t.mapUv), e.push(t.alphaMapUv), e.push(t.lightMapUv), e.push(t.aoMapUv), e.push(t.bumpMapUv), e.push(t.normalMapUv), e.push(t.displacementMapUv), e.push(t.emissiveMapUv), e.push(t.metalnessMapUv), e.push(t.roughnessMapUv), e.push(t.anisotropyMapUv), e.push(t.clearcoatMapUv), e.push(t.clearcoatNormalMapUv), e.push(t.clearcoatRoughnessMapUv), e.push(t.iridescenceMapUv), e.push(t.iridescenceThicknessMapUv), e.push(t.sheenColorMapUv), e.push(t.sheenRoughnessMapUv), e.push(t.specularMapUv), e.push(t.specularColorMapUv), e.push(t.specularIntensityMapUv), e.push(t.transmissionMapUv), e.push(t.thicknessMapUv), e.push(t.combine), e.push(t.fogExp2), e.push(t.sizeAttenuation), e.push(t.morphTargetsCount), e.push(t.morphAttributeCount), e.push(t.numDirLights), e.push(t.numPointLights), e.push(t.numSpotLights), e.push(t.numSpotLightMaps), e.push(t.numHemiLights), e.push(t.numRectAreaLights), e.push(t.numDirLightShadows), e.push(t.numPointLightShadows), e.push(t.numSpotLightShadows), e.push(t.numSpotLightShadowsWithMaps), e.push(t.numLightProbes), e.push(t.shadowMapType), e.push(t.toneMapping), e.push(t.numClippingPlanes), e.push(t.numClipIntersection), e.push(t.depthPacking);
	}
	function y(e, t) {
		s.disableAll(), t.supportsVertexTextures && s.enable(0), t.instancing && s.enable(1), t.instancingColor && s.enable(2), t.instancingMorph && s.enable(3), t.matcap && s.enable(4), t.envMap && s.enable(5), t.normalMapObjectSpace && s.enable(6), t.normalMapTangentSpace && s.enable(7), t.clearcoat && s.enable(8), t.iridescence && s.enable(9), t.alphaTest && s.enable(10), t.vertexColors && s.enable(11), t.vertexAlphas && s.enable(12), t.vertexUv1s && s.enable(13), t.vertexUv2s && s.enable(14), t.vertexUv3s && s.enable(15), t.vertexTangents && s.enable(16), t.anisotropy && s.enable(17), t.alphaHash && s.enable(18), t.batching && s.enable(19), t.dispersion && s.enable(20), t.batchingColor && s.enable(21), t.gradientMap && s.enable(22), e.push(s.mask), s.disableAll(), t.fog && s.enable(0), t.useFog && s.enable(1), t.flatShading && s.enable(2), t.logarithmicDepthBuffer && s.enable(3), t.reversedDepthBuffer && s.enable(4), t.skinning && s.enable(5), t.morphTargets && s.enable(6), t.morphNormals && s.enable(7), t.morphColors && s.enable(8), t.premultipliedAlpha && s.enable(9), t.shadowMapEnabled && s.enable(10), t.doubleSided && s.enable(11), t.flipSided && s.enable(12), t.useDepthPacking && s.enable(13), t.dithering && s.enable(14), t.transmission && s.enable(15), t.sheen && s.enable(16), t.opaque && s.enable(17), t.pointsUvs && s.enable(18), t.decodeVideoTexture && s.enable(19), t.decodeVideoTextureEmissive && s.enable(20), t.alphaToCoverage && s.enable(21), e.push(s.mask);
	}
	function b(e) {
		let t = m[e.type], n;
		if (t) {
			let e = hs[t];
			n = Qn.clone(e.uniforms);
		} else n = e.uniforms;
		return n;
	}
	function x(t, n) {
		let r;
		for (let e = 0, t = u.length; e < t; e++) {
			let t = u[e];
			if (t.cacheKey === n) {
				r = t, ++r.usedTimes;
				break;
			}
		}
		return r === void 0 && (r = new Il(e, n, t, a), u.push(r)), r;
	}
	function S(e) {
		if (--e.usedTimes === 0) {
			let t = u.indexOf(e);
			u[t] = u[u.length - 1], u.pop(), e.destroy();
		}
	}
	function C(e) {
		c.remove(e);
	}
	function w() {
		c.dispose();
	}
	return {
		getParameters: g,
		getProgramCacheKey: _,
		getUniforms: b,
		acquireProgram: x,
		releaseProgram: S,
		releaseShaderCache: C,
		programs: u,
		dispose: w
	};
}
function Vl() {
	let e = /* @__PURE__ */ new WeakMap();
	function t(t) {
		return e.has(t);
	}
	function n(t) {
		let n = e.get(t);
		return n === void 0 && (n = {}, e.set(t, n)), n;
	}
	function r(t) {
		e.delete(t);
	}
	function i(t, n, r) {
		e.get(t)[n] = r;
	}
	function a() {
		e = /* @__PURE__ */ new WeakMap();
	}
	return {
		has: t,
		get: n,
		remove: r,
		update: i,
		dispose: a
	};
}
function Hl(e, t) {
	return e.groupOrder === t.groupOrder ? e.renderOrder === t.renderOrder ? e.material.id === t.material.id ? e.z === t.z ? e.id - t.id : e.z - t.z : e.material.id - t.material.id : e.renderOrder - t.renderOrder : e.groupOrder - t.groupOrder;
}
function Ul(e, t) {
	return e.groupOrder === t.groupOrder ? e.renderOrder === t.renderOrder ? e.z === t.z ? e.id - t.id : t.z - e.z : e.renderOrder - t.renderOrder : e.groupOrder - t.groupOrder;
}
function Wl() {
	let e = [], t = 0, n = [], r = [], i = [];
	function a() {
		t = 0, n.length = 0, r.length = 0, i.length = 0;
	}
	function o(n, r, i, a, o, s) {
		let c = e[t];
		return c === void 0 ? (c = {
			id: n.id,
			object: n,
			geometry: r,
			material: i,
			groupOrder: a,
			renderOrder: n.renderOrder,
			z: o,
			group: s
		}, e[t] = c) : (c.id = n.id, c.object = n, c.geometry = r, c.material = i, c.groupOrder = a, c.renderOrder = n.renderOrder, c.z = o, c.group = s), t++, c;
	}
	function s(e, t, a, s, c, l) {
		let u = o(e, t, a, s, c, l);
		a.transmission > 0 ? r.push(u) : a.transparent === !0 ? i.push(u) : n.push(u);
	}
	function c(e, t, a, s, c, l) {
		let u = o(e, t, a, s, c, l);
		a.transmission > 0 ? r.unshift(u) : a.transparent === !0 ? i.unshift(u) : n.unshift(u);
	}
	function l(e, t) {
		n.length > 1 && n.sort(e || Hl), r.length > 1 && r.sort(t || Ul), i.length > 1 && i.sort(t || Ul);
	}
	function u() {
		for (let n = t, r = e.length; n < r; n++) {
			let t = e[n];
			if (t.id === null) break;
			t.id = null, t.object = null, t.geometry = null, t.material = null, t.group = null;
		}
	}
	return {
		opaque: n,
		transmissive: r,
		transparent: i,
		init: a,
		push: s,
		unshift: c,
		finish: u,
		sort: l
	};
}
function Gl() {
	let e = /* @__PURE__ */ new WeakMap();
	function t(t, n) {
		let r = e.get(t), i;
		return r === void 0 ? (i = new Wl(), e.set(t, [i])) : n >= r.length ? (i = new Wl(), r.push(i)) : i = r[n], i;
	}
	function n() {
		e = /* @__PURE__ */ new WeakMap();
	}
	return {
		get: t,
		dispose: n
	};
}
function Kl() {
	let e = {};
	return { get: function(t) {
		if (e[t.id] !== void 0) return e[t.id];
		let n;
		switch (t.type) {
			case "DirectionalLight":
				n = {
					direction: new W(),
					color: new Y()
				};
				break;
			case "SpotLight":
				n = {
					position: new W(),
					direction: new W(),
					color: new Y(),
					distance: 0,
					coneCos: 0,
					penumbraCos: 0,
					decay: 0
				};
				break;
			case "PointLight":
				n = {
					position: new W(),
					color: new Y(),
					distance: 0,
					decay: 0
				};
				break;
			case "HemisphereLight":
				n = {
					direction: new W(),
					skyColor: new Y(),
					groundColor: new Y()
				};
				break;
			case "RectAreaLight": n = {
				color: new Y(),
				position: new W(),
				halfWidth: new W(),
				halfHeight: new W()
			};
		}
		return e[t.id] = n, n;
	} };
}
function ql() {
	let e = {};
	return { get: function(t) {
		if (e[t.id] !== void 0) return e[t.id];
		let n;
		switch (t.type) {
			case "DirectionalLight":
				n = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new H()
				};
				break;
			case "SpotLight":
				n = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new H()
				};
				break;
			case "PointLight": n = {
				shadowIntensity: 1,
				shadowBias: 0,
				shadowNormalBias: 0,
				shadowRadius: 1,
				shadowMapSize: new H(),
				shadowCameraNear: 1,
				shadowCameraFar: 1e3
			};
		}
		return e[t.id] = n, n;
	} };
}
var Jl = 0;
function Yl(e, t) {
	return (t.castShadow ? 2 : 0) - (e.castShadow ? 2 : 0) + +!!t.map - !!e.map;
}
function Xl(e) {
	let t = new Kl(), n = ql(), r = {
		version: 0,
		hash: {
			directionalLength: -1,
			pointLength: -1,
			spotLength: -1,
			rectAreaLength: -1,
			hemiLength: -1,
			numDirectionalShadows: -1,
			numPointShadows: -1,
			numSpotShadows: -1,
			numSpotMaps: -1,
			numLightProbes: -1
		},
		ambient: [
			0,
			0,
			0
		],
		probe: [],
		directional: [],
		directionalShadow: [],
		directionalShadowMap: [],
		directionalShadowMatrix: [],
		spot: [],
		spotLightMap: [],
		spotShadow: [],
		spotShadowMap: [],
		spotLightMatrix: [],
		rectArea: [],
		rectAreaLTC1: null,
		rectAreaLTC2: null,
		point: [],
		pointShadow: [],
		pointShadowMap: [],
		pointShadowMatrix: [],
		hemi: [],
		numSpotLightShadowsWithMaps: 0,
		numLightProbes: 0
	};
	for (let e = 0; e < 9; e++) r.probe.push(new W());
	let i = new W(), a = new J(), o = new J();
	function s(i) {
		let a = 0, o = 0, s = 0;
		for (let e = 0; e < 9; e++) r.probe[e].set(0, 0, 0);
		let c = 0, l = 0, u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0, v = 0;
		i.sort(Yl);
		for (let e = 0, y = i.length; e < y; e++) {
			let y = i[e], b = y.color, x = y.intensity, S = y.distance, C = y.shadow && y.shadow.map ? y.shadow.map.texture : null;
			if (y.isAmbientLight) a += b.r * x, o += b.g * x, s += b.b * x;
			else if (y.isLightProbe) {
				for (let e = 0; e < 9; e++) r.probe[e].addScaledVector(y.sh.coefficients[e], x);
				v++;
			} else if (y.isDirectionalLight) {
				let e = t.get(y);
				if (e.color.copy(y.color).multiplyScalar(y.intensity), y.castShadow) {
					let e = y.shadow, t = n.get(y);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize = e.mapSize, r.directionalShadow[c] = t, r.directionalShadowMap[c] = C, r.directionalShadowMatrix[c] = y.shadow.matrix, p++;
				}
				r.directional[c] = e, c++;
			} else if (y.isSpotLight) {
				let e = t.get(y);
				e.position.setFromMatrixPosition(y.matrixWorld), e.color.copy(b).multiplyScalar(x), e.distance = S, e.coneCos = Math.cos(y.angle), e.penumbraCos = Math.cos(y.angle * (1 - y.penumbra)), e.decay = y.decay, r.spot[u] = e;
				let i = y.shadow;
				if (y.map && (r.spotLightMap[g] = y.map, g++, i.updateMatrices(y), y.castShadow && _++), r.spotLightMatrix[u] = i.matrix, y.castShadow) {
					let e = n.get(y);
					e.shadowIntensity = i.intensity, e.shadowBias = i.bias, e.shadowNormalBias = i.normalBias, e.shadowRadius = i.radius, e.shadowMapSize = i.mapSize, r.spotShadow[u] = e, r.spotShadowMap[u] = C, h++;
				}
				u++;
			} else if (y.isRectAreaLight) {
				let e = t.get(y);
				e.color.copy(b).multiplyScalar(x), e.halfWidth.set(y.width * .5, 0, 0), e.halfHeight.set(0, y.height * .5, 0), r.rectArea[d] = e, d++;
			} else if (y.isPointLight) {
				let e = t.get(y);
				if (e.color.copy(y.color).multiplyScalar(y.intensity), e.distance = y.distance, e.decay = y.decay, y.castShadow) {
					let e = y.shadow, t = n.get(y);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize = e.mapSize, t.shadowCameraNear = e.camera.near, t.shadowCameraFar = e.camera.far, r.pointShadow[l] = t, r.pointShadowMap[l] = C, r.pointShadowMatrix[l] = y.shadow.matrix, m++;
				}
				r.point[l] = e, l++;
			} else if (y.isHemisphereLight) {
				let e = t.get(y);
				e.skyColor.copy(y.color).multiplyScalar(x), e.groundColor.copy(y.groundColor).multiplyScalar(x), r.hemi[f] = e, f++;
			}
		}
		d > 0 && (e.has("OES_texture_float_linear") === !0 ? (r.rectAreaLTC1 = Z.LTC_FLOAT_1, r.rectAreaLTC2 = Z.LTC_FLOAT_2) : (r.rectAreaLTC1 = Z.LTC_HALF_1, r.rectAreaLTC2 = Z.LTC_HALF_2)), r.ambient[0] = a, r.ambient[1] = o, r.ambient[2] = s;
		let y = r.hash;
		(y.directionalLength !== c || y.pointLength !== l || y.spotLength !== u || y.rectAreaLength !== d || y.hemiLength !== f || y.numDirectionalShadows !== p || y.numPointShadows !== m || y.numSpotShadows !== h || y.numSpotMaps !== g || y.numLightProbes !== v) && (r.directional.length = c, r.spot.length = u, r.rectArea.length = d, r.point.length = l, r.hemi.length = f, r.directionalShadow.length = p, r.directionalShadowMap.length = p, r.pointShadow.length = m, r.pointShadowMap.length = m, r.spotShadow.length = h, r.spotShadowMap.length = h, r.directionalShadowMatrix.length = p, r.pointShadowMatrix.length = m, r.spotLightMatrix.length = h + g - _, r.spotLightMap.length = g, r.numSpotLightShadowsWithMaps = _, r.numLightProbes = v, y.directionalLength = c, y.pointLength = l, y.spotLength = u, y.rectAreaLength = d, y.hemiLength = f, y.numDirectionalShadows = p, y.numPointShadows = m, y.numSpotShadows = h, y.numSpotMaps = g, y.numLightProbes = v, r.version = Jl++);
	}
	function c(e, t) {
		let n = 0, s = 0, c = 0, l = 0, u = 0, d = t.matrixWorldInverse;
		for (let t = 0, f = e.length; t < f; t++) {
			let f = e[t];
			if (f.isDirectionalLight) {
				let e = r.directional[n];
				e.direction.setFromMatrixPosition(f.matrixWorld), i.setFromMatrixPosition(f.target.matrixWorld), e.direction.sub(i), e.direction.transformDirection(d), n++;
			} else if (f.isSpotLight) {
				let e = r.spot[c];
				e.position.setFromMatrixPosition(f.matrixWorld), e.position.applyMatrix4(d), e.direction.setFromMatrixPosition(f.matrixWorld), i.setFromMatrixPosition(f.target.matrixWorld), e.direction.sub(i), e.direction.transformDirection(d), c++;
			} else if (f.isRectAreaLight) {
				let e = r.rectArea[l];
				e.position.setFromMatrixPosition(f.matrixWorld), e.position.applyMatrix4(d), o.identity(), a.copy(f.matrixWorld), a.premultiply(d), o.extractRotation(a), e.halfWidth.set(f.width * .5, 0, 0), e.halfHeight.set(0, f.height * .5, 0), e.halfWidth.applyMatrix4(o), e.halfHeight.applyMatrix4(o), l++;
			} else if (f.isPointLight) {
				let e = r.point[s];
				e.position.setFromMatrixPosition(f.matrixWorld), e.position.applyMatrix4(d), s++;
			} else if (f.isHemisphereLight) {
				let e = r.hemi[u];
				e.direction.setFromMatrixPosition(f.matrixWorld), e.direction.transformDirection(d), u++;
			}
		}
	}
	return {
		setup: s,
		setupView: c,
		state: r
	};
}
function Zl(e) {
	let t = new Xl(e), n = [], r = [];
	function i(e) {
		l.camera = e, n.length = 0, r.length = 0;
	}
	function a(e) {
		n.push(e);
	}
	function o(e) {
		r.push(e);
	}
	function s() {
		t.setup(n);
	}
	function c(e) {
		t.setupView(n, e);
	}
	let l = {
		lightsArray: n,
		shadowsArray: r,
		camera: null,
		lights: t,
		transmissionRenderTarget: {}
	};
	return {
		init: i,
		state: l,
		setupLights: s,
		setupLightsView: c,
		pushLight: a,
		pushShadow: o
	};
}
function Ql(e) {
	let t = /* @__PURE__ */ new WeakMap();
	function n(n, r = 0) {
		let i = t.get(n), a;
		return i === void 0 ? (a = new Zl(e), t.set(n, [a])) : r >= i.length ? (a = new Zl(e), i.push(a)) : a = i[r], a;
	}
	function r() {
		t = /* @__PURE__ */ new WeakMap();
	}
	return {
		get: n,
		dispose: r
	};
}
var $l = "void main() {\n	gl_Position = vec4( position, 1.0 );\n}", eu = "uniform sampler2D shadow_pass;\nuniform vec2 resolution;\nuniform float radius;\n#include <packing>\nvoid main() {\n	const float samples = float( VSM_SAMPLES );\n	float mean = 0.0;\n	float squared_mean = 0.0;\n	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );\n	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;\n	for ( float i = 0.0; i < samples; i ++ ) {\n		float uvOffset = uvStart + i * uvStride;\n		#ifdef HORIZONTAL_PASS\n			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );\n			mean += distribution.x;\n			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;\n		#else\n			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );\n			mean += depth;\n			squared_mean += depth * depth;\n		#endif\n	}\n	mean = mean / samples;\n	squared_mean = squared_mean / samples;\n	float std_dev = sqrt( squared_mean - mean * mean );\n	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );\n}";
function tu(e, t, n) {
	let i = new Zr(), a = new H(), o = new H(), s = new ze(), c = new Ya({ depthPacking: 3201 }), l = new Xa(), u = {}, d = n.maxTextureSize, f = {
		0: 1,
		1: 0,
		2: 2
	}, p = new tr({
		defines: { VSM_SAMPLES: 8 },
		uniforms: {
			shadow_pass: { value: null },
			resolution: { value: new H() },
			radius: { value: 4 }
		},
		vertexShader: $l,
		fragmentShader: eu
	}), m = p.clone();
	m.defines.HORIZONTAL_PASS = 1;
	let h = new Mn();
	h.setAttribute("position", new xn(new Float32Array([
		-1,
		-1,
		.5,
		3,
		-1,
		.5,
		-1,
		3,
		.5
	]), 3));
	let g = new Wn(h, p), _ = this;
	this.enabled = !1, this.autoUpdate = !0, this.needsUpdate = !1, this.type = 1;
	let v = this.type;
	this.render = function(t, n, c) {
		if (_.enabled === !1 || _.autoUpdate === !1 && _.needsUpdate === !1 || t.length === 0) return;
		let l = e.getRenderTarget(), u = e.getActiveCubeFace(), f = e.getActiveMipmapLevel(), p = e.state;
		p.setBlending(0), p.buffers.depth.getReversed() === !0 ? p.buffers.color.setClear(0, 0, 0, 0) : p.buffers.color.setClear(1, 1, 1, 1), p.buffers.depth.setTest(!0), p.setScissorTest(!1);
		let m = v !== 3 && this.type === 3, h = v === 3 && this.type !== 3;
		for (let l = 0, u = t.length; l < u; l++) {
			let u = t[l], f = u.shadow;
			if (f === void 0) {
				console.warn("THREE.WebGLShadowMap:", u, "has no shadow.");
				continue;
			}
			if (f.autoUpdate === !1 && f.needsUpdate === !1) continue;
			a.copy(f.mapSize);
			let g = f.getFrameExtents();
			if (a.multiply(g), o.copy(f.mapSize), (a.x > d || a.y > d) && (a.x > d && (o.x = Math.floor(d / g.x), a.x = o.x * g.x, f.mapSize.x = o.x), a.y > d && (o.y = Math.floor(d / g.y), a.y = o.y * g.y, f.mapSize.y = o.y)), f.map === null || m === !0 || h === !0) {
				let e = this.type === 3 ? {} : {
					minFilter: r,
					magFilter: r
				};
				f.map !== null && f.map.dispose(), f.map = new Ve(a.x, a.y, e), f.map.texture.name = u.name + ".shadowMap", f.camera.updateProjectionMatrix();
			}
			e.setRenderTarget(f.map), e.clear();
			let _ = f.getViewportCount();
			for (let e = 0; e < _; e++) {
				let t = f.getViewport(e);
				s.set(o.x * t.x, o.y * t.y, o.x * t.z, o.y * t.w), p.viewport(s), f.updateMatrices(u, e), i = f.getFrustum(), x(n, c, f.camera, u, this.type);
			}
			f.isPointLightShadow !== !0 && this.type === 3 && y(f, c), f.needsUpdate = !1;
		}
		v = this.type, _.needsUpdate = !1, e.setRenderTarget(l, u, f);
	};
	function y(n, r) {
		let i = t.update(g);
		p.defines.VSM_SAMPLES !== n.blurSamples && (p.defines.VSM_SAMPLES = n.blurSamples, m.defines.VSM_SAMPLES = n.blurSamples, p.needsUpdate = !0, m.needsUpdate = !0), n.mapPass === null && (n.mapPass = new Ve(a.x, a.y)), p.uniforms.shadow_pass.value = n.map.texture, p.uniforms.resolution.value = n.mapSize, p.uniforms.radius.value = n.radius, e.setRenderTarget(n.mapPass), e.clear(), e.renderBufferDirect(r, null, i, p, g, null), m.uniforms.shadow_pass.value = n.mapPass.texture, m.uniforms.resolution.value = n.mapSize, m.uniforms.radius.value = n.radius, e.setRenderTarget(n.map), e.clear(), e.renderBufferDirect(r, null, i, m, g, null);
	}
	function b(t, n, r, i) {
		let a = null, o = r.isPointLight === !0 ? t.customDistanceMaterial : t.customDepthMaterial;
		if (o !== void 0) a = o;
		else if (a = r.isPointLight === !0 ? l : c, e.localClippingEnabled && n.clipShadows === !0 && Array.isArray(n.clippingPlanes) && n.clippingPlanes.length !== 0 || n.displacementMap && n.displacementScale !== 0 || n.alphaMap && n.alphaTest > 0 || n.map && n.alphaTest > 0 || n.alphaToCoverage === !0) {
			let e = a.uuid, t = n.uuid, r = u[e];
			r === void 0 && (r = {}, u[e] = r);
			let i = r[t];
			i === void 0 && (i = a.clone(), r[t] = i, n.addEventListener("dispose", S)), a = i;
		}
		if (a.visible = n.visible, a.wireframe = n.wireframe, i === 3 ? a.side = n.shadowSide === null ? n.side : n.shadowSide : a.side = n.shadowSide === null ? f[n.side] : n.shadowSide, a.alphaMap = n.alphaMap, a.alphaTest = n.alphaToCoverage === !0 ? .5 : n.alphaTest, a.map = n.map, a.clipShadows = n.clipShadows, a.clippingPlanes = n.clippingPlanes, a.clipIntersection = n.clipIntersection, a.displacementMap = n.displacementMap, a.displacementScale = n.displacementScale, a.displacementBias = n.displacementBias, a.wireframeLinewidth = n.wireframeLinewidth, a.linewidth = n.linewidth, r.isPointLight === !0 && a.isMeshDistanceMaterial === !0) {
			let t = e.properties.get(a);
			t.light = r;
		}
		return a;
	}
	function x(n, r, a, o, s) {
		if (n.visible === !1) return;
		if (n.layers.test(r.layers) && (n.isMesh || n.isLine || n.isPoints) && (n.castShadow || n.receiveShadow && s === 3) && (!n.frustumCulled || i.intersectsObject(n))) {
			n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse, n.matrixWorld);
			let i = t.update(n), c = n.material;
			if (Array.isArray(c)) {
				let t = i.groups;
				for (let l = 0, u = t.length; l < u; l++) {
					let u = t[l], d = c[u.materialIndex];
					if (d && d.visible) {
						let t = b(n, d, o, s);
						n.onBeforeShadow(e, n, r, a, i, t, u), e.renderBufferDirect(a, null, i, t, n, u), n.onAfterShadow(e, n, r, a, i, t, u);
					}
				}
			} else if (c.visible) {
				let t = b(n, c, o, s);
				n.onBeforeShadow(e, n, r, a, i, t, null), e.renderBufferDirect(a, null, i, t, n, null), n.onAfterShadow(e, n, r, a, i, t, null);
			}
		}
		let c = n.children;
		for (let e = 0, t = c.length; e < t; e++) x(c[e], r, a, o, s);
	}
	function S(e) {
		e.target.removeEventListener("dispose", S);
		for (let t in u) {
			let n = u[t], r = e.target.uuid;
			r in n && (n[r].dispose(), delete n[r]);
		}
	}
}
var nu = {
	0: 1,
	2: 6,
	4: 7,
	3: 5,
	1: 0,
	6: 2,
	7: 4,
	5: 3
};
function ru(e, t) {
	function n() {
		let t = !1, n = new ze(), r = null, i = new ze(0, 0, 0, 0);
		return {
			setMask: function(n) {
				r !== n && !t && (e.colorMask(n, n, n, n), r = n);
			},
			setLocked: function(e) {
				t = e;
			},
			setClear: function(t, r, a, o, s) {
				s === !0 && (t *= o, r *= o, a *= o), n.set(t, r, a, o), i.equals(n) === !1 && (e.clearColor(t, r, a, o), i.copy(n));
			},
			reset: function() {
				t = !1, r = null, i.set(-1, 0, 0, 0);
			}
		};
	}
	function r() {
		let n = !1, r = !1, i = null, a = null, o = null;
		return {
			setReversed: function(e) {
				if (r !== e) {
					let n = t.get("EXT_clip_control");
					e ? n.clipControlEXT(n.LOWER_LEFT_EXT, n.ZERO_TO_ONE_EXT) : n.clipControlEXT(n.LOWER_LEFT_EXT, n.NEGATIVE_ONE_TO_ONE_EXT), r = e;
					let i = o;
					o = null, this.setClear(i);
				}
			},
			getReversed: function() {
				return r;
			},
			setTest: function(t) {
				t ? ie(e.DEPTH_TEST) : z(e.DEPTH_TEST);
			},
			setMask: function(t) {
				i !== t && !n && (e.depthMask(t), i = t);
			},
			setFunc: function(t) {
				if (r && (t = nu[t]), a !== t) {
					switch (t) {
						case 0:
							e.depthFunc(e.NEVER);
							break;
						case 1:
							e.depthFunc(e.ALWAYS);
							break;
						case 2:
							e.depthFunc(e.LESS);
							break;
						case 3:
							e.depthFunc(e.LEQUAL);
							break;
						case 4:
							e.depthFunc(e.EQUAL);
							break;
						case 5:
							e.depthFunc(e.GEQUAL);
							break;
						case 6:
							e.depthFunc(e.GREATER);
							break;
						case 7:
							e.depthFunc(e.NOTEQUAL);
							break;
						default: e.depthFunc(e.LEQUAL);
					}
					a = t;
				}
			},
			setLocked: function(e) {
				n = e;
			},
			setClear: function(t) {
				o !== t && (r && (t = 1 - t), e.clearDepth(t), o = t);
			},
			reset: function() {
				n = !1, i = null, a = null, o = null, r = !1;
			}
		};
	}
	function i() {
		let t = !1, n = null, r = null, i = null, a = null, o = null, s = null, c = null, l = null;
		return {
			setTest: function(n) {
				t || (n ? ie(e.STENCIL_TEST) : z(e.STENCIL_TEST));
			},
			setMask: function(r) {
				n !== r && !t && (e.stencilMask(r), n = r);
			},
			setFunc: function(t, n, o) {
				(r !== t || i !== n || a !== o) && (e.stencilFunc(t, n, o), r = t, i = n, a = o);
			},
			setOp: function(t, n, r) {
				(o !== t || s !== n || c !== r) && (e.stencilOp(t, n, r), o = t, s = n, c = r);
			},
			setLocked: function(e) {
				t = e;
			},
			setClear: function(t) {
				l !== t && (e.clearStencil(t), l = t);
			},
			reset: function() {
				t = !1, n = null, r = null, i = null, a = null, o = null, s = null, c = null, l = null;
			}
		};
	}
	let a = new n(), o = new r(), s = new i(), c = /* @__PURE__ */ new WeakMap(), l = /* @__PURE__ */ new WeakMap(), u = {}, d = {}, f = /* @__PURE__ */ new WeakMap(), p = [], m = null, h = !1, g = null, _ = null, v = null, y = null, b = null, x = null, S = null, C = new Y(0, 0, 0), w = 0, T = !1, E = null, D = null, O = null, k = null, A = null, j = e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS), M = !1, N = 0, P = e.getParameter(e.VERSION);
	P.indexOf("WebGL") === -1 ? P.indexOf("OpenGL ES") !== -1 && (N = parseFloat(/^OpenGL ES (\d)/.exec(P)[1]), M = N >= 2) : (N = parseFloat(/^WebGL (\d)/.exec(P)[1]), M = N >= 1);
	let F = null, ee = {}, I = e.getParameter(e.SCISSOR_BOX), L = e.getParameter(e.VIEWPORT), te = new ze().fromArray(I), ne = new ze().fromArray(L);
	function re(t, n, r, i) {
		let a = /* @__PURE__ */ new Uint8Array(4), o = e.createTexture();
		e.bindTexture(t, o), e.texParameteri(t, e.TEXTURE_MIN_FILTER, e.NEAREST), e.texParameteri(t, e.TEXTURE_MAG_FILTER, e.NEAREST);
		for (let o = 0; o < r; o++) t === e.TEXTURE_3D || t === e.TEXTURE_2D_ARRAY ? e.texImage3D(n, 0, e.RGBA, 1, 1, i, 0, e.RGBA, e.UNSIGNED_BYTE, a) : e.texImage2D(n + o, 0, e.RGBA, 1, 1, 0, e.RGBA, e.UNSIGNED_BYTE, a);
		return o;
	}
	let R = {};
	R[e.TEXTURE_2D] = re(e.TEXTURE_2D, e.TEXTURE_2D, 1), R[e.TEXTURE_CUBE_MAP] = re(e.TEXTURE_CUBE_MAP, e.TEXTURE_CUBE_MAP_POSITIVE_X, 6), R[e.TEXTURE_2D_ARRAY] = re(e.TEXTURE_2D_ARRAY, e.TEXTURE_2D_ARRAY, 1, 1), R[e.TEXTURE_3D] = re(e.TEXTURE_3D, e.TEXTURE_3D, 1, 1), a.setClear(0, 0, 0, 1), o.setClear(1), s.setClear(0), ie(e.DEPTH_TEST), o.setFunc(3), fe(!1), pe(1), ie(e.CULL_FACE), ue(0);
	function ie(t) {
		u[t] !== !0 && (e.enable(t), u[t] = !0);
	}
	function z(t) {
		u[t] !== !1 && (e.disable(t), u[t] = !1);
	}
	function ae(t, n) {
		return d[t] !== n && (e.bindFramebuffer(t, n), d[t] = n, t === e.DRAW_FRAMEBUFFER && (d[e.FRAMEBUFFER] = n), t === e.FRAMEBUFFER && (d[e.DRAW_FRAMEBUFFER] = n), !0);
	}
	function oe(t, n) {
		let r = p, i = !1;
		if (t) {
			r = f.get(n), r === void 0 && (r = [], f.set(n, r));
			let a = t.textures;
			if (r.length !== a.length || r[0] !== e.COLOR_ATTACHMENT0) {
				for (let t = 0, n = a.length; t < n; t++) r[t] = e.COLOR_ATTACHMENT0 + t;
				r.length = a.length, i = !0;
			}
		} else r[0] !== e.BACK && (r[0] = e.BACK, i = !0);
		i && e.drawBuffers(r);
	}
	function se(t) {
		return m !== t && (e.useProgram(t), m = t, !0);
	}
	let ce = {
		100: e.FUNC_ADD,
		101: e.FUNC_SUBTRACT,
		102: e.FUNC_REVERSE_SUBTRACT
	};
	ce[103] = e.MIN, ce[104] = e.MAX;
	let le = {
		200: e.ZERO,
		201: e.ONE,
		202: e.SRC_COLOR,
		204: e.SRC_ALPHA,
		210: e.SRC_ALPHA_SATURATE,
		208: e.DST_COLOR,
		206: e.DST_ALPHA,
		203: e.ONE_MINUS_SRC_COLOR,
		205: e.ONE_MINUS_SRC_ALPHA,
		209: e.ONE_MINUS_DST_COLOR,
		207: e.ONE_MINUS_DST_ALPHA,
		211: e.CONSTANT_COLOR,
		212: e.ONE_MINUS_CONSTANT_COLOR,
		213: e.CONSTANT_ALPHA,
		214: e.ONE_MINUS_CONSTANT_ALPHA
	};
	function ue(t, n, r, i, a, o, s, c, l, u) {
		if (t === 0) {
			h === !0 && (z(e.BLEND), h = !1);
			return;
		}
		if (h === !1 && (ie(e.BLEND), h = !0), t !== 5) {
			if (t !== g || u !== T) {
				if ((_ !== 100 || b !== 100) && (e.blendEquation(e.FUNC_ADD), _ = 100, b = 100), u) switch (t) {
					case 1:
						e.blendFuncSeparate(e.ONE, e.ONE_MINUS_SRC_ALPHA, e.ONE, e.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						e.blendFunc(e.ONE, e.ONE);
						break;
					case 3:
						e.blendFuncSeparate(e.ZERO, e.ONE_MINUS_SRC_COLOR, e.ZERO, e.ONE);
						break;
					case 4:
						e.blendFuncSeparate(e.DST_COLOR, e.ONE_MINUS_SRC_ALPHA, e.ZERO, e.ONE);
						break;
					default: console.error("THREE.WebGLState: Invalid blending: ", t);
				}
				else switch (t) {
					case 1:
						e.blendFuncSeparate(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA, e.ONE, e.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						e.blendFuncSeparate(e.SRC_ALPHA, e.ONE, e.ONE, e.ONE);
						break;
					case 3:
						console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");
						break;
					case 4:
						console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");
						break;
					default: console.error("THREE.WebGLState: Invalid blending: ", t);
				}
				v = null, y = null, x = null, S = null, C.set(0, 0, 0), w = 0, g = t, T = u;
			}
			return;
		}
		a ||= n, o ||= r, s ||= i, (n !== _ || a !== b) && (e.blendEquationSeparate(ce[n], ce[a]), _ = n, b = a), (r !== v || i !== y || o !== x || s !== S) && (e.blendFuncSeparate(le[r], le[i], le[o], le[s]), v = r, y = i, x = o, S = s), (c.equals(C) === !1 || l !== w) && (e.blendColor(c.r, c.g, c.b, l), C.copy(c), w = l), g = t, T = !1;
	}
	function de(t, n) {
		t.side === 2 ? z(e.CULL_FACE) : ie(e.CULL_FACE);
		let r = t.side === 1;
		n && (r = !r), fe(r), t.blending === 1 && t.transparent === !1 ? ue(0) : ue(t.blending, t.blendEquation, t.blendSrc, t.blendDst, t.blendEquationAlpha, t.blendSrcAlpha, t.blendDstAlpha, t.blendColor, t.blendAlpha, t.premultipliedAlpha), o.setFunc(t.depthFunc), o.setTest(t.depthTest), o.setMask(t.depthWrite), a.setMask(t.colorWrite);
		let i = t.stencilWrite;
		s.setTest(i), i && (s.setMask(t.stencilWriteMask), s.setFunc(t.stencilFunc, t.stencilRef, t.stencilFuncMask), s.setOp(t.stencilFail, t.stencilZFail, t.stencilZPass)), me(t.polygonOffset, t.polygonOffsetFactor, t.polygonOffsetUnits), t.alphaToCoverage === !0 ? ie(e.SAMPLE_ALPHA_TO_COVERAGE) : z(e.SAMPLE_ALPHA_TO_COVERAGE);
	}
	function fe(t) {
		E !== t && (t ? e.frontFace(e.CW) : e.frontFace(e.CCW), E = t);
	}
	function pe(t) {
		t === 0 ? z(e.CULL_FACE) : (ie(e.CULL_FACE), t !== D && (t === 1 ? e.cullFace(e.BACK) : t === 2 ? e.cullFace(e.FRONT) : e.cullFace(e.FRONT_AND_BACK))), D = t;
	}
	function B(t) {
		t !== O && (M && e.lineWidth(t), O = t);
	}
	function me(t, n, r) {
		t ? (ie(e.POLYGON_OFFSET_FILL), (k !== n || A !== r) && (e.polygonOffset(n, r), k = n, A = r)) : z(e.POLYGON_OFFSET_FILL);
	}
	function he(t) {
		t ? ie(e.SCISSOR_TEST) : z(e.SCISSOR_TEST);
	}
	function ge(t) {
		t === void 0 && (t = e.TEXTURE0 + j - 1), F !== t && (e.activeTexture(t), F = t);
	}
	function V(t, n, r) {
		r === void 0 && (r = F === null ? e.TEXTURE0 + j - 1 : F);
		let i = ee[r];
		i === void 0 && (i = {
			type: void 0,
			texture: void 0
		}, ee[r] = i), (i.type !== t || i.texture !== n) && (F !== r && (e.activeTexture(r), F = r), e.bindTexture(t, n || R[t]), i.type = t, i.texture = n);
	}
	function _e() {
		let t = ee[F];
		t !== void 0 && t.type !== void 0 && (e.bindTexture(t.type, null), t.type = void 0, t.texture = void 0);
	}
	function H() {
		try {
			e.compressedTexImage2D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function U() {
		try {
			e.compressedTexImage3D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function W() {
		try {
			e.texSubImage2D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function ve() {
		try {
			e.texSubImage3D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function ye() {
		try {
			e.compressedTexSubImage2D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function G() {
		try {
			e.compressedTexSubImage3D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function be() {
		try {
			e.texStorage2D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function xe() {
		try {
			e.texStorage3D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function Se() {
		try {
			e.texImage2D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function Ce() {
		try {
			e.texImage3D(...arguments);
		} catch (e) {
			console.error("THREE.WebGLState:", e);
		}
	}
	function we(t) {
		te.equals(t) === !1 && (e.scissor(t.x, t.y, t.z, t.w), te.copy(t));
	}
	function Te(t) {
		ne.equals(t) === !1 && (e.viewport(t.x, t.y, t.z, t.w), ne.copy(t));
	}
	function Ee(t, n) {
		let r = l.get(n);
		r === void 0 && (r = /* @__PURE__ */ new WeakMap(), l.set(n, r));
		let i = r.get(t);
		i === void 0 && (i = e.getUniformBlockIndex(n, t.name), r.set(t, i));
	}
	function De(t, n) {
		let r = l.get(n).get(t);
		c.get(n) !== r && (e.uniformBlockBinding(n, r, t.__bindingPointIndex), c.set(n, r));
	}
	function Oe() {
		e.disable(e.BLEND), e.disable(e.CULL_FACE), e.disable(e.DEPTH_TEST), e.disable(e.POLYGON_OFFSET_FILL), e.disable(e.SCISSOR_TEST), e.disable(e.STENCIL_TEST), e.disable(e.SAMPLE_ALPHA_TO_COVERAGE), e.blendEquation(e.FUNC_ADD), e.blendFunc(e.ONE, e.ZERO), e.blendFuncSeparate(e.ONE, e.ZERO, e.ONE, e.ZERO), e.blendColor(0, 0, 0, 0), e.colorMask(!0, !0, !0, !0), e.clearColor(0, 0, 0, 0), e.depthMask(!0), e.depthFunc(e.LESS), o.setReversed(!1), e.clearDepth(1), e.stencilMask(4294967295), e.stencilFunc(e.ALWAYS, 0, 4294967295), e.stencilOp(e.KEEP, e.KEEP, e.KEEP), e.clearStencil(0), e.cullFace(e.BACK), e.frontFace(e.CCW), e.polygonOffset(0, 0), e.activeTexture(e.TEXTURE0), e.bindFramebuffer(e.FRAMEBUFFER, null), e.bindFramebuffer(e.DRAW_FRAMEBUFFER, null), e.bindFramebuffer(e.READ_FRAMEBUFFER, null), e.useProgram(null), e.lineWidth(1), e.scissor(0, 0, e.canvas.width, e.canvas.height), e.viewport(0, 0, e.canvas.width, e.canvas.height), u = {}, F = null, ee = {}, d = {}, f = /* @__PURE__ */ new WeakMap(), p = [], m = null, h = !1, g = null, _ = null, v = null, y = null, b = null, x = null, S = null, C = new Y(0, 0, 0), w = 0, T = !1, E = null, D = null, O = null, k = null, A = null, te.set(0, 0, e.canvas.width, e.canvas.height), ne.set(0, 0, e.canvas.width, e.canvas.height), a.reset(), o.reset(), s.reset();
	}
	return {
		buffers: {
			color: a,
			depth: o,
			stencil: s
		},
		enable: ie,
		disable: z,
		bindFramebuffer: ae,
		drawBuffers: oe,
		useProgram: se,
		setBlending: ue,
		setMaterial: de,
		setFlipSided: fe,
		setCullFace: pe,
		setLineWidth: B,
		setPolygonOffset: me,
		setScissorTest: he,
		activeTexture: ge,
		bindTexture: V,
		unbindTexture: _e,
		compressedTexImage2D: H,
		compressedTexImage3D: U,
		texImage2D: Se,
		texImage3D: Ce,
		updateUBOMapping: Ee,
		uniformBlockBinding: De,
		texStorage2D: be,
		texStorage3D: xe,
		texSubImage2D: W,
		texSubImage3D: ve,
		compressedTexSubImage2D: ye,
		compressedTexSubImage3D: G,
		scissor: we,
		viewport: Te,
		reset: Oe
	};
}
function iu(l, u, d, f, p, m, h) {
	let _ = u.has("WEBGL_multisampled_render_to_texture") ? u.get("WEBGL_multisampled_render_to_texture") : null, v = typeof navigator > "u" ? !1 : /OculusBrowser/g.test(navigator.userAgent), y = new H(), b = /* @__PURE__ */ new WeakMap(), x, S = /* @__PURE__ */ new WeakMap(), C = !1;
	try {
		C = typeof OffscreenCanvas < "u" && new OffscreenCanvas(1, 1).getContext("2d") !== null;
	} catch {}
	function w(e, t) {
		return C ? new OffscreenCanvas(e, t) : Se("canvas");
	}
	function T(e, t, n) {
		let r = 1, i = Te(e);
		if ((i.width > n || i.height > n) && (r = n / Math.max(i.width, i.height)), r < 1) {
			if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap || typeof VideoFrame < "u" && e instanceof VideoFrame) {
				let n = Math.floor(r * i.width), a = Math.floor(r * i.height);
				x === void 0 && (x = w(n, a));
				let o = t ? w(n, a) : x;
				return o.width = n, o.height = a, o.getContext("2d").drawImage(e, 0, 0, n, a), console.warn("THREE.WebGLRenderer: Texture has been resized from (" + i.width + "x" + i.height + ") to (" + n + "x" + a + ")."), o;
			}
			return "data" in e && console.warn("THREE.WebGLRenderer: Image in DataTexture is too big (" + i.width + "x" + i.height + ")."), e;
		}
		return e;
	}
	function E(e) {
		return e.generateMipmaps;
	}
	function O(e) {
		l.generateMipmap(e);
	}
	function k(e) {
		return e.isWebGLCubeRenderTarget ? l.TEXTURE_CUBE_MAP : e.isWebGL3DRenderTarget ? l.TEXTURE_3D : e.isWebGLArrayRenderTarget || e.isCompressedArrayTexture ? l.TEXTURE_2D_ARRAY : l.TEXTURE_2D;
	}
	function A(e, t, n, r, i = !1) {
		if (e !== null) {
			if (l[e] !== void 0) return l[e];
			console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '" + e + "'");
		}
		let a = t;
		if (t === l.RED && (n === l.FLOAT && (a = l.R32F), n === l.HALF_FLOAT && (a = l.R16F), n === l.UNSIGNED_BYTE && (a = l.R8)), t === l.RED_INTEGER && (n === l.UNSIGNED_BYTE && (a = l.R8UI), n === l.UNSIGNED_SHORT && (a = l.R16UI), n === l.UNSIGNED_INT && (a = l.R32UI), n === l.BYTE && (a = l.R8I), n === l.SHORT && (a = l.R16I), n === l.INT && (a = l.R32I)), t === l.RG && (n === l.FLOAT && (a = l.RG32F), n === l.HALF_FLOAT && (a = l.RG16F), n === l.UNSIGNED_BYTE && (a = l.RG8)), t === l.RG_INTEGER && (n === l.UNSIGNED_BYTE && (a = l.RG8UI), n === l.UNSIGNED_SHORT && (a = l.RG16UI), n === l.UNSIGNED_INT && (a = l.RG32UI), n === l.BYTE && (a = l.RG8I), n === l.SHORT && (a = l.RG16I), n === l.INT && (a = l.RG32I)), t === l.RGB_INTEGER && (n === l.UNSIGNED_BYTE && (a = l.RGB8UI), n === l.UNSIGNED_SHORT && (a = l.RGB16UI), n === l.UNSIGNED_INT && (a = l.RGB32UI), n === l.BYTE && (a = l.RGB8I), n === l.SHORT && (a = l.RGB16I), n === l.INT && (a = l.RGB32I)), t === l.RGBA_INTEGER && (n === l.UNSIGNED_BYTE && (a = l.RGBA8UI), n === l.UNSIGNED_SHORT && (a = l.RGBA16UI), n === l.UNSIGNED_INT && (a = l.RGBA32UI), n === l.BYTE && (a = l.RGBA8I), n === l.SHORT && (a = l.RGBA16I), n === l.INT && (a = l.RGBA32I)), t === l.RGB && (n === l.UNSIGNED_INT_5_9_9_9_REV && (a = l.RGB9_E5), n === l.UNSIGNED_INT_10F_11F_11F_REV && (a = l.R11F_G11F_B10F)), t === l.RGBA) {
			let e = i ? D : K.getTransfer(r);
			n === l.FLOAT && (a = l.RGBA32F), n === l.HALF_FLOAT && (a = l.RGBA16F), n === l.UNSIGNED_BYTE && (a = e === "srgb" ? l.SRGB8_ALPHA8 : l.RGBA8), n === l.UNSIGNED_SHORT_4_4_4_4 && (a = l.RGBA4), n === l.UNSIGNED_SHORT_5_5_5_1 && (a = l.RGB5_A1);
		}
		return (a === l.R16F || a === l.R32F || a === l.RG16F || a === l.RG32F || a === l.RGBA16F || a === l.RGBA32F) && u.get("EXT_color_buffer_float"), a;
	}
	function j(e, t) {
		let n;
		return e ? t === null || t === 1014 || t === 1020 ? n = l.DEPTH24_STENCIL8 : t === 1015 ? n = l.DEPTH32F_STENCIL8 : t === 1012 && (n = l.DEPTH24_STENCIL8, console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")) : t === null || t === 1014 || t === 1020 ? n = l.DEPTH_COMPONENT24 : t === 1015 ? n = l.DEPTH_COMPONENT32F : t === 1012 && (n = l.DEPTH_COMPONENT16), n;
	}
	function M(e, t) {
		return E(e) === !0 || e.isFramebufferTexture && e.minFilter !== 1003 && e.minFilter !== 1006 ? Math.log2(Math.max(t.width, t.height)) + 1 : e.mipmaps !== void 0 && e.mipmaps.length > 0 ? e.mipmaps.length : e.isCompressedTexture && Array.isArray(e.image) ? t.mipmaps.length : 1;
	}
	function N(e) {
		let t = e.target;
		t.removeEventListener("dispose", N), F(t), t.isVideoTexture && b.delete(t);
	}
	function P(e) {
		let t = e.target;
		t.removeEventListener("dispose", P), I(t);
	}
	function F(e) {
		let t = f.get(e);
		if (t.__webglInit === void 0) return;
		let n = e.source, r = S.get(n);
		if (r) {
			let i = r[t.__cacheKey];
			i.usedTimes--, i.usedTimes === 0 && ee(e), Object.keys(r).length === 0 && S.delete(n);
		}
		f.remove(e);
	}
	function ee(e) {
		let t = f.get(e);
		l.deleteTexture(t.__webglTexture);
		let n = e.source, r = S.get(n);
		delete r[t.__cacheKey], h.memory.textures--;
	}
	function I(e) {
		let t = f.get(e);
		if (e.depthTexture && (e.depthTexture.dispose(), f.remove(e.depthTexture)), e.isWebGLCubeRenderTarget) for (let e = 0; e < 6; e++) {
			if (Array.isArray(t.__webglFramebuffer[e])) for (let n = 0; n < t.__webglFramebuffer[e].length; n++) l.deleteFramebuffer(t.__webglFramebuffer[e][n]);
			else l.deleteFramebuffer(t.__webglFramebuffer[e]);
			t.__webglDepthbuffer && l.deleteRenderbuffer(t.__webglDepthbuffer[e]);
		}
		else {
			if (Array.isArray(t.__webglFramebuffer)) for (let e = 0; e < t.__webglFramebuffer.length; e++) l.deleteFramebuffer(t.__webglFramebuffer[e]);
			else l.deleteFramebuffer(t.__webglFramebuffer);
			if (t.__webglDepthbuffer && l.deleteRenderbuffer(t.__webglDepthbuffer), t.__webglMultisampledFramebuffer && l.deleteFramebuffer(t.__webglMultisampledFramebuffer), t.__webglColorRenderbuffer) for (let e = 0; e < t.__webglColorRenderbuffer.length; e++) t.__webglColorRenderbuffer[e] && l.deleteRenderbuffer(t.__webglColorRenderbuffer[e]);
			t.__webglDepthRenderbuffer && l.deleteRenderbuffer(t.__webglDepthRenderbuffer);
		}
		let n = e.textures;
		for (let e = 0, t = n.length; e < t; e++) {
			let t = f.get(n[e]);
			t.__webglTexture && (l.deleteTexture(t.__webglTexture), h.memory.textures--), f.remove(n[e]);
		}
		f.remove(e);
	}
	let L = 0;
	function te() {
		L = 0;
	}
	function ne() {
		let e = L;
		return e >= p.maxTextures && console.warn("THREE.WebGLTextures: Trying to use " + e + " texture units while this GPU supports only " + p.maxTextures), L += 1, e;
	}
	function re(e) {
		let t = [];
		return t.push(e.wrapS), t.push(e.wrapT), t.push(e.wrapR || 0), t.push(e.magFilter), t.push(e.minFilter), t.push(e.anisotropy), t.push(e.internalFormat), t.push(e.format), t.push(e.type), t.push(e.generateMipmaps), t.push(e.premultiplyAlpha), t.push(e.flipY), t.push(e.unpackAlignment), t.push(e.colorSpace), t.join();
	}
	function R(e, t) {
		let n = f.get(e);
		if (e.isVideoTexture && Ce(e), e.isRenderTargetTexture === !1 && e.isExternalTexture !== !0 && e.version > 0 && n.__version !== e.version) {
			let r = e.image;
			if (r === null) console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");
			else if (r.complete === !1) console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");
			else {
				pe(n, e, t);
				return;
			}
		} else e.isExternalTexture && (n.__webglTexture = e.sourceTexture ? e.sourceTexture : null);
		d.bindTexture(l.TEXTURE_2D, n.__webglTexture, l.TEXTURE0 + t);
	}
	function ie(e, t) {
		let n = f.get(e);
		if (e.isRenderTargetTexture === !1 && e.version > 0 && n.__version !== e.version) {
			pe(n, e, t);
			return;
		}
		d.bindTexture(l.TEXTURE_2D_ARRAY, n.__webglTexture, l.TEXTURE0 + t);
	}
	function z(e, t) {
		let n = f.get(e);
		if (e.isRenderTargetTexture === !1 && e.version > 0 && n.__version !== e.version) {
			pe(n, e, t);
			return;
		}
		d.bindTexture(l.TEXTURE_3D, n.__webglTexture, l.TEXTURE0 + t);
	}
	function ae(e, t) {
		let n = f.get(e);
		if (e.version > 0 && n.__version !== e.version) {
			B(n, e, t);
			return;
		}
		d.bindTexture(l.TEXTURE_CUBE_MAP, n.__webglTexture, l.TEXTURE0 + t);
	}
	let oe = {
		[e]: l.REPEAT,
		[t]: l.CLAMP_TO_EDGE,
		[n]: l.MIRRORED_REPEAT
	}, se = {
		[r]: l.NEAREST,
		[i]: l.NEAREST_MIPMAP_NEAREST,
		[a]: l.NEAREST_MIPMAP_LINEAR,
		[o]: l.LINEAR,
		[s]: l.LINEAR_MIPMAP_NEAREST,
		[c]: l.LINEAR_MIPMAP_LINEAR
	}, ce = {
		512: l.NEVER,
		519: l.ALWAYS,
		513: l.LESS,
		515: l.LEQUAL,
		514: l.EQUAL,
		518: l.GEQUAL,
		516: l.GREATER,
		517: l.NOTEQUAL
	};
	function le(e, t) {
		if (t.type === 1015 && u.has("OES_texture_float_linear") === !1 && (t.magFilter === 1006 || t.magFilter === 1007 || t.magFilter === 1005 || t.magFilter === 1008 || t.minFilter === 1006 || t.minFilter === 1007 || t.minFilter === 1005 || t.minFilter === 1008) && console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."), l.texParameteri(e, l.TEXTURE_WRAP_S, oe[t.wrapS]), l.texParameteri(e, l.TEXTURE_WRAP_T, oe[t.wrapT]), (e === l.TEXTURE_3D || e === l.TEXTURE_2D_ARRAY) && l.texParameteri(e, l.TEXTURE_WRAP_R, oe[t.wrapR]), l.texParameteri(e, l.TEXTURE_MAG_FILTER, se[t.magFilter]), l.texParameteri(e, l.TEXTURE_MIN_FILTER, se[t.minFilter]), t.compareFunction && (l.texParameteri(e, l.TEXTURE_COMPARE_MODE, l.COMPARE_REF_TO_TEXTURE), l.texParameteri(e, l.TEXTURE_COMPARE_FUNC, ce[t.compareFunction])), u.has("EXT_texture_filter_anisotropic") === !0) {
			if (t.magFilter === 1003 || t.minFilter !== 1005 && t.minFilter !== 1008 || t.type === 1015 && u.has("OES_texture_float_linear") === !1) return;
			if (t.anisotropy > 1 || f.get(t).__currentAnisotropy) {
				let n = u.get("EXT_texture_filter_anisotropic");
				l.texParameterf(e, n.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(t.anisotropy, p.getMaxAnisotropy())), f.get(t).__currentAnisotropy = t.anisotropy;
			}
		}
	}
	function ue(e, t) {
		let n = !1;
		e.__webglInit === void 0 && (e.__webglInit = !0, t.addEventListener("dispose", N));
		let r = t.source, i = S.get(r);
		i === void 0 && (i = {}, S.set(r, i));
		let a = re(t);
		if (a !== e.__cacheKey) {
			i[a] === void 0 && (i[a] = {
				texture: l.createTexture(),
				usedTimes: 0
			}, h.memory.textures++, n = !0), i[a].usedTimes++;
			let r = i[e.__cacheKey];
			r !== void 0 && (i[e.__cacheKey].usedTimes--, r.usedTimes === 0 && ee(t)), e.__cacheKey = a, e.__webglTexture = i[a].texture;
		}
		return n;
	}
	function de(e, t, n) {
		return Math.floor(Math.floor(e / n) / t);
	}
	function fe(e, t, n, r) {
		let i = e.updateRanges;
		if (i.length === 0) d.texSubImage2D(l.TEXTURE_2D, 0, 0, 0, t.width, t.height, n, r, t.data);
		else {
			i.sort((e, t) => e.start - t.start);
			let a = 0;
			for (let e = 1; e < i.length; e++) {
				let n = i[a], r = i[e], o = n.start + n.count, s = de(r.start, t.width, 4), c = de(n.start, t.width, 4);
				r.start <= o + 1 && s === c && de(r.start + r.count - 1, t.width, 4) === s ? n.count = Math.max(n.count, r.start + r.count - n.start) : (++a, i[a] = r);
			}
			i.length = a + 1;
			let o = l.getParameter(l.UNPACK_ROW_LENGTH), s = l.getParameter(l.UNPACK_SKIP_PIXELS), c = l.getParameter(l.UNPACK_SKIP_ROWS);
			l.pixelStorei(l.UNPACK_ROW_LENGTH, t.width);
			for (let e = 0, a = i.length; e < a; e++) {
				let a = i[e], o = Math.floor(a.start / 4), s = Math.ceil(a.count / 4), c = o % t.width, u = Math.floor(o / t.width), f = s;
				l.pixelStorei(l.UNPACK_SKIP_PIXELS, c), l.pixelStorei(l.UNPACK_SKIP_ROWS, u), d.texSubImage2D(l.TEXTURE_2D, 0, c, u, f, 1, n, r, t.data);
			}
			e.clearUpdateRanges(), l.pixelStorei(l.UNPACK_ROW_LENGTH, o), l.pixelStorei(l.UNPACK_SKIP_PIXELS, s), l.pixelStorei(l.UNPACK_SKIP_ROWS, c);
		}
	}
	function pe(e, t, n) {
		let r = l.TEXTURE_2D;
		(t.isDataArrayTexture || t.isCompressedArrayTexture) && (r = l.TEXTURE_2D_ARRAY), t.isData3DTexture && (r = l.TEXTURE_3D);
		let i = ue(e, t), a = t.source;
		d.bindTexture(r, e.__webglTexture, l.TEXTURE0 + n);
		let o = f.get(a);
		if (a.version !== o.__version || i === !0) {
			d.activeTexture(l.TEXTURE0 + n);
			let e = K.getPrimaries(K.workingColorSpace), s = t.colorSpace === "" ? null : K.getPrimaries(t.colorSpace), c = t.colorSpace === "" || e === s ? l.NONE : l.BROWSER_DEFAULT_WEBGL;
			l.pixelStorei(l.UNPACK_FLIP_Y_WEBGL, t.flipY), l.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL, t.premultiplyAlpha), l.pixelStorei(l.UNPACK_ALIGNMENT, t.unpackAlignment), l.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL, c);
			let u = T(t.image, !1, p.maxTextureSize);
			u = we(t, u);
			let f = m.convert(t.format, t.colorSpace), h = m.convert(t.type), _ = A(t.internalFormat, f, h, t.colorSpace, t.isVideoTexture);
			le(r, t);
			let v, y = t.mipmaps, b = t.isVideoTexture !== !0, x = o.__version === void 0 || i === !0, S = a.dataReady, C = M(t, u);
			if (t.isDepthTexture) _ = j(t.format === g, t.type), x && (b ? d.texStorage2D(l.TEXTURE_2D, 1, _, u.width, u.height) : d.texImage2D(l.TEXTURE_2D, 0, _, u.width, u.height, 0, f, h, null));
			else if (t.isDataTexture) {
				if (y.length > 0) {
					b && x && d.texStorage2D(l.TEXTURE_2D, C, _, y[0].width, y[0].height);
					for (let e = 0, t = y.length; e < t; e++) v = y[e], b ? S && d.texSubImage2D(l.TEXTURE_2D, e, 0, 0, v.width, v.height, f, h, v.data) : d.texImage2D(l.TEXTURE_2D, e, _, v.width, v.height, 0, f, h, v.data);
					t.generateMipmaps = !1;
				} else b ? (x && d.texStorage2D(l.TEXTURE_2D, C, _, u.width, u.height), S && fe(t, u, f, h)) : d.texImage2D(l.TEXTURE_2D, 0, _, u.width, u.height, 0, f, h, u.data);
			} else if (t.isCompressedTexture) {
				if (t.isCompressedArrayTexture) {
					b && x && d.texStorage3D(l.TEXTURE_2D_ARRAY, C, _, y[0].width, y[0].height, u.depth);
					for (let e = 0, n = y.length; e < n; e++) if (v = y[e], t.format !== 1023) {
						if (f !== null) {
							if (b) {
								if (S) {
									if (t.layerUpdates.size > 0) {
										let n = ds(v.width, v.height, t.format, t.type);
										for (let r of t.layerUpdates) {
											let t = v.data.subarray(r * n / v.data.BYTES_PER_ELEMENT, (r + 1) * n / v.data.BYTES_PER_ELEMENT);
											d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY, e, 0, 0, r, v.width, v.height, 1, f, t);
										}
										t.clearLayerUpdates();
									} else d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY, e, 0, 0, 0, v.width, v.height, u.depth, f, v.data);
								}
							} else d.compressedTexImage3D(l.TEXTURE_2D_ARRAY, e, _, v.width, v.height, u.depth, 0, v.data, 0, 0);
						} else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
					} else b ? S && d.texSubImage3D(l.TEXTURE_2D_ARRAY, e, 0, 0, 0, v.width, v.height, u.depth, f, h, v.data) : d.texImage3D(l.TEXTURE_2D_ARRAY, e, _, v.width, v.height, u.depth, 0, f, h, v.data);
				} else {
					b && x && d.texStorage2D(l.TEXTURE_2D, C, _, y[0].width, y[0].height);
					for (let e = 0, n = y.length; e < n; e++) v = y[e], t.format === 1023 ? b ? S && d.texSubImage2D(l.TEXTURE_2D, e, 0, 0, v.width, v.height, f, h, v.data) : d.texImage2D(l.TEXTURE_2D, e, _, v.width, v.height, 0, f, h, v.data) : f === null ? console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()") : b ? S && d.compressedTexSubImage2D(l.TEXTURE_2D, e, 0, 0, v.width, v.height, f, v.data) : d.compressedTexImage2D(l.TEXTURE_2D, e, _, v.width, v.height, 0, v.data);
				}
			} else if (t.isDataArrayTexture) {
				if (b) {
					if (x && d.texStorage3D(l.TEXTURE_2D_ARRAY, C, _, u.width, u.height, u.depth), S) {
						if (t.layerUpdates.size > 0) {
							let e = ds(u.width, u.height, t.format, t.type);
							for (let n of t.layerUpdates) {
								let t = u.data.subarray(n * e / u.data.BYTES_PER_ELEMENT, (n + 1) * e / u.data.BYTES_PER_ELEMENT);
								d.texSubImage3D(l.TEXTURE_2D_ARRAY, 0, 0, 0, n, u.width, u.height, 1, f, h, t);
							}
							t.clearLayerUpdates();
						} else d.texSubImage3D(l.TEXTURE_2D_ARRAY, 0, 0, 0, 0, u.width, u.height, u.depth, f, h, u.data);
					}
				} else d.texImage3D(l.TEXTURE_2D_ARRAY, 0, _, u.width, u.height, u.depth, 0, f, h, u.data);
			} else if (t.isData3DTexture) b ? (x && d.texStorage3D(l.TEXTURE_3D, C, _, u.width, u.height, u.depth), S && d.texSubImage3D(l.TEXTURE_3D, 0, 0, 0, 0, u.width, u.height, u.depth, f, h, u.data)) : d.texImage3D(l.TEXTURE_3D, 0, _, u.width, u.height, u.depth, 0, f, h, u.data);
			else if (t.isFramebufferTexture) {
				if (x) {
					if (b) d.texStorage2D(l.TEXTURE_2D, C, _, u.width, u.height);
					else {
						let e = u.width, t = u.height;
						for (let n = 0; n < C; n++) d.texImage2D(l.TEXTURE_2D, n, _, e, t, 0, f, h, null), e >>= 1, t >>= 1;
					}
				}
			} else if (y.length > 0) {
				if (b && x) {
					let e = Te(y[0]);
					d.texStorage2D(l.TEXTURE_2D, C, _, e.width, e.height);
				}
				for (let e = 0, t = y.length; e < t; e++) v = y[e], b ? S && d.texSubImage2D(l.TEXTURE_2D, e, 0, 0, f, h, v) : d.texImage2D(l.TEXTURE_2D, e, _, f, h, v);
				t.generateMipmaps = !1;
			} else if (b) {
				if (x) {
					let e = Te(u);
					d.texStorage2D(l.TEXTURE_2D, C, _, e.width, e.height);
				}
				S && d.texSubImage2D(l.TEXTURE_2D, 0, 0, 0, f, h, u);
			} else d.texImage2D(l.TEXTURE_2D, 0, _, f, h, u);
			E(t) && O(r), o.__version = a.version, t.onUpdate && t.onUpdate(t);
		}
		e.__version = t.version;
	}
	function B(e, t, n) {
		if (t.image.length !== 6) return;
		let r = ue(e, t), i = t.source;
		d.bindTexture(l.TEXTURE_CUBE_MAP, e.__webglTexture, l.TEXTURE0 + n);
		let a = f.get(i);
		if (i.version !== a.__version || r === !0) {
			d.activeTexture(l.TEXTURE0 + n);
			let e = K.getPrimaries(K.workingColorSpace), o = t.colorSpace === "" ? null : K.getPrimaries(t.colorSpace), s = t.colorSpace === "" || e === o ? l.NONE : l.BROWSER_DEFAULT_WEBGL;
			l.pixelStorei(l.UNPACK_FLIP_Y_WEBGL, t.flipY), l.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL, t.premultiplyAlpha), l.pixelStorei(l.UNPACK_ALIGNMENT, t.unpackAlignment), l.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL, s);
			let c = t.isCompressedTexture || t.image[0].isCompressedTexture, u = t.image[0] && t.image[0].isDataTexture, f = [];
			for (let e = 0; e < 6; e++) !c && !u ? f[e] = T(t.image[e], !0, p.maxCubemapSize) : f[e] = u ? t.image[e].image : t.image[e], f[e] = we(t, f[e]);
			let h = f[0], g = m.convert(t.format, t.colorSpace), _ = m.convert(t.type), v = A(t.internalFormat, g, _, t.colorSpace), y = t.isVideoTexture !== !0, b = a.__version === void 0 || r === !0, x = i.dataReady, S = M(t, h);
			le(l.TEXTURE_CUBE_MAP, t);
			let C;
			if (c) {
				y && b && d.texStorage2D(l.TEXTURE_CUBE_MAP, S, v, h.width, h.height);
				for (let e = 0; e < 6; e++) {
					C = f[e].mipmaps;
					for (let n = 0; n < C.length; n++) {
						let r = C[n];
						t.format === 1023 ? y ? x && d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, n, 0, 0, r.width, r.height, g, _, r.data) : d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, n, v, r.width, r.height, 0, g, _, r.data) : g === null ? console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()") : y ? x && d.compressedTexSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, n, 0, 0, r.width, r.height, g, r.data) : d.compressedTexImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, n, v, r.width, r.height, 0, r.data);
					}
				}
			} else {
				if (C = t.mipmaps, y && b) {
					C.length > 0 && S++;
					let e = Te(f[0]);
					d.texStorage2D(l.TEXTURE_CUBE_MAP, S, v, e.width, e.height);
				}
				for (let e = 0; e < 6; e++) if (u) {
					y ? x && d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, 0, 0, 0, f[e].width, f[e].height, g, _, f[e].data) : d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, 0, v, f[e].width, f[e].height, 0, g, _, f[e].data);
					for (let t = 0; t < C.length; t++) {
						let n = C[t].image[e].image;
						y ? x && d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, t + 1, 0, 0, n.width, n.height, g, _, n.data) : d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, t + 1, v, n.width, n.height, 0, g, _, n.data);
					}
				} else {
					y ? x && d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, 0, 0, 0, g, _, f[e]) : d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, 0, v, g, _, f[e]);
					for (let t = 0; t < C.length; t++) {
						let n = C[t];
						y ? x && d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, t + 1, 0, 0, g, _, n.image[e]) : d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X + e, t + 1, v, g, _, n.image[e]);
					}
				}
			}
			E(t) && O(l.TEXTURE_CUBE_MAP), a.__version = i.version, t.onUpdate && t.onUpdate(t);
		}
		e.__version = t.version;
	}
	function me(e, t, n, r, i, a) {
		let o = m.convert(n.format, n.colorSpace), s = m.convert(n.type), c = A(n.internalFormat, o, s, n.colorSpace), u = f.get(t), p = f.get(n);
		if (p.__renderTarget = t, !u.__hasExternalTextures) {
			let e = Math.max(1, t.width >> a), n = Math.max(1, t.height >> a);
			i === l.TEXTURE_3D || i === l.TEXTURE_2D_ARRAY ? d.texImage3D(i, a, c, e, n, t.depth, 0, o, s, null) : d.texImage2D(i, a, c, e, n, 0, o, s, null);
		}
		d.bindFramebuffer(l.FRAMEBUFFER, e), xe(t) ? _.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER, r, i, p.__webglTexture, 0, be(t)) : (i === l.TEXTURE_2D || i >= l.TEXTURE_CUBE_MAP_POSITIVE_X && i <= l.TEXTURE_CUBE_MAP_NEGATIVE_Z) && l.framebufferTexture2D(l.FRAMEBUFFER, r, i, p.__webglTexture, a), d.bindFramebuffer(l.FRAMEBUFFER, null);
	}
	function he(e, t, n) {
		if (l.bindRenderbuffer(l.RENDERBUFFER, e), t.depthBuffer) {
			let r = t.depthTexture, i = r && r.isDepthTexture ? r.type : null, a = j(t.stencilBuffer, i), o = t.stencilBuffer ? l.DEPTH_STENCIL_ATTACHMENT : l.DEPTH_ATTACHMENT, s = be(t);
			xe(t) ? _.renderbufferStorageMultisampleEXT(l.RENDERBUFFER, s, a, t.width, t.height) : n ? l.renderbufferStorageMultisample(l.RENDERBUFFER, s, a, t.width, t.height) : l.renderbufferStorage(l.RENDERBUFFER, a, t.width, t.height), l.framebufferRenderbuffer(l.FRAMEBUFFER, o, l.RENDERBUFFER, e);
		} else {
			let e = t.textures;
			for (let r = 0; r < e.length; r++) {
				let i = e[r], a = m.convert(i.format, i.colorSpace), o = m.convert(i.type), s = A(i.internalFormat, a, o, i.colorSpace), c = be(t);
				n && xe(t) === !1 ? l.renderbufferStorageMultisample(l.RENDERBUFFER, c, s, t.width, t.height) : xe(t) ? _.renderbufferStorageMultisampleEXT(l.RENDERBUFFER, c, s, t.width, t.height) : l.renderbufferStorage(l.RENDERBUFFER, s, t.width, t.height);
			}
		}
		l.bindRenderbuffer(l.RENDERBUFFER, null);
	}
	function ge(e, t) {
		if (t && t.isWebGLCubeRenderTarget) throw Error("Depth Texture with cube render targets is not supported");
		if (d.bindFramebuffer(l.FRAMEBUFFER, e), !(t.depthTexture && t.depthTexture.isDepthTexture)) throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");
		let n = f.get(t.depthTexture);
		n.__renderTarget = t, (!n.__webglTexture || t.depthTexture.image.width !== t.width || t.depthTexture.image.height !== t.height) && (t.depthTexture.image.width = t.width, t.depthTexture.image.height = t.height, t.depthTexture.needsUpdate = !0), R(t.depthTexture, 0);
		let r = n.__webglTexture, i = be(t);
		if (t.depthTexture.format === 1026) xe(t) ? _.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER, l.DEPTH_ATTACHMENT, l.TEXTURE_2D, r, 0, i) : l.framebufferTexture2D(l.FRAMEBUFFER, l.DEPTH_ATTACHMENT, l.TEXTURE_2D, r, 0);
		else if (t.depthTexture.format === 1027) xe(t) ? _.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER, l.DEPTH_STENCIL_ATTACHMENT, l.TEXTURE_2D, r, 0, i) : l.framebufferTexture2D(l.FRAMEBUFFER, l.DEPTH_STENCIL_ATTACHMENT, l.TEXTURE_2D, r, 0);
		else throw Error("Unknown depthTexture format");
	}
	function V(e) {
		let t = f.get(e), n = e.isWebGLCubeRenderTarget === !0;
		if (t.__boundDepthTexture !== e.depthTexture) {
			let n = e.depthTexture;
			if (t.__depthDisposeCallback && t.__depthDisposeCallback(), n) {
				let e = () => {
					delete t.__boundDepthTexture, delete t.__depthDisposeCallback, n.removeEventListener("dispose", e);
				};
				n.addEventListener("dispose", e), t.__depthDisposeCallback = e;
			}
			t.__boundDepthTexture = n;
		}
		if (e.depthTexture && !t.__autoAllocateDepthBuffer) {
			if (n) throw Error("target.depthTexture not supported in Cube render targets");
			let r = e.texture.mipmaps;
			r && r.length > 0 ? ge(t.__webglFramebuffer[0], e) : ge(t.__webglFramebuffer, e);
		} else if (n) {
			t.__webglDepthbuffer = [];
			for (let n = 0; n < 6; n++) if (d.bindFramebuffer(l.FRAMEBUFFER, t.__webglFramebuffer[n]), t.__webglDepthbuffer[n] === void 0) t.__webglDepthbuffer[n] = l.createRenderbuffer(), he(t.__webglDepthbuffer[n], e, !1);
			else {
				let r = e.stencilBuffer ? l.DEPTH_STENCIL_ATTACHMENT : l.DEPTH_ATTACHMENT, i = t.__webglDepthbuffer[n];
				l.bindRenderbuffer(l.RENDERBUFFER, i), l.framebufferRenderbuffer(l.FRAMEBUFFER, r, l.RENDERBUFFER, i);
			}
		} else {
			let n = e.texture.mipmaps;
			if (n && n.length > 0 ? d.bindFramebuffer(l.FRAMEBUFFER, t.__webglFramebuffer[0]) : d.bindFramebuffer(l.FRAMEBUFFER, t.__webglFramebuffer), t.__webglDepthbuffer === void 0) t.__webglDepthbuffer = l.createRenderbuffer(), he(t.__webglDepthbuffer, e, !1);
			else {
				let n = e.stencilBuffer ? l.DEPTH_STENCIL_ATTACHMENT : l.DEPTH_ATTACHMENT, r = t.__webglDepthbuffer;
				l.bindRenderbuffer(l.RENDERBUFFER, r), l.framebufferRenderbuffer(l.FRAMEBUFFER, n, l.RENDERBUFFER, r);
			}
		}
		d.bindFramebuffer(l.FRAMEBUFFER, null);
	}
	function _e(e, t, n) {
		let r = f.get(e);
		t !== void 0 && me(r.__webglFramebuffer, e, e.texture, l.COLOR_ATTACHMENT0, l.TEXTURE_2D, 0), n !== void 0 && V(e);
	}
	function U(e) {
		let t = e.texture, n = f.get(e), r = f.get(t);
		e.addEventListener("dispose", P);
		let i = e.textures, a = e.isWebGLCubeRenderTarget === !0, o = i.length > 1;
		if (o || (r.__webglTexture === void 0 && (r.__webglTexture = l.createTexture()), r.__version = t.version, h.memory.textures++), a) {
			n.__webglFramebuffer = [];
			for (let e = 0; e < 6; e++) if (t.mipmaps && t.mipmaps.length > 0) {
				n.__webglFramebuffer[e] = [];
				for (let r = 0; r < t.mipmaps.length; r++) n.__webglFramebuffer[e][r] = l.createFramebuffer();
			} else n.__webglFramebuffer[e] = l.createFramebuffer();
		} else {
			if (t.mipmaps && t.mipmaps.length > 0) {
				n.__webglFramebuffer = [];
				for (let e = 0; e < t.mipmaps.length; e++) n.__webglFramebuffer[e] = l.createFramebuffer();
			} else n.__webglFramebuffer = l.createFramebuffer();
			if (o) for (let e = 0, t = i.length; e < t; e++) {
				let t = f.get(i[e]);
				t.__webglTexture === void 0 && (t.__webglTexture = l.createTexture(), h.memory.textures++);
			}
			if (e.samples > 0 && xe(e) === !1) {
				n.__webglMultisampledFramebuffer = l.createFramebuffer(), n.__webglColorRenderbuffer = [], d.bindFramebuffer(l.FRAMEBUFFER, n.__webglMultisampledFramebuffer);
				for (let t = 0; t < i.length; t++) {
					let r = i[t];
					n.__webglColorRenderbuffer[t] = l.createRenderbuffer(), l.bindRenderbuffer(l.RENDERBUFFER, n.__webglColorRenderbuffer[t]);
					let a = m.convert(r.format, r.colorSpace), o = m.convert(r.type), s = A(r.internalFormat, a, o, r.colorSpace, e.isXRRenderTarget === !0), c = be(e);
					l.renderbufferStorageMultisample(l.RENDERBUFFER, c, s, e.width, e.height), l.framebufferRenderbuffer(l.FRAMEBUFFER, l.COLOR_ATTACHMENT0 + t, l.RENDERBUFFER, n.__webglColorRenderbuffer[t]);
				}
				l.bindRenderbuffer(l.RENDERBUFFER, null), e.depthBuffer && (n.__webglDepthRenderbuffer = l.createRenderbuffer(), he(n.__webglDepthRenderbuffer, e, !0)), d.bindFramebuffer(l.FRAMEBUFFER, null);
			}
		}
		if (a) {
			d.bindTexture(l.TEXTURE_CUBE_MAP, r.__webglTexture), le(l.TEXTURE_CUBE_MAP, t);
			for (let r = 0; r < 6; r++) if (t.mipmaps && t.mipmaps.length > 0) for (let i = 0; i < t.mipmaps.length; i++) me(n.__webglFramebuffer[r][i], e, t, l.COLOR_ATTACHMENT0, l.TEXTURE_CUBE_MAP_POSITIVE_X + r, i);
			else me(n.__webglFramebuffer[r], e, t, l.COLOR_ATTACHMENT0, l.TEXTURE_CUBE_MAP_POSITIVE_X + r, 0);
			E(t) && O(l.TEXTURE_CUBE_MAP), d.unbindTexture();
		} else if (o) {
			for (let t = 0, r = i.length; t < r; t++) {
				let r = i[t], a = f.get(r), o = l.TEXTURE_2D;
				(e.isWebGL3DRenderTarget || e.isWebGLArrayRenderTarget) && (o = e.isWebGL3DRenderTarget ? l.TEXTURE_3D : l.TEXTURE_2D_ARRAY), d.bindTexture(o, a.__webglTexture), le(o, r), me(n.__webglFramebuffer, e, r, l.COLOR_ATTACHMENT0 + t, o, 0), E(r) && O(o);
			}
			d.unbindTexture();
		} else {
			let i = l.TEXTURE_2D;
			if ((e.isWebGL3DRenderTarget || e.isWebGLArrayRenderTarget) && (i = e.isWebGL3DRenderTarget ? l.TEXTURE_3D : l.TEXTURE_2D_ARRAY), d.bindTexture(i, r.__webglTexture), le(i, t), t.mipmaps && t.mipmaps.length > 0) for (let r = 0; r < t.mipmaps.length; r++) me(n.__webglFramebuffer[r], e, t, l.COLOR_ATTACHMENT0, i, r);
			else me(n.__webglFramebuffer, e, t, l.COLOR_ATTACHMENT0, i, 0);
			E(t) && O(i), d.unbindTexture();
		}
		e.depthBuffer && V(e);
	}
	function W(e) {
		let t = e.textures;
		for (let n = 0, r = t.length; n < r; n++) {
			let r = t[n];
			if (E(r)) {
				let t = k(e), n = f.get(r).__webglTexture;
				d.bindTexture(t, n), O(t), d.unbindTexture();
			}
		}
	}
	let ve = [], ye = [];
	function G(e) {
		if (e.samples > 0) {
			if (xe(e) === !1) {
				let t = e.textures, n = e.width, r = e.height, i = l.COLOR_BUFFER_BIT, a = e.stencilBuffer ? l.DEPTH_STENCIL_ATTACHMENT : l.DEPTH_ATTACHMENT, o = f.get(e), s = t.length > 1;
				if (s) for (let e = 0; e < t.length; e++) d.bindFramebuffer(l.FRAMEBUFFER, o.__webglMultisampledFramebuffer), l.framebufferRenderbuffer(l.FRAMEBUFFER, l.COLOR_ATTACHMENT0 + e, l.RENDERBUFFER, null), d.bindFramebuffer(l.FRAMEBUFFER, o.__webglFramebuffer), l.framebufferTexture2D(l.DRAW_FRAMEBUFFER, l.COLOR_ATTACHMENT0 + e, l.TEXTURE_2D, null, 0);
				d.bindFramebuffer(l.READ_FRAMEBUFFER, o.__webglMultisampledFramebuffer);
				let c = e.texture.mipmaps;
				c && c.length > 0 ? d.bindFramebuffer(l.DRAW_FRAMEBUFFER, o.__webglFramebuffer[0]) : d.bindFramebuffer(l.DRAW_FRAMEBUFFER, o.__webglFramebuffer);
				for (let c = 0; c < t.length; c++) {
					if (e.resolveDepthBuffer && (e.depthBuffer && (i |= l.DEPTH_BUFFER_BIT), e.stencilBuffer && e.resolveStencilBuffer && (i |= l.STENCIL_BUFFER_BIT)), s) {
						l.framebufferRenderbuffer(l.READ_FRAMEBUFFER, l.COLOR_ATTACHMENT0, l.RENDERBUFFER, o.__webglColorRenderbuffer[c]);
						let e = f.get(t[c]).__webglTexture;
						l.framebufferTexture2D(l.DRAW_FRAMEBUFFER, l.COLOR_ATTACHMENT0, l.TEXTURE_2D, e, 0);
					}
					l.blitFramebuffer(0, 0, n, r, 0, 0, n, r, i, l.NEAREST), v === !0 && (ve.length = 0, ye.length = 0, ve.push(l.COLOR_ATTACHMENT0 + c), e.depthBuffer && e.resolveDepthBuffer === !1 && (ve.push(a), ye.push(a), l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER, ye)), l.invalidateFramebuffer(l.READ_FRAMEBUFFER, ve));
				}
				if (d.bindFramebuffer(l.READ_FRAMEBUFFER, null), d.bindFramebuffer(l.DRAW_FRAMEBUFFER, null), s) for (let e = 0; e < t.length; e++) {
					d.bindFramebuffer(l.FRAMEBUFFER, o.__webglMultisampledFramebuffer), l.framebufferRenderbuffer(l.FRAMEBUFFER, l.COLOR_ATTACHMENT0 + e, l.RENDERBUFFER, o.__webglColorRenderbuffer[e]);
					let n = f.get(t[e]).__webglTexture;
					d.bindFramebuffer(l.FRAMEBUFFER, o.__webglFramebuffer), l.framebufferTexture2D(l.DRAW_FRAMEBUFFER, l.COLOR_ATTACHMENT0 + e, l.TEXTURE_2D, n, 0);
				}
				d.bindFramebuffer(l.DRAW_FRAMEBUFFER, o.__webglMultisampledFramebuffer);
			} else if (e.depthBuffer && e.resolveDepthBuffer === !1 && v) {
				let t = e.stencilBuffer ? l.DEPTH_STENCIL_ATTACHMENT : l.DEPTH_ATTACHMENT;
				l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER, [t]);
			}
		}
	}
	function be(e) {
		return Math.min(p.maxSamples, e.samples);
	}
	function xe(e) {
		let t = f.get(e);
		return e.samples > 0 && u.has("WEBGL_multisampled_render_to_texture") === !0 && t.__useRenderToTexture !== !1;
	}
	function Ce(e) {
		let t = h.render.frame;
		b.get(e) !== t && (b.set(e, t), e.update());
	}
	function we(e, t) {
		let n = e.colorSpace, r = e.format, i = e.type;
		return e.isCompressedTexture === !0 || e.isVideoTexture === !0 || n !== "srgb-linear" && n !== "" && (K.getTransfer(n) === "srgb" ? (r !== 1023 || i !== 1009) && console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.") : console.error("THREE.WebGLTextures: Unsupported texture color space:", n)), t;
	}
	function Te(e) {
		return typeof HTMLImageElement < "u" && e instanceof HTMLImageElement ? (y.width = e.naturalWidth || e.width, y.height = e.naturalHeight || e.height) : typeof VideoFrame < "u" && e instanceof VideoFrame ? (y.width = e.displayWidth, y.height = e.displayHeight) : (y.width = e.width, y.height = e.height), y;
	}
	this.allocateTextureUnit = ne, this.resetTextureUnits = te, this.setTexture2D = R, this.setTexture2DArray = ie, this.setTexture3D = z, this.setTextureCube = ae, this.rebindTextures = _e, this.setupRenderTarget = U, this.updateRenderTargetMipmap = W, this.updateMultisampleRenderTarget = G, this.setupDepthRenderbuffer = V, this.setupFrameBufferTexture = me, this.useMultisampledRTT = xe;
}
function au(e, t) {
	function n(n, r = "") {
		let i, a = K.getTransfer(r);
		if (n === 1009) return e.UNSIGNED_BYTE;
		if (n === 1017) return e.UNSIGNED_SHORT_4_4_4_4;
		if (n === 1018) return e.UNSIGNED_SHORT_5_5_5_1;
		if (n === 35902) return e.UNSIGNED_INT_5_9_9_9_REV;
		if (n === 35899) return e.UNSIGNED_INT_10F_11F_11F_REV;
		if (n === 1010) return e.BYTE;
		if (n === 1011) return e.SHORT;
		if (n === 1012) return e.UNSIGNED_SHORT;
		if (n === 1013) return e.INT;
		if (n === 1014) return e.UNSIGNED_INT;
		if (n === 1015) return e.FLOAT;
		if (n === 1016) return e.HALF_FLOAT;
		if (n === 1021) return e.ALPHA;
		if (n === 1022) return e.RGB;
		if (n === 1023) return e.RGBA;
		if (n === 1026) return e.DEPTH_COMPONENT;
		if (n === 1027) return e.DEPTH_STENCIL;
		if (n === 1028) return e.RED;
		if (n === 1029) return e.RED_INTEGER;
		if (n === 1030) return e.RG;
		if (n === 1031) return e.RG_INTEGER;
		if (n === 1033) return e.RGBA_INTEGER;
		if (n === 33776 || n === 33777 || n === 33778 || n === 33779) {
			if (a === "srgb") {
				if (i = t.get("WEBGL_compressed_texture_s3tc_srgb"), i !== null) {
					if (n === 33776) return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;
					if (n === 33777) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
					if (n === 33778) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
					if (n === 33779) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
				} else return null;
			} else if (i = t.get("WEBGL_compressed_texture_s3tc"), i !== null) {
				if (n === 33776) return i.COMPRESSED_RGB_S3TC_DXT1_EXT;
				if (n === 33777) return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;
				if (n === 33778) return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;
				if (n === 33779) return i.COMPRESSED_RGBA_S3TC_DXT5_EXT;
			} else return null;
		}
		if (n === 35840 || n === 35841 || n === 35842 || n === 35843) {
			if (i = t.get("WEBGL_compressed_texture_pvrtc"), i !== null) {
				if (n === 35840) return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
				if (n === 35841) return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
				if (n === 35842) return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
				if (n === 35843) return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
			} else return null;
		}
		if (n === 36196 || n === 37492 || n === 37496) {
			if (i = t.get("WEBGL_compressed_texture_etc"), i !== null) {
				if (n === 36196 || n === 37492) return a === "srgb" ? i.COMPRESSED_SRGB8_ETC2 : i.COMPRESSED_RGB8_ETC2;
				if (n === 37496) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : i.COMPRESSED_RGBA8_ETC2_EAC;
			} else return null;
		}
		if (n === 37808 || n === 37809 || n === 37810 || n === 37811 || n === 37812 || n === 37813 || n === 37814 || n === 37815 || n === 37816 || n === 37817 || n === 37818 || n === 37819 || n === 37820 || n === 37821) {
			if (i = t.get("WEBGL_compressed_texture_astc"), i !== null) {
				if (n === 37808) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : i.COMPRESSED_RGBA_ASTC_4x4_KHR;
				if (n === 37809) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : i.COMPRESSED_RGBA_ASTC_5x4_KHR;
				if (n === 37810) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : i.COMPRESSED_RGBA_ASTC_5x5_KHR;
				if (n === 37811) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : i.COMPRESSED_RGBA_ASTC_6x5_KHR;
				if (n === 37812) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : i.COMPRESSED_RGBA_ASTC_6x6_KHR;
				if (n === 37813) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : i.COMPRESSED_RGBA_ASTC_8x5_KHR;
				if (n === 37814) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : i.COMPRESSED_RGBA_ASTC_8x6_KHR;
				if (n === 37815) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : i.COMPRESSED_RGBA_ASTC_8x8_KHR;
				if (n === 37816) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : i.COMPRESSED_RGBA_ASTC_10x5_KHR;
				if (n === 37817) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : i.COMPRESSED_RGBA_ASTC_10x6_KHR;
				if (n === 37818) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : i.COMPRESSED_RGBA_ASTC_10x8_KHR;
				if (n === 37819) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : i.COMPRESSED_RGBA_ASTC_10x10_KHR;
				if (n === 37820) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : i.COMPRESSED_RGBA_ASTC_12x10_KHR;
				if (n === 37821) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : i.COMPRESSED_RGBA_ASTC_12x12_KHR;
			} else return null;
		}
		if (n === 36492 || n === 36494 || n === 36495) {
			if (i = t.get("EXT_texture_compression_bptc"), i !== null) {
				if (n === 36492) return a === "srgb" ? i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : i.COMPRESSED_RGBA_BPTC_UNORM_EXT;
				if (n === 36494) return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
				if (n === 36495) return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
			} else return null;
		}
		if (n === 36283 || n === 36284 || n === 36285 || n === 36286) {
			if (i = t.get("EXT_texture_compression_rgtc"), i !== null) {
				if (n === 36283) return i.COMPRESSED_RED_RGTC1_EXT;
				if (n === 36284) return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;
				if (n === 36285) return i.COMPRESSED_RED_GREEN_RGTC2_EXT;
				if (n === 36286) return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
			} else return null;
		}
		return n === 1020 ? e.UNSIGNED_INT_24_8 : e[n] === void 0 ? null : e[n];
	}
	return { convert: n };
}
var ou = "\nvoid main() {\n\n	gl_Position = vec4( position, 1.0 );\n\n}", su = "\nuniform sampler2DArray depthColor;\nuniform float depthWidth;\nuniform float depthHeight;\n\nvoid main() {\n\n	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );\n\n	if ( coord.x >= 1.0 ) {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;\n\n	} else {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;\n\n	}\n\n}", cu = class {
	constructor() {
		this.texture = null, this.mesh = null, this.depthNear = 0, this.depthFar = 0;
	}
	init(e, t) {
		if (this.texture === null) {
			let n = new xi(e.texture);
			(e.depthNear !== t.depthNear || e.depthFar !== t.depthFar) && (this.depthNear = e.depthNear, this.depthFar = e.depthFar), this.texture = n;
		}
	}
	getMesh(e) {
		if (this.texture !== null && this.mesh === null) {
			let t = e.cameras[0].viewport, n = new tr({
				vertexShader: ou,
				fragmentShader: su,
				uniforms: {
					depthColor: { value: this.texture },
					depthWidth: { value: t.z },
					depthHeight: { value: t.w }
				}
			});
			this.mesh = new Wn(new Va(20, 20), n);
		}
		return this.mesh;
	}
	reset() {
		this.texture = null, this.mesh = null;
	}
	getDepthTexture() {
		return this.texture;
	}
}, lu = class extends M {
	constructor(e, t) {
		super();
		let n = this, r = null, i = 1, a = null, o = "local-floor", s = 1, c = null, d = null, f = null, _ = null, v = null, y = null, b = typeof XRWebGLBinding < "u", x = new cu(), S = {}, C = t.getContextAttributes(), w = null, T = null, E = [], D = [], O = new H(), k = null, A = new or();
		A.viewport = new ze();
		let j = new or();
		j.viewport = new ze();
		let M = [A, j], N = new qo(), P = null, F = null;
		this.cameraAutoUpdate = !0, this.enabled = !1, this.isPresenting = !1, this.getController = function(e) {
			let t = E[e];
			return t === void 0 && (t = new mr(), E[e] = t), t.getTargetRaySpace();
		}, this.getControllerGrip = function(e) {
			let t = E[e];
			return t === void 0 && (t = new mr(), E[e] = t), t.getGripSpace();
		}, this.getHand = function(e) {
			let t = E[e];
			return t === void 0 && (t = new mr(), E[e] = t), t.getHandSpace();
		};
		function I(e) {
			let t = D.indexOf(e.inputSource);
			if (t === -1) return;
			let n = E[t];
			n !== void 0 && (n.update(e.inputSource, e.frame, c || a), n.dispatchEvent({
				type: e.type,
				data: e.inputSource
			}));
		}
		function L() {
			r.removeEventListener("select", I), r.removeEventListener("selectstart", I), r.removeEventListener("selectend", I), r.removeEventListener("squeeze", I), r.removeEventListener("squeezestart", I), r.removeEventListener("squeezeend", I), r.removeEventListener("end", L), r.removeEventListener("inputsourceschange", te);
			for (let e = 0; e < E.length; e++) {
				let t = D[e];
				t !== null && (D[e] = null, E[e].disconnect(t));
			}
			P = null, F = null, x.reset();
			for (let e in S) delete S[e];
			e.setRenderTarget(w), v = null, _ = null, f = null, r = null, T = null, se.stop(), n.isPresenting = !1, e.setPixelRatio(k), e.setSize(O.width, O.height, !1), n.dispatchEvent({ type: "sessionend" });
		}
		this.setFramebufferScaleFactor = function(e) {
			i = e, n.isPresenting === !0 && console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.");
		}, this.setReferenceSpaceType = function(e) {
			o = e, n.isPresenting === !0 && console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.");
		}, this.getReferenceSpace = function() {
			return c || a;
		}, this.setReferenceSpace = function(e) {
			c = e;
		}, this.getBaseLayer = function() {
			return _ === null ? v : _;
		}, this.getBinding = function() {
			return f === null && b && (f = new XRWebGLBinding(r, t)), f;
		}, this.getFrame = function() {
			return y;
		}, this.getSession = function() {
			return r;
		}, this.setSession = async function(d) {
			if (r = d, r !== null) {
				if (w = e.getRenderTarget(), r.addEventListener("select", I), r.addEventListener("selectstart", I), r.addEventListener("selectend", I), r.addEventListener("squeeze", I), r.addEventListener("squeezestart", I), r.addEventListener("squeezeend", I), r.addEventListener("end", L), r.addEventListener("inputsourceschange", te), C.xrCompatible !== !0 && await t.makeXRCompatible(), k = e.getPixelRatio(), e.getSize(O), b && "createProjectionLayer" in XRWebGLBinding.prototype) {
					let n = null, a = null, o = null;
					C.depth && (o = C.stencil ? t.DEPTH24_STENCIL8 : t.DEPTH_COMPONENT24, n = C.stencil ? g : h, a = C.stencil ? p : u);
					let s = {
						colorFormat: t.RGBA8,
						depthFormat: o,
						scaleFactor: i
					};
					f = this.getBinding(), _ = f.createProjectionLayer(s), r.updateRenderState({ layers: [_] }), e.setPixelRatio(1), e.setSize(_.textureWidth, _.textureHeight, !1), T = new Ve(_.textureWidth, _.textureHeight, {
						format: m,
						type: l,
						depthTexture: new bi(_.textureWidth, _.textureHeight, a, void 0, void 0, void 0, void 0, void 0, void 0, n),
						stencilBuffer: C.stencil,
						colorSpace: e.outputColorSpace,
						samples: C.antialias ? 4 : 0,
						resolveDepthBuffer: _.ignoreDepthValues === !1,
						resolveStencilBuffer: _.ignoreDepthValues === !1
					});
				} else {
					let n = {
						antialias: C.antialias,
						alpha: !0,
						depth: C.depth,
						stencil: C.stencil,
						framebufferScaleFactor: i
					};
					v = new XRWebGLLayer(r, t, n), r.updateRenderState({ baseLayer: v }), e.setPixelRatio(1), e.setSize(v.framebufferWidth, v.framebufferHeight, !1), T = new Ve(v.framebufferWidth, v.framebufferHeight, {
						format: m,
						type: l,
						colorSpace: e.outputColorSpace,
						stencilBuffer: C.stencil,
						resolveDepthBuffer: v.ignoreDepthValues === !1,
						resolveStencilBuffer: v.ignoreDepthValues === !1
					});
				}
				T.isXRRenderTarget = !0, this.setFoveation(s), c = null, a = await r.requestReferenceSpace(o), se.setContext(r), se.start(), n.isPresenting = !0, n.dispatchEvent({ type: "sessionstart" });
			}
		}, this.getEnvironmentBlendMode = function() {
			if (r !== null) return r.environmentBlendMode;
		}, this.getDepthTexture = function() {
			return x.getDepthTexture();
		};
		function te(e) {
			for (let t = 0; t < e.removed.length; t++) {
				let n = e.removed[t], r = D.indexOf(n);
				r >= 0 && (D[r] = null, E[r].disconnect(n));
			}
			for (let t = 0; t < e.added.length; t++) {
				let n = e.added[t], r = D.indexOf(n);
				if (r === -1) {
					for (let e = 0; e < E.length; e++) if (e >= D.length) {
						D.push(n), r = e;
						break;
					} else if (D[e] === null) {
						D[e] = n, r = e;
						break;
					}
					if (r === -1) break;
				}
				let i = E[r];
				i && i.connect(n);
			}
		}
		let ne = new W(), re = new W();
		function R(e, t, n) {
			ne.setFromMatrixPosition(t.matrixWorld), re.setFromMatrixPosition(n.matrixWorld);
			let r = ne.distanceTo(re), i = t.projectionMatrix.elements, a = n.projectionMatrix.elements, o = i[14] / (i[10] - 1), s = i[14] / (i[10] + 1), c = (i[9] + 1) / i[5], l = (i[9] - 1) / i[5], u = (i[8] - 1) / i[0], d = (a[8] + 1) / a[0], f = o * u, p = o * d, m = r / (-u + d), h = m * -u;
			if (t.matrixWorld.decompose(e.position, e.quaternion, e.scale), e.translateX(h), e.translateZ(m), e.matrixWorld.compose(e.position, e.quaternion, e.scale), e.matrixWorldInverse.copy(e.matrixWorld).invert(), i[10] === -1) e.projectionMatrix.copy(t.projectionMatrix), e.projectionMatrixInverse.copy(t.projectionMatrixInverse);
			else {
				let t = o + m, n = s + m, i = f - h, a = p + (r - h), u = c * s / n * t, d = l * s / n * t;
				e.projectionMatrix.makePerspective(i, a, u, d, t, n), e.projectionMatrixInverse.copy(e.projectionMatrix).invert();
			}
		}
		function ie(e, t) {
			t === null ? e.matrixWorld.copy(e.matrix) : e.matrixWorld.multiplyMatrices(t.matrixWorld, e.matrix), e.matrixWorldInverse.copy(e.matrixWorld).invert();
		}
		this.updateCamera = function(e) {
			if (r === null) return;
			let t = e.near, n = e.far;
			x.texture !== null && (x.depthNear > 0 && (t = x.depthNear), x.depthFar > 0 && (n = x.depthFar)), N.near = j.near = A.near = t, N.far = j.far = A.far = n, (P !== N.near || F !== N.far) && (r.updateRenderState({
				depthNear: N.near,
				depthFar: N.far
			}), P = N.near, F = N.far), N.layers.mask = e.layers.mask | 6, A.layers.mask = N.layers.mask & 3, j.layers.mask = N.layers.mask & 5;
			let i = e.parent, a = N.cameras;
			ie(N, i);
			for (let e = 0; e < a.length; e++) ie(a[e], i);
			a.length === 2 ? R(N, A, j) : N.projectionMatrix.copy(A.projectionMatrix), z(e, N, i);
		};
		function z(e, t, n) {
			n === null ? e.matrix.copy(t.matrixWorld) : (e.matrix.copy(n.matrixWorld), e.matrix.invert(), e.matrix.multiply(t.matrixWorld)), e.matrix.decompose(e.position, e.quaternion, e.scale), e.updateMatrixWorld(!0), e.projectionMatrix.copy(t.projectionMatrix), e.projectionMatrixInverse.copy(t.projectionMatrixInverse), e.isPerspectiveCamera && (e.fov = ee * 2 * Math.atan(1 / e.projectionMatrix.elements[5]), e.zoom = 1);
		}
		this.getCamera = function() {
			return N;
		}, this.getFoveation = function() {
			if (_ !== null || v !== null) return s;
		}, this.setFoveation = function(e) {
			s = e, _ !== null && (_.fixedFoveation = e), v !== null && v.fixedFoveation !== void 0 && (v.fixedFoveation = e);
		}, this.hasDepthSensing = function() {
			return x.texture !== null;
		}, this.getDepthSensingMesh = function() {
			return x.getMesh(N);
		}, this.getCameraTexture = function(e) {
			return S[e];
		};
		let ae = null;
		function oe(t, i) {
			if (d = i.getViewerPose(c || a), y = i, d !== null) {
				let t = d.views;
				v !== null && (e.setRenderTargetFramebuffer(T, v.framebuffer), e.setRenderTarget(T));
				let i = !1;
				t.length !== N.cameras.length && (N.cameras.length = 0, i = !0);
				for (let n = 0; n < t.length; n++) {
					let r = t[n], a = null;
					if (v !== null) a = v.getViewport(r);
					else {
						let t = f.getViewSubImage(_, r);
						a = t.viewport, n === 0 && (e.setRenderTargetTextures(T, t.colorTexture, t.depthStencilTexture), e.setRenderTarget(T));
					}
					let o = M[n];
					o === void 0 && (o = new or(), o.layers.enable(n), o.viewport = new ze(), M[n] = o), o.matrix.fromArray(r.transform.matrix), o.matrix.decompose(o.position, o.quaternion, o.scale), o.projectionMatrix.fromArray(r.projectionMatrix), o.projectionMatrixInverse.copy(o.projectionMatrix).invert(), o.viewport.set(a.x, a.y, a.width, a.height), n === 0 && (N.matrix.copy(o.matrix), N.matrix.decompose(N.position, N.quaternion, N.scale)), i === !0 && N.cameras.push(o);
				}
				let a = r.enabledFeatures;
				if (a && a.includes("depth-sensing") && r.depthUsage == "gpu-optimized" && b) {
					f = n.getBinding();
					let e = f.getDepthInformation(t[0]);
					e && e.isValid && e.texture && x.init(e, r.renderState);
				}
				if (a && a.includes("camera-access") && b) {
					e.state.unbindTexture(), f = n.getBinding();
					for (let e = 0; e < t.length; e++) {
						let n = t[e].camera;
						if (n) {
							let e = S[n];
							e || (e = new xi(), S[n] = e);
							let t = f.getCameraImage(n);
							e.sourceTexture = t;
						}
					}
				}
			}
			for (let e = 0; e < E.length; e++) {
				let t = D[e], n = E[e];
				t !== null && n !== void 0 && n.update(t, i, c || a);
			}
			ae && ae(t, i), i.detectedPlanes && n.dispatchEvent({
				type: "planesdetected",
				data: i
			}), y = null;
		}
		let se = new ps();
		se.setAnimationLoop(oe), this.setAnimationLoop = function(e) {
			ae = e;
		}, this.dispose = function() {};
	}
}, uu = /*@__PURE__*/ new Et(), du = /*@__PURE__*/ new J();
function fu(e, t) {
	function n(e, t) {
		e.matrixAutoUpdate === !0 && e.updateMatrix(), t.value.copy(e.matrix);
	}
	function r(t, n) {
		n.color.getRGB(t.fogColor.value, Zn(e)), n.isFog ? (t.fogNear.value = n.near, t.fogFar.value = n.far) : n.isFogExp2 && (t.fogDensity.value = n.density);
	}
	function i(e, t, n, r, i) {
		t.isMeshBasicMaterial || t.isMeshLambertMaterial ? a(e, t) : t.isMeshToonMaterial ? (a(e, t), d(e, t)) : t.isMeshPhongMaterial ? (a(e, t), u(e, t)) : t.isMeshStandardMaterial ? (a(e, t), f(e, t), t.isMeshPhysicalMaterial && p(e, t, i)) : t.isMeshMatcapMaterial ? (a(e, t), m(e, t)) : t.isMeshDepthMaterial ? a(e, t) : t.isMeshDistanceMaterial ? (a(e, t), h(e, t)) : t.isMeshNormalMaterial ? a(e, t) : t.isLineBasicMaterial ? (o(e, t), t.isLineDashedMaterial && s(e, t)) : t.isPointsMaterial ? c(e, t, n, r) : t.isSpriteMaterial ? l(e, t) : t.isShadowMaterial ? (e.color.value.copy(t.color), e.opacity.value = t.opacity) : t.isShaderMaterial && (t.uniformsNeedUpdate = !1);
	}
	function a(e, r) {
		e.opacity.value = r.opacity, r.color && e.diffuse.value.copy(r.color), r.emissive && e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity), r.map && (e.map.value = r.map, n(r.map, e.mapTransform)), r.alphaMap && (e.alphaMap.value = r.alphaMap, n(r.alphaMap, e.alphaMapTransform)), r.bumpMap && (e.bumpMap.value = r.bumpMap, n(r.bumpMap, e.bumpMapTransform), e.bumpScale.value = r.bumpScale, r.side === 1 && (e.bumpScale.value *= -1)), r.normalMap && (e.normalMap.value = r.normalMap, n(r.normalMap, e.normalMapTransform), e.normalScale.value.copy(r.normalScale), r.side === 1 && e.normalScale.value.negate()), r.displacementMap && (e.displacementMap.value = r.displacementMap, n(r.displacementMap, e.displacementMapTransform), e.displacementScale.value = r.displacementScale, e.displacementBias.value = r.displacementBias), r.emissiveMap && (e.emissiveMap.value = r.emissiveMap, n(r.emissiveMap, e.emissiveMapTransform)), r.specularMap && (e.specularMap.value = r.specularMap, n(r.specularMap, e.specularMapTransform)), r.alphaTest > 0 && (e.alphaTest.value = r.alphaTest);
		let i = t.get(r), a = i.envMap, o = i.envMapRotation;
		a && (e.envMap.value = a, uu.copy(o), uu.x *= -1, uu.y *= -1, uu.z *= -1, a.isCubeTexture && a.isRenderTargetTexture === !1 && (uu.y *= -1, uu.z *= -1), e.envMapRotation.value.setFromMatrix4(du.makeRotationFromEuler(uu)), e.flipEnvMap.value = a.isCubeTexture && a.isRenderTargetTexture === !1 ? -1 : 1, e.reflectivity.value = r.reflectivity, e.ior.value = r.ior, e.refractionRatio.value = r.refractionRatio), r.lightMap && (e.lightMap.value = r.lightMap, e.lightMapIntensity.value = r.lightMapIntensity, n(r.lightMap, e.lightMapTransform)), r.aoMap && (e.aoMap.value = r.aoMap, e.aoMapIntensity.value = r.aoMapIntensity, n(r.aoMap, e.aoMapTransform));
	}
	function o(e, t) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, t.map && (e.map.value = t.map, n(t.map, e.mapTransform));
	}
	function s(e, t) {
		e.dashSize.value = t.dashSize, e.totalSize.value = t.dashSize + t.gapSize, e.scale.value = t.scale;
	}
	function c(e, t, r, i) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, e.size.value = t.size * r, e.scale.value = i * .5, t.map && (e.map.value = t.map, n(t.map, e.uvTransform)), t.alphaMap && (e.alphaMap.value = t.alphaMap, n(t.alphaMap, e.alphaMapTransform)), t.alphaTest > 0 && (e.alphaTest.value = t.alphaTest);
	}
	function l(e, t) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, e.rotation.value = t.rotation, t.map && (e.map.value = t.map, n(t.map, e.mapTransform)), t.alphaMap && (e.alphaMap.value = t.alphaMap, n(t.alphaMap, e.alphaMapTransform)), t.alphaTest > 0 && (e.alphaTest.value = t.alphaTest);
	}
	function u(e, t) {
		e.specular.value.copy(t.specular), e.shininess.value = Math.max(t.shininess, 1e-4);
	}
	function d(e, t) {
		t.gradientMap && (e.gradientMap.value = t.gradientMap);
	}
	function f(e, t) {
		e.metalness.value = t.metalness, t.metalnessMap && (e.metalnessMap.value = t.metalnessMap, n(t.metalnessMap, e.metalnessMapTransform)), e.roughness.value = t.roughness, t.roughnessMap && (e.roughnessMap.value = t.roughnessMap, n(t.roughnessMap, e.roughnessMapTransform)), t.envMap && (e.envMapIntensity.value = t.envMapIntensity);
	}
	function p(e, t, r) {
		e.ior.value = t.ior, t.sheen > 0 && (e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen), e.sheenRoughness.value = t.sheenRoughness, t.sheenColorMap && (e.sheenColorMap.value = t.sheenColorMap, n(t.sheenColorMap, e.sheenColorMapTransform)), t.sheenRoughnessMap && (e.sheenRoughnessMap.value = t.sheenRoughnessMap, n(t.sheenRoughnessMap, e.sheenRoughnessMapTransform))), t.clearcoat > 0 && (e.clearcoat.value = t.clearcoat, e.clearcoatRoughness.value = t.clearcoatRoughness, t.clearcoatMap && (e.clearcoatMap.value = t.clearcoatMap, n(t.clearcoatMap, e.clearcoatMapTransform)), t.clearcoatRoughnessMap && (e.clearcoatRoughnessMap.value = t.clearcoatRoughnessMap, n(t.clearcoatRoughnessMap, e.clearcoatRoughnessMapTransform)), t.clearcoatNormalMap && (e.clearcoatNormalMap.value = t.clearcoatNormalMap, n(t.clearcoatNormalMap, e.clearcoatNormalMapTransform), e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale), t.side === 1 && e.clearcoatNormalScale.value.negate())), t.dispersion > 0 && (e.dispersion.value = t.dispersion), t.iridescence > 0 && (e.iridescence.value = t.iridescence, e.iridescenceIOR.value = t.iridescenceIOR, e.iridescenceThicknessMinimum.value = t.iridescenceThicknessRange[0], e.iridescenceThicknessMaximum.value = t.iridescenceThicknessRange[1], t.iridescenceMap && (e.iridescenceMap.value = t.iridescenceMap, n(t.iridescenceMap, e.iridescenceMapTransform)), t.iridescenceThicknessMap && (e.iridescenceThicknessMap.value = t.iridescenceThicknessMap, n(t.iridescenceThicknessMap, e.iridescenceThicknessMapTransform))), t.transmission > 0 && (e.transmission.value = t.transmission, e.transmissionSamplerMap.value = r.texture, e.transmissionSamplerSize.value.set(r.width, r.height), t.transmissionMap && (e.transmissionMap.value = t.transmissionMap, n(t.transmissionMap, e.transmissionMapTransform)), e.thickness.value = t.thickness, t.thicknessMap && (e.thicknessMap.value = t.thicknessMap, n(t.thicknessMap, e.thicknessMapTransform)), e.attenuationDistance.value = t.attenuationDistance, e.attenuationColor.value.copy(t.attenuationColor)), t.anisotropy > 0 && (e.anisotropyVector.value.set(t.anisotropy * Math.cos(t.anisotropyRotation), t.anisotropy * Math.sin(t.anisotropyRotation)), t.anisotropyMap && (e.anisotropyMap.value = t.anisotropyMap, n(t.anisotropyMap, e.anisotropyMapTransform))), e.specularIntensity.value = t.specularIntensity, e.specularColor.value.copy(t.specularColor), t.specularColorMap && (e.specularColorMap.value = t.specularColorMap, n(t.specularColorMap, e.specularColorMapTransform)), t.specularIntensityMap && (e.specularIntensityMap.value = t.specularIntensityMap, n(t.specularIntensityMap, e.specularIntensityMapTransform));
	}
	function m(e, t) {
		t.matcap && (e.matcap.value = t.matcap);
	}
	function h(e, n) {
		let r = t.get(n).light;
		e.referencePosition.value.setFromMatrixPosition(r.matrixWorld), e.nearDistance.value = r.shadow.camera.near, e.farDistance.value = r.shadow.camera.far;
	}
	return {
		refreshFogUniforms: r,
		refreshMaterialUniforms: i
	};
}
function pu(e, t, n, r) {
	let i = {}, a = {}, o = [], s = e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);
	function c(e, t) {
		let n = t.program;
		r.uniformBlockBinding(e, n);
	}
	function l(e, n) {
		let o = i[e.id];
		o === void 0 && (m(e), o = u(e), i[e.id] = o, e.addEventListener("dispose", g));
		let s = n.program;
		r.updateUBOMapping(e, s);
		let c = t.render.frame;
		a[e.id] !== c && (f(e), a[e.id] = c);
	}
	function u(t) {
		let n = d();
		t.__bindingPointIndex = n;
		let r = e.createBuffer(), i = t.__size, a = t.usage;
		return e.bindBuffer(e.UNIFORM_BUFFER, r), e.bufferData(e.UNIFORM_BUFFER, i, a), e.bindBuffer(e.UNIFORM_BUFFER, null), e.bindBufferBase(e.UNIFORM_BUFFER, n, r), r;
	}
	function d() {
		for (let e = 0; e < s; e++) if (o.indexOf(e) === -1) return o.push(e), e;
		return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."), 0;
	}
	function f(t) {
		let n = i[t.id], r = t.uniforms, a = t.__cache;
		e.bindBuffer(e.UNIFORM_BUFFER, n);
		for (let t = 0, n = r.length; t < n; t++) {
			let n = Array.isArray(r[t]) ? r[t] : [r[t]];
			for (let r = 0, i = n.length; r < i; r++) {
				let i = n[r];
				if (p(i, t, r, a) === !0) {
					let t = i.__offset, n = Array.isArray(i.value) ? i.value : [i.value], r = 0;
					for (let a = 0; a < n.length; a++) {
						let o = n[a], s = h(o);
						typeof o == "number" || typeof o == "boolean" ? (i.__data[0] = o, e.bufferSubData(e.UNIFORM_BUFFER, t + r, i.__data)) : o.isMatrix3 ? (i.__data[0] = o.elements[0], i.__data[1] = o.elements[1], i.__data[2] = o.elements[2], i.__data[3] = 0, i.__data[4] = o.elements[3], i.__data[5] = o.elements[4], i.__data[6] = o.elements[5], i.__data[7] = 0, i.__data[8] = o.elements[6], i.__data[9] = o.elements[7], i.__data[10] = o.elements[8], i.__data[11] = 0) : (o.toArray(i.__data, r), r += s.storage / Float32Array.BYTES_PER_ELEMENT);
					}
					e.bufferSubData(e.UNIFORM_BUFFER, t, i.__data);
				}
			}
		}
		e.bindBuffer(e.UNIFORM_BUFFER, null);
	}
	function p(e, t, n, r) {
		let i = e.value, a = t + "_" + n;
		if (r[a] === void 0) return r[a] = typeof i == "number" || typeof i == "boolean" ? i : i.clone(), !0;
		{
			let e = r[a];
			if (typeof i == "number" || typeof i == "boolean") {
				if (e !== i) return r[a] = i, !0;
			} else if (e.equals(i) === !1) return e.copy(i), !0;
		}
		return !1;
	}
	function m(e) {
		let t = e.uniforms, n = 0;
		for (let e = 0, r = t.length; e < r; e++) {
			let r = Array.isArray(t[e]) ? t[e] : [t[e]];
			for (let e = 0, t = r.length; e < t; e++) {
				let t = r[e], i = Array.isArray(t.value) ? t.value : [t.value];
				for (let e = 0, r = i.length; e < r; e++) {
					let r = i[e], a = h(r), o = n % 16, s = o % a.boundary, c = o + s;
					n += s, c !== 0 && 16 - c < a.storage && (n += 16 - c), t.__data = new Float32Array(a.storage / Float32Array.BYTES_PER_ELEMENT), t.__offset = n, n += a.storage;
				}
			}
		}
		let r = n % 16;
		return r > 0 && (n += 16 - r), e.__size = n, e.__cache = {}, this;
	}
	function h(e) {
		let t = {
			boundary: 0,
			storage: 0
		};
		return typeof e == "number" || typeof e == "boolean" ? (t.boundary = 4, t.storage = 4) : e.isVector2 ? (t.boundary = 8, t.storage = 8) : e.isVector3 || e.isColor ? (t.boundary = 16, t.storage = 12) : e.isVector4 ? (t.boundary = 16, t.storage = 16) : e.isMatrix3 ? (t.boundary = 48, t.storage = 48) : e.isMatrix4 ? (t.boundary = 64, t.storage = 64) : e.isTexture ? console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.") : console.warn("THREE.WebGLRenderer: Unsupported uniform value type.", e), t;
	}
	function g(t) {
		let n = t.target;
		n.removeEventListener("dispose", g);
		let r = o.indexOf(n.__bindingPointIndex);
		o.splice(r, 1), e.deleteBuffer(i[n.id]), delete i[n.id], delete a[n.id];
	}
	function _() {
		for (let t in i) e.deleteBuffer(i[t]);
		o = [], i = {}, a = {};
	}
	return {
		bind: c,
		update: l,
		dispose: _
	};
}
var mu = class {
	constructor(e = {}) {
		let { canvas: t = Ce(), context: n = null, depth: r = !0, stencil: i = !1, alpha: a = !1, antialias: o = !1, premultipliedAlpha: s = !0, preserveDrawingBuffer: u = !1, powerPreference: d = "default", failIfMajorPerformanceCaveat: p = !1, reversedDepthBuffer: m = !1 } = e;
		this.isWebGLRenderer = !0;
		let h;
		if (n !== null) {
			if (typeof WebGLRenderingContext < "u" && n instanceof WebGLRenderingContext) throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");
			h = n.getContextAttributes().alpha;
		} else h = a;
		let g = /* @__PURE__ */ new Uint32Array(4), _ = /* @__PURE__ */ new Int32Array(4), v = null, y = null, b = [], x = [];
		this.domElement = t, this.debug = {
			checkShaderErrors: !0,
			onShaderError: null
		}, this.autoClear = !0, this.autoClearColor = !0, this.autoClearDepth = !0, this.autoClearStencil = !0, this.sortObjects = !0, this.clippingPlanes = [], this.localClippingEnabled = !1, this.toneMapping = 0, this.toneMappingExposure = 1, this.transmissionResolutionScale = 1;
		let S = this, C = !1;
		this._outputColorSpace = T;
		let w = 0, D = 0, O = null, k = -1, A = null, M = new ze(), N = new ze(), P = null, F = new Y(0), ee = 0, I = t.width, L = t.height, te = 1, ne = null, re = null, R = new ze(0, 0, I, L), ie = new ze(0, 0, I, L), z = !1, ae = new Zr(), oe = !1, se = !1, ce = new J(), le = new W(), ue = new ze(), de = {
			background: null,
			fog: null,
			environment: null,
			overrideMaterial: null,
			isScene: !0
		}, fe = !1;
		function pe() {
			return O === null ? te : 1;
		}
		let B = n;
		function me(e, n) {
			return t.getContext(e, n);
		}
		try {
			let e = {
				alpha: !0,
				depth: r,
				stencil: i,
				antialias: o,
				premultipliedAlpha: s,
				preserveDrawingBuffer: u,
				powerPreference: d,
				failIfMajorPerformanceCaveat: p
			};
			if ("setAttribute" in t && t.setAttribute("data-engine", "three.js r180"), t.addEventListener("webglcontextlost", Be, !1), t.addEventListener("webglcontextrestored", He, !1), t.addEventListener("webglcontextcreationerror", Ue, !1), B === null) {
				let t = "webgl2";
				if (B = me(t, e), B === null) throw me(t) ? Error("Error creating WebGL context with your selected attributes.") : Error("Error creating WebGL context.");
			}
		} catch (e) {
			throw console.error("THREE.WebGLRenderer: " + e.message), e;
		}
		let he, ge, V, _e, H, U, ve, ye, G, be, xe, Se, we, De, Oe, ke, Ae, je, Me, Ne, Pe, Fe, Ie, Le;
		function Re() {
			he = new qs(B), he.init(), Fe = new au(B, he), ge = new Ss(B, he, e, Fe), V = new ru(B, he), ge.reversedDepthBuffer && m && V.buffers.depth.setReversed(!0), _e = new Xs(B), H = new Vl(), U = new iu(B, he, V, H, ge, Fe, _e), ve = new ws(S), ye = new Ks(S), G = new ms(B), Ie = new bs(B, G), be = new Js(B, G, _e, Ie), xe = new Qs(B, be, G, _e), Me = new Zs(B, ge, U), ke = new Cs(H), Se = new Bl(S, ve, ye, he, ge, Ie, ke), we = new fu(S, H), De = new Gl(), Oe = new Ql(he), je = new ys(S, ve, ye, V, xe, h, s), Ae = new tu(S, xe, ge), Le = new pu(B, _e, ge, V), Ne = new xs(B, he, _e), Pe = new Ys(B, he, _e), _e.programs = Se.programs, S.capabilities = ge, S.extensions = he, S.properties = H, S.renderLists = De, S.shadowMap = Ae, S.state = V, S.info = _e;
		}
		Re();
		let q = new lu(S, B);
		this.xr = q, this.getContext = function() {
			return B;
		}, this.getContextAttributes = function() {
			return B.getContextAttributes();
		}, this.forceContextLoss = function() {
			let e = he.get("WEBGL_lose_context");
			e && e.loseContext();
		}, this.forceContextRestore = function() {
			let e = he.get("WEBGL_lose_context");
			e && e.restoreContext();
		}, this.getPixelRatio = function() {
			return te;
		}, this.setPixelRatio = function(e) {
			e !== void 0 && (te = e, this.setSize(I, L, !1));
		}, this.getSize = function(e) {
			return e.set(I, L);
		}, this.setSize = function(e, n, r = !0) {
			if (q.isPresenting) {
				console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");
				return;
			}
			I = e, L = n, t.width = Math.floor(e * te), t.height = Math.floor(n * te), r === !0 && (t.style.width = e + "px", t.style.height = n + "px"), this.setViewport(0, 0, e, n);
		}, this.getDrawingBufferSize = function(e) {
			return e.set(I * te, L * te).floor();
		}, this.setDrawingBufferSize = function(e, n, r) {
			I = e, L = n, te = r, t.width = Math.floor(e * r), t.height = Math.floor(n * r), this.setViewport(0, 0, e, n);
		}, this.getCurrentViewport = function(e) {
			return e.copy(M);
		}, this.getViewport = function(e) {
			return e.copy(R);
		}, this.setViewport = function(e, t, n, r) {
			e.isVector4 ? R.set(e.x, e.y, e.z, e.w) : R.set(e, t, n, r), V.viewport(M.copy(R).multiplyScalar(te).round());
		}, this.getScissor = function(e) {
			return e.copy(ie);
		}, this.setScissor = function(e, t, n, r) {
			e.isVector4 ? ie.set(e.x, e.y, e.z, e.w) : ie.set(e, t, n, r), V.scissor(N.copy(ie).multiplyScalar(te).round());
		}, this.getScissorTest = function() {
			return z;
		}, this.setScissorTest = function(e) {
			V.setScissorTest(z = e);
		}, this.setOpaqueSort = function(e) {
			ne = e;
		}, this.setTransparentSort = function(e) {
			re = e;
		}, this.getClearColor = function(e) {
			return e.copy(je.getClearColor());
		}, this.setClearColor = function() {
			je.setClearColor(...arguments);
		}, this.getClearAlpha = function() {
			return je.getClearAlpha();
		}, this.setClearAlpha = function() {
			je.setClearAlpha(...arguments);
		}, this.clear = function(e = !0, t = !0, n = !0) {
			let r = 0;
			if (e) {
				let e = !1;
				if (O !== null) {
					let t = O.texture.format;
					e = t === 1033 || t === 1031 || t === 1029;
				}
				if (e) {
					let e = O.texture.type, t = e === 1009 || e === 1014 || e === 1012 || e === 1020 || e === 1017 || e === 1018, n = je.getClearColor(), r = je.getClearAlpha(), i = n.r, a = n.g, o = n.b;
					t ? (g[0] = i, g[1] = a, g[2] = o, g[3] = r, B.clearBufferuiv(B.COLOR, 0, g)) : (_[0] = i, _[1] = a, _[2] = o, _[3] = r, B.clearBufferiv(B.COLOR, 0, _));
				} else r |= B.COLOR_BUFFER_BIT;
			}
			t && (r |= B.DEPTH_BUFFER_BIT), n && (r |= B.STENCIL_BUFFER_BIT, this.state.buffers.stencil.setMask(4294967295)), B.clear(r);
		}, this.clearColor = function() {
			this.clear(!0, !1, !1);
		}, this.clearDepth = function() {
			this.clear(!1, !0, !1);
		}, this.clearStencil = function() {
			this.clear(!1, !1, !0);
		}, this.dispose = function() {
			t.removeEventListener("webglcontextlost", Be, !1), t.removeEventListener("webglcontextrestored", He, !1), t.removeEventListener("webglcontextcreationerror", Ue, !1), je.dispose(), De.dispose(), Oe.dispose(), H.dispose(), ve.dispose(), ye.dispose(), xe.dispose(), Ie.dispose(), Le.dispose(), Se.dispose(), q.dispose(), q.removeEventListener("sessionstart", Xe), q.removeEventListener("sessionend", Ze), Qe.stop();
		};
		function Be(e) {
			e.preventDefault(), console.log("THREE.WebGLRenderer: Context Lost."), C = !0;
		}
		function He() {
			console.log("THREE.WebGLRenderer: Context Restored."), C = !1;
			let e = _e.autoReset, t = Ae.enabled, n = Ae.autoUpdate, r = Ae.needsUpdate, i = Ae.type;
			Re(), _e.autoReset = e, Ae.enabled = t, Ae.autoUpdate = n, Ae.needsUpdate = r, Ae.type = i;
		}
		function Ue(e) {
			console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ", e.statusMessage);
		}
		function We(e) {
			let t = e.target;
			t.removeEventListener("dispose", We), Ge(t);
		}
		function Ge(e) {
			Ke(e), H.remove(e);
		}
		function Ke(e) {
			let t = H.get(e).programs;
			t !== void 0 && (t.forEach(function(e) {
				Se.releaseProgram(e);
			}), e.isShaderMaterial && Se.releaseShaderCache(e));
		}
		this.renderBufferDirect = function(e, t, n, r, i, a) {
			t === null && (t = de);
			let o = i.isMesh && i.matrixWorld.determinant() < 0, s = st(e, t, n, r, i);
			V.setMaterial(r, o);
			let c = n.index, l = 1;
			if (r.wireframe === !0) {
				if (c = be.getWireframeAttribute(n), c === void 0) return;
				l = 2;
			}
			let u = n.drawRange, d = n.attributes.position, f = u.start * l, p = (u.start + u.count) * l;
			a !== null && (f = Math.max(f, a.start * l), p = Math.min(p, (a.start + a.count) * l)), c === null ? d != null && (f = Math.max(f, 0), p = Math.min(p, d.count)) : (f = Math.max(f, 0), p = Math.min(p, c.count));
			let m = p - f;
			if (m < 0 || m === Infinity) return;
			Ie.setup(i, r, s, n, c);
			let h, g = Ne;
			if (c !== null && (h = G.get(c), g = Pe, g.setIndex(h)), i.isMesh) r.wireframe === !0 ? (V.setLineWidth(r.wireframeLinewidth * pe()), g.setMode(B.LINES)) : g.setMode(B.TRIANGLES);
			else if (i.isLine) {
				let e = r.linewidth;
				e === void 0 && (e = 1), V.setLineWidth(e * pe()), i.isLineSegments ? g.setMode(B.LINES) : i.isLineLoop ? g.setMode(B.LINE_LOOP) : g.setMode(B.LINE_STRIP);
			} else i.isPoints ? g.setMode(B.POINTS) : i.isSprite && g.setMode(B.TRIANGLES);
			if (i.isBatchedMesh) {
				if (i._multiDrawInstances !== null) Te("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."), g.renderMultiDrawInstances(i._multiDrawStarts, i._multiDrawCounts, i._multiDrawCount, i._multiDrawInstances);
				else if (he.get("WEBGL_multi_draw")) g.renderMultiDraw(i._multiDrawStarts, i._multiDrawCounts, i._multiDrawCount);
				else {
					let e = i._multiDrawStarts, t = i._multiDrawCounts, n = i._multiDrawCount, a = c ? G.get(c).bytesPerElement : 1, o = H.get(r).currentProgram.getUniforms();
					for (let r = 0; r < n; r++) o.setValue(B, "_gl_DrawID", r), g.render(e[r] / a, t[r]);
				}
			} else if (i.isInstancedMesh) g.renderInstances(f, m, i.count);
			else if (n.isInstancedBufferGeometry) {
				let e = n._maxInstanceCount === void 0 ? Infinity : n._maxInstanceCount, t = Math.min(n.instanceCount, e);
				g.renderInstances(f, m, t);
			} else g.render(f, m);
		};
		function qe(e, t, n) {
			e.transparent === !0 && e.side === 2 && e.forceSinglePass === !1 ? (e.side = 1, e.needsUpdate = !0, it(e, t, n), e.side = 0, e.needsUpdate = !0, it(e, t, n), e.side = 2) : it(e, t, n);
		}
		this.compile = function(e, t, n = null) {
			n === null && (n = e), y = Oe.get(n), y.init(t), x.push(y), n.traverseVisible(function(e) {
				e.isLight && e.layers.test(t.layers) && (y.pushLight(e), e.castShadow && y.pushShadow(e));
			}), e !== n && e.traverseVisible(function(e) {
				e.isLight && e.layers.test(t.layers) && (y.pushLight(e), e.castShadow && y.pushShadow(e));
			}), y.setupLights();
			let r = /* @__PURE__ */ new Set();
			return e.traverse(function(e) {
				if (!(e.isMesh || e.isPoints || e.isLine || e.isSprite)) return;
				let t = e.material;
				if (t) {
					if (Array.isArray(t)) for (let i = 0; i < t.length; i++) {
						let a = t[i];
						qe(a, n, e), r.add(a);
					}
					else qe(t, n, e), r.add(t);
				}
			}), y = x.pop(), r;
		}, this.compileAsync = function(e, t, n = null) {
			let r = this.compile(e, t, n);
			return new Promise((t) => {
				function n() {
					if (r.forEach(function(e) {
						H.get(e).currentProgram.isReady() && r.delete(e);
					}), r.size === 0) {
						t(e);
						return;
					}
					setTimeout(n, 10);
				}
				he.get("KHR_parallel_shader_compile") === null ? setTimeout(n, 10) : n();
			});
		};
		let Je = null;
		function Ye(e) {
			Je && Je(e);
		}
		function Xe() {
			Qe.stop();
		}
		function Ze() {
			Qe.start();
		}
		let Qe = new ps();
		Qe.setAnimationLoop(Ye), typeof self < "u" && Qe.setContext(self), this.setAnimationLoop = function(e) {
			Je = e, q.setAnimationLoop(e), e === null ? Qe.stop() : Qe.start();
		}, q.addEventListener("sessionstart", Xe), q.addEventListener("sessionend", Ze), this.render = function(e, t) {
			if (t !== void 0 && t.isCamera !== !0) {
				console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");
				return;
			}
			if (C === !0) return;
			if (e.matrixWorldAutoUpdate === !0 && e.updateMatrixWorld(), t.parent === null && t.matrixWorldAutoUpdate === !0 && t.updateMatrixWorld(), q.enabled === !0 && q.isPresenting === !0 && (q.cameraAutoUpdate === !0 && q.updateCamera(t), t = q.getCamera()), e.isScene === !0 && e.onBeforeRender(S, e, t, O), y = Oe.get(e, x.length), y.init(t), x.push(y), ce.multiplyMatrices(t.projectionMatrix, t.matrixWorldInverse), ae.setFromProjectionMatrix(ce, j, t.reversedDepth), se = this.localClippingEnabled, oe = ke.init(this.clippingPlanes, se), v = De.get(e, b.length), v.init(), b.push(v), q.enabled === !0 && q.isPresenting === !0) {
				let e = S.xr.getDepthSensingMesh();
				e !== null && $e(e, t, -Infinity, S.sortObjects);
			}
			$e(e, t, 0, S.sortObjects), v.finish(), S.sortObjects === !0 && v.sort(ne, re), fe = q.enabled === !1 || q.isPresenting === !1 || q.hasDepthSensing() === !1, fe && je.addToRenderList(v, e), this.info.render.frame++, oe === !0 && ke.beginShadows();
			let n = y.state.shadowsArray;
			Ae.render(n, e, t), oe === !0 && ke.endShadows(), this.info.autoReset === !0 && this.info.reset();
			let r = v.opaque, i = v.transmissive;
			if (y.setupLights(), t.isArrayCamera) {
				let n = t.cameras;
				if (i.length > 0) for (let t = 0, a = n.length; t < a; t++) {
					let a = n[t];
					tt(r, i, e, a);
				}
				fe && je.render(e);
				for (let t = 0, r = n.length; t < r; t++) {
					let r = n[t];
					et(v, e, r, r.viewport);
				}
			} else i.length > 0 && tt(r, i, e, t), fe && je.render(e), et(v, e, t);
			O !== null && D === 0 && (U.updateMultisampleRenderTarget(O), U.updateRenderTargetMipmap(O)), e.isScene === !0 && e.onAfterRender(S, e, t), Ie.resetDefaultState(), k = -1, A = null, x.pop(), x.length > 0 ? (y = x[x.length - 1], oe === !0 && ke.setGlobalState(S.clippingPlanes, y.state.camera)) : y = null, b.pop(), v = b.length > 0 ? b[b.length - 1] : null;
		};
		function $e(e, t, n, r) {
			if (e.visible === !1) return;
			if (e.layers.test(t.layers)) {
				if (e.isGroup) n = e.renderOrder;
				else if (e.isLOD) e.autoUpdate === !0 && e.update(t);
				else if (e.isLight) y.pushLight(e), e.castShadow && y.pushShadow(e);
				else if (e.isSprite) {
					if (!e.frustumCulled || ae.intersectsSprite(e)) {
						r && ue.setFromMatrixPosition(e.matrixWorld).applyMatrix4(ce);
						let t = xe.update(e), i = e.material;
						i.visible && v.push(e, t, i, n, ue.z, null);
					}
				} else if ((e.isMesh || e.isLine || e.isPoints) && (!e.frustumCulled || ae.intersectsObject(e))) {
					let t = xe.update(e), i = e.material;
					if (r && (e.boundingSphere === void 0 ? (t.boundingSphere === null && t.computeBoundingSphere(), ue.copy(t.boundingSphere.center)) : (e.boundingSphere === null && e.computeBoundingSphere(), ue.copy(e.boundingSphere.center)), ue.applyMatrix4(e.matrixWorld).applyMatrix4(ce)), Array.isArray(i)) {
						let r = t.groups;
						for (let a = 0, o = r.length; a < o; a++) {
							let o = r[a], s = i[o.materialIndex];
							s && s.visible && v.push(e, t, s, n, ue.z, o);
						}
					} else i.visible && v.push(e, t, i, n, ue.z, null);
				}
			}
			let i = e.children;
			for (let e = 0, a = i.length; e < a; e++) $e(i[e], t, n, r);
		}
		function et(e, t, n, r) {
			let i = e.opaque, a = e.transmissive, o = e.transparent;
			y.setupLightsView(n), oe === !0 && ke.setGlobalState(S.clippingPlanes, n), r && V.viewport(M.copy(r)), i.length > 0 && nt(i, t, n), a.length > 0 && nt(a, t, n), o.length > 0 && nt(o, t, n), V.buffers.depth.setTest(!0), V.buffers.depth.setMask(!0), V.buffers.color.setMask(!0), V.setPolygonOffset(!1);
		}
		function tt(e, t, n, r) {
			if ((n.isScene === !0 ? n.overrideMaterial : null) !== null) return;
			y.state.transmissionRenderTarget[r.id] === void 0 && (y.state.transmissionRenderTarget[r.id] = new Ve(1, 1, {
				generateMipmaps: !0,
				type: he.has("EXT_color_buffer_half_float") || he.has("EXT_color_buffer_float") ? f : l,
				minFilter: c,
				samples: 4,
				stencilBuffer: i,
				resolveDepthBuffer: !1,
				resolveStencilBuffer: !1,
				colorSpace: K.workingColorSpace
			}));
			let a = y.state.transmissionRenderTarget[r.id], o = r.viewport || M;
			a.setSize(o.z * S.transmissionResolutionScale, o.w * S.transmissionResolutionScale);
			let s = S.getRenderTarget(), u = S.getActiveCubeFace(), d = S.getActiveMipmapLevel();
			S.setRenderTarget(a), S.getClearColor(F), ee = S.getClearAlpha(), ee < 1 && S.setClearColor(16777215, .5), S.clear(), fe && je.render(n);
			let p = S.toneMapping;
			S.toneMapping = 0;
			let m = r.viewport;
			if (r.viewport !== void 0 && (r.viewport = void 0), y.setupLightsView(r), oe === !0 && ke.setGlobalState(S.clippingPlanes, r), nt(e, n, r), U.updateMultisampleRenderTarget(a), U.updateRenderTargetMipmap(a), he.has("WEBGL_multisampled_render_to_texture") === !1) {
				let e = !1;
				for (let i = 0, a = t.length; i < a; i++) {
					let a = t[i], o = a.object, s = a.geometry, c = a.material, l = a.group;
					if (c.side === 2 && o.layers.test(r.layers)) {
						let t = c.side;
						c.side = 1, c.needsUpdate = !0, rt(o, n, r, s, c, l), c.side = t, c.needsUpdate = !0, e = !0;
					}
				}
				e === !0 && (U.updateMultisampleRenderTarget(a), U.updateRenderTargetMipmap(a));
			}
			S.setRenderTarget(s, u, d), S.setClearColor(F, ee), m !== void 0 && (r.viewport = m), S.toneMapping = p;
		}
		function nt(e, t, n) {
			let r = t.isScene === !0 ? t.overrideMaterial : null;
			for (let i = 0, a = e.length; i < a; i++) {
				let a = e[i], o = a.object, s = a.geometry, c = a.group, l = a.material;
				l.allowOverride === !0 && r !== null && (l = r), o.layers.test(n.layers) && rt(o, t, n, s, l, c);
			}
		}
		function rt(e, t, n, r, i, a) {
			e.onBeforeRender(S, t, n, r, i, a), e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse, e.matrixWorld), e.normalMatrix.getNormalMatrix(e.modelViewMatrix), i.onBeforeRender(S, t, n, r, e, a), i.transparent === !0 && i.side === 2 && i.forceSinglePass === !1 ? (i.side = 1, i.needsUpdate = !0, S.renderBufferDirect(n, t, r, i, e, a), i.side = 0, i.needsUpdate = !0, S.renderBufferDirect(n, t, r, i, e, a), i.side = 2) : S.renderBufferDirect(n, t, r, i, e, a), e.onAfterRender(S, t, n, r, i, a);
		}
		function it(e, t, n) {
			t.isScene !== !0 && (t = de);
			let r = H.get(e), i = y.state.lights, a = y.state.shadowsArray, o = i.state.version, s = Se.getParameters(e, i.state, a, t, n), c = Se.getProgramCacheKey(s), l = r.programs;
			r.environment = e.isMeshStandardMaterial ? t.environment : null, r.fog = t.fog, r.envMap = (e.isMeshStandardMaterial ? ye : ve).get(e.envMap || r.environment), r.envMapRotation = r.environment !== null && e.envMap === null ? t.environmentRotation : e.envMapRotation, l === void 0 && (e.addEventListener("dispose", We), l = /* @__PURE__ */ new Map(), r.programs = l);
			let u = l.get(c);
			if (u !== void 0) {
				if (r.currentProgram === u && r.lightsStateVersion === o) return ot(e, s), u;
			} else s.uniforms = Se.getUniforms(e), e.onBeforeCompile(s, S), u = Se.acquireProgram(s, c), l.set(c, u), r.uniforms = s.uniforms;
			let d = r.uniforms;
			return (!e.isShaderMaterial && !e.isRawShaderMaterial || e.clipping === !0) && (d.clippingPlanes = ke.uniform), ot(e, s), r.needsLights = lt(e), r.lightsStateVersion = o, r.needsLights && (d.ambientLightColor.value = i.state.ambient, d.lightProbe.value = i.state.probe, d.directionalLights.value = i.state.directional, d.directionalLightShadows.value = i.state.directionalShadow, d.spotLights.value = i.state.spot, d.spotLightShadows.value = i.state.spotShadow, d.rectAreaLights.value = i.state.rectArea, d.ltc_1.value = i.state.rectAreaLTC1, d.ltc_2.value = i.state.rectAreaLTC2, d.pointLights.value = i.state.point, d.pointLightShadows.value = i.state.pointShadow, d.hemisphereLights.value = i.state.hemi, d.directionalShadowMap.value = i.state.directionalShadowMap, d.directionalShadowMatrix.value = i.state.directionalShadowMatrix, d.spotShadowMap.value = i.state.spotShadowMap, d.spotLightMatrix.value = i.state.spotLightMatrix, d.spotLightMap.value = i.state.spotLightMap, d.pointShadowMap.value = i.state.pointShadowMap, d.pointShadowMatrix.value = i.state.pointShadowMatrix), r.currentProgram = u, r.uniformsList = null, u;
		}
		function at(e) {
			if (e.uniformsList === null) {
				let t = e.currentProgram.getUniforms();
				e.uniformsList = al.seqWithValue(t.seq, e.uniforms);
			}
			return e.uniformsList;
		}
		function ot(e, t) {
			let n = H.get(e);
			n.outputColorSpace = t.outputColorSpace, n.batching = t.batching, n.batchingColor = t.batchingColor, n.instancing = t.instancing, n.instancingColor = t.instancingColor, n.instancingMorph = t.instancingMorph, n.skinning = t.skinning, n.morphTargets = t.morphTargets, n.morphNormals = t.morphNormals, n.morphColors = t.morphColors, n.morphTargetsCount = t.morphTargetsCount, n.numClippingPlanes = t.numClippingPlanes, n.numIntersection = t.numClipIntersection, n.vertexAlphas = t.vertexAlphas, n.vertexTangents = t.vertexTangents, n.toneMapping = t.toneMapping;
		}
		function st(e, t, n, r, i) {
			t.isScene !== !0 && (t = de), U.resetTextureUnits();
			let a = t.fog, o = r.isMeshStandardMaterial ? t.environment : null, s = O === null ? S.outputColorSpace : O.isXRRenderTarget === !0 ? O.texture.colorSpace : E, c = (r.isMeshStandardMaterial ? ye : ve).get(r.envMap || o), l = r.vertexColors === !0 && !!n.attributes.color && n.attributes.color.itemSize === 4, u = !!n.attributes.tangent && (!!r.normalMap || r.anisotropy > 0), d = !!n.morphAttributes.position, f = !!n.morphAttributes.normal, p = !!n.morphAttributes.color, m = 0;
			r.toneMapped && (O === null || O.isXRRenderTarget === !0) && (m = S.toneMapping);
			let h = n.morphAttributes.position || n.morphAttributes.normal || n.morphAttributes.color, g = h === void 0 ? 0 : h.length, _ = H.get(r), v = y.state.lights;
			if (oe === !0 && (se === !0 || e !== A)) {
				let t = e === A && r.id === k;
				ke.setState(r, e, t);
			}
			let b = !1;
			r.version === _.__version ? _.needsLights && _.lightsStateVersion !== v.state.version ? b = !0 : _.outputColorSpace === s ? i.isBatchedMesh && _.batching === !1 || !i.isBatchedMesh && _.batching === !0 || i.isBatchedMesh && _.batchingColor === !0 && i.colorTexture === null || i.isBatchedMesh && _.batchingColor === !1 && i.colorTexture !== null || i.isInstancedMesh && _.instancing === !1 || !i.isInstancedMesh && _.instancing === !0 || i.isSkinnedMesh && _.skinning === !1 || !i.isSkinnedMesh && _.skinning === !0 || i.isInstancedMesh && _.instancingColor === !0 && i.instanceColor === null || i.isInstancedMesh && _.instancingColor === !1 && i.instanceColor !== null || i.isInstancedMesh && _.instancingMorph === !0 && i.morphTexture === null || i.isInstancedMesh && _.instancingMorph === !1 && i.morphTexture !== null ? b = !0 : _.envMap === c ? r.fog === !0 && _.fog !== a || _.numClippingPlanes !== void 0 && (_.numClippingPlanes !== ke.numPlanes || _.numIntersection !== ke.numIntersection) ? b = !0 : _.vertexAlphas === l && _.vertexTangents === u && _.morphTargets === d && _.morphNormals === f && _.morphColors === p && _.toneMapping === m ? _.morphTargetsCount !== g && (b = !0) : b = !0 : b = !0 : b = !0 : (b = !0, _.__version = r.version);
			let x = _.currentProgram;
			b === !0 && (x = it(r, t, i));
			let C = !1, w = !1, T = !1, D = x.getUniforms(), j = _.uniforms;
			if (V.useProgram(x.program) && (C = !0, w = !0, T = !0), r.id !== k && (k = r.id, w = !0), C || A !== e) {
				V.buffers.depth.getReversed() && e.reversedDepth !== !0 && (e._reversedDepth = !0, e.updateProjectionMatrix()), D.setValue(B, "projectionMatrix", e.projectionMatrix), D.setValue(B, "viewMatrix", e.matrixWorldInverse);
				let t = D.map.cameraPosition;
				t !== void 0 && t.setValue(B, le.setFromMatrixPosition(e.matrixWorld)), ge.logarithmicDepthBuffer && D.setValue(B, "logDepthBufFC", 2 / (Math.log(e.far + 1) / Math.LN2)), (r.isMeshPhongMaterial || r.isMeshToonMaterial || r.isMeshLambertMaterial || r.isMeshBasicMaterial || r.isMeshStandardMaterial || r.isShaderMaterial) && D.setValue(B, "isOrthographic", e.isOrthographicCamera === !0), A !== e && (A = e, w = !0, T = !0);
			}
			if (i.isSkinnedMesh) {
				D.setOptional(B, i, "bindMatrix"), D.setOptional(B, i, "bindMatrixInverse");
				let e = i.skeleton;
				e && (e.boneTexture === null && e.computeBoneTexture(), D.setValue(B, "boneTexture", e.boneTexture, U));
			}
			i.isBatchedMesh && (D.setOptional(B, i, "batchingTexture"), D.setValue(B, "batchingTexture", i._matricesTexture, U), D.setOptional(B, i, "batchingIdTexture"), D.setValue(B, "batchingIdTexture", i._indirectTexture, U), D.setOptional(B, i, "batchingColorTexture"), i._colorsTexture !== null && D.setValue(B, "batchingColorTexture", i._colorsTexture, U));
			let M = n.morphAttributes;
			if ((M.position !== void 0 || M.normal !== void 0 || M.color !== void 0) && Me.update(i, n, x), (w || _.receiveShadow !== i.receiveShadow) && (_.receiveShadow = i.receiveShadow, D.setValue(B, "receiveShadow", i.receiveShadow)), r.isMeshGouraudMaterial && r.envMap !== null && (j.envMap.value = c, j.flipEnvMap.value = c.isCubeTexture && c.isRenderTargetTexture === !1 ? -1 : 1), r.isMeshStandardMaterial && r.envMap === null && t.environment !== null && (j.envMapIntensity.value = t.environmentIntensity), w && (D.setValue(B, "toneMappingExposure", S.toneMappingExposure), _.needsLights && ct(j, T), a && r.fog === !0 && we.refreshFogUniforms(j, a), we.refreshMaterialUniforms(j, r, te, L, y.state.transmissionRenderTarget[e.id]), al.upload(B, at(_), j, U)), r.isShaderMaterial && r.uniformsNeedUpdate === !0 && (al.upload(B, at(_), j, U), r.uniformsNeedUpdate = !1), r.isSpriteMaterial && D.setValue(B, "center", i.center), D.setValue(B, "modelViewMatrix", i.modelViewMatrix), D.setValue(B, "normalMatrix", i.normalMatrix), D.setValue(B, "modelMatrix", i.matrixWorld), r.isShaderMaterial || r.isRawShaderMaterial) {
				let e = r.uniformsGroups;
				for (let t = 0, n = e.length; t < n; t++) {
					let n = e[t];
					Le.update(n, x), Le.bind(n, x);
				}
			}
			return x;
		}
		function ct(e, t) {
			e.ambientLightColor.needsUpdate = t, e.lightProbe.needsUpdate = t, e.directionalLights.needsUpdate = t, e.directionalLightShadows.needsUpdate = t, e.pointLights.needsUpdate = t, e.pointLightShadows.needsUpdate = t, e.spotLights.needsUpdate = t, e.spotLightShadows.needsUpdate = t, e.rectAreaLights.needsUpdate = t, e.hemisphereLights.needsUpdate = t;
		}
		function lt(e) {
			return e.isMeshLambertMaterial || e.isMeshToonMaterial || e.isMeshPhongMaterial || e.isMeshStandardMaterial || e.isShadowMaterial || e.isShaderMaterial && e.lights === !0;
		}
		this.getActiveCubeFace = function() {
			return w;
		}, this.getActiveMipmapLevel = function() {
			return D;
		}, this.getRenderTarget = function() {
			return O;
		}, this.setRenderTargetTextures = function(e, t, n) {
			let r = H.get(e);
			r.__autoAllocateDepthBuffer = e.resolveDepthBuffer === !1, r.__autoAllocateDepthBuffer === !1 && (r.__useRenderToTexture = !1), H.get(e.texture).__webglTexture = t, H.get(e.depthTexture).__webglTexture = r.__autoAllocateDepthBuffer ? void 0 : n, r.__hasExternalTextures = !0;
		}, this.setRenderTargetFramebuffer = function(e, t) {
			let n = H.get(e);
			n.__webglFramebuffer = t, n.__useDefaultFramebuffer = t === void 0;
		};
		let ut = B.createFramebuffer();
		this.setRenderTarget = function(e, t = 0, n = 0) {
			O = e, w = t, D = n;
			let r = !0, i = null, a = !1, o = !1;
			if (e) {
				let s = H.get(e);
				if (s.__useDefaultFramebuffer !== void 0) V.bindFramebuffer(B.FRAMEBUFFER, null), r = !1;
				else if (s.__webglFramebuffer === void 0) U.setupRenderTarget(e);
				else if (s.__hasExternalTextures) U.rebindTextures(e, H.get(e.texture).__webglTexture, H.get(e.depthTexture).__webglTexture);
				else if (e.depthBuffer) {
					let t = e.depthTexture;
					if (s.__boundDepthTexture !== t) {
						if (t !== null && H.has(t) && (e.width !== t.image.width || e.height !== t.image.height)) throw Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");
						U.setupDepthRenderbuffer(e);
					}
				}
				let c = e.texture;
				(c.isData3DTexture || c.isDataArrayTexture || c.isCompressedArrayTexture) && (o = !0);
				let l = H.get(e).__webglFramebuffer;
				e.isWebGLCubeRenderTarget ? (i = Array.isArray(l[t]) ? l[t][n] : l[t], a = !0) : i = e.samples > 0 && U.useMultisampledRTT(e) === !1 ? H.get(e).__webglMultisampledFramebuffer : Array.isArray(l) ? l[n] : l, M.copy(e.viewport), N.copy(e.scissor), P = e.scissorTest;
			} else M.copy(R).multiplyScalar(te).floor(), N.copy(ie).multiplyScalar(te).floor(), P = z;
			if (n !== 0 && (i = ut), V.bindFramebuffer(B.FRAMEBUFFER, i) && r && V.drawBuffers(e, i), V.viewport(M), V.scissor(N), V.setScissorTest(P), a) {
				let r = H.get(e.texture);
				B.framebufferTexture2D(B.FRAMEBUFFER, B.COLOR_ATTACHMENT0, B.TEXTURE_CUBE_MAP_POSITIVE_X + t, r.__webglTexture, n);
			} else if (o) {
				let r = t;
				for (let t = 0; t < e.textures.length; t++) {
					let i = H.get(e.textures[t]);
					B.framebufferTextureLayer(B.FRAMEBUFFER, B.COLOR_ATTACHMENT0 + t, i.__webglTexture, n, r);
				}
			} else if (e !== null && n !== 0) {
				let t = H.get(e.texture);
				B.framebufferTexture2D(B.FRAMEBUFFER, B.COLOR_ATTACHMENT0, B.TEXTURE_2D, t.__webglTexture, n);
			}
			k = -1;
		}, this.readRenderTargetPixels = function(e, t, n, r, i, a, o, s = 0) {
			if (!(e && e.isWebGLRenderTarget)) {
				console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
				return;
			}
			let c = H.get(e).__webglFramebuffer;
			if (e.isWebGLCubeRenderTarget && o !== void 0 && (c = c[o]), c) {
				V.bindFramebuffer(B.FRAMEBUFFER, c);
				try {
					let o = e.textures[s], c = o.format, l = o.type;
					if (!ge.textureFormatReadable(c)) {
						console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
						return;
					}
					if (!ge.textureTypeReadable(l)) {
						console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
						return;
					}
					t >= 0 && t <= e.width - r && n >= 0 && n <= e.height - i && (e.textures.length > 1 && B.readBuffer(B.COLOR_ATTACHMENT0 + s), B.readPixels(t, n, r, i, Fe.convert(c), Fe.convert(l), a));
				} finally {
					let e = O === null ? null : H.get(O).__webglFramebuffer;
					V.bindFramebuffer(B.FRAMEBUFFER, e);
				}
			}
		}, this.readRenderTargetPixelsAsync = async function(e, t, n, r, i, a, o, s = 0) {
			if (!(e && e.isWebGLRenderTarget)) throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
			let c = H.get(e).__webglFramebuffer;
			if (e.isWebGLCubeRenderTarget && o !== void 0 && (c = c[o]), c) {
				if (t >= 0 && t <= e.width - r && n >= 0 && n <= e.height - i) {
					V.bindFramebuffer(B.FRAMEBUFFER, c);
					let o = e.textures[s], l = o.format, u = o.type;
					if (!ge.textureFormatReadable(l)) throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
					if (!ge.textureTypeReadable(u)) throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
					let d = B.createBuffer();
					B.bindBuffer(B.PIXEL_PACK_BUFFER, d), B.bufferData(B.PIXEL_PACK_BUFFER, a.byteLength, B.STREAM_READ), e.textures.length > 1 && B.readBuffer(B.COLOR_ATTACHMENT0 + s), B.readPixels(t, n, r, i, Fe.convert(l), Fe.convert(u), 0);
					let f = O === null ? null : H.get(O).__webglFramebuffer;
					V.bindFramebuffer(B.FRAMEBUFFER, f);
					let p = B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE, 0);
					return B.flush(), await Ee(B, p, 4), B.bindBuffer(B.PIXEL_PACK_BUFFER, d), B.getBufferSubData(B.PIXEL_PACK_BUFFER, 0, a), B.deleteBuffer(d), B.deleteSync(p), a;
				}
				throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.");
			}
		}, this.copyFramebufferToTexture = function(e, t = null, n = 0) {
			let r = 2 ** -n, i = Math.floor(e.image.width * r), a = Math.floor(e.image.height * r), o = t === null ? 0 : t.x, s = t === null ? 0 : t.y;
			U.setTexture2D(e, 0), B.copyTexSubImage2D(B.TEXTURE_2D, n, 0, 0, o, s, i, a), V.unbindTexture();
		};
		let dt = B.createFramebuffer(), ft = B.createFramebuffer();
		this.copyTextureToTexture = function(e, t, n = null, r = null, i = 0, a = null) {
			a === null && (i === 0 ? a = 0 : (Te("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."), a = i, i = 0));
			let o, s, c, l, u, d, f, p, m, h = e.isCompressedTexture ? e.mipmaps[a] : e.image;
			if (n !== null) o = n.max.x - n.min.x, s = n.max.y - n.min.y, c = n.isBox3 ? n.max.z - n.min.z : 1, l = n.min.x, u = n.min.y, d = n.isBox3 ? n.min.z : 0;
			else {
				let t = 2 ** -i;
				o = Math.floor(h.width * t), s = Math.floor(h.height * t), c = e.isDataArrayTexture ? h.depth : e.isData3DTexture ? Math.floor(h.depth * t) : 1, l = 0, u = 0, d = 0;
			}
			r === null ? (f = 0, p = 0, m = 0) : (f = r.x, p = r.y, m = r.z);
			let g = Fe.convert(t.format), _ = Fe.convert(t.type), v;
			t.isData3DTexture ? (U.setTexture3D(t, 0), v = B.TEXTURE_3D) : t.isDataArrayTexture || t.isCompressedArrayTexture ? (U.setTexture2DArray(t, 0), v = B.TEXTURE_2D_ARRAY) : (U.setTexture2D(t, 0), v = B.TEXTURE_2D), B.pixelStorei(B.UNPACK_FLIP_Y_WEBGL, t.flipY), B.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL, t.premultiplyAlpha), B.pixelStorei(B.UNPACK_ALIGNMENT, t.unpackAlignment);
			let y = B.getParameter(B.UNPACK_ROW_LENGTH), b = B.getParameter(B.UNPACK_IMAGE_HEIGHT), x = B.getParameter(B.UNPACK_SKIP_PIXELS), S = B.getParameter(B.UNPACK_SKIP_ROWS), C = B.getParameter(B.UNPACK_SKIP_IMAGES);
			B.pixelStorei(B.UNPACK_ROW_LENGTH, h.width), B.pixelStorei(B.UNPACK_IMAGE_HEIGHT, h.height), B.pixelStorei(B.UNPACK_SKIP_PIXELS, l), B.pixelStorei(B.UNPACK_SKIP_ROWS, u), B.pixelStorei(B.UNPACK_SKIP_IMAGES, d);
			let w = e.isDataArrayTexture || e.isData3DTexture, T = t.isDataArrayTexture || t.isData3DTexture;
			if (e.isDepthTexture) {
				let n = H.get(e), r = H.get(t), h = H.get(n.__renderTarget), g = H.get(r.__renderTarget);
				V.bindFramebuffer(B.READ_FRAMEBUFFER, h.__webglFramebuffer), V.bindFramebuffer(B.DRAW_FRAMEBUFFER, g.__webglFramebuffer);
				for (let n = 0; n < c; n++) w && (B.framebufferTextureLayer(B.READ_FRAMEBUFFER, B.COLOR_ATTACHMENT0, H.get(e).__webglTexture, i, d + n), B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER, B.COLOR_ATTACHMENT0, H.get(t).__webglTexture, a, m + n)), B.blitFramebuffer(l, u, o, s, f, p, o, s, B.DEPTH_BUFFER_BIT, B.NEAREST);
				V.bindFramebuffer(B.READ_FRAMEBUFFER, null), V.bindFramebuffer(B.DRAW_FRAMEBUFFER, null);
			} else if (i !== 0 || e.isRenderTargetTexture || H.has(e)) {
				let n = H.get(e), r = H.get(t);
				V.bindFramebuffer(B.READ_FRAMEBUFFER, dt), V.bindFramebuffer(B.DRAW_FRAMEBUFFER, ft);
				for (let e = 0; e < c; e++) w ? B.framebufferTextureLayer(B.READ_FRAMEBUFFER, B.COLOR_ATTACHMENT0, n.__webglTexture, i, d + e) : B.framebufferTexture2D(B.READ_FRAMEBUFFER, B.COLOR_ATTACHMENT0, B.TEXTURE_2D, n.__webglTexture, i), T ? B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER, B.COLOR_ATTACHMENT0, r.__webglTexture, a, m + e) : B.framebufferTexture2D(B.DRAW_FRAMEBUFFER, B.COLOR_ATTACHMENT0, B.TEXTURE_2D, r.__webglTexture, a), i === 0 ? T ? B.copyTexSubImage3D(v, a, f, p, m + e, l, u, o, s) : B.copyTexSubImage2D(v, a, f, p, l, u, o, s) : B.blitFramebuffer(l, u, o, s, f, p, o, s, B.COLOR_BUFFER_BIT, B.NEAREST);
				V.bindFramebuffer(B.READ_FRAMEBUFFER, null), V.bindFramebuffer(B.DRAW_FRAMEBUFFER, null);
			} else T ? e.isDataTexture || e.isData3DTexture ? B.texSubImage3D(v, a, f, p, m, o, s, c, g, _, h.data) : t.isCompressedArrayTexture ? B.compressedTexSubImage3D(v, a, f, p, m, o, s, c, g, h.data) : B.texSubImage3D(v, a, f, p, m, o, s, c, g, _, h) : e.isDataTexture ? B.texSubImage2D(B.TEXTURE_2D, a, f, p, o, s, g, _, h.data) : e.isCompressedTexture ? B.compressedTexSubImage2D(B.TEXTURE_2D, a, f, p, h.width, h.height, g, h.data) : B.texSubImage2D(B.TEXTURE_2D, a, f, p, o, s, g, _, h);
			B.pixelStorei(B.UNPACK_ROW_LENGTH, y), B.pixelStorei(B.UNPACK_IMAGE_HEIGHT, b), B.pixelStorei(B.UNPACK_SKIP_PIXELS, x), B.pixelStorei(B.UNPACK_SKIP_ROWS, S), B.pixelStorei(B.UNPACK_SKIP_IMAGES, C), a === 0 && t.generateMipmaps && B.generateMipmap(v), V.unbindTexture();
		}, this.initRenderTarget = function(e) {
			H.get(e).__webglFramebuffer === void 0 && U.setupRenderTarget(e);
		}, this.initTexture = function(e) {
			e.isCubeTexture ? U.setTextureCube(e, 0) : e.isData3DTexture ? U.setTexture3D(e, 0) : e.isDataArrayTexture || e.isCompressedArrayTexture ? U.setTexture2DArray(e, 0) : U.setTexture2D(e, 0), V.unbindTexture();
		}, this.resetState = function() {
			w = 0, D = 0, O = null, V.reset(), Ie.reset();
		}, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	get coordinateSystem() {
		return j;
	}
	get outputColorSpace() {
		return this._outputColorSpace;
	}
	set outputColorSpace(e) {
		this._outputColorSpace = e;
		let t = this.getContext();
		t.drawingBufferColorSpace = K._getDrawingBufferColorSpace(e), t.unpackColorSpace = K._getUnpackColorSpace();
	}
};
//#endregion
//#region node_modules/three/examples/jsm/utils/BufferGeometryUtils.js
function hu(e, t = !1) {
	let n = e[0].index !== null, r = new Set(Object.keys(e[0].attributes)), i = new Set(Object.keys(e[0].morphAttributes)), a = {}, o = {}, s = e[0].morphTargetsRelative, c = new Mn(), l = 0;
	for (let u = 0; u < e.length; ++u) {
		let d = e[u], f = 0;
		if (n !== (d.index !== null)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."), null;
		for (let e in d.attributes) {
			if (!r.has(e)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". All geometries must have compatible attributes; make sure \"" + e + "\" attribute exists among all geometries, or in none of them."), null;
			a[e] === void 0 && (a[e] = []), a[e].push(d.attributes[e]), f++;
		}
		if (f !== r.size) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". Make sure all geometries have the same number of attributes."), null;
		if (s !== d.morphTargetsRelative) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". .morphTargetsRelative must be consistent throughout all geometries."), null;
		for (let e in d.morphAttributes) {
			if (!i.has(e)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ".  .morphAttributes must be consistent throughout all geometries."), null;
			o[e] === void 0 && (o[e] = []), o[e].push(d.morphAttributes[e]);
		}
		if (t) {
			let e;
			if (n) e = d.index.count;
			else if (d.attributes.position !== void 0) e = d.attributes.position.count;
			else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". The geometry must have either an index or a position attribute"), null;
			c.addGroup(l, e, u), l += e;
		}
	}
	if (n) {
		let t = 0, n = [];
		for (let r = 0; r < e.length; ++r) {
			let i = e[r].index;
			for (let e = 0; e < i.count; ++e) n.push(i.getX(e) + t);
			t += e[r].attributes.position.count;
		}
		c.setIndex(n);
	}
	for (let e in a) {
		let t = gu(a[e]);
		if (!t) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + e + " attribute."), null;
		c.setAttribute(e, t);
	}
	for (let e in o) {
		let t = o[e][0].length;
		if (t === 0) break;
		c.morphAttributes = c.morphAttributes || {}, c.morphAttributes[e] = [];
		for (let n = 0; n < t; ++n) {
			let t = [];
			for (let r = 0; r < o[e].length; ++r) t.push(o[e][r][n]);
			let r = gu(t);
			if (!r) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + e + " morphAttribute."), null;
			c.morphAttributes[e].push(r);
		}
	}
	return c;
}
function gu(e) {
	let t, n, r, i = -1, a = 0;
	for (let o = 0; o < e.length; ++o) {
		let s = e[o];
		if (t === void 0 && (t = s.array.constructor), t !== s.array.constructor) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."), null;
		if (n === void 0 && (n = s.itemSize), n !== s.itemSize) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."), null;
		if (r === void 0 && (r = s.normalized), r !== s.normalized) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."), null;
		if (i === -1 && (i = s.gpuType), i !== s.gpuType) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."), null;
		a += s.count * n;
	}
	let o = new t(a), s = new xn(o, n, r), c = 0;
	for (let t = 0; t < e.length; ++t) {
		let r = e[t];
		if (r.isInterleavedBufferAttribute) {
			let e = c / n;
			for (let t = 0, i = r.count; t < i; t++) for (let i = 0; i < n; i++) {
				let n = r.getComponent(t, i);
				s.setComponent(t + e, i, n);
			}
		} else o.set(r.array, c);
		c += r.count * n;
	}
	return i !== void 0 && (s.gpuType = i), s;
}
function _u(e, t) {
	if (t === 0) return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."), e;
	if (t === 2 || t === 1) {
		let n = e.getIndex();
		if (n === null) {
			let t = [], r = e.getAttribute("position");
			if (r !== void 0) {
				for (let e = 0; e < r.count; e++) t.push(e);
				e.setIndex(t), n = e.getIndex();
			} else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."), e;
		}
		let r = n.count - 2, i = [];
		if (t === 2) for (let e = 1; e <= r; e++) i.push(n.getX(0)), i.push(n.getX(e)), i.push(n.getX(e + 1));
		else for (let e = 0; e < r; e++) e % 2 == 0 ? (i.push(n.getX(e)), i.push(n.getX(e + 1)), i.push(n.getX(e + 2))) : (i.push(n.getX(e + 2)), i.push(n.getX(e + 1)), i.push(n.getX(e)));
		i.length / 3 !== r && console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");
		let a = e.clone();
		return a.setIndex(i), a.clearGroups(), a;
	}
	return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:", t), e;
}
//#endregion
//#region node_modules/three/examples/jsm/loaders/GLTFLoader.js
var vu = class extends bo {
	constructor(e) {
		super(e), this.dracoLoader = null, this.ktx2Loader = null, this.meshoptDecoder = null, this.pluginCallbacks = [], this.register(function(e) {
			return new Cu(e);
		}), this.register(function(e) {
			return new wu(e);
		}), this.register(function(e) {
			return new Nu(e);
		}), this.register(function(e) {
			return new Pu(e);
		}), this.register(function(e) {
			return new Fu(e);
		}), this.register(function(e) {
			return new Eu(e);
		}), this.register(function(e) {
			return new Du(e);
		}), this.register(function(e) {
			return new Ou(e);
		}), this.register(function(e) {
			return new ku(e);
		}), this.register(function(e) {
			return new Su(e);
		}), this.register(function(e) {
			return new Au(e);
		}), this.register(function(e) {
			return new Tu(e);
		}), this.register(function(e) {
			return new Mu(e);
		}), this.register(function(e) {
			return new ju(e);
		}), this.register(function(e) {
			return new bu(e);
		}), this.register(function(e) {
			return new Iu(e);
		}), this.register(function(e) {
			return new Lu(e);
		});
	}
	load(e, t, n, r) {
		let i = this, a;
		if (this.resourcePath !== "") a = this.resourcePath;
		else if (this.path !== "") {
			let t = Wo.extractUrlBase(e);
			a = Wo.resolveURL(t, this.path);
		} else a = Wo.extractUrlBase(e);
		this.manager.itemStart(e);
		let o = function(t) {
			r ? r(t) : console.error(t), i.manager.itemError(e), i.manager.itemEnd(e);
		}, s = new Co(this.manager);
		s.setPath(this.path), s.setResponseType("arraybuffer"), s.setRequestHeader(this.requestHeader), s.setWithCredentials(this.withCredentials), s.load(e, function(n) {
			try {
				i.parse(n, a, function(n) {
					t(n), i.manager.itemEnd(e);
				}, o);
			} catch (e) {
				o(e);
			}
		}, n, o);
	}
	setDRACOLoader(e) {
		return this.dracoLoader = e, this;
	}
	setKTX2Loader(e) {
		return this.ktx2Loader = e, this;
	}
	setMeshoptDecoder(e) {
		return this.meshoptDecoder = e, this;
	}
	register(e) {
		return this.pluginCallbacks.indexOf(e) === -1 && this.pluginCallbacks.push(e), this;
	}
	unregister(e) {
		return this.pluginCallbacks.indexOf(e) !== -1 && this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e), 1), this;
	}
	parse(e, t, n, r) {
		let i, a = {}, o = {}, s = new TextDecoder();
		if (typeof e == "string") i = JSON.parse(e);
		else if (e instanceof ArrayBuffer) {
			if (s.decode(new Uint8Array(e, 0, 4)) === Ru) {
				try {
					a[Q.KHR_BINARY_GLTF] = new Vu(e);
				} catch (e) {
					r && r(e);
					return;
				}
				i = JSON.parse(a[Q.KHR_BINARY_GLTF].content);
			} else i = JSON.parse(s.decode(e));
		} else i = e;
		if (i.asset === void 0 || i.asset.version[0] < 2) {
			r && r(/* @__PURE__ */ Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
			return;
		}
		let c = new pd(i, {
			path: t || this.resourcePath || "",
			crossOrigin: this.crossOrigin,
			requestHeader: this.requestHeader,
			manager: this.manager,
			ktx2Loader: this.ktx2Loader,
			meshoptDecoder: this.meshoptDecoder
		});
		c.fileLoader.setRequestHeader(this.requestHeader);
		for (let e = 0; e < this.pluginCallbacks.length; e++) {
			let t = this.pluginCallbacks[e](c);
			t.name || console.error("THREE.GLTFLoader: Invalid plugin found: missing name"), o[t.name] = t, a[t.name] = !0;
		}
		if (i.extensionsUsed) for (let e = 0; e < i.extensionsUsed.length; ++e) {
			let t = i.extensionsUsed[e], n = i.extensionsRequired || [];
			switch (t) {
				case Q.KHR_MATERIALS_UNLIT:
					a[t] = new xu();
					break;
				case Q.KHR_DRACO_MESH_COMPRESSION:
					a[t] = new Hu(i, this.dracoLoader);
					break;
				case Q.KHR_TEXTURE_TRANSFORM:
					a[t] = new Uu();
					break;
				case Q.KHR_MESH_QUANTIZATION:
					a[t] = new Wu();
					break;
				default: n.indexOf(t) >= 0 && o[t] === void 0 && console.warn("THREE.GLTFLoader: Unknown extension \"" + t + "\".");
			}
		}
		c.setExtensions(a), c.setPlugins(o), c.parse(n, r);
	}
	parseAsync(e, t) {
		let n = this;
		return new Promise(function(r, i) {
			n.parse(e, t, r, i);
		});
	}
};
function yu() {
	let e = {};
	return {
		get: function(t) {
			return e[t];
		},
		add: function(t, n) {
			e[t] = n;
		},
		remove: function(t) {
			delete e[t];
		},
		removeAll: function() {
			e = {};
		}
	};
}
var Q = {
	KHR_BINARY_GLTF: "KHR_binary_glTF",
	KHR_DRACO_MESH_COMPRESSION: "KHR_draco_mesh_compression",
	KHR_LIGHTS_PUNCTUAL: "KHR_lights_punctual",
	KHR_MATERIALS_CLEARCOAT: "KHR_materials_clearcoat",
	KHR_MATERIALS_DISPERSION: "KHR_materials_dispersion",
	KHR_MATERIALS_IOR: "KHR_materials_ior",
	KHR_MATERIALS_SHEEN: "KHR_materials_sheen",
	KHR_MATERIALS_SPECULAR: "KHR_materials_specular",
	KHR_MATERIALS_TRANSMISSION: "KHR_materials_transmission",
	KHR_MATERIALS_IRIDESCENCE: "KHR_materials_iridescence",
	KHR_MATERIALS_ANISOTROPY: "KHR_materials_anisotropy",
	KHR_MATERIALS_UNLIT: "KHR_materials_unlit",
	KHR_MATERIALS_VOLUME: "KHR_materials_volume",
	KHR_TEXTURE_BASISU: "KHR_texture_basisu",
	KHR_TEXTURE_TRANSFORM: "KHR_texture_transform",
	KHR_MESH_QUANTIZATION: "KHR_mesh_quantization",
	KHR_MATERIALS_EMISSIVE_STRENGTH: "KHR_materials_emissive_strength",
	EXT_MATERIALS_BUMP: "EXT_materials_bump",
	EXT_TEXTURE_WEBP: "EXT_texture_webp",
	EXT_TEXTURE_AVIF: "EXT_texture_avif",
	EXT_MESHOPT_COMPRESSION: "EXT_meshopt_compression",
	EXT_MESH_GPU_INSTANCING: "EXT_mesh_gpu_instancing"
}, bu = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_LIGHTS_PUNCTUAL, this.cache = {
			refs: {},
			uses: {}
		};
	}
	_markDefs() {
		let e = this.parser, t = this.parser.json.nodes || [];
		for (let n = 0, r = t.length; n < r; n++) {
			let r = t[n];
			r.extensions && r.extensions[this.name] && r.extensions[this.name].light !== void 0 && e._addNodeRef(this.cache, r.extensions[this.name].light);
		}
	}
	_loadLight(e) {
		let t = this.parser, n = "light:" + e, r = t.cache.get(n);
		if (r) return r;
		let i = t.json, a = ((i.extensions && i.extensions[this.name] || {}).lights || [])[e], o, s = new Y(16777215);
		a.color !== void 0 && s.setRGB(a.color[0], a.color[1], a.color[2], E);
		let c = a.range === void 0 ? 0 : a.range;
		switch (a.type) {
			case "directional":
				o = new Uo(s), o.target.position.set(0, 0, -1), o.add(o.target);
				break;
			case "point":
				o = new Bo(s), o.distance = c;
				break;
			case "spot":
				o = new Fo(s), o.distance = c, a.spot = a.spot || {}, a.spot.innerConeAngle = a.spot.innerConeAngle === void 0 ? 0 : a.spot.innerConeAngle, a.spot.outerConeAngle = a.spot.outerConeAngle === void 0 ? Math.PI / 4 : a.spot.outerConeAngle, o.angle = a.spot.outerConeAngle, o.penumbra = 1 - a.spot.innerConeAngle / a.spot.outerConeAngle, o.target.position.set(0, 0, -1), o.add(o.target);
				break;
			default: throw Error("THREE.GLTFLoader: Unexpected light type: " + a.type);
		}
		return o.position.set(0, 0, 0), ad(o, a), a.intensity !== void 0 && (o.intensity = a.intensity), o.name = t.createUniqueName(a.name || "light_" + e), r = Promise.resolve(o), t.cache.add(n, r), r;
	}
	getDependency(e, t) {
		if (e === "light") return this._loadLight(t);
	}
	createNodeAttachment(e) {
		let t = this, n = this.parser, r = n.json.nodes[e], i = (r.extensions && r.extensions[this.name] || {}).light;
		return i === void 0 ? null : this._loadLight(i).then(function(e) {
			return n._getNodeRef(t.cache, i, e);
		});
	}
}, xu = class {
	constructor() {
		this.name = Q.KHR_MATERIALS_UNLIT;
	}
	getMaterialType() {
		return fn;
	}
	extendParams(e, t, n) {
		let r = [];
		e.color = new Y(1, 1, 1), e.opacity = 1;
		let i = t.pbrMetallicRoughness;
		if (i) {
			if (Array.isArray(i.baseColorFactor)) {
				let t = i.baseColorFactor;
				e.color.setRGB(t[0], t[1], t[2], E), e.opacity = t[3];
			}
			i.baseColorTexture !== void 0 && r.push(n.assignTexture(e, "map", i.baseColorTexture, T));
		}
		return Promise.all(r);
	}
}, Su = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_EMISSIVE_STRENGTH;
	}
	extendMaterialParams(e, t) {
		let n = this.parser.json.materials[e];
		if (!n.extensions || !n.extensions[this.name]) return Promise.resolve();
		let r = n.extensions[this.name].emissiveStrength;
		return r !== void 0 && (t.emissiveIntensity = r), Promise.resolve();
	}
}, Cu = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_CLEARCOAT;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [], a = r.extensions[this.name];
		if (a.clearcoatFactor !== void 0 && (t.clearcoat = a.clearcoatFactor), a.clearcoatTexture !== void 0 && i.push(n.assignTexture(t, "clearcoatMap", a.clearcoatTexture)), a.clearcoatRoughnessFactor !== void 0 && (t.clearcoatRoughness = a.clearcoatRoughnessFactor), a.clearcoatRoughnessTexture !== void 0 && i.push(n.assignTexture(t, "clearcoatRoughnessMap", a.clearcoatRoughnessTexture)), a.clearcoatNormalTexture !== void 0 && (i.push(n.assignTexture(t, "clearcoatNormalMap", a.clearcoatNormalTexture)), a.clearcoatNormalTexture.scale !== void 0)) {
			let e = a.clearcoatNormalTexture.scale;
			t.clearcoatNormalScale = new H(e, e);
		}
		return Promise.all(i);
	}
}, wu = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_DISPERSION;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser.json.materials[e];
		if (!n.extensions || !n.extensions[this.name]) return Promise.resolve();
		let r = n.extensions[this.name];
		return t.dispersion = r.dispersion === void 0 ? 0 : r.dispersion, Promise.resolve();
	}
}, Tu = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_IRIDESCENCE;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [], a = r.extensions[this.name];
		return a.iridescenceFactor !== void 0 && (t.iridescence = a.iridescenceFactor), a.iridescenceTexture !== void 0 && i.push(n.assignTexture(t, "iridescenceMap", a.iridescenceTexture)), a.iridescenceIor !== void 0 && (t.iridescenceIOR = a.iridescenceIor), t.iridescenceThicknessRange === void 0 && (t.iridescenceThicknessRange = [100, 400]), a.iridescenceThicknessMinimum !== void 0 && (t.iridescenceThicknessRange[0] = a.iridescenceThicknessMinimum), a.iridescenceThicknessMaximum !== void 0 && (t.iridescenceThicknessRange[1] = a.iridescenceThicknessMaximum), a.iridescenceThicknessTexture !== void 0 && i.push(n.assignTexture(t, "iridescenceThicknessMap", a.iridescenceThicknessTexture)), Promise.all(i);
	}
}, Eu = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_SHEEN;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [];
		t.sheenColor = new Y(0, 0, 0), t.sheenRoughness = 0, t.sheen = 1;
		let a = r.extensions[this.name];
		if (a.sheenColorFactor !== void 0) {
			let e = a.sheenColorFactor;
			t.sheenColor.setRGB(e[0], e[1], e[2], E);
		}
		return a.sheenRoughnessFactor !== void 0 && (t.sheenRoughness = a.sheenRoughnessFactor), a.sheenColorTexture !== void 0 && i.push(n.assignTexture(t, "sheenColorMap", a.sheenColorTexture, T)), a.sheenRoughnessTexture !== void 0 && i.push(n.assignTexture(t, "sheenRoughnessMap", a.sheenRoughnessTexture)), Promise.all(i);
	}
}, Du = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_TRANSMISSION;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [], a = r.extensions[this.name];
		return a.transmissionFactor !== void 0 && (t.transmission = a.transmissionFactor), a.transmissionTexture !== void 0 && i.push(n.assignTexture(t, "transmissionMap", a.transmissionTexture)), Promise.all(i);
	}
}, Ou = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_VOLUME;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [], a = r.extensions[this.name];
		t.thickness = a.thicknessFactor === void 0 ? 0 : a.thicknessFactor, a.thicknessTexture !== void 0 && i.push(n.assignTexture(t, "thicknessMap", a.thicknessTexture)), t.attenuationDistance = a.attenuationDistance || Infinity;
		let o = a.attenuationColor || [
			1,
			1,
			1
		];
		return t.attenuationColor = new Y().setRGB(o[0], o[1], o[2], E), Promise.all(i);
	}
}, ku = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_IOR;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser.json.materials[e];
		if (!n.extensions || !n.extensions[this.name]) return Promise.resolve();
		let r = n.extensions[this.name];
		return t.ior = r.ior === void 0 ? 1.5 : r.ior, Promise.resolve();
	}
}, Au = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_SPECULAR;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [], a = r.extensions[this.name];
		t.specularIntensity = a.specularFactor === void 0 ? 1 : a.specularFactor, a.specularTexture !== void 0 && i.push(n.assignTexture(t, "specularIntensityMap", a.specularTexture));
		let o = a.specularColorFactor || [
			1,
			1,
			1
		];
		return t.specularColor = new Y().setRGB(o[0], o[1], o[2], E), a.specularColorTexture !== void 0 && i.push(n.assignTexture(t, "specularColorMap", a.specularColorTexture, T)), Promise.all(i);
	}
}, ju = class {
	constructor(e) {
		this.parser = e, this.name = Q.EXT_MATERIALS_BUMP;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [], a = r.extensions[this.name];
		return t.bumpScale = a.bumpFactor === void 0 ? 1 : a.bumpFactor, a.bumpTexture !== void 0 && i.push(n.assignTexture(t, "bumpMap", a.bumpTexture)), Promise.all(i);
	}
}, Mu = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_MATERIALS_ANISOTROPY;
	}
	getMaterialType(e) {
		let t = this.parser.json.materials[e];
		return !t.extensions || !t.extensions[this.name] ? null : qa;
	}
	extendMaterialParams(e, t) {
		let n = this.parser, r = n.json.materials[e];
		if (!r.extensions || !r.extensions[this.name]) return Promise.resolve();
		let i = [], a = r.extensions[this.name];
		return a.anisotropyStrength !== void 0 && (t.anisotropy = a.anisotropyStrength), a.anisotropyRotation !== void 0 && (t.anisotropyRotation = a.anisotropyRotation), a.anisotropyTexture !== void 0 && i.push(n.assignTexture(t, "anisotropyMap", a.anisotropyTexture)), Promise.all(i);
	}
}, Nu = class {
	constructor(e) {
		this.parser = e, this.name = Q.KHR_TEXTURE_BASISU;
	}
	loadTexture(e) {
		let t = this.parser, n = t.json, r = n.textures[e];
		if (!r.extensions || !r.extensions[this.name]) return null;
		let i = r.extensions[this.name], a = t.options.ktx2Loader;
		if (!a) {
			if (n.extensionsRequired && n.extensionsRequired.indexOf(this.name) >= 0) throw Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");
			return null;
		}
		return t.loadTextureImage(e, i.source, a);
	}
}, Pu = class {
	constructor(e) {
		this.parser = e, this.name = Q.EXT_TEXTURE_WEBP;
	}
	loadTexture(e) {
		let t = this.name, n = this.parser, r = n.json, i = r.textures[e];
		if (!i.extensions || !i.extensions[t]) return null;
		let a = i.extensions[t], o = r.images[a.source], s = n.textureLoader;
		if (o.uri) {
			let e = n.options.manager.getHandler(o.uri);
			e !== null && (s = e);
		}
		return n.loadTextureImage(e, a.source, s);
	}
}, Fu = class {
	constructor(e) {
		this.parser = e, this.name = Q.EXT_TEXTURE_AVIF;
	}
	loadTexture(e) {
		let t = this.name, n = this.parser, r = n.json, i = r.textures[e];
		if (!i.extensions || !i.extensions[t]) return null;
		let a = i.extensions[t], o = r.images[a.source], s = n.textureLoader;
		if (o.uri) {
			let e = n.options.manager.getHandler(o.uri);
			e !== null && (s = e);
		}
		return n.loadTextureImage(e, a.source, s);
	}
}, Iu = class {
	constructor(e) {
		this.name = Q.EXT_MESHOPT_COMPRESSION, this.parser = e;
	}
	loadBufferView(e) {
		let t = this.parser.json, n = t.bufferViews[e];
		if (n.extensions && n.extensions[this.name]) {
			let e = n.extensions[this.name], r = this.parser.getDependency("buffer", e.buffer), i = this.parser.options.meshoptDecoder;
			if (!i || !i.supported) {
				if (t.extensionsRequired && t.extensionsRequired.indexOf(this.name) >= 0) throw Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");
				return null;
			}
			return r.then(function(t) {
				let n = e.byteOffset || 0, r = e.byteLength || 0, a = e.count, o = e.byteStride, s = new Uint8Array(t, n, r);
				return i.decodeGltfBufferAsync ? i.decodeGltfBufferAsync(a, o, s, e.mode, e.filter).then(function(e) {
					return e.buffer;
				}) : i.ready.then(function() {
					let t = new ArrayBuffer(a * o);
					return i.decodeGltfBuffer(new Uint8Array(t), a, o, s, e.mode, e.filter), t;
				});
			});
		}
		return null;
	}
}, Lu = class {
	constructor(e) {
		this.name = Q.EXT_MESH_GPU_INSTANCING, this.parser = e;
	}
	createNodeMesh(e) {
		let t = this.parser.json, n = t.nodes[e];
		if (!n.extensions || !n.extensions[this.name] || n.mesh === void 0) return null;
		let r = t.meshes[n.mesh];
		for (let e of r.primitives) if (e.mode !== Ju.TRIANGLES && e.mode !== Ju.TRIANGLE_STRIP && e.mode !== Ju.TRIANGLE_FAN && e.mode !== void 0) return null;
		let i = n.extensions[this.name].attributes, a = [], o = {};
		for (let e in i) a.push(this.parser.getDependency("accessor", i[e]).then((t) => (o[e] = t, o[e])));
		return a.length < 1 ? null : (a.push(this.parser.createNodeMesh(e)), Promise.all(a).then((e) => {
			let t = e.pop(), n = t.isGroup ? t.children : [t], r = e[0].count, i = [];
			for (let e of n) {
				let t = new J(), n = new W(), a = new U(), s = new W(1, 1, 1), c = new Ur(e.geometry, e.material, r);
				for (let e = 0; e < r; e++) o.TRANSLATION && n.fromBufferAttribute(o.TRANSLATION, e), o.ROTATION && a.fromBufferAttribute(o.ROTATION, e), o.SCALE && s.fromBufferAttribute(o.SCALE, e), c.setMatrixAt(e, t.compose(n, a, s));
				for (let t in o) if (t === "_COLOR_0") {
					let e = o[t];
					c.instanceColor = new Fr(e.array, e.itemSize, e.normalized);
				} else t !== "TRANSLATION" && t !== "ROTATION" && t !== "SCALE" && e.geometry.setAttribute(t, o[t]);
				Ut.prototype.copy.call(c, e), this.parser.assignFinalMaterial(c), i.push(c);
			}
			return t.isGroup ? (t.clear(), t.add(...i), t) : i[0];
		}));
	}
}, Ru = "glTF", zu = 12, Bu = {
	JSON: 1313821514,
	BIN: 5130562
}, Vu = class {
	constructor(e) {
		this.name = Q.KHR_BINARY_GLTF, this.content = null, this.body = null;
		let t = new DataView(e, 0, zu), n = new TextDecoder();
		if (this.header = {
			magic: n.decode(new Uint8Array(e.slice(0, 4))),
			version: t.getUint32(4, !0),
			length: t.getUint32(8, !0)
		}, this.header.magic !== Ru) throw Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");
		if (this.header.version < 2) throw Error("THREE.GLTFLoader: Legacy binary file detected.");
		let r = this.header.length - zu, i = new DataView(e, zu), a = 0;
		for (; a < r;) {
			let t = i.getUint32(a, !0);
			a += 4;
			let r = i.getUint32(a, !0);
			if (a += 4, r === Bu.JSON) {
				let r = new Uint8Array(e, zu + a, t);
				this.content = n.decode(r);
			} else if (r === Bu.BIN) {
				let n = zu + a;
				this.body = e.slice(n, n + t);
			}
			a += t;
		}
		if (this.content === null) throw Error("THREE.GLTFLoader: JSON content not found.");
	}
}, Hu = class {
	constructor(e, t) {
		if (!t) throw Error("THREE.GLTFLoader: No DRACOLoader instance provided.");
		this.name = Q.KHR_DRACO_MESH_COMPRESSION, this.json = e, this.dracoLoader = t, this.dracoLoader.preload();
	}
	decodePrimitive(e, t) {
		let n = this.json, r = this.dracoLoader, i = e.extensions[this.name].bufferView, a = e.extensions[this.name].attributes, o = {}, s = {}, c = {};
		for (let e in a) {
			let t = $u[e] || e.toLowerCase();
			o[t] = a[e];
		}
		for (let t in e.attributes) {
			let r = $u[t] || t.toLowerCase();
			if (a[t] !== void 0) {
				let i = n.accessors[e.attributes[t]];
				c[r] = Yu[i.componentType].name, s[r] = i.normalized === !0;
			}
		}
		return t.getDependency("bufferView", i).then(function(e) {
			return new Promise(function(t, n) {
				r.decodeDracoFile(e, function(e) {
					for (let t in e.attributes) {
						let n = e.attributes[t], r = s[t];
						r !== void 0 && (n.normalized = r);
					}
					t(e);
				}, o, c, E, n);
			});
		});
	}
}, Uu = class {
	constructor() {
		this.name = Q.KHR_TEXTURE_TRANSFORM;
	}
	extendTexture(e, t) {
		return (t.texCoord === void 0 || t.texCoord === e.channel) && t.offset === void 0 && t.rotation === void 0 && t.scale === void 0 ? e : (e = e.clone(), t.texCoord !== void 0 && (e.channel = t.texCoord), t.offset !== void 0 && e.offset.fromArray(t.offset), t.rotation !== void 0 && (e.rotation = t.rotation), t.scale !== void 0 && e.repeat.fromArray(t.scale), e.needsUpdate = !0, e);
	}
}, Wu = class {
	constructor() {
		this.name = Q.KHR_MESH_QUANTIZATION;
	}
}, Gu = class extends no {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	copySampleValue_(e) {
		let t = this.resultBuffer, n = this.sampleValues, r = this.valueSize, i = e * r * 3 + r;
		for (let e = 0; e !== r; e++) t[e] = n[i + e];
		return t;
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = o * 2, c = o * 3, l = r - t, u = (n - t) / l, d = u * u, f = d * u, p = e * c, m = p - c, h = -2 * f + 3 * d, g = f - d, _ = 1 - h, v = g - d + u;
		for (let e = 0; e !== o; e++) {
			let t = a[m + e + o], n = a[m + e + s] * l, r = a[p + e + o], c = a[p + e] * l;
			i[e] = _ * t + v * n + h * r + g * c;
		}
		return i;
	}
}, Ku = new U(), qu = class extends Gu {
	interpolate_(e, t, n, r) {
		let i = super.interpolate_(e, t, n, r);
		return Ku.fromArray(i).normalize().toArray(i), i;
	}
}, Ju = {
	FLOAT: 5126,
	FLOAT_MAT3: 35675,
	FLOAT_MAT4: 35676,
	FLOAT_VEC2: 35664,
	FLOAT_VEC3: 35665,
	FLOAT_VEC4: 35666,
	LINEAR: 9729,
	REPEAT: 10497,
	SAMPLER_2D: 35678,
	POINTS: 0,
	LINES: 1,
	LINE_LOOP: 2,
	LINE_STRIP: 3,
	TRIANGLES: 4,
	TRIANGLE_STRIP: 5,
	TRIANGLE_FAN: 6,
	UNSIGNED_BYTE: 5121,
	UNSIGNED_SHORT: 5123
}, Yu = {
	5120: Int8Array,
	5121: Uint8Array,
	5122: Int16Array,
	5123: Uint16Array,
	5125: Uint32Array,
	5126: Float32Array
}, Xu = {
	9728: r,
	9729: o,
	9984: i,
	9985: s,
	9986: a,
	9987: c
}, Zu = {
	33071: t,
	33648: n,
	10497: e
}, Qu = {
	SCALAR: 1,
	VEC2: 2,
	VEC3: 3,
	VEC4: 4,
	MAT2: 4,
	MAT3: 9,
	MAT4: 16
}, $u = {
	POSITION: "position",
	NORMAL: "normal",
	TANGENT: "tangent",
	TEXCOORD_0: "uv",
	TEXCOORD_1: "uv1",
	TEXCOORD_2: "uv2",
	TEXCOORD_3: "uv3",
	COLOR_0: "color",
	WEIGHTS_0: "skinWeight",
	JOINTS_0: "skinIndex"
}, ed = {
	scale: "scale",
	translation: "position",
	rotation: "quaternion",
	weights: "morphTargetInfluences"
}, td = {
	CUBICSPLINE: void 0,
	LINEAR: y,
	STEP: v
}, nd = {
	OPAQUE: "OPAQUE",
	MASK: "MASK",
	BLEND: "BLEND"
};
function rd(e) {
	return e.DefaultMaterial === void 0 && (e.DefaultMaterial = new Ka({
		color: 16777215,
		emissive: 0,
		metalness: 1,
		roughness: 1,
		transparent: !1,
		depthTest: !0,
		side: 0
	})), e.DefaultMaterial;
}
function id(e, t, n) {
	for (let r in n.extensions) e[r] === void 0 && (t.userData.gltfExtensions = t.userData.gltfExtensions || {}, t.userData.gltfExtensions[r] = n.extensions[r]);
}
function ad(e, t) {
	t.extras !== void 0 && (typeof t.extras == "object" ? Object.assign(e.userData, t.extras) : console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, " + t.extras));
}
function od(e, t, n) {
	let r = !1, i = !1, a = !1;
	for (let e = 0, n = t.length; e < n; e++) {
		let n = t[e];
		if (n.POSITION !== void 0 && (r = !0), n.NORMAL !== void 0 && (i = !0), n.COLOR_0 !== void 0 && (a = !0), r && i && a) break;
	}
	if (!r && !i && !a) return Promise.resolve(e);
	let o = [], s = [], c = [];
	for (let l = 0, u = t.length; l < u; l++) {
		let u = t[l];
		if (r) {
			let t = u.POSITION === void 0 ? e.attributes.position : n.getDependency("accessor", u.POSITION);
			o.push(t);
		}
		if (i) {
			let t = u.NORMAL === void 0 ? e.attributes.normal : n.getDependency("accessor", u.NORMAL);
			s.push(t);
		}
		if (a) {
			let t = u.COLOR_0 === void 0 ? e.attributes.color : n.getDependency("accessor", u.COLOR_0);
			c.push(t);
		}
	}
	return Promise.all([
		Promise.all(o),
		Promise.all(s),
		Promise.all(c)
	]).then(function(t) {
		let n = t[0], o = t[1], s = t[2];
		return r && (e.morphAttributes.position = n), i && (e.morphAttributes.normal = o), a && (e.morphAttributes.color = s), e.morphTargetsRelative = !0, e;
	});
}
function sd(e, t) {
	if (e.updateMorphTargets(), t.weights !== void 0) for (let n = 0, r = t.weights.length; n < r; n++) e.morphTargetInfluences[n] = t.weights[n];
	if (t.extras && Array.isArray(t.extras.targetNames)) {
		let n = t.extras.targetNames;
		if (e.morphTargetInfluences.length === n.length) {
			e.morphTargetDictionary = {};
			for (let t = 0, r = n.length; t < r; t++) e.morphTargetDictionary[n[t]] = t;
		} else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.");
	}
}
function cd(e) {
	let t, n = e.extensions && e.extensions[Q.KHR_DRACO_MESH_COMPRESSION];
	if (t = n ? "draco:" + n.bufferView + ":" + n.indices + ":" + ld(n.attributes) : e.indices + ":" + ld(e.attributes) + ":" + e.mode, e.targets !== void 0) for (let n = 0, r = e.targets.length; n < r; n++) t += ":" + ld(e.targets[n]);
	return t;
}
function ld(e) {
	let t = "", n = Object.keys(e).sort();
	for (let r = 0, i = n.length; r < i; r++) t += n[r] + ":" + e[n[r]] + ";";
	return t;
}
function ud(e) {
	switch (e) {
		case Int8Array: return 1 / 127;
		case Uint8Array: return 1 / 255;
		case Int16Array: return 1 / 32767;
		case Uint16Array: return 1 / 65535;
		default: throw Error("THREE.GLTFLoader: Unsupported normalized accessor component type.");
	}
}
function dd(e) {
	return e.search(/\.jpe?g($|\?)/i) > 0 || e.search(/^data\:image\/jpeg/) === 0 ? "image/jpeg" : e.search(/\.webp($|\?)/i) > 0 || e.search(/^data\:image\/webp/) === 0 ? "image/webp" : e.search(/\.ktx2($|\?)/i) > 0 || e.search(/^data\:image\/ktx2/) === 0 ? "image/ktx2" : "image/png";
}
var fd = new J(), pd = class {
	constructor(e = {}, t = {}) {
		this.json = e, this.extensions = {}, this.plugins = {}, this.options = t, this.cache = new yu(), this.associations = /* @__PURE__ */ new Map(), this.primitiveCache = {}, this.nodeCache = {}, this.meshCache = {
			refs: {},
			uses: {}
		}, this.cameraCache = {
			refs: {},
			uses: {}
		}, this.lightCache = {
			refs: {},
			uses: {}
		}, this.sourceCache = {}, this.textureCache = {}, this.nodeNamesUsed = {};
		let n = !1, r = -1, i = !1, a = -1;
		if (typeof navigator < "u") {
			let e = navigator.userAgent;
			n = /^((?!chrome|android).)*safari/i.test(e) === !0;
			let t = e.match(/Version\/(\d+)/);
			r = n && t ? parseInt(t[1], 10) : -1, i = e.indexOf("Firefox") > -1, a = i ? e.match(/Firefox\/([0-9]+)\./)[1] : -1;
		}
		this.textureLoader = typeof createImageBitmap > "u" || n && r < 17 || i && a < 98 ? new Do(this.options.manager) : new Ko(this.options.manager), this.textureLoader.setCrossOrigin(this.options.crossOrigin), this.textureLoader.setRequestHeader(this.options.requestHeader), this.fileLoader = new Co(this.options.manager), this.fileLoader.setResponseType("arraybuffer"), this.options.crossOrigin === "use-credentials" && this.fileLoader.setWithCredentials(!0);
	}
	setExtensions(e) {
		this.extensions = e;
	}
	setPlugins(e) {
		this.plugins = e;
	}
	parse(e, t) {
		let n = this, r = this.json, i = this.extensions;
		this.cache.removeAll(), this.nodeCache = {}, this._invokeAll(function(e) {
			return e._markDefs && e._markDefs();
		}), Promise.all(this._invokeAll(function(e) {
			return e.beforeRoot && e.beforeRoot();
		})).then(function() {
			return Promise.all([
				n.getDependencies("scene"),
				n.getDependencies("animation"),
				n.getDependencies("camera")
			]);
		}).then(function(t) {
			let a = {
				scene: t[0][r.scene || 0],
				scenes: t[0],
				animations: t[1],
				cameras: t[2],
				asset: r.asset,
				parser: n,
				userData: {}
			};
			return id(i, a, r), ad(a, r), Promise.all(n._invokeAll(function(e) {
				return e.afterRoot && e.afterRoot(a);
			})).then(function() {
				for (let e of a.scenes) e.updateMatrixWorld();
				e(a);
			});
		}).catch(t);
	}
	_markDefs() {
		let e = this.json.nodes || [], t = this.json.skins || [], n = this.json.meshes || [];
		for (let n = 0, r = t.length; n < r; n++) {
			let r = t[n].joints;
			for (let t = 0, n = r.length; t < n; t++) e[r[t]].isBone = !0;
		}
		for (let t = 0, r = e.length; t < r; t++) {
			let r = e[t];
			r.mesh !== void 0 && (this._addNodeRef(this.meshCache, r.mesh), r.skin !== void 0 && (n[r.mesh].isSkinnedMesh = !0)), r.camera !== void 0 && this._addNodeRef(this.cameraCache, r.camera);
		}
	}
	_addNodeRef(e, t) {
		t !== void 0 && (e.refs[t] === void 0 && (e.refs[t] = e.uses[t] = 0), e.refs[t]++);
	}
	_getNodeRef(e, t, n) {
		if (e.refs[t] <= 1) return n;
		let r = n.clone(), i = (e, t) => {
			let n = this.associations.get(e);
			n != null && this.associations.set(t, n);
			for (let [n, r] of e.children.entries()) i(r, t.children[n]);
		};
		return i(n, r), r.name += "_instance_" + e.uses[t]++, r;
	}
	_invokeOne(e) {
		let t = Object.values(this.plugins);
		t.push(this);
		for (let n = 0; n < t.length; n++) {
			let r = e(t[n]);
			if (r) return r;
		}
		return null;
	}
	_invokeAll(e) {
		let t = Object.values(this.plugins);
		t.unshift(this);
		let n = [];
		for (let r = 0; r < t.length; r++) {
			let i = e(t[r]);
			i && n.push(i);
		}
		return n;
	}
	getDependency(e, t) {
		let n = e + ":" + t, r = this.cache.get(n);
		if (!r) {
			switch (e) {
				case "scene":
					r = this.loadScene(t);
					break;
				case "node":
					r = this._invokeOne(function(e) {
						return e.loadNode && e.loadNode(t);
					});
					break;
				case "mesh":
					r = this._invokeOne(function(e) {
						return e.loadMesh && e.loadMesh(t);
					});
					break;
				case "accessor":
					r = this.loadAccessor(t);
					break;
				case "bufferView":
					r = this._invokeOne(function(e) {
						return e.loadBufferView && e.loadBufferView(t);
					});
					break;
				case "buffer":
					r = this.loadBuffer(t);
					break;
				case "material":
					r = this._invokeOne(function(e) {
						return e.loadMaterial && e.loadMaterial(t);
					});
					break;
				case "texture":
					r = this._invokeOne(function(e) {
						return e.loadTexture && e.loadTexture(t);
					});
					break;
				case "skin":
					r = this.loadSkin(t);
					break;
				case "animation":
					r = this._invokeOne(function(e) {
						return e.loadAnimation && e.loadAnimation(t);
					});
					break;
				case "camera":
					r = this.loadCamera(t);
					break;
				default: if (r = this._invokeOne(function(n) {
					return n != this && n.getDependency && n.getDependency(e, t);
				}), !r) throw Error("Unknown type: " + e);
			}
			this.cache.add(n, r);
		}
		return r;
	}
	getDependencies(e) {
		let t = this.cache.get(e);
		if (!t) {
			let n = this, r = this.json[e + (e === "mesh" ? "es" : "s")] || [];
			t = Promise.all(r.map(function(t, r) {
				return n.getDependency(e, r);
			})), this.cache.add(e, t);
		}
		return t;
	}
	loadBuffer(e) {
		let t = this.json.buffers[e], n = this.fileLoader;
		if (t.type && t.type !== "arraybuffer") throw Error("THREE.GLTFLoader: " + t.type + " buffer type is not supported.");
		if (t.uri === void 0 && e === 0) return Promise.resolve(this.extensions[Q.KHR_BINARY_GLTF].body);
		let r = this.options;
		return new Promise(function(e, i) {
			n.load(Wo.resolveURL(t.uri, r.path), e, void 0, function() {
				i(/* @__PURE__ */ Error("THREE.GLTFLoader: Failed to load buffer \"" + t.uri + "\"."));
			});
		});
	}
	loadBufferView(e) {
		let t = this.json.bufferViews[e];
		return this.getDependency("buffer", t.buffer).then(function(e) {
			let n = t.byteLength || 0, r = t.byteOffset || 0;
			return e.slice(r, r + n);
		});
	}
	loadAccessor(e) {
		let t = this, n = this.json, r = this.json.accessors[e];
		if (r.bufferView === void 0 && r.sparse === void 0) {
			let e = Qu[r.type], t = Yu[r.componentType], n = r.normalized === !0, i = new t(r.count * e);
			return Promise.resolve(new xn(i, e, n));
		}
		let i = [];
		return r.bufferView === void 0 ? i.push(null) : i.push(this.getDependency("bufferView", r.bufferView)), r.sparse !== void 0 && (i.push(this.getDependency("bufferView", r.sparse.indices.bufferView)), i.push(this.getDependency("bufferView", r.sparse.values.bufferView))), Promise.all(i).then(function(e) {
			let i = e[0], a = Qu[r.type], o = Yu[r.componentType], s = o.BYTES_PER_ELEMENT, c = s * a, l = r.byteOffset || 0, u = r.bufferView === void 0 ? void 0 : n.bufferViews[r.bufferView].byteStride, d = r.normalized === !0, f, p;
			if (u && u !== c) {
				let e = Math.floor(l / u), n = "InterleavedBuffer:" + r.bufferView + ":" + r.componentType + ":" + e + ":" + r.count, c = t.cache.get(n);
				c || (f = new o(i, e * u, r.count * u / s), c = new _r(f, u / s), t.cache.add(n, c)), p = new yr(c, a, l % u / s, d);
			} else f = i === null ? new o(r.count * a) : new o(i, l, r.count * a), p = new xn(f, a, d);
			if (r.sparse !== void 0) {
				let t = Qu.SCALAR, n = Yu[r.sparse.indices.componentType], s = r.sparse.indices.byteOffset || 0, c = r.sparse.values.byteOffset || 0, l = new n(e[1], s, r.sparse.count * t), u = new o(e[2], c, r.sparse.count * a);
				i !== null && (p = new xn(p.array.slice(), p.itemSize, p.normalized)), p.normalized = !1;
				for (let e = 0, t = l.length; e < t; e++) {
					let t = l[e];
					if (p.setX(t, u[e * a]), a >= 2 && p.setY(t, u[e * a + 1]), a >= 3 && p.setZ(t, u[e * a + 2]), a >= 4 && p.setW(t, u[e * a + 3]), a >= 5) throw Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.");
				}
				p.normalized = d;
			}
			return p;
		});
	}
	loadTexture(e) {
		let t = this.json, n = this.options, r = t.textures[e].source, i = t.images[r], a = this.textureLoader;
		if (i.uri) {
			let e = n.manager.getHandler(i.uri);
			e !== null && (a = e);
		}
		return this.loadTextureImage(e, r, a);
	}
	loadTextureImage(e, t, n) {
		let r = this, i = this.json, a = i.textures[e], o = i.images[t], s = (o.uri || o.bufferView) + ":" + a.sampler;
		if (this.textureCache[s]) return this.textureCache[s];
		let c = this.loadImageSource(t, n).then(function(t) {
			t.flipY = !1, t.name = a.name || o.name || "", t.name === "" && typeof o.uri == "string" && o.uri.startsWith("data:image/") === !1 && (t.name = o.uri);
			let n = (i.samplers || {})[a.sampler] || {};
			return t.magFilter = Xu[n.magFilter] || 1006, t.minFilter = Xu[n.minFilter] || 1008, t.wrapS = Zu[n.wrapS] || 1e3, t.wrapT = Zu[n.wrapT] || 1e3, t.generateMipmaps = !t.isCompressedTexture && t.minFilter !== 1003 && t.minFilter !== 1006, r.associations.set(t, { textures: e }), t;
		}).catch(function() {
			return null;
		});
		return this.textureCache[s] = c, c;
	}
	loadImageSource(e, t) {
		let n = this, r = this.json, i = this.options;
		if (this.sourceCache[e] !== void 0) return this.sourceCache[e].then((e) => e.clone());
		let a = r.images[e], o = self.URL || self.webkitURL, s = a.uri || "", c = !1;
		if (a.bufferView !== void 0) s = n.getDependency("bufferView", a.bufferView).then(function(e) {
			c = !0;
			let t = new Blob([e], { type: a.mimeType });
			return s = o.createObjectURL(t), s;
		});
		else if (a.uri === void 0) throw Error("THREE.GLTFLoader: Image " + e + " is missing URI and bufferView");
		let l = Promise.resolve(s).then(function(e) {
			return new Promise(function(n, r) {
				let a = n;
				t.isImageBitmapLoader === !0 && (a = function(e) {
					let t = new q(e);
					t.needsUpdate = !0, n(t);
				}), t.load(Wo.resolveURL(e, i.path), a, void 0, r);
			});
		}).then(function(e) {
			return c === !0 && o.revokeObjectURL(s), ad(e, a), e.userData.mimeType = a.mimeType || dd(a.uri), e;
		}).catch(function(e) {
			throw console.error("THREE.GLTFLoader: Couldn't load texture", s), e;
		});
		return this.sourceCache[e] = l, l;
	}
	assignTexture(e, t, n, r) {
		let i = this;
		return this.getDependency("texture", n.index).then(function(a) {
			if (!a) return null;
			if (n.texCoord !== void 0 && n.texCoord > 0 && (a = a.clone(), a.channel = n.texCoord), i.extensions[Q.KHR_TEXTURE_TRANSFORM]) {
				let e = n.extensions === void 0 ? void 0 : n.extensions[Q.KHR_TEXTURE_TRANSFORM];
				if (e) {
					let t = i.associations.get(a);
					a = i.extensions[Q.KHR_TEXTURE_TRANSFORM].extendTexture(a, e), i.associations.set(a, t);
				}
			}
			return r !== void 0 && (a.colorSpace = r), e[t] = a, a;
		});
	}
	assignFinalMaterial(e) {
		let t = e.geometry, n = e.material, r = t.attributes.tangent === void 0, i = t.attributes.color !== void 0, a = t.attributes.normal === void 0;
		if (e.isPoints) {
			let e = "PointsMaterial:" + n.uuid, t = this.cache.get(e);
			t || (t = new fi(), dn.prototype.copy.call(t, n), t.color.copy(n.color), t.map = n.map, t.sizeAttenuation = !1, this.cache.add(e, t)), n = t;
		} else if (e.isLine) {
			let e = "LineBasicMaterial:" + n.uuid, t = this.cache.get(e);
			t || (t = new Qr(), dn.prototype.copy.call(t, n), t.color.copy(n.color), t.map = n.map, this.cache.add(e, t)), n = t;
		}
		if (r || i || a) {
			let e = "ClonedMaterial:" + n.uuid + ":";
			r && (e += "derivative-tangents:"), i && (e += "vertex-colors:"), a && (e += "flat-shading:");
			let t = this.cache.get(e);
			t || (t = n.clone(), i && (t.vertexColors = !0), a && (t.flatShading = !0), r && (t.normalScale && (t.normalScale.y *= -1), t.clearcoatNormalScale && (t.clearcoatNormalScale.y *= -1)), this.cache.add(e, t), this.associations.set(t, this.associations.get(n))), n = t;
		}
		e.material = n;
	}
	getMaterialType() {
		return Ka;
	}
	loadMaterial(e) {
		let t = this, n = this.json, r = this.extensions, i = n.materials[e], a, o = {}, s = i.extensions || {}, c = [];
		if (s[Q.KHR_MATERIALS_UNLIT]) {
			let e = r[Q.KHR_MATERIALS_UNLIT];
			a = e.getMaterialType(), c.push(e.extendParams(o, i, t));
		} else {
			let n = i.pbrMetallicRoughness || {};
			if (o.color = new Y(1, 1, 1), o.opacity = 1, Array.isArray(n.baseColorFactor)) {
				let e = n.baseColorFactor;
				o.color.setRGB(e[0], e[1], e[2], E), o.opacity = e[3];
			}
			n.baseColorTexture !== void 0 && c.push(t.assignTexture(o, "map", n.baseColorTexture, T)), o.metalness = n.metallicFactor === void 0 ? 1 : n.metallicFactor, o.roughness = n.roughnessFactor === void 0 ? 1 : n.roughnessFactor, n.metallicRoughnessTexture !== void 0 && (c.push(t.assignTexture(o, "metalnessMap", n.metallicRoughnessTexture)), c.push(t.assignTexture(o, "roughnessMap", n.metallicRoughnessTexture))), a = this._invokeOne(function(t) {
				return t.getMaterialType && t.getMaterialType(e);
			}), c.push(Promise.all(this._invokeAll(function(t) {
				return t.extendMaterialParams && t.extendMaterialParams(e, o);
			})));
		}
		i.doubleSided === !0 && (o.side = 2);
		let l = i.alphaMode || nd.OPAQUE;
		if (l === nd.BLEND ? (o.transparent = !0, o.depthWrite = !1) : (o.transparent = !1, l === nd.MASK && (o.alphaTest = i.alphaCutoff === void 0 ? .5 : i.alphaCutoff)), i.normalTexture !== void 0 && a !== fn && (c.push(t.assignTexture(o, "normalMap", i.normalTexture)), o.normalScale = new H(1, 1), i.normalTexture.scale !== void 0)) {
			let e = i.normalTexture.scale;
			o.normalScale.set(e, e);
		}
		if (i.occlusionTexture !== void 0 && a !== fn && (c.push(t.assignTexture(o, "aoMap", i.occlusionTexture)), i.occlusionTexture.strength !== void 0 && (o.aoMapIntensity = i.occlusionTexture.strength)), i.emissiveFactor !== void 0 && a !== fn) {
			let e = i.emissiveFactor;
			o.emissive = new Y().setRGB(e[0], e[1], e[2], E);
		}
		return i.emissiveTexture !== void 0 && a !== fn && c.push(t.assignTexture(o, "emissiveMap", i.emissiveTexture, T)), Promise.all(c).then(function() {
			let n = new a(o);
			return i.name && (n.name = i.name), ad(n, i), t.associations.set(n, { materials: e }), i.extensions && id(r, n, i), n;
		});
	}
	createUniqueName(e) {
		let t = ss.sanitizeNodeName(e || "");
		return t in this.nodeNamesUsed ? t + "_" + ++this.nodeNamesUsed[t] : (this.nodeNamesUsed[t] = 0, t);
	}
	loadGeometries(e) {
		let t = this, n = this.extensions, r = this.primitiveCache;
		function i(e) {
			return n[Q.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e, t).then(function(n) {
				return hd(n, e, t);
			});
		}
		let a = [];
		for (let n = 0, o = e.length; n < o; n++) {
			let o = e[n], s = cd(o), c = r[s];
			if (c) a.push(c.promise);
			else {
				let e;
				e = o.extensions && o.extensions[Q.KHR_DRACO_MESH_COMPRESSION] ? i(o) : hd(new Mn(), o, t), r[s] = {
					primitive: o,
					promise: e
				}, a.push(e);
			}
		}
		return Promise.all(a);
	}
	loadMesh(e) {
		let t = this, n = this.json, r = this.extensions, i = n.meshes[e], a = i.primitives, o = [];
		for (let e = 0, t = a.length; e < t; e++) {
			let t = a[e].material === void 0 ? rd(this.cache) : this.getDependency("material", a[e].material);
			o.push(t);
		}
		return o.push(t.loadGeometries(a)), Promise.all(o).then(function(n) {
			let o = n.slice(0, n.length - 1), s = n[n.length - 1], c = [];
			for (let n = 0, l = s.length; n < l; n++) {
				let l = s[n], u = a[n], d, f = o[n];
				if (u.mode === Ju.TRIANGLES || u.mode === Ju.TRIANGLE_STRIP || u.mode === Ju.TRIANGLE_FAN || u.mode === void 0) d = i.isSkinnedMesh === !0 ? new kr(l, f) : new Wn(l, f), d.isSkinnedMesh === !0 && d.normalizeSkinWeights(), u.mode === Ju.TRIANGLE_STRIP ? d.geometry = _u(d.geometry, 1) : u.mode === Ju.TRIANGLE_FAN && (d.geometry = _u(d.geometry, 2));
				else if (u.mode === Ju.LINES) d = new ui(l, f);
				else if (u.mode === Ju.LINE_STRIP) d = new oi(l, f);
				else if (u.mode === Ju.LINE_LOOP) d = new di(l, f);
				else if (u.mode === Ju.POINTS) d = new _i(l, f);
				else throw Error("THREE.GLTFLoader: Primitive mode unsupported: " + u.mode);
				Object.keys(d.geometry.morphAttributes).length > 0 && sd(d, i), d.name = t.createUniqueName(i.name || "mesh_" + e), ad(d, i), u.extensions && id(r, d, u), t.assignFinalMaterial(d), c.push(d);
			}
			for (let n = 0, r = c.length; n < r; n++) t.associations.set(c[n], {
				meshes: e,
				primitives: n
			});
			if (c.length === 1) return i.extensions && id(r, c[0], i), c[0];
			let l = new fr();
			i.extensions && id(r, l, i), t.associations.set(l, { meshes: e });
			for (let e = 0, t = c.length; e < t; e++) l.add(c[e]);
			return l;
		});
	}
	loadCamera(e) {
		let t, n = this.json.cameras[e], r = n[n.type];
		if (!r) {
			console.warn("THREE.GLTFLoader: Missing camera parameters.");
			return;
		}
		return n.type === "perspective" ? t = new or(_e.radToDeg(r.yfov), r.aspectRatio || 1, r.znear || 1, r.zfar || 2e6) : n.type === "orthographic" && (t = new Vo(-r.xmag, r.xmag, r.ymag, -r.ymag, r.znear, r.zfar)), n.name && (t.name = this.createUniqueName(n.name)), ad(t, n), Promise.resolve(t);
	}
	loadSkin(e) {
		let t = this.json.skins[e], n = [];
		for (let e = 0, r = t.joints.length; e < r; e++) n.push(this._loadNodeShallow(t.joints[e]));
		return t.inverseBindMatrices === void 0 ? n.push(null) : n.push(this.getDependency("accessor", t.inverseBindMatrices)), Promise.all(n).then(function(e) {
			let n = e.pop(), r = e, i = [], a = [];
			for (let e = 0, o = r.length; e < o; e++) {
				let o = r[e];
				if (o) {
					i.push(o);
					let t = new J();
					n !== null && t.fromArray(n.array, e * 16), a.push(t);
				} else console.warn("THREE.GLTFLoader: Joint \"%s\" could not be found.", t.joints[e]);
			}
			return new Pr(i, a);
		});
	}
	loadAnimation(e) {
		let t = this.json, n = this, r = t.animations[e], i = r.name ? r.name : "animation_" + e, a = [], o = [], s = [], c = [], l = [];
		for (let e = 0, t = r.channels.length; e < t; e++) {
			let t = r.channels[e], n = r.samplers[t.sampler], i = t.target, u = i.node, d = r.parameters === void 0 ? n.input : r.parameters[n.input], f = r.parameters === void 0 ? n.output : r.parameters[n.output];
			i.node !== void 0 && (a.push(this.getDependency("node", u)), o.push(this.getDependency("accessor", d)), s.push(this.getDependency("accessor", f)), c.push(n), l.push(i));
		}
		return Promise.all([
			Promise.all(a),
			Promise.all(o),
			Promise.all(s),
			Promise.all(c),
			Promise.all(l)
		]).then(function(e) {
			let t = e[0], a = e[1], o = e[2], s = e[3], c = e[4], l = [];
			for (let e = 0, r = t.length; e < r; e++) {
				let r = t[e], i = a[e], u = o[e], d = s[e], f = c[e];
				if (r === void 0) continue;
				r.updateMatrix && r.updateMatrix();
				let p = n._createAnimationTracks(r, i, u, d, f);
				if (p) for (let e = 0; e < p.length; e++) l.push(p[e]);
			}
			let u = new ho(i, void 0, l);
			return ad(u, r), u;
		});
	}
	createNodeMesh(e) {
		let t = this.json, n = this, r = t.nodes[e];
		return r.mesh === void 0 ? null : n.getDependency("mesh", r.mesh).then(function(e) {
			let t = n._getNodeRef(n.meshCache, r.mesh, e);
			return r.weights !== void 0 && t.traverse(function(e) {
				if (e.isMesh) for (let t = 0, n = r.weights.length; t < n; t++) e.morphTargetInfluences[t] = r.weights[t];
			}), t;
		});
	}
	loadNode(e) {
		let t = this.json, n = this, r = t.nodes[e], i = n._loadNodeShallow(e), a = [], o = r.children || [];
		for (let e = 0, t = o.length; e < t; e++) a.push(n.getDependency("node", o[e]));
		let s = r.skin === void 0 ? Promise.resolve(null) : n.getDependency("skin", r.skin);
		return Promise.all([
			i,
			Promise.all(a),
			s
		]).then(function(e) {
			let t = e[0], n = e[1], r = e[2];
			r !== null && t.traverse(function(e) {
				e.isSkinnedMesh && e.bind(r, fd);
			});
			for (let e = 0, r = n.length; e < r; e++) t.add(n[e]);
			return t;
		});
	}
	_loadNodeShallow(e) {
		let t = this.json, n = this.extensions, r = this;
		if (this.nodeCache[e] !== void 0) return this.nodeCache[e];
		let i = t.nodes[e], a = i.name ? r.createUniqueName(i.name) : "", o = [], s = r._invokeOne(function(t) {
			return t.createNodeMesh && t.createNodeMesh(e);
		});
		return s && o.push(s), i.camera !== void 0 && o.push(r.getDependency("camera", i.camera).then(function(e) {
			return r._getNodeRef(r.cameraCache, i.camera, e);
		})), r._invokeAll(function(t) {
			return t.createNodeAttachment && t.createNodeAttachment(e);
		}).forEach(function(e) {
			o.push(e);
		}), this.nodeCache[e] = Promise.all(o).then(function(t) {
			let o;
			if (o = i.isBone === !0 ? new Ar() : t.length > 1 ? new fr() : t.length === 1 ? t[0] : new Ut(), o !== t[0]) for (let e = 0, n = t.length; e < n; e++) o.add(t[e]);
			if (i.name && (o.userData.name = i.name, o.name = a), ad(o, i), i.extensions && id(n, o, i), i.matrix !== void 0) {
				let e = new J();
				e.fromArray(i.matrix), o.applyMatrix4(e);
			} else i.translation !== void 0 && o.position.fromArray(i.translation), i.rotation !== void 0 && o.quaternion.fromArray(i.rotation), i.scale !== void 0 && o.scale.fromArray(i.scale);
			if (!r.associations.has(o)) r.associations.set(o, {});
			else if (i.mesh !== void 0 && r.meshCache.refs[i.mesh] > 1) {
				let e = r.associations.get(o);
				r.associations.set(o, { ...e });
			}
			return r.associations.get(o).nodes = e, o;
		}), this.nodeCache[e];
	}
	loadScene(e) {
		let t = this.extensions, n = this.json.scenes[e], r = this, i = new fr();
		n.name && (i.name = r.createUniqueName(n.name)), ad(i, n), n.extensions && id(t, i, n);
		let a = n.nodes || [], o = [];
		for (let e = 0, t = a.length; e < t; e++) o.push(r.getDependency("node", a[e]));
		return Promise.all(o).then(function(e) {
			for (let t = 0, n = e.length; t < n; t++) i.add(e[t]);
			return r.associations = ((e) => {
				let t = /* @__PURE__ */ new Map();
				for (let [e, n] of r.associations) (e instanceof dn || e instanceof q) && t.set(e, n);
				return e.traverse((e) => {
					let n = r.associations.get(e);
					n != null && t.set(e, n);
				}), t;
			})(i), i;
		});
	}
	_createAnimationTracks(e, t, n, r, i) {
		let a = [], o = e.name ? e.name : e.uuid, s = [];
		ed[i.path] === ed.weights ? e.traverse(function(e) {
			e.morphTargetInfluences && s.push(e.name ? e.name : e.uuid);
		}) : s.push(o);
		let c;
		switch (ed[i.path]) {
			case ed.weights:
				c = lo;
				break;
			case ed.rotation:
				c = fo;
				break;
			case ed.translation:
			case ed.scale:
				c = mo;
				break;
			default: switch (n.itemSize) {
				case 1:
					c = lo;
					break;
				default: c = mo;
			}
		}
		let l = r.interpolation === void 0 ? y : td[r.interpolation], u = this._getArrayFromAccessor(n);
		for (let e = 0, n = s.length; e < n; e++) {
			let n = new c(s[e] + "." + ed[i.path], t.array, u, l);
			r.interpolation === "CUBICSPLINE" && this._createCubicSplineTrackInterpolant(n), a.push(n);
		}
		return a;
	}
	_getArrayFromAccessor(e) {
		let t = e.array;
		if (e.normalized) {
			let e = ud(t.constructor), n = new Float32Array(t.length);
			for (let r = 0, i = t.length; r < i; r++) n[r] = t[r] * e;
			t = n;
		}
		return t;
	}
	_createCubicSplineTrackInterpolant(e) {
		e.createInterpolant = function(e) {
			return new (this instanceof fo ? qu : Gu)(this.times, this.values, this.getValueSize() / 3, e);
		}, e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = !0;
	}
};
function md(e, t, n) {
	let r = t.attributes, i = new We();
	if (r.POSITION !== void 0) {
		let e = n.json.accessors[r.POSITION], t = e.min, a = e.max;
		if (t !== void 0 && a !== void 0) {
			if (i.set(new W(t[0], t[1], t[2]), new W(a[0], a[1], a[2])), e.normalized) {
				let t = ud(Yu[e.componentType]);
				i.min.multiplyScalar(t), i.max.multiplyScalar(t);
			}
		} else {
			console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
			return;
		}
	} else return;
	let a = t.targets;
	if (a !== void 0) {
		let e = new W(), t = new W();
		for (let r = 0, i = a.length; r < i; r++) {
			let i = a[r];
			if (i.POSITION !== void 0) {
				let r = n.json.accessors[i.POSITION], a = r.min, o = r.max;
				if (a !== void 0 && o !== void 0) {
					if (t.setX(Math.max(Math.abs(a[0]), Math.abs(o[0]))), t.setY(Math.max(Math.abs(a[1]), Math.abs(o[1]))), t.setZ(Math.max(Math.abs(a[2]), Math.abs(o[2]))), r.normalized) {
						let e = ud(Yu[r.componentType]);
						t.multiplyScalar(e);
					}
					e.max(t);
				} else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
			}
		}
		i.expandByVector(e);
	}
	e.boundingBox = i;
	let o = new ct();
	i.getCenter(o.center), o.radius = i.min.distanceTo(i.max) / 2, e.boundingSphere = o;
}
function hd(e, t, n) {
	let r = t.attributes, i = [];
	function a(t, r) {
		return n.getDependency("accessor", t).then(function(t) {
			e.setAttribute(r, t);
		});
	}
	for (let t in r) {
		let n = $u[t] || t.toLowerCase();
		n in e.attributes || i.push(a(r[t], n));
	}
	if (t.indices !== void 0 && !e.index) {
		let r = n.getDependency("accessor", t.indices).then(function(t) {
			e.setIndex(t);
		});
		i.push(r);
	}
	return K.workingColorSpace !== "srgb-linear" && "COLOR_0" in r && console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${K.workingColorSpace}" not supported.`), ad(e, t), md(e, t, n), Promise.all(i).then(function() {
		return t.targets === void 0 ? e : od(e, t.targets, n);
	});
}
//#endregion
//#region node_modules/three/examples/jsm/loaders/HDRLoader.js
var gd = class extends Eo {
	constructor(e) {
		super(e), this.type = f;
	}
	parse(e) {
		let t = function(e, t) {
			switch (e) {
				case 1: throw Error("THREE.HDRLoader: Read Error: " + (t || ""));
				case 2: throw Error("THREE.HDRLoader: Write Error: " + (t || ""));
				case 3: throw Error("THREE.HDRLoader: Bad File Format: " + (t || ""));
				default:
				case 4: throw Error("THREE.HDRLoader: Memory Error: " + (t || ""));
			}
		}, n = function(e, t, n) {
			t ||= 1024;
			let r = e.pos, i = -1, a = 0, o = "", s = String.fromCharCode.apply(null, new Uint16Array(e.subarray(r, r + 128)));
			for (; 0 > (i = s.indexOf("\n")) && a < t && r < e.byteLength;) o += s, a += s.length, r += 128, s += String.fromCharCode.apply(null, new Uint16Array(e.subarray(r, r + 128)));
			return -1 < i && (!1 !== n && (e.pos += a + i + 1), o + s.slice(0, i));
		}, r = function(e) {
			let r = /^#\?(\S+)/, i = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/, a = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/, o = /^\s*FORMAT=(\S+)\s*$/, s = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/, c = {
				valid: 0,
				string: "",
				comments: "",
				programtype: "RGBE",
				format: "",
				gamma: 1,
				exposure: 1,
				width: 0,
				height: 0
			}, l, u;
			for ((e.pos >= e.byteLength || !(l = n(e))) && t(1, "no header found"), (u = l.match(r)) || t(3, "bad initial token"), c.valid |= 1, c.programtype = u[1], c.string += l + "\n"; l = n(e), !1 !== l;) {
				if (c.string += l + "\n", l.charAt(0) === "#") {
					c.comments += l + "\n";
					continue;
				}
				if ((u = l.match(i)) && (c.gamma = parseFloat(u[1])), (u = l.match(a)) && (c.exposure = parseFloat(u[1])), (u = l.match(o)) && (c.valid |= 2, c.format = u[1]), (u = l.match(s)) && (c.valid |= 4, c.height = parseInt(u[1], 10), c.width = parseInt(u[2], 10)), c.valid & 2 && c.valid & 4) break;
			}
			return c.valid & 2 || t(3, "missing format specifier"), c.valid & 4 || t(3, "missing image size specifier"), c;
		}, i = function(e, n, r) {
			let i = n;
			if (i < 8 || i > 32767 || e[0] !== 2 || e[1] !== 2 || e[2] & 128) return new Uint8Array(e);
			i !== (e[2] << 8 | e[3]) && t(3, "wrong scanline width");
			let a = new Uint8Array(4 * n * r);
			a.length || t(4, "unable to allocate buffer space");
			let o = 0, s = 0, c = 4 * i, l = /* @__PURE__ */ new Uint8Array(4), u = new Uint8Array(c), d = r;
			for (; d > 0 && s < e.byteLength;) {
				s + 4 > e.byteLength && t(1), l[0] = e[s++], l[1] = e[s++], l[2] = e[s++], l[3] = e[s++], (l[0] != 2 || l[1] != 2 || (l[2] << 8 | l[3]) != i) && t(3, "bad rgbe scanline format");
				let n = 0, r;
				for (; n < c && s < e.byteLength;) {
					r = e[s++];
					let i = r > 128;
					if (i && (r -= 128), (r === 0 || n + r > c) && t(3, "bad scanline data"), i) {
						let t = e[s++];
						for (let e = 0; e < r; e++) u[n++] = t;
					} else u.set(e.subarray(s, s + r), n), n += r, s += r;
				}
				let f = i;
				for (let e = 0; e < f; e++) {
					let t = 0;
					a[o] = u[e + t], t += i, a[o + 1] = u[e + t], t += i, a[o + 2] = u[e + t], t += i, a[o + 3] = u[e + t], o += 4;
				}
				d--;
			}
			return a;
		}, a = function(e, t, n, r) {
			let i = 2 ** (e[t + 3] - 128) / 255;
			n[r + 0] = e[t + 0] * i, n[r + 1] = e[t + 1] * i, n[r + 2] = e[t + 2] * i, n[r + 3] = 1;
		}, o = function(e, t, n, r) {
			let i = 2 ** (e[t + 3] - 128) / 255;
			n[r + 0] = _n.toHalfFloat(Math.min(e[t + 0] * i, 65504)), n[r + 1] = _n.toHalfFloat(Math.min(e[t + 1] * i, 65504)), n[r + 2] = _n.toHalfFloat(Math.min(e[t + 2] * i, 65504)), n[r + 3] = _n.toHalfFloat(1);
		}, s = new Uint8Array(e);
		s.pos = 0;
		let c = r(s), l = c.width, u = c.height, p = i(s.subarray(s.pos), l, u), m, h, g;
		switch (this.type) {
			case d:
				g = p.length / 4;
				let e = new Float32Array(g * 4);
				for (let t = 0; t < g; t++) a(p, t * 4, e, t * 4);
				m = e, h = d;
				break;
			case f:
				g = p.length / 4;
				let t = new Uint16Array(g * 4);
				for (let e = 0; e < g; e++) o(p, e * 4, t, e * 4);
				m = t, h = f;
				break;
			default: throw Error("THREE.HDRLoader: Unsupported type: " + this.type);
		}
		return {
			width: l,
			height: u,
			data: m,
			header: c.string,
			gamma: c.gamma,
			exposure: c.exposure,
			type: h
		};
	}
	setDataType(e) {
		return this.type = e, this;
	}
	load(e, t, n, r) {
		function i(e, n) {
			switch (e.type) {
				case d:
				case f: e.colorSpace = E, e.minFilter = o, e.magFilter = o, e.generateMipmaps = !1, e.flipY = !0;
			}
			t && t(e, n);
		}
		return super.load(e, i, n, r);
	}
}, _d = class extends gd {
	constructor(e) {
		console.warn("RGBELoader has been deprecated. Please use HDRLoader instead."), super(e);
	}
};
//#endregion
//#region node_modules/three/examples/jsm/utils/SkeletonUtils.js
function vd(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = e.clone();
	return yd(e, r, function(e, r) {
		t.set(r, e), n.set(e, r);
	}), r.traverse(function(e) {
		if (!e.isSkinnedMesh) return;
		let r = e, i = t.get(e), a = i.skeleton.bones;
		r.skeleton = i.skeleton.clone(), r.bindMatrix.copy(i.bindMatrix), r.skeleton.bones = a.map(function(e) {
			return n.get(e);
		}), r.bind(r.skeleton, r.bindMatrix);
	}), r;
}
function yd(e, t, n) {
	n(e, t);
	for (let r = 0; r < e.children.length; r++) yd(e.children[r], t.children[r], n);
}
//#endregion
//#region node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js
var bd = new W();
function xd(e, t, n, r, i, a) {
	let o = 2 * Math.PI * i / 4, s = Math.max(a - 2 * i, 0), c = Math.PI / 4;
	bd.copy(t), bd[r] = 0, bd.normalize();
	let l = .5 * o / (o + s), u = 1 - bd.angleTo(e) / c;
	return Math.sign(bd[n]) === 1 ? u * l : s / (o + s) + l + l * (1 - u);
}
var Sd = class e extends qn {
	constructor(e = 1, t = 1, n = 1, r = 2, i = .1) {
		let a = r * 2 + 1;
		if (i = Math.min(e / 2, t / 2, n / 2, i), super(1, 1, 1, a, a, a), this.type = "RoundedBoxGeometry", this.parameters = {
			width: e,
			height: t,
			depth: n,
			segments: r,
			radius: i
		}, a === 1) return;
		let o = this.toNonIndexed();
		this.index = null, this.attributes.position = o.attributes.position, this.attributes.normal = o.attributes.normal, this.attributes.uv = o.attributes.uv;
		let s = new W(), c = new W(), l = new W(e, t, n).divideScalar(2).subScalar(i), u = this.attributes.position.array, d = this.attributes.normal.array, f = this.attributes.uv.array, p = u.length / 6, m = new W(), h = .5 / a;
		for (let r = 0, a = 0; r < u.length; r += 3, a += 2) switch (s.fromArray(u, r), c.copy(s), c.x -= Math.sign(c.x) * h, c.y -= Math.sign(c.y) * h, c.z -= Math.sign(c.z) * h, c.normalize(), u[r + 0] = l.x * Math.sign(s.x) + c.x * i, u[r + 1] = l.y * Math.sign(s.y) + c.y * i, u[r + 2] = l.z * Math.sign(s.z) + c.z * i, d[r + 0] = c.x, d[r + 1] = c.y, d[r + 2] = c.z, Math.floor(r / p)) {
			case 0:
				m.set(1, 0, 0), f[a + 0] = xd(m, c, "z", "y", i, n), f[a + 1] = 1 - xd(m, c, "y", "z", i, t);
				break;
			case 1:
				m.set(-1, 0, 0), f[a + 0] = 1 - xd(m, c, "z", "y", i, n), f[a + 1] = 1 - xd(m, c, "y", "z", i, t);
				break;
			case 2:
				m.set(0, 1, 0), f[a + 0] = 1 - xd(m, c, "x", "z", i, e), f[a + 1] = xd(m, c, "z", "x", i, n);
				break;
			case 3:
				m.set(0, -1, 0), f[a + 0] = 1 - xd(m, c, "x", "z", i, e), f[a + 1] = 1 - xd(m, c, "z", "x", i, n);
				break;
			case 4:
				m.set(0, 0, 1), f[a + 0] = 1 - xd(m, c, "x", "y", i, e), f[a + 1] = 1 - xd(m, c, "y", "x", i, t);
				break;
			case 5: m.set(0, 0, -1), f[a + 0] = xd(m, c, "x", "y", i, e), f[a + 1] = 1 - xd(m, c, "y", "x", i, t);
		}
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.depth, t.segments, t.radius);
	}
}, Cd = {
	name: "CopyShader",
	uniforms: {
		tDiffuse: { value: null },
		opacity: { value: 1 }
	},
	vertexShader: "\n\n		varying vec2 vUv;\n\n		void main() {\n\n			vUv = uv;\n			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n		}",
	fragmentShader: "\n\n		uniform float opacity;\n\n		uniform sampler2D tDiffuse;\n\n		varying vec2 vUv;\n\n		void main() {\n\n			vec4 texel = texture2D( tDiffuse, vUv );\n			gl_FragColor = opacity * texel;\n\n\n		}"
}, wd = class {
	constructor() {
		this.isPass = !0, this.enabled = !0, this.needsSwap = !0, this.clear = !1, this.renderToScreen = !1;
	}
	setSize() {}
	render() {
		console.error("THREE.Pass: .render() must be implemented in derived pass.");
	}
	dispose() {}
}, Td = new Vo(-1, 1, 1, -1, 0, 1), Ed = new class extends Mn {
	constructor() {
		super(), this.setAttribute("position", new wn([
			-1,
			3,
			0,
			-1,
			-1,
			0,
			3,
			-1,
			0
		], 3)), this.setAttribute("uv", new wn([
			0,
			2,
			0,
			0,
			2,
			0
		], 2));
	}
}(), Dd = class {
	constructor(e) {
		this._mesh = new Wn(Ed, e);
	}
	dispose() {
		this._mesh.geometry.dispose();
	}
	render(e) {
		e.render(this._mesh, Td);
	}
	get material() {
		return this._mesh.material;
	}
	set material(e) {
		this._mesh.material = e;
	}
}, Od = class extends wd {
	constructor(e, t = "tDiffuse") {
		super(), this.textureID = t, this.uniforms = null, this.material = null, e instanceof tr ? (this.uniforms = e.uniforms, this.material = e) : e && (this.uniforms = Qn.clone(e.uniforms), this.material = new tr({
			name: e.name === void 0 ? "unspecified" : e.name,
			defines: Object.assign({}, e.defines),
			uniforms: this.uniforms,
			vertexShader: e.vertexShader,
			fragmentShader: e.fragmentShader
		})), this._fsQuad = new Dd(this.material);
	}
	render(e, t, n) {
		this.uniforms[this.textureID] && (this.uniforms[this.textureID].value = n.texture), this._fsQuad.material = this.material, this.renderToScreen ? (e.setRenderTarget(null), this._fsQuad.render(e)) : (e.setRenderTarget(t), this.clear && e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil), this._fsQuad.render(e));
	}
	dispose() {
		this.material.dispose(), this._fsQuad.dispose();
	}
}, kd = class extends wd {
	constructor(e, t) {
		super(), this.scene = e, this.camera = t, this.clear = !0, this.needsSwap = !1, this.inverse = !1;
	}
	render(e, t, n) {
		let r = e.getContext(), i = e.state;
		i.buffers.color.setMask(!1), i.buffers.depth.setMask(!1), i.buffers.color.setLocked(!0), i.buffers.depth.setLocked(!0);
		let a, o;
		this.inverse ? (a = 0, o = 1) : (a = 1, o = 0), i.buffers.stencil.setTest(!0), i.buffers.stencil.setOp(r.REPLACE, r.REPLACE, r.REPLACE), i.buffers.stencil.setFunc(r.ALWAYS, a, 4294967295), i.buffers.stencil.setClear(o), i.buffers.stencil.setLocked(!0), e.setRenderTarget(n), this.clear && e.clear(), e.render(this.scene, this.camera), e.setRenderTarget(t), this.clear && e.clear(), e.render(this.scene, this.camera), i.buffers.color.setLocked(!1), i.buffers.depth.setLocked(!1), i.buffers.color.setMask(!0), i.buffers.depth.setMask(!0), i.buffers.stencil.setLocked(!1), i.buffers.stencil.setFunc(r.EQUAL, 1, 4294967295), i.buffers.stencil.setOp(r.KEEP, r.KEEP, r.KEEP), i.buffers.stencil.setLocked(!0);
	}
}, Ad = class extends wd {
	constructor() {
		super(), this.needsSwap = !1;
	}
	render(e) {
		e.state.buffers.stencil.setLocked(!1), e.state.buffers.stencil.setTest(!1);
	}
}, jd = class {
	constructor(e, t) {
		if (this.renderer = e, this._pixelRatio = e.getPixelRatio(), t === void 0) {
			let n = e.getSize(new H());
			this._width = n.width, this._height = n.height, t = new Ve(this._width * this._pixelRatio, this._height * this._pixelRatio, { type: f }), t.texture.name = "EffectComposer.rt1";
		} else this._width = t.width, this._height = t.height;
		this.renderTarget1 = t, this.renderTarget2 = t.clone(), this.renderTarget2.texture.name = "EffectComposer.rt2", this.writeBuffer = this.renderTarget1, this.readBuffer = this.renderTarget2, this.renderToScreen = !0, this.passes = [], this.copyPass = new Od(Cd), this.copyPass.material.blending = 0, this.clock = new Jo();
	}
	swapBuffers() {
		let e = this.readBuffer;
		this.readBuffer = this.writeBuffer, this.writeBuffer = e;
	}
	addPass(e) {
		this.passes.push(e), e.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
	}
	insertPass(e, t) {
		this.passes.splice(t, 0, e), e.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
	}
	removePass(e) {
		let t = this.passes.indexOf(e);
		t !== -1 && this.passes.splice(t, 1);
	}
	isLastEnabledPass(e) {
		for (let t = e + 1; t < this.passes.length; t++) if (this.passes[t].enabled) return !1;
		return !0;
	}
	render(e) {
		e === void 0 && (e = this.clock.getDelta());
		let t = this.renderer.getRenderTarget(), n = !1;
		for (let t = 0, r = this.passes.length; t < r; t++) {
			let r = this.passes[t];
			if (r.enabled !== !1) {
				if (r.renderToScreen = this.renderToScreen && this.isLastEnabledPass(t), r.render(this.renderer, this.writeBuffer, this.readBuffer, e, n), r.needsSwap) {
					if (n) {
						let t = this.renderer.getContext(), n = this.renderer.state.buffers.stencil;
						n.setFunc(t.NOTEQUAL, 1, 4294967295), this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, e), n.setFunc(t.EQUAL, 1, 4294967295);
					}
					this.swapBuffers();
				}
				kd !== void 0 && (r instanceof kd ? n = !0 : r instanceof Ad && (n = !1));
			}
		}
		this.renderer.setRenderTarget(t);
	}
	reset(e) {
		if (e === void 0) {
			let t = this.renderer.getSize(new H());
			this._pixelRatio = this.renderer.getPixelRatio(), this._width = t.width, this._height = t.height, e = this.renderTarget1.clone(), e.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
		}
		this.renderTarget1.dispose(), this.renderTarget2.dispose(), this.renderTarget1 = e, this.renderTarget2 = e.clone(), this.writeBuffer = this.renderTarget1, this.readBuffer = this.renderTarget2;
	}
	setSize(e, t) {
		this._width = e, this._height = t;
		let n = this._width * this._pixelRatio, r = this._height * this._pixelRatio;
		this.renderTarget1.setSize(n, r), this.renderTarget2.setSize(n, r);
		for (let e = 0; e < this.passes.length; e++) this.passes[e].setSize(n, r);
	}
	setPixelRatio(e) {
		this._pixelRatio = e, this.setSize(this._width, this._height);
	}
	dispose() {
		this.renderTarget1.dispose(), this.renderTarget2.dispose(), this.copyPass.dispose();
	}
}, Md = class extends wd {
	constructor(e, t, n = null, r = null, i = null) {
		super(), this.scene = e, this.camera = t, this.overrideMaterial = n, this.clearColor = r, this.clearAlpha = i, this.clear = !0, this.clearDepth = !1, this.needsSwap = !1, this._oldClearColor = new Y();
	}
	render(e, t, n) {
		let r = e.autoClear;
		e.autoClear = !1;
		let i, a;
		this.overrideMaterial !== null && (a = this.scene.overrideMaterial, this.scene.overrideMaterial = this.overrideMaterial), this.clearColor !== null && (e.getClearColor(this._oldClearColor), e.setClearColor(this.clearColor, e.getClearAlpha())), this.clearAlpha !== null && (i = e.getClearAlpha(), e.setClearAlpha(this.clearAlpha)), this.clearDepth == 1 && e.clearDepth(), e.setRenderTarget(this.renderToScreen ? null : n), this.clear === !0 && e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil), e.render(this.scene, this.camera), this.clearColor !== null && e.setClearColor(this._oldClearColor), this.clearAlpha !== null && e.setClearAlpha(i), this.overrideMaterial !== null && (this.scene.overrideMaterial = a), e.autoClear = r;
	}
}, Nd = class {
	constructor(e = Math) {
		this.grad3 = [
			[
				1,
				1,
				0
			],
			[
				-1,
				1,
				0
			],
			[
				1,
				-1,
				0
			],
			[
				-1,
				-1,
				0
			],
			[
				1,
				0,
				1
			],
			[
				-1,
				0,
				1
			],
			[
				1,
				0,
				-1
			],
			[
				-1,
				0,
				-1
			],
			[
				0,
				1,
				1
			],
			[
				0,
				-1,
				1
			],
			[
				0,
				1,
				-1
			],
			[
				0,
				-1,
				-1
			]
		], this.grad4 = [
			[
				0,
				1,
				1,
				1
			],
			[
				0,
				1,
				1,
				-1
			],
			[
				0,
				1,
				-1,
				1
			],
			[
				0,
				1,
				-1,
				-1
			],
			[
				0,
				-1,
				1,
				1
			],
			[
				0,
				-1,
				1,
				-1
			],
			[
				0,
				-1,
				-1,
				1
			],
			[
				0,
				-1,
				-1,
				-1
			],
			[
				1,
				0,
				1,
				1
			],
			[
				1,
				0,
				1,
				-1
			],
			[
				1,
				0,
				-1,
				1
			],
			[
				1,
				0,
				-1,
				-1
			],
			[
				-1,
				0,
				1,
				1
			],
			[
				-1,
				0,
				1,
				-1
			],
			[
				-1,
				0,
				-1,
				1
			],
			[
				-1,
				0,
				-1,
				-1
			],
			[
				1,
				1,
				0,
				1
			],
			[
				1,
				1,
				0,
				-1
			],
			[
				1,
				-1,
				0,
				1
			],
			[
				1,
				-1,
				0,
				-1
			],
			[
				-1,
				1,
				0,
				1
			],
			[
				-1,
				1,
				0,
				-1
			],
			[
				-1,
				-1,
				0,
				1
			],
			[
				-1,
				-1,
				0,
				-1
			],
			[
				1,
				1,
				1,
				0
			],
			[
				1,
				1,
				-1,
				0
			],
			[
				1,
				-1,
				1,
				0
			],
			[
				1,
				-1,
				-1,
				0
			],
			[
				-1,
				1,
				1,
				0
			],
			[
				-1,
				1,
				-1,
				0
			],
			[
				-1,
				-1,
				1,
				0
			],
			[
				-1,
				-1,
				-1,
				0
			]
		], this.p = [];
		for (let t = 0; t < 256; t++) this.p[t] = Math.floor(e.random() * 256);
		this.perm = [];
		for (let e = 0; e < 512; e++) this.perm[e] = this.p[e & 255];
		this.simplex = [
			[
				0,
				1,
				2,
				3
			],
			[
				0,
				1,
				3,
				2
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				2,
				3,
				1
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				1,
				2,
				3,
				0
			],
			[
				0,
				2,
				1,
				3
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				3,
				1,
				2
			],
			[
				0,
				3,
				2,
				1
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				1,
				3,
				2,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				1,
				2,
				0,
				3
			],
			[
				0,
				0,
				0,
				0
			],
			[
				1,
				3,
				0,
				2
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				2,
				3,
				0,
				1
			],
			[
				2,
				3,
				1,
				0
			],
			[
				1,
				0,
				2,
				3
			],
			[
				1,
				0,
				3,
				2
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				2,
				0,
				3,
				1
			],
			[
				0,
				0,
				0,
				0
			],
			[
				2,
				1,
				3,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				2,
				0,
				1,
				3
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				3,
				0,
				1,
				2
			],
			[
				3,
				0,
				2,
				1
			],
			[
				0,
				0,
				0,
				0
			],
			[
				3,
				1,
				2,
				0
			],
			[
				2,
				1,
				0,
				3
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0
			],
			[
				3,
				1,
				0,
				2
			],
			[
				0,
				0,
				0,
				0
			],
			[
				3,
				2,
				0,
				1
			],
			[
				3,
				2,
				1,
				0
			]
		];
	}
	noise(e, t) {
		let n, r, i, a = .5 * (Math.sqrt(3) - 1), o = (e + t) * a, s = Math.floor(e + o), c = Math.floor(t + o), l = (3 - Math.sqrt(3)) / 6, u = (s + c) * l, d = s - u, f = c - u, p = e - d, m = t - f, h, g;
		p > m ? (h = 1, g = 0) : (h = 0, g = 1);
		let _ = p - h + l, v = m - g + l, y = p - 1 + 2 * l, b = m - 1 + 2 * l, x = s & 255, S = c & 255, C = this.perm[x + this.perm[S]] % 12, w = this.perm[x + h + this.perm[S + g]] % 12, T = this.perm[x + 1 + this.perm[S + 1]] % 12, E = .5 - p * p - m * m;
		E < 0 ? n = 0 : (E *= E, n = E * E * this._dot(this.grad3[C], p, m));
		let D = .5 - _ * _ - v * v;
		D < 0 ? r = 0 : (D *= D, r = D * D * this._dot(this.grad3[w], _, v));
		let O = .5 - y * y - b * b;
		return O < 0 ? i = 0 : (O *= O, i = O * O * this._dot(this.grad3[T], y, b)), 70 * (n + r + i);
	}
	noise3d(e, t, n) {
		let r, i, a, o, s = (e + t + n) * (1 / 3), c = Math.floor(e + s), l = Math.floor(t + s), u = Math.floor(n + s), d = 1 / 6, f = (c + l + u) * d, p = c - f, m = l - f, h = u - f, g = e - p, _ = t - m, v = n - h, y, b, x, S, C, w;
		g >= _ ? _ >= v ? (y = 1, b = 0, x = 0, S = 1, C = 1, w = 0) : g >= v ? (y = 1, b = 0, x = 0, S = 1, C = 0, w = 1) : (y = 0, b = 0, x = 1, S = 1, C = 0, w = 1) : _ < v ? (y = 0, b = 0, x = 1, S = 0, C = 1, w = 1) : g < v ? (y = 0, b = 1, x = 0, S = 0, C = 1, w = 1) : (y = 0, b = 1, x = 0, S = 1, C = 1, w = 0);
		let T = g - y + d, E = _ - b + d, D = v - x + d, O = g - S + 2 * d, k = _ - C + 2 * d, A = v - w + 2 * d, j = g - 1 + 3 * d, M = _ - 1 + 3 * d, N = v - 1 + 3 * d, P = c & 255, F = l & 255, ee = u & 255, I = this.perm[P + this.perm[F + this.perm[ee]]] % 12, L = this.perm[P + y + this.perm[F + b + this.perm[ee + x]]] % 12, te = this.perm[P + S + this.perm[F + C + this.perm[ee + w]]] % 12, ne = this.perm[P + 1 + this.perm[F + 1 + this.perm[ee + 1]]] % 12, re = .6 - g * g - _ * _ - v * v;
		re < 0 ? r = 0 : (re *= re, r = re * re * this._dot3(this.grad3[I], g, _, v));
		let R = .6 - T * T - E * E - D * D;
		R < 0 ? i = 0 : (R *= R, i = R * R * this._dot3(this.grad3[L], T, E, D));
		let ie = .6 - O * O - k * k - A * A;
		ie < 0 ? a = 0 : (ie *= ie, a = ie * ie * this._dot3(this.grad3[te], O, k, A));
		let z = .6 - j * j - M * M - N * N;
		return z < 0 ? o = 0 : (z *= z, o = z * z * this._dot3(this.grad3[ne], j, M, N)), 32 * (r + i + a + o);
	}
	noise4d(e, t, n, r) {
		let i = this.grad4, a = this.simplex, o = this.perm, s = (Math.sqrt(5) - 1) / 4, c = (5 - Math.sqrt(5)) / 20, l, u, d, f, p, m = (e + t + n + r) * s, h = Math.floor(e + m), g = Math.floor(t + m), _ = Math.floor(n + m), v = Math.floor(r + m), y = (h + g + _ + v) * c, b = h - y, x = g - y, S = _ - y, C = v - y, w = e - b, T = t - x, E = n - S, D = r - C, O = w > T ? 32 : 0, k = w > E ? 16 : 0, A = T > E ? 8 : 0, j = w > D ? 4 : 0, M = T > D ? 2 : 0, N = +(E > D), P = O + k + A + j + M + N, F = +(a[P][0] >= 3), ee = +(a[P][1] >= 3), I = +(a[P][2] >= 3), L = +(a[P][3] >= 3), te = +(a[P][0] >= 2), ne = +(a[P][1] >= 2), re = +(a[P][2] >= 2), R = +(a[P][3] >= 2), ie = +(a[P][0] >= 1), z = +(a[P][1] >= 1), ae = +(a[P][2] >= 1), oe = +(a[P][3] >= 1), se = w - F + c, ce = T - ee + c, le = E - I + c, ue = D - L + c, de = w - te + 2 * c, fe = T - ne + 2 * c, pe = E - re + 2 * c, B = D - R + 2 * c, me = w - ie + 3 * c, he = T - z + 3 * c, ge = E - ae + 3 * c, V = D - oe + 3 * c, _e = w - 1 + 4 * c, H = T - 1 + 4 * c, U = E - 1 + 4 * c, W = D - 1 + 4 * c, ve = h & 255, ye = g & 255, G = _ & 255, be = v & 255, xe = o[ve + o[ye + o[G + o[be]]]] % 32, Se = o[ve + F + o[ye + ee + o[G + I + o[be + L]]]] % 32, Ce = o[ve + te + o[ye + ne + o[G + re + o[be + R]]]] % 32, we = o[ve + ie + o[ye + z + o[G + ae + o[be + oe]]]] % 32, Te = o[ve + 1 + o[ye + 1 + o[G + 1 + o[be + 1]]]] % 32, Ee = .6 - w * w - T * T - E * E - D * D;
		Ee < 0 ? l = 0 : (Ee *= Ee, l = Ee * Ee * this._dot4(i[xe], w, T, E, D));
		let De = .6 - se * se - ce * ce - le * le - ue * ue;
		De < 0 ? u = 0 : (De *= De, u = De * De * this._dot4(i[Se], se, ce, le, ue));
		let Oe = .6 - de * de - fe * fe - pe * pe - B * B;
		Oe < 0 ? d = 0 : (Oe *= Oe, d = Oe * Oe * this._dot4(i[Ce], de, fe, pe, B));
		let ke = .6 - me * me - he * he - ge * ge - V * V;
		ke < 0 ? f = 0 : (ke *= ke, f = ke * ke * this._dot4(i[we], me, he, ge, V));
		let K = .6 - _e * _e - H * H - U * U - W * W;
		return K < 0 ? p = 0 : (K *= K, p = K * K * this._dot4(i[Te], _e, H, U, W)), 27 * (l + u + d + f + p);
	}
	_dot(e, t, n) {
		return e[0] * t + e[1] * n;
	}
	_dot3(e, t, n, r) {
		return e[0] * t + e[1] * n + e[2] * r;
	}
	_dot4(e, t, n, r, i) {
		return e[0] * t + e[1] * n + e[2] * r + e[3] * i;
	}
}, Pd = {
	name: "SSAOShader",
	defines: {
		PERSPECTIVE_CAMERA: 1,
		KERNEL_SIZE: 32
	},
	uniforms: {
		tNormal: { value: null },
		tDepth: { value: null },
		tNoise: { value: null },
		kernel: { value: null },
		cameraNear: { value: null },
		cameraFar: { value: null },
		resolution: { value: new H() },
		cameraProjectionMatrix: { value: new J() },
		cameraInverseProjectionMatrix: { value: new J() },
		kernelRadius: { value: 8 },
		minDistance: { value: .005 },
		maxDistance: { value: .05 }
	},
	vertexShader: "\n\n		varying vec2 vUv;\n\n		void main() {\n\n			vUv = uv;\n\n			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n		}",
	fragmentShader: "\n		uniform highp sampler2D tNormal;\n		uniform highp sampler2D tDepth;\n		uniform sampler2D tNoise;\n\n		uniform vec3 kernel[ KERNEL_SIZE ];\n\n		uniform vec2 resolution;\n\n		uniform float cameraNear;\n		uniform float cameraFar;\n		uniform mat4 cameraProjectionMatrix;\n		uniform mat4 cameraInverseProjectionMatrix;\n\n		uniform float kernelRadius;\n		uniform float minDistance; // avoid artifacts caused by neighbour fragments with minimal depth difference\n		uniform float maxDistance; // avoid the influence of fragments which are too far away\n\n		varying vec2 vUv;\n\n		#include <packing>\n\n		float getDepth( const in vec2 screenPosition ) {\n\n			return texture2D( tDepth, screenPosition ).x;\n\n		}\n\n		float getLinearDepth( const in vec2 screenPosition ) {\n\n			#if PERSPECTIVE_CAMERA == 1\n\n				float fragCoordZ = texture2D( tDepth, screenPosition ).x;\n				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );\n				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );\n\n			#else\n\n				return texture2D( tDepth, screenPosition ).x;\n\n			#endif\n\n		}\n\n		float getViewZ( const in float depth ) {\n\n			#if PERSPECTIVE_CAMERA == 1\n\n				return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );\n\n			#else\n\n				return orthographicDepthToViewZ( depth, cameraNear, cameraFar );\n\n			#endif\n\n		}\n\n		vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {\n\n			float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];\n\n			vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );\n\n			clipPosition *= clipW; // unprojection.\n\n			return ( cameraInverseProjectionMatrix * clipPosition ).xyz;\n\n		}\n\n		vec3 getViewNormal( const in vec2 screenPosition ) {\n\n			return unpackRGBToNormal( texture2D( tNormal, screenPosition ).xyz );\n\n		}\n\n		void main() {\n\n			float depth = getDepth( vUv );\n\n			if ( depth == 1.0 ) {\n\n				gl_FragColor = vec4( 1.0 ); // don't influence background\n\n			} else {\n\n				float viewZ = getViewZ( depth );\n\n				vec3 viewPosition = getViewPosition( vUv, depth, viewZ );\n				vec3 viewNormal = getViewNormal( vUv );\n\n				vec2 noiseScale = vec2( resolution.x / 4.0, resolution.y / 4.0 );\n				vec3 random = vec3( texture2D( tNoise, vUv * noiseScale ).r );\n\n				// compute matrix used to reorient a kernel vector\n\n				vec3 tangent = normalize( random - viewNormal * dot( random, viewNormal ) );\n				vec3 bitangent = cross( viewNormal, tangent );\n				mat3 kernelMatrix = mat3( tangent, bitangent, viewNormal );\n\n				float occlusion = 0.0;\n\n				for ( int i = 0; i < KERNEL_SIZE; i ++ ) {\n\n					vec3 sampleVector = kernelMatrix * kernel[ i ]; // reorient sample vector in view space\n					vec3 samplePoint = viewPosition + ( sampleVector * kernelRadius ); // calculate sample point\n\n					vec4 samplePointNDC = cameraProjectionMatrix * vec4( samplePoint, 1.0 ); // project point and calculate NDC\n					samplePointNDC /= samplePointNDC.w;\n\n					vec2 samplePointUv = samplePointNDC.xy * 0.5 + 0.5; // compute uv coordinates\n\n					float realDepth = getLinearDepth( samplePointUv ); // get linear depth from depth texture\n					float sampleDepth = viewZToOrthographicDepth( samplePoint.z, cameraNear, cameraFar ); // compute linear depth of the sample view Z value\n					float delta = sampleDepth - realDepth;\n\n					if ( delta > minDistance && delta < maxDistance ) { // if fragment is before sample point, increase occlusion\n\n						occlusion += 1.0;\n\n					}\n\n				}\n\n				occlusion = clamp( occlusion / float( KERNEL_SIZE ), 0.0, 1.0 );\n\n				gl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );\n\n			}\n\n		}"
}, Fd = {
	name: "SSAODepthShader",
	defines: { PERSPECTIVE_CAMERA: 1 },
	uniforms: {
		tDepth: { value: null },
		cameraNear: { value: null },
		cameraFar: { value: null }
	},
	vertexShader: "varying vec2 vUv;\n\n		void main() {\n\n			vUv = uv;\n			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n		}",
	fragmentShader: "uniform sampler2D tDepth;\n\n		uniform float cameraNear;\n		uniform float cameraFar;\n\n		varying vec2 vUv;\n\n		#include <packing>\n\n		float getLinearDepth( const in vec2 screenPosition ) {\n\n			#if PERSPECTIVE_CAMERA == 1\n\n				float fragCoordZ = texture2D( tDepth, screenPosition ).x;\n				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );\n				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );\n\n			#else\n\n				return texture2D( tDepth, screenPosition ).x;\n\n			#endif\n\n		}\n\n		void main() {\n\n			float depth = getLinearDepth( vUv );\n			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );\n\n		}"
}, Id = {
	name: "SSAOBlurShader",
	uniforms: {
		tDiffuse: { value: null },
		resolution: { value: new H() }
	},
	vertexShader: "varying vec2 vUv;\n\n		void main() {\n\n			vUv = uv;\n			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n		}",
	fragmentShader: "uniform sampler2D tDiffuse;\n\n		uniform vec2 resolution;\n\n		varying vec2 vUv;\n\n		void main() {\n\n			vec2 texelSize = ( 1.0 / resolution );\n			float result = 0.0;\n\n			for ( int i = - 2; i <= 2; i ++ ) {\n\n				for ( int j = - 2; j <= 2; j ++ ) {\n\n					vec2 offset = ( vec2( float( i ), float( j ) ) ) * texelSize;\n					result += texture2D( tDiffuse, vUv + offset ).r;\n\n				}\n\n			}\n\n			gl_FragColor = vec4( vec3( result / ( 5.0 * 5.0 ) ), 1.0 );\n\n		}"
}, Ld = class t extends wd {
	constructor(e, t, n = 512, i = 512, a = 32) {
		super(), this.width = n, this.height = i, this.clear = !0, this.needsSwap = !1, this.camera = t, this.scene = e, this.kernelRadius = 8, this.kernel = [], this.noiseTexture = null, this.output = 0, this.minDistance = .005, this.maxDistance = .1, this._visibilityCache = [], this._generateSampleKernel(a), this._generateRandomKernelRotations();
		let o = new bi();
		o.format = g, o.type = p, this.normalRenderTarget = new Ve(this.width, this.height, {
			minFilter: r,
			magFilter: r,
			type: f,
			depthTexture: o
		}), this.ssaoRenderTarget = new Ve(this.width, this.height, { type: f }), this.blurRenderTarget = this.ssaoRenderTarget.clone(), this.ssaoMaterial = new tr({
			defines: Object.assign({}, Pd.defines),
			uniforms: Qn.clone(Pd.uniforms),
			vertexShader: Pd.vertexShader,
			fragmentShader: Pd.fragmentShader,
			blending: 0
		}), this.ssaoMaterial.defines.KERNEL_SIZE = a, this.ssaoMaterial.uniforms.tNormal.value = this.normalRenderTarget.texture, this.ssaoMaterial.uniforms.tDepth.value = this.normalRenderTarget.depthTexture, this.ssaoMaterial.uniforms.tNoise.value = this.noiseTexture, this.ssaoMaterial.uniforms.kernel.value = this.kernel, this.ssaoMaterial.uniforms.cameraNear.value = this.camera.near, this.ssaoMaterial.uniforms.cameraFar.value = this.camera.far, this.ssaoMaterial.uniforms.resolution.value.set(this.width, this.height), this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix), this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse), this.normalMaterial = new Ja(), this.normalMaterial.blending = 0, this.blurMaterial = new tr({
			defines: Object.assign({}, Id.defines),
			uniforms: Qn.clone(Id.uniforms),
			vertexShader: Id.vertexShader,
			fragmentShader: Id.fragmentShader
		}), this.blurMaterial.uniforms.tDiffuse.value = this.ssaoRenderTarget.texture, this.blurMaterial.uniforms.resolution.value.set(this.width, this.height), this.depthRenderMaterial = new tr({
			defines: Object.assign({}, Fd.defines),
			uniforms: Qn.clone(Fd.uniforms),
			vertexShader: Fd.vertexShader,
			fragmentShader: Fd.fragmentShader,
			blending: 0
		}), this.depthRenderMaterial.uniforms.tDepth.value = this.normalRenderTarget.depthTexture, this.depthRenderMaterial.uniforms.cameraNear.value = this.camera.near, this.depthRenderMaterial.uniforms.cameraFar.value = this.camera.far, this.copyMaterial = new tr({
			uniforms: Qn.clone(Cd.uniforms),
			vertexShader: Cd.vertexShader,
			fragmentShader: Cd.fragmentShader,
			transparent: !0,
			depthTest: !1,
			depthWrite: !1,
			blendSrc: 208,
			blendDst: 200,
			blendEquation: 100,
			blendSrcAlpha: 206,
			blendDstAlpha: 200,
			blendEquationAlpha: 100
		}), this._fsQuad = new Dd(null), this._originalClearColor = new Y();
	}
	dispose() {
		this.normalRenderTarget.dispose(), this.ssaoRenderTarget.dispose(), this.blurRenderTarget.dispose(), this.normalMaterial.dispose(), this.blurMaterial.dispose(), this.copyMaterial.dispose(), this.depthRenderMaterial.dispose(), this._fsQuad.dispose();
	}
	render(e, n, r) {
		switch (this._overrideVisibility(), this._renderOverride(e, this.normalMaterial, this.normalRenderTarget, 7829503, 1), this._restoreVisibility(), this.ssaoMaterial.uniforms.kernelRadius.value = this.kernelRadius, this.ssaoMaterial.uniforms.minDistance.value = this.minDistance, this.ssaoMaterial.uniforms.maxDistance.value = this.maxDistance, this._renderPass(e, this.ssaoMaterial, this.ssaoRenderTarget), this._renderPass(e, this.blurMaterial, this.blurRenderTarget), this.output) {
			case t.OUTPUT.SSAO:
				this.copyMaterial.uniforms.tDiffuse.value = this.ssaoRenderTarget.texture, this.copyMaterial.blending = 0, this._renderPass(e, this.copyMaterial, this.renderToScreen ? null : r);
				break;
			case t.OUTPUT.Blur:
				this.copyMaterial.uniforms.tDiffuse.value = this.blurRenderTarget.texture, this.copyMaterial.blending = 0, this._renderPass(e, this.copyMaterial, this.renderToScreen ? null : r);
				break;
			case t.OUTPUT.Depth:
				this._renderPass(e, this.depthRenderMaterial, this.renderToScreen ? null : r);
				break;
			case t.OUTPUT.Normal:
				this.copyMaterial.uniforms.tDiffuse.value = this.normalRenderTarget.texture, this.copyMaterial.blending = 0, this._renderPass(e, this.copyMaterial, this.renderToScreen ? null : r);
				break;
			case t.OUTPUT.Default:
				this.copyMaterial.uniforms.tDiffuse.value = this.blurRenderTarget.texture, this.copyMaterial.blending = 5, this._renderPass(e, this.copyMaterial, this.renderToScreen ? null : r);
				break;
			default: console.warn("THREE.SSAOPass: Unknown output type.");
		}
	}
	setSize(e, t) {
		this.width = e, this.height = t, this.ssaoRenderTarget.setSize(e, t), this.normalRenderTarget.setSize(e, t), this.blurRenderTarget.setSize(e, t), this.ssaoMaterial.uniforms.resolution.value.set(e, t), this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix), this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse), this.blurMaterial.uniforms.resolution.value.set(e, t);
	}
	_renderPass(e, t, n, r, i) {
		e.getClearColor(this._originalClearColor);
		let a = e.getClearAlpha(), o = e.autoClear;
		e.setRenderTarget(n), e.autoClear = !1, r != null && (e.setClearColor(r), e.setClearAlpha(i || 0), e.clear()), this._fsQuad.material = t, this._fsQuad.render(e), e.autoClear = o, e.setClearColor(this._originalClearColor), e.setClearAlpha(a);
	}
	_renderOverride(e, t, n, r, i) {
		e.getClearColor(this._originalClearColor);
		let a = e.getClearAlpha(), o = e.autoClear;
		e.setRenderTarget(n), e.autoClear = !1, r = t.clearColor || r, i = t.clearAlpha || i, r != null && (e.setClearColor(r), e.setClearAlpha(i || 0), e.clear()), this.scene.overrideMaterial = t, e.render(this.scene, this.camera), this.scene.overrideMaterial = null, e.autoClear = o, e.setClearColor(this._originalClearColor), e.setClearAlpha(a);
	}
	_generateSampleKernel(e) {
		let t = this.kernel;
		for (let n = 0; n < e; n++) {
			let r = new W();
			r.x = Math.random() * 2 - 1, r.y = Math.random() * 2 - 1, r.z = Math.random(), r.normalize();
			let i = n / e;
			i = _e.lerp(.1, 1, i * i), r.multiplyScalar(i), t.push(r);
		}
	}
	_generateRandomKernelRotations() {
		let t = new Nd(), n = /* @__PURE__ */ new Float32Array(16);
		for (let e = 0; e < 16; e++) {
			let r = Math.random() * 2 - 1, i = Math.random() * 2 - 1;
			n[e] = t.noise3d(r, i, 0);
		}
		this.noiseTexture = new jr(n, 4, 4, _, d), this.noiseTexture.wrapS = e, this.noiseTexture.wrapT = e, this.noiseTexture.needsUpdate = !0;
	}
	_overrideVisibility() {
		let e = this.scene, t = this._visibilityCache;
		e.traverse(function(e) {
			(e.isPoints || e.isLine || e.isLine2) && e.visible && (e.visible = !1, t.push(e));
		});
	}
	_restoreVisibility() {
		let e = this._visibilityCache;
		for (let t = 0; t < e.length; t++) e[t].visible = !0;
		e.length = 0;
	}
};
Ld.OUTPUT = {
	Default: 0,
	SSAO: 1,
	Blur: 2,
	Depth: 3,
	Normal: 4
};
//#endregion
//#region node_modules/three/examples/jsm/shaders/OutputShader.js
var Rd = {
	name: "OutputShader",
	uniforms: {
		tDiffuse: { value: null },
		toneMappingExposure: { value: 1 }
	},
	vertexShader: "\n		precision highp float;\n\n		uniform mat4 modelViewMatrix;\n		uniform mat4 projectionMatrix;\n\n		attribute vec3 position;\n		attribute vec2 uv;\n\n		varying vec2 vUv;\n\n		void main() {\n\n			vUv = uv;\n			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n		}",
	fragmentShader: "\n\n		precision highp float;\n\n		uniform sampler2D tDiffuse;\n\n		#include <tonemapping_pars_fragment>\n		#include <colorspace_pars_fragment>\n\n		varying vec2 vUv;\n\n		void main() {\n\n			gl_FragColor = texture2D( tDiffuse, vUv );\n\n			// tone mapping\n\n			#ifdef LINEAR_TONE_MAPPING\n\n				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );\n\n			#elif defined( REINHARD_TONE_MAPPING )\n\n				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );\n\n			#elif defined( CINEON_TONE_MAPPING )\n\n				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );\n\n			#elif defined( ACES_FILMIC_TONE_MAPPING )\n\n				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );\n\n			#elif defined( AGX_TONE_MAPPING )\n\n				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );\n\n			#elif defined( NEUTRAL_TONE_MAPPING )\n\n				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );\n\n			#elif defined( CUSTOM_TONE_MAPPING )\n\n				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );\n\n			#endif\n\n			// color space\n\n			#ifdef SRGB_TRANSFER\n\n				gl_FragColor = sRGBTransferOETF( gl_FragColor );\n\n			#endif\n\n		}"
}, zd = class extends wd {
	constructor() {
		super(), this.uniforms = Qn.clone(Rd.uniforms), this.material = new Ga({
			name: Rd.name,
			uniforms: this.uniforms,
			vertexShader: Rd.vertexShader,
			fragmentShader: Rd.fragmentShader
		}), this._fsQuad = new Dd(this.material), this._outputColorSpace = null, this._toneMapping = null;
	}
	render(e, t, n) {
		this.uniforms.tDiffuse.value = n.texture, this.uniforms.toneMappingExposure.value = e.toneMappingExposure, (this._outputColorSpace !== e.outputColorSpace || this._toneMapping !== e.toneMapping) && (this._outputColorSpace = e.outputColorSpace, this._toneMapping = e.toneMapping, this.material.defines = {}, K.getTransfer(this._outputColorSpace) === "srgb" && (this.material.defines.SRGB_TRANSFER = ""), this._toneMapping === 1 ? this.material.defines.LINEAR_TONE_MAPPING = "" : this._toneMapping === 2 ? this.material.defines.REINHARD_TONE_MAPPING = "" : this._toneMapping === 3 ? this.material.defines.CINEON_TONE_MAPPING = "" : this._toneMapping === 4 ? this.material.defines.ACES_FILMIC_TONE_MAPPING = "" : this._toneMapping === 6 ? this.material.defines.AGX_TONE_MAPPING = "" : this._toneMapping === 7 ? this.material.defines.NEUTRAL_TONE_MAPPING = "" : this._toneMapping === 5 && (this.material.defines.CUSTOM_TONE_MAPPING = ""), this.material.needsUpdate = !0), this.renderToScreen === !0 ? (e.setRenderTarget(null), this._fsQuad.render(e)) : (e.setRenderTarget(t), this.clear && e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil), this._fsQuad.render(e));
	}
	dispose() {
		this.material.dispose(), this._fsQuad.dispose();
	}
}, Bd = class e extends Wn {
	constructor(t, n = {}) {
		super(t), this.isReflector = !0, this.type = "Reflector", this.forceUpdate = !1, this.camera = new or();
		let r = this, i = n.color === void 0 ? new Y(8355711) : new Y(n.color), a = n.textureWidth || 512, o = n.textureHeight || 512, s = n.clipBias || 0, c = n.shader || e.ReflectorShader, l = n.multisample === void 0 ? 4 : n.multisample, u = new qr(), d = new W(), p = new W(), m = new W(), h = new J(), g = new W(0, 0, -1), _ = new ze(), v = new W(), y = new W(), b = new ze(), x = new J(), S = this.camera, C = new Ve(a, o, {
			samples: l,
			type: f
		}), w = new tr({
			name: c.name === void 0 ? "unspecified" : c.name,
			uniforms: Qn.clone(c.uniforms),
			fragmentShader: c.fragmentShader,
			vertexShader: c.vertexShader
		});
		w.uniforms.tDiffuse.value = C.texture, w.uniforms.color.value = i, w.uniforms.textureMatrix.value = x, this.material = w, this.onBeforeRender = function(e, t, n) {
			if (p.setFromMatrixPosition(r.matrixWorld), m.setFromMatrixPosition(n.matrixWorld), h.extractRotation(r.matrixWorld), d.set(0, 0, 1), d.applyMatrix4(h), v.subVectors(p, m), v.dot(d) > 0 && this.forceUpdate === !1) return;
			v.reflect(d).negate(), v.add(p), h.extractRotation(n.matrixWorld), g.set(0, 0, -1), g.applyMatrix4(h), g.add(m), y.subVectors(p, g), y.reflect(d).negate(), y.add(p), S.position.copy(v), S.up.set(0, 1, 0), S.up.applyMatrix4(h), S.up.reflect(d), S.lookAt(y), S.far = n.far, S.updateMatrixWorld(), S.projectionMatrix.copy(n.projectionMatrix), x.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1), x.multiply(S.projectionMatrix), x.multiply(S.matrixWorldInverse), x.multiply(r.matrixWorld), u.setFromNormalAndCoplanarPoint(d, p), u.applyMatrix4(S.matrixWorldInverse), _.set(u.normal.x, u.normal.y, u.normal.z, u.constant);
			let i = S.projectionMatrix;
			b.x = (Math.sign(_.x) + i.elements[8]) / i.elements[0], b.y = (Math.sign(_.y) + i.elements[9]) / i.elements[5], b.z = -1, b.w = (1 + i.elements[10]) / i.elements[14], _.multiplyScalar(2 / _.dot(b)), i.elements[2] = _.x, i.elements[6] = _.y, i.elements[10] = _.z + 1 - s, i.elements[14] = _.w, r.visible = !1;
			let a = e.getRenderTarget(), o = e.xr.enabled, c = e.shadowMap.autoUpdate;
			e.xr.enabled = !1, e.shadowMap.autoUpdate = !1, e.setRenderTarget(C), e.state.buffers.depth.setMask(!0), e.autoClear === !1 && e.clear(), e.render(t, S), e.xr.enabled = o, e.shadowMap.autoUpdate = c, e.setRenderTarget(a);
			let l = n.viewport;
			l !== void 0 && e.state.viewport(l), r.visible = !0, this.forceUpdate = !1;
		}, this.getRenderTarget = function() {
			return C;
		}, this.dispose = function() {
			C.dispose(), r.material.dispose();
		};
	}
};
Bd.ReflectorShader = {
	name: "ReflectorShader",
	uniforms: {
		color: { value: null },
		tDiffuse: { value: null },
		textureMatrix: { value: null }
	},
	vertexShader: "\n		uniform mat4 textureMatrix;\n		varying vec4 vUv;\n\n		#include <common>\n		#include <logdepthbuf_pars_vertex>\n\n		void main() {\n\n			vUv = textureMatrix * vec4( position, 1.0 );\n\n			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\n			#include <logdepthbuf_vertex>\n\n		}",
	fragmentShader: "\n		uniform vec3 color;\n		uniform sampler2D tDiffuse;\n		varying vec4 vUv;\n\n		#include <logdepthbuf_pars_fragment>\n\n		float blendOverlay( float base, float blend ) {\n\n			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );\n\n		}\n\n		vec3 blendOverlay( vec3 base, vec3 blend ) {\n\n			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );\n\n		}\n\n		void main() {\n\n			#include <logdepthbuf_fragment>\n\n			vec4 base = texture2DProj( tDiffuse, vUv );\n			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );\n\n			#include <tonemapping_fragment>\n			#include <colorspace_fragment>\n\n		}"
}, [
	"1111111111111111",
	"1000000000000001",
	"1000000000000001",
	"1000220000110001",
	"1000220000110001",
	"1000000000000001",
	"1000000000000001",
	"1000000330000001",
	"1000000330000001",
	"1000000000000001",
	"1001100000220001",
	"1001100000220001",
	"1000000000000001",
	"1000000000000001",
	"1000000000000001",
	"1111111111111111"
].map((e) => [...e].map(Number));
function Vd(e, t) {
	let n = Array.from({ length: e }, (t, n) => Array.from({ length: e }, (t, r) => +(r === 0 || n === 0 || r === e - 1 || n === e - 1))), r = (e, t, r, i, a = 1) => {
		for (let o = t; o < t + i; o++) for (let t = e; t < e + r; t++) n[o][t] = a;
	};
	t(r, (e, t, n, i, a) => {
		r(e, t, n, 1, a), r(e, t + i - 1, n, 1, a), r(e, t, 1, i, a), r(e + n - 1, t, 1, i, a);
	}, n);
	for (let t = e / 2 - 1; t <= e / 2; t++) for (let r = e / 2 - 1; r <= e / 2; r++) n[t][r] = 0;
	return n;
}
var Hd = {
	sky: "#f4cd87",
	floor: "#73564a",
	sun: "#ffe7a1",
	walls: {
		1: [
			"#d89045",
			"#ad6936",
			"#f7bf69"
		],
		2: [
			"#318e91",
			"#246269",
			"#65b7ae"
		],
		3: [
			"#d3a43d",
			"#9f7231",
			"#f4d46b"
		],
		4: [
			"#cf6a62",
			"#894649",
			"#ffa58a"
		],
		5: [
			"#5e7393",
			"#384b66",
			"#a4c6e5"
		],
		6: [
			"#d9e1df",
			"#98a7ad",
			"#f5faf6"
		]
	}
};
Vd(16, (e, t, n) => {
	t(3, 4, 4, 8, 2), t(9, 4, 4, 8, 4);
	for (let e of [
		3,
		6,
		9,
		12
	]) for (let t of [6, 9]) n[t][e] = 0;
	e(7, 4, 2, 1, 3), e(7, 11, 2, 1, 3);
}), { ...Hd }, Vd(24, (e, t, n) => {
	t(3, 3, 12, 9, 5);
	for (let e of [
		5,
		9,
		12
	]) n[11][e] = 0;
	for (let e of [5, 8]) n[e][14] = 0;
	e(7, 4, 1, 3, 2), e(10, 7, 3, 1, 2), t(18, 4, 4, 14, 6);
	for (let e of [
		7,
		12,
		15
	]) n[e][18] = 0;
	n[17][19] = 0, e(5, 16, 2, 3, 3), e(9, 17, 3, 1, 2), e(15, 19, 2, 2, 3);
}), { ...Hd }, { ...Hd.walls }, Vd(12, (e) => {
	e(3, 3, 2, 2, 2), e(7, 3, 2, 2, 4), e(3, 7, 2, 2, 4), e(7, 7, 2, 2, 2);
}), { ...Hd }, Vd(20, (e, t, n) => {
	t(3, 3, 5, 5, 1), t(12, 3, 5, 5, 5);
	for (let e of [
		3,
		7,
		12,
		16
	]) n[5][e] = 0;
	for (let e of [5, 14]) n[7][e] = 0;
	e(9, 7, 2, 1, 3), e(9, 12, 2, 1, 3), e(3, 12, 2, 3, 1), e(16, 12, 1, 4, 2), e(6, 16, 3, 1, 1);
}), { ...Hd };
var Ud = {
	carbine: {
		id: "carbine",
		name: "VX–7 Carbine",
		kind: "rifle",
		damage: 40,
		mag: 24,
		cooldown: .14,
		range: 32,
		color: "#edb14f",
		super: "Overdrive",
		description: "Accurate automatic fire. Super: five-shot overdrive burst."
	},
	scatter: {
		id: "scatter",
		name: "Sunburst",
		kind: "shotgun",
		damage: 14,
		pellets: 5,
		spread: .32,
		mag: 6,
		cooldown: .65,
		range: 6,
		color: "#ef865c",
		super: "Shockwave",
		description: "Wide pellet spread; lethal nearby. Super: heavy blast, knockback and cover break."
	},
	twin: {
		id: "twin",
		name: "Twinwire",
		kind: "burst",
		damage: 15,
		mag: 18,
		cooldown: .52,
		range: 20,
		color: "#79c8eb",
		super: "Crossfire",
		description: "Three accurate shots per trigger. Super: nine-shot sweeping burst."
	},
	breach: {
		id: "breach",
		name: "Gatebreaker",
		kind: "shotgun",
		damage: 15,
		pellets: 7,
		spread: .26,
		mag: 4,
		cooldown: .85,
		range: 3.6,
		color: "#e45845",
		super: "Breach Run",
		description: "Heavy close-range scattergun. Super: rush through cover and shove rivals."
	},
	shard: {
		id: "shard",
		name: "Shardpod",
		kind: "shard",
		damage: 36,
		mag: 6,
		cooldown: .7,
		range: 8,
		color: "#85c877",
		super: "Bramble Field",
		description: "A thrown pod bursts into radial shards. Super: a damaging, slowing field."
	},
	veil: {
		id: "veil",
		name: "Mirage",
		kind: "blades",
		damage: 18,
		pellets: 4,
		spread: .18,
		mag: 12,
		cooldown: .6,
		range: 8,
		color: "#b296e5",
		super: "Ghost Step",
		description: "Four spinning blades with close-range falloff. Super: cloak until you attack or approach a rival."
	},
	venom: {
		id: "venom",
		name: "Viperfan",
		kind: "poison",
		damage: 14,
		pellets: 3,
		spread: .24,
		mag: 9,
		cooldown: .65,
		range: 10,
		color: "#a7d967",
		super: "Venom Vault",
		description: "Three toxic darts suppress healing. Super: leap with poison fans on departure and arrival."
	},
	brawler: {
		id: "brawler",
		name: "Pulse Knuckles",
		kind: "melee",
		damage: 48,
		mag: 8,
		cooldown: .32,
		range: 1.4,
		color: "#e5799f",
		super: "Impact Leap",
		description: "Fast punches return some health on hit. Super: leap strike with a speed boost."
	},
	reaper: {
		id: "reaper",
		name: "Rift Scythe",
		kind: "dash",
		damage: 50,
		mag: 6,
		cooldown: .45,
		range: 1.5,
		color: "#c6a1e2",
		super: "Echo Rush",
		description: "Dash-and-slash attacks. Super: rush with healing spectral projectiles."
	},
	rocket: {
		id: "rocket",
		name: "Flare Launcher",
		kind: "rocket",
		damage: 58,
		mag: 4,
		cooldown: .9,
		range: 18,
		color: "#f19a48",
		super: "Skyfall",
		description: "Impact rockets splash around cover. Super: a marked five-rocket barrage."
	},
	demo: {
		id: "demo",
		name: "Fusecaster",
		kind: "lob",
		damage: 26,
		mag: 4,
		cooldown: 1,
		range: 7,
		color: "#f1d068",
		super: "Big Bang",
		description: "Twin fuses arc over walls. Super: a heavy cover-breaking barrel with knockback."
	}
}, Wd = (e) => Object.hasOwn(Ud, e) ? Ud[e] : Ud.carbine, Gd = {
	ranger: {
		id: "ranger",
		name: "Field Ranger",
		primary: "#65754c",
		accent: "#a3936e",
		gear: "cap",
		pattern: "woodland",
		palette: [
			"#536b45",
			"#8d9569",
			"#303f2d",
			"#a6a578"
		],
		armor: "#8f7654",
		head: "helmet",
		description: "Woodland camouflage, tan MOLLE carrier, combat helmet and field mask."
	},
	desert: {
		id: "desert",
		name: "Rift Nomad",
		primary: "#302638",
		accent: "#a267d2",
		gear: "scarf",
		pattern: "fracture",
		palette: [
			"#302638",
			"#43334d",
			"#654353",
			"#251f2c"
		],
		armor: "#292c31",
		head: "visor",
		description: "Purple fractured armour, dark tactical carrier and illuminated violet seams."
	},
	urban: {
		id: "urban",
		name: "Urban Patrol",
		primary: "#929789",
		accent: "#e4e5db",
		gear: "goggles",
		pattern: "digital",
		palette: [
			"#d0d0bd",
			"#788079",
			"#303a38",
			"#aaaa94"
		],
		armor: "#343d3a",
		head: "helmet",
		description: "Urban digital camouflage, skull-marked plate carrier and armoured knee pads."
	},
	medic: {
		id: "medic",
		name: "Rescue Medic",
		primary: "#d9ddd3",
		accent: "#c84d48",
		gear: "medic",
		pattern: "digital",
		palette: [
			"#e1e5dc",
			"#bcc9c2",
			"#87988e",
			"#f4f3e8"
		],
		armor: "#b7ac94",
		head: "helmet",
		description: "White rescue camouflage, red medical patches, goggles and trauma pack."
	},
	recon: {
		id: "recon",
		name: "Night Recon",
		primary: "#20393b",
		accent: "#43c9bc",
		gear: "hood",
		pattern: "circuit",
		palette: [
			"#18292b",
			"#283d3e",
			"#203638",
			"#314545"
		],
		armor: "#a34840",
		head: "hood",
		description: "Teal circuit suit, red armour plates, spiked shoulder guard and enclosed hood."
	},
	engineer: {
		id: "engineer",
		name: "Field Engineer",
		primary: "#b96627",
		accent: "#f69a32",
		gear: "tools",
		pattern: "digital",
		palette: [
			"#bd672b",
			"#e6a04c",
			"#3d3a32",
			"#202728"
		],
		armor: "#de802d",
		head: "respirator",
		description: "Orange and charcoal camouflage, reinforced orange plates and tactical respirator."
	},
	alpine: {
		id: "alpine",
		name: "Alpine Scout",
		primary: "#d5dcdf",
		accent: "#f1f3ee",
		gear: "fur",
		pattern: "digital",
		palette: [
			"#f0f2ec",
			"#ccd5d7",
			"#929da2",
			"#64747b"
		],
		armor: "#b2ad9b",
		head: "helmet",
		description: "Snow digital camouflage, white helmet, insulated mask and reinforced pads."
	},
	sentinel: {
		id: "sentinel",
		name: "Blue Sentinel",
		primary: "#386579",
		accent: "#54a8c3",
		gear: "armor",
		pattern: "digital",
		palette: [
			"#2c5364",
			"#467e95",
			"#8eafbb",
			"#233b4a"
		],
		armor: "#8b806d",
		head: "respirator",
		description: "Blue digital camouflage, enclosed respirator, shoulder armour and tan chest rig."
	},
	shadow: {
		id: "shadow",
		name: "Shadow Runner",
		primary: "#24282a",
		accent: "#ca4a40",
		gear: "cape",
		pattern: "solid",
		palette: [
			"#252a2c",
			"#363b3d",
			"#222628",
			"#404647"
		],
		armor: "#a38b62",
		head: "hood",
		description: "Black suit with red panels, angular masked hood and tan modular carrier."
	},
	hazard: {
		id: "hazard",
		name: "Hazard Response",
		primary: "#bca441",
		accent: "#e1bf3c",
		gear: "respirator",
		pattern: "digital",
		palette: [
			"#c7ad4b",
			"#7d703c",
			"#35352c",
			"#e2c268"
		],
		armor: "#807447",
		head: "respirator",
		description: "Yellow and charcoal digital camouflage, sealed respirator and reinforced armour."
	}
}, Kd = (e) => Object.hasOwn(Gd, e) ? Gd[e] : Gd.ranger, qd = /* @__PURE__ */ new Map();
function Jd(e, t = 512) {
	let n = `${e.id}:${t}`;
	if (qd.has(n)) return qd.get(n);
	let r = document.createElement("canvas");
	r.width = r.height = t;
	let i = r.getContext("2d"), a = e.palette || [e.primary, e.accent], o = [...e.id].reduce((e, t) => Math.imul(e, 31) + t.charCodeAt(0), 19) >>> 0, s = () => (o = Math.imul(o, 1664525) + 1013904223 >>> 0) / 4294967296;
	if (i.fillStyle = a[0], i.fillRect(0, 0, t, t), e.pattern === "digital" || e.pattern === "woodland") {
		let n = t / (e.pattern === "digital" ? 64 : 40);
		for (let r = 0; r < 750; r++) {
			let r = Math.floor(s() * t / n) * n, o = Math.floor(s() * t / n) * n;
			i.fillStyle = a[1 + Math.floor(s() * (a.length - 1))];
			for (let t = 0; t < 3 + s() * 6; t++) e.pattern === "woodland" ? (i.beginPath(), i.ellipse(r, o, n * (1 + s() * 2), n * (1 + s()), s() * 3, 0, Math.PI * 2), i.fill()) : i.fillRect(r, o, n * (1 + Math.floor(s() * 3)), n * (1 + Math.floor(s() * 2))), r += (s() - .5) * n * 4, o += (s() - .5) * n * 3;
		}
	} else if (e.pattern === "circuit" || e.pattern === "fracture") {
		i.strokeStyle = e.accent, i.lineWidth = t / 350;
		for (let n = 0; n < 65; n++) {
			let n = s() * t, r = s() * t;
			i.globalAlpha = .4 + s() * .45, i.beginPath(), i.moveTo(n, r);
			for (let a = 0; a < 4; a++) n += (s() - .5) * t / 5, r += t / 20 + s() * t / 12, e.pattern === "circuit" && i.lineTo(n, r - t / 30), i.lineTo(n, r);
			i.stroke();
		}
	}
	i.globalAlpha = .1, i.fillStyle = "#ffffff";
	for (let e = 0; e < t; e += 4) i.fillRect(0, e, t, 1);
	i.globalAlpha = .12, i.fillStyle = "#101817";
	for (let e = 0; e < t; e += 4) i.fillRect(e, 0, 1, t);
	for (let e = 0; e < 1200; e++) i.globalAlpha = s() * .14, i.fillRect(s() * t, s() * t, 1 + s() * 3, 1);
	return i.globalAlpha = 1, qd.set(n, r), r;
}
//#endregion
//#region scripts/outpost-military/compatibility.js
function Yd(e) {
	return /iPad|iPhone|iPod/.test(e.userAgent || "") || /Mac/.test(e.platform || "") && e.maxTouchPoints > 1;
}
function Xd({ appleTouch: e = !1, safeMode: t = !1, halfFloat: n = !0, maxTextureSize: r = 4096 } = {}) {
	return {
		safeMode: t,
		halfFloat: n,
		maxTextureSize: r,
		maxPixels: t ? 6e5 : e ? 1e6 : 24e5,
		maxShadowSize: Math.min(r, t ? 512 : e ? 1024 : 4096),
		ambientOcclusion: !t && !e && n,
		reflections: !t
	};
}
function Zd(e, t, n) {
	let r = Math.min(1, Math.sqrt(n.maxPixels / (e * t)), n.maxTextureSize / Math.max(e, t));
	return [Math.max(1, Math.floor(e * r)), Math.max(1, Math.floor(t * r))];
}
//#endregion
//#region scripts/outpost-military/renderer.js
var $ = 3, Qd = "/games/military/", $d = Math.PI * 2, ef = {
	outpost: {
		floor: "#a69980",
		fog: "#bbc2c3",
		metal: "#788178"
	},
	testblock: {
		floor: "#8e958c",
		fog: "#b8c1c5",
		metal: "#75806e"
	},
	skyport: {
		floor: "#bbc0bf",
		fog: "#bccbd0",
		metal: "#8e999b"
	},
	freight: {
		floor: "#747d7d",
		fog: "#a5b3bd",
		metal: "#647269"
	},
	estate: {
		floor: "#c6bca5",
		fog: "#c4c1ba",
		metal: "#81867b"
	}
}, tf = class {
	constructor(e, t = () => {}, { safeMode: n = !1 } = {}) {
		this.g = e, this.onProgress = t, this.disposed = !1, this.actors = /* @__PURE__ */ new Map(), this.crates = /* @__PURE__ */ new Map(), this.cores = /* @__PURE__ */ new Map(), this.projectiles = /* @__PURE__ */ new Map(), this.fields = /* @__PURE__ */ new Map(), this.materials = /* @__PURE__ */ new Set(), this.geometries = /* @__PURE__ */ new Map(), this.textures = /* @__PURE__ */ new Set(), this.worldTextures = /* @__PURE__ */ new Set(), this.lastTime = 0, this.lastPose = -1, this.mapKey = "", this.wallKeys = "", this.seenShots = /* @__PURE__ */ new Map(), this.tracers = [], this.lastPreset = "", this.assetErrors = [], this.motion = matchMedia("(prefers-reduced-motion: reduce)");
		let r = Yd(navigator), i, a;
		for (let e of [{
			antialias: !r && !n,
			powerPreference: "default"
		}, {
			antialias: !1,
			powerPreference: "low-power"
		}]) if (i = document.createElement("canvas"), a = i.getContext("webgl2", {
			...e,
			alpha: !1
		}), a) break;
		if (!a) throw Error("This browser could not start WebGL 2 graphics.");
		this.renderer = new mu({
			canvas: i,
			context: a
		}), this.profile = Xd({
			appleTouch: r,
			safeMode: n,
			halfFloat: this.renderer.extensions.has("EXT_color_buffer_float") || this.renderer.extensions.has("EXT_color_buffer_half_float"),
			maxTextureSize: this.renderer.capabilities.maxTextureSize
		}), this.renderer.setPixelRatio(1), this.renderer.outputColorSpace = T, this.renderer.toneMapping = 4, this.renderer.toneMappingExposure = .95, this.renderer.info.autoReset = !1, this.renderer.shadowMap.enabled = !0, this.renderer.shadowMap.type = 2, this.contextLost = (t) => {
			t.preventDefault(), !this.disposed && (this.contextFailed = !0, e.recoverMilitary(/* @__PURE__ */ Error("The graphics context was lost.")));
		}, this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost), this.renderer.domElement.className = "mf-webgl", this.renderer.domElement.setAttribute("aria-hidden", "true"), this.renderer.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:0;width:100%;height:100%;", e.shell.insertBefore(this.renderer.domElement, e.canvas), e.canvas.style.cssText = "position:relative;z-index:1;background:transparent", this.scene = new gr(), this.scene.background = new Y("#b8c6d0"), this.scene.fog = new hr("#b8c6d0", .018), this.world = new fr(), this.scene.add(this.world), this.dynamic = new fr(), this.scene.add(this.dynamic), this.camera = new or(60, 1, .06, 260), this.camera.rotation.order = "YXZ", this.hemisphere = new ko("#adbcd0", "#372b20", .55), this.scene.add(this.hemisphere), this.sun = new Uo("#ffddb0", 4.2), this.sun.position.set(-25, 38, -22), this.sun.castShadow = !0, this.sun.shadow.mapSize.set(1024, 1024), Object.assign(this.sun.shadow.camera, {
			left: -35,
			right: 35,
			top: 35,
			bottom: -35,
			near: 1,
			far: 140
		}), this.sun.shadow.bias = -3e-4, this.sun.shadow.normalBias = .03, this.scene.add(this.sun, this.sun.target), this.rim = new Uo("#94b9e7", 1.15), this.rim.position.set(25, 15, 35), this.scene.add(this.rim), this.weaponScene = new gr(), this.weaponCamera = new or(52, 1, .01, 10), this.weaponScene.add(new ko("#e5ecf1", "#786852", 2));
		let o = new Uo("#fff0d7", 4);
		if (o.position.set(-2, 3, -4), this.weaponScene.add(o), this.rig = new fr(), this.weaponScene.add(this.rig), this.flash = new Bo("#ffdcb0", 0, 4), this.flash.position.set(.22, -.08, -.95), this.weaponScene.add(this.flash), this.boxGeometry = this.geo("rounded", () => new Sd(1, 1, 1, 3, .025)), this.wallGeometry = this.geo("wall", () => new Sd(1, 1, 1, 2, .008)), !n) {
			let e = new Ve(1, 1, { type: this.profile.halfFloat ? f : l });
			this.composer = new jd(this.renderer, e), this.composer.addPass(new Md(this.scene, this.camera)), this.profile.ambientOcclusion && (this.ao = new Ld(this.scene, this.camera, 512, 512, 12), this.ao.kernelRadius = .7, this.ao.minDistance = .001, this.ao.maxDistance = .07, this.composer.addPass(this.ao));
			let t = new Md(this.weaponScene, this.weaponCamera);
			t.clear = !1, t.clearDepth = !0, this.composer.addPass(t), this.grade = new Od({
				uniforms: { tDiffuse: { value: null } },
				vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
				fragmentShader: "uniform sampler2D tDiffuse; varying vec2 vUv;\n        void main(){ vec4 c=texture2D(tDiffuse,vUv);\n          // Subtle warm highlights, cool shadows, and lens falloff; no animated grain.\n          float l=dot(c.rgb,vec3(.2126,.7152,.0722));\n          c.rgb=mix(vec3(l),c.rgb,1.04);\n          c.rgb*=mix(vec3(.90,.97,1.06),vec3(1.045,1.015,.97),smoothstep(.15,1.1,l));\n          vec2 d=(vUv-.5)*vec2(1.,.75);\n          c.rgb*=1.-.32*dot(d,d); gl_FragColor=c; }"
			}), this.composer.addPass(this.grade), this.composer.addPass(new zd());
		}
		this.ready = this.loadAssets().then(() => {
			this.disposed || (this.mapKey = "", this.updateWeapon());
		}), this.configure(), this.resize();
	}
	geo(e, t) {
		return this.geometries.has(e) || this.geometries.set(e, t()), this.geometries.get(e);
	}
	material(e) {
		let t = new Ka(e);
		return this.materials.add(t), t;
	}
	mesh(e, t, n, r = [
		0,
		0,
		0
	], i = [
		1,
		1,
		1
	]) {
		let a = new Wn(t, n);
		return a.position.set(...r), a.scale.set(...i), a.castShadow = !0, a.receiveShadow = !0, e.add(a), a;
	}
	box(e, t, n, r) {
		return this.mesh(e, this.boxGeometry, t, n, r);
	}
	cylinder(e, t, n, r, i, a = "z", o = 24) {
		let s = this.geo("cylinder:" + o, () => new Ci(1, 1, 1, o)), c = this.mesh(e, s, t, n, [
			r,
			i,
			r
		]);
		return a === "z" && (c.rotation.x = Math.PI / 2), a === "x" && (c.rotation.z = Math.PI / 2), c;
	}
	async loadAssets() {
		let t = 0, n = () => this.onProgress(++t, 14), r = new Do(), i = async (t) => {
			try {
				let n = await r.loadAsync(Qd + t);
				return this.disposed ? (n.dispose(), null) : (n.wrapS = n.wrapT = e, n.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()), this.textures.add(n), n);
			} catch {
				return this.assetErrors.push(t), null;
			} finally {
				n();
			}
		}, a = await Promise.all([
			"asphalt-color.jpg",
			"asphalt-normal.jpg",
			"asphalt-roughness.jpg",
			"metal-color.jpg",
			"metal-normal.jpg",
			"metal-roughness.jpg",
			"gun-color.jpg",
			"gun-normal.jpg",
			"gun-roughness.jpg",
			"glove-color.jpg",
			"glove-normal.jpg",
			"glove-roughness.jpg"
		].map((e) => i("textures/" + e)));
		[this.groundColor, this.groundNormal, this.groundRough, this.metalColor, this.metalNormal, this.metalRough, this.gunColor, this.gunNormal, this.gunRough, this.gloveColor, this.gloveNormal, this.gloveRough] = a, this.gunColor && (this.gunColor.colorSpace = T), this.gloveColor && (this.gloveColor.colorSpace = T), this.groundColor && (this.groundColor.colorSpace = T), this.metalColor && (this.metalColor.colorSpace = T), await Promise.all([(async () => {
			try {
				let e = await new vu().loadAsync(Qd + "models/soldier.glb");
				if (this.disposed) {
					this.disposeObject(e.scene);
					return;
				}
				this.soldier = e, this.soldier.scene.traverse((e) => {
					e.isMesh && (e.castShadow = !0, e.receiveShadow = !0, e.material && (e.material.roughness = .8, e.material.metalness = .1, this.materials.add(e.material)));
				});
			} catch {
				this.assetErrors.push("soldier");
			} finally {
				n();
			}
		})(), (async () => {
			try {
				if (!this.profile.halfFloat) return;
				let e = await new _d().loadAsync(Qd + "sky.hdr");
				if (this.disposed) {
					e.dispose();
					return;
				}
				e.mapping = 303, this.textures.add(e), this.scene.background = e, this.scene.environment = e, this.weaponScene.environment = e, this.scene.backgroundBlurriness = .015, this.scene.backgroundIntensity = .48, this.scene.environmentIntensity = .45;
			} catch {
				this.assetErrors.push("sky");
			} finally {
				n();
			}
		})()]);
	}
	configure() {
		let e = this.g.academy.preset, t = this.g.academy.options;
		if (this.lastPreset === e + t.shadows + t.lighting) return;
		this.lastPreset = e + t.shadows + t.lighting, this.renderer.shadowMap.enabled = t.shadows;
		let n = Math.min(this.profile.maxShadowSize, e === "high" ? 4096 : e === "performance" ? 1024 : 2048);
		this.sun.shadow.mapSize.x !== n && (this.sun.shadow.mapSize.set(n, n), this.sun.shadow.map?.dispose(), this.sun.shadow.map = null), this.sun.intensity = t.lighting ? 4.2 : 1.7, this.hemisphere.intensity = t.lighting ? .55 : 1.3, this.ao && (this.ao.enabled = e === "high" && t.shadows), this.grade && (this.grade.enabled = t.lighting), this.reflection && (this.reflection.visible = this.profile.reflections && e !== "performance", this.reflection.getRenderTarget().setSize(e === "high" ? 1024 : 512, e === "high" ? 1024 : 512));
	}
	resize() {
		if (this.disposed) return;
		let { w: e, h: t } = this.g, [n, r] = Zd(e, t, this.profile);
		this.renderer.setSize(n, r, !1), this.composer?.setSize(n, r), this.camera.aspect = e / t, this.camera.fov = _e.radToDeg(this.g.verticalFov), this.camera.updateProjectionMatrix(), this.weaponCamera.aspect = e / t, this.weaponCamera.fov = _e.radToDeg(2 * Math.atan(Math.tan(_e.degToRad(26)) / (e / t))), this.weaponCamera.updateProjectionMatrix();
	}
	tileTexture(e, t) {
		if (!e) return null;
		let n = e.clone();
		return n.repeat.set(t, t), n.needsUpdate = !0, this.textures.add(n), this.worldTextures.add(n), n;
	}
	clearWorld() {
		this.reflection?.dispose(), this.world.traverse((e) => {
			e.isInstancedMesh && e.dispose(), e.userData.ownedGeometry && e.geometry.dispose();
		});
		for (let e of this.materials) e.userData.world && (e.dispose(), this.materials.delete(e));
		for (let e of this.worldTextures) e.dispose(), this.textures.delete(e);
		this.worldTextures.clear(), this.world.clear(), this.wallMeshes = null, this.fittings = [], this.fittingMaterial = null, this.reflection = null;
	}
	buildWorld() {
		let e = this.g, t = e.arena.mapId, n = ef[t] || ef.outpost, r = e.level.length;
		this.clearWorld(), this.mapKey = t, this.wallKeys = "", this.scene.fog.color.set(n.fog), this.scene.fog.density = t === "freight" ? .021 : .012;
		let i = this.material({
			color: n.floor,
			map: this.tileTexture(this.groundColor, r / 3),
			normalMap: this.tileTexture(this.groundNormal, r / 3),
			roughnessMap: this.tileTexture(this.groundRough, r / 3),
			roughness: .65,
			normalScale: new H(1.2, 1.2)
		});
		i.userData.world = !0;
		let a = this.mesh(this.world, this.geo("floor", () => new Va(1, 1)), i, [
			r * $ / 2,
			0,
			r * $ / 2
		], [
			r * $,
			r * $,
			1
		]);
		a.rotation.x = -Math.PI / 2, a.castShadow = !1, this.wallMaterials = Array.from({ length: 7 }, (e, t) => {
			let r = [
				"#8e948a",
				n.metal,
				"#707f78",
				"#b0a489",
				"#84776b",
				"#909a9d",
				"#bcc2bd"
			], i = this.material({
				color: r[t],
				map: this.metalColor,
				normalMap: this.metalNormal,
				roughnessMap: this.metalRough,
				roughness: .74,
				metalness: .45,
				normalScale: new H(.8, .8)
			});
			return i.userData.world = !0, i;
		}), this.rebuildWalls();
		let o = this.material({
			color: "#555c58",
			metalness: .7,
			roughness: .65
		});
		o.userData.world = !0;
		for (let e = 0; e < 4; e++) for (let t = 0; t < r; t += 4) {
			let n = e === 0 ? 1 : e === 1 ? r - 1 : t + 1, i = e === 2 ? 1 : e === 3 ? r - 1 : t + 1, a = this.cylinder(this.world, o, [
				n * $,
				4.8,
				i * $
			], .055, 3.6, "y");
			a.castShadow = !1;
			let s = this.box(this.world, o, [
				n * $,
				6.55,
				i * $
			], [
				1,
				.08,
				.08
			]);
			s.castShadow = !1;
			for (let e of [-.3, .3]) this.box(this.world, o, [
				n * $ + e,
				6.55,
				i * $
			], [
				.25,
				.18,
				.2
			]);
		}
		this.addLandmarks(t, r, o), this.makePuddles(t, r);
		let s = {
			outpost: [[1.5, 4.5], [14.5, 10.5]],
			testblock: [[2.5, 7.5], [13.5, 7.5]],
			skyport: [[7.5, 20.5], [17.5, 19.5]],
			freight: [[1.5, 3.5], [10.5, 1.5]],
			estate: [[5.5, 4.5], [15.5, 16.5]]
		}[t] || [];
		for (let [e, t] of s) {
			let n = this.cylinder(this.world, o, [
				e * $,
				.5,
				t * $
			], .32, 1, "y", 32);
			for (let e of [.2, .8]) this.cylinder(n, o, [
				0,
				e - .5,
				0
			], 1.03, .055, "y", 32).scale.set(.34, .055, .34);
		}
		this.sun.target.position.set(r * $ / 2, 0, r * $ / 2), this.sun.position.set(r * $ / 2 - 36, 24, r * $ / 2 - 18), this.sun.target.updateMatrixWorld();
	}
	rebuildWalls() {
		let e = this.g, t = e.level.map((e) => e.join("")).join("");
		if (t === this.wallKeys) return;
		if (this.wallKeys = t, this.wallMeshes) for (let e of this.wallMeshes) this.world.remove(e), e.dispose();
		for (let e of this.fittings || []) this.world.remove(e), e.dispose();
		this.fittings = [], this.fittingMaterial && (this.fittingMaterial.dispose(), this.materials.delete(this.fittingMaterial)), this.wallMeshes = [];
		let n = new Ut();
		for (let t = 1; t <= 6; t++) {
			let r = [];
			for (let n = 0; n < e.level.length; n++) for (let i = 0; i < e.level[n].length; i++) e.level[n][i] === t && r.push([i, n]);
			if (!r.length) continue;
			let i = new Ur(this.wallGeometry, this.wallMaterials[t], r.length);
			i.castShadow = !0, i.receiveShadow = !0, r.forEach(([e, t], r) => {
				n.position.set((e + .5) * $, 1.5, (t + .5) * $), n.scale.set($, 3, $), n.rotation.set(0, 0, 0), n.updateMatrix(), i.setMatrixAt(r, n.matrix);
			}), i.instanceMatrix.needsUpdate = !0, this.world.add(i), this.wallMeshes.push(i);
		}
		this.wallFittings();
	}
	wallFittings() {
		let e = this.material({
			color: "#59615d",
			map: this.gunColor,
			normalMap: this.gunNormal,
			roughnessMap: this.gunRough,
			metalness: .8,
			roughness: .6
		});
		e.userData.world = !0, this.fittingMaterial = e;
		let t = [], n = [], r = this.g.level;
		for (let e = 0; e < r.length; e++) for (let i = 0; i < r[e].length; i++) if (r[e][i]) for (let [a, o] of [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0]
		]) {
			if (r[e + o]?.[i + a] !== 0) continue;
			let s = (i + .5) * $ + a * 1.518, c = (e + .5) * $ + o * 1.518;
			for (let e of [.1, 2.94]) t.push({
				p: [
					s,
					e,
					c
				],
				s: a ? [
					.035,
					.06,
					$
				] : [
					$,
					.06,
					.035
				]
			});
			for (let e of [-1.38, 1.38]) {
				t.push({
					p: [
						s + (o ? e : 0),
						1.5,
						c + (a ? e : 0)
					],
					s: a ? [
						.055,
						2.9,
						.045
					] : [
						.045,
						2.9,
						.055
					]
				});
				for (let t of [
					.3,
					1.5,
					2.7
				]) n.push({
					p: [
						s + (o ? e : 0) + a * .03,
						t,
						c + (a ? e : 0) + o * .03
					],
					s: [
						.06,
						.06,
						.06
					]
				});
			}
		}
		let i = new Ut();
		for (let r of [t, n]) {
			let t = new Ur(this.geo("fitting-box", () => new qn(1, 1, 1)), e, r.length);
			r.forEach(({ p: e, s: n }, r) => {
				i.position.set(...e), i.scale.set(...n), i.updateMatrix(), t.setMatrixAt(r, i.matrix);
			}), t.receiveShadow = !0, t.castShadow = !0, this.world.add(t), this.fittings.push(t);
		}
	}
	addLandmarks(e, t, n) {
		let r = document.createElement("canvas");
		r.width = 512, r.height = 256;
		let i = r.getContext("2d");
		i.fillStyle = "#c7c1ad", i.fillRect(0, 0, 512, 256), i.fillStyle = "#464c47", i.font = "bold 76px monospace", i.fillText(e === "skyport" ? "GATE 07" : e === "freight" ? "CARGO 09" : "SECTOR 04", 22, 114), i.font = "24px monospace", i.fillText("MIDNRY / FIELD OPERATIONS", 22, 170);
		let a = new yi(r);
		a.colorSpace = T, this.textures.add(a), this.worldTextures.add(a);
		let o = this.material({
			map: a,
			color: "#ffffff",
			roughness: .95
		});
		o.userData.world = !0;
		let s = [];
		for (let e = 1; e < t - 1; e++) for (let n = 1; n < t - 1; n++) this.g.level[e][n] && !this.g.level[e + 1]?.[n] && s.length < 18 && s.push([n, e]);
		for (let [e, t] of s) {
			let n = this.mesh(this.world, this.geo("sign", () => new Va(1.5, .75)), o, [
				(e + .5) * $,
				1.8,
				(t + 1) * $ + .012
			]);
			n.castShadow = !1;
		}
		if (e === "skyport") {
			let e = this.material({
				color: "#b8bebc",
				metalness: .5,
				roughness: .55
			});
			e.userData.world = !0;
			let t = new Ci(4.5, 4.5, 42, 48, 1, !0, -Math.PI / 2, Math.PI), n = this.mesh(this.world, t, e, [
				60,
				3,
				33
			]);
			n.rotation.x = Math.PI / 2, n.userData.ownedGeometry = !0, e.side = 2, this.box(this.world, e, [
				60,
				3.1,
				33
			], [
				14,
				.12,
				3
			]);
		}
		if (e === "estate") {
			let e = new fr();
			this.world.add(e), e.position.set(30, 0, 8.5 * $), e.rotation.y = .5, this.box(e, n, [
				0,
				1.4,
				0
			], [
				3,
				2.3,
				5
			]), this.box(e, n, [
				0,
				2.6,
				0
			], [
				11,
				.07,
				.32
			]), this.box(e, n, [
				0,
				1.4,
				4.6
			], [
				.45,
				.65,
				6
			]);
		}
	}
	makePuddles(e, t) {
		if (!this.profile.reflections) return;
		let n = {
			uniforms: Qn.clone(Bd.ReflectorShader.uniforms),
			vertexShader: Bd.ReflectorShader.vertexShader.replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 wetUv;").replace("vUv = textureMatrix", "wetUv = position.xy; vUv = textureMatrix"),
			fragmentShader: "uniform sampler2D tDiffuse; varying vec4 vUv; varying vec2 wetUv;\n        #include <logdepthbuf_pars_fragment>\n        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);\n          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}\n        void main(){\n          #include <logdepthbuf_fragment>\n          float n=noise(wetUv*.22)+.28*noise(wetUv*.72);\n          float mask=smoothstep(.49,.69,n);\n          if(mask<.015) discard;\n          vec2 uv=vUv.xy/vUv.w;\n          vec2 ripple=vec2(noise(wetUv*5.),noise(wetUv*5.+17.))-.5;\n          vec3 reflection=texture2D(tDiffuse,uv+ripple*.0015).rgb;\n          gl_FragColor=vec4(reflection*vec3(.75,.83,.88),mask*.65);\n          #include <tonemapping_fragment>\n          #include <colorspace_fragment>\n        }"
		}, r = this.g.academy.preset === "high" ? 1024 : 512, i = new Bd(new Va(t * $, t * $), {
			textureWidth: r,
			textureHeight: r,
			clipBias: .003,
			multisample: 0,
			shader: n
		});
		i.getRenderTarget().texture.type = this.profile.halfFloat ? f : l, i.rotation.x = -Math.PI / 2, i.position.set(t * $ / 2, .014, t * $ / 2), i.material.transparent = !0, i.material.depthWrite = !1, i.userData.ownedGeometry = !0, i.visible = this.g.academy.preset !== "performance", this.world.add(i), this.reflection = i;
		let a = i.onBeforeRender.bind(i);
		i.onBeforeRender = (...e) => {
			this.scene.overrideMaterial || a(...e);
		};
	}
	makeActor(e) {
		let t = new Set(this.materials), n = new fr();
		this.dynamic.add(n);
		let r, i = null, a = {};
		if (this.soldier) {
			r = vd(this.soldier.scene), i = new us(r);
			for (let e of this.soldier.animations) e.name !== "TPose" && (a[e.name] = i.clipAction(e));
			a.Idle?.play(), i.update(0), r.updateMatrixWorld(!0), r.traverse((e) => {
				e.isSkinnedMesh && (e.skeleton.update(), e.computeBoundingBox());
			});
			let t = new We().setFromObject(r), o = 2.25 / (t.max.y - t.min.y);
			r.scale.multiplyScalar(o), r.position.y -= t.min.y * o, r.traverse((t) => {
				if (t.isMesh) {
					t.material = t.material.clone();
					let n = Kd(e.outfit), r = this.skinTexture(n);
					t.material.color.set("#ffffff"), t.material.map ||= r, t.material.roughness = .88, t.geometry.computeBoundingBox();
					let i = t.geometry.boundingBox;
					t.material.onBeforeCompile = (e) => {
						e.uniforms.fabricPattern = { value: r }, e.uniforms.lowerPattern = { value: n.id === "urban" ? this.skinTexture({
							...n,
							id: "urban-pants",
							pattern: "woodland",
							palette: [
								"#536548",
								"#7f8b61",
								"#354333",
								"#aba77d"
							]
						}) : r }, e.uniforms.splitLegs = { value: n.id === "urban" }, e.uniforms.fabricHeight = { value: new H(i.min.y, Math.max(.001, i.max.y - i.min.y)) }, e.vertexShader = "varying float vFabricHeight; uniform vec2 fabricHeight;\n" + e.vertexShader, e.vertexShader = e.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFabricHeight=(position.y-fabricHeight.x)/fabricHeight.y;"), e.fragmentShader = "uniform sampler2D fabricPattern; uniform sampler2D lowerPattern; uniform bool splitLegs; varying float vFabricHeight;\n" + e.fragmentShader, e.fragmentShader = e.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n              float fabricLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));\n              vec3 pattern=texture2D(fabricPattern,vMapUv*2.0).rgb;\n              if(splitLegs && vFabricHeight<.46) pattern=texture2D(lowerPattern,vMapUv*2.0).rgb;\n              if(vFabricHeight<.105) pattern=vec3(.095,.115,.105);\n              diffuseColor.rgb=pattern*(.72+fabricLuma*.28);");
					}, t.material.customProgramCacheKey = () => "outpost-reference-fabric-v1", t.castShadow = !0, t.receiveShadow = !0, this.materials.add(t.material);
				}
			}), n.add(r);
		} else {
			r = new fr(), n.add(r);
			let e = this.material({
				color: "#616454",
				roughness: .92
			});
			this.mesh(r, this.geo("body", () => new Si(.3, .7, 8, 24)), e, [
				0,
				1.3,
				0
			]), this.mesh(r, this.geo("head", () => new Ua(.21, 24, 16)), e, [
				0,
				1.95,
				0
			]);
			for (let t of [-.18, .18]) this.mesh(r, this.geo("leg", () => new Si(.12, .6, 6, 20)), e, [
				t,
				.48,
				0
			]);
		}
		let o = this.material({
			color: e.team === this.g.player.team && this.g.mode === "duo" ? "#a2c8b1" : "#9b7465",
			roughness: .9
		});
		this.box(n, o, [
			.32,
			1.62,
			.05
		], [
			.06,
			.15,
			.1
		]);
		let s = {
			root: n,
			model: r,
			outfit: Kd(e.outfit).id,
			weapon: e.weapon,
			mixer: i,
			actions: a,
			action: "Idle",
			patch: o,
			x: e.x,
			y: e.y,
			lastSample: null,
			deadAt: null
		};
		return this.dressActor(s, e), this.equipActor(s, e), s.ownedMaterials = [...this.materials].filter((e) => !t.has(e)), this.actors.set(e.id, s), s;
	}
	mergeStatic(e) {
		e.updateMatrixWorld(!0);
		let t = e.matrixWorld.clone().invert(), n = /* @__PURE__ */ new Map();
		e.traverse((e) => {
			if (!e.isMesh) return;
			let r = e.geometry.index ? e.geometry.toNonIndexed() : e.geometry.clone();
			r.applyMatrix4(e.matrixWorld).applyMatrix4(t), r.attributes.uv || r.setAttribute("uv", new wn(new Float32Array(r.attributes.position.count * 2), 2));
			let i = n.get(e.material) || [];
			i.push(r), n.set(e.material, i), e.userData.ownedGeometry && e.geometry.dispose();
		}), e.clear();
		for (let [t, r] of n) {
			let n = hu(r);
			if (r.forEach((e) => e.dispose()), !n) continue;
			let i = new Wn(n, t);
			i.castShadow = !0, i.receiveShadow = !0, i.userData.ownedGeometry = !0, e.add(i);
		}
	}
	disposeActor(e) {
		this.dynamic.remove(e.root), e.mixer?.stopAllAction(), e.root.traverse((e) => {
			e.userData.ownedGeometry && e.geometry.dispose();
		});
		for (let t of e.ownedMaterials || []) t.dispose(), this.materials.delete(t);
	}
	equipActor(e, t) {
		let n = this.weaponMaterials(!1);
		e.equipmentMaterials = Object.values(n);
		let r = new fr();
		e.root.add(r), this.buildWeapon(r, t.weapon, n, !1), this.mergeStatic(r), r.position.set(.15, 1.25, -.14), r.scale.setScalar(1.1), e.equipment = r, e.model.traverse((t) => {
			t.name.endsWith("RightHand") && (e.weaponAnchor = t);
		});
	}
	skinTexture(t) {
		if (this.skinTextures ??= /* @__PURE__ */ new Map(), this.skinTextures.has(t.id)) return this.skinTextures.get(t.id);
		let n = new yi(Jd(t));
		return n.colorSpace = T, n.wrapS = n.wrapT = e, n.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()), this.textures.add(n), this.skinTextures.set(t.id, n), n;
	}
	dressActor(e, t) {
		let n = Kd(t.outfit), r = this.skinTexture(n), i = this.material({
			color: "#ffffff",
			map: r,
			roughness: .93
		}), a = this.material({
			color: "#ffffff",
			map: this.skinTexture({
				...n,
				id: n.id + "-armor",
				pattern: "solid",
				palette: [n.armor]
			}),
			roughness: .8,
			metalness: .08
		}), o = this.material({
			color: n.accent,
			roughness: .6,
			metalness: .15
		}), s = this.material({
			color: "#283030",
			roughness: .83
		}), c = this.material({
			color: new Y(n.armor).lerp(new Y("#d5d4c2"), .24),
			roughness: .95
		}), l = this.material({
			color: "#263842",
			roughness: .16,
			metalness: .4
		}), u = this.material({
			color: n.accent,
			emissive: n.accent,
			emissiveIntensity: n.pattern === "circuit" || n.pattern === "fracture" ? .65 : .08,
			roughness: .45
		}), d = new fr();
		d.name = "outfit-" + n.id, e.root.add(d), e.skinParts = [];
		let f = (t) => {
			let n = new fr();
			return d.add(n), e.model.traverse((e) => {
				e.isBone && e.name.endsWith(t) && (n.userData.anchor = e);
			}), e.skinParts.push(n), n;
		}, p = f("Spine2"), m = f("Head"), h = f("LeftArm"), g = f("RightArm"), _ = f("LeftLeg"), v = f("RightLeg"), y = (e, t, n, r) => this.box(e, t, n, r), b = (e, t, n, r) => this.mesh(e, this.geo("skinSphere", () => new Ua(1, 24, 16)), t, n, r), x = (e, t, n, r) => this.mesh(e, this.geo("skinRounded", () => new Sd(1, 1, 1, 2, .08)), t, n, r);
		x(p, a, [
			0,
			1.48,
			-.245
		], [
			.51,
			.44,
			.1
		]), x(p, s, [
			0,
			1.48,
			.24
		], [
			.5,
			.44,
			.09
		]);
		for (let e of [-.245, .245]) y(p, a, [
			e,
			1.62,
			.005
		], [
			.095,
			.36,
			.44
		]), y(p, s, [
			e,
			1.61,
			-.24
		], [
			.075,
			.09,
			.03
		]);
		for (let e = 0; e < 4; e++) y(p, c, [
			0,
			1.57 - e * .065,
			-.321
		], [
			.43,
			.012,
			.012
		]);
		for (let e of [
			-.175,
			0,
			.175
		]) x(p, a, [
			e,
			1.23,
			-.31
		], [
			.13,
			.21,
			.075
		]), y(p, s, [
			e,
			1.26,
			-.372
		], [
			.11,
			.025,
			.012
		]), y(p, c, [
			e,
			1.31,
			-.37
		], [
			.012,
			.035,
			.012
		]);
		y(p, s, [
			0,
			1.01,
			0
		], [
			.65,
			.08,
			.45
		]);
		for (let e of [-.31, .31]) x(p, a, [
			e,
			1.04,
			.05
		], [
			.12,
			.16,
			.2
		]);
		x(p, a, [
			0,
			1.46,
			.37
		], [
			.4,
			.5,
			.22
		]);
		for (let e of [-.11, .11]) y(p, s, [
			e,
			1.46,
			.49
		], [
			.035,
			.43,
			.015
		]);
		if (n.head === "hood") {
			let e = this.mesh(m, this.geo("angularHood", () => new Ua(1, 6, 6)), i, [
				0,
				2.065,
				.035
			], [
				.295,
				.335,
				.28
			]);
			e.rotation.y = Math.PI / 6, x(m, s, [
				0,
				2.06,
				-.252
			], [
				.34,
				.29,
				.07
			]), x(m, a, [
				0,
				1.985,
				-.303
			], [
				.25,
				.15,
				.055
			]), y(m, o, [
				0,
				2.2,
				-.235
			], [
				.32,
				.028,
				.04
			]);
		} else {
			this.mesh(m, this.geo("combatHelmet", () => new Ua(1, 24, 16, 0, $d, 0, Math.PI * .6)), i, [
				0,
				2.09,
				.025
			], [
				.275,
				.27,
				.275
			]), y(m, s, [
				0,
				2.16,
				-.23
			], [
				.36,
				.06,
				.08
			]);
			for (let e of [-.255, .255]) this.cylinder(m, a, [
				e,
				2.09,
				.02
			], .105, .065, "x", 16), this.cylinder(m, s, [
				e * 1.07,
				2.09,
				.02
			], .065, .07, "x", 16);
			if (x(m, s, [
				0,
				2.095,
				-.245
			], [
				.35,
				.135,
				.065
			]), x(m, l, [
				0,
				2.1,
				-.283
			], [
				.29,
				.09,
				.018
			]), b(m, s, [
				0,
				1.975,
				-.25
			], [
				.145,
				.09,
				.085
			]), n.head === "respirator") {
				x(m, a, [
					0,
					1.99,
					-.285
				], [
					.22,
					.14,
					.07
				]);
				for (let e of [-.165, .165]) this.cylinder(m, s, [
					e,
					1.98,
					-.285
				], .057, .055, "z", 16);
			}
			n.head === "visor" && (x(m, l, [
				0,
				2.08,
				-.31
			], [
				.33,
				.18,
				.05
			]), y(m, u, [
				0,
				1.99,
				-.34
			], [
				.24,
				.015,
				.015
			]));
		}
		for (let e of [-.09, .09]) {
			let t = y(m, c, [
				e,
				2.125,
				-.297
			], [
				.09,
				.006,
				.006
			]);
			t.rotation.z = -.2;
		}
		for (let [e, t, n] of [[
			-.38,
			h,
			_
		], [
			.38,
			g,
			v
		]]) {
			let r = x(t, a, [
				e,
				1.68,
				0
			], [
				.21,
				.17,
				.3
			]);
			r.rotation.z = e < 0 ? -.16 : .16, y(t, o, [
				e,
				1.7,
				-.166
			], [
				.18,
				.025,
				.02
			]), x(n, s, [
				e * .47,
				.55,
				-.075
			], [
				.24,
				.25,
				.13
			]), x(n, a, [
				e * .47,
				.56,
				-.153
			], [
				.18,
				.18,
				.06
			]), y(n, s, [
				e * .47,
				.77,
				.01
			], [
				.25,
				.045,
				.29
			]), x(n, a, [
				e * .69,
				.87,
				-.015
			], [
				.14,
				.25,
				.19
			]);
		}
		if (n.id === "urban") {
			b(p, o, [
				0,
				1.57,
				-.34
			], [
				.07,
				.075,
				.013
			]), y(p, o, [
				0,
				1.51,
				-.35
			], [
				.09,
				.045,
				.02
			]);
			for (let e of [-.027, .027]) b(p, s, [
				e,
				1.585,
				-.358
			], [
				.02,
				.023,
				.012
			]);
			for (let e of [
				-.025,
				0,
				.025
			]) y(p, s, [
				e,
				1.505,
				-.365
			], [
				.008,
				.025,
				.008
			]);
		}
		if (n.id === "medic" && (y(p, o, [
			0,
			1.56,
			-.348
		], [
			.035,
			.14,
			.022
		]), y(p, o, [
			0,
			1.56,
			-.36
		], [
			.14,
			.035,
			.022
		]), y(h, o, [
			-.505,
			1.65,
			0
		], [
			.02,
			.1,
			.12
		])), n.id === "recon") {
			for (let e = 0; e < 5; e++) {
				let t = this.mesh(g, this.geo("skinSpike", () => new wi(1, 1, 6)), s, [
					.4,
					1.84,
					-.12 + e * .06
				], [
					.024,
					.16,
					.024
				]);
				t.rotation.z = -.25;
			}
			for (let e of [-.17, .17]) y(p, u, [
				e,
				1.53,
				-.324
			], [
				.018,
				.22,
				.014
			]);
			y(m, u, [
				0,
				2.09,
				-.3
			], [
				.24,
				.025,
				.022
			]);
		}
		if (n.id === "shadow") {
			for (let e of [-.4, .4]) y(e < 0 ? h : g, o, [
				e,
				1.68,
				-.173
			], [
				.21,
				.09,
				.025
			]);
			y(m, o, [
				0,
				2.12,
				-.296
			], [
				.29,
				.022,
				.018
			]);
		}
		if (n.pattern === "fracture") {
			for (let e of [-.18, .18]) y(e < 0 ? _ : v, u, [
				e,
				.55,
				-.19
			], [
				.013,
				.13,
				.015
			]);
			y(p, u, [
				0,
				1.02,
				-.24
			], [
				.085,
				.04,
				.015
			]);
		}
		if (n.id === "engineer") {
			for (let e of [-.12, .12]) {
				let t = y(p, o, [
					e,
					1.53,
					-.334
				], [
					.02,
					.22,
					.02
				]);
				t.rotation.z = e < 0 ? -.8 : .8;
			}
			y(p, o, [
				.12,
				1.75,
				.38
			], [
				.025,
				.35,
				.025
			]);
		}
		if (n.id === "hazard") for (let e of [-.13, .13]) this.cylinder(p, s, [
			e,
			1.47,
			.48
		], .085, .5, "y", 16);
		e.root.updateMatrixWorld(!0);
		let S = e.root.matrixWorld.clone().invert();
		for (let t of e.skinParts) this.mergeStatic(t), t.userData.anchor && (t.userData.inverseBind = new J().multiplyMatrices(S, t.userData.anchor.matrixWorld).invert(), t.matrixAutoUpdate = !1);
		e.wardrobe = d;
	}
	skinPortrait(e, t = 600, n = 800) {
		let r = Array.isArray(e) ? e : [e], i = r.map((e, t) => {
			let n = this.makeActor({
				...this.g.enemies[0],
				id: "portrait-" + e,
				outfit: e,
				weapon: "carbine"
			});
			return n.equipment.visible = !1, n.root.position.x = (t - (r.length - 1) / 2) * 1.06, n;
		}), a = new gr();
		a.background = new Y("#e1e4dc"), a.environment = this.scene.environment, a.add(new ko("#ffffff", "#8c9585", 3));
		let o = new Uo("#fff5e1", 4.5);
		o.position.set(-3, 5, -4), a.add(o);
		let s = new Uo("#c5def3", 2);
		s.position.set(4, 3, 2), a.add(s), i.forEach((e) => a.add(e.root));
		let c = new Vo(-1.36 * t / n, 1.36 * t / n, 1.36, -1.36, .01, 20);
		c.position.set(3.2, 2.15, -6.5), c.lookAt(0, 1.16, 0), c.updateMatrixWorld(!0);
		let l = new Ve(t, n);
		l.texture.colorSpace = T;
		let u = this.renderer.getRenderTarget(), d = this.renderer.autoClear;
		this.renderer.autoClear = !0, this.renderer.setRenderTarget(l), this.renderer.render(a, c);
		let f = new Uint8Array(t * n * 4);
		this.renderer.readRenderTargetPixels(l, 0, 0, t, n, f);
		let p = document.createElement("canvas");
		p.width = t, p.height = n;
		let m = p.getContext("2d"), h = m.createImageData(t, n);
		for (let e = 0; e < n; e++) h.data.set(f.subarray((n - e - 1) * t * 4, (n - e) * t * 4), e * t * 4);
		m.putImageData(h, 0, 0), this.renderer.setRenderTarget(u), this.renderer.autoClear = d, l.dispose();
		for (let e of i) this.disposeActor(e), this.actors.delete("portrait-" + e.outfit);
		return p.toDataURL("image/webp", .9);
	}
	updateSkinParts(e) {
		if (!e.skinParts) return;
		e.root.updateMatrixWorld(!0);
		let t = e.root.matrixWorld.clone().invert();
		for (let n of e.skinParts) n.userData.inverseBind && (n.matrix.multiplyMatrices(t, n.userData.anchor.matrixWorld).multiply(n.userData.inverseBind), n.matrixWorldNeedsUpdate = !0);
	}
	updateActors(e) {
		let t = /* @__PURE__ */ new Set(), n = this.g.camera(), r = Math.floor(e * 30) / 30;
		for (let i of this.g.arena.entities) {
			if (i.id === n.id) continue;
			t.add(i.id);
			let a = this.actors.get(i.id);
			a && (a.outfit !== Kd(i.outfit).id || a.weapon !== i.weapon) && (this.disposeActor(a), this.actors.delete(i.id), a = null), a ||= this.makeActor(i);
			let o = Math.hypot(i.x - a.x, i.y - a.y) > .001;
			a.patch.color.set(i.team === this.g.player.team && this.g.mode === "duo" ? "#a2c8b1" : "#9b7465");
			let s = i.hp > 0, c = i.cloakedUntil > this.g.time && i.team !== this.g.player.team, l = performance.now() / 1e3;
			s ? a.deadAt = null : a.deadAt === null && (a.deadAt = l);
			let u = s ? 0 : Math.min(1, (l - a.deadAt) / .85);
			a.root.visible = (s || l - a.deadAt < 2.5) && (!c || Math.hypot(i.x - n.x, i.y - n.y) < 1.3);
			let d = s && i.slideUntil > this.g.time;
			a.root.scale.y = d ? .55 : 1, a.root.position.set(i.x * $, Math.sin(Math.min(1, Math.max(0, ((i.jumpUntil || 0) - this.g.time) / .5)) * Math.PI) * $, i.y * $), a.root.rotation.y = -Math.PI / 2 - i.a;
			let f = s && o && !this.motion.matches && !d ? i.sprinting || i.speedUntil > this.g.time ? "Run" : "Walk" : "Idle";
			f !== a.action && (a.actions[a.action]?.fadeOut(.12), a.actions[f]?.reset().fadeIn(.12).play(), a.action = f), a.mixer && a.lastSample !== r && (a.mixer.update(a.lastSample === null ? 0 : Math.max(0, Math.min(.1, r - a.lastSample))), a.lastSample = r), a.x = i.x, a.y = i.y;
			let p = Math.max(0, 1 - (this.g.time - i.hit) / .18);
			a.model.rotation.z = 0, a.root.rotation.z = s ? p * .05 : this.motion.matches ? Math.PI / 2 : u * 1.5, this.updateSkinParts(a), a.equipment && (a.weaponAnchor ? (a.root.updateMatrixWorld(!0), a.weaponAnchor.getWorldPosition(a.equipment.position), a.root.worldToLocal(a.equipment.position), a.equipment.position.z -= .05) : a.equipment.position.y = 1.25 + (o ? Math.sin(e * 7 + i.phase) * .025 : 0), a.equipment.rotation.x = e - i.shotAt < .15 ? -.12 : 0);
		}
		for (let [e, n] of this.actors) t.has(e) || (this.disposeActor(n), this.actors.delete(e));
	}
	weaponMaterials(e = !0) {
		let t = {
			metal: this.material({
				color: "#555c59",
				map: this.gunColor,
				metalness: .85,
				roughness: .55,
				normalMap: this.gunNormal,
				normalScale: new H(.35, .35),
				roughnessMap: this.gunRough
			}),
			polymer: this.material({
				color: "#555344",
				metalness: .05,
				roughness: .88
			}),
			steel: this.material({
				color: "#5a6261",
				metalness: .9,
				roughness: .35
			}),
			cloth: this.material({
				color: "#666b55",
				map: this.gloveColor,
				normalMap: this.gloveNormal,
				roughnessMap: this.gloveRough,
				roughness: .92
			}),
			rubber: this.material({
				color: "#45483d",
				map: this.gloveColor,
				normalMap: this.gloveNormal,
				roughnessMap: this.gloveRough,
				normalScale: new H(.4, .4),
				roughness: .9
			}),
			skin: this.material({
				color: "#b48a6d",
				roughness: .76
			})
		}, n = Kd(this.g.player.outfit);
		return t.cloth.color.set("#ffffff"), t.cloth.map = this.skinTexture(n), t.rubber.color.set("#303638"), Object.values(t).forEach((t) => t.userData.weapon = e), t;
	}
	hand(e, t, n, r, i) {
		let a = this.mesh(e, this.geo("arm", () => new Si(.045, .34, 8, 24)), i.cloth, [
			t,
			n - .17,
			r + .15
		]);
		a.rotation.x = -.65, a.rotation.z = t < 0 ? -.28 : .12, this.box(e, i.rubber, [
			t,
			n,
			r
		], [
			.11,
			.075,
			.17
		]);
		for (let a = 0; a < 4; a++) {
			this.mesh(e, this.geo("knuckle", () => new Ua(.016, 16, 12)), i.cloth, [
				t - .04 + a * .025,
				n + .032,
				r + .018
			], [
				1,
				.55,
				.8
			]);
			let o = this.mesh(e, this.geo("finger", () => new Si(.011, .045, 6, 16)), i.rubber, [
				t - .04 + a * .025,
				n + .035,
				r - .045
			]);
			o.rotation.x = Math.PI / 2;
		}
	}
	firearm(e, t, n = "rifle", r = 0, i = !0) {
		let a = new fr();
		e.add(a), a.position.x = r, this.box(a, t.metal, [
			0,
			0,
			-.52
		], [
			.085,
			.1,
			.28
		]), this.box(a, t.polymer, [
			0,
			-.025,
			-.31
		], [
			.055,
			.075,
			.18
		]), this.box(a, t.rubber, [
			0,
			.015,
			-.23
		], [
			.065,
			.14,
			.035
		]);
		let o = this.box(a, t.polymer, [
			0,
			-.1,
			-.45
		], [
			.042,
			.15,
			.07
		]);
		o.rotation.x = -.25;
		let s = this.box(a, t.metal, [
			0,
			-.14,
			-.58
		], [
			.044,
			.19,
			.065
		]);
		s.rotation.x = .16, this.box(a, t.polymer, [
			0,
			-.005,
			-.76
		], [
			.075,
			.085,
			.22
		]);
		for (let e = 0; e < 7; e++) this.box(a, t.metal, [
			0,
			.052,
			-.64 - e * .024
		], [
			.077,
			.009,
			.01
		]);
		for (let e of [-.039, .039]) for (let n = 0; n < 5; n++) this.box(a, t.metal, [
			e,
			0,
			-.7 - n * .028
		], [
			.004,
			.021,
			.012
		]);
		for (let e of [-.44, -.54]) for (let n of [-.044, .044]) this.cylinder(a, t.steel, [
			n,
			.018,
			e
		], .006, .005, "x", 12);
		this.box(a, t.rubber, [
			.044,
			.014,
			-.51
		], [
			.006,
			.031,
			.065
		]), this.box(a, t.steel, [
			.047,
			.015,
			-.46
		], [
			.012,
			.014,
			.035
		]), this.cylinder(a, t.steel, [
			-.045,
			-.02,
			-.43
		], .012, .008, "x", 16);
		for (let e = 0; e < 5; e++) this.box(a, t.polymer, [
			.024,
			-.08 - e * .026,
			-.58
		], [
			.004,
			.008,
			.05
		]);
		this.cylinder(a, t.metal, [
			0,
			.018,
			-.935
		], .014, .18), this.cylinder(a, t.metal, [
			0,
			.018,
			-1.036
		], .022, .035), this.cylinder(a, t.rubber, [
			0,
			.018,
			-1.056
		], .012, .002);
		let c = this.mesh(a, this.geo("trigger", () => new Wa(.028, .004, 8, 24)), t.metal, [
			0,
			-.066,
			-.48
		]);
		if (c.rotation.y = Math.PI / 2, n === "rifle" || n === "burst") {
			this.box(a, t.metal, [
				0,
				.07,
				-.51
			], [
				.065,
				.023,
				.075
			]);
			for (let e of [-.035, .035]) this.box(a, t.metal, [
				e,
				.105,
				-.51
			], [
				.014,
				.08,
				.05
			]);
			this.box(a, t.metal, [
				0,
				.143,
				-.51
			], [
				.08,
				.016,
				.05
			]);
			let e = this.material({
				color: "#607b7a",
				transparent: !0,
				opacity: .18,
				metalness: .6,
				roughness: .05
			});
			this.box(a, e, [
				0,
				.108,
				-.52
			], [
				.054,
				.055,
				.002
			]);
		}
		return n === "shotgun" && (s.visible = !1, this.cylinder(a, t.metal, [
			0,
			-.025,
			-.82
		], .019, .36), this.box(a, t.polymer, [
			0,
			-.012,
			-.81
		], [
			.075,
			.08,
			.15
		])), i && this.hand(a, .032, -.105, -.445, t), i && this.hand(a, -.045, -.058, -.75, t), a;
	}
	updateWeapon(e = this.g.player.weapon) {
		if (e === this.weaponId && this.weaponOutfit === this.g.player.outfit) return;
		this.rig.traverse((e) => {
			if (e.isMesh) {
				e.userData.ownedGeometry && e.geometry.dispose();
				let t = Array.isArray(e.material) ? e.material : [e.material];
				for (let e of t) e.dispose(), this.materials.delete(e);
			}
		});
		for (let e of this.materials) e.userData.weapon && (e.dispose(), this.materials.delete(e));
		this.rig.clear(), this.weaponId = e, this.weaponOutfit = this.g.player.outfit;
		let t = this.weaponMaterials();
		this.buildWeapon(this.rig, e, t), this.mergeStatic(this.rig), this.rig.position.set(e === "twin" || e === "brawler" ? .05 : .23, -.2, 0), this.rig.rotation.set(.02, -.07, -.025);
	}
	buildWeapon(e, t, n, r = !0) {
		let i = (...e) => {
			r && this.hand(...e);
		};
		if (n.polymer.color.set(Wd(t).color).multiplyScalar(.55), t === "venom" && n.steel.color.set("#6eb75a"), t === "veil" && n.steel.color.set("#c6b6e0"), [
			"carbine",
			"scatter",
			"twin",
			"breach"
		].includes(t)) {
			if (t === "twin") for (let t of [-.16, .16]) {
				let r = new fr();
				e.add(r), r.position.x = t, this.box(r, n.metal, [
					0,
					.015,
					-.52
				], [
					.055,
					.065,
					.26
				]), this.cylinder(r, n.steel, [
					0,
					.02,
					-.66
				], .014, .03);
				let a = this.box(r, n.polymer, [
					0,
					-.1,
					-.44
				], [
					.048,
					.15,
					.07
				]);
				a.rotation.x = -.18, this.box(r, n.steel, [
					0,
					.057,
					-.59
				], [
					.012,
					.014,
					.025
				]), i(r, .025, -.1, -.45, n);
			}
			else {
				let i = this.firearm(e, n, ["scatter", "breach"].includes(t) ? "shotgun" : "rifle", 0, r);
				t === "scatter" && (i.scale.z = .8, this.box(i, n.polymer, [
					0,
					-.015,
					-.77
				], [
					.12,
					.1,
					.2
				])), t === "breach" && (this.cylinder(i, n.steel, [
					.037,
					.018,
					-.97
				], .025, .36), this.box(i, n.metal, [
					0,
					-.07,
					-.58
				], [
					.12,
					.15,
					.12
				]));
			}
		} else if (t === "rocket") this.cylinder(e, n.polymer, [
			.02,
			0,
			-.62
		], .095, .66), this.cylinder(e, n.metal, [
			.02,
			0,
			-.96
		], .1, .03), this.cylinder(e, n.rubber, [
			.02,
			0,
			-.982
		], .078, .004), this.box(e, n.metal, [
			.02,
			.12,
			-.65
		], [
			.05,
			.12,
			.06
		]), this.box(e, n.polymer, [
			.02,
			-.13,
			-.45
		], [
			.04,
			.17,
			.06
		]), i(e, .06, -.13, -.47, n), i(e, -.045, -.09, -.77, n);
		else if (t === "demo" || t === "shard") {
			for (let r of t === "demo" ? [-.055, .055] : [0]) {
				this.cylinder(e, n.polymer, [
					r,
					-.07,
					-.52
				], .055, .21, "y"), this.box(e, n.metal, [
					r,
					.045,
					-.52
				], [
					.06,
					.02,
					.045
				]);
				let t = this.mesh(e, this.geo("pin", () => new Wa(.02, .003, 8, 24)), n.steel, [
					r,
					.065,
					-.52
				]);
				t.rotation.y = .3;
			}
			i(e, .02, -.2, -.5, n);
		} else if (t === "brawler") {
			i(e, -.22, -.03, -.45, n), i(e, .12, -.03, -.45, n);
			for (let t of [-.22, .12]) this.box(e, n.metal, [
				t,
				0,
				-.49
			], [
				.16,
				.12,
				.19
			]), this.box(e, n.polymer, [
				t,
				.07,
				-.49
			], [
				.17,
				.045,
				.16
			]);
		} else {
			let r = t === "reaper" ? 1 : t === "veil" ? 4 : 3;
			if (t === "reaper") {
				this.cylinder(e, n.polymer, [
					0,
					-.12,
					-.52
				], .018, .65, "y");
				let t = new ea();
				t.moveTo(-.03, .26), t.bezierCurveTo(.12, .48, .38, .42, .47, .06), t.bezierCurveTo(.34, .26, .18, .29, -.03, .26);
				let r = this.mesh(e, new Ra(t, {
					depth: .015,
					bevelEnabled: !1,
					curveSegments: 12
				}), n.steel, [
					0,
					0,
					-.52
				]);
				r.userData.ownedGeometry = !0;
			}
			for (let t = 0; t < r; t++) {
				let i = new fr();
				e.add(i), i.position.set((t - (r - 1) / 2) * .04, 0, -.52), i.rotation.z = (t - (r - 1) / 2) * .2, this.box(i, n.rubber, [
					0,
					-.13,
					0
				], [
					.023,
					.12,
					.022
				]);
				let a = new Mn();
				a.setAttribute("position", new wn([
					-.015,
					-.05,
					0,
					.015,
					-.05,
					0,
					0,
					.23,
					0,
					-.015,
					-.05,
					.006,
					0,
					.23,
					.006,
					.015,
					-.05,
					.006
				], 3)), a.computeVertexNormals();
				let o = this.mesh(i, a, n.steel);
				o.userData.ownedGeometry = !0;
			}
			i(e, .005, -.22, -.48, n);
		}
	}
	preview(e, t, n, r) {
		if (this.disposed || !this.soldier) return !1;
		let i = t + ":" + n + ":" + r;
		if (this.previews ||= /* @__PURE__ */ new Map(), this.previews.has(i)) return e.drawImage(this.previews.get(i), 0, 0, n, r), !0;
		let a = Math.min(1200, Math.max(480, n * 2)), o = Math.round(a * r / n), s = new Ve(a, o), c = this.renderer.getRenderTarget(), l = this.renderer.autoClear;
		s.texture.colorSpace = T;
		let u = new gr();
		u.background = new Y("#334039"), u.environment = this.scene.environment, u.add(new ko("#ffffff", "#8b9c91", 3));
		let d = new Uo("#fff5df", 5);
		d.position.set(2, 3, 3), u.add(d);
		let f = new fr();
		u.add(f);
		let p = new Set(this.materials), m = this.weaponMaterials(!1);
		this.buildWeapon(f, t, m, !1);
		let h = new We().setFromObject(f), g = h.getCenter(new W()), _ = a / o, v = new Vo(-1, 1, 1, -1, .01, 10);
		v.position.copy(g).add(new W(2, .65, 1.1)), v.lookAt(g), v.updateMatrixWorld(!0);
		let y = new We();
		for (let e of [h.min.x, h.max.x]) for (let t of [h.min.y, h.max.y]) for (let n of [h.min.z, h.max.z]) y.expandByPoint(new W(e, t, n).applyMatrix4(v.matrixWorldInverse));
		let b = Math.max((y.max.y - y.min.y) / 2, (y.max.x - y.min.x) / (2 * _)) * 1.18;
		v.left = -b * _, v.right = b * _, v.top = b, v.bottom = -b, v.updateProjectionMatrix(), this.renderer.setRenderTarget(s), this.renderer.autoClear = !0, this.renderer.render(u, v);
		let x = new Uint8Array(a * o * 4);
		this.renderer.readRenderTargetPixels(s, 0, 0, a, o, x);
		let S = document.createElement("canvas");
		S.width = a, S.height = o;
		let C = S.getContext("2d"), w = C.createImageData(a, o);
		for (let e = 0; e < o; e++) w.data.set(x.subarray((o - 1 - e) * a * 4, (o - e) * a * 4), e * a * 4);
		C.putImageData(w, 0, 0), this.renderer.setRenderTarget(c), this.renderer.autoClear = l, s.dispose(), f.traverse((e) => {
			e.userData.ownedGeometry && e.geometry.dispose();
		});
		for (let e of this.materials) p.has(e) || (e.dispose(), this.materials.delete(e));
		return this.previews.set(i, S), e.drawImage(S, 0, 0, n, r), !0;
	}
	updatePickups(e) {
		let t = this.crateMaterial ||= this.material({
			color: "#767869",
			roughness: .88,
			metalness: .12,
			map: this.metalColor
		}), n = this.latchMaterial ||= this.material({
			color: "#bab5a1",
			roughness: .62,
			metalness: .8
		}), r = /* @__PURE__ */ new Set();
		for (let e of this.g.crates) {
			if (e.hp <= 0) continue;
			r.add(e.id);
			let i = this.crates.get(e.id);
			if (!i) {
				i = new fr(), this.dynamic.add(i), this.box(i, t, [
					0,
					.9,
					0
				], [
					1.85,
					1.8,
					1.85
				]);
				for (let e of [-.6, .6]) this.box(i, n, [
					e,
					.9,
					.94
				], [
					.055,
					1.7,
					.025
				]), this.box(i, n, [
					e,
					1.83,
					0
				], [
					.055,
					.025,
					1.7
				]);
				this.box(i, n, [
					0,
					1.05,
					.95
				], [
					.34,
					.13,
					.06
				]), this.crates.set(e.id, i);
			}
			i.position.set(e.x * $, 0, e.y * $);
		}
		for (let [e, t] of this.crates) r.has(e) || (this.dynamic.remove(t), this.crates.delete(e));
		let i = /* @__PURE__ */ new Set();
		for (let t = 0; t < this.g.cores.length; t++) {
			let r = this.g.cores[t], a = r.x + ":" + r.y + ":" + t;
			i.add(a);
			let o = this.cores.get(a);
			if (!o) {
				o = new fr(), this.dynamic.add(o), this.box(o, n, [
					0,
					0,
					0
				], [
					.28,
					.38,
					.2
				]);
				let e = this.material({
					color: "#aac8b2",
					emissive: "#476651",
					emissiveIntensity: .7,
					metalness: .5,
					roughness: .3
				});
				this.box(o, e, [
					0,
					0,
					.11
				], [
					.18,
					.26,
					.025
				]), this.cores.set(a, o);
			}
			o.position.set(r.x * $, .5 + (this.motion.matches ? 0 : Math.sin(e * 2) * .06), r.y * $), o.rotation.y = this.motion.matches ? 0 : e * .5;
		}
		for (let [e, t] of this.cores) i.has(e) || (this.dynamic.remove(t), t.traverse((e) => {
			e.isMesh && e.material !== n && (e.material.dispose(), this.materials.delete(e.material));
		}), this.cores.delete(e));
	}
	updateFields() {
		let e = /* @__PURE__ */ new Set();
		for (let t of this.g.arena.fields) {
			e.add(t.id);
			let n = this.fields.get(t.id);
			if (!n) {
				n = new fr(), this.dynamic.add(n);
				let e = this.material({
					color: "#819e68",
					emissive: "#527938",
					emissiveIntensity: .7,
					transparent: !0,
					opacity: .5,
					roughness: .4,
					depthWrite: !1
				}), r = this.mesh(n, this.geo("field-ring", () => new Ha(.94, 1, 64)), e);
				r.rotation.x = -Math.PI / 2, r.castShadow = !1, this.fields.set(t.id, n);
			}
			n.position.set(t.x * $, .04, t.y * $), n.scale.setScalar(t.radius * $);
		}
		for (let [t, n] of this.fields) e.has(t) || (this.dynamic.remove(n), n.traverse((e) => {
			e.isMesh && (e.material.dispose(), this.materials.delete(e.material));
		}), this.fields.delete(t));
	}
	updateProjectiles(e) {
		let t = this.bulletMaterial ||= this.material({
			color: "#c5ab71",
			metalness: .8,
			roughness: .32
		}), n = /* @__PURE__ */ new Set();
		for (let e of this.g.arena.projectiles) {
			n.add(e.id);
			let r = this.projectiles.get(e.id);
			if (!r) {
				if (r = new fr(), this.dynamic.add(r), e.kind === "rocket" || e.kind === "barrage") {
					this.cylinder(r, t, [
						0,
						0,
						0
					], .065, .32, "z", 24);
					let e = this.mesh(r, this.geo("rocket-nose", () => new wi(.065, .14, 24)), t, [
						0,
						0,
						-.23
					]);
					e.rotation.x = -Math.PI / 2;
					for (let e = 0; e < 4; e++) {
						let n = this.box(r, t, [
							0,
							0,
							.13
						], [
							.18,
							.015,
							.1
						]);
						n.rotation.z = e * Math.PI / 2;
					}
				} else if (e.kind === "lob" || e.kind === "barrel") for (let n of e.kind === "lob" ? [-.06, .06] : [0]) this.cylinder(r, t, [
					n,
					0,
					0
				], e.kind === "barrel" ? .17 : .055, .23, "y", 20), this.box(r, t, [
					n,
					.14,
					0
				], [
					.05,
					.04,
					.035
				]);
				else {
					let e = this.mesh(r, this.geo("projectile-blade", () => new wi(.06, .28, 4)), t, [
						0,
						0,
						-.1
					]);
					e.rotation.x = -Math.PI / 2, e.scale.z = .15, this.cylinder(r, t, [
						0,
						0,
						.09
					], .021, .12, "z", 12);
				}
				this.projectiles.set(e.id, r);
			}
			r.position.set(e.x * $, 1.5 + (e.height || 0) * $, e.y * $), r.rotation.set(0, -e.a - Math.PI / 2, 0);
		}
		for (let [e, t] of this.projectiles) n.has(e) || (this.dynamic.remove(t), this.projectiles.delete(e));
		let r = /* @__PURE__ */ new Set();
		for (let t of this.g.arena.entities) {
			if (r.add(t.id), this.seenShots.get(t.id) === t.shotAt || (this.seenShots.set(t.id, t.shotAt), e - t.shotAt < 0 || e - t.shotAt > .15 || ![
				"carbine",
				"scatter",
				"twin",
				"breach"
			].includes(t.weapon))) continue;
			let n = this.g.arena.cast(t.x, t.y, Math.cos(t.a), Math.sin(t.a)), i = Math.min(18, n.distance) * $, a = this.mesh(this.dynamic, this.geo("tracer", () => new Ci(.007, .007, 1, 6)), this.tracerMaterial ||= this.material({
				color: "#e9c995",
				emissive: "#c9a56e",
				emissiveIntensity: 2
			}), [
				t.x * $ + Math.cos(t.a) * i / 2,
				1.5,
				t.y * $ + Math.sin(t.a) * i / 2
			], [
				1,
				i,
				1
			]);
			a.rotation.z = Math.PI / 2, a.rotation.y = -t.a, a.castShadow = !1, this.tracers.push({
				mesh: a,
				born: e
			});
		}
		this.tracers = this.tracers.filter((t) => e - t.born < .075 && this.tracers.length <= 32 || (this.dynamic.remove(t.mesh), !1));
		for (let e of this.seenShots.keys()) r.has(e) || this.seenShots.delete(e);
	}
	render() {
		if (this.disposed) return !1;
		this.configure();
		let e = this.g, t = e.animationTime;
		if (this.mapKey !== e.arena.mapId || this.loadedMap !== !!this.soldier) {
			this.loadedMap = !!this.soldier;
			for (let e of this.actors.values()) this.disposeActor(e);
			this.actors.clear(), this.buildWorld();
		}
		this.rebuildWalls();
		let n = e.camera(), r = Math.atan(e.viewPitch / e.projection), i = performance.now(), a = Math.min(.1, (i - (this.lastRenderAt || i)) / 1e3), o = n.slideUntil > e.time ? .7 : 1.5;
		this.lastRenderAt = i, this.eyeHeight ??= 1.5, this.eyeHeight += (o - this.eyeHeight) * (1 - Math.exp(-a * 18));
		let s = this.motion.matches ? 0 : (e.deathProgress || 0) ** 2;
		if (this.camera.position.set(n.x * $, e.deathSequence ? 1.5 - s * 1.25 : this.eyeHeight, n.y * $), this.camera.rotation.set(r - s * .25, -n.a - Math.PI / 2, s * .5, "YXZ"), this.updateActors(t), this.updatePickups(t), this.updateFields(), t < this.lastTime) {
			this.seenShots.clear();
			for (let e of this.tracers) this.dynamic.remove(e.mesh);
			this.tracers = [];
		}
		this.updateProjectiles(t), this.updateWeapon();
		let c = Math.max(0, 1 - (t - e.shotAt) / .16), l = Math.max(0, Math.min(1, (e.reloadUntil - t) / 1.4));
		this.rig.position.y = -.2 * Math.max(1, this.g.h / this.g.w) - (l > 0 ? Math.sin(l * Math.PI) * .25 : 0) + (this.motion.matches ? 0 : Math.sin(e.step) * .005), this.rig.position.y -= s * .65, this.rig.position.z = c * .04, this.rig.rotation.x = .02 - c * .075, this.rig.rotation.z = -.025 + Math.sin(l * Math.PI) * .3, this.flash.intensity = c > .65 ? 3 : 0, this.rig.visible = e.player.hp > 0 || !!e.deathSequence && e.deathProgress < .65;
		let u = e.mode !== "training" && e.time > e.zone.delay && (Math.abs(n.x - e.zone.cx) > e.zone.half || Math.abs(n.y - e.zone.cy) > e.zone.half);
		return this.scene.fog.color.set(u ? "#827276" : ef[e.arena.mapId].fog), this.scene.fog.density = u ? .065 : .009, this.renderer.info.reset(), !this.composer || e.academy.preset === "performance" ? (this.renderer.autoClear = !0, this.renderer.render(this.scene, this.camera), this.renderer.autoClear = !1, this.renderer.clearDepth(), this.renderer.render(this.weaponScene, this.weaponCamera), this.renderer.autoClear = !0) : this.composer.render(), this.lastTime = t, !0;
	}
	disposeObject(e) {
		e.traverse((e) => {
			if (e.isMesh) {
				e.geometry?.dispose();
				for (let t of Array.isArray(e.material) ? e.material : [e.material]) t?.dispose();
			}
		});
	}
	dispose() {
		if (!this.disposed) {
			this.disposed = !0;
			for (let e of this.actors.values()) e.mixer?.stopAllAction();
			this.previewTarget?.dispose(), this.composer?.dispose();
			for (let e of this.composer?.passes || []) e.dispose?.();
			this.clearWorld();
			for (let e of this.materials) e.dispose();
			for (let e of this.geometries.values()) e.dispose();
			for (let e of this.textures) e.dispose();
			this.soldier && this.disposeObject(this.soldier.scene), this.renderer.domElement.removeEventListener("webglcontextlost", this.contextLost), this.renderer.dispose(), this.renderer.forceContextLoss(), this.renderer.domElement.remove(), this.actors.clear(), this.materials.clear(), this.textures.clear();
		}
	}
};
//#endregion
export { tf as MilitaryRenderer };
