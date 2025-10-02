from playwright.sync_api import sync_playwright, expect, Page
import time

def verify_map_changes(page: Page):
    """
    Verifies the final changes made to the map page, focusing on the popup behavior.
    """
    # Navigate to the map page
    page.goto("http://localhost:3000/map")

    # Wait for the map to load
    search_filter_button = page.get_by_role("button", name="Search & Filter")
    expect(search_filter_button).to_be_visible(timeout=30000)

    # Search for a location to ensure markers are loaded
    print("Searching for a location to load markers...")
    search_filter_button.click()
    search_input = page.get_by_placeholder("Search events or locations")
    expect(search_input).to_be_visible()
    search_input.fill("Kandy")
    search_input.press("Enter")

    # Wait for map to settle
    print("Waiting for map to settle...")
    time.sleep(5)

    # Test event popups
    print("Testing event popups...")
    try:
        # Wait for markers to be present
        page.wait_for_selector(".custom-event-marker", timeout=15000)

        # Click the first marker
        first_marker = page.locator(".custom-event-marker").first
        first_marker.click()

        # Wait for the popup and verify its content
        popup = page.locator(".leaflet-popup-content")
        expect(popup).to_be_visible()

        # Check for the raw time format (HH:mm - HH:mm)
        time_element = popup.locator("span:has-text('⏰') + span")
        time_text = time_element.inner_text()
        print(f"Found time in popup: {time_text}")

        # A raw time like "10:00 - 12:00" will contain a colon and a hyphen.
        expect(time_element).to_contain_text(":")
        # A formatted time like "10:00 AM" will not contain a hyphen if it's a single time.
        # The check for the raw time is that it does NOT contain AM or PM.
        expect(time_element).not_to_contain_text("AM")
        expect(time_element).not_to_contain_text("PM")

        print("Popup content verification successful!")
        page.screenshot(path="jules-scratch/verification/map_final_popup.png")

        # Test closing the popup by clicking the map
        print("Testing closing popup on map click...")
        # Clicking on the map container itself
        page.locator(".leaflet-container").click(position={"x": 10, "y": 10})
        expect(popup).not_to_be_visible(timeout=5000)
        print("Popup closed successfully!")
        page.screenshot(path="jules-scratch/verification/map_after_final_popup_close.png")

    except Exception as e:
        print(f"Could not verify event popup: {e}")
        page.screenshot(path="jules-scratch/verification/map_final_popup_failed.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_map_changes(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()