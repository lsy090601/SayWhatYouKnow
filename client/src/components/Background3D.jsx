// Three.js로 움직이는 배경을 그리며 포인터 위치에 따라 별과 도형을 움직입니다.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const STAR_COUNT = 900;
const ACCENT = 0xe0965a;
const ACCENT_SOFT = 0xf2b482;
const REPEL_RADIUS = 0.35; // 커서 주변 별이 밀려나는 반경 (화면 비율 기준)
const REPEL_FORCE = 1.6;

// 별의 위치를 배열에 저장해 한 번에 렌더링합니다.
function makeStars() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(STAR_COUNT * 3);
  const col = new Float32Array(STAR_COUNT * 3);
  const warm = new THREE.Color(ACCENT_SOFT);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < STAR_COUNT; i++) {
    pos[i * 3] = (rand() - 0.5) * 60;
    pos[i * 3 + 1] = (rand() - 0.5) * 40;
    pos[i * 3 + 2] = -rand() * 50;
    const c = white.clone().lerp(warm, rand() * 0.6);
    const k = 0.35 + rand() * 0.65;
    col[i * 3] = c.r * k;
    col[i * 3 + 1] = c.g * k;
    col[i * 3 + 2] = c.b * k;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.userData = { base: pos.slice(), offset: new Float32Array(STAR_COUNT * 2) };
  return points;
}

// 배경에 띄울 장식 도형을 생성합니다.
function makeShapes() {
  const group = new THREE.Group();
  const defs = [
    { geo: new THREE.IcosahedronGeometry(2.2, 1), pos: [-9, 3, -14], speed: 0.12 },
    { geo: new THREE.TorusGeometry(1.8, 0.35, 12, 36), pos: [10, -3, -18], speed: -0.1 },
    { geo: new THREE.OctahedronGeometry(1.5, 0), pos: [6, 6, -24], speed: 0.16 },
  ];
  defs.forEach(({ geo, pos, speed }, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: i === 0 ? ACCENT_SOFT : ACCENT, wireframe: true, transparent: true, opacity: 0.22 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.userData = { speed, base: pos, phase: i * 2 };
    group.add(mesh);
  });
  return group;
}

function makeCursorGlow() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,214,170,0.9)');
  g.addColorStop(0.25, 'rgba(240,160,100,0.35)');
  g.addColorStop(1, 'rgba(240,160,100,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  sprite.scale.set(3, 3, 1);
  return sprite;
}

export default function Background3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return undefined; // WebGL 미지원: 기존 CSS 글로우만 보임
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 8;

    const stars = makeStars();
    const shapes = makeShapes();
    const glow = makeCursorGlow();
    scene.add(stars, shapes, glow);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // mouse: NDC 좌표(-1~1, 위가 +), look: 부드럽게 따라가는 값
    const mouse = { x: 0, y: 0, active: false };
    const look = { x: 0, y: 0 };
    const v = new THREE.Vector3();

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);

    const repelStars = () => {
      const { base, offset } = stars.userData;
      const attr = stars.geometry.attributes.position;
      const arr = attr.array;
      for (let i = 0; i < STAR_COUNT; i++) {
        let tx = 0;
        let ty = 0;
        if (mouse.active) {
          v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).applyMatrix4(stars.matrixWorld).project(camera);
          const dx = (v.x - mouse.x) * camera.aspect;
          const dy = v.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < REPEL_RADIUS && d > 0.0001) {
            const depth = 1 + -base[i * 3 + 2] * 0.08; // 먼 별일수록 월드 단위로 더 크게 밀어야 화면상 비슷하게 보임
            const push = (1 - d / REPEL_RADIUS) ** 2 * REPEL_FORCE * depth;
            tx = (dx / d) * push;
            ty = (dy / d) * push;
          }
        }
        offset[i * 2] += (tx - offset[i * 2]) * 0.08;
        offset[i * 2 + 1] += (ty - offset[i * 2 + 1]) * 0.08;
        arr[i * 3] = base[i * 3] + offset[i * 2];
        arr[i * 3 + 1] = base[i * 3 + 1] + offset[i * 2 + 1];
      }
      attr.needsUpdate = true;
    };

    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      // 동작 줄이기 설정이면 자동 회전·출렁임만 멈추고, 마우스 반응은 유지
      const t = reduced ? 0 : clock.getElapsedTime();
      look.x += (mouse.x - look.x) * 0.06;
      look.y += (mouse.y - look.y) * 0.06;
      camera.position.x = look.x * 3;
      camera.position.y = look.y * 2;
      camera.lookAt(0, 0, -10);

      stars.rotation.z = t * 0.01 + look.x * 0.04;
      stars.rotation.y = Math.sin(t * 0.05) * 0.08;
      stars.updateMatrixWorld();
      repelStars();

      shapes.children.forEach((m) => {
        const { speed, base, phase } = m.userData;
        // 커서 쪽으로 살짝 끌려오고, 커서 방향으로 기울어짐
        m.position.x = base[0] + look.x * 1.5;
        m.position.y = base[1] + look.y * 1.2 + Math.sin(t * 0.4 + phase) * 0.6;
        m.rotation.x = t * speed - look.y * 0.8;
        m.rotation.y = t * speed * 1.3 + look.x * 0.8;
      });

      // 커서 위치(z=0 평면)에 빛 띄우기
      v.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(camera.position).normalize();
      const dist = -camera.position.z / v.z;
      glow.position.copy(camera.position).addScaledVector(v, dist);
      glow.material.opacity += ((mouse.active ? 0.55 : 0) - glow.material.opacity) * 0.08;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      scene.traverse((o) => {
        o.geometry?.dispose();
        o.material?.map?.dispose();
        o.material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="bg-3d" aria-hidden="true" />;
}
