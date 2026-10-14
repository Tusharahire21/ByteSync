const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
    container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
    container.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.querySelector(".sign-in form");
    const registerForm = document.querySelector(".sign-up form");

    // ✅ LOGIN FUNCTIONALITY
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = loginForm.querySelector("input[type='email']").value.trim();
        const password = loginForm.querySelector("input[type='password']").value.trim();

        if (!email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                
                // Store user ID in localStorage for session management
                localStorage.setItem("user_id", result.user_id);

                window.location.href = "create_join_room.html"; // Redirect after successful login
            } else {
                alert("Error: " + (result.error || "Invalid credentials"));
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Network error. Please check your connection.");
        }
    });

    // ✅ SIGNUP FUNCTIONALITY
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = registerForm.querySelector("input[placeholder='Name']").value.trim();
        const email = registerForm.querySelector("input[type='email']").value.trim();
        const password = registerForm.querySelector("input[type='password']").value.trim();

        if (!username || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        // Validate email format
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        // Validate password length
        if (password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                container.classList.remove("active"); // Switch to login form
            } else {
                alert("Error: " + (result.error || "Registration failed"));
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Network error. Please check your connection.");
        }
    });
});
