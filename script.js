import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let scene, camera, renderer, controls;

let robotGroup, leftEyeMesh, rightEyeMesh, headMesh, noseMesh, frontPanelMesh;

let raycaster, mouse;

let clock;

let isAutoRotating = true;

let currentHoverTarget = null;

let currentAnimation = 'idle';

let currentGimmickMode = 'oled';

const canvasContainer = document.getElementById('canvas-wrapper');
const viewerDOM = document.getElementById('viewer-container');
const bubble = document.getElementById('speech-bubble');
const btnReset = document.getElementById('btn-reset');
const btnAuto = document.getElementById('btn-autorotate');
const btnFull = document.getElementById('btn-fullscreen');

// Select all port-boxes in left and right columns
const leftBoxes = document.querySelectorAll('.left-col .port-box');
const rightBoxes = document.querySelectorAll('.right-col .port-box');

init();
animate();

function init() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xB0B0B0);
  scene.fog = new THREE.Fog(0xB0B0B0, 10, 30);

  clock = new THREE.Clock();

  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 3.2, 8.0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.SoftShadowMap;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.sortObjects = false;
  canvasContainer.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(3, 8, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 20;
  scene.add(dirLight);

  createRobot();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;
  controls.target.set(0, 1.05, 0);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // 3D canvas events
  renderer.domElement.addEventListener('mousemove', onMouseMove3D);
  renderer.domElement.addEventListener('click', onMouseClick);

  // Left column individual box hover
  leftBoxes.forEach((box, index) => {
    box.addEventListener('mouseenter', () => handleBoxHover('left', index));
    box.addEventListener('mouseleave', () => handleBoxHover(null));
  });

  // Right column individual box hover
  rightBoxes.forEach((box, index) => {
    box.addEventListener('mouseenter', () => handleBoxHover('right', index));
    box.addEventListener('mouseleave', () => handleBoxHover(null));
  });

  // Buttons
  btnReset.addEventListener('click', resetView);
  btnAuto.addEventListener('click', toggleAutoRotate);
  btnFull.addEventListener('click', toggleFullscreen);

  window.addEventListener('resize', onWindowResize);

  setTimeout(onWindowResize, 100);
}

