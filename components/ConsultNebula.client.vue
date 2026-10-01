<script setup lang="ts">
import * as THREE from "three";
import { ChevronLeft, ChevronRight, Coins } from "@lucide/vue";
import {
  starsInGroup,
  type ConsultStar,
  type ConsultStarGroup,
} from "~/utils/consult-star-pool";
import {
  consultQuestionSuggestions,
  pickQuestionSuggestions,
} from "~/utils/question-suggestions";
import star01Image from "~/assets/images/01.png";
import star02Image from "~/assets/images/02.png";
import star03Image from "~/assets/images/03.png";
import star04Image from "~/assets/images/04.png";
import star05Image from "~/assets/images/05.png";
import star06Image from "~/assets/images/06.png";
import star07Image from "~/assets/images/07.png";
import star08Image from "~/assets/images/08.png";
import star09Image from "~/assets/images/09.png";
import star10Image from "~/assets/images/10.png";
import star11Image from "~/assets/images/11.png";
import star12Image from "~/assets/images/12.png";
import star13Image from "~/assets/images/13.png";
import star14Image from "~/assets/images/14.png";

type Polarity = "陽" | "陰";
type Transformation = "化祿" | "化權" | "化科" | "化忌";
type ConsultCardKey =
  | "main_star"
  | "assistant_star"
  | "minor_star_1"
  | "minor_star_2"
  | "life_stage";
type DrawCard = ConsultStar & {
  id: number;
  color: string;
  key: ConsultCardKey;
  image?: string;
  polarity?: Polarity;
  transformation?: Transformation;
};
type Meteor = {
  head: THREE.Sprite;
  trail: THREE.Mesh;
  trailPositions: Float32Array;
  delay: number;
  duration: number;
  lane: number;
};

const host = ref<HTMLElement | null>(null);
const isDevMode = import.meta.dev;
const unavailable = ref(false);
const drawing = ref(false);
const cards = ref<DrawCard[]>([]);
const activeCard = ref(0);
const revealing = ref(false);
const flash = ref(false);
const pointerStart = ref<number | null>(null);
const question = ref("");
const suggestions = ref<string[]>([]);
const auth = useAuthStore();
const activeAnalysis = useActiveAnalysisStore();
const showPointsConfirm = ref(false);
const chargeMode = ref<"quota" | "points">("points");
const requestingReading = ref(false);
const startingReading = ref(false);
const startError = ref("");
let scene: THREE.Scene | undefined;
let camera: THREE.PerspectiveCamera | undefined;
let renderer: THREE.WebGLRenderer | undefined;
let galaxy: THREE.Group | undefined;
let starField: THREE.Points | undefined;
let sceneScale = 0.72;
let frameId = 0;
let resizeObserver: ResizeObserver | undefined;
let sceneTime = 0;
let drawStartedAt = 0;
let drawFinished = false;
let meteors: Meteor[] = [];
let pendingCards: DrawCard[] = [];
let flashTimer: number | undefined;
let revealTimer: number | undefined;
let mouseX = 0;
let mouseY = 0;
const clock = new THREE.Clock();

const majorStarImages: Record<string, string> = {
  紫微: star01Image,
  天機: star02Image,
  武曲: star03Image,
  天同: star04Image,
  廉貞: star05Image,
  天府: star06Image,
  太陰: star07Image,
  貪狼: star08Image,
  巨門: star09Image,
  天相: star10Image,
  天梁: star11Image,
  七殺: star12Image,
  破軍: star13Image,
  太陽: star14Image,
};

const starVertexShader = `
attribute float aSize;
attribute float aPhase;
attribute float aSpeed;
attribute float aMotion;
uniform float uTime;
varying float vBrightness;
void main() {
  vec3 animated = position;
  float direction = aMotion < 1.5 ? 1.0 : -1.0;
  float moving = aMotion < 3.5 ? 1.0 : 0.0;
  float orbitSpeed = aMotion < 0.5 ? 0.2 : (aMotion < 1.5 ? 0.11 : (aMotion < 2.5 ? 0.16 : 0.055));
  float orbit = (uTime * orbitSpeed * direction * (0.72 + aSpeed * 0.09) + aPhase * 0.08) * moving;
  float c = cos(orbit), s = sin(orbit);
  animated.xz = mat2(c, -s, s, c) * animated.xz;
  float tumble = aMotion > 2.5 && aMotion < 3.5 ? sin(uTime * 0.23 + aPhase) * 0.24 : 0.0;
  animated.xy = mat2(cos(tumble), -sin(tumble), sin(tumble), cos(tumble)) * animated.xy;
  vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
  float twinkle = 0.56 + 0.44 * sin(uTime * aSpeed + aPhase);
  vBrightness = twinkle;
  gl_PointSize = aSize * twinkle * (34.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`;
