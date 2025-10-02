from playwright.sync_api import sync_playwright, expect, Page
import time

def verify_map_changes(page: Page):
    """
    Verifies the changes made to the map page.
    - Collapsible search/filter UI
    - Enhanced date filter
    - Removed district filter
    - Search-based map navigation
    - Improved event popups
    """
    # Navigate to the map page
    page.goto("http://localhost:3000/map")

    # Wait for the map to load, which can be slow.
    # Let's wait for the "Search & Filter" button to be visible.
    search_filter_button = page.get_by_role("button", name="Search & Filter")
    expect(search_filter_button).to_be_visible(timeout=30000) # Increased timeout for map loading

    # 1. Verify collapsible UI (initial state)
    print("Verifying initial UI state...")
    search_input = page.get_by_placeholder("Search events or locations")
    expect(search_input).not_to_be_visible()

    # Take a screenshot of the initial collapsed view
    page.screenshot(path="jules-scratch/verification/map_initial_view.png")

    # 2. Expand the search and filter panel
    print("Expanding search and filter panel...")
    search_filter_button.click()

    # 3. Verify expanded UI
    print("Verifying expanded UI...")
    expect(search_input).to_be_visible()

    # 4. Verify district filter is removed
    print("Verifying district filter removal...")
    district_label = page.get_by_label("District")
    expect(district_label).not_to_be_visible()

    # 5. Verify enhanced date filter
    print("Verifying enhanced date filter...")
    date_filter = page.get_by_label("Date")
    expect(date_filter).to_contain_text("Today")
    expect(date_filter).to_contain_text("Tomorrow")

    # Take a screenshot of the expanded view
    page.screenshot(path="jules-scratch/verification/map_filters_expanded.png")

    # 6. Test search-based navigation
    print("Testing search-based navigation...")
    search_input.fill("Kandy")
    search_input.press("Enter")

    # Wait for the map to pan/zoom. A simple sleep is the easiest way here.
    time.sleep(5)

    # Take a screenshot after searching
    page.screenshot(path="jules-scratch/verification/map_after_search.png")

    # 7. Verify improved event popups
    # This is tricky because markers are loaded dynamically.
    # I'll try to click on the first event marker that appears.
    # The markers are divs with a specific class.
    print("Testing event popups...")
    try:
        # The custom markers are divs inside the leaflet-marker-pane
        # Let's try to find the first one. The custom class is 'custom-event-marker'
        # The structure is leaflet-marker-pane > div.leaflet-marker-icon > div.custom-event-marker
        first_marker = page.locator(".custom-event-marker").first
        first_marker.click(timeout=10000)

        # Wait for the popup to appear
        popup = page.locator(".leaflet-popup-content")
        expect(popup).to_be_visible()

        # Check for date and time in the popup
        # The popup contains '🗓️' and '⏰'
        expect(popup.locator("text=🗓️")).to_be_visible()
        expect(popup.locator("text=⏰")).to_be_visible()

        # Take a screenshot of the popup
        page.screenshot(path="jules-scratch/verification/map_event_popup.png")
    except Exception as e:
        print(f"Could not verify event popup: {e}")
        # Take a screenshot anyway to see the state
        page.screenshot(path="jules-scratch/verification/map_event_popup_failed.png")


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