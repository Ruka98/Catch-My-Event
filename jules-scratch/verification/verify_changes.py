import re
import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # --- Sign Up ---
    page.goto("http://localhost:3000/signup")

    # Verify signup page
    expect(page).to_have_title(re.compile("Catch My Event"))
    expect(page.get_by_text("Join Catch My Event")).to_be_visible()

    # The MultiSelect component renders a button with role="combobox"
    interests_field = page.get_by_role("combobox")
    expect(interests_field).to_be_visible()
    page.screenshot(path="jules-scratch/verification/signup_page.png")

    # Fill out signup form
    unique_id = str(int(time.time()))
    user_name = f"testuser{unique_id}"
    email = f"testuser{unique_id}@example.com"
    password = "password123"

    page.get_by_label("User name").fill(user_name)
    page.get_by_label("Mobile number").fill("1234567890")
    page.get_by_label("Email").fill(email)
    # Use a more specific locator to avoid ambiguity
    page.get_by_role("textbox", name="Password", exact=True).fill(password)
    page.get_by_label("Confirm Password").fill(password)

    # Select some interests
    interests_field.click()
    page.get_by_text("Music").click()
    page.get_by_text("Sports").click()
    # Click outside to close the dropdown
    page.get_by_text("Join Catch My Event").click()

    page.get_by_role("button", name="Create Account").click()

    # Wait for signup success page
    expect(page).to_have_url(re.compile(".*auth/signup-success"))

    # --- Log In ---
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign In").click()

    # Wait for navigation to the dashboard after login
    expect(page).to_have_url(re.compile(".*dashboard"), timeout=10000)

    # --- Profile Page ---
    page.goto("http://localhost:3000/profile")

    # Wait for the redirect to the user's profile page
    expect(page).to_have_url(re.compile(r".*profile/.*"), timeout=10000)

    # Verify profile page elements
    expect(page.get_by_text("User Details")).to_be_visible()
    expect(page.get_by_text("My Calendar")).to_be_visible()
    expect(page.get_by_text("My Posted Events")).to_be_visible()

    # Verify interests are displayed
    expect(page.get_by_text("Interests:")).to_be_visible()
    expect(page.get_by_text(re.compile("Music"))).to_be_visible()

    page.screenshot(path="jules-scratch/verification/profile_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)