const starFragmentShader = `
varying float vBrightness;
void main() {
  vec2 point = gl_PointCoord - vec2(0.5);
  float d = length(point);
  float glow = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.12, 0.0, d);
  vec3 tea = vec3(0.705882, 0.607843, 0.458824);
  gl_FragColor = vec4(tea, (glow * 0.62 + core * 0.38) * vBrightness);
}`;
const nebulaVertexShader = `
uniform float uTime;
uniform float uSeed;
varying vec3 vNormalWorld;
varying vec3 vPosition;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
void main() {
  vec3 p = position;
  float twist = p.y * 0.34 + uTime * 0.055;
  p.xz = mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*p.xz;
  float angular = atan(p.z, p.x);
  float ridges = sin(angular * 7.0 + p.y * 1.45 + uSeed) * 0.15
    + sin(angular * 11.0 - p.y * 0.82) * 0.075;
  float displacement = (noise(normal * 2.2 + p.y * 0.38 + uSeed + uTime * 0.025) - 0.5) * 0.54 + ridges;
  p += normal * displacement;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vPosition = world.xyz;
  vNormalWorld = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const nebulaFragmentShader = `
uniform float uTime;
uniform float uSeed;
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vNormalWorld;
varying vec3 vPosition;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
  float value=0.0, amplitude=0.52;
  for(int i=0;i<4;i++){ value+=amplitude*noise(p); p=p*2.03+17.7; amplitude*=0.5; }
  return value;
}
void main() {
  vec3 flow=vPosition*0.72+vec3(uTime*0.018,-uTime*0.012,uSeed*2.1);
  float cloud=fbm(flow)+0.38*fbm(flow*2.4-uTime*0.02);
  vec3 viewDirection=normalize(cameraPosition-vPosition);
  float fresnel=pow(1.0-abs(dot(normalize(vNormalWorld),viewDirection)),2.4);
  float breakup=smoothstep(0.25,0.9,cloud);
  float alpha=(0.055+fresnel*0.22)*breakup*uOpacity;
  vec3 color=mix(uColor*0.72,uColor*1.22,cloud+fresnel*0.08);
  gl_FragColor=vec4(color,alpha);
}`;

function circularGlowTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const center = 128;
  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    122,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.1, color);
  gradient.addColorStop(0.38, `${color}77`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function init() {
  const element = host.value;
  if (!element) return;
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 12);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    galaxy = new THREE.Group();
    scene.add(galaxy);
    createNebula();
    createStars();
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pointermove", handleParallax, { passive: true });
    clock.start();
    animate();
  } catch {
    unavailable.value = true;
    dispose();
  }
}

function createNebula() {
  if (!galaxy) return;
  const profile: THREE.Vector2[] = [];
  const profileSteps = 26;
  for (let index = 0; index <= profileSteps; index++) {
    const normalized = index / profileSteps;
    const y = (normalized - 0.5) * 5.8;
    const middle = Math.sin(normalized * Math.PI);
    const radius = 0.24 + Math.pow(middle, 0.7) * 2.35;
    const ripple =
      (Math.sin(normalized * Math.PI * 7.0) * 0.14 +
        Math.sin(normalized * Math.PI * 13.0) * 0.055) *
      middle;
    profile.push(new THREE.Vector2(radius + ripple, y));
  }
  const smoothGeometry = new THREE.LatheGeometry(profile, 42);
  const geometry = smoothGeometry.toNonIndexed();
  geometry.computeVertexNormals();
  smoothGeometry.dispose();
  const cloudColor = "#6ba6a0";
  const layerOpacity = [0.44, 0.36, 0.42];
  const layerScale = [1.08, 0.82, 0.62];
  for (let index = 0; index < 3; index++) {
    const material = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: index * 2.31 + 0.7 },
        uColor: { value: new THREE.Color(cloudColor) },
        uOpacity: { value: layerOpacity[index] },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
    const cloud = new THREE.Mesh(geometry.clone(), material);
    cloud.rotation.set(0.08, index * 0.42, index ? 0.025 : -0.035);
    cloud.scale.setScalar(layerScale[index]!);
    galaxy.add(cloud);
  }
  geometry.dispose();
}

function createStars() {
  if (!galaxy) return;
  const count = 1250;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const motions = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const yNormalized = Math.random() * 2 - 1;
    const y = yNormalized * 2.9;
    const width = 0.46 + Math.pow(1 - Math.abs(yNormalized), 0.62) * 2.42;
    const scatter = Math.random() < 0.2 ? 1.15 + Math.random() * 0.18 : 1;
    const radius = Math.pow(Math.random(), 0.46) * width * scatter;
    const angle = Math.random() * Math.PI * 2 + y * 1.12;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = y + (Math.random() - 0.5) * 0.22;
    positions[index * 3 + 2] = Math.sin(angle) * radius * 0.82;
    sizes[index] = 1.3 + Math.pow(Math.random(), 3) * 8.5;
    phases[index] = Math.random() * Math.PI * 2;
    speeds[index] = 1.1 + Math.random() * 4.5;
    const motionSeed = Math.random();
    motions[index] =
      motionSeed < 0.35 ? 0 : motionSeed < 0.6 ? 2 : motionSeed < 0.8 ? 3 : 4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aMotion", new THREE.BufferAttribute(motions, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  starField = new THREE.Points(geometry, material);
  starField.rotation.x = 0.12;
  scene?.add(starField);
}

function resize() {
  if (!host.value || !renderer || !camera) return;
  const bounds = host.value.getBoundingClientRect();
  if (bounds.width < 2 || bounds.height < 2) return;
  renderer.setSize(bounds.width, bounds.height, false);
  camera.aspect = bounds.width / bounds.height;
  camera.updateProjectionMatrix();
  const visibleHeight =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const visibleWidth = visibleHeight * camera.aspect;
  const widthRatio = bounds.width < 760 ? 1.02 : 0.84;
  sceneScale = Math.min(
    (visibleWidth * widthRatio) / 5.9,
    (visibleHeight * 0.64) / 5.8,
  );
  galaxy?.scale.setScalar(sceneScale);
  starField?.scale.setScalar(sceneScale);
}

function animate() {
  if (!renderer || !scene || !camera) return;
  frameId = requestAnimationFrame(animate);
  sceneTime += Math.min(clock.getDelta(), 0.05);
  const boost = drawing.value ? 2.8 : 1;
  if (galaxy) {
    galaxy.rotation.y += 0.00125 * boost;
    galaxy.rotation.z += 0.00008 * boost;
    galaxy.rotation.x += (0.12 + mouseY * 0.045 - galaxy.rotation.x) * 0.018;
    galaxy.position.x += (mouseX * 0.34 - galaxy.position.x) * 0.018;
    const pulse = drawing.value ? 1 + Math.sin(sceneTime * 8) * 0.035 : 1;
    galaxy.scale.setScalar(sceneScale * pulse);
    galaxy.children.forEach((child, index) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.ShaderMaterial
      ) {
        child.material.uniforms.uTime!.value = sceneTime;
        child.rotation.y += (index % 2 ? -1 : 1) * 0.00034;
      }
    });
  }
  if (starField?.material instanceof THREE.ShaderMaterial)
    starField.material.uniforms.uTime!.value = sceneTime;
  if (starField) {
    starField.scale.setScalar(sceneScale);
    starField.position.x += (mouseX * 0.12 - starField.position.x) * 0.012;
  }
  if (drawing.value) updateDraw(performance.now() - drawStartedAt);
  renderer.render(scene, camera);
}

function submitQuestion() {
  if (!question.value.trim() || drawing.value || cards.value.length) return;
  void requestReading();
}

function beginDraw(drawCards = createDrawCards()) {
  if (drawing.value || unavailable.value || !scene) return;
  if (revealTimer) clearTimeout(revealTimer);
  clearMeteors();
  cards.value = [];
  activeCard.value = 0;
  revealing.value = false;
  flash.value = false;
  drawFinished = false;
  pendingCards = drawCards;
  drawing.value = true;
  drawStartedAt = performance.now();
  const count = pendingCards.length;
  pendingCards.forEach((card, index) => createMeteor(card.color, index, count));
}

function createDrawCards() {
  const definitions: Array<{
    group: ConsultStarGroup;
    color: string;
    key: ConsultCardKey;
  }> = [
    { group: "主星", color: "#b85b4b", key: "main_star" },
    { group: "輔星", color: "#b49b75", key: "assistant_star" },
    { group: "雜曜", color: "#6ba6a0", key: "minor_star_1" },
    { group: "雜曜", color: "#6ba6a0", key: "minor_star_2" },
    { group: "長生十二神", color: "#c8ae78", key: "life_stage" },
  ];
  const transformations: Transformation[] = ["化祿", "化權", "化科", "化忌"];
  const transformationRoll = Math.floor(Math.random() * 16);
  const usedNames = new Set<string>();
  return definitions.map(({ group, color, key }, index) => {
    const candidates = starsInGroup(group).filter(
      (star) => !usedNames.has(star.name),
    );
    const star = candidates[Math.floor(Math.random() * candidates.length)]!;
    usedNames.add(star.name);
    return {
      ...star,
      id: Date.now() + index,
      color,
      key,
      ...(group === "主星" ? { image: majorStarImages[star.name] } : {}),
      ...(group !== "長生十二神"
        ? { polarity: Math.random() < 0.5 ? ("陽" as const) : ("陰" as const) }
        : {}),
      ...(group === "主星" && transformationRoll < 4
        ? { transformation: transformations[transformationRoll] }
        : {}),
    };
  });
}

function consultPayload(sourceCards: DrawCard[]) {
  const keyedCards = Object.fromEntries(
    sourceCards.map((card) => [
      card.key,
      {
        group: card.group,
        name: card.name,
        ...(card.polarity ? { polarity: card.polarity } : {}),
        ...(card.transformation ? { transformation: card.transformation } : {}),
      },
    ]),
  );
  return { question: question.value.trim(), cards: keyedCards };
}

function cancelReading() {
  if (startingReading.value) return;
  cards.value = [];
  pendingCards = [];
  activeCard.value = 0;
  startError.value = "";
}

function redrawInDev() {
  if (!isDevMode || drawing.value || startingReading.value) return;
  cancelReading();
  beginDraw();
}

function transformationLabel(value: Transformation) {
  return value.replace(/^化/, "");
}

async function requestReading() {
  if (requestingReading.value || startingReading.value) return;
  requestingReading.value = true;
  startError.value = "";
  try {
    if (!(await auth.verifyOnlineAccess())) return;
    await auth.loadBilling({ fallbackToCache: false });
    chargeMode.value =
      auth.premium && auth.membershipQuotaRemaining > 0 ? "quota" : "points";
    showPointsConfirm.value = true;
  } catch (reason) {
    startError.value =
      reason instanceof Error
        ? reason.message
        : "目前無法確認可用額度，請稍後再試。";
  } finally {
    requestingReading.value = false;
  }
}

async function startReading(usePointsFallback: boolean) {
  if (startingReading.value) return;
  if (usePointsFallback && auth.points < 100) return navigateTo("/store");
  startingReading.value = true;
  showPointsConfirm.value = false;
  const drawCards = createDrawCards();
  const consult = consultPayload(drawCards);
  const chatId = crypto.randomUUID();
  try {
    const started = await activeAnalysis.begin("consult", `consult:${chatId}`, {
      consult,
      chatId,
      action: "initial",
      usePointsFallback,
      navigationLocked: true,
    });
    if (!started) return;
    beginDraw(drawCards);
    const reading = activeAnalysis.runStep({
      analysis_type: "consult",
      analysisType: "consult",
      consult_action: "initial",
      chat_id: chatId,
      consult,
      use_points_fallback: usePointsFallback,
      language: "zh-Hant",
    });
    void reading
      .catch((reason) => {
        startError.value =
          reason instanceof Error
            ? reason.message
            : "解牌啟動失敗，請稍後再試。";
      })
      .finally(() => auth.loadBilling());
  } catch (reason) {
    startError.value =
      reason instanceof Error ? reason.message : "解牌啟動失敗，請稍後再試。";
  } finally {
    startingReading.value = false;
  }
}

function viewResult() {
  void navigateTo("/consult/result");
}

function createMeteor(color: string, index: number, count: number) {
  if (!scene) return;
  const head = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: circularGlowTexture(color),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  head.visible = false;
  head.scale.setScalar(0.52);
  scene.add(head);
  const trailSegments = 18;
  const trailPositions = new Float32Array(trailSegments * 2 * 3);
  const trailIndices: number[] = [];
  for (let segment = 0; segment < trailSegments - 1; segment++) {
    const offset = segment * 2;
    trailIndices.push(
      offset,
      offset + 1,
      offset + 2,
      offset + 1,
      offset + 3,
      offset + 2,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(trailPositions, 3),
  );
  geometry.setIndex(trailIndices);
  const trail = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  trail.visible = false;
  scene.add(trail);
  meteors.push({
    head,
    trail,
    trailPositions,
    delay: index * 190,
    duration: 920,
    lane: index - (count - 1) / 2,
  });
}

function meteorPosition(meteor: Meteor, progress: number) {
  const eased = 1 - Math.pow(1 - progress, 3);
  const sway = Math.sin(progress * Math.PI) * meteor.lane * 0.34;
  return new THREE.Vector3(
    meteor.lane * 0.24 + sway,
    -0.4 + eased * 7.2,
    2.1 + Math.sin(progress * Math.PI) * 1.7,
  );
}

function updateDraw(elapsed: number) {
  let allComplete = true;
  for (const meteor of meteors) {
    const raw = (elapsed - meteor.delay) / meteor.duration;
    const progress = THREE.MathUtils.clamp(raw, 0, 1);
    if (raw < 1) allComplete = false;
    meteor.head.visible = raw >= 0 && raw < 1;
    meteor.trail.visible = raw >= 0 && raw < 1;
    if (raw < 0 || raw >= 1) continue;
    const current = meteorPosition(meteor, progress);
    meteor.head.position.copy(current);
    (meteor.trail.material as THREE.MeshBasicMaterial).opacity =
      Math.sin(progress * Math.PI) * 0.68;
    for (let point = 0; point < 18; point++) {
      const pointProgress = Math.max(0, progress - point * 0.012);
      const position = meteorPosition(meteor, pointProgress);
      const ahead = meteorPosition(meteor, Math.min(1, pointProgress + 0.004));
      const directionX = ahead.x - position.x;
      const directionY = ahead.y - position.y;
      const directionLength = Math.hypot(directionX, directionY) || 1;
      const taper = 1 - point / 17;
      const halfWidth = 0.004 + 0.055 * Math.pow(taper, 1.35);
      const normalX = (-directionY / directionLength) * halfWidth;
      const normalY = (directionX / directionLength) * halfWidth;
      const offset = point * 6;
      meteor.trailPositions[offset] = position.x + normalX;
      meteor.trailPositions[offset + 1] = position.y + normalY;
      meteor.trailPositions[offset + 2] = position.z;
      meteor.trailPositions[offset + 3] = position.x - normalX;
      meteor.trailPositions[offset + 4] = position.y - normalY;
      meteor.trailPositions[offset + 5] = position.z;
    }
    (
      meteor.trail.geometry.attributes.position as THREE.BufferAttribute
    ).needsUpdate = true;
  }
  if (allComplete && !drawFinished) finishDraw();
}

function finishDraw() {
  drawFinished = true;
  flash.value = true;
  flashTimer = window.setTimeout(() => {
    flash.value = false;
    cards.value = pendingCards;
    revealing.value = true;
    drawing.value = false;
    clearMeteors();
    revealTimer = window.setTimeout(
      () => (revealing.value = false),
      820 + pendingCards.length * 105,
    );
  }, 320);
}

function cardStyle(index: number) {
  const offset = index - activeCard.value;
  return {
    "--card-color": cards.value[index]?.color,
    "--card-offset": String(offset),
    "--card-distance": String(Math.abs(offset)),
    "--card-delay": `${index * 105}ms`,
    zIndex: String(20 - Math.abs(offset)),
  };
}
function selectCard(index: number) {
  activeCard.value = Math.max(0, Math.min(cards.value.length - 1, index));
}
function pointerDown(event: PointerEvent) {
  pointerStart.value = event.clientX;
}
function pointerUp(event: PointerEvent) {
  if (pointerStart.value === null) return;
  const distance = event.clientX - pointerStart.value;
  pointerStart.value = null;
  if (Math.abs(distance) >= 34)
    selectCard(activeCard.value + (distance < 0 ? 1 : -1));
}
function handleParallax(event: PointerEvent) {
  mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
}
function handleVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(frameId);
    clock.stop();
  } else if (renderer) {
    clock.start();
    animate();
  }
}
function clearMeteors() {
  meteors.forEach((meteor) => {
    scene?.remove(meteor.head, meteor.trail);
    meteor.head.material.map?.dispose();
    meteor.head.material.dispose();
    meteor.trail.geometry.dispose();
    (meteor.trail.material as THREE.Material).dispose();
  });
  meteors = [];
}
function dispose() {
  if (flashTimer) clearTimeout(flashTimer);
  if (revealTimer) clearTimeout(revealTimer);
  cancelAnimationFrame(frameId);
  resizeObserver?.disconnect();
  document.removeEventListener("visibilitychange", handleVisibility);
  window.removeEventListener("pointermove", handleParallax);
  clearMeteors();
  scene?.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer?.domElement.remove();
  renderer = undefined;
  scene = undefined;
}

onMounted(async () => {
  suggestions.value = pickQuestionSuggestions(consultQuestionSuggestions);
  await nextTick();
  init();
  if (isDevMode) window.addEventListener("dev-consult-redraw", redrawInDev);
});
onBeforeUnmount(() => {
  if (isDevMode) window.removeEventListener("dev-consult-redraw", redrawInDev);
  dispose();
});
</script>

<template>
  <section class="consult-draw">
    <div ref="host" class="nebula-viewport" :class="{ drawing, revealing }">
      <div v-if="unavailable" class="webgl-fallback">
        此裝置暫時無法顯示星雲，請更新瀏覽器或開啟硬體加速後重試。
      </div>
      <div
        v-if="!unavailable && !drawing && !cards.length"
        class="consult-composer"
      >
        <AppQuestionComposer
          v-model="question"
          :suggestions="suggestions"
          :disabled="requestingReading || startingReading"
          :submit-disabled="
            requestingReading || startingReading || !question.trim()
          "
          placeholder="輸入想詢問的事情…"
          aria-label="輸入想詢問的事情"
          @submit="submitQuestion"
        />
      </div>
      <div v-if="flash" class="draw-flash" />
      <div
        v-if="cards.length"
        class="card-carousel"
        @click.stop
        @pointerdown="pointerDown"
        @pointerup="pointerUp"
        @pointercancel="pointerStart = null"
      >
        <div class="card-track">
          <article
            v-for="(card, index) in cards"
            :key="card.id"
            class="celestial-card"
            :class="{
              active: index === activeCard,
              dropping: revealing,
              'has-full-image': Boolean(card.image),
            }"
            :style="cardStyle(index)"
            @click="selectCard(index)"
          >
            <div
              v-if="card.polarity || card.transformation"
              class="card-badges"
            >
              <span v-if="card.polarity">{{ card.polarity }}</span>
              <span v-if="card.transformation" class="transformation">{{
                transformationLabel(card.transformation)
              }}</span>
            </div>
            <div
              v-if="card.key === 'main_star' && card.polarity === '陰'"
              class="card-yin-overlay"
              aria-hidden="true"
            />
            <template v-if="card.image">
              <img
                class="card-full-image"
                :src="card.image"
                :alt="`${card.name}主星圖`"
              />
              <div class="card-name-footer">
                <strong>{{ card.name }}</strong>
              </div>
            </template>
            <template v-else>
              <div class="card-star">✦</div>
              <small>{{ card.group }}</small>
              <strong>{{ card.name }}</strong>
              <p>星意已降臨，靜候問事內容開啟。</p>
            </template>
          </article>
        </div>
        <button
          v-if="cards.length > 1"
          class="carousel-arrow previous"
          type="button"
          aria-label="上一張"
          :disabled="activeCard === 0"
          @click="selectCard(activeCard - 1)"
        >
          <ChevronLeft :size="22" />
        </button>
        <button
          v-if="cards.length > 1"
          class="carousel-arrow next"
          type="button"
          aria-label="下一張"
          :disabled="activeCard === cards.length - 1"
          @click="selectCard(activeCard + 1)"
        >
          <ChevronRight :size="22" />
        </button>
        <div
          v-if="cards.length > 1"
          class="carousel-dots"
          aria-label="卡片選擇"
        >
          <button
            v-for="(_, index) in cards"
            :key="index"
            type="button"
            :class="{ active: index === activeCard }"
            :aria-label="`第 ${index + 1} 張`"
            @click="selectCard(index)"
          />
        </div>
        <div v-if="!revealing" class="reading-actions">
          <button class="app-button" type="button" @click="viewResult">
            查看結果
          </button>
          <p v-if="startError">{{ startError }}</p>
        </div>
      </div>
    </div>
    <AppBottomSheet
      :open="showPointsConfirm"
      :locked="startingReading"
      @close="showPointsConfirm = false"
    >
      <template #header><h2>確認使用占卜問事</h2></template>
      <p v-if="chargeMode === 'quota'">
        本次問事將消耗會員額度 1 次，確認後會立即抽取星曜並開始解牌。
      </p>
      <p v-else>
        本次問事將扣除 100 點數，確認後會立即抽取星曜並開始解牌。目前點數：{{
          auth.points
        }}
      </p>
      <div class="quota-row">
        <Coins :size="18" />
        <span>{{
          chargeMode === "quota" ? "本月會員額度剩餘" : "每次占卜問事"
        }}</span>
        <b>{{
          chargeMode === "quota"
            ? `${auth.membershipQuotaRemaining} 次`
            : "100 點"
        }}</b>
      </div>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          :disabled="startingReading"
          @click="showPointsConfirm = false"
        >
          取消
        </button>
        <button
          v-if="chargeMode === 'quota' || auth.points >= 100"
          class="app-button"
          type="button"
          :disabled="startingReading"
          @click="startReading(chargeMode === 'points')"
        >
          確認使用
        </button>
        <NuxtLink v-else class="app-button" to="/store">前往購買點數</NuxtLink>
      </div>
    </AppBottomSheet>
  </section>
</template>

<style scoped>
.consult-draw {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.nebula-viewport {
  position: relative;
  width: min(100%, 960px);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  overflow: hidden;
  cursor: pointer;
  outline: none;
  touch-action: none;
}
.nebula-viewport :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
.nebula-viewport::after {
  content: "";
  position: absolute;
  inset: 16% 14%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    rgba(107, 166, 160, 0.07),
    rgba(107, 166, 160, 0.025) 44%,
    transparent 74%
  );
  filter: blur(42px);
  pointer-events: none;
}
.nebula-viewport:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(107, 166, 160, 0.45);
}
.webgl-fallback {
  position: absolute;
  z-index: 10;
  top: 50%;
  left: 50%;
  width: min(82%, 420px);
  padding: 18px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.66);
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.7;
  text-align: center;
  transform: translate(-50%, -50%);
  backdrop-filter: blur(20px);
}
.draw-flash {
  position: absolute;
  z-index: 25;
  inset: 0;
  background: radial-gradient(
    circle at 50% 40%,
    #fff 0,
    rgba(143, 213, 201, 0.78) 12%,
    rgba(107, 166, 160, 0.22) 38%,
    transparent 68%
  );
  animation: flash 0.42s ease-out both;
  pointer-events: none;
}
.card-carousel {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  cursor: default;
  perspective: 1200px;
  touch-action: none;
  pointer-events: none;
}
.celestial-card,
.carousel-arrow,
.carousel-dots {
  pointer-events: auto;
}
.card-track {
  position: relative;
  width: 100%;
  height: min(410px, 72%);
}
.celestial-card {
  --x: calc(var(--card-offset) * clamp(150px, 24vw, 238px));
  position: absolute;
  top: 28px;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(190px, 32vw, 264px);
  height: min(350px, calc(100% - 36px));
  padding: 30px 22px;
  border: 1px solid color-mix(in srgb, var(--card-color) 62%, white);
  border-radius: 30px;
  background: linear-gradient(
    155deg,
    color-mix(in srgb, var(--card-color) 34%, white),
    rgba(255, 255, 255, 0.88) 58%,
    color-mix(in srgb, var(--card-color) 18%, white)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    0 26px 70px color-mix(in srgb, var(--card-color) 28%, transparent);
  opacity: calc(1 - min(var(--card-distance), 1) * 0.52);
  transform: translateX(calc(-50% + var(--x)))
    translateY(calc(min(var(--card-distance), 2) * 22px))
    translateZ(calc(min(var(--card-distance), 2) * -130px))
    rotateY(calc(var(--card-offset) * -18deg))
    scale(calc(1 - min(var(--card-distance), 2) * 0.14));
  transition:
    transform 0.56s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.4s ease;
  overflow: hidden;
}
.celestial-card::before {
  content: "";
  position: absolute;
  inset: -25%;
  background: radial-gradient(
    circle at 50% 22%,
    var(--card-color),
    transparent 44%
  );
  opacity: 0.3;
}
.celestial-card.dropping {
  animation: card-drop 0.72s cubic-bezier(0.18, 0.82, 0.22, 1.14) both;
  animation-delay: var(--card-delay);
}
.card-star,
.celestial-card small,
.celestial-card strong,
.celestial-card p {
  position: relative;
}
.card-star {
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  margin-bottom: 24px;
  border: 1px solid color-mix(in srgb, var(--card-color) 72%, white);
  border-radius: 50%;
  box-shadow: 0 0 38px color-mix(in srgb, var(--card-color) 55%, transparent);
  color: var(--card-color);
  font-size: 44px;
  text-shadow: 0 0 18px var(--card-color);
}
.celestial-card small {
  color: var(--text-soft);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.2em;
}
.celestial-card strong {
  margin-top: 9px;
  color: var(--mountain);
  font-family: var(--font-family-base);
  font-size: 23px;
  letter-spacing: 0.08em;
}
.celestial-card p {
  margin: 14px 0 0;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.65;
  text-align: center;
}
.carousel-arrow {
  position: absolute;
  z-index: 30;
  top: 50%;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 9px 24px rgba(36, 87, 90, 0.12);
  color: var(--mountain);
  backdrop-filter: blur(18px);
  transform: translateY(-50%);
}
.carousel-arrow.previous {
  left: max(14px, calc(50% - 210px));
}
.carousel-arrow.next {
  right: max(14px, calc(50% - 210px));
}
.carousel-arrow:disabled {
  opacity: 0.3;
}
.carousel-dots {
  position: absolute;
  bottom: clamp(20px, 6dvh, 72px);
  left: 50%;
  display: flex;
  gap: 8px;
  transform: translateX(-50%);
}
.carousel-dots button {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(36, 87, 90, 0.22);
  transition:
    width 0.2s ease,
    background 0.2s ease;
}
.carousel-dots button.active {
  width: 22px;
  border-radius: 99px;
  background: var(--jade);
}
@keyframes flash {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  42% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: scale(1.18);
  }
}
@keyframes card-drop {
  0% {
    opacity: 0;
    transform: translateX(calc(-50% + var(--x))) translateY(-68dvh)
      rotateZ(-5deg) scale(0.82);
  }
  72% {
    opacity: 1;
    transform: translateX(calc(-50% + var(--x))) translateY(16px)
      translateZ(calc(min(var(--card-distance), 2) * -130px))
      rotateY(calc(var(--card-offset) * -18deg))
      scale(calc(1 - min(var(--card-distance), 2) * 0.12));
  }
  100% {
    opacity: calc(1 - min(var(--card-distance), 1) * 0.52);
    transform: translateX(calc(-50% + var(--x)))
      translateY(calc(min(var(--card-distance), 2) * 22px))
      translateZ(calc(min(var(--card-distance), 2) * -130px))
      rotateY(calc(var(--card-offset) * -18deg))
      scale(calc(1 - min(var(--card-distance), 2) * 0.14));
  }
}
@media (max-width: 759px) {
  .card-track {
    height: min(360px, 74%);
  }
  .celestial-card {
    --x: calc(var(--card-offset) * 142px);
    top: 18px;
    width: 210px;
    height: min(310px, calc(100% - 26px));
    padding: 20px 18px;
  }
  .card-star {
    width: 76px;
    height: 76px;
    margin-bottom: 16px;
    font-size: 38px;
  }
  .celestial-card strong {
    font-size: 20px;
  }
  .carousel-arrow.previous {
    left: 10px;
  }
  .carousel-arrow.next {
    right: 10px;
  }
  .carousel-dots {
    bottom: 18px;
  }
}
@media (max-height: 560px) {
  .celestial-card {
    width: 188px;
    height: min(270px, calc(100% - 20px));
    padding: 16px;
  }
  .card-star {
    width: 60px;
    height: 60px;
    margin-bottom: 10px;
    font-size: 30px;
  }
  .celestial-card p {
    margin-top: 8px;
  }
  .carousel-dots {
    bottom: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .celestial-card.dropping,
  .draw-flash {
    animation-duration: 0.01ms !important;
  }
  .celestial-card {
    transition-duration: 0.01ms;
  }
}
.nebula-viewport {
  cursor: default;
}
.consult-composer {
  position: absolute;
  z-index: 18;
  top: 50%;
  left: 50%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  align-items: center;
  width: min(78%, 480px);
  min-height: 54px;
  border: 1.4px solid rgba(36, 87, 90, 0.38);
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 44px rgba(36, 87, 90, 0.14);
  transform: translate(-50%, -50%);
  backdrop-filter: blur(18px);
}
@media (max-width: 759px) {
  .consult-composer {
    width: min(88%, 460px);
  }
}
.card-badges {
  position: absolute;
  z-index: 2;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 6px;
}
.card-badges span {
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--card-color) 55%, white);
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--mountain);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  backdrop-filter: blur(8px);
}
.card-badges .transformation {
  background: color-mix(in srgb, var(--card-color) 18%, white);
}
.reading-actions {
  position: absolute;
  z-index: 35;
  bottom: clamp(18px, 4dvh, 44px);
  left: 50%;
  display: grid;
  grid-template-columns: repeat(2, minmax(112px, 150px));
  gap: 10px;
  transform: translateX(-50%);
  pointer-events: auto;
}
.reading-actions p {
  grid-column: 1/-1;
  margin: 0;
  color: #a44;
  font-size: 12px;
  text-align: center;
}
.reading-actions .app-button {
  min-height: 42px;
}
.quota-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(107, 166, 160, 0.09);
  color: var(--mountain);
}
.quota-row b {
  margin-left: auto;
}
.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
}
.sheet-actions .app-button {
  text-align: center;
  text-decoration: none;
}
.card-carousel:has(.reading-actions) .carousel-dots {
  bottom: clamp(78px, 11dvh, 104px);
}
@media (max-width: 759px) {
  .reading-actions {
    bottom: 14px;
  }
  .card-carousel:has(.reading-actions) .carousel-dots {
    bottom: 72px;
  }
  .celestial-card {
    top: 4px;
    height: min(292px, calc(100% - 88px));
  }
}
.card-visual {
  position: relative;
  z-index: 1;
  width: 116px;
  height: 154px;
  margin-bottom: 18px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--card-color) 72%, white);
  border-radius: 18px;
  box-shadow: 0 0 38px color-mix(in srgb, var(--card-color) 42%, transparent);
}
.card-visual img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
@media (max-width: 759px) {
  .card-visual {
    width: 94px;
    height: 126px;
    margin-bottom: 12px;
  }
}
@media (max-height: 560px) {
  .card-visual {
    width: 78px;
    height: 104px;
    margin-bottom: 8px;
  }
}
.card-yin-overlay {
  position: absolute;
  z-index: 3;
  inset: 0;
  border-radius: inherit;
  background: rgba(48, 54, 58, 0.42);
  pointer-events: none;
}
.card-track {
  height: min(500px, 82%);
}
.celestial-card {
  top: 0;
  width: clamp(250px, 38vw, 340px);
  height: min(460px, calc(100% - 24px));
}
.celestial-card.has-full-image {
  padding: 0;
  justify-content: flex-end;
}
.card-full-image {
  position: absolute;
  z-index: 0;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-name-footer {
  position: relative;
  z-index: 4;
  width: 100%;
  padding: 72px 24px 24px;
  background: linear-gradient(transparent, rgba(13, 30, 35, 0.82) 62%);
  color: #fff;
  text-align: center;
}
.card-name-footer strong {
  margin: 0;
  color: inherit;
  font-size: 30px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
.dev-redraw {
  grid-column: 1/-1;
}
@media (max-width: 759px) {
  .card-track {
    height: min(450px, 78%);
  }
  .celestial-card {
    top: 0;
    width: min(82vw, 300px);
    height: min(390px, calc(100% - 72px));
  }
  .card-name-footer {
    padding: 64px 20px 20px;
  }
  .card-name-footer strong {
    font-size: 26px;
  }
}
@media (max-height: 560px) {
  .card-track {
    height: min(380px, 72%);
  }
  .celestial-card {
    width: min(76vw, 270px);
    height: min(330px, calc(100% - 52px));
  }
  .card-name-footer {
    padding: 48px 16px 16px;
  }
  .card-name-footer strong {
    font-size: 23px;
  }
}
.card-badges {
  z-index: 5;
  top: 18px;
  right: 18px;
  gap: 9px;
}
.card-badges span {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  font-size: 15px;
  letter-spacing: 0.04em;
}
.card-badges .transformation {
  font-size: 17px;
}
@media (max-width: 759px) {
  .card-badges {
    top: 14px;
    right: 14px;
    gap: 7px;
  }
  .card-badges span {
    width: 42px;
    height: 42px;
    font-size: 14px;
  }
  .card-badges .transformation {
    font-size: 16px;
  }
}
.card-track {
  height: min(540px, 86%);
}
.celestial-card {
  width: clamp(270px, 42vw, 380px);
  height: min(500px, calc(100% - 16px));
}
@media (max-width: 759px) {
  .card-track {
    height: min(480px, 82%);
  }
  .celestial-card {
    width: min(88vw, 330px);
    height: min(420px, calc(100% - 64px));
  }
}
@media (max-height: 560px) {
  .card-track {
    height: min(410px, 76%);
  }
  .celestial-card {
    width: min(82vw, 290px);
    height: min(355px, calc(100% - 46px));
  }
}
.card-track {
  height: min(610px, 92%);
}
.celestial-card {
  height: min(540px, calc(100% - 8px));
}
.celestial-card.has-full-image {
  height: auto;
  aspect-ratio: 2/3;
}
.card-full-image {
  object-fit: cover;
}
@media (max-width: 759px) {
  .card-track {
    height: min(540px, 88%);
  }
  .celestial-card {
    height: min(450px, calc(100% - 44px));
  }
  .celestial-card.has-full-image {
    height: auto;
  }
}
@media (max-height: 560px) {
  .card-track {
    height: min(450px, 82%);
  }
  .celestial-card {
    height: min(390px, calc(100% - 34px));
  }
  .celestial-card.has-full-image {
    height: auto;
  }
}
.consult-composer {
  display: block;
  width: min(88%, 520px);
  min-height: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}
.reading-actions {
  grid-template-columns: minmax(180px, 280px);
}
.reading-actions .app-button {
  width: 100%;
}
</style>
