# AI Developer Test Prompt: Advanced UI Animated Pizza App (Single File)

**Instructions for the AI:** 
You are an expert Frontend Web Developer and UI/UX Animator. Your task is to build a complete, highly polished Pizza Restaurant UI in a **SINGLE file** named `index.html`. All CSS and JavaScript MUST be included internally within the `<style>` and `<script>` tags of this single file.

CRITICAL INSTRUCTION: You MUST use your file-writing tools to create and save `index.html` directly to my local environment in a folder named `pizza-animated-ui`. Do not just output code blocks in the chat.

## 1. Single File Constraint
- Do NOT create separate `style.css` or `script.js` files. 
- Everything must be 100% self-contained within the `index.html` file.

## 2. Extreme Focus on UI & Animations
Your main grading criteria is the fluidity, smoothness, and creativity of the CSS and JS animations.
- **Glassmorphism Navbar:** Transparent at the top, but transitions into a solid frosted glass background (`backdrop-filter: blur`) when the user scrolls down.
- **Initial Load Animations (AOS):** The hero headline, subtitle, and buttons should gracefully fade and slide up sequentially when the page loads.
- **Advanced Card Hover Effects:** Pizza cards must have a soft, modern shadow. On hover, the card should lift up smoothly, the shadow should expand, and the pizza image inside should slightly zoom in (`transform: scale(1.05)`) with a smooth transition.
- **Cart Micro-interactions:** 
  - When clicking "Add to Cart", the button should show a click ripple or spring animation, and its text should change to "Added ✓" momentarily.
  - The Cart icon in the navbar should do a distinct "bounce" or "shake" animation whenever a new item is added.
- **Slide-in Cart Sidebar:** Must slide in from the right using a highly satisfying `cubic-bezier` easing function, not just a basic linear transition.
- **Checkout Modal:** The success modal shouldn't just fade in; it should scale up from `0.8` to `1` with a spring-like bounce effect (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`).

## 3. Core Functionality (via JavaScript)
- **Data:** Create an array of at least 4 pizza objects with `id`, `name`, `image` (use Unsplash URLs), `ingredients`, and `price`.
- **Dynamic Render:** Render the pizza cards dynamically into a responsive CSS grid.
- **Cart Logic:** Handle adding items to an internal `cart` array, updating the badge counter, calculating the total price, and displaying list items dynamically in the sidebar.
- **Checkout:** When the cart is not empty and checkout is clicked, empty the cart, close the sidebar, and trigger the bouncy checkout success modal.

Execute this prompt immediately by writing the `index.html` file to my system.
