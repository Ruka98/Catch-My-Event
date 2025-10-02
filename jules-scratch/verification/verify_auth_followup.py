from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Verify Login Page
    page.goto("http://localhost:3000/auth/login")
    expect(page.get_by_role("button", name="Sign in with Google")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/login_page_with_google.png")

    # Verify Signup Page
    page.goto("http://localhost:3000/auth/signup")
    expect(page.get_by_role("button", name="Sign up with Google")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/signup_page_with_google.png")

    # Verify Signup Success Page
    page.goto("http://localhost:3000/auth/signup-success")
    expect(page.get_by_text("Check Your Email!")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/signup_success_page_themed.png")


    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)