function createRobot() {
  // Robot creation (same adorable version with visible rollers)
  robotGroup = new THREE.Group();

  const glossyWhite = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02
  });

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0.6
  });

  const darkRubber = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.95,
    metalness: 0.0
  });

  const bodyGeo = new THREE.SphereGeometry(1.0, 48, 48);
  const body = new THREE.Mesh(bodyGeo, glossyWhite);
  body.scale.set(1.45, 1.9, 1.2);
  body.position.y = 1.05;
  body.castShadow = true;
  body.receiveShadow = true;
  robotGroup.add(body);

  const highlight = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }));
  highlight.position.set(0.35, 1.8, 0.85);
  highlight.rotation.y = -0.35;
  robotGroup.add(highlight);

  const wingGeo = new THREE.SphereGeometry(0.45, 32, 32);
  const leftWing = new THREE.Mesh(wingGeo, glossyWhite);
  leftWing.scale.set(1.3, 0.65, 0.85);
  leftWing.position.set(-0.95, 1.6, 0.1);
  leftWing.rotation.z = 0.45;
  leftWing.castShadow = true;
  robotGroup.add(leftWing);

  const rightWing = leftWing.clone();
  rightWing.position.set(0.95, 1.6, 0.1);
  rightWing.rotation.z = -0.45;
  robotGroup.add(rightWing);

  const headGeo = new RoundedBoxGeometry(1.42, 1.05, 0.85, 12, 0.32);
  headMesh = new THREE.Mesh(headGeo, glossyWhite);
  headMesh.position.set(0, 3.35, 0.1);
  headMesh.castShadow = true;
  robotGroup.add(headMesh);

  const outline = new THREE.Mesh(new RoundedBoxGeometry(1.48, 1.10, 0.90, 12, 0.35), glossyWhite);
  outline.position.set(0, 3.35, 0.08);
  robotGroup.add(outline);

  const frontPanelGeo = new RoundedBoxGeometry(1.25, 0.85, 0.1, 10, 0.2);
  frontPanelMesh = new THREE.Mesh(frontPanelGeo, blackMat);
  frontPanelMesh.position.set(0, 3.35, 0.48);
  robotGroup.add(frontPanelMesh);

  const noseGeo = new THREE.SphereGeometry(0.09, 32, 32);
  noseMesh = new THREE.Mesh(noseGeo, blackMat);
  noseMesh.position.set(0, -0.08, 0.45);
  headMesh.add(noseMesh);

  function makeEyeCanvas() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    return { canvas: c, ctx, tex: new THREE.CanvasTexture(c) };
  }

  const leftEyeCanvas = makeEyeCanvas();
  const rightEyeCanvas = makeEyeCanvas();

  function drawEyeToCanvas(ctx, pupilX = 0, pupilY = 0, open = true, mode = 'oled', lookIntensity = 0, excited = false) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2 + pupilX * 50 + lookIntensity * 25;
    const cy = H / 2 + pupilY * 40;

    if (!open) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy);
      ctx.quadraticCurveTo(cx, cy + 10, cx + 50, cy);
      ctx.stroke();
      return;
    }

    const px = 5;
    let fg = '#ffffff';
    let pupilColor = '#40c4ff';
    let glow = 'rgba(64, 196, 255, 0.6)';

    if (mode === 'neon') {
      fg = '#00ff88';
      pupilColor = '#00ff88';
      glow = 'rgba(0, 255, 136, 0.7)';
    } else if (mode === 'blackOnWhite') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      fg = '#000000';
      pupilColor = '#000000';
      glow = 'rgba(0, 0, 0, 0.4)';
    }

    const glowSize = excited ? 100 : 85;
    ctx.fillStyle = glow;
    ctx.globalAlpha = excited ? 0.8 : 0.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, glowSize, glowSize * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = fg;
    for (let y = -24; y <= 24; y += px) {
      for (let x = -28; x <= 28; x += px) {
        const dx = cx + x;
        const dy = cy + y;
        if ((x * x) / (28 * 28) + (y * y) / (24 * 24) <= 1) {
          ctx.fillRect(dx - px / 2, dy - px / 2, px, px);
        }
      }
    }

    ctx.fillStyle = pupilColor;
    ctx.fillRect(cx - 10, cy - 15, 20, 30);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(cx - 8, cy - 20, 10, 10);
    ctx.fillRect(cx + 12, cy - 12, 6, 6);
    ctx.globalAlpha = 1;
  }

  drawEyeToCanvas(leftEyeCanvas.ctx, -0.2, 0, true, currentGimmickMode, 0, false);
  drawEyeToCanvas(rightEyeCanvas.ctx, 0.2, 0, true, currentGimmickMode, 0, false);
  leftEyeCanvas.tex.needsUpdate = true;
  rightEyeCanvas.tex.needsUpdate = true;

  const eyeGeo = new THREE.PlaneGeometry(0.30, 0.45);
  const leftEyeMat = new THREE.MeshBasicMaterial({ map: leftEyeCanvas.tex, transparent: true });
  const rightEyeMat = new THREE.MeshBasicMaterial({ map: rightEyeCanvas.tex, transparent: true });

  leftEyeMesh = new THREE.Mesh(eyeGeo, leftEyeMat);
  leftEyeMesh.position.set(-0.18, 0.08, 0.45);
  leftEyeMesh.renderOrder = 8;

  rightEyeMesh = new THREE.Mesh(eyeGeo, rightEyeMat);
  rightEyeMesh.position.set(0.18, 0.08, 0.45);
  rightEyeMesh.renderOrder = 8;

  headMesh.add(leftEyeMesh);
  headMesh.add(rightEyeMesh);

  // Visible black rollers
  const rollerGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.9, 32);
  rollerGeo.rotateX(Math.PI / 2);

  const leftRoller = new THREE.Mesh(rollerGeo, darkRubber);
  leftRoller.position.set(-0.75, 0.15, 0);
  leftRoller.castShadow = true;
  robotGroup.add(leftRoller);

  const rightRoller = leftRoller.clone();
  rightRoller.position.x = 0.75;
  robotGroup.add(rightRoller);

  const basePlateGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.2, 48);
  basePlateGeo.rotateX(Math.PI / 2);
  const basePlate = new THREE.Mesh(basePlateGeo, blackMat);
  basePlate.position.y = 0.05;
  robotGroup.add(basePlate);

  const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  scene.add(shadowPlane);

  scene.add(robotGroup);

  robotGroup.userData.updateEyes = function (lookX = 0, excited = false) {
    drawEyeToCanvas(leftEyeCanvas.ctx, 0, 0, true, currentGimmickMode, lookX, excited);
    drawEyeToCanvas(rightEyeCanvas.ctx, 0, 0, true, currentGimmickMode, lookX, excited);
    leftEyeCanvas.tex.needsUpdate = true;
    rightEyeCanvas.tex.needsUpdate = true;
  };

  robotGroup.userData.toggleGimmick = function () {
    const modes = ['oled', 'neon', 'blackOnWhite'];
    const idx = modes.indexOf(currentGimmickMode);
    currentGimmickMode = modes[(idx + 1) % modes.length];
    robotGroup.userData.updateEyes(0, false);
    const modeName = currentGimmickMode === 'oled' ? 'OLED' : currentGimmickMode === 'neon' ? 'Neon' : 'Inverted';
    showSpeech(`✨ Mode: ${modeName}`);
    return currentGimmickMode;
  };

  robotGroup.userData.updateEyes(0, false);
}

