# MorphoLens Anthropometric Mathematics & Signal Processing Specification

This document provides mathematical derivations and formulation specifications for the client-side signal processing, optical scaling, multi-angle volumetric integration, and regression models implemented in MorphoLens.

---

## 1. 1€ Filter (OneEuroFilter) Temporal Landmark Smoothing

Raw 33-point 3D landmark coordinates output by Google MediaPipe BlazePose exhibit high-frequency jitter due to sensor noise and micro-movements. A conventional first-order low-pass filter introduces unacceptable phase lag during rapid motion.

MorphoLens implements the **1€ Filter** (_Casiez, Roussel, Vogel, CHI 2012_), which adaptively modulates its cutoff frequency based on instantaneous signal velocity.

### Formulation

For any coordinate dimension $x_i \in \{x, y, z\}$ at time $t_k$:

1. **Sampling Rate & Time Step:**
   $$\Delta t = t_k - t_{k-1}, \quad f_s = \frac{1}{\Delta t}$$

2. **Discrete Derivative (Velocity):**
   $$\dot{x}_k = \frac{x_k - \hat{x}_{k-1}}{\Delta t}$$

3. **Filtered Velocity ($\widehat{\dot{x}}_k$):**
   $$\widehat{\dot{x}}_k = \alpha_d \cdot \dot{x}_k + (1 - \alpha_d) \cdot \widehat{\dot{x}}_{k-1}$$
   where:
   $$\alpha_d = \frac{1}{1 + \frac{\tau_d}{\Delta t}}, \quad \tau_d = \frac{1}{2\pi f_{c,d}}, \quad f_{c,d} = 1.0\text{ Hz}$$

4. **Adaptive Cutoff Frequency ($f_c$):**
   $$f_c = f_{c,\min} + \beta \cdot \left| \widehat{\dot{x}}_k \right|$$
   - $f_{c,\min} = 1.0\text{ Hz}$ (minimum cutoff frequency at near-zero velocity, aggressively filtering stationary jitter)
   - $\beta = 0.007$ (speed coefficient, reducing lag during fast physical movement)

5. **Filtered Coordinate ($\hat{x}_k$):**
   $$\hat{x}_k = \alpha \cdot x_k + (1 - \alpha) \cdot \hat{x}_{k-1}$$
   where:
   $$\alpha = \frac{1}{1 + \frac{\tau}{\Delta t}}, \quad \tau = \frac{1}{2\pi f_c}$$

---

## 2. Monocular Metric Calibration via Anchor Scale

Monocular 2D images inherently suffer from projective scale ambiguity. MorphoLens resolves this by enforcing a user-calibrated physical anchor metric (standing height $H_{\text{anchor}}$ in cm).

### Scale Derivation

1. **Cranial Apex Estimation ($Y_{\text{apex}}$):**
   MediaPipe landmark $P_0$ represents the nasal tip. The superior cranial vertex is estimated above the nose based on the distance between the nose and the acromion shoulder midpoint ($P_{\text{shoulder,mid}}$):
   $$H_{\text{cranium,px}} = \max\left(20, \left| P_{\text{shoulder,mid},y} - P_{0,y} \right| \times 1.6 \times H_{\text{canvas}}\right)$$
   $$Y_{\text{apex}} = \max\left(0, P_{0,y} \times H_{\text{canvas}} - 0.75 \cdot H_{\text{cranium,px}}\right)$$

2. **Floor Contact Baseline ($Y_{\text{floor}}$):**
   Computed as the average vertical coordinate of bilateral calcaneus (heels $P_{29}, P_{30}$) or lateral malleoli (ankles $P_{27}, P_{28}$):
   $$Y_{\text{floor}} = \frac{P_{29,y} + P_{30,y}}{2} \times H_{\text{canvas}}$$

3. **Detected Pixel Stature ($\Delta Y_{\text{detected}}$):**
   $$\Delta Y_{\text{detected}} = Y_{\text{floor}} - Y_{\text{apex}}$$

4. **Optical Scale Factor ($S$ in cm/pixel):**
   $$S = \frac{H_{\text{anchor}}}{\Delta Y_{\text{detected}}}$$

---

## 3. Multi-Angle Dual-Axis Volumetric Integration

Single front-view captures cannot observe the sagittal axis (depth). MorphoLens uses a 2-stage guided workflow (Front Coronal + Side Sagittal) to construct true elliptical cross-sections.

