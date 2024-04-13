document.addEventListener('DOMContentLoaded', function () {
    const addTaskButton = document.getElementById('add-task-btn');
    const modal = document.getElementById('task-modal');
    const closeModal = document.querySelector('.close');
    const taskForm = document.getElementById('task-form');
    const todoContainer = document.getElementById('todo-tasks');
    const inProgressContainer = document.getElementById('in-progress-tasks');
    const doneContainer = document.getElementById('done-tasks');

    let draggedItem = null;

    addTaskButton.addEventListener('click', function () {
        modal.style.display = 'block';
        document.getElementById('modal-title').innerText = 'Add Task';
        taskForm.reset(); // Reset form fields
    });

    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    taskForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const taskName = document.getElementById('task-name').value.trim();
        const taskDescription = document.getElementById('task-description').value.trim();
        const dueDate = document.getElementById('due-date').value;
        const priority = document.getElementById('priority').value;
        const reminder = document.getElementById('reminder').value;

        if (taskName !== '') {
            const taskElement = createTaskElement(taskName, taskDescription, dueDate, priority, reminder);
            todoContainer.appendChild(taskElement);
            setupTaskEventListeners(taskElement); // Setup event listeners for the new task
            saveTaskToMongoDB(taskName, taskDescription, dueDate, priority, reminder); // Save task to MongoDB
            modal.style.display = 'none';
            taskForm.reset();
        } else {
            alert('Please enter a task name!');
        }
    });

    function createTaskElement(name, description, dueDate, priority, reminder) {
        const taskElement = document.createElement('div');
        taskElement.classList.add('todo-item');
        taskElement.setAttribute('draggable', true);
        taskElement.innerHTML = `
        <div class="task-name">${name}</div>
        <div class="task-description">${description}</div>
        <div class="due-date">${dueDate}</div>
        <div class="priority">${priority}</div>
        <div class="reminder">${reminder}</div>
        <button class="delete-btn">Delete</button>
      `;
        return taskElement;
    }

    function setupTaskEventListeners(taskElement) {
        taskElement.addEventListener('click', function (event) {
            if (event.target.classList.contains('delete-btn')) {
                const taskName = taskElement.querySelector('.task-name').innerText;
                const parentContainer = taskElement.parentElement;

                deleteTaskFromDatabase(taskName); // Delete task from MongoDB

                if (parentContainer === todoContainer) {
                    parentContainer.removeChild(taskElement);
                } else if (parentContainer === inProgressContainer) {
                    parentContainer.removeChild(taskElement);
                } else if (parentContainer === doneContainer) {
                    parentContainer.removeChild(taskElement);
                }
                return;
            }
            modal.style.display = 'block';
            document.getElementById('modal-title').innerText = 'Edit Task';
            // Code for editing task goes here
        });

        taskElement.addEventListener('dragstart', handleDragStart);
        taskElement.addEventListener('dragend', handleDragEnd);
    }

    function handleDragStart() {
        draggedItem = this;
        setTimeout(() => {
            this.classList.add('dragging');
        }, 0);
    }

    function handleDragEnd() {
        setTimeout(() => {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }, 0);
    }

    const columns = document.querySelectorAll('.tasks');

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });

    function handleDragOver(e) {
        e.preventDefault();
    }

    function handleDragEnter(e) {
        e.preventDefault();
        this.classList.add('hovered');
    }

    function handleDragLeave() {
        this.classList.remove('hovered');
    }

    function handleDrop() {
        if (draggedItem.classList.contains('todo-item')) {
            const taskName = draggedItem.querySelector('.task-name').innerText;
            const taskDescription = draggedItem.querySelector('.task-description').innerText;
            const dueDate = draggedItem.querySelector('.due-date').innerText;
            const priority = draggedItem.querySelector('.priority').innerText;
            const reminder = draggedItem.querySelector('.reminder').innerText;
            
            const task = {
                name: taskName,
                description: taskDescription,
                dueDate: dueDate,
                priority: priority,
                reminder: reminder
            };

            if (this.id === 'in-progress-tasks') {
                sendTaskToBackend(task, '/storeInProgressTask');
                console.log('Task moved to In-Progress:', taskName);
                deleteTaskFromDatabase(taskName);
                console.log('Task removed from To-Do:', taskName);
            } else if (this.id === 'done-tasks') {
                sendTaskToBackend(task, '/storeDoneTask');
                console.log('Task moved to Done:', taskName);
                deleteTaskFromInProgress(taskName);
                console.log('Task removed from In-Progress:', taskName);
            }

            this.appendChild(draggedItem);
            this.classList.remove('hovered');
        }
    }

    function deleteTaskFromDatabase(taskName) {
        fetch('/deleteTask', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: taskName })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log('Task deleted successfully from tasks schema');
        })
        .catch(error => {
            console.error('Error deleting task from tasks schema:', error);
        });
    }

    function deleteTaskFromInProgress(taskName) {
        fetch('/deleteTaskInProgress', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: taskName })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log('Task deleted successfully from tasks in-progress schema');
        })
        .catch(error => {
            console.error('Error deleting task from tasks in-progress schema:', error);
        });
    }

    function deleteTaskFromDone(taskName) {
        fetch('/deleteTaskDone', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: taskName })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log('Task deleted successfully from tasks done schema');
        })
        .catch(error => {
            console.error('Error deleting task from tasks done schema:', error);
        });
    }

    function sendTaskToBackend(task, endpoint) {
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Task stored:', data);
        })
        .catch(error => {
            console.error('Error storing task:', error);
        });
    }

    function saveTaskToMongoDB(name, description, dueDate, priority, reminder) {
        fetch('/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description, dueDate, priority, reminder })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Task saved to MongoDB:', data);
            })
            .catch(error => {
                console.error('Error saving task to MongoDB:', error);
            });
    }
});










// ----------------------------------------------
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