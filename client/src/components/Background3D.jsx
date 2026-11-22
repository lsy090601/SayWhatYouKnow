// Three.js로 움직이는 배경을 그리며 포인터 위치에 따라 별과 도형을 움직입니다.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 화면에 그릴 별의 개수
const STAR_COUNT = 900;
// 테마와 맞춘 강조 색상
const ACCENT = 0xe0965a;
const ACCENT_SOFT = 0xf2b482;
const REPEL_RADIUS = 0.35; // 커서 주변 별이 밀려나는 반경 (화면 비율 기준)
// 커서가 별을 밀어내는 힘의 세기
const REPEL_FORCE = 1.6;

// 별의 위치를 배열에 저장해 한 번에 렌더링합니다.
function makeStars() {
  // 시드를 고정한 난수 생성기로 렌더링할 때마다 같은 별 배치를 만듭니다.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 별마다 x, y, z 또는 r, g, b 세 값을 저장합니다.
  const pos = new Float32Array(STAR_COUNT * 3);
  const col = new Float32Array(STAR_COUNT * 3);
  const warm = new THREE.Color(ACCENT_SOFT);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < STAR_COUNT; i++) {
    // 별을 카메라 앞쪽의 넓은 공간에 흩뿌립니다.
    pos[i * 3] = (rand() - 0.5) * 60;
    pos[i * 3 + 1] = (rand() - 0.5) * 40;
    pos[i * 3 + 2] = -rand() * 50;
    // 흰색과 따뜻한 색을 섞고 밝기를 무작위로 조절합니다.
    const c = white.clone().lerp(warm, rand() * 0.6);
    const k = 0.35 + rand() * 0.65;
    col[i * 3] = c.r * k;
    col[i * 3 + 1] = c.g * k;
    col[i * 3 + 2] = c.b * k;
  }
  // 위치와 색상 배열을 하나의 지오메트리로 묶습니다.
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  // 커서 효과 계산을 위해 원래 위치와 x, y 밀림 값을 보관합니다.
  points.userData = { base: pos.slice(), offset: new Float32Array(STAR_COUNT * 2) };
  return points;
}

// 배경에 띄울 장식 도형을 생성합니다.
function makeShapes() {
  const group = new THREE.Group();
  // 도형의 형태, 위치, 회전 속도를 정의합니다.
  const defs = [
    { geo: new THREE.IcosahedronGeometry(2.2, 1), pos: [-9, 3, -14], speed: 0.12 },
    { geo: new THREE.TorusGeometry(1.8, 0.35, 12, 36), pos: [10, -3, -18], speed: -0.1 },
    { geo: new THREE.OctahedronGeometry(1.5, 0), pos: [6, 6, -24], speed: 0.16 },
  ];
  // 반투명 와이어프레임 메시를 만들어 그룹에 추가합니다.
  defs.forEach(({ geo, pos, speed }, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: i === 0 ? ACCENT_SOFT : ACCENT, wireframe: true, transparent: true, opacity: 0.22 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.userData = { speed, base: pos, phase: i * 2 };
    group.add(mesh);
  });
  return group;
}

// 커서 위치에 표시할 빛 스프라이트를 만듭니다.
function makeCursorGlow() {
  const size = 128;
  // 원형 그라데이션을 캔버스에 그려 텍스처로 사용합니다.
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
  // 처음에는 투명하게 두고 커서가 움직이면 서서히 나타냅니다.
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  sprite.scale.set(3, 3, 1);
  return sprite;
}

