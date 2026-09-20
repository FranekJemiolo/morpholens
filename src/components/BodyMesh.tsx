import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AnthropometricMetrics } from "../types/vision.ts";
import { Rotate3d, Eye, Layers, RotateCcw } from "lucide-react";

interface BodyMeshProps {
  metrics: AnthropometricMetrics | null;
  poseDetected: boolean;
}

export const BodyMesh: React.FC<BodyMeshProps> = ({
  metrics,
  poseDetected,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sliceRingsGroupRef = useRef<THREE.Group | null>(null);
  const materialsRef = useRef<{
    body?: THREE.MeshStandardMaterial;
    wireframe?: THREE.MeshBasicMaterial;
  }>({});

  const [showSliceRings, setShowSliceRings] = useState(true);
  const [wireframeMode, setWireframeMode] = useState(false);

  // References to deformable avatar meshes
  const meshPartsRef = useRef<{
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
    // Slice rings
    shoulderRing?: THREE.Mesh;
    chestRing?: THREE.Mesh;
    waistRing?: THREE.Mesh;
    hipRing?: THREE.Mesh;
    // Smoothed target parameters
    current: {
      shoulderScaleX: number;
      chestScaleZ: number;
      waistScaleX: number;
      waistScaleZ: number;
      hipScaleX: number;
      hipScaleZ: number;
      heightScaleY: number;
      limbThickness: number;
    };
  }>({
    current: {
      shoulderScaleX: 1.0,
      chestScaleZ: 1.0,
      waistScaleX: 1.0,
      waistScaleZ: 1.0,
      hipScaleX: 1.0,
      hipScaleZ: 1.0,
      heightScaleY: 1.0,
      limbThickness: 1.0,
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
    scene.fog = new THREE.FogExp2("#070B14", 0.04);

    // 2. Camera setup - framed to view complete humanoid from head to toe with full clearance above the bottom telemetry bar
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.82, 4.4);
    camera.lookAt(0, 0.8, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.8, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minDistance = 1.5;
    controls.maxDistance = 6.0;
    controlsRef.current = controls;

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight("#0F172A", 2.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight("#38BDF8", 2.4);
    keyLight.position.set(2.5, 4.0, 3.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#10B981", 1.9);
    rimLight.position.set(-2.5, 2.5, -2.5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight("#8B5CF6", 1.2, 6);
    fillLight.position.set(0, 0.2, 1.5);
    scene.add(fillLight);

    // 6. Floor Pedestal & Grid
    const grid = new THREE.GridHelper(6, 24, "#38BDF8", "#1E293B");
    grid.position.y = 0;
    scene.add(grid);

    const pedestalGeo = new THREE.RingGeometry(0.3, 0.85, 36);
    const pedestalMat = new THREE.MeshBasicMaterial({
      color: "#38BDF8",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.rotation.x = Math.PI / 2;
    pedestal.position.y = 0.005;
    scene.add(pedestal);

    // 7. Avatar Group & Materials
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: "#1E293B",
      roughness: 0.3,
      metalness: 0.75,
      wireframe: false,
    });
    materialsRef.current.body = bodyMat;

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: "#38BDF8",
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    materialsRef.current.wireframe = wireframeMat;

    const jointMat = new THREE.MeshStandardMaterial({
      color: "#10B981",
      emissive: "#10B981",
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.9,
    });

    // Anatomical Geometries
    const headGeo = new THREE.IcosahedronGeometry(0.125, 2);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.position.set(0, 1.72, 0);
    const headWire = new THREE.Mesh(headGeo, wireframeMat);
    headMesh.add(headWire);
    avatarGroup.add(headMesh);
    meshPartsRef.current.head = headMesh;

    // Chest / Upper Torso
    const chestGeo = new THREE.CylinderGeometry(0.21, 0.17, 0.28, 20);
    const chestMesh = new THREE.Mesh(chestGeo, bodyMat);
    chestMesh.position.set(0, 1.44, 0);
    const chestWire = new THREE.Mesh(chestGeo, wireframeMat);
    chestMesh.add(chestWire);
    avatarGroup.add(chestMesh);
    meshPartsRef.current.chest = chestMesh;

    // Waist / Mid Torso
    const waistGeo = new THREE.CylinderGeometry(0.17, 0.19, 0.22, 20);
    const waistMesh = new THREE.Mesh(waistGeo, bodyMat);
    waistMesh.position.set(0, 1.2, 0);
    const waistWire = new THREE.Mesh(waistGeo, wireframeMat);
    waistMesh.add(waistWire);
    avatarGroup.add(waistMesh);
    meshPartsRef.current.waist = waistMesh;

    // Pelvis / Hips
    const pelvisGeo = new THREE.CylinderGeometry(0.19, 0.16, 0.18, 20);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, bodyMat);
    pelvisMesh.position.set(0, 1.02, 0);
    const pelvisWire = new THREE.Mesh(pelvisGeo, wireframeMat);
    pelvisMesh.add(pelvisWire);
    avatarGroup.add(pelvisMesh);
    meshPartsRef.current.pelvis = pelvisMesh;

    // Major Joints
    const jointGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const lShoulderJoint = new THREE.Mesh(jointGeo, jointMat);
    lShoulderJoint.position.set(-0.25, 1.52, 0);
    avatarGroup.add(lShoulderJoint);

    const rShoulderJoint = new THREE.Mesh(jointGeo, jointMat);
    rShoulderJoint.position.set(0.25, 1.52, 0);
    avatarGroup.add(rShoulderJoint);

    // Limbs
    const upperArmGeo = new THREE.CylinderGeometry(0.052, 0.045, 0.28, 14);
    const lowerArmGeo = new THREE.CylinderGeometry(0.045, 0.038, 0.26, 14);

    const lArmUpper = new THREE.Mesh(upperArmGeo, bodyMat);
    lArmUpper.position.set(-0.28, 1.34, 0);
    lArmUpper.rotation.z = -0.15;
    avatarGroup.add(lArmUpper);
    meshPartsRef.current.lArmUpper = lArmUpper;

    const lArmLower = new THREE.Mesh(lowerArmGeo, bodyMat);
    lArmLower.position.set(-0.33, 1.08, 0);
    lArmLower.rotation.z = -0.15;
    avatarGroup.add(lArmLower);
    meshPartsRef.current.lArmLower = lArmLower;

    const rArmUpper = new THREE.Mesh(upperArmGeo, bodyMat);
    rArmUpper.position.set(0.28, 1.34, 0);
    rArmUpper.rotation.z = 0.15;
    avatarGroup.add(rArmUpper);
    meshPartsRef.current.rArmUpper = rArmUpper;

    const rArmLower = new THREE.Mesh(lowerArmGeo, bodyMat);
    rArmLower.position.set(0.33, 1.08, 0);
    rArmLower.rotation.z = 0.15;
    avatarGroup.add(rArmLower);
    meshPartsRef.current.rArmLower = rArmLower;

    // Legs
    const upperLegGeo = new THREE.CylinderGeometry(0.085, 0.065, 0.44, 16);
    const lowerLegGeo = new THREE.CylinderGeometry(0.065, 0.048, 0.46, 16);

    const lLegUpper = new THREE.Mesh(upperLegGeo, bodyMat);
    lLegUpper.position.set(-0.12, 0.72, 0);
    avatarGroup.add(lLegUpper);
    meshPartsRef.current.lLegUpper = lLegUpper;

    const lLegLower = new THREE.Mesh(lowerLegGeo, bodyMat);
    lLegLower.position.set(-0.12, 0.26, 0);
    avatarGroup.add(lLegLower);
    meshPartsRef.current.lLegLower = lLegLower;

    const rLegUpper = new THREE.Mesh(upperLegGeo, bodyMat);
    rLegUpper.position.set(0.12, 0.72, 0);
    avatarGroup.add(rLegUpper);
    meshPartsRef.current.rLegUpper = rLegUpper;

    const rLegLower = new THREE.Mesh(lowerLegGeo, bodyMat);
    rLegLower.position.set(0.12, 0.26, 0);
    avatarGroup.add(rLegLower);
    meshPartsRef.current.rLegLower = rLegLower;

    // 8. Anatomical Measurement Slice Rings
    const sliceRingsGroup = new THREE.Group();
    sliceRingsGroupRef.current = sliceRingsGroup;
    avatarGroup.add(sliceRingsGroup);

    const createSliceTorus = (radius: number, color: string, yPos: number) => {
      const torusGeo = new THREE.TorusGeometry(radius, 0.008, 8, 36);
      const torusMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = Math.PI / 2;
      torus.position.y = yPos;
      sliceRingsGroup.add(torus);
      return torus;
    };

    meshPartsRef.current.shoulderRing = createSliceTorus(0.26, "#F59E0B", 1.52);
    meshPartsRef.current.chestRing = createSliceTorus(0.23, "#38BDF8", 1.44);
    meshPartsRef.current.waistRing = createSliceTorus(0.19, "#10B981", 1.2);
    meshPartsRef.current.hipRing = createSliceTorus(0.21, "#8B5CF6", 1.02);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // 9. Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      controls.update();

      // Gentle ambient idle spin
      avatarGroup.rotation.y += delta * 0.12;

      // Smooth Morphing Scale Application
      const parts = meshPartsRef.current;
      const cur = parts.current;

      if (parts.chest) {
        parts.chest.scale.set(
          cur.shoulderScaleX,
          cur.heightScaleY,
          cur.chestScaleZ,
        );
      }
      if (parts.waist) {
        parts.waist.scale.set(
          cur.waistScaleX,
          cur.heightScaleY,
          cur.waistScaleZ,
        );
      }
      if (parts.pelvis) {
        parts.pelvis.scale.set(cur.hipScaleX, cur.heightScaleY, cur.hipScaleZ);
      }
      if (parts.lArmUpper && parts.rArmUpper) {
        parts.lArmUpper.scale.set(
          cur.limbThickness,
          cur.heightScaleY,
          cur.limbThickness,
        );
        parts.rArmUpper.scale.set(
          cur.limbThickness,
          cur.heightScaleY,
          cur.limbThickness,
        );
      }
      if (parts.lLegUpper && parts.rLegUpper) {
        parts.lLegUpper.scale.set(
          cur.limbThickness * 1.1,
          cur.heightScaleY,
          cur.limbThickness * 1.1,
        );
        parts.rLegUpper.scale.set(
          cur.limbThickness * 1.1,
          cur.heightScaleY,
          cur.limbThickness * 1.1,
        );
      }

      // Scale Slice Rings proportionally
      if (parts.shoulderRing) {
        parts.shoulderRing.scale.set(cur.shoulderScaleX, cur.shoulderScaleX, 1);
      }
      if (parts.chestRing) {
        parts.chestRing.scale.set(cur.shoulderScaleX * 0.9, cur.chestScaleZ, 1);
      }
      if (parts.waistRing) {
        parts.waistRing.scale.set(cur.waistScaleX, cur.waistScaleZ, 1);
      }
      if (parts.hipRing) {
        parts.hipRing.scale.set(cur.hipScaleX, cur.hipScaleZ, 1);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update morph targets when anthropometric telemetry arrives
  useEffect(() => {
    if (!metrics || !poseDetected) return;

    // Baselines: shoulder width ~42cm, chest depth ~24cm, waist width ~28cm, waist depth ~22cm, hip width ~36cm
    const targetShoulderX = Math.max(
      0.65,
      Math.min(1.5, metrics.shoulderWidthCm / 42),
    );
    const targetChestZ = Math.max(
      0.65,
      Math.min(1.6, metrics.chestDepthCm / 24),
    );
    const targetWaistX = Math.max(
      0.65,
      Math.min(1.6, metrics.waistWidthCm / 28),
    );
    const targetWaistZ = Math.max(
      0.65,
      Math.min(1.6, (metrics.waistCircumferenceCm * 0.28) / 22),
    );
    const targetHipX = Math.max(0.65, Math.min(1.5, metrics.hipWidthCm / 36));
    const targetHipZ = targetWaistZ * 0.95;
    const targetHeightY = Math.max(
      0.8,
      Math.min(1.25, metrics.calibratedHeightCm / 175),
    );
    const targetLimb = Math.max(
      0.7,
      Math.min(1.45, (metrics.skeletalMuscleMassKg / 30) * 0.85 + 0.15),
    );

    const cur = meshPartsRef.current.current;
    const alpha = 0.12;
    cur.shoulderScaleX += (targetShoulderX - cur.shoulderScaleX) * alpha;
    cur.chestScaleZ += (targetChestZ - cur.chestScaleZ) * alpha;
    cur.waistScaleX += (targetWaistX - cur.waistScaleX) * alpha;
    cur.waistScaleZ += (targetWaistZ - cur.waistScaleZ) * alpha;
    cur.hipScaleX += (targetHipX - cur.hipScaleX) * alpha;
    cur.hipScaleZ += (targetHipZ - cur.hipScaleZ) * alpha;
    cur.heightScaleY += (targetHeightY - cur.heightScaleY) * alpha;
    cur.limbThickness += (targetLimb - cur.limbThickness) * alpha;
  }, [metrics, poseDetected]);

  // Toggle Slice Rings
  useEffect(() => {
    if (sliceRingsGroupRef.current) {
      sliceRingsGroupRef.current.visible = showSliceRings;
    }
  }, [showSliceRings]);

  // Toggle Wireframe Mode
  useEffect(() => {
    if (materialsRef.current.body) {
      materialsRef.current.body.wireframe = wireframeMode;
    }
  }, [wireframeMode]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0.82, 4.4);
      controlsRef.current.target.set(0, 0.8, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-[#070B14] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top HUD Controls */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-slate-900/80 border border-emerald-500/30 rounded-md text-xs font-mono text-emerald-400 flex items-center space-x-1.5">
            <Rotate3d className="w-3.5 h-3.5" />
            <span>3D ANTHROPOMETRIC MESH</span>
          </span>
          {metrics?.isDualAngle && (
            <span className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/40 rounded text-[10px] font-mono text-cyan-300">
              DUAL-ANGLE FUSED
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowSliceRings(!showSliceRings)}
            className={`p-1.5 rounded-md border text-xs font-mono transition ${
              showSliceRings
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900/80 text-slate-400 border-slate-700"
            }`}
            title="Toggle Measurement Slice Rings"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`p-1.5 rounded-md border text-xs font-mono transition ${
              wireframeMode
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-slate-900/80 text-slate-400 border-slate-700"
            }`}
            title="Toggle Wireframe Mode"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-700 transition"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Metrics Bar */}
      <div className="absolute bottom-3 inset-x-3 p-2.5 bg-slate-950/85 backdrop-blur-md rounded-xl border border-cyan-500/20 text-xs font-mono flex items-center justify-between text-slate-300 pointer-events-none z-10">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-slate-500 text-[10px] block">SHOULDER X</span>
            <span className="text-amber-400 font-bold">
              {metrics ? `${metrics.shoulderWidthCm} cm` : "--"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">CHEST Z</span>
            <span className="text-cyan-400 font-bold">
              {metrics ? `${metrics.chestDepthCm} cm` : "--"}
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
            <span className="text-violet-400 font-bold">
              {metrics ? `${metrics.hipWidthCm} cm` : "--"}
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-1 text-slate-400">
          <Rotate3d className="w-3.5 h-3.5 text-cyan-400" />
          <span>ORBIT / ZOOM / PAN</span>
        </div>
      </div>
    </div>
  );
};
