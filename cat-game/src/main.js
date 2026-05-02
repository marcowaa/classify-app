import './style.css'

// ================================
// Game State
// ================================
let score = 0;
let selectedFood = null;
let audioContext = null;

// ================================
// DOM Elements
// ================================
const catImage = document.getElementById('catImage');
const catWrapper = document.getElementById('catWrapper');
const catStatus = document.getElementById('catStatus');
const scoreDisplay = document.getElementById('score');
const fishBtn = document.getElementById('fishBtn');
const milkBtn = document.getElementById('milkBtn');
const particleContainer = document.getElementById('particleContainer');

// ================================
// Audio System (Web Audio API)
// ================================
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Create a simple "meow" sound using oscillators
function playMeow() {
  initAudio();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Meow sound approximation
  oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
  oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.2);

  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

// Play happy sound effect
function playHappySound() {
  initAudio();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Happy chirp sound
  oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
  oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
  oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5

  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.4);
}

// ================================
// Particle Effects
// ================================
function createParticles(x, y, emoji, count = 8) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = emoji;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    // Random direction
    const angle = (Math.PI * 2 * i) / count;
    const distance = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);

    particleContainer.appendChild(particle);

    // Remove after animation
    setTimeout(() => particle.remove(), 2000);
  }
}

function createFoodParticle(startX, startY, endX, endY, foodType) {
  const particle = document.createElement('img');
  particle.className = 'food-particle';
  particle.src = foodType === 'fish' ? '/images/fish.png' : '/images/milk.png';
  particle.style.left = `${startX}px`;
  particle.style.top = `${startY}px`;

  particleContainer.appendChild(particle);

  // Animate to cat position
  const animation = particle.animate([
    {
      transform: 'translate(0, 0) scale(1) rotate(0deg)',
      opacity: 1
    },
    {
      transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.5) rotate(360deg)`,
      opacity: 0
    }
  ], {
    duration: 800,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  });

  animation.onfinish = () => {
    particle.remove();
    // Trigger cat eating animation
    catWrapper.classList.add('cat-eating');
    setTimeout(() => catWrapper.classList.remove('cat-eating'), 800);

    // Update cat status
    updateCatStatus('happy');
    playHappySound();

    // Create celebration particles
    const catRect = catWrapper.getBoundingClientRect();
    createParticles(
      catRect.left + catRect.width / 2,
      catRect.top + catRect.height / 2,
      '❤️',
      10
    );

    // Increment score
    updateScore(10);
  };
}

// ================================
// Game Logic
// ================================
function updateScore(points) {
  score += points;
  scoreDisplay.textContent = score;

  // Animate score
  scoreDisplay.style.transform = 'scale(1.3)';
  setTimeout(() => {
    scoreDisplay.style.transform = 'scale(1)';
  }, 200);
}

function updateCatStatus(status) {
  const statusEmojis = {
    happy: '😻',
    hungry: '😺',
    excited: '😸',
    love: '😽'
  };

  catStatus.textContent = statusEmojis[status] || statusEmojis.hungry;

  // Reset to hungry after delay
  if (status !== 'hungry') {
    setTimeout(() => {
      catStatus.textContent = statusEmojis.hungry;
    }, 2000);
  }
}

function selectFood(foodType) {
  selectedFood = foodType;

  // Update button states
  fishBtn.classList.remove('selected');
  milkBtn.classList.remove('selected');

  if (foodType === 'fish') {
    fishBtn.classList.add('selected');
  } else if (foodType === 'milk') {
    milkBtn.classList.add('selected');
  }

  // Haptic feedback on mobile
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

function feedCat() {
  if (!selectedFood) {
    // No food selected, just play with cat
    catWrapper.classList.add('cat-bounce');
    setTimeout(() => catWrapper.classList.remove('cat-bounce'), 600);
    playMeow();
    updateCatStatus('excited');

    // Create heart particles
    const rect = catWrapper.getBoundingClientRect();
    createParticles(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      '💕',
      5
    );

    updateScore(1);
  } else {
    // Feed the cat
    const btnElement = selectedFood === 'fish' ? fishBtn : milkBtn;
    const btnRect = btnElement.getBoundingClientRect();
    const catRect = catWrapper.getBoundingClientRect();

    const startX = btnRect.left + btnRect.width / 2;
    const startY = btnRect.top + btnRect.height / 2;
    const endX = catRect.left + catRect.width / 2;
    const endY = catRect.top + catRect.height / 2;

    createFoodParticle(startX, startY, endX, endY, selectedFood);

    // Reset selection
    setTimeout(() => {
      selectedFood = null;
      fishBtn.classList.remove('selected');
      milkBtn.classList.remove('selected');
    }, 1000);
  }

  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
}

// ================================
// Event Listeners
// ================================

// Cat interaction
catWrapper.addEventListener('click', feedCat);

// Touch support
catWrapper.addEventListener('touchstart', (e) => {
  e.preventDefault();
  feedCat();
});

// Food selection
fishBtn.addEventListener('click', () => selectFood('fish'));
milkBtn.addEventListener('click', () => selectFood('milk'));

// Touch support for food buttons
fishBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  selectFood('fish');
});

milkBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  selectFood('milk');
});

// Initialize audio context on first user interaction
document.body.addEventListener('click', initAudio, { once: true });
document.body.addEventListener('touchstart', initAudio, { once: true });

// ================================
// Welcome Animation
// ================================
setTimeout(() => {
  catWrapper.classList.add('cat-bounce');
  setTimeout(() => catWrapper.classList.remove('cat-bounce'), 600);
}, 500);

console.log('🐱 Game Kucing berhasil dimuat! Selamat bermain!');
