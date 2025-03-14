/* app.js */

/*
  Game Configuration (excluding the dictionary)
*/
const config = {
    letterCount: 20, // Configurable: 15-25
    vowels: 'AEIOU',
    consonants: 'BCDFGHJKLMNPQRSTVWXYZ',
    letterFrequency: {
      A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.70, F: 2.23,
      G: 2.02, H: 6.09, I: 6.97, J: 0.15, K: 0.77, L: 4.03,
      M: 2.41, N: 6.75, O: 7.51, P: 1.93, Q: 0.10, R: 5.99,
      S: 6.33, T: 9.06, U: 2.76, V: 0.98, W: 2.36, X: 0.15,
      Y: 1.97, Z: 0.07
    }
  };
  
  // Our global dictionary Set, loaded from words_alpha.txt
  let dictionary = new Set();
  
  // Load the dictionary from the text file
  function fetchDictionary() {
    return fetch('words_alpha.txt')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load dictionary file: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        // Each line is one word; convert to uppercase
        const lines = text.split('\n').map(word => word.trim().toUpperCase());
        dictionary = new Set(lines);
        console.log(`Dictionary loaded with ${dictionary.size} words.`);
      })
      .catch(error => {
        console.error('Error fetching dictionary:', error);
        alert('Failed to load dictionary. Please try again later.');
      });
  }
  
  let dailyLetters = [];
  let usedWords = [];
  let wordLettersMap = new Map(); // Map to store which letters each word uses
  
  /*
    Utility function to pick a random letter (weighted by frequency).
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
    Ensures a minimum number of vowels (3).
  */
  function generateDailyLetters() {
    let letters = [];
    let vowelCount = 0;
    
    // Ensure at least 3 vowels
    while (vowelCount < 3) {
      const vowel = config.vowels[Math.floor(Math.random() * config.vowels.length)];
      letters.push(vowel);
      vowelCount++;
    }
    
    // Fill the rest with weighted random letters
    while (letters.length < config.letterCount) {
      let letter = getRandomLetter();
      letters.push(letter);
      if (config.vowels.includes(letter)) {
        vowelCount++;
      }
    }
    
    // Shuffle the letters
    return letters.sort(() => Math.random() - 0.5);
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
  }
  
  /*
    Validate a submitted word by checking if it's in the dictionary
    and if it can be formed from the available letters.
  */
  function validateWord(word) {
    word = word.toUpperCase();
    
    // Check if the word is in the dictionary
    if (!dictionary.has(word)) {
      return false;
    }
    
    // Check if the word can be formed with available letters
    let availableLetters = [...dailyLetters]; // Create a copy of the array
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
    Update the score display.
  */
  function updateScore() {
    document.getElementById('gameScore').innerText = `Words: ${usedWords.length}`;
  }
  
  /*
    Handle submission of a word.
  */
  function submitWord() {
    const wordInput = document.getElementById('wordInput');
    let word = wordInput.value.trim().toUpperCase();
    
    if (word === "") return;
    
    if (!validateWord(word)) {
      alert(`"${word}" is not a valid word or cannot be formed from the available letters.`);
      wordInput.value = '';
      return;
    }
    
    // Track which letters are used for this word
    let usedLetters = [];
    let tempDailyLetters = [...dailyLetters]; // Create a copy
    
    // Find which letters are used in the word
    for (let char of word) {
      let index = tempDailyLetters.indexOf(char);
      if (index !== -1) {
        usedLetters.push(tempDailyLetters[index]);
        tempDailyLetters.splice(index, 1);
      }
    }
    
    // Store the word and its used letters
    usedWords.push(word);
    wordLettersMap.set(word, usedLetters);
    
    // Remove used letters from the daily letters
    tempDailyLetters = [...dailyLetters]; // Reset temp array
    for (let char of word) {
      let index = tempDailyLetters.indexOf(char);
      if (index !== -1) {
        dailyLetters.splice(dailyLetters.indexOf(char), 1);
        tempDailyLetters.splice(index, 1);
      }
    }
    
    // Add the word to the list with a delete button
    addWordToList(word);
    
    // Clear the input
    wordInput.value = '';
    
    // Update the UI
    renderLetters();
    updateScore();
    
    // Check if all letters have been used
    checkGameCompletion();
  }
  
  /*
    Add a submitted word to the list with a delete button.
  */
  function addWordToList(word) {
    const wordsList = document.getElementById('wordsList');
    const li = document.createElement('li');
    
    // Create the word span
    const wordSpan = document.createElement('span');
    wordSpan.innerText = word;
    
    // Create the delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '×';
    deleteBtn.title = 'Remove this word';
    deleteBtn.addEventListener('click', () => deleteWord(word, li));
    
    // Add to the list item
    li.appendChild(wordSpan);
    li.appendChild(deleteBtn);
    
    // Add to the words list
    wordsList.appendChild(li);
  }
  
  /*
    Delete a word and return its letters to the available pool.
  */
  function deleteWord(word, listItem) {
    const index = usedWords.indexOf(word);
    if (index !== -1) {
      // Remove the word from the list
      usedWords.splice(index, 1);
      
      // Get the letters used for this word
      const letters = wordLettersMap.get(word);
      
      // Add the letters back to the available pool
      if (letters) {
        dailyLetters = dailyLetters.concat(letters);
        wordLettersMap.delete(word);
      }
      
      // Remove the word from the UI
      listItem.remove();
      
      // Update the UI
      renderLetters();
      updateScore();
    }
  }
  
  /*
    Check if the game is completed (all letters used).
  */
  function checkGameCompletion() {
    if (dailyLetters.length === 0) {
      const gameScore = document.getElementById('gameScore');
      gameScore.innerHTML = `<div class="game-completed">Completed! You used ${usedWords.length} word(s) to use all letters.</div>`;
      alert(`Congratulations! You've used all the letters in ${usedWords.length} word(s).`);
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
    const applySettings = document.getElementById('applySettings');
    
    showSettings.onclick = () => {
      settingsModal.style.display = 'block';
      // Set current value in the dropdown
      document.getElementById('letterCountSetting').value = config.letterCount.toString();
    };
    closeSettings.onclick = () => {
      settingsModal.style.display = 'none';
    };
    
    // Apply Settings
    applySettings.onclick = () => {
      const letterCountSetting = document.getElementById('letterCountSetting');
      config.letterCount = parseInt(letterCountSetting.value);
      
      // Reset the game with new settings
      resetGame();
      
      // Close the modal
      settingsModal.style.display = 'none';
    };
    
    // Close modal when clicking outside of it
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
    Reset the game with current settings.
  */
  function resetGame() {
    // Clear existing data
    dailyLetters = [];
    usedWords = [];
    wordLettersMap.clear();
    
    // Generate new letters
    dailyLetters = generateDailyLetters();
    
    // Clear the words list
    document.getElementById('wordsList').innerHTML = '';
    
    // Reset the score
    updateScore();
    
    // Render the new letters
    renderLetters();
  }
  
  /*
    Initialize the game.
  */
  function initGame() {
    fetchDictionary().then(() => {
      // Generate initial letter set
      dailyLetters = generateDailyLetters();
      
      // Render UI
      renderLetters();
      updateScore();
      
      // Set up modals and event listeners
      setupModals();
    });
  }
  
  // Event Listeners
  document.getElementById('submitWord').addEventListener('click', submitWord);
  document.getElementById('wordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      submitWord();
    }
  });
  
  // Start game on page load
  window.onload = initGame;