// Updated hover handler with all sections
function handleBoxHover(side, index) {
  if (currentHoverTarget === `${side}-${index}`) return;
  currentHoverTarget = `${side}-${index}`;

  let speech = '';
  if (side === 'left') {
    if (index === 0) {
      speech = "Hey! They are my creators – Team Jetr! I'm so proud of them! ❤️";
    } else if (index === 1) {
      speech = "This is the challenge statement – the problem I was built to solve! 🩺";
    } else if (index === 2) {
      speech = "These are my technical highlights – the smart tech inside me! 🛠️";
    } else if (index === 3) {
      speech = "This shows my feasibility & viability – I'm ready for the real world! 🚀";
    }
  } else if (side === 'right') {
    if (index === 0) {
      speech = "Hey! They are my creators – Team Jetr! I'm so proud of them! ❤️";
    } else if (index === 1) {
      speech = "That's me! I am Niggy – your personal healthcare companion! 🤍";
    } else if (index === 2) {
      speech = "This is how I help – I make healthcare easier and friendlier! 😊";
    } else if (index === 3) {
      speech = "These are my impact & benefits – I make lives healthier and happier! ❤️";
    } else if (index === 4) {
      speech = "This is competitor analysis & cost – I'm the best and most affordable choice! 💰";
    }
  }

  if (speech) showSpeech(speech);
  else bubble.classList.add('hidden');
}

function onMouseMove3D(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(robotGroup, true);

  const isHovering3D = intersects.length > 0;

  if (isHovering3D) {
    if (currentHoverTarget !== 'robot') {
      currentHoverTarget = 'robot';
      showSpeech("Hi! Touch me to change my eye mode! 😊");
    }
  } else if (currentHoverTarget === 'robot') {
    currentHoverTarget = null;
    bubble.classList.add('hidden');
  }

  if (isHovering3D) {
    document.body.style.cursor = 'pointer';
    controls.autoRotate = false;
  } else if (currentHoverTarget === null || currentHoverTarget.includes('-')) {
    document.body.style.cursor = 'default';
    if (isAutoRotating) controls.autoRotate = true;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  if (robotGroup) {
    if (currentAnimation === 'idle') {
      robotGroup.position.y = Math.sin(time * 2.5) * 0.03;
      robotGroup.rotation.z = Math.sin(time * 1.5) * 0.02;
    } else if (currentAnimation === 'excited') {
      robotGroup.position.y = Math.abs(Math.sin(time * 10)) * 0.15;
    }

    const excited = currentHoverTarget !== null;

    const leanY = THREE.MathUtils.lerp(robotGroup.rotation.y, mouse.x * 0.3, 0.1);
    const leanX = THREE.MathUtils.lerp(robotGroup.rotation.x, -mouse.y * 0.2, 0.1);
    robotGroup.rotation.y = leanY;
    robotGroup.rotation.x = leanX;

    const lookIntensity = mouse.x;
    robotGroup.userData.updateEyes(lookIntensity, excited);

    if (Math.random() > 0.995) blinkEyes();
  }

  controls.update();
  renderer.render(scene, camera);
}

function blinkEyes() {
  drawEyeToCanvas(leftEyeCanvas.ctx, 0, 0, false, currentGimmickMode, 0, false);
  drawEyeToCanvas(rightEyeCanvas.ctx, 0, 0, false, currentGimmickMode, 0, false);
  leftEyeCanvas.tex.needsUpdate = true;
  rightEyeCanvas.tex.needsUpdate = true;

  setTimeout(() => {
    const lookX = mouse.x;
    const excited = currentHoverTarget !== null;
    robotGroup.userData.updateEyes(lookX, excited);
  }, 150);
}

function onMouseClick() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(robotGroup, true);
  if (intersects.length === 0) return;

  const clickedHead = intersects.some(i => [headMesh, leftEyeMesh, rightEyeMesh, noseMesh, frontPanelMesh].includes(i.object));

  if (clickedHead) {
    currentAnimation = 'excited';
    robotGroup.userData.toggleGimmick();
    setTimeout(() => currentAnimation = 'idle', 1500);
  }
}

function showSpeech(text) {
  bubble.textContent = text;
  bubble.classList.remove('hidden');
}

function resetView() {
  controls.reset();
  controls.target.set(0, 1.2, 0);
  controls.autoRotate = isAutoRotating;
  currentAnimation = 'idle';
  showSpeech('View reset!');
  setTimeout(() => bubble.classList.add('hidden'), 2000);
}

function toggleAutoRotate() {
  isAutoRotating = !isAutoRotating;
  controls.autoRotate = isAutoRotating;
  btnAuto.textContent = isAutoRotating ? 'Auto rotate: On' : 'Auto rotate: Off';
  showSpeech(isAutoRotating ? 'Auto rotate turned on!' : 'Auto rotate turned off!');
  setTimeout(() => bubble.classList.add('hidden'), 2000);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    viewerDOM.requestFullscreen().catch(err => console.warn(err));
    btnFull.textContent = 'Exit Fullscreen';
    showSpeech('Fullscreen mode activated!');
  } else {
    document.exitFullscreen();
    btnFull.textContent = 'Fullscreen';
    showSpeech('Exited fullscreen');
  }
  setTimeout(() => bubble.classList.add('hidden'), 2000);
}

function onWindowResize() {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}