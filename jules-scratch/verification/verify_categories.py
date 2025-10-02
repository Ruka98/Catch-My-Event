from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Create a new user, as we don't have test credentials
    timestamp = int(time.time())
    email = f"user_{timestamp}@test.com"
    password = "password"

    page.goto("http://localhost:3000/signup")
    page.get_by_label("Email").fill(email)
    page.locator("#password").fill(password)
    page.locator("#confirmPassword").fill(password)
    page.get_by_role("button", name="Sign Up").click()

    # After signup, the app might show a "verify email" message or redirect.
    # We'll wait for navigation to complete and then try to log in with the new credentials.
    page.wait_for_load_state("networkidle")

    # Now, attempt to log in with the newly created user.
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign In", exact=True).click()

    # Wait for the main page to load, confirming successful login.
    expect(page).to_have_url("http://localhost:3000/", timeout=15000)

    # Verify categories page
    page.goto("http://localhost:3000/categories")
    page.screenshot(path="jules-scratch/verification/01_categories_page.png")

    # Click on a category and verify subcategories
    page.get_by_text("Entertainment").click()
    expect(page.get_by_text("Music (Concerts, Festivals, DJ Nights)")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/02_subcategories_page.png")

    # Verify post-event page
    page.goto("http://localhost:3000/post-event")

    # Select a category
    page.get_by_label("Category *").select_option("Food & Drink")

    # Verify subcategory dropdown appears and is populated
    subcategory_dropdown = page.get_by_label("Subcategory (Optional)")
    expect(subcategory_dropdown).to_be_visible()
    expect(subcategory_dropdown).to_contain_text("Food Festivals")

    page.screenshot(path="jules-scratch/verification/03_post_event_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)