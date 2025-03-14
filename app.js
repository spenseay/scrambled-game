/* app.js */

/*
  Game Configuration and Global Variables
  - Configurable letter count, letter frequencies, sample dictionary.
  - For a full game, replace the sample dictionary with a comprehensive one.
*/
const config = {
    letterCount: 20, // Configurable: can be set between 15-25
    vowels: 'AEIOU',
    consonants: 'BCDFGHJKLMNPQRSTVWXYZ',
    letterFrequency: {
      A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.70, F: 2.23,
      G: 2.02, H: 6.09, I: 6.97, J: 0.15, K: 0.77, L: 4.03,
      M: 2.41, N: 6.75, O: 7.51, P: 1.93, Q: 0.10, R: 5.99,
      S: 6.33, T: 9.06, U: 2.76, V: 0.98, W: 2.36, X: 0.15,
      Y: 1.97, Z: 0.07
    },
    // A sample dictionary for demonstration. Replace with a comprehensive dictionary for production.
    dictionary: new Set(["HELLO", "WORLD", "WORD", "GAME", "SCRAMBLED", "TEST", "PLAYER", "JAVASCRIPT", "CODE"])
  };
  
  let dailyLetters = [];
  let usedWords = [];
  
  /*
    Utility function to pick a random letter.
    - When weighted, letters are selected based on frequency.
  */
  function getRandomLetter(weighted = true) {
    const letters = Object.keys(config.letterFrequency);
    if (!weighted) {
      return letters[Math.floor(Math.random() * letters.length)];
    }
    
    const weightedPool = [];
    letters.forEach(letter => {
      const frequency = config.letterFrequency[letter];
      const count = Math.ceil(frequency * 10); // Scale frequency for pool size
      for (let i = 0; i < count; i++) {
        weightedPool.push(letter);
      }
    });
    
    return weightedPool[Math.floor(Math.random() * weightedPool.length)];
  }
  
  /*
    Generate the daily letter set.
    - Ensures a minimum number of vowels (here at least 3).
    - The letter count is configurable.
  */
  function generateDailyLetters() {
    let letters = [];
    let vowelCount = 0;
    while (letters.length < config.letterCount) {
      let letter;
      // Force use of a vowel until at least 3 vowels are in the set
      if (vowelCount < 3) {
        letter = config.vowels[Math.floor(Math.random() * config.vowels.length)];
      } else {
        letter = getRandomLetter();
      }
      letters.push(letter);
      if (config.vowels.includes(letter)) {
        vowelCount++;
      }
    }
    return letters;
  }
  
  /*
    Render the letters in the UI.
  */
  function renderLetters() {
    const letterDisplay = document.getElementById('letterDisplay');
    letterDisplay.innerHTML = '';
    dailyLetters.forEach((letter, index) => {
      const span = document.createElement('span');
      span.innerText = letter;
      span.setAttribute('data-index', index);
      letterDisplay.appendChild(span);
    });
    updateLettersRemaining();
  }
  
  /*
    Update the counter that displays the remaining letters.
  */
  function updateLettersRemaining() {
    const lettersRemaining = document.getElementById('lettersRemaining');
    lettersRemaining.innerText = `Letters: ${dailyLetters.join(' ')}`;
  }
  
  /*
    Validate a submitted word:
      - Check it exists in the dictionary.
      - Ensure it can be formed from the available daily letters.
  */
  function validateWord(word) {
    word = word.toUpperCase();
    if (!config.dictionary.has(word)) {
      return false;
    }
    
    let availableLetters = dailyLetters.slice();
    for (let char of word) {
      let index = availableLetters.indexOf(char);
      if (index === -1) {
        return false;
      }
      availableLetters.splice(index, 1);
    }
    return true;
  }
  
  /*
    Calculate the score strictly as the number of words used.
  */
  function calculateScore() {
    return usedWords.length;
  }
  
  /*
    Handle submission of a word.
    - Validate, update the UI, and remove used letters.
    - When all letters have been used, display the final score (word count).
  */
  function submitWord() {
    const wordInput = document.getElementById('wordInput');
    let word = wordInput.value.trim();
    if (word === "") return;
    
    if (!validateWord(word)) {
      alert(`"${word}" is not a valid word or cannot be formed from the available letters.`);
      wordInput.value = '';
      return;
    }
    
    usedWords.push(word.toUpperCase());
    
    // Remove letters used in the word from the current letter set.
    let tempLetters = dailyLetters.slice();
    for (let char of word.toUpperCase()) {
      let index = tempLetters.indexOf(char);
      if (index !== -1) {
        tempLetters.splice(index, 1);
      }
    }
    dailyLetters = tempLetters;
    
    // Update list of submitted words.
    const wordsList = document.getElementById('wordsList');
    const li = document.createElement('li');
    li.innerText = word.toUpperCase();
    wordsList.appendChild(li);
    
    wordInput.value = '';
    updateLettersRemaining();
    
    // Check if all letters have been used.
    if (dailyLetters.length === 0) {
      const finalScore = calculateScore();
      document.getElementById('gameScore').innerText = `Completed! You used ${finalScore} word(s) to use all letters.`;
      alert(`Congratulations! You've used all the letters in ${finalScore} word(s).`);
    }
  }
  
  /*
    Set up modals for Instructions and Settings.
  */
  function setupModals() {
    // Instructions Modal
    const instructionsModal = document.getElementById('instructionsModal');
    const showInstructions = document.getElementById('showInstructions');
    const closeInstructions = document.getElementById('closeInstructions');
    
    showInstructions.onclick = () => {
      instructionsModal.style.display = 'block';
    };
    closeInstructions.onclick = () => {
      instructionsModal.style.display = 'none';
    };
    
    // Settings Modal
    const settingsModal = document.getElementById('settingsModal');
    const showSettings = document.getElementById('showSettings');
    const closeSettings = document.getElementById('closeSettings');
    
    showSettings.onclick = () => {
      settingsModal.style.display = 'block';
    };
    closeSettings.onclick = () => {
      settingsModal.style.display = 'none';
    };
    
    // Close modal when clicking outside of it.
    window.onclick = function(event) {
      if (event.target === instructionsModal) {
        instructionsModal.style.display = 'none';
      }
      if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    };
  }
  
  /*
    Initialize the game.
    - In a full implementation, the daily puzzle would be seeded by the current date.
  */
  function initGame() {
    dailyLetters = generateDailyLetters();
    renderLetters();
    setupModals();
    // Additional initialization (timer, leaderboard integration, etc.) can be added here.
  }
  
  // Event Listeners for word submission.
  document.getElementById('submitWord').addEventListener('click', submitWord);
  document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      submitWord();
    }
  });
  
  // Start game on page load.
  window.onload = initGame;
  