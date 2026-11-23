"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { HeroFallback } from "@/components/landing/hero-scene-fallback";
import { formatUSD } from "@/lib/landing-estimate";

interface ReceiptItem {
  vendor: string;
  items: { name: string; price: string }[];
  total: string;
  amountCents: number;
  date: string;
  code: string;
  category: string;
  categoryColor: string;
  stackIndex: number;
  enterFromLeft: boolean;
}

const RECEIPTS: ReceiptItem[] = [
  {
    vendor: "Desk & Circuit",
    items: [
      { name: "External monitor", price: "$210.00" },
      { name: "USB-C adapter", price: "$30.00" },
    ],
    total: "$240.00",
    amountCents: 24000,
    date: "2026-06-08",
    code: "TW-024",
    category: "Hardware",
    categoryColor: "#9FD6FF",
    stackIndex: 0,
    enterFromLeft: true,
  },
  {
    vendor: "FiberNet",
    items: [
      { name: "Gigabit fiber", price: "$69.99" },
      { name: "Static IP", price: "$10.00" },
    ],
    total: "$79.99",
    amountCents: 7999,
    date: "2026-06-12",
    code: "TW-025",
    category: "Internet & phone",
    categoryColor: "#B8E1FF",
    stackIndex: 1,
    enterFromLeft: false,
  },
  {
    vendor: "Northline Rail",
    items: [
      { name: "Regional express", price: "$154.00" },
      { name: "Seat reservation", price: "$32.40" },
    ],
    total: "$186.40",
    amountCents: 18640,
    date: "2026-06-15",
    code: "TW-026",
    category: "Travel",
    categoryColor: "#FFC07A",
    stackIndex: 2,
    enterFromLeft: true,
  },
  {
    vendor: "Inkwell Studio",
    items: [
      { name: "Proofing & review", price: "$45.00" },
    ],
    total: "$45.00",
    amountCents: 4500,
    date: "2026-06-18",
    code: "TW-027",
    category: "Services",
    categoryColor: "#FF9FCB",
    stackIndex: 3,
    enterFromLeft: false,
  },
];

const STACK_POSITIONS = [
  { x: -2.15, z: 1.35, label: "Hardware", color: "#9FD6FF" },
  { x: -0.72, z: 1.55, label: "Internet & phone", color: "#B8E1FF" },
  { x: 0.72, z: 1.55, label: "Travel", color: "#FFC07A" },
  { x: 2.15, z: 1.35, label: "Services", color: "#FF9FCB" },
];

const RECEIPT_WIDTH = 1.48;
const RECEIPT_HEIGHT = 2.08;
const SCAN_SPOT = { x: 0, y: 1.62, z: 0.5 };
const SCAN_ROTATION = { x: -0.22, y: 0, z: 0 };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { r: 238, g: 242, b: 246 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function createReceiptCanvas(data: ReceiptItem, isScanned: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 704;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Receipts remain light paper in both themes
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer paper border
  ctx.strokeStyle = isScanned ? "#C5CEDA" : "#DCE2EA";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Masthead
  ctx.fillStyle = "#44506A";
  ctx.font = "bold 20px monospace";
  ctx.fillText("TAXWISE RECEIPT", 36, 52);

  // Sample label chip
  ctx.fillStyle = "#EEF2F6";
  ctx.beginPath();
  ctx.roundRect(canvas.width - 150, 30, 114, 28, 14);
  ctx.fill();
  ctx.fillStyle = "#44506A";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("Sample data", canvas.width - 138, 50);

  // Vendor Name - Navy ink
  ctx.fillStyle = "#14213D";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(data.vendor, 36, 118);

  // Meta line
  ctx.fillStyle = "#5C6781";
  ctx.font = "20px monospace";
  ctx.fillText(`${data.date} · ${data.code}`, 36, 156);

  // Dashed divider
  ctx.strokeStyle = "#C5CEDA";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(36, 180);
  ctx.lineTo(canvas.width - 36, 180);
  ctx.stroke();
  ctx.setLineDash([]);

  // Line items
  let y = 234;
  ctx.font = "24px monospace";
  for (const item of data.items) {
    ctx.fillStyle = "#14213D";
    ctx.fillText(item.name, 36, y);
    const priceWidth = ctx.measureText(item.price).width;
    ctx.fillText(item.price, canvas.width - 36 - priceWidth, y);
    y += 44;
  }

  // Divider above total
  y = Math.max(y + 12, 386);
  ctx.beginPath();
  ctx.moveTo(36, y);
  ctx.lineTo(canvas.width - 36, y);
  ctx.stroke();

  // Total
  y += 50;
  ctx.fillStyle = "#14213D";
  ctx.font = "bold 34px monospace";
  ctx.fillText("TOTAL", 36, y);
  const totalWidth = ctx.measureText(data.total).width;
  ctx.fillText(data.total, canvas.width - 36 - totalWidth, y);

  // Barcode decorative lines at bottom
  const barY = canvas.height - 54;
  ctx.fillStyle = "#14213D";
  const bars = [3, 2, 5, 2, 4, 7, 2, 5, 2, 6, 3, 4, 2, 5, 3, 7, 2, 4, 3];
  let barX = (canvas.width - 230) / 2;
  for (const w of bars) {
    ctx.fillRect(barX, barY, w, 26);
    barX += w + 4;
  }

  return canvas;
}

function createChipCanvas(category: string, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 104;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 44);
  ctx.fill();

  ctx.fillStyle = "#14213D";
  ctx.font = "bold 26px sans-serif";
  const text = `✓ ${category} · 100% deductible`;
  const tw = ctx.measureText(text).width;
  ctx.fillText(text, (canvas.width - tw) / 2, 59);

  return canvas;
}

