import * as THREE from 'three';

const minLength = 0.6;
const tailLength = 8;
const minDis = 0.02;
const maxDis = 7;

const particle_geometry = new THREE.SphereGeometry(0.5, 32, 32);

const tailMaterial = new THREE.MeshStandardMaterial({
  side: THREE.DoubleSide,
  color: new THREE.Color('#000000'),
  // transparent: true,
});

export default class Particle extends THREE.Object3D {
  constructor(color, radius, mass, maxSpeed, scene) {
    super();

    this.startDirection = new THREE.Vector3(
      -1 + Math.random() * 2,
      -1 + Math.random() * 2,
      -1 + Math.random() * 2
    );
    this.startDirection.normalize();
    this.startDirection.multiplyScalar(0.3 + Math.random() * 2);

    this.color = color;
    this.radius = radius;

    this.lastPosition = new THREE.Vector3(0, 0, 0);

    this.maxSpeed = maxSpeed;
    this.mass = mass;
    this.velocity = this.startDirection.clone();

    this.scene = scene;

    this.userData = {};

    this.initParticle();

    this.initTail();
  }

  seek(destination) {
    this.lastPosition.x = this.position.x;
    this.lastPosition.y = this.position.y;
    this.lastPosition.z = this.position.z;

    this.startDirection = new THREE.Vector3(0, 0, 0);
    this.startDirection.normalize();

    this.startDirection.multiplyScalar(destination.distanceTo(this.position));

    const steeringForce = new THREE.Vector3(
      destination.x - this.position.x,
      destination.y - this.position.y,
      destination.z - this.position.z
    );

    const acceleration = new THREE.Vector3(
      steeringForce.x / this.mass,
      steeringForce.y / this.mass,
      steeringForce.z / this.mass
    );

    this.velocity.x += acceleration.x;
    this.velocity.y += acceleration.y;
    this.velocity.z += acceleration.z;

    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize();

      this.velocity.x *= this.maxSpeed;
      this.velocity.y *= this.maxSpeed;
      this.velocity.z *= this.maxSpeed;
    }

    this.position.x += this.velocity.x + this.startDirection.x;
    this.position.y += this.velocity.y + this.startDirection.y;
    this.position.z += this.velocity.z + this.startDirection.z;

    // =========[ animate ]========= //

    this.userData.animate &&
      this.userData.animate({ position: this.position, destination });

    

    // ============================= //
  }

  initParticle() {
    const particleMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      visible: true,
    });

    this.particle = new THREE.Mesh(particle_geometry, particleMaterial);
    this.particle.scale.set(this.radius, this.radius, this.radius);

    this.add(this.particle);
  }

  initTail() {
    this.userData.positions = [];

    this.particle.geometry.computeBoundingSphere();

    for (let i = 0; i < tailLength; i++) {
      this.userData.positions.push(this.position.clone());
    }

    this.tailPath = this.getTailPath(1);

    this.tailGeometry = new THREE.TubeBufferGeometry(
      this.tailPath,
      6,
      0.037,
      6,
      false
    );

    this.tailGeometry.updatePath(this.tailPath);

    this.userData.tail_line = new THREE.Mesh(this.tailGeometry, tailMaterial);

    // this.add(this.userData.tail_line);
    this.scene.ParticlesContainer.add(this.userData.tail_line);


    this.userData.animate = ({ position, destination }) => {
      const currentDistance = position.distanceTo(destination);

      let tailLengthFactor = 0;
  
      if (currentDistance < minDis) {
        tailLengthFactor = 0;
      } else if (currentDistance > maxDis) {
        tailLengthFactor = 1;
      } else {
        tailLengthFactor = currentDistance / maxDis;
      }
      tailLengthFactor = 1 - tailLengthFactor;
  
      this.scene.updateMatrixWorld();
      this.parent.updateMatrixWorld();
      const vector = new THREE.Vector3();
      vector.setFromMatrixPosition(this.particle.matrixWorld);
  
      this.userData.positions.shift();
      this.userData.positions.push(vector);
  
      const tailPath = this.getTailPath(tailLengthFactor);
  
      this.tailGeometry.updatePath(tailPath);
  
      this.userData.tail_line.geometry.verticesNeedUpdate = true;
    }
  }

  getTailPath(tailLengthFactor = 1) {
    const getLengthByLengthFactor = (addFactor = 1) => {
      const totalLength = this.userData.positions.length - 1;
      const minimumLength = Math.floor(totalLength * minLength);
      const leftLength = totalLength - minimumLength;
      const contAvailableDiapason = Math.floor(
        minimumLength + Math.floor(leftLength * (1 - tailLengthFactor))
      );
      const currentPosition = Math.floor(contAvailableDiapason * addFactor);
      return this.userData.positions.length - currentPosition - 1;
    };

    const pointsForTail = [
      this.userData.positions[getLengthByLengthFactor(0)],
      this.userData.positions[getLengthByLengthFactor(0.33)], // 0.08
      this.userData.positions[getLengthByLengthFactor(0.66)], // 0.15
      this.userData.positions[getLengthByLengthFactor(1)], // 0.5
    ];

    return new THREE.CatmullRomCurve3(pointsForTail);
  }
}

THREE.TubeBufferGeometry.prototype.updatePath = function (newPath) {
  this.parameters.path = newPath;

  const { tubularSegments, radialSegments, radius, closed } = this.parameters;

  const frames = newPath.computeFrenetFrames(tubularSegments, false);

  this.tangents = frames.tangents;
  this.normals = frames.normals;
  this.binormals = frames.binormals;

  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let P = new THREE.Vector3();

  const vertices = [];
  const normals = [];

  generateBufferData();

  this.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  this.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  function generateBufferData() {
    for (let i = 0; i < tubularSegments; i++) {
      generateSegment(i);
    }

    generateSegment(closed === false ? tubularSegments : 0);
  }

  function generateSegment(i) {
    P = newPath.getPointAt(i / tubularSegments, P);

    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;

      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();
      normals.push(normal.x, normal.y, normal.z);

      vertex.x = P.x + radius * normal.x;
      vertex.y = P.y + radius * normal.y;
      vertex.z = P.z + radius * normal.z;
      vertices.push(vertex.x, vertex.y, vertex.z);
    }
  }
};
