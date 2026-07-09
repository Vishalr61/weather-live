import {
  AdditiveBlending,
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  MeshPhongMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from 'three';
import type { Object3D, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getSubsolarPoint, latLngToVector3 } from './geoMath.ts';
import { weatherCodeToColor } from './weatherVisuals.ts';
import type { City, GlobalAlertPayload, WeatherSnapshotPayload } from '../types.ts';

const GLOBE_RADIUS = 5;
const MARKER_RADIUS = GLOBE_RADIUS * 1.02;
const SUN_DISTANCE = 30;

export interface GlobeHandle {
  dispose(): void;
  setCities(cities: City[]): void;
  updateSnapshot(snapshot: WeatherSnapshotPayload): void;
  triggerRipple(alert: GlobalAlertPayload): void;
  setSelectedCity(cityId: string | null): void;
  setWatchedCities(cityIds: string[]): void;
  flyToCity(cityId: string): void;
  onCityClick(cb: (cityId: string) => void): void;
  resize(): void;
}

interface MarkerRecord {
  cityId: string;
  sprite: Sprite;
  baseColor: Color;
  pulsing: boolean;
}

interface RippleRecord {
  sprite: Sprite;
  startedAt: number;
}

const RIPPLE_DURATION_MS = 2500;
const FLIGHT_DURATION_MS = 1200;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function createGlowTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createRingTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const center = size / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center, center, center - 8, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createGlobe(container: HTMLDivElement): GlobeHandle {
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 14);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 25;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  const ambientLight = new AmbientLight(0x404050, 1.4);
  const sunLight = new DirectionalLight(0xffffff, 2.2);
  scene.add(ambientLight, sunLight);

  const textureLoader = new TextureLoader();
  const dayMap = textureLoader.load('/textures/earth_atmos_2048.jpg');
  const nightMap = textureLoader.load('/textures/earth_lights_2048.png');
  const normalMap = textureLoader.load('/textures/earth_normal_2048.jpg');
  const specularMap = textureLoader.load('/textures/earth_specular_2048.jpg');
  dayMap.colorSpace = SRGBColorSpace;
  nightMap.colorSpace = SRGBColorSpace;

  const earthMaterial = new MeshPhongMaterial({
    map: dayMap,
    emissiveMap: nightMap,
    emissive: new Color(0xffffff),
    emissiveIntensity: 0.9,
    normalMap,
    specularMap,
    shininess: 18,
  });
  const earth = new Mesh(new SphereGeometry(GLOBE_RADIUS, 64, 64), earthMaterial);
  scene.add(earth);

  const glowTexture = createGlowTexture();
  const ringTexture = createRingTexture();
  const markerColorCache = new Map<string, Color>();

  const markersGroup: Object3D[] = [];
  const markers = new Map<string, MarkerRecord>();
  const ripples: RippleRecord[] = [];
  const watchRings = new Map<string, Sprite>();
  let selectedCityId: string | null = null;
  let onClickCallback: ((cityId: string) => void) | null = null;
  let flight: { startDir: Vector3; targetDir: Vector3; startedAt: number } | null = null;

  function clearMarkers() {
    for (const obj of markersGroup) {
      earth.remove(obj);
    }
    markersGroup.length = 0;
    markers.clear();
    for (const sprite of watchRings.values()) {
      earth.remove(sprite);
      (sprite.material as SpriteMaterial).dispose();
    }
    watchRings.clear();
  }

  function setCities(cities: City[]) {
    clearMarkers();
    for (const city of cities) {
      const material = new SpriteMaterial({
        map: glowTexture,
        color: 0xfde68a,
        depthTest: false,
        blending: AdditiveBlending,
        transparent: true,
      });
      const sprite = new Sprite(material);
      sprite.position.copy(latLngToVector3(city.lat, city.lng, MARKER_RADIUS));
      sprite.scale.setScalar(0.4);
      sprite.userData.cityId = city.id;
      earth.add(sprite);
      markersGroup.push(sprite);
      markers.set(city.id, { cityId: city.id, sprite, baseColor: new Color(0xfde68a), pulsing: false });
    }
  }

  function updateSnapshot(snapshot: WeatherSnapshotPayload) {
    for (const cityData of snapshot.cities) {
      const marker = markers.get(cityData.cityId);
      if (!marker) continue;
      let color = markerColorCache.get(`${cityData.weatherCode}`);
      if (!color) {
        color = weatherCodeToColor(cityData.weatherCode);
        markerColorCache.set(`${cityData.weatherCode}`, color);
      }
      marker.baseColor = color;
      (marker.sprite.material as SpriteMaterial).color.copy(color);
      marker.pulsing = cityData.severity !== 'none';
    }
  }

  function triggerRipple(alert: GlobalAlertPayload) {
    const material = new SpriteMaterial({
      map: ringTexture,
      color: alert.severity === 'severe' ? 0xef4444 : 0xf59e0b,
      depthTest: false,
      transparent: true,
      opacity: 1,
    });
    const sprite = new Sprite(material);
    sprite.position.copy(latLngToVector3(alert.lat, alert.lng, MARKER_RADIUS));
    sprite.scale.setScalar(0.5);
    earth.add(sprite);
    ripples.push({ sprite, startedAt: performance.now() });
  }

  function setSelectedCity(cityId: string | null) {
    selectedCityId = cityId;
  }

  // A persistent, static ring (unlike the animated ripple) around every
  // watched city — distinct from the "selected" highlight, so you can see
  // your whole watchlist on the globe at a glance, not just what's currently
  // in the detail panel.
  function setWatchedCities(cityIds: string[]) {
    const next = new Set(cityIds);

    for (const [cityId, sprite] of watchRings) {
      if (!next.has(cityId)) {
        earth.remove(sprite);
        (sprite.material as SpriteMaterial).dispose();
        watchRings.delete(cityId);
      }
    }

    for (const cityId of next) {
      if (watchRings.has(cityId)) continue;
      const marker = markers.get(cityId);
      if (!marker) continue;

      const material = new SpriteMaterial({
        map: ringTexture,
        color: 0x93c5fd,
        depthTest: false,
        transparent: true,
        opacity: 0.85,
      });
      const sprite = new Sprite(material);
      sprite.position.copy(marker.sprite.position);
      sprite.scale.setScalar(0.7);
      earth.add(sprite);
      watchRings.set(cityId, sprite);
    }
  }

  // Animates the camera around the (stationary) globe so the given city ends
  // up facing the viewer — used when a city is picked via search/dropdown,
  // where it may currently be on the far side. Not used for a direct marker
  // click, since the user is already looking at it.
  function flyToCity(cityId: string) {
    const marker = markers.get(cityId);
    if (!marker) return;
    controls.autoRotate = false;
    flight = {
      startDir: camera.position.clone().normalize(),
      targetDir: marker.sprite.position.clone().normalize(),
      startedAt: performance.now(),
    };
  }

  function onCityClick(cb: (cityId: string) => void) {
    onClickCallback = cb;
  }

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let pointerDownPos: Vector2 | null = null;

  function toPointer(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function handlePointerDown(event: PointerEvent) {
    pointerDownPos = new Vector2(event.clientX, event.clientY);
  }

  function handlePointerUp(event: PointerEvent) {
    if (!pointerDownPos) return;
    const moved = pointerDownPos.distanceTo(new Vector2(event.clientX, event.clientY));
    pointerDownPos = null;
    if (moved > 5) return; // drag-rotate, not a click

    toPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markersGroup, false);
    if (hits.length > 0) {
      const cityId = hits[0].object.userData.cityId as string;
      onClickCallback?.(cityId);
    }
  }

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let animationFrame: number;
  function animate() {
    animationFrame = requestAnimationFrame(animate);

    const subsolar = getSubsolarPoint(new Date());
    sunLight.position.copy(latLngToVector3(subsolar.lat, subsolar.lng, SUN_DISTANCE));

    const now = performance.now();
    for (const marker of markers.values()) {
      const isSelected = marker.cityId === selectedCityId;
      let scale = isSelected ? 0.65 : 0.4;
      if (marker.pulsing) {
        scale *= 1 + 0.25 * Math.sin(now / 220);
      }
      marker.sprite.scale.setScalar(scale);
      (marker.sprite.material as SpriteMaterial).color.copy(
        isSelected ? new Color(0xffffff) : marker.baseColor
      );
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      const elapsed = now - ripple.startedAt;
      const t = elapsed / RIPPLE_DURATION_MS;
      if (t >= 1) {
        earth.remove(ripple.sprite);
        (ripple.sprite.material as SpriteMaterial).dispose();
        ripples.splice(i, 1);
        continue;
      }
      ripple.sprite.scale.setScalar(0.5 + t * 3);
      (ripple.sprite.material as SpriteMaterial).opacity = 1 - t;
    }

    if (flight) {
      const t = Math.min(1, (now - flight.startedAt) / FLIGHT_DURATION_MS);
      const eased = easeInOutCubic(t);
      const distance = camera.position.length();
      const dir = flight.startDir.clone().lerp(flight.targetDir, eased).normalize();
      camera.position.copy(dir.multiplyScalar(distance));
      camera.lookAt(0, 0, 0);
      if (t >= 1) flight = null;
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function dispose() {
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
    renderer.domElement.removeEventListener('pointerup', handlePointerUp);
    controls.dispose();

    clearMarkers();
    for (const ripple of ripples) {
      earth.remove(ripple.sprite);
      (ripple.sprite.material as SpriteMaterial).dispose();
    }
    ripples.length = 0;

    glowTexture.dispose();
    ringTexture.dispose();
    dayMap.dispose();
    nightMap.dispose();
    normalMap.dispose();
    specularMap.dispose();
    earthMaterial.dispose();
    earth.geometry.dispose();

    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return {
    dispose,
    setCities,
    updateSnapshot,
    triggerRipple,
    setSelectedCity,
    setWatchedCities,
    flyToCity,
    onCityClick,
    resize,
  };
}
