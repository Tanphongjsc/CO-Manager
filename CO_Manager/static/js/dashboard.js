// static/js/dashboard.js

document.addEventListener("DOMContentLoaded", function() {
    console.log("Dashboard specific JavaScript loaded.");

    const toggleButton = document.getElementById("workflow-toggle");
    const workflowDiv = document.getElementById("workflow");

    if (toggleButton && workflowDiv) {
        // Ensure workflow is hidden by default if not already handled by HTML/CSS
        // workflowDiv.style.display = "none"; 
        // The HTML already has style="display: none;" for workflow div

        toggleButton.addEventListener("click", function() {
            if (workflowDiv.style.display === "none" || workflowDiv.style.display === "") {
                workflowDiv.style.display = "block";
                toggleButton.textContent = "Ẩn luồng công việc";
            } else {
                workflowDiv.style.display = "none";
                toggleButton.textContent = "Hiển thị luồng công việc";
            }
        });
    }

    // Add event listeners for dashboard cards to navigate (placeholder for Django URLs)
    const dashboardCards = document.querySelectorAll(".dashboard-card");
    dashboardCards.forEach(card => {
        card.addEventListener("click", function() {
            const moduleName = this.dataset.module;
            console.log("Dashboard card clicked, navigate to module: " + moduleName + " (requires Django URL routing)");
            // In a real Django app, you would redirect:
            // window.location.href = `/` + moduleName + `/`; 
        });
    });
});
