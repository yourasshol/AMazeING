const maze = document.querySelector('.maze');
const cells = document.querySelectorAll('.cell');
let playerPosition = 0; // Start at the first cell

// Create the player element
const player = document.createElement('div');
player.classList.add('player');
cells[playerPosition].appendChild(player);

// Function to move the player in the maze
function movePlayer(direction) {
    let newPosition = playerPosition;
    const columns = 10;  // Number of columns in the maze
    const rows = 10;  // Number of rows in the maze

    switch (direction) {
        case 'ArrowUp':
            if (playerPosition - columns >= 0) newPosition = playerPosition - columns; // Move up
            break;
        case 'ArrowDown':
            if (playerPosition + columns < cells.length) newPosition = playerPosition + columns; // Move down
            break;
        case 'ArrowLeft':
            if (playerPosition % columns !== 0) newPosition = playerPosition - 1; // Move left
            break;
        case 'ArrowRight':
            if ((playerPosition + 1) % columns !== 0) newPosition = playerPosition + 1; // Move right
            break;
    }

    // Check if the new position is not a wall and move the player
    if (!cells[newPosition].classList.contains('wall')) {
        playerPosition = newPosition;
        player.style.gridColumnStart = (playerPosition % columns) + 1;
        player.style.gridRowStart = Math.floor(playerPosition / columns) + 1;
    }
}

// Listen for keydown events to move the player
window.addEventListener('keydown', (event) => {
    movePlayer(event.key);  // Move player based on key pressed
});
