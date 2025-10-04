from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Set a consistent viewport for all screenshots
    page.set_viewport_size({"width": 1280, "height": 800})

    try:
        # 1. Verify Homepage Header
        print("Navigating to homepage...")
        page.goto("http://localhost:3000/")
        homepage_header = page.locator("header").first
        expect(homepage_header).to_be_visible()
        expect(homepage_header.get_by_text("Catch My Event")).to_be_visible()
        homepage_header.screenshot(path="jules-scratch/verification/homepage_header_final.png")
        print("Homepage screenshot taken.")

        # 2. Verify Login Page Header
        print("Navigating to login page...")
        page.goto("http://localhost:3000/auth/login")
        login_header = page.locator('a[href="/"]', has_text="Catch My Event")
        expect(login_header).to_be_visible()
        login_header.screenshot(path="jules-scratch/verification/login_page_header_final.png")
        print("Login page screenshot taken.")

        # 3. Verify Signup Page Header
        print("Navigating to signup page...")
        page.goto("http://localhost:3000/auth/signup")
        signup_header = page.locator('a[href="/"]', has_text="Catch My Event")
        expect(signup_header).to_be_visible()
        signup_header.screenshot(path="jules-scratch/verification/signup_page_header_final.png")
        print("Signup page screenshot taken.")

        # 4. Verify Categories Page Header
        print("Navigating to categories page...")
        page.goto("http://localhost:3000/categories")
        categories_header = page.locator("header").first
        expect(categories_header).to_be_visible()
        expect(categories_header.get_by_text("Catch My Event")).to_be_visible()
        expect(categories_header.get_by_text("Back to Events")).to_be_visible()
        categories_header.screenshot(path="jules-scratch/verification/categories_page_header_final.png")
        print("Categories page screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_final.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
