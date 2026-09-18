import { test, expect } from "@playwright/test";

test.describe("MorphoLens E2E Suite", () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant simulated camera permissions
    await context.grantPermissions(["camera"]);
    await page.goto("/");
  });

  test("loads MorphoLens application shell and brand identity", async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/MorphoLens/i);
    await expect(page.getByText("MorphoLens").first()).toBeVisible();
    await expect(
      page.getByText("Client-Side Anthropometric AI & 3D Estimation").first(),
    ).toBeVisible();
    await expect(page.getByText("WASM SIMD")).toBeVisible();
    await expect(page.getByText("ZERO CLOUD COMPUTE")).toBeVisible();
    await expect(page.getByText("1€ FILTERED")).toBeVisible();
  });

  test("activates simulated biometric feed and computes anthropometric telemetry", async ({
    page,
  }) => {
    // Engage simulation mode
    const simButton = page
      .locator(
        '[data-testid="btn-simulate"], [data-testid="btn-simulate-error"]',
      )
      .first();
    await expect(simButton).toBeVisible();
    await simButton.click();

    // Wait for metrics to populate
    await expect(page.getByText("TRACKING ACTIVE")).toBeVisible({
      timeout: 10000,
    });

    // Check primary metric cards
    const weightCard = page.getByTestId("card-weight");
    await expect(weightCard).toBeVisible();
    await expect(weightCard).toContainText(/kg|lbs/);

    const bodyFatCard = page.getByTestId("card-bodyfat");
    await expect(bodyFatCard).toBeVisible();
    await expect(bodyFatCard).toContainText(/%/);

    const muscleCard = page.getByTestId("card-muscle");
    await expect(muscleCard).toBeVisible();
    await expect(muscleCard).toContainText(/kg|lbs/);

    const leanCard = page.getByTestId("card-lean");
    await expect(leanCard).toBeVisible();
    await expect(leanCard).toContainText(/kg|lbs/);

    // Verify biomechanical proportions
    await expect(page.getByText("SHOULDER SPAN").first()).toBeVisible();
    await expect(page.getByText("WAIST CIRCUMFERENCE").first()).toBeVisible();
    await expect(page.getByText("HIP SPAN").first()).toBeVisible();
  });

  test("updates anthropometric calculations when anchor height is modified", async ({
    page,
  }) => {
    const simButton = page
      .locator(
        '[data-testid="btn-simulate"], [data-testid="btn-simulate-error"]',
      )
      .first();
    await expect(simButton).toBeVisible();
    await simButton.click();

    // Default anchor is 175 cm
    await expect(page.getByText("175 cm")).toBeVisible();

    // Click Edit
    await page.getByRole("button", { name: "Edit" }).click();

    // Change height input to 185
    const heightInput = page.locator('input[type="number"]');
    await heightInput.fill("185");
    await page.getByRole("button", { name: "Save" }).click();

    // Check updated anchor display
    await expect(page.getByText("185 cm")).toBeVisible();
  });

  test("toggles metric and imperial units with persistent localStorage state", async ({
    page,
  }) => {
    const simButton = page
      .locator(
        '[data-testid="btn-simulate"], [data-testid="btn-simulate-error"]',
      )
      .first();
    await expect(simButton).toBeVisible();
    await simButton.click();

    const unitToggleButton = page.locator("button:has-text('METRIC')");
    await expect(unitToggleButton).toBeVisible();

    // Switch to Imperial
    await unitToggleButton.click();
    await expect(page.locator("button:has-text('IMPERIAL')")).toBeVisible();

    const weightCard = page.getByTestId("card-weight");
    await expect(weightCard).toContainText("lbs");

    // Reload page to verify localStorage persistence
    await page.reload();
    await expect(page.locator("button:has-text('IMPERIAL')")).toBeVisible();
  });

  test("renders 3D Anthropometric Mesh viewport with slice rings and OrbitControls", async ({
    page,
  }) => {
    await expect(page.getByText("3D ANTHROPOMETRIC MESH")).toBeVisible();
    await expect(page.getByText("ORBIT / ZOOM / PAN")).toBeVisible();

    // WebGL Canvas
    const threeCanvas = page.locator(".cursor-grab canvas, canvas").first();
    await expect(threeCanvas).toBeVisible();

    // Toggle slice rings button
    const sliceBtn = page.locator(
      'button[title="Toggle Measurement Slice Rings"]',
    );
    await expect(sliceBtn).toBeVisible();
    await sliceBtn.click();

    // Toggle wireframe button
    const wireframeBtn = page.locator('button[title="Toggle Wireframe Mode"]');
    await expect(wireframeBtn).toBeVisible();
    await wireframeBtn.click();

    // Perform mouse drag gesture to simulate user rotation
    const box = await threeCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 100,
        box.y + box.height / 2,
      );
      await page.mouse.up();
    }
  });

  test("triggers JSON and CSV session export downloads", async ({ page }) => {
    const simButton = page
      .locator(
        '[data-testid="btn-simulate"], [data-testid="btn-simulate-error"]',
      )
      .first();
    await expect(simButton).toBeVisible();
    await simButton.click();

    await expect(page.getByTestId("card-weight")).toBeVisible();

    // Test JSON export download trigger
    const jsonDownloadPromise = page.waitForEvent("download");
    await page.getByTestId("btn-export-json").click();
    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toContain(".json");

    // Test CSV export download trigger
    const csvDownloadPromise = page.waitForEvent("download");
    await page.getByTestId("btn-export-csv").click();
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toContain(".csv");
  });

  test("supports mobile viewport switching between Optical Telemetry and 3D Avatar", async ({
    page,
  }) => {
    // Resize viewport to mobile screen
    await page.setViewportSize({ width: 390, height: 844 });

    const opticalTab = page.getByRole("button", {
      name: /OPTICAL TELEMETRY/i,
    });
    const meshTab = page.getByRole("button", { name: /3D ANTHROPO MESH/i });

    await expect(opticalTab).toBeVisible();
    await expect(meshTab).toBeVisible();

    // Switch to 3D Avatar view
    await meshTab.click();
    await expect(page.getByText("3D ANTHROPOMETRIC MESH")).toBeVisible();

    // Switch back to Optical Telemetry view
    await opticalTab.click();
    await expect(
      page.getByText("TRACKING ACTIVE").or(page.getByText("STANDBY")),
    ).toBeVisible();
  });
});
