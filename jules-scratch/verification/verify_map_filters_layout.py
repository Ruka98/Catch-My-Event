from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the map page
        page.goto("http://localhost:3000/map")

        # Click the 'Filters' button to reveal the filter options
        page.click('button:has(svg[class*="lucide-filter"])')

        # Wait for the filters to become visible
        page.wait_for_selector('label[for="category-select-map"]')

        # Verify that the new labels are visible
        expect(page.get_by_label("Category")).to_be_visible()
        expect(page.get_by_label("District")).to_be_visible()
        expect(page.get_by_label("Date")).to_be_visible()
        expect(page.get_by_label("Ticket price")).to_be_visible()

        # Take a screenshot of the filters
        page.screenshot(path="jules-scratch/verification/map_filters_layout.png")

        browser.close()

if __name__ == "__main__":
    run_verification()