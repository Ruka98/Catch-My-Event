from playwright.sync_api import sync_playwright

def run_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the map page
        page.goto("http://localhost:3000/map")

        # Add a small delay to ensure the page is fully loaded
        page.wait_for_timeout(2000)

        # Click the 'Filters' button
        page.click('button:has(svg[class*="lucide-filter"])')

        # Take a screenshot immediately after clicking
        page.screenshot(path="jules-scratch/verification/debug_map_filters.png")

        browser.close()

if __name__ == "__main__":
    run_debug()