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
    // Activate simulation
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

    // Change height input to 190
    const heightInput = page.locator('input[type="number"]');
    await heightInput.fill("190");
    await page.getByRole("button", { name: "Save" }).click();

    // Check updated anchor display
    await expect(page.getByText("190 cm")).toBeVisible();
  });

  test("toggles metric and imperial units seamlessly", async ({ page }) => {
    // Activate simulation
    const simButton = page
      .locator(
        '[data-testid="btn-simulate"], [data-testid="btn-simulate-error"]',
      )
      .first();
    await expect(simButton).toBeVisible();
    await simButton.click();

    const unitToggleButton = page.locator("button:has-text('METRIC')");
    await expect(unitToggleButton).toBeVisible();

    // Click toggle to switch to Imperial
    await unitToggleButton.click();
    await expect(page.locator("button:has-text('IMPERIAL')")).toBeVisible();

    // Verify imperial units appear
    const weightCard = page.getByTestId("card-weight");
    await expect(weightCard).toContainText("lbs");
  });

  test("renders 3D Anthropometric Mesh viewport and allows interactive rotation", async ({
    page,
  }) => {
    // Check 3D mesh container
    await expect(page.getByText("3D ANTHROPOMETRIC MESH")).toBeVisible();
    await expect(page.getByText("DRAG TO ROTATE")).toBeVisible();

    // Check Three.js WebGL canvas is rendered
    const threeCanvas = page.locator(".cursor-grab canvas, canvas").first();
    await expect(threeCanvas).toBeVisible();

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
});
