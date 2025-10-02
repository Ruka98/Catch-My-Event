from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Verify Login Page
    page.goto("http://localhost:3000/auth/login")
    expect(page.get_by_text("Forgot password?")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/login_page.png")

    # Verify Signup Page
    page.goto("http://localhost:3000/auth/signup")
    expect(page.get_by_label("User name")).to_be_visible()
    expect(page.get_by_label("Mobile number")).to_be_visible()
    expect(page.get_by_role("button", name="Sign in with Google")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/signup_page.png")

    # Verify Forgot Password Page
    page.goto("http://localhost:3000/auth/forgot-password")
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_role("button", name="Send Reset Link")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/forgot_password_page.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)