### Elliptical Segment Slices

At any horizontal cross-section $y$, the human torso approximates an ellipse with:

- Semi-major axis $a = \frac{W_{\text{coronal}}}{2}$ (measured from Front View)
- Semi-minor axis $b = \frac{D_{\text{sagittal}}}{2}$ (measured from Side Profile)

1. **Cross-Sectional Area ($A$):**
   $$A = \pi \cdot a \cdot b = \pi \cdot \frac{W_{\text{coronal}}}{2} \cdot \frac{D_{\text{sagittal}}}{2}$$

2. **Ramanujan's First Approximation for Perimeter (Circumference $C$):**
   $$h = \frac{(a - b)^2}{(a + b)^2}$$
   $$C \approx \pi (a + b) \left[ 1 + \frac{3h}{10 + \sqrt{4 - 3h}} \right]$$
   or Ramanujan's algebraic form:
   $$C \approx \pi \left[ 3(a + b) - \sqrt{(3a + b)(a + 3b)} \right]$$

3. **Prismoidal / Simpson's Rule for Torso Volume ($V_{\text{torso}}$):**
   The torso is integrated across chest, waist, and hip cross-sections over torso length $L_{\text{torso}}$:
   $$V_{\text{torso}} = \frac{L_{\text{torso}}}{6} \left( A_{\text{chest}} + 4 A_{\text{waist}} + A_{\text{hips}} \right)$$

4. **Appendicular Limb Volumes (Frustum Cylinders):**
   $$V_{\text{arms}} = 2 \times \left( \pi \cdot r_{\text{arm}}^2 \cdot L_{\text{arm}} \right)$$
   $$V_{\text{legs}} = 2 \times \left( \pi \cdot r_{\text{leg}}^2 \cdot L_{\text{leg}} \right)$$

5. **Cranial Volume (Ellipsoid):**
   $$V_{\text{head}} \approx \frac{4}{3}\pi \cdot r_x r_y r_z \approx 4.18\text{ Liters}$$

6. **Total Estimated Body Mass ($M_{\text{est}}$):**
   Using mean human tissue density ($\rho_{\text{body}} \approx 1.055\text{ kg/L}$):
   $$M_{\text{est}} = \left( V_{\text{torso}} + V_{\text{arms}} + V_{\text{legs}} + V_{\text{head}} \right) \times \rho_{\text{body}}$$

---

## 4. Anthropometric Regression Formulations

### 4.1. Modified U.S. Navy Circumference Equation

$$BF\%_{\text{Navy}} = \frac{495}{1.0324 - 0.19077 \cdot \log_{10}(C_{\text{waist}} - C_{\text{neck}}) + 0.15456 \cdot \log_{10}(H_{\text{anchor}})} - 450$$

### 4.2. Jackson-Pollock / Wilmore-Behnke Body Density ($D$)

Derived from waist circumference and height:
$$D = 1.10938 - 0.0008267 \cdot C_{\text{waist,adj}} + 0.0000016 \cdot C_{\text{waist,adj}}^2 - 0.0002574 \cdot H_{\text{anchor}} \cdot 0.1$$

### 4.3. Siri & Brožek Two-Compartment Models

- **Siri Equation (1956):**
  $$BF\%_{\text{Siri}} = \frac{495}{D} - 450$$
- **Brožek Equation (1963):**
  $$BF\%_{\text{Brozek}} = \frac{457}{D} - 414.2$$

### 4.4. Multi-Equation Ensemble

To avoid single-model bias, MorphoLens evaluates an ensemble:
$$BF\% = 0.50 \cdot BF\%_{\text{Navy}} + 0.25 \cdot BF\%_{\text{Siri}} + 0.25 \cdot BF\%_{\text{Brozek}}$$
Subject to physiological bounds: $BF\% \in [4.0\%, 55.0\%]$.

### 4.5. Compartmental Mass Quantification

1. **Lean Body Mass (LBM):**
   $$\text{LBM} = M_{\text{est}} \times \left(1 - \frac{BF\%}{100}\right)$$

2. **Skeletal Muscle Mass (SMM):**
   Derived via the Janssen et al. bio-anthropometric regression:
   $$\text{SMM} \approx 0.54 \times \text{LBM}$$
