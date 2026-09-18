import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import type { AnthropometricMetrics } from "../types/vision.ts";
import { Rotate3d, Maximize2, Shield } from "lucide-react";

interface BodyMeshProps {
  metrics: AnthropometricMetrics | null;
  poseDetected: boolean;
}

export const BodyMesh: React.FC<BodyMeshProps> = ({
  metrics,
  poseDetected,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const avatarGroupRef = useRef<THREE.Group | null>(null);

  // References to deformable mesh parts
  const meshPartsRef = useRef<{
    torso?: THREE.Mesh;
    chest?: THREE.Mesh;
    waist?: THREE.Mesh;
    pelvis?: THREE.Mesh;
    head?: THREE.Mesh;
    lArmUpper?: THREE.Mesh;
    rArmUpper?: THREE.Mesh;
    lArmLower?: THREE.Mesh;
    rArmLower?: THREE.Mesh;
    lLegUpper?: THREE.Mesh;
    rLegUpper?: THREE.Mesh;
    lLegLower?: THREE.Mesh;
    rLegLower?: THREE.Mesh;
    // Current smoothed proportions
    current: {
      shoulderWidth: number;
      waistWidth: number;
      hipWidth: number;
      heightScale: number;
      limbThickness: number;
      rotationY: number;
    };
  }>({
    current: {
      shoulderWidth: 1.0,
      waistWidth: 1.0,
      hipWidth: 1.0,
      heightScale: 1.0,
      limbThickness: 1.0,
      rotationY: 0,
    },
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#070B14");
    scene.fog = new THREE.FogExp2("#070B14", 0.05);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 3.2);
    camera.lookAt(0, 0.9, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight("#0F172A", 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#38BDF8", 2.2);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight("#10B981", 1.8);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    const bottomLight = new THREE.PointLight("#8B5CF6", 1.2, 5);
    bottomLight.position.set(0, 0.1, 1);
    scene.add(bottomLight);

    // 5. Ground Hologram Grid
    const grid = new THREE.GridHelper(6, 24, "#38BDF8", "#1E293B");
    grid.position.y = 0;
    scene.add(grid);

    // Ground circle pedestal
    const pedestalGeo = new THREE.RingGeometry(0.3, 0.8, 32);
    const pedestalMat = new THREE.MeshBasicMaterial({
      color: "#38BDF8",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.rotation.x = Math.PI / 2;
    pedestal.position.y = 0.005;
    scene.add(pedestal);

    // 6. Parametric Anatomical Avatar Assembly
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;
    scene.add(avatarGroup);

    // Stylized Cybernetic Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: "#1E293B",
      roughness: 0.35,
      metalness: 0.75,
      wireframe: false,
    });

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: "#38BDF8",
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: "#10B981",
      emissive: "#10B981",
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.9,
    });

    // Head
    const headGeo = new THREE.IcosahedronGeometry(0.12, 2);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.position.set(0, 1.72, 0);
    const headWire = new THREE.Mesh(headGeo, wireframeMat);
    headMesh.add(headWire);
    avatarGroup.add(headMesh);
    meshPartsRef.current.head = headMesh;

    // Chest / Upper Torso
    const chestGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.28, 16);
    const chestMesh = new THREE.Mesh(chestGeo, bodyMat);
    chestMesh.position.set(0, 1.44, 0);
    const chestWire = new THREE.Mesh(chestGeo, wireframeMat);
    chestMesh.add(chestWire);
    avatarGroup.add(chestMesh);
    meshPartsRef.current.chest = chestMesh;

    // Waist / Mid Torso
    const waistGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.22, 16);
    const waistMesh = new THREE.Mesh(waistGeo, bodyMat);
    waistMesh.position.set(0, 1.2, 0);
    const waistWire = new THREE.Mesh(waistGeo, wireframeMat);
    waistMesh.add(waistWire);
    avatarGroup.add(waistMesh);
    meshPartsRef.current.waist = waistMesh;

    // Pelvis / Hips
    const pelvisGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.18, 16);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, bodyMat);
    pelvisMesh.position.set(0, 1.02, 0);
    const pelvisWire = new THREE.Mesh(pelvisGeo, wireframeMat);
    pelvisMesh.add(pelvisWire);
    avatarGroup.add(pelvisMesh);
    meshPartsRef.current.pelvis = pelvisMesh;

    // Shoulder & Hip Joints
    const jointGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const lShoulderJoint = new THREE.Mesh(jointGeo, jointMat);
    lShoulderJoint.position.set(-0.24, 1.52, 0);
    avatarGroup.add(lShoulderJoint);

    const rShoulderJoint = new THREE.Mesh(jointGeo, jointMat);
    rShoulderJoint.position.set(0.24, 1.52, 0);
    avatarGroup.add(rShoulderJoint);

    // Arms
    const upperArmGeo = new THREE.CylinderGeometry(0.05, 0.042, 0.28, 12);
    const lowerArmGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.26, 12);

    // Left Arm
    const lArmUpper = new THREE.Mesh(upperArmGeo, bodyMat);
    lArmUpper.position.set(-0.27, 1.34, 0);
    lArmUpper.rotation.z = -0.15;
    avatarGroup.add(lArmUpper);
    meshPartsRef.current.lArmUpper = lArmUpper;

    const lArmLower = new THREE.Mesh(lowerArmGeo, bodyMat);
    lArmLower.position.set(-0.32, 1.08, 0);
    lArmLower.rotation.z = -0.15;
    avatarGroup.add(lArmLower);
    meshPartsRef.current.lArmLower = lArmLower;

    // Right Arm
    const rArmUpper = new THREE.Mesh(upperArmGeo, bodyMat);
    rArmUpper.position.set(0.27, 1.34, 0);
    rArmUpper.rotation.z = 0.15;
    avatarGroup.add(rArmUpper);
    meshPartsRef.current.rArmUpper = rArmUpper;

    const rArmLower = new THREE.Mesh(lowerArmGeo, bodyMat);
    rArmLower.position.set(0.32, 1.08, 0);
    rArmLower.rotation.z = 0.15;
    avatarGroup.add(rArmLower);
    meshPartsRef.current.rArmLower = rArmLower;

    // Legs
    const upperLegGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.44, 14);
    const lowerLegGeo = new THREE.CylinderGeometry(0.06, 0.045, 0.46, 14);

    // Left Leg
    const lLegUpper = new THREE.Mesh(upperLegGeo, bodyMat);
    lLegUpper.position.set(-0.12, 0.72, 0);
    avatarGroup.add(lLegUpper);
    meshPartsRef.current.lLegUpper = lLegUpper;

    const lLegLower = new THREE.Mesh(lowerLegGeo, bodyMat);
    lLegLower.position.set(-0.12, 0.26, 0);
    avatarGroup.add(lLegLower);
    meshPartsRef.current.lLegLower = lLegLower;

    // Right Leg
    const rLegUpper = new THREE.Mesh(upperLegGeo, bodyMat);
    rLegUpper.position.set(0.12, 0.72, 0);
    avatarGroup.add(rLegUpper);
    meshPartsRef.current.rLegUpper = rLegUpper;

    const rLegLower = new THREE.Mesh(lowerLegGeo, bodyMat);
    rLegLower.position.set(0.12, 0.26, 0);
    avatarGroup.add(rLegLower);
    meshPartsRef.current.rLegLower = rLegLower;

    // Mouse Drag Rotation
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      if (avatarGroupRef.current) {
        avatarGroupRef.current.rotation.y += deltaX * 0.01;
      }
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        const touch = e.touches[0];
        if (touch) {
          previousMousePositionRef.current = {
            x: touch.clientX,
            y: touch.clientY,
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - previousMousePositionRef.current.x;
      if (avatarGroupRef.current) {
        avatarGroupRef.current.rotation.y += deltaX * 0.01;
      }
      previousMousePositionRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    dom.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleMouseUp);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // 7. Animation Loop with smooth damping
    let animId: number;
    let lastFrameTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      // Gentle ambient idle rotation if user is not actively interacting
      if (!isDraggingRef.current && avatarGroupRef.current) {
        avatarGroupRef.current.rotation.y += delta * 0.2;
      }

      // Smooth Morphing Interpolation
      const parts = meshPartsRef.current;
      const cur = parts.current;

      // Apply morphing scales to 3D meshes
      if (parts.chest) {
        parts.chest.scale.set(
          cur.shoulderWidth,
          cur.heightScale,
          cur.shoulderWidth * 0.9,
        );
      }
      if (parts.waist) {
        parts.waist.scale.set(
          cur.waistWidth,
          cur.heightScale,
          cur.waistWidth * 0.85,
        );
      }
      if (parts.pelvis) {
        parts.pelvis.scale.set(
          cur.hipWidth,
          cur.heightScale,
          cur.hipWidth * 0.9,
        );
      }
      if (parts.lArmUpper && parts.rArmUpper) {
        parts.lArmUpper.scale.set(
          cur.limbThickness,
          cur.heightScale,
          cur.limbThickness,
        );
        parts.rArmUpper.scale.set(
          cur.limbThickness,
          cur.heightScale,
          cur.limbThickness,
        );
      }
      if (parts.lLegUpper && parts.rLegUpper) {
        parts.lLegUpper.scale.set(
          cur.limbThickness * 1.1,
          cur.heightScale,
          cur.limbThickness * 1.1,
        );
        parts.rLegUpper.scale.set(
          cur.limbThickness * 1.1,
          cur.heightScale,
          cur.limbThickness * 1.1,
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      dom.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, []);

  // Update target morph parameters when new anthropometrics arrive
  useEffect(() => {
    if (!metrics || !poseDetected) return;

    // Normalized ratios relative to standard human baselines
    // Standard baseline: shoulder ~42cm, waist ~80cm circumference (waistWidth ~28cm), hip ~36cm
    const targetShoulderScale = Math.max(
      0.65,
      Math.min(1.5, metrics.shoulderWidthCm / 42),
    );
    const targetWaistScale = Math.max(
      0.65,
      Math.min(1.6, metrics.waistWidthCm / 28),
    );
    const targetHipScale = Math.max(
      0.65,
      Math.min(1.5, metrics.hipWidthCm / 36),
    );
    const targetHeightScale = Math.max(
      0.8,
      Math.min(1.25, metrics.calibratedHeightCm / 175),
    );
    const targetLimbThickness = Math.max(
      0.7,
      Math.min(1.4, (metrics.skeletalMuscleMassKg / 30) * 0.9 + 0.1),
    );

    const cur = meshPartsRef.current.current;
    // Apply smooth exponential dampening
    const alpha = 0.15;
    cur.shoulderWidth += (targetShoulderScale - cur.shoulderWidth) * alpha;
    cur.waistWidth += (targetWaistScale - cur.waistWidth) * alpha;
    cur.hipWidth += (targetHipScale - cur.hipWidth) * alpha;
    cur.heightScale += (targetHeightScale - cur.heightScale) * alpha;
    cur.limbThickness += (targetLimbThickness - cur.limbThickness) * alpha;
  }, [metrics, poseDetected]);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-[#070B14] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col">
      {/* Three.js canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top HUD overlay */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-slate-900/80 border border-emerald-500/25 rounded-md text-xs font-mono text-emerald-400 flex items-center space-x-1.5">
            <Shield className="w-3 h-3" />
            <span>3D ANTHROPOMETRIC MESH</span>
          </span>
        </div>
        <div className="px-2 py-1 bg-slate-900/70 border border-slate-800 rounded-md text-[11px] font-mono text-slate-400 flex items-center space-x-1">
          <Rotate3d className="w-3 h-3 text-cyan-400" />
          <span>DRAG TO ROTATE</span>
        </div>
      </div>

      {/* Bottom Metrics Bar */}
      <div className="absolute bottom-3 inset-x-3 p-2.5 bg-slate-950/80 backdrop-blur-md rounded-xl border border-cyan-500/20 text-xs font-mono flex items-center justify-between text-slate-300 pointer-events-none z-10">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-slate-500 text-[10px] block">
              SHOULDER RATIO
            </span>
            <span className="text-cyan-400 font-bold">
              {metrics ? `${metrics.shoulderWidthCm} cm` : "--"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">
              WAIST PROXY
            </span>
            <span className="text-emerald-400 font-bold">
              {metrics ? `${metrics.waistCircumferenceCm} cm` : "--"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">HIP SPAN</span>
            <span className="text-amber-400 font-bold">
              {metrics ? `${metrics.hipWidthCm} cm` : "--"}
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-1 text-slate-400">
          <Maximize2 className="w-3.5 h-3.5" />
          <span>1:1 SCALE</span>
        </div>
      </div>
    </div>
  );
};