function createStackBaseCanvas(label: string, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 704;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#DCE2EA";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Large category chip with label text >= 36px
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(30, 32, canvas.width - 60, 78, 39);
  ctx.fill();

  ctx.fillStyle = "#14213D";
  ctx.font = "bold 40px sans-serif";
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, (canvas.width - tw) / 2, 85);

  // Faint paper lines to simulate a ledger stack
  ctx.strokeStyle = "#EEF2F6";
  ctx.lineWidth = 2;
  for (let ly = 150; ly < 640; ly += 38) {
    ctx.beginPath();
    ctx.moveTo(36, ly);
    ctx.lineTo(canvas.width - 36, ly);
    ctx.stroke();
  }

  return canvas;
}

function createGroundCanvas(sunkHex: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { r, g, b } = hexToRgb(sunkHex);
  const gradient = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.85)`);
  gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.55)`);
  gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, 0.15)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  return canvas;
}

function createShadowCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
  gradient.addColorStop(0, "rgba(20, 33, 61, 0.35)");
  gradient.addColorStop(0.5, "rgba(20, 33, 61, 0.15)");
  gradient.addColorStop(1, "rgba(20, 33, 61, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return canvas;
}

function createScannerGlowCanvas(hlHex: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { r, g, b } = hexToRgb(hlHex);
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
  gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.35)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.85)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 256);
  return canvas;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function detectWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webGLAvailable] = useState<boolean>(detectWebGL);
  const [deductibleSoFarCents, setDeductibleSoFarCents] = useState<number>(0);

  // Keep last reported figure in ref to avoid re-rendering at 60 fps
  const lastReportedDeductibleRef = useRef<number>(-1);

  useEffect(() => {
    if (!webGLAvailable) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReduced = motionQuery.matches;

    const readTokens = () => {
      const cs = getComputedStyle(document.documentElement);
      const isDark =
        document.documentElement.dataset.theme === "dark" ||
        (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
      return {
        hl: cs.getPropertyValue("--hl").trim() || "#F5EC4E",
        ink: cs.getPropertyValue("--ink").trim() || "#14213D",
        paper: cs.getPropertyValue("--paper").trim() || "#FFFFFF",
        sunk: cs.getPropertyValue("--sunk").trim() || "#EEF2F6",
        isDark,
      };
    };

    let tokens = readTokens();

    const disposables: { dispose: () => void }[] = [];

    // Scene & Renderer
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Camera looking down ~30° onto the desk scene
    const camera = new THREE.PerspectiveCamera(
      container.clientWidth < 560 ? 46 : 34,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    const baseCamPos = new THREE.Vector3(0, 4.0, 5.8);
    camera.position.copy(baseCamPos);
    const cameraTarget = new THREE.Vector3(0, 0.5, 0.35);
    camera.lookAt(cameraTarget);

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(3.5, 8.5, 5);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xf8faff, 0xdce3ef, 0.85);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    // Subtle Ground Plane (--sunk with radial alpha)
    const groundCanvas = createGroundCanvas(tokens.sunk);
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.colorSpace = THREE.SRGBColorSpace;
    disposables.push(groundTex);

    const groundGeo = new THREE.PlaneGeometry(12, 12);
    disposables.push(groundGeo);

    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTex,
      transparent: true,
      depthWrite: false,
    });
    disposables.push(groundMat);

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, 0.002, 0.4);
    scene.add(groundMesh);

    // Soft Contact Shadows for stacks
    const shadowCanvas = createShadowCanvas();
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    disposables.push(shadowTex);

    const shadowGeo = new THREE.PlaneGeometry(2.3, 2.3);
    disposables.push(shadowGeo);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    disposables.push(shadowMat);

    STACK_POSITIONS.forEach(pos => {
      const sMesh = new THREE.Mesh(shadowGeo, shadowMat);
      sMesh.rotation.x = -Math.PI / 2;
      sMesh.position.set(pos.x, 0.005, pos.z);
      scene.add(sMesh);
    });

    // Stacks: 2-3 pre-existing slips + base card with large label
    const receiptPlaneGeo = new THREE.PlaneGeometry(RECEIPT_WIDTH, RECEIPT_HEIGHT);
    disposables.push(receiptPlaneGeo);

    const stackBaseMats: THREE.MeshStandardMaterial[] = [];

    STACK_POSITIONS.forEach((pos, idx) => {
      const baseCanvas = createStackBaseCanvas(pos.label, pos.color);
      const baseTex = new THREE.CanvasTexture(baseCanvas);
      baseTex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(baseTex);

      const baseMat = new THREE.MeshStandardMaterial({
        map: baseTex,
        roughness: 0.65,
        metalness: 0.05,
        emissive: new THREE.Color(tokens.paper),
        emissiveIntensity: tokens.isDark ? 0.15 : 0.0,
      });
      stackBaseMats.push(baseMat);
      disposables.push(baseMat);

      // Pre-existing paper slips (so stacks are never empty)
      for (let s = 0; s < 3; s++) {
        const slipMat = new THREE.MeshStandardMaterial({
          color: 0xfbfcfe,
          roughness: 0.75,
          metalness: 0.05,
          emissive: new THREE.Color(tokens.paper),
          emissiveIntensity: tokens.isDark ? 0.15 : 0.0,
        });
        disposables.push(slipMat);
        const slip = new THREE.Mesh(receiptPlaneGeo, s === 2 ? baseMat : slipMat);
        slip.rotation.x = -Math.PI / 2;
        slip.rotation.z = (s - 1) * 0.03 + (idx % 2 === 0 ? 0.015 : -0.015);
        slip.position.set(pos.x + (s - 1) * 0.012, 0.018 * (s + 1), pos.z);
        scene.add(slip);
      }
    });

    // Scanner Group (Short line + trailing soft glow)
    const scannerGroup = new THREE.Group();
    scannerGroup.visible = false;

    const scanLineWidth = RECEIPT_WIDTH * 1.1;
    const scanLineGeo = new THREE.PlaneGeometry(scanLineWidth, 0.035);
    disposables.push(scanLineGeo);

    const scanLineMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(tokens.hl),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    disposables.push(scanLineMat);

    const scanLineMesh = new THREE.Mesh(scanLineGeo, scanLineMat);
    scannerGroup.add(scanLineMesh);

    // Soft vertical glow trailing above line
    const scannerGlowCanvas = createScannerGlowCanvas(tokens.hl);
    const scannerGlowTex = new THREE.CanvasTexture(scannerGlowCanvas);
    disposables.push(scannerGlowTex);

    const glowHeight = 0.42;
    const glowGeo = new THREE.PlaneGeometry(scanLineWidth, glowHeight);
    glowGeo.translate(0, glowHeight / 2, 0); // anchor at bottom so it trails above
    disposables.push(glowGeo);

    const glowMat = new THREE.MeshBasicMaterial({
      map: scannerGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    disposables.push(glowMat);

    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(0, 0.01, 0.001);
    scannerGroup.add(glowMesh);

    scene.add(scannerGroup);

    // Active Receipts
    interface ActiveReceipt {
      group: THREE.Group;
      baseMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
      overlayMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
      chipMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      baseMat: THREE.MeshStandardMaterial;
      overlayMat: THREE.MeshStandardMaterial;
      scannedTex: THREE.CanvasTexture;
      data: ReceiptItem;
    }

    // Geometry anchored at top edge for clean progressive reveal without stretching
    const overlayGeo = new THREE.PlaneGeometry(RECEIPT_WIDTH, RECEIPT_HEIGHT);
    overlayGeo.translate(0, -RECEIPT_HEIGHT / 2, 0);
    disposables.push(overlayGeo);

    const chipGeo = new THREE.PlaneGeometry(1.26, 0.26);
    disposables.push(chipGeo);

    const activeReceipts: ActiveReceipt[] = RECEIPTS.map(r => {
      const group = new THREE.Group();
      group.visible = false;

      // Base unscanned receipt
      const unscannedCanvas = createReceiptCanvas(r, false);
      const unscannedTex = new THREE.CanvasTexture(unscannedCanvas);
      unscannedTex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(unscannedTex);

      const baseMat = new THREE.MeshStandardMaterial({
        map: unscannedTex,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: true,
        emissive: new THREE.Color(tokens.paper),
        emissiveIntensity: tokens.isDark ? 0.15 : 0.0,
      });
      disposables.push(baseMat);

      const baseMesh = new THREE.Mesh(receiptPlaneGeo, baseMat);
      group.add(baseMesh);

      // Scanned overlay revealed progressively from top to bottom
      const scannedCanvas = createReceiptCanvas(r, true);
      const scannedTex = new THREE.CanvasTexture(scannedCanvas);
      scannedTex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(scannedTex);

      const overlayMat = new THREE.MeshStandardMaterial({
        map: scannedTex,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: true,
        emissive: new THREE.Color(tokens.paper),
        emissiveIntensity: tokens.isDark ? 0.15 : 0.0,
      });
      disposables.push(overlayMat);

      const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
      overlayMesh.position.set(0, RECEIPT_HEIGHT / 2, 0.002);
      overlayMesh.visible = false;
      group.add(overlayMesh);

      // Category chip (pops after scan)
      const chipCanvas = createChipCanvas(r.category, r.categoryColor);
      const chipTex = new THREE.CanvasTexture(chipCanvas);
      chipTex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(chipTex);

      const chipMat = new THREE.MeshBasicMaterial({
        map: chipTex,
        transparent: true,
        side: THREE.DoubleSide,
      });
      disposables.push(chipMat);

      const chipMesh = new THREE.Mesh(chipGeo, chipMat);
      chipMesh.position.set(0, -0.56, 0.005);
      chipMesh.scale.set(0, 0, 0);
      group.add(chipMesh);

      scene.add(group);

      return {
        group,
        baseMesh,
        overlayMesh,
        chipMesh,
        baseMat,
        overlayMat,
        scannedTex,
        data: r,
      };
    });

    // Theme Updates (MutationObserver + prefers-color-scheme)
    const updateTheme = () => {
      tokens = readTokens();
      scanLineMat.color.set(tokens.hl);

      const gC = createGroundCanvas(tokens.sunk);
      groundTex.image = gC;
      groundTex.needsUpdate = true;

      const sGC = createScannerGlowCanvas(tokens.hl);
      scannerGlowTex.image = sGC;
      scannerGlowTex.needsUpdate = true;

      const intensity = tokens.isDark ? 0.15 : 0.0;
      activeReceipts.forEach(ar => {
        ar.baseMat.emissive.set(tokens.paper);
        ar.baseMat.emissiveIntensity = intensity;
        ar.overlayMat.emissive.set(tokens.paper);
        ar.overlayMat.emissiveIntensity = intensity;
      });
      stackBaseMats.forEach(m => {
        m.emissive.set(tokens.paper);
        m.emissiveIntensity = intensity;
      });
    };

    const themeObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme") {
          updateTheme();
        }
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorSchemeChange = () => updateTheme();
    colorSchemeQuery.addEventListener("change", onColorSchemeChange);

    // Pointer Parallax (disabled on touch)
    const targetCamOffset = { x: 0, y: 0 };
    let hasTouch = false;

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        hasTouch = true;
        targetCamOffset.x = 0;
        targetCamOffset.y = 0;
        return;
      }
      const rect = container.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const py = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      // Damped tilt within ~4°
      targetCamOffset.x = Math.max(-0.35, Math.min(0.35, px * 0.35));
      targetCamOffset.y = Math.max(-0.20, Math.min(0.20, py * 0.20));
    };

    window.addEventListener("pointermove", onPointerMove);

    // Resize Observer with Mobile FOV handling
    const onResize = () => {
      if (!container || !canvas) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.fov = w < 560 ? 46 : 34;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // IntersectionObserver & Visibility API to pause RAF
    let isIntersecting = true;
    const intersectionObserver = new IntersectionObserver(
      entries => {
        isIntersecting = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    let isDocumentVisible = !document.hidden;
    const onVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Animation Timing: 10s total loop with continuous overlap
    const LOOP_DURATION = 10.0;
    // Entrance timestamps for receipts 0, 1, 2, 3
    const RECEIPT_TIMINGS = [
      { enter: 0.0, scanStart: 0.85, scanEnd: 1.75, popEnd: 2.0, land: 2.85 },
      { enter: 2.05, scanStart: 2.9, scanEnd: 3.8, popEnd: 4.05, land: 4.9 },
      { enter: 4.1, scanStart: 4.95, scanEnd: 5.85, popEnd: 6.1, land: 6.95 },
      { enter: 6.15, scanStart: 7.0, scanEnd: 7.9, popEnd: 8.15, land: 9.0 },
    ];

    let animFrameId: number;
    let startTime: number | null = null;

    // Reduced Motion Still Frame
    const renderStillFrame = () => {
      scannerGroup.visible = false;

      // Receipt 0 is centered at scan spot, fully scanned with chip visible
      const r0 = activeReceipts[0];
      r0.group.visible = true;
      r0.group.position.set(SCAN_SPOT.x, SCAN_SPOT.y, SCAN_SPOT.z);
      r0.group.rotation.set(SCAN_ROTATION.x, SCAN_ROTATION.y, SCAN_ROTATION.z);
      r0.baseMat.opacity = 1;
      r0.overlayMat.opacity = 1;
      r0.overlayMesh.visible = true;
      r0.overlayMesh.scale.set(1, 1, 1);
      r0.scannedTex.repeat.set(1, 1);
      r0.scannedTex.offset.set(0, 0);
      r0.chipMesh.scale.set(1, 1, 1);

      // Receipts 1, 2, 3 sit landed on their respective stacks
      for (let i = 1; i < 4; i++) {
        const ar = activeReceipts[i];
        const stack = STACK_POSITIONS[ar.data.stackIndex];
        ar.group.visible = true;
        ar.group.position.set(stack.x, 0.074, stack.z);
        ar.group.rotation.set(-Math.PI / 2, 0, (i - 1.5) * 0.02);
        ar.baseMat.opacity = 1;
        ar.overlayMat.opacity = 1;
        ar.overlayMesh.visible = true;
        ar.overlayMesh.scale.set(1, 1, 1);
        ar.scannedTex.repeat.set(1, 1);
        ar.scannedTex.offset.set(0, 0);
        ar.chipMesh.scale.set(1, 1, 1);
      }

      camera.position.copy(baseCamPos);
      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);

      const totalAll = RECEIPTS.reduce((s, r) => s + r.amountCents, 0);
      if (lastReportedDeductibleRef.current !== totalAll) {
        lastReportedDeductibleRef.current = totalAll;
        setDeductibleSoFarCents(totalAll);
      }
    };

    const animate = (timestamp: number) => {
      if (!isIntersecting || !isDocumentVisible) {
        animFrameId = requestAnimationFrame(animate);
        return;
      }

      if (isReduced) {
        renderStillFrame();
        return;
      }

      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const loopTime = elapsed % LOOP_DURATION;

      // Parallax smooth damping
      if (!hasTouch) {
        camera.position.x += (baseCamPos.x + targetCamOffset.x - camera.position.x) * 0.05;
        camera.position.y += (baseCamPos.y + targetCamOffset.y - camera.position.y) * 0.05;
      }
      camera.lookAt(cameraTarget);

      let scannerActive = false;
      let calculatedDeductible = 0;

      activeReceipts.forEach((ar, idx) => {
        const timing = RECEIPT_TIMINGS[idx];
        const stack = STACK_POSITIONS[ar.data.stackIndex];
        const stackLandingY = 0.074;

        if (loopTime < timing.enter) {
          ar.group.visible = false;
        } else if (loopTime < timing.scanStart) {
          // Stage 1: Float upright from back towards scan spot with paper sway
          ar.group.visible = true;
          ar.baseMat.opacity = 1;
          ar.overlayMat.opacity = 1;
          ar.overlayMesh.visible = false;
          ar.chipMesh.scale.set(0, 0, 0);

          const p = (loopTime - timing.enter) / (timing.scanStart - timing.enter);
          const ease = 1 - Math.pow(1 - p, 3);

          const startX = ar.data.enterFromLeft ? -2.7 : 2.7;
          const startY = 2.3;
          const startZ = -2.6;

          const curX = startX + (SCAN_SPOT.x - startX) * ease;
          const curY = startY + (SCAN_SPOT.y - startY) * ease;
          const curZ = startZ + (SCAN_SPOT.z - startZ) * ease;

          const swayZ = Math.sin((loopTime - timing.enter) * 5) * 0.08 * (1 - ease);
          const pitchX = -0.4 + (SCAN_ROTATION.x - -0.4) * ease;

          ar.group.position.set(curX, curY, curZ);
          ar.group.rotation.set(pitchX, 0, swayZ);
        } else if (loopTime < timing.scanEnd) {
          // Stage 2: Paused at scan spot while short scanner sweeps top -> bottom
          ar.group.visible = true;
          ar.baseMat.opacity = 1;
          ar.overlayMat.opacity = 1;
          ar.group.position.set(SCAN_SPOT.x, SCAN_SPOT.y, SCAN_SPOT.z);
          ar.group.rotation.set(SCAN_ROTATION.x, SCAN_ROTATION.y, SCAN_ROTATION.z);

          const scanP = Math.max(0.001, Math.min(1, (loopTime - timing.scanStart) / (timing.scanEnd - timing.scanStart)));

          // Progressive reveal without texture stretch
          ar.overlayMesh.visible = true;
          ar.overlayMesh.scale.set(1, scanP, 1);
          ar.scannedTex.repeat.set(1, scanP);
          ar.scannedTex.offset.set(0, 1 - scanP);

          ar.chipMesh.scale.set(0, 0, 0);

          // Position scanner line exactly on the scan front
          scannerGroup.visible = true;
          scannerActive = true;
          const lineY = SCAN_SPOT.y + RECEIPT_HEIGHT / 2 - scanP * RECEIPT_HEIGHT;
          scannerGroup.position.set(0, lineY, SCAN_SPOT.z + 0.012);
          scannerGroup.rotation.x = SCAN_ROTATION.x;
        } else if (loopTime < timing.popEnd) {
          // Stage 3: Category chip pops (0 -> 1.08 -> 1.0)
          ar.group.visible = true;
          ar.baseMat.opacity = 1;
          ar.overlayMat.opacity = 1;
          ar.group.position.set(SCAN_SPOT.x, SCAN_SPOT.y, SCAN_SPOT.z);
          ar.group.rotation.set(SCAN_ROTATION.x, SCAN_ROTATION.y, SCAN_ROTATION.z);

          ar.overlayMesh.visible = true;
          ar.overlayMesh.scale.set(1, 1, 1);
          ar.scannedTex.repeat.set(1, 1);
          ar.scannedTex.offset.set(0, 0);

          const popP = (loopTime - timing.scanEnd) / (timing.popEnd - timing.scanEnd);
          let chipScale = 1;
          if (popP < 0.7) {
            chipScale = (popP / 0.7) * 1.08;
          } else {
            chipScale = 1.08 - ((popP - 0.7) / 0.3) * 0.08;
          }
          ar.chipMesh.scale.set(chipScale, chipScale, 1);
        } else if (loopTime < timing.land) {
          // Stage 4: Tilts back and flies on smooth cubic bezier arc to stack with settle bounce
          ar.group.visible = true;
          ar.baseMat.opacity = 1;
          ar.overlayMat.opacity = 1;
          ar.overlayMesh.visible = true;
          ar.overlayMesh.scale.set(1, 1, 1);
          ar.scannedTex.repeat.set(1, 1);
          ar.scannedTex.offset.set(0, 0);
          ar.chipMesh.scale.set(1, 1, 1);

          const flyP = (loopTime - timing.popEnd) / (timing.land - timing.popEnd);
          const u = easeInOutCubic(flyP);

          // Cubic Bezier control points
          const p0 = SCAN_SPOT;
          const p1 = { x: 0, y: SCAN_SPOT.y + 0.45, z: SCAN_SPOT.z + 0.2 };
          const p2 = { x: stack.x * 0.75, y: 1.35, z: stack.z - 0.25 };
          const p3 = { x: stack.x, y: stackLandingY, z: stack.z };

          const curX = cubicBezier(p0.x, p1.x, p2.x, p3.x, u);
          let curY = cubicBezier(p0.y, p1.y, p2.y, p3.y, u);
          const curZ = cubicBezier(p0.z, p1.z, p2.z, p3.z, u);

          // Settle bounce near touchdown
          if (flyP > 0.82) {
            const b = (flyP - 0.82) / 0.18;
            curY += Math.sin(b * Math.PI) * 0.045 * (1 - b);
          }

          const curRotX = SCAN_ROTATION.x + (-Math.PI / 2 - SCAN_ROTATION.x) * u;
          const curRotZ = (idx - 1.5) * 0.03 * u;

          ar.group.position.set(curX, curY, curZ);
          ar.group.rotation.set(curRotX, 0, curRotZ);
        } else {
          // Landed on stack
          ar.group.visible = true;
          ar.overlayMesh.visible = true;
          ar.overlayMesh.scale.set(1, 1, 1);
          ar.scannedTex.repeat.set(1, 1);
          ar.scannedTex.offset.set(0, 0);
          ar.chipMesh.scale.set(1, 1, 1);

          const finalRotZ = (idx - 1.5) * 0.03;

          // Gentle fade-out after all 4 have landed (loopTime 9.4 -> 10.0)
          if (loopTime >= 9.4) {
            const fadeProgress = (loopTime - 9.4) / 0.6;
            const op = Math.max(0, 1 - fadeProgress);
            ar.baseMat.opacity = op;
            ar.overlayMat.opacity = op;
            ar.group.position.set(stack.x, stackLandingY - fadeProgress * 0.03, stack.z);
          } else {
            ar.baseMat.opacity = 1;
            ar.overlayMat.opacity = 1;
            ar.group.position.set(stack.x, stackLandingY, stack.z);
            calculatedDeductible += ar.data.amountCents;
          }

          ar.group.rotation.set(-Math.PI / 2, 0, finalRotZ);
        }
      });

      if (!scannerActive) {
        scannerGroup.visible = false;
      }

      // Performance: Only update React state when the value actually changes
      if (calculatedDeductible !== lastReportedDeductibleRef.current) {
        lastReportedDeductibleRef.current = calculatedDeductible;
        setDeductibleSoFarCents(calculatedDeductible);
      }

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };

    // Reduced motion change listener restarts RAF loop if preference turns off
    const onMotionChange = (e: MediaQueryListEvent) => {
      isReduced = e.matches;
      if (isReduced) {
        renderStillFrame();
      } else {
        startTime = null;
        animFrameId = requestAnimationFrame(animate);
      }
    };
    motionQuery.addEventListener("change", onMotionChange);

    if (isReduced) {
      renderStillFrame();
    } else {
      animFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animFrameId);
      motionQuery.removeEventListener("change", onMotionChange);
      themeObserver.disconnect();
      colorSchemeQuery.removeEventListener("change", onColorSchemeChange);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);

      disposables.forEach(d => d.dispose());
      scene.clear();
      renderer.dispose();
    };
  }, [webGLAvailable]);

  if (!webGLAvailable) {
    return <HeroFallback />;
  }

  return (
    <figure
      ref={containerRef}
      className="hero-3d-container"
      aria-label="Animated sample: receipts are scanned and sorted into deduction categories"
    >
      <canvas
        ref={canvasRef}
        className="hero-3d-canvas"
        aria-hidden="true"
      />

      {/* HTML Ledger Card Overlay */}
      <div className="hero-ledger-card" aria-live="off">
        <div className="hero-ledger-top">
          <span className="hero-ledger-dot" aria-hidden="true" />
          <span className="hero-ledger-heading">Sample · deductible so far</span>
        </div>
        <div className="hero-ledger-amount mono">
          {formatUSD(deductibleSoFarCents, 2)}
        </div>
        <div className="hero-ledger-footer">
          <span className="hero-ledger-badge">Sample data</span>
          <span>4 fictional receipts</span>
        </div>
      </div>

      <figcaption className="sr-only">
        Interactive 3D demonstration: loose paper receipts drift in, pass through a category-scanning beam, and settle into categorized deduction stacks.
      </figcaption>
    </figure>
  );
}
