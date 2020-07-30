import * as THREE from 'three';
import * as dat from 'dat.gui';

import Particle from './Particle';

let container;
let camera, scene, renderer;

let pointLight;

let planeRaycaster;
let sphere;
let angle = 0;

let raycaster;
let mouse = {};

// particles
let particles = [];
let particleCount = 100;
let particlesContainer = new THREE.Object3D();
let particlesCreated = true;

// frame
let frame = 0;

// gui
let gui;
let params;
let options = {
  particleCount: 100
}

// ----------------------------------------------------- //

init();
animate();

function init() {
  // ----------------------------------------------------- //

  addContainer();
  addCamera();
  addScene();
  addLights();
  addRenderer();

  // raycaster
  raycaster = new THREE.Raycaster();
  addPlaneRaycaster();

  // sphere
  mouse = {
    position: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    normalizePosition: new THREE.Vector2(0, 0),
  };
  addSphere();

  // particles
  initPaticles();

  // gui
  gui = new dat.GUI();
  params = gui.addFolder('Params');
  params.open();

  params.add(options, 'particleCount', 1, 1000);

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onMouseMove, false);

  // ----------------------------------------------------- //
}

function initPaticles() {
  for (let i = 0; i < particleCount; i++) {
    const particleMass = generateRandomNumber(15, 17);
    const particleRadius = generateRandomNumber(0.02, 0.08);

    const particle = new Particle(
      new THREE.Color('#5689a0'),
      particleRadius,
      particleMass,
      generateRandomNumber(0.2, 0.4), // maxSpeed
      scene
    );

    particles.push(particle);
    particlesContainer.add(particle);
    particlesCreated = true;
  }

  scene.add(particlesContainer);
}

// ----------------------------------------------------- //

function addPlaneRaycaster() {
  let geometry = new THREE.PlaneBufferGeometry(20, 20, 1, 1);
  let material = new THREE.MeshBasicMaterial({
    color: 0x111111,
    side: THREE.DoubleSide,
    visible: false,
  });

  planeRaycaster = new THREE.Mesh(geometry, material);

  // scene.add(planeRaycaster);
}

// ----------------------------------------------------- //

function addSphere() {
  let geometry = new THREE.SphereBufferGeometry(0.04, 16, 16);
  let material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });

  sphere = new THREE.Mesh(geometry, material);

  scene.add(sphere);
}

// ----------------------------------------------------- //

function update() {
  frame++;

  // update function
  updateAngle(0.15);

  if (frame % 3 === 0) {
    updateParticles();
  }
}

// ----------------------------------------------------- //

function updateParticles() {
  const spPos = sphere.position.clone();

  if (particlesCreated) {
    for (let i = 0; i < particleCount; i++) {
      particles[i].seek(new THREE.Vector3(spPos.x, spPos.y, spPos.z));
    }

    particlesCreated = false;
  }

  // console.log('this.particles.renderGroupIndex', this.particles)
  for (let i = 0; i < particleCount; i++) {
    // if (renderGroupIndex !== particles[i].renderGroupIndex) {
    //   continue;
    // }

    particles[i].seek(
      new THREE.Vector3(
        spPos.x + Math.sin(angle) * 0.5,
        spPos.y,
        spPos.z + Math.cos(angle) * 0.5
      )
    );
  }
}

function updateAngle(step = 0.02) {
  if (angle >= Math.PI * 2) {
    angle = 0;
  } else {
    angle += step;
  }
}

// ----------------------------------------------------- //

function onMouseMove(event) {
  mouse.position.set(event.clientX, event.clientY);

  mouse.normalizePosition.set(
    (mouse.position.x / window.innerWidth) * 2 - 1,
    -(mouse.position.y / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(mouse.normalizePosition.clone(), camera);

  const _inter = raycaster.intersectObjects([planeRaycaster]);

  if (_inter.length) {
    sphere.position.copy(_inter[0].point);
    pointLight.position.copy(sphere.position);
  }
}

// ----------------------------------------------------- //

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----------------------------------------------------- //

function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

// ----------------------------------------------------- //

function render() {
  renderer.render(scene, camera);
}

// ----------------------------------------------------- //

function addContainer() {
  container = document.createElement('div');
  document.body.appendChild(container);
}

// ----------------------------------------------------- //

function addCamera() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    15000
  );
  camera.position.z = 8;
}

// ----------------------------------------------------- //

function addScene() {
  scene = window.scene = new THREE.Scene();
  scene.background = new THREE.Color('lightblue');
  // scene.fog = new THREE.Fog(0xFFFFFF, 1, 15000);

  scene.ParticlesContainer = new THREE.Object3D();
  scene.ParticlesContainer.name = '_Scene.ParticlesContainer';
  scene.add(scene.ParticlesContainer);
}

// ----------------------------------------------------- //

function addLights() {
  scene.add(new THREE.AmbientLight(0x333333));

  pointLight = new THREE.PointLight(0xffffff, 3, 5);

  scene.add(pointLight);
}

// ----------------------------------------------------- //

function addRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  renderer.setClearColor(0xffffff, 0);
}

function generateRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}
