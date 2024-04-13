const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");
const sign_in_btn2 = document.querySelector("#sign-in-btn2");
const sign_up_btn2 = document.querySelector("#sign-up-btn2");

sign_up_btn.addEventListener("click", () => {
    container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
    container.classList.remove("sign-up-mode");
});

sign_up_btn2.addEventListener("click", () => {
    container.classList.add("sign-up-mode2");
});

sign_in_btn2.addEventListener("click", () => {
    container.classList.remove("sign-up-mode2");
});

const signInForm = document.querySelector(".sign-in-form");
const signUpForm = document.querySelector(".sign-up-form");

signInForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    const formData = new FormData(signInForm);
    const username = formData.get("username");
    const password = formData.get("password");
    const errorMessageContainer = document.getElementById("error-message-container-signin");
    
    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            window.location.href = "dashboard.html"; // Redirect to dashboard page on successful login
        } else {
            const errorMessage = await response.text();
            displayErrorMessage(errorMessage, errorMessageContainer);
        }
    } catch (error) {
        console.error(error);
        displayErrorMessage("An error occurred. Please try again later.", errorMessageContainer);
    }
});

signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    const formData = new FormData(signUpForm);
    const username = formData.get("username");
    const email = formData.get("email");
    const password = formData.get("password");
    const errorMessageContainer = document.getElementById("error-message-container-signup");

    try {
        const response = await fetch("/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, password })
        });

        if (response.ok) {
            window.location.href = "dashboard.html"; // Redirect to dashboard page on successful signup
        } else {
            const errorMessage = await response.text();
            displayErrorMessage(errorMessage, errorMessageContainer);
        }
    } catch (error) {
        console.error(error);
        displayErrorMessage("An error occurred. Please try again later.", errorMessageContainer);
    }
});

function displayErrorMessage(message, container) {
    const errorMessageElement = document.createElement("p");
    errorMessageElement.textContent = message;
    errorMessageElement.classList.add("error-message");
    container.innerHTML = ""; // Clear previous error messages
    container.appendChild(errorMessageElement);
}


