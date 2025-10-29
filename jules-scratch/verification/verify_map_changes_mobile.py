from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Define a mobile viewport for iPhone 12
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            device_scale_factor=3
        )
        page = context.new_page()

        try:
            # Navigate to the map page
            page.goto("http://localhost:3000/map", wait_until="networkidle")

            # Give the map some time to load completely
            page.wait_for_timeout(5000)

            # Take a screenshot to verify the map is flush with the header
            page.screenshot(path="jules-scratch/verification/map_flush_header_mobile.png")

            # Simulate a one-finger drag to pan the map
            # We'll drag from the center of the screen upwards and to the left
            page.mouse.move(200, 400)
            page.mouse.down()
            page.mouse.move(100, 300, steps=5)
            page.mouse.up()

            # Wait for the map to settle after panning
            page.wait_for_timeout(2000)

            # Take a second screenshot to confirm the map has panned
            page.screenshot(path="jules-scratch/verification/map_panned_mobile.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            # Take a screenshot on error to help with debugging
            page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
