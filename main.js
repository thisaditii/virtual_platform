document.getElementById('btn-timer').addEventListener('click', () => loadComponent('timer'));
document.getElementById('btn-todo').addEventListener('click', () => loadTodoComponent());
document.getElementById('btn-videocall').addEventListener('click', () => loadComponent('videocall'));
document.getElementById('btn-home').addEventListener('click', () => {
    window.location.href = 'main.html'; 
});

function loadComponent(component) {
    const contentDiv = document.getElementById('content');
    
    fetch(`../${component}/${component}.html`)
        .then(response => response.text())
        .then(html => {
            contentDiv.innerHTML = html;

      
            const script = document.createElement('script');
            script.src = `../${component}/${component}.js`;
            contentDiv.appendChild(script);

       
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `../${component}/${component}.css`;
            document.head.appendChild(link);
        })
        .catch(error => console.error('Error loading component:', error));
}

function loadTodoComponent() {
    const contentDiv = document.getElementById('content');
    
    fetch('../todo/build/index.html')
        .then(response => response.text())
        .then(html => {
            contentDiv.innerHTML = html;
            const script = document.createElement('script');
            script.src = '../todo/build/static/js/main.02aad3c1.js';
            contentDiv.appendChild(script);

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '../todo/build/static/css/main.2aa96ae7.css';
            document.head.appendChild(link);
        })
        .catch(error => console.error('Error loading Todo component:', error));
}

const images = [
    'url("https://images.pexels.com/photos/414171/pexels-photo-414171.jpeg")',
    'url("https://images.pexels.com/photos/158607/cairn-fog-mystical-background-158607.jpeg")',
    'url("https://images.pexels.com/photos/34950/pexels-photo.jpg")',
    'url("https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg")',
    'url("https://images.pexels.com/photos/1054218/pexels-photo-1054218.jpeg")',
    'url("https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg")'
];

let currentImageIndex = 0;

function changeBackgroundImage() {
    document.body.style.backgroundImage = images[currentImageIndex];
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    
    currentImageIndex = (currentImageIndex + 1) % images.length;
}

setInterval(changeBackgroundImage, 10000); // Change image every 10 seconds

// Initial background image
changeBackgroundImage();
