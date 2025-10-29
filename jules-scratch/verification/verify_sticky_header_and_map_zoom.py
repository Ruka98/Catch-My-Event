
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Verify home page and sticky header
    page.goto("http://localhost:3000")
    page.evaluate("window.scrollTo(0, 500)")
    page.screenshot(path="jules-scratch/verification/home_page_scrolled.png")

    # Verify map page zoom
    page.goto("http://localhost:3000/map")
    page.wait_for_selector(".gm-style")  # Wait for the map to load
    page.mouse.wheel(0, 1000)
    page.screenshot(path="jules-scratch/verification/map_page_zoomed.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