// 화면 전체 뒤에 고정되는 Three.js 배경 컴포넌트입니다.
export default function Background3D() {
  const mountRef = useRef(null);

  // 마운트 시 3D 장면을 한 번 구성하고 언마운트 시 정리합니다.
  useEffect(() => {
    const mount = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return undefined; // WebGL 미지원: 기존 CSS 글로우만 보임
    }
    // 고해상도 화면의 부담을 줄이려고 픽셀 비율을 최대 2로 제한합니다.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // 캔버스를 투명하게 지워 뒤쪽 CSS 배경이 보이게 합니다.
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // 장면과 카메라를 만듭니다.
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 8;

    // 별, 도형, 커서 빛을 장면에 추가합니다.
    const stars = makeStars();
    const shapes = makeShapes();
    const glow = makeCursorGlow();
    scene.add(stars, shapes, glow);

    // 운영체제의 동작 줄이기 설정을 확인합니다.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // mouse: NDC 좌표(-1~1, 위가 +), look: 부드럽게 따라가는 값
    const mouse = { x: 0, y: 0, active: false };
    const look = { x: 0, y: 0 };
    // 프레임마다 객체를 새로 만들지 않도록 재사용하는 벡터입니다.
    const v = new THREE.Vector3();

    // 컨테이너 크기에 맞춰 렌더러와 카메라 비율을 갱신합니다.
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    // 포인터 좌표를 NDC 좌표로 변환합니다.
    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
      mouse.active = true;
    };
    // 포인터가 문서를 벗어나면 커서 효과를 끕니다.
    const onLeave = () => { mouse.active = false; };
    resize();
    // 창 크기 변경과 포인터 이동을 감지합니다.
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);

    // 커서 주변의 별을 바깥쪽으로 밀어내는 위치 값을 계산합니다.
    const repelStars = () => {
      const { base, offset } = stars.userData;
      const attr = stars.geometry.attributes.position;
      const arr = attr.array;
      for (let i = 0; i < STAR_COUNT; i++) {
        // 이번 프레임의 목표 밀림 값입니다. 커서에서 멀면 0입니다.
        let tx = 0;
        let ty = 0;
        if (mouse.active) {
          // 별의 원래 위치를 화면 좌표로 변환합니다.
          v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]).applyMatrix4(stars.matrixWorld).project(camera);
          // 가로세로 비율을 보정해 화면에서 원형에 가까운 거리로 계산합니다.
          const dx = (v.x - mouse.x) * camera.aspect;
          const dy = v.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < REPEL_RADIUS && d > 0.0001) {
            const depth = 1 + -base[i * 3 + 2] * 0.08; // 먼 별일수록 월드 단위로 더 크게 밀어야 화면상 비슷하게 보임
            // 커서에 가까울수록 더 강하게 밀어냅니다.
            const push = (1 - d / REPEL_RADIUS) ** 2 * REPEL_FORCE * depth;
            tx = (dx / d) * push;
            ty = (dy / d) * push;
          }
        }
        // 목표 값으로 조금씩 이동해 부드럽게 밀리고 돌아오게 합니다.
        offset[i * 2] += (tx - offset[i * 2]) * 0.08;
        offset[i * 2 + 1] += (ty - offset[i * 2 + 1]) * 0.08;
        arr[i * 3] = base[i * 3] + offset[i * 2];
        arr[i * 3 + 1] = base[i * 3 + 1] + offset[i * 2 + 1];
      }
      // 변경한 위치 배열을 GPU에 다시 전달합니다.
      attr.needsUpdate = true;
    };

    // 애니메이션 시간과 requestAnimationFrame ID를 관리합니다.
    const clock = new THREE.Clock();
    let raf = 0;
    // 매 프레임 장면을 갱신하고 그리는 루프입니다.
    const render = () => {
      // 동작 줄이기 설정이면 자동 회전·출렁임만 멈추고, 마우스 반응은 유지
      const t = reduced ? 0 : clock.getElapsedTime();
      // 커서를 천천히 따라가는 값을 계산합니다.
      look.x += (mouse.x - look.x) * 0.06;
      look.y += (mouse.y - look.y) * 0.06;
      // 커서 방향으로 카메라를 옮겨 시차 효과를 만듭니다.
      camera.position.x = look.x * 3;
      camera.position.y = look.y * 2;
      camera.lookAt(0, 0, -10);

      // 별 전체를 천천히 회전시키고 커서 효과를 적용합니다.
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

    // 언마운트 시 애니메이션, 이벤트, GPU 자원을 정리합니다.
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

  // 3D 캔버스를 넣을 컨테이너입니다. 장식 요소이므로 보조 기술에서는 숨깁니다.
  return <div ref={mountRef} className="bg-3d" aria-hidden="true" />;
}
