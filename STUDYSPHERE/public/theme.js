document.getElementById("logoutLink").addEventListener("click", function() {
    // Display the confirmation modal
    $('#confirmationModalLogout').modal('show');
});

document.getElementById("confirmLogout").addEventListener("click", function() {
    // Redirect to index.html after confirmation
    window.location.href = "index.html";
});

document.addEventListener('DOMContentLoaded', () => {
    const chk = document.getElementById('chk');

    chk.addEventListener('change', () => {
        document.body.classList.toggle('dark');
    });

    // SOCIAL PANEL JS
    const floating_btn = document.querySelector('.floating-btn');
    const close_btn = document.querySelector('.close-btn');
    const social_panel_container = document.querySelector('.social-panel-container');

    floating_btn.addEventListener('click', () => {
        social_panel_container.classList.toggle('visible');
    });

    close_btn.addEventListener('click', () => {
        social_panel_container.classList.remove('visible');
    });
});


//----------------------------------------